
import React, { useState, useEffect, useRef } from 'react';
import { SelectionType, ChatMessage, BandNode, TracedMarker, DnaProfile, DnaEntry } from '../types';
import { getBandInsights, getRelationshipInsights, chatWithMusicExpert, sequenceBandDna } from '../services/geminiService';
import { DNA_LAYERS } from '../dnaData';

interface BandPanelProps {
  selection: SelectionType;
  onClose: () => void;
  onUpdateNode?: (updatedNode: BandNode) => void;
  onTraceMarker: (marker: TracedMarker | null) => void;
  tracedMarker: TracedMarker | null;
  onExploreLineage?: (nodeId: string, type: 'root' | 'branch') => Promise<void>;
}

// Explicitly type as React.FC to allow 'key' prop if used in lists
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return (
    <div className="text-sm leading-relaxed text-gray-300 space-y-2 whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-indigo-300">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

// Component: Signal Meter
const SignalMeter: React.FC<{ value: number, colorClass?: string, alignRight?: boolean }> = ({ value, colorClass = "bg-emerald-500", alignRight = false }) => {
    return (
        <div className={`flex gap-0.5 items-end h-3 ${alignRight ? 'justify-end' : 'justify-start'}`} title={`Intensity: ${value}/5`}>
            {[1, 2, 3, 4, 5].map((level) => (
                <div 
                    key={level} 
                    className={`w-1 rounded-sm transition-all duration-300 ${
                        level <= value 
                        ? `${colorClass} ${value === 5 ? 'h-full opacity-100' : 'h-[80%] opacity-80'}`
                        : 'bg-zinc-800 h-[20%]'
                    }`}
                ></div>
            ))}
        </div>
    );
}

// Component: DNA Comparison Row
const DnaDiffRow: React.FC<{ label: string, sourceVal: number, targetVal: number, layerName: string }> = ({ 
    label, 
    sourceVal, 
    targetVal, 
    layerName 
}) => {
    
    // Determine evolution type
    const isNew = sourceVal === 0 && targetVal > 0;
    const isLost = sourceVal > 0 && targetVal === 0;
    const isBoosted = sourceVal > 0 && targetVal > sourceVal;
    
    return (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-2 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors px-2 rounded">
            {/* Source Side */}
            <div className={`flex items-center justify-end gap-2 ${isNew ? 'opacity-20' : 'opacity-100'}`}>
                {sourceVal > 0 && <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">{sourceVal}</span>}
                <SignalMeter value={sourceVal} colorClass="bg-cyan-500" alignRight />
            </div>

            {/* Center Label */}
            <div className="flex flex-col items-center w-28 md:w-40 text-center relative group">
                <span className={`text-xs font-bold truncate w-full ${isNew ? 'text-emerald-300' : (isLost ? 'text-gray-600' : 'text-gray-200')}`}>
                    {label}
                </span>
                <span className="text-[9px] text-gray-600 uppercase tracking-tighter">{layerName}</span>
                
                {/* Evolution Indicator */}
                {isBoosted && <div className="absolute -right-3 top-1 text-yellow-500 text-[10px] font-black">↑</div>}
                {isNew && <div className="absolute -left-2 top-1 text-emerald-500 text-[10px] font-black">+</div>}
            </div>

            {/* Target Side */}
            <div className={`flex items-center justify-start gap-2 ${isLost ? 'opacity-20' : 'opacity-100'}`}>
                <SignalMeter value={targetVal} colorClass={isBoosted ? "bg-yellow-500" : "bg-emerald-500"} />
                {targetVal > 0 && <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">{targetVal}</span>}
            </div>
        </div>
    )
}

// Component: DNA Diff Engine
const DnaDiffViewer = ({ source, target, onDeepAnalyze }: { source: BandNode, target: BandNode, onDeepAnalyze: () => void }) => {
    
    // Check if both nodes have high-res data (isSequenced)
    const isHighRes = source.isSequenced && target.isSequenced;
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    if (!source.dnaProfile || !target.dnaProfile) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p>DNA data missing for one or both bands.</p>
                <p className="text-xs mt-2">Sequence them individually first to compare.</p>
            </div>
        );
    }

    // 1. Flatten Profiles
    const getAllMarkers = (profile: DnaProfile) => {
        const map = new Map<string, number>();
        Object.keys(profile).forEach(layerId => {
            profile[layerId].forEach(entry => map.set(entry.id, entry.value));
        });
        return map;
    };

    const sourceMap = getAllMarkers(source.dnaProfile);
    const targetMap = getAllMarkers(target.dnaProfile);
    const allIds = Array.from(new Set([...sourceMap.keys(), ...targetMap.keys()]));

    // 2. Build Comparison List
    const comparisons = allIds.map(id => {
        // Find definition
        let def = { name: id, layerName: 'Unknown' };
        for(const layer of DNA_LAYERS) {
            const m = layer.markers.find(m => m.id === id);
            if(m) {
                def = { name: m.name, layerName: layer.name };
                break;
            }
        }
        
        const sVal = sourceMap.get(id) || 0;
        const tVal = targetMap.get(id) || 0;
        
        // Calculate Relevance Score for sorting
        const score = (sVal + tVal) + (sVal > 0 && tVal > 0 ? 5 : 0) + (tVal > sVal ? 2 : 0);

        return { ...def, id, sVal, tVal, score };
    }).sort((a, b) => b.score - a.score); 

    // 3. Categorize
    const shared = comparisons.filter(c => c.sVal > 0 && c.tVal > 0);
    const mutations = comparisons.filter(c => c.sVal === 0 && c.tVal > 0);
    const lost = comparisons.filter(c => c.sVal > 0 && c.tVal === 0);

    const handleAnalyzeClick = async () => {
        setIsAnalyzing(true);
        await onDeepAnalyze();
        setIsAnalyzing(false);
    };

    return (
        <div className="animate-fadeIn space-y-6 pb-10">
            {/* Header / Status */}
            <div className="flex flex-col gap-2 mb-4">
                 <div className="flex justify-between px-4 text-[10px] uppercase font-bold text-gray-500 tracking-widest border-b border-zinc-800 pb-2">
                    <span className="truncate max-w-[100px]">{source.label}</span>
                    <span>Comparison</span>
                    <span className="truncate max-w-[100px] text-right">{target.label}</span>
                </div>
                
                {/* Deep Analyze Call to Action */}
                {!isHighRes ? (
                    <div className="mx-4 p-3 bg-indigo-900/30 border border-indigo-500/30 rounded-lg flex flex-col items-center text-center">
                        <p className="text-xs text-indigo-200 mb-2">
                            Comparing using standard data. <br/> Run AI analysis for 2,048-point precision.
                        </p>
                        <button 
                            onClick={handleAnalyzeClick}
                            disabled={isAnalyzing}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-md shadow-lg transition-all flex items-center gap-2"
                        >
                            {isAnalyzing ? (
                                <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Analyzing...</>
                            ) : (
                                "Deep Analyze Evolution"
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="mx-4 flex justify-center">
                         <span className="bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            AI Analysis Active
                         </span>
                    </div>
                )}
            </div>

            {/* SHARED TRAITS */}
            {shared.length > 0 && (
                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
                    <div className="bg-zinc-800/50 px-3 py-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                        Inherited Traits
                    </div>
                    <div className="p-2">
                        {shared.slice(0, 8).map(c => (
                            <DnaDiffRow key={c.id} label={c.name} sourceVal={c.sVal} targetVal={c.tVal} layerName={c.layerName} />
                        ))}
                         {shared.length > 8 && <div className="text-[10px] text-center text-gray-600 pt-2 italic">+{shared.length - 8} more shared traits</div>}
                    </div>
                </div>
            )}

            {/* MUTATIONS (NEW TRAITS) */}
            {mutations.length > 0 && (
                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
                    <div className="bg-zinc-800/50 px-3 py-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider flex justify-between">
                        <span>New Mutations</span>
                    </div>
                    <div className="p-2">
                        {mutations.slice(0, 6).map(c => (
                            <DnaDiffRow key={c.id} label={c.name} sourceVal={c.sVal} targetVal={c.tVal} layerName={c.layerName} />
                        ))}
                    </div>
                </div>
            )}

             {/* LOST TRAITS */}
             {lost.length > 0 && (
                <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden opacity-70 hover:opacity-100 transition-opacity">
                    <div className="bg-zinc-800/50 px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Recessive / Lost Traits
                    </div>
                    <div className="p-2">
                        {lost.slice(0, 4).map(c => (
                            <DnaDiffRow key={c.id} label={c.name} sourceVal={c.sVal} targetVal={c.tVal} layerName={c.layerName} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const BandPanel: React.FC<BandPanelProps> = ({ selection, onClose, onUpdateNode, onTraceMarker, tracedMarker, onExploreLineage }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'genome' | 'chat' | 'evolution'>('info');
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  
  const [sequencingDna, setSequencingDna] = useState(false);
  
  const [exploringRoots, setExploringRoots] = useState(false);
  const [exploringBranches, setExploringBranches] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selection) {
      setInsight(null);
      setChatMessages([]);
      setActiveTab('info');
      setLoading(true);

      if (selection.type === 'node') {
        getBandInsights(selection.data.label)
          .then(setInsight)
          .catch(() => setInsight("Could not load insights."))
          .finally(() => setLoading(false));
      } else if (selection.type === 'link') {
        getRelationshipInsights((selection.data.source as BandNode).label, (selection.data.target as BandNode).label)
            .then(setInsight)
            .catch(() => setInsight("Could not analyze relationship."))
            .finally(() => setLoading(false));
      }
    }
  }, [selection]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage: ChatMessage = { role: 'user', text: inputMessage };
    setChatMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setLoadingChat(true);

    const context = selection 
      ? selection.type === 'node' 
        ? `User is asking about the band: ${selection.data.label}. ${selection.data.title}`
        : `User is asking about the connection between ${(selection.data.source as BandNode).label} and ${(selection.data.target as BandNode).label}.`
      : undefined;

    const responseText = await chatWithMusicExpert(inputMessage, context);
    
    setChatMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setLoadingChat(false);
  };

  const handleSequenceDna = async () => {
      if (selection?.type !== 'node' || !onUpdateNode) return;
      setSequencingDna(true);
      try {
          const profile = await sequenceBandDna(selection.data.label);
          onUpdateNode({ 
              ...selection.data, 
              dnaProfile: profile,
              isSequenced: true 
          });
      } catch (e) {
          console.error(e);
      } finally {
          setSequencingDna(false);
      }
  };
  
  const handleDeepAnalyzeConnection = async () => {
      if (selection?.type !== 'link' || !onUpdateNode) return;
      const source = selection.data.source as BandNode;
      const target = selection.data.target as BandNode;
      
      // Analyze parallel if needed
      const tasks = [];
      if (!source.isSequenced) tasks.push(sequenceBandDna(source.label).then(p => ({ node: source, p })));
      if (!target.isSequenced) tasks.push(sequenceBandDna(target.label).then(p => ({ node: target, p })));
      
      if (tasks.length > 0) {
          try {
              const results = await Promise.all(tasks);
              results.forEach(res => {
                  onUpdateNode({
                      ...res.node,
                      dnaProfile: res.p,
                      isSequenced: true
                  });
              });
          } catch (e) {
              console.error("Deep analysis failed", e);
          }
      }
  };

  const handleExplore = async (type: 'root' | 'branch') => {
      if (selection?.type !== 'node' || !onExploreLineage) return;
      
      if (type === 'root') setExploringRoots(true);
      else setExploringBranches(true);

      try {
          await onExploreLineage(selection.data.id, type);
      } finally {
          if (type === 'root') setExploringRoots(false);
          else setExploringBranches(false);
      }
  };

  if (!selection) return null;

  return (
    <div className={`fixed inset-y-0 right-0 w-full sm:w-[480px] bg-[#1a1a1a] shadow-2xl transform transition-transform duration-300 z-50 flex flex-col border-l border-zinc-800 ${selection ? 'translate-x-0' : 'translate-x-full'}`}>
      
      {/* Header with Hero Color */}
      <div 
        className="relative h-24 sm:h-32 flex items-end p-4 sm:p-6 bg-cover bg-center"
        style={{ 
            backgroundColor: selection.type === 'node' ? selection.data.color : '#333',
            boxShadow: 'inset 0 -40px 60px -10px #1a1a1a'
        }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors backdrop-blur-sm z-10"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div className="w-full">
          {selection.type === 'node' ? (
            <>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter drop-shadow-md pr-8 leading-tight">{selection.data.label}</h2>
                <div className="flex flex-wrap gap-1 mt-1 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-white/90">
                    {selection.data.title.split('|').slice(0,3).map((t, i) => (
                        <span key={i} className="bg-black/20 px-1.5 py-0.5 rounded backdrop-blur-sm">{t.trim()}</span>
                    ))}
                </div>
            </>
          ) : (
            <>
                <div className="flex items-center gap-2 text-white flex-wrap">
                    <h2 className="text-lg sm:text-xl font-bold">{selection.sourceLabel}</h2>
                    <svg className="w-4 h-4 opacity-60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    <h2 className="text-lg sm:text-xl font-bold">{selection.targetLabel}</h2>
                </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-[#1a1a1a]">
        <button 
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'info' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          {selection.type === 'link' ? 'Analysis' : 'Bio'}
        </button>
        
        {selection.type === 'node' ? (
             <button 
                onClick={() => setActiveTab('genome')}
                className={`flex-1 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'genome' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Genome
            </button>
        ) : (
             <button 
                onClick={() => setActiveTab('evolution')}
                className={`flex-1 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'evolution' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Evolution
            </button>
        )}
       
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'chat' ? 'text-pink-400 border-b-2 border-pink-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          AI Chat
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#1a1a1a] custom-scrollbar">
        {/* Same content rendering logic as before, just ensured padding is responsive */}
        {activeTab === 'info' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* ... (Content omitted for brevity, logic remains identical) ... */}
            {loading ? (
                <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                    <div className="h-4 bg-zinc-800 rounded w-full"></div>
                    <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
                </div>
            ) : (
                <div className="animate-fadeIn">
                     {selection.type === 'link' && selection.data.influenceContext && (
                        <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Context</h4>
                            <p className="text-gray-200 text-sm italic">"{selection.data.influenceContext}"</p>
                        </div>
                    )}

                    <h3 className="text-indigo-400 font-bold uppercase tracking-wider text-xs mb-3">
                        {selection.type === 'node' ? 'AI Analysis' : 'Relationship Deep Dive'}
                    </h3>
                    {insight && <SimpleMarkdown content={insight} />}

                    {/* Lineage Discovery Section (Node Only) */}
                    {selection.type === 'node' && onExploreLineage && (
                        <div className="mt-8 pt-6 border-t border-zinc-800">
                             <h3 className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-4">Lineage Discovery</h3>
                             <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handleExplore('root')}
                                    disabled={exploringRoots}
                                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-gray-200 rounded-lg p-3 text-xs font-bold flex flex-col items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {exploringRoots ? <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-white rounded-full"></div> : <span className="text-lg">⬅️</span>}
                                    Find Ancestors
                                </button>
                                <button 
                                    onClick={() => handleExplore('branch')}
                                    disabled={exploringBranches}
                                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-gray-200 rounded-lg p-3 text-xs font-bold flex flex-col items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {exploringBranches ? <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-white rounded-full"></div> : <span className="text-lg">➡️</span>}
                                    Find Descendants
                                </button>
                             </div>
                        </div>
                    )}
                </div>
            )}
          </div>
        )}

        {/* TAB: GENOME (Node Only) */}
        {activeTab === 'genome' && selection.type === 'node' && (
             <div className="p-4 space-y-6">
                 {/* Header Status */}
                 <div className="flex justify-between items-center bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                     <div>
                         <div className="text-[10px] uppercase font-bold text-gray-500">Data Source</div>
                         <div className={`text-xs font-bold ${selection.data.isSequenced ? 'text-emerald-400' : 'text-yellow-500'}`}>
                             {selection.data.isSequenced ? 'AI Sequenced' : 'Standard'}
                         </div>
                     </div>
                     {!selection.data.isSequenced && (
                         <button 
                            onClick={handleSequenceDna}
                            disabled={sequencingDna}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold px-3 py-1.5 rounded uppercase tracking-wider transition-colors"
                         >
                             {sequencingDna ? '...' : 'Sequence'}
                         </button>
                     )}
                 </div>

                 {selection.data.dnaProfile ? (
                     <div className="space-y-6">
                         {Object.entries(selection.data.dnaProfile).map(([layerId, markers]) => {
                             const entries = markers as DnaEntry[];
                             if (!entries || entries.length === 0) return null;
                             const layerDef = DNA_LAYERS.find(l => l.id === layerId);
                             
                             return (
                                 <div key={layerId} className="animate-fadeIn">
                                     <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 border-b border-zinc-800 pb-1">
                                         {layerId}: {layerDef?.name || 'Unknown Layer'}
                                     </h4>
                                     <div className="space-y-1">
                                         {entries.map((m) => (
                                             <div 
                                                key={m.id} 
                                                className="group flex items-center justify-between p-2 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                                             >
                                                 <div className="flex flex-col">
                                                     <div className="flex items-center gap-2">
                                                         <span className="text-sm font-medium text-gray-200 group-hover:text-emerald-300 transition-colors">
                                                             {DNA_LAYERS.find(l => l.id === layerId)?.markers.find(ref => ref.id === m.id)?.name || m.id}
                                                         </span>
                                                         {/* Trace Button */}
                                                         <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onTraceMarker(tracedMarker?.id === m.id ? null : { id: m.id, name: m.id, layerName: layerDef?.name || '' });
                                                            }}
                                                            className={`ml-2 text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold transition-all ${tracedMarker?.id === m.id ? 'bg-emerald-500 text-white border-emerald-500' : 'border-zinc-600 text-gray-500 hover:border-emerald-500 hover:text-emerald-400'}`}
                                                         >
                                                             {tracedMarker?.id === m.id ? 'Tracing' : 'Trace'}
                                                         </button>
                                                     </div>
                                                     <span className="text-[10px] text-gray-600 font-mono">{m.id}</span>
                                                 </div>
                                                 {/* Signal Meter */}
                                                 <SignalMeter value={m.value} />
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             )
                         })}
                     </div>
                 ) : (
                     <div className="text-center py-10 text-gray-500">
                         No DNA profile available.
                     </div>
                 )}
             </div>
        )}

        {/* TAB: EVOLUTION (Link Only) */}
        {activeTab === 'evolution' && selection.type === 'link' && (
            <div className="p-4">
                <DnaDiffViewer 
                    source={selection.data.source as BandNode} 
                    target={selection.data.target as BandNode} 
                    onDeepAnalyze={handleDeepAnalyzeConnection}
                />
            </div>
        )}

        {/* TAB: CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 mt-10 text-sm">
                  <p>Ask anything about {selection.type === 'node' ? selection.data.label : 'this connection'}.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-zinc-800 text-gray-200 rounded-bl-none border border-zinc-700'
                  }`}>
                     {msg.role === 'model' ? <SimpleMarkdown content={msg.text} /> : msg.text}
                  </div>
                </div>
              ))}
              {loadingChat && (
                <div className="flex justify-start">
                   <div className="bg-zinc-800 rounded-2xl rounded-bl-none px-4 py-3 border border-zinc-700">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                      </div>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSendMessage} className="p-4 bg-[#1a1a1a] border-t border-zinc-800 sticky bottom-0">
              <div className="relative">
                <input 
                  type="text" 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask the expert..."
                  className="w-full bg-zinc-900 text-white rounded-full px-4 py-3 pr-12 text-sm border border-zinc-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                />
                <button 
                  type="submit"
                  disabled={!inputMessage.trim() || loadingChat}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default BandPanel;
