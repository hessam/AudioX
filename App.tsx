
import React, { useState, useMemo, useEffect, useRef } from 'react';
import ForceGraph3D from './components/ForceGraph3D'; // Using the new 3D component
import BandPanel from './components/BandPanel';
import SynthPanel from './components/SynthPanel';
import TourOverlay from './components/TourOverlay';
import { NODES as INITIAL_NODES, LINKS as INITIAL_LINKS, TOURS } from './constants';
import { BandNode, BandLink, SelectionType, TracedMarker, Tour } from './types';
import { analyzeBandForGraph, exploreLineage, findFusionBand, analyzeAudioContent } from './services/geminiService';
import { SynthParams, DEFAULT_SYNTH_PARAMS, calculateSynthScore } from './services/synthService';

const App: React.FC = () => {
  const graphRef = useRef<any>(null); // Ref to access ForceGraph3D methods
  
  const [nodes, setNodes] = useState<BandNode[]>(INITIAL_NODES);
  const [links, setLinks] = useState<BandLink[]>(INITIAL_LINKS);
  
  const [selection, setSelection] = useState<SelectionType>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTargetId, setSearchTargetId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [tracedMarker, setTracedMarker] = useState<TracedMarker | null>(null);
  
  // Highlight State for Discovery
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());

  // Tour State
  const [activeTour, setActiveTour] = useState<Tour | null>(null);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [isTourPlaying, setIsTourPlaying] = useState(false);
  const [showToursMenu, setShowToursMenu] = useState(false);

  // Add Band State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBandName, setNewBandName] = useState('');
  const [isAddingBand, setIsAddingBand] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Synth State
  const [synthParams, setSynthParams] = useState<SynthParams>(DEFAULT_SYNTH_PARAMS);
  const [isSynthOpen, setIsSynthOpen] = useState(false);

  // --- NEW: SPLICER STATE ---
  const [isSplicerActive, setIsSplicerActive] = useState(false);
  const [spliceSource, setSpliceSource] = useState<BandNode | null>(null);
  const [spliceTarget, setSpliceTarget] = useState<BandNode | null>(null);
  const [isSplicing, setIsSplicing] = useState(false);

  // --- NEW: AUDIO SPS STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(8); // Start at 8 seconds
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- GLOBAL RESET ---
  const handleReset = () => {
      setSelection(null);
      setSearchTerm('');
      setSearchTargetId(null);
      setTracedMarker(null);
      setSynthParams(DEFAULT_SYNTH_PARAMS);
      setIsSynthOpen(false);
      setActiveTour(null);
      setHighlightedNodeIds(new Set());
      setSpliceSource(null);
      setSpliceTarget(null);
      setIsSplicerActive(false);
      
      // Reset Camera to initial position
      if (graphRef.current) {
          graphRef.current.cameraPosition(
              { x: 0, y: 0, z: 400 }, // Eye
              { x: 0, y: 0, z: 0 },   // LookAt
              1500                    // Transition Duration
          );
      }
  };

  // --- TOUR LOGIC ---
  useEffect(() => {
      let timer: ReturnType<typeof setTimeout>;
      
      if (activeTour && isTourPlaying) {
          const currentStep = activeTour.steps[tourStepIndex];
          const duration = currentStep.duration || 5000;
          
          timer = setTimeout(() => {
              if (tourStepIndex < activeTour.steps.length - 1) {
                  setTourStepIndex(prev => prev + 1);
              } else {
                  setIsTourPlaying(false); // End of tour
              }
          }, duration);
      }

      return () => clearTimeout(timer);
  }, [activeTour, isTourPlaying, tourStepIndex]);

  const startTour = (tour: Tour) => {
      handleReset(); // Clear clutter before tour
      setActiveTour(tour);
      setTourStepIndex(0);
      setIsTourPlaying(true);
      setShowToursMenu(false);
  };

  const endTour = () => {
      setActiveTour(null);
      setIsTourPlaying(false);
      handleReset();
  };

  const handleNextStep = () => {
      if (activeTour && tourStepIndex < activeTour.steps.length - 1) {
          setTourStepIndex(prev => prev + 1);
      }
  };

  const handlePrevStep = () => {
      if (activeTour && tourStepIndex > 0) {
          setTourStepIndex(prev => prev - 1);
      }
  };


  // Calculate Synth Matches
  const synthResults = useMemo(() => {
      const isSynthActive = Object.values(synthParams).some((v: number) => v > 0);
      if (!isSynthActive) return null;

      const results = new Map<string, number>(); // NodeId -> Score (0-1)
      nodes.forEach(node => {
          const score = calculateSynthScore(node, synthParams);
          if (score > 0.4) { // Threshold for matching
              results.set(node.id, score);
          }
      });
      return results;
  }, [nodes, synthParams]);

  const handleNodeClick = (node: BandNode) => {
    if (activeTour) return; // Disable clicks during tour
    
    // SPLICER LOGIC
    if (isSplicerActive) {
        if (!spliceSource) {
            setSpliceSource(node);
        } else if (!spliceTarget && node.id !== spliceSource.id) {
            setSpliceTarget(node);
            executeSplice(spliceSource, node);
        }
        return;
    }

    setSelection({ type: 'node', data: node });
    setSearchTargetId(null); 
  };

  const handleLinkClick = (link: BandLink, sourceLabel: string, targetLabel: string) => {
    if (activeTour) return;
    setSelection({ type: 'link', data: link, sourceLabel, targetLabel });
    setSearchTargetId(null);
  };

  const handleClosePanel = () => {
    if (!activeTour) {
        setSelection(null);
    }
  };

  const handleTraceMarker = (marker: TracedMarker | null) => {
      setTracedMarker(marker);
      // Disable Synth if tracing starts to avoid confusion
      if (marker) setIsSynthOpen(false);
  };

  // Update a node (e.g., adding DNA profile)
  const handleUpdateNode = (updatedNode: BandNode) => {
      // 1. Update the main Nodes state
      setNodes(prevNodes => prevNodes.map(n => n.id === updatedNode.id ? updatedNode : n));

      // 2. Update the Selection state if the updated node is currently selected or part of a selected link
      setSelection(prevSelection => {
          if (!prevSelection) return null;

          // Case A: A Node is selected
          if (prevSelection.type === 'node' && prevSelection.data.id === updatedNode.id) {
              return { ...prevSelection, data: updatedNode };
          }

          // Case B: A Link is selected
          if (prevSelection.type === 'link') {
              const source = prevSelection.data.source as BandNode;
              const target = prevSelection.data.target as BandNode;
              
              if (source.id === updatedNode.id || target.id === updatedNode.id) {
                  return {
                      ...prevSelection,
                      data: {
                          ...prevSelection.data,
                          source: source.id === updatedNode.id ? updatedNode : source,
                          target: target.id === updatedNode.id ? updatedNode : target
                      }
                  };
              }
          }
          return prevSelection;
      });
  };

  const handleExploreLineage = async (nodeId: string, type: 'root' | 'branch') => {
      try {
          const existingIds = nodes.map(n => n.id);
          const data = await exploreLineage(nodeId, type, existingIds);
          
          if (!data || !data.results) return;

          const newNodes: BandNode[] = [];
          const newLinks: BandLink[] = [];
          const foundIds = new Set<string>();

          data.results.forEach((res: any) => {
              const targetId = res.name;
              foundIds.add(targetId);
              
              if (res.isNew) {
                  // Add New Node
                  if (!nodes.some(n => n.id === targetId) && !newNodes.some(n => n.id === targetId)) {
                       // Find parent coordinates to spawn nearby (improves UX)
                       const parentNode = nodes.find(n => n.id === nodeId);
                       const spawnX = parentNode ? (parentNode.x || 0) + (Math.random() - 0.5) * 50 : 0;
                       const spawnY = parentNode ? (parentNode.y || 0) + (Math.random() - 0.5) * 50 : 0;

                       newNodes.push({
                          id: targetId,
                          label: targetId,
                          group: res.details.group,
                          color: res.details.color,
                          title: res.details.title,
                          size: res.details.size,
                          tier: 'core', // Force visibility
                          x: spawnX, 
                          y: spawnY,
                          z: parentNode?.z || 0
                       });
                  }
              }

              // 2. Handle Link
              const source = type === 'root' ? targetId : nodeId;
              const target = type === 'root' ? nodeId : targetId;
              
              // Check if link already exists
              const linkExists = links.some(l => {
                  const sId = typeof l.source === 'string' ? l.source : (l.source as BandNode).id;
                  const tId = typeof l.target === 'string' ? l.target : (l.target as BandNode).id;
                  return sId === source && tId === target;
              });

              if (!linkExists) {
                  newLinks.push({
                      source,
                      target,
                      width: res.connection.width,
                      influenceType: res.connection.influenceType,
                      influenceContext: res.connection.influenceContext
                  });
              }
          });

          if (newNodes.length > 0) setNodes(prev => [...prev, ...newNodes]);
          if (newLinks.length > 0) setLinks(prev => [...prev, ...newLinks]);
          
          // Trigger Highlight Mode for found bands
          setHighlightedNodeIds(foundIds);

      } catch (e) {
          console.error("Lineage exploration failed", e);
      }
  };

  // Filter nodes for search autocomplete
  const filteredNodes = searchTerm 
    ? nodes.filter(n => n.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const executeSearch = (id: string) => {
      setSearchTargetId(id);
      setSearchTerm('');
  };

  // --- NEW: SPLICER EXECUTION ---
  const executeSplice = async (nodeA: BandNode, nodeB: BandNode) => {
      setIsSplicing(true);
      try {
          const existingIds = nodes.map(n => n.id);
          const data = await findFusionBand(nodeA.label, nodeB.label, existingIds);
          
          if (!data) throw new Error("No fusion data");
          
          const newNodeId = data.name;
          
          // Add Middle Node
          const newNode: BandNode = {
              id: newNodeId,
              label: newNodeId,
              group: data.details.group,
              color: '#ffffff', // White for fusion
              title: data.details.title,
              size: data.details.size + 5,
              tier: 'core',
              // Position exactly between
              x: ((nodeA.x || 0) + (nodeB.x || 0)) / 2,
              y: ((nodeA.y || 0) + (nodeB.y || 0)) / 2,
              z: ((nodeA.z || 0) + (nodeB.z || 0)) / 2
          };

          const newLinks = [
              { source: nodeA.id, target: newNodeId, width: 2, influenceType: 'stylistic', influenceContext: 'Parent A of Fusion' },
              { source: nodeB.id, target: newNodeId, width: 2, influenceType: 'stylistic', influenceContext: 'Parent B of Fusion' }
          ];

          setNodes(prev => [...prev, newNode]);
          setLinks(prev => [...prev, ...newLinks] as BandLink[]);
          setHighlightedNodeIds(new Set([newNodeId]));
          
          setSelection({ type: 'node', data: newNode });

      } catch (e) {
          console.error("Splice failed", e);
      } finally {
          setIsSplicing(false);
          setSpliceSource(null);
          setSpliceTarget(null);
          setIsSplicerActive(false);
      }
  };

  // --- NEW: AUDIO SPS LOGIC ---
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setRecordingTimeLeft(8); // Reset timer
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
        stopRecording();
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                handleAudioAnalysis(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTimeLeft(8);

            // Start Countdown
            recordingTimerRef.current = setInterval(() => {
                setRecordingTimeLeft((prev) => {
                    if (prev <= 1) {
                        stopRecording(); // Auto-stop
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone", err);
            alert("Could not access microphone. Please enable permissions.");
        }
    }
  };

  const handleAudioAnalysis = async (blob: Blob) => {
      setIsAnalyzingAudio(true);
      try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
             const base64data = reader.result as string;
             const base64Audio = base64data.split(',')[1];
             const mimeType = base64data.split(',')[0].split(':')[1].split(';')[0];
             
             const existingIds = nodes.map(n => n.id);
             const result = await analyzeAudioContent(base64Audio, mimeType, existingIds);
             
             // 1. Plot the "Discovery"
             const disc = result.discovery;
             const discNode: BandNode = {
                 id: disc.name,
                 label: disc.name,
                 group: disc.details.group,
                 color: '#fbbf24', // Gold
                 title: disc.details.title,
                 size: 40,
                 tier: 'core',
                 // Add the Analysis Report
                 audioAnalysis: result.analysis, 
                 // Random pos near center for dramatic entry
                 x: (Math.random() - 0.5) * 100,
                 y: (Math.random() - 0.5) * 100,
                 z: 100 
             };

             const newLinks: BandLink[] = [];
             
             // 2. Connect to matches
             result.matches.forEach((m: any) => {
                 if (nodes.some(n => n.id === m.name)) {
                    newLinks.push({
                        source: disc.name,
                        target: m.name,
                        width: 3,
                        influenceType: 'stylistic',
                        influenceContext: `Sonic Match (${m.similarity}%)`
                    });
                 }
             });

             setNodes(prev => [...prev, discNode]);
             setLinks(prev => [...prev, ...newLinks]);
             setHighlightedNodeIds(new Set([disc.name]));
             
             // Fly to it
             if (graphRef.current) {
                 graphRef.current.cameraPosition(
                     { x: discNode.x, y: discNode.y + 20, z: discNode.z + 100 },
                     { x: discNode.x, y: discNode.y, z: discNode.z },
                     2000
                 );
             }
             
             setTimeout(() => {
                 setSelection({ type: 'node', data: discNode });
             }, 2000);
          };
      } catch (e) {
          console.error("Audio analysis failed", e);
      } finally {
          setIsAnalyzingAudio(false);
      }
  };


  const handleAddBand = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newBandName.trim()) return;

      const name = newBandName.trim();
      // Check if exists
      if (nodes.some(n => n.label.toLowerCase() === name.toLowerCase())) {
          setAddError("Band already exists in the graph!");
          return;
      }

      setIsAddingBand(true);
      setAddError(null);

      try {
          const existingNames = nodes.map(n => n.id);
          const data = await analyzeBandForGraph(name, existingNames);

          const newNode: BandNode = {
              id: name,
              label: name,
              group: data.group,
              color: data.color,
              title: data.title,
              size: data.size,
              // Initial position: center based on group
              x: 0, 
              y: 0 
          };

          const newLinks: BandLink[] = [];
          if (data.connections && Array.isArray(data.connections)) {
              data.connections.forEach((conn: any) => {
                  if (conn.direction === 'from') {
                      newLinks.push({ source: conn.target, target: name, width: conn.width });
                  } else {
                      newLinks.push({ source: name, target: conn.target, width: conn.width });
                  }
              });
          }

          setNodes(prev => [...prev, newNode]);
          setLinks(prev => [...prev, ...newLinks]);
          
          setShowAddModal(false);
          setNewBandName('');
          
          setTimeout(() => {
              setSearchTargetId(name);
              setSelection({ type: 'node', data: newNode });
          }, 500);

      } catch (err) {
          setAddError("Failed to analyze band. Please try again.");
          console.error(err);
      } finally {
          setIsAddingBand(false);
      }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Responsive Controls Area */}
      <div className="absolute top-4 right-4 left-4 sm:left-auto z-20 flex flex-col sm:flex-row sm:items-start gap-3 pointer-events-none">
        
        {/* Row 1: Reset, Status & Tours */}
        <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto pointer-events-auto order-2 sm:order-1">
            
            {/* RESET BUTTON */}
            <button 
                onClick={handleReset}
                className="bg-zinc-800/80 hover:bg-zinc-700 text-gray-400 hover:text-white border border-zinc-600 p-2 rounded-lg shadow-lg transition-all flex items-center gap-2"
                title="Reset View"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                <span className="hidden md:inline text-xs font-bold uppercase">Reset</span>
            </button>
            
            {/* COSMIC SPLICER BUTTON */}
             <button 
                onClick={() => setIsSplicerActive(!isSplicerActive)}
                className={`p-2 rounded-lg shadow-lg transition-all flex items-center gap-2 border ${isSplicerActive ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-zinc-800/80 text-indigo-400 border-indigo-900/50 hover:bg-zinc-700'}`}
                title="Cosmic Splicer (Fusion)"
            >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <span className="hidden md:inline text-xs font-bold uppercase">{isSplicerActive ? 'Splicer Active' : 'Splicer'}</span>
            </button>

            {/* SONIC POSITIONING SYSTEM BUTTON */}
            <button 
                onClick={toggleRecording}
                disabled={isAnalyzingAudio}
                className={`p-2 rounded-lg shadow-lg transition-all flex items-center gap-2 border ${isRecording ? 'bg-red-600 text-white border-red-500 animate-pulse' : (isAnalyzingAudio ? 'bg-zinc-800 text-gray-500' : 'bg-zinc-800/80 text-emerald-400 border-emerald-900/50 hover:bg-zinc-700')}`}
                title="Sonic Positioning System (Mic)"
            >
                 {isAnalyzingAudio ? (
                     <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin"></div>
                 ) : (
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                 )}
                <span className="hidden md:inline text-xs font-bold uppercase">
                    {isRecording 
                        ? `Recording... ${recordingTimeLeft}s` 
                        : (isAnalyzingAudio ? 'Analyzing...' : 'Listen')
                    }
                </span>
            </button>

            {tracedMarker && (
                <div className="bg-zinc-900/90 border border-emerald-500/50 rounded-lg p-2 shadow-lg flex items-center gap-2 animate-fadeIn flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-white font-bold text-xs">{tracedMarker.name}</span>
                    <button onClick={() => setTracedMarker(null)} className="ml-1 text-gray-500 hover:text-white px-1">✕</button>
                </div>
            )}
            
            {highlightedNodeIds.size > 0 && (
                <div className="bg-amber-900/90 border border-amber-500/50 rounded-lg p-2 shadow-lg flex items-center gap-2 animate-fadeIn flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="text-amber-100 font-bold text-xs">{highlightedNodeIds.size} Discovered</span>
                    <button onClick={() => setHighlightedNodeIds(new Set())} className="ml-1 text-amber-400 hover:text-white px-1">✕</button>
                </div>
            )}

            <div className="relative flex-shrink-0">
                <button 
                    onClick={() => setShowToursMenu(!showToursMenu)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-yellow-500 border border-yellow-500/30 p-2 rounded-lg shadow-lg transition-all flex items-center gap-2"
                    title="Guided Tours"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="hidden md:inline text-sm font-bold">Time Travel</span>
                </button>
                {showToursMenu && (
                     <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 z-50">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-2 py-2 mb-2 border-b border-zinc-800">Select an Era</h3>
                        {TOURS.map(tour => (
                            <button 
                                key={tour.id}
                                onClick={() => startTour(tour)}
                                className="w-full text-left px-3 py-3 rounded-lg hover:bg-indigo-900/30 hover:border-indigo-500/30 border border-transparent transition-all group"
                            >
                                <div className="font-bold text-white group-hover:text-indigo-400">{tour.title}</div>
                                <div className="text-xs text-gray-500 mt-1 line-clamp-2">{tour.description}</div>
                            </button>
                        ))}
                     </div>
                )}
            </div>
        </div>

        {/* Row 2: Actions & Search */}
        <div className="flex gap-2 w-full sm:w-auto pointer-events-auto order-1 sm:order-2">
            {/* Search Bar */}
            <div className="relative group flex-grow sm:flex-grow-0 sm:w-64 md:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input 
                    type="text" 
                    className="block w-full pl-10 pr-3 py-2 border border-zinc-700 rounded-lg leading-5 bg-zinc-900/90 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-zinc-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all shadow-lg backdrop-blur-sm"
                    placeholder="Find a band..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={!!activeTour}
                />
                {searchTerm && filteredNodes.length > 0 && (
                    <ul className="absolute mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-md shadow-2xl max-h-60 overflow-auto py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                        {filteredNodes.map(node => (
                            <li 
                                key={node.id}
                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-zinc-700 text-white group"
                                onClick={() => executeSearch(node.id)}
                            >
                                <span className="block truncate font-medium">{node.label}</span>
                                <span className="block text-xs text-gray-500">{node.title.split('|')[1]}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            {/* Add Band */}
            <button 
                onClick={() => setShowAddModal(true)}
                disabled={!!activeTour}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg border border-indigo-500 shadow-lg transition-all flex items-center justify-center flex-shrink-0"
                title="Add a new band"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span className="hidden md:inline text-sm font-bold pl-1">Add Band</span>
            </button>

            {/* Help */}
            <button 
                onClick={() => setShowHelp(true)}
                className="bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded-lg p-2 border border-zinc-700 transition-colors shadow-lg flex-shrink-0"
                title="Help"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>
        </div>
      </div>

      {/* SPLICER OVERLAY INSTRUCTION */}
      {isSplicerActive && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-indigo-900/90 border border-indigo-500/50 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md animate-fadeIn">
              <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${spliceSource ? 'bg-emerald-400' : 'bg-gray-500 animate-pulse'}`}></div>
                  <span className="text-white text-sm font-bold">
                      {spliceSource ? spliceSource.label : 'Select Band A'}
                  </span>
                  <span className="text-indigo-400">➔</span>
                  <div className={`w-3 h-3 rounded-full ${spliceTarget ? 'bg-emerald-400' : (spliceSource ? 'bg-gray-500 animate-pulse' : 'bg-gray-700')}`}></div>
                  <span className="text-white text-sm font-bold">
                      {spliceTarget ? spliceTarget.label : 'Select Band B'}
                  </span>
              </div>
              {isSplicing && <div className="text-[10px] text-center text-indigo-300 mt-1 uppercase tracking-widest">Generating Fusion Node...</div>}
          </div>
      )}

      {/* Main Graph Area */}
      <main className="flex-1 relative">
        <ForceGraph3D 
            ref={graphRef}
            data={{ nodes, links }} 
            onNodeClick={handleNodeClick}
            onLinkClick={handleLinkClick}
            onBackgroundClick={handleClosePanel}
            selection={selection}
            searchTargetId={searchTargetId}
            focusedNodeId={activeTour ? activeTour.steps[tourStepIndex].targetId : null}
            isTourActive={!!activeTour}
            tracedMarker={tracedMarker}
            synthResults={synthResults}
            highlightedNodeIds={highlightedNodeIds} // Pass Highlighting
        />
        
        {/* Tour Overlay */}
        {activeTour && (
            <TourOverlay 
                tour={activeTour}
                currentStepIndex={tourStepIndex}
                isPlaying={isTourPlaying}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
                onTogglePlay={() => setIsTourPlaying(!isTourPlaying)}
                onExit={endTour}
            />
        )}
        
        {/* Legend Overlay */}
        {!activeTour && (
            <div className="absolute bottom-6 left-6 bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl border border-zinc-700/50 shadow-2xl pointer-events-none sm:pointer-events-auto hidden sm:block z-10">
                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3 border-b border-zinc-700 pb-2">Eras & Genres</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#ff4444] shadow-[0_0_8px_#ff4444]"></span><span className="text-gray-300">Roots / UK 60s</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#4444ff] shadow-[0_0_8px_#4444ff]"></span><span className="text-gray-300">USA / Thrash</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#ffaa00] shadow-[0_0_8px_#ffaa00]"></span><span className="text-gray-300">Southern Rock</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#aa00aa] shadow-[0_0_8px_#aa00aa]"></span><span className="text-gray-300">Prog / Theatrical</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#666666] shadow-[0_0_8px_#666666]"></span><span className="text-gray-300">Heavy Metal</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white]"></span><span className="text-gray-300">Modern / Special</span></div>
                </div>
            </div>
        )}
      </main>

      {/* SYNTH PANEL */}
      {!activeTour && (
          <SynthPanel 
            params={synthParams} 
            onChange={setSynthParams}
            onReset={() => setSynthParams(DEFAULT_SYNTH_PARAMS)}
            matchCount={synthResults ? synthResults.size : 0}
            isOpen={isSynthOpen}
            onToggle={() => setIsSynthOpen(!isSynthOpen)}
          />
      )}

      {/* Side Panel for Details */}
      <BandPanel 
          selection={selection} 
          onClose={handleClosePanel} 
          onUpdateNode={handleUpdateNode}
          onTraceMarker={handleTraceMarker}
          tracedMarker={tracedMarker}
          onExploreLineage={handleExploreLineage}
      />

      {/* Add Band Modal */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => !isAddingBand && setShowAddModal(false)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-4">Add a Band</h2>
                <p className="text-sm text-gray-400 mb-6">
                    Enter a band name. The AI will analyze their style, determine their era, and connect them to existing bands in the graph.
                </p>
                
                {addError && (
                    <div className="mb-4 p-3 bg-red-900/50 border border-red-800 text-red-200 text-sm rounded-lg">
                        {addError}
                    </div>
                )}

                <form onSubmit={handleAddBand}>
                    <input
                        type="text"
                        value={newBandName}
                        onChange={(e) => setNewBandName(e.target.value)}
                        placeholder="e.g. Led Zeppelin, Nirvana..."
                        className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
                        autoFocus
                    />
                    
                    <div className="flex justify-end gap-3">
                        <button 
                            type="button"
                            onClick={() => setShowAddModal(false)}
                            className="px-4 py-2 text-gray-400 hover:text-white font-medium"
                            disabled={isAddingBand}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isAddingBand || !newBandName.trim()}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2"
                        >
                            {isAddingBand ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Analyzing...
                                </>
                            ) : (
                                "Add to Graph"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Help Dialog Modal */}
      {showHelp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setShowHelp(false)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl transform scale-100" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">How to Read the AudioX</h2>
                    <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="space-y-6 text-gray-300">
                    <div className="flex gap-4">
                        <div>
                            <h3 className="font-bold text-white text-lg">3D Navigation</h3>
                            <p className="text-sm mt-1">
                                • <strong>Drag:</strong> Rotate/Pan<br/>
                                • <strong>Scroll:</strong> Zoom<br/>
                                • <strong>Mobile:</strong> Pinch to zoom, drag to rotate
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-4 border-t border-zinc-700 pt-4">
                        <div>
                            <h3 className="font-bold text-white text-lg">Features</h3>
                            <ul className="text-sm mt-1 space-y-1">
                                <li>• <strong>Splicer:</strong> Find the fusion between two distinct bands.</li>
                                <li>• <strong>Sonic Position:</strong> Use your mic to find music in the galaxy.</li>
                                <li>• <strong>Time Travel:</strong> Guided historical tours.</li>
                                <li>• <strong>DNA Tracer:</strong> Follow the flow of influence.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-700 flex justify-end">
                    <button 
                        onClick={() => setShowHelp(false)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Explore
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;