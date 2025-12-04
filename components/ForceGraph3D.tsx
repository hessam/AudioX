
import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import * as d3 from 'd3';
import { BandNode, BandLink, GraphData, SelectionType, TracedMarker } from '../types';

interface ForceGraph3DProps {
  data: GraphData;
  onNodeClick: (node: BandNode) => void;
  onLinkClick: (link: BandLink, sourceLabel: string, targetLabel: string) => void;
  onBackgroundClick?: () => void;
  selection: SelectionType;
  searchTargetId: string | null;
  focusedNodeId?: string | null;
  isTourActive?: boolean;
  tracedMarker: TracedMarker | null;
  synthResults?: Map<string, number> | null;
  highlightedNodeIds?: Set<string>; // New Prop for AI Discoveries
}

// Custom Force Z
function forceZ(z: number | ((d: any) => number)) {
  let nodes: any[];
  let strength = 0.1;

  function force(alpha: number) {
    for (let i = 0, n = nodes.length; i < n; ++i) {
      const node = nodes[i];
      const target = typeof z === "function" ? z(node) : z;
      if (node.vz !== undefined && node.z !== undefined) {
          node.vz += (target - node.z) * strength * alpha;
      }
    }
  }

  force.initialize = (_nodes: any[]) => nodes = _nodes;
  force.strength = (_strength: number) => {
    strength = _strength;
    return force;
  };

  return force;
}

// Wrap in forwardRef to allow Parent (App) to control Camera
const ForceGraph = forwardRef<any, ForceGraph3DProps>(({
  data,
  onNodeClick,
  onLinkClick,
  onBackgroundClick,
  selection,
  searchTargetId,
  focusedNodeId,
  isTourActive,
  tracedMarker,
  synthResults,
  highlightedNodeIds
}, ref) => {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<BandNode | null>(null);
  const isSynthActive = !!synthResults;

  // Expose internal ref methods to parent
  useImperativeHandle(ref, () => ({
      cameraPosition: (pos: object, lookAt: object, ms: number) => {
          if (fgRef.current) fgRef.current.cameraPosition(pos, lookAt, ms);
      },
      d3Force: (name: string, force: any) => {
          if (fgRef.current) fgRef.current.d3Force(name, force);
      }
  }));

  // --- SPACE KEY PANNING LOGIC ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // FIX: Ignore if user is typing in an input field
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault(); // Prevent scrolling
        
        if (fgRef.current) {
          const controls = fgRef.current.controls();
          if (controls) {
            // MOUSE.LEFT = 0 (Rotate), MOUSE.RIGHT = 2 (Pan)
            // We want to swap them: Left Click (0) -> PAN (2)
            controls.mouseButtons.LEFT = 2; 
            controls.mouseButtons.RIGHT = 0; 
            controls.update();
            
            if (containerRef.current) {
                containerRef.current.style.cursor = 'move';
            }
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // FIX: Ignore if user is typing in an input field
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        
        if (fgRef.current) {
          const controls = fgRef.current.controls();
          if (controls) {
            // Revert: Left Click (0) -> ROTATE (0)
            controls.mouseButtons.LEFT = 0; 
            controls.mouseButtons.RIGHT = 2; 
            controls.update();
            
            if (containerRef.current) {
                containerRef.current.style.cursor = 'grab';
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- HELPERS ---
  const getSynthScore = useCallback((node: BandNode) => {
    return (synthResults && synthResults.get(node.id)) || 0;
  }, [synthResults]);

  const isSynthMatch = useCallback((node: BandNode) => {
    return synthResults && synthResults.has(node.id);
  }, [synthResults]);

  const getMarkerValue = useCallback((node: BandNode): number => {
    if (!tracedMarker) return 0;
    if (!node.dnaProfile) return 0;
    const layer = node.dnaProfile[Object.keys(node.dnaProfile).find(k => node.dnaProfile![k].some(m => m.id === tracedMarker.id)) || ""];
    const marker = layer?.find(m => m.id === tracedMarker.id);
    return marker ? marker.value : 0;
  }, [tracedMarker]);

  const hasMarker = useCallback((node: BandNode) => getMarkerValue(node) > 0, [getMarkerValue]);

  // --- SELECTION HELPERS ---
  const selectedNodeId = selection?.type === 'node' ? selection.data.id : null;
  
  const isNeighbor = useCallback((node: BandNode) => {
      if (!selectedNodeId) return false;
      return data.links.some(link => {
          const sId = (link.source as BandNode).id;
          const tId = (link.target as BandNode).id;
          return (sId === selectedNodeId && tId === node.id) || (tId === selectedNodeId && sId === node.id);
      });
  }, [selectedNodeId, data.links]);

  const isConnectedLink = useCallback((link: BandLink) => {
      if (!selectedNodeId) return false;
      const sId = (link.source as BandNode).id;
      const tId = (link.target as BandNode).id;
      return sId === selectedNodeId || tId === selectedNodeId;
  }, [selectedNodeId]);


  // --- INITIALIZATION ---
  useEffect(() => {
    if (!fgRef.current) return;

    const simulation = fgRef.current.d3Force('charge');
    if(simulation) simulation.strength(-120); 
    
    fgRef.current.d3Force('x', d3.forceX((d: BandNode) => {
        const groupSpacing = 150; 
        return (d.group - 3.5) * groupSpacing;
    }).strength(0.4));
    
    fgRef.current.d3Force('y', d3.forceY(0).strength(0.1));
    fgRef.current.d3Force('z', forceZ(0).strength(0.1));

    const scene = fgRef.current.scene();

    // Add Starfield
    if (!scene.getObjectByName('starfield')) {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 4000;
        const starPositions = new Float32Array(starCount * 3);
        for(let i=0; i<starCount * 3; i++) {
            starPositions[i] = (Math.random() - 0.5) * 3000; 
        }
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starMaterial = new THREE.PointsMaterial({ color: 0x888888, size: 1.5, transparent: true, opacity: 0.6 });
        const starField = new THREE.Points(starGeometry, starMaterial);
        starField.name = 'starfield';
        scene.add(starField);
    }

    // Add Ambient Light
    if (!scene.getObjectByName('ambientLight')) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        ambientLight.name = 'ambientLight';
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 100, 100);
        scene.add(directionalLight);
    }

    // Add Timeline Axis
    if (!scene.getObjectByName('timelineAxis')) {
        const timelineGroup = new THREE.Group();
        timelineGroup.name = 'timelineAxis';
        const yOffset = -200;
        
        // Line
        const material = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.3 });
        const points = [new THREE.Vector3(-800, yOffset, 0), new THREE.Vector3(800, yOffset, 0)];
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
        timelineGroup.add(line);

        // Arrow Head
        const arrowHead = new THREE.Mesh(
            new THREE.ConeGeometry(8, 30, 32), 
            new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.5 })
        );
        arrowHead.position.set(800, yOffset, 0);
        arrowHead.rotation.z = -Math.PI / 2;
        timelineGroup.add(arrowHead);

        // Labels
        const createLabel = (text: string, x: number, align: 'left' | 'center' | 'right') => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if(ctx) {
                const fontSize = 60;
                ctx.font = `Bold ${fontSize}px Arial`;
                const metrics = ctx.measureText(text);
                canvas.width = metrics.width + 40;
                canvas.height = fontSize + 40;
                ctx.font = `Bold ${fontSize}px Arial`;
                ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, canvas.width / 2, canvas.height / 2);
                
                const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, opacity: 0.6 }));
                sprite.scale.set(canvas.width / 2, canvas.height / 2, 1);
                sprite.position.set(x, yOffset - 40, 0);
                return sprite;
            }
            return null;
        };

        const startLabel = createLabel("◀ THE ORIGIN (1950s)", -850, 'right');
        if(startLabel) timelineGroup.add(startLabel);
        const endLabel = createLabel("FUTURE SOUNDS (2020s) ▶", 850, 'left');
        if(endLabel) timelineGroup.add(endLabel);

        scene.add(timelineGroup);
    }
  }, []); 

  // --- CAMERA CONTROL ---
  useEffect(() => {
    const effectiveTargetId = focusedNodeId || searchTargetId;
    
    if (effectiveTargetId && fgRef.current) {
      const node = data.nodes.find(n => n.id === effectiveTargetId);
      if (node) {
        const distance = isTourActive ? 80 : 150;
        const x = node.x || 0;
        const y = node.y || 0;
        const z = node.z || 0;

        fgRef.current.cameraPosition(
          { x: x, y: y + 20, z: z + distance }, 
          { x: x, y: y, z: z }, 
          isTourActive ? 2500 : 1000 
        );

        if(!isTourActive) {
            setTimeout(() => onNodeClick(node), 200);
        }
      }
    }
  }, [searchTargetId, focusedNodeId, isTourActive, data.nodes, onNodeClick]);


  // --- VISUALIZATION HELPERS ---

  const getNodeThreeObject = useCallback((node: BandNode) => {
    let isVisible = false; // Default invisible labels
    const isSelected = node.id === selectedNodeId;
    const isHighlighted = highlightedNodeIds?.has(node.id);
    const isHovered = hoveredNode?.id === node.id;

    if (isTourActive && focusedNodeId) {
        isVisible = node.id === focusedNodeId; 
    } else if (isSynthActive) {
        isVisible = isSynthMatch(node);
    } else if (tracedMarker) {
        isVisible = hasMarker(node);
    } else if (selectedNodeId) {
        isVisible = isSelected || isNeighbor(node);
    } else if (isHovered) {
        isVisible = true; // Show on hover
    }

    // Always show highlighted (discovered) nodes
    if (isHighlighted) isVisible = true;

    if (!isVisible) return null;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    // Highlight logic
    const fontSize = isSelected || isHighlighted ? 64 : (isHovered ? 48 : 24); 
    const fontFace = 'Arial, sans-serif';
    context.font = `Bold ${fontSize}px ${fontFace}`;
    
    const text = node.label;
    const metrics = context.measureText(text);
    
    canvas.width = metrics.width + 20;
    canvas.height = fontSize + 40;
    
    context.font = `Bold ${fontSize}px ${fontFace}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    if (isHighlighted) {
        // Gold Glow for Discovery
        context.shadowColor = '#fbbf24'; 
        context.shadowBlur = 20;
        context.fillStyle = '#fbbf24';
    } else if (isSelected) {
        context.shadowColor = node.color;
        context.shadowBlur = 15;
        context.fillStyle = '#ffffff';
    } else if (isHovered) {
        context.shadowColor = node.color;
        context.shadowBlur = 10;
        context.fillStyle = '#ffffff';
    } else {
        context.shadowColor = 'rgba(0, 0, 0, 0.8)';
        context.shadowBlur = 4;
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    }

    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
        map: new THREE.CanvasTexture(canvas), 
        transparent: true, 
        opacity: isSelected || isHighlighted || isHovered ? 1 : 0.85,
        depthTest: !(isSelected || isHighlighted || isHovered) // Always on top if active
    }));
    
    sprite.scale.set(canvas.width / 10, canvas.height / 10, 1);
    sprite.position.set(0, (isSelected || isHighlighted || isHovered) ? -node.size - 10 : -node.size - 4, 0); 
    
    if (isSelected || isHighlighted || isHovered) {
        sprite.renderOrder = 999;
    }

    return sprite;
  }, [isTourActive, focusedNodeId, isSynthActive, tracedMarker, isSynthMatch, hasMarker, selectedNodeId, isNeighbor, highlightedNodeIds, hoveredNode]);


  const getNodeColor = (node: BandNode) => {
    if (highlightedNodeIds?.has(node.id)) return '#fbbf24'; // Gold for discovery
    if (isTourActive && focusedNodeId) return node.id === focusedNodeId ? node.color : '#333';
    if (isSynthActive) return isSynthMatch(node) ? node.color : '#222';
    if (tracedMarker) return hasMarker(node) ? '#10b981' : '#222';
    if (selectedNodeId) {
        if (node.id === selectedNodeId) return '#ffffff'; 
        if (isNeighbor(node)) return node.color; 
        return '#333'; 
    }
    if (selection?.type === 'node' && selection.data.id === node.id) return '#ffffff';
    return node.color;
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-[#050505] relative overflow-hidden cursor-grab active:cursor-grabbing">
        <div className="absolute top-4 left-4 z-10 pointer-events-none select-none">
            <div className="flex flex-col items-start">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mix-blend-screen leading-none">
                    AUDIO<span className="text-indigo-500">X</span>
                </h1>
                <p className="text-indigo-400 text-[10px] md:text-xs font-mono tracking-[0.2em] mt-1 ml-0.5 uppercase">
                    Musical DNA Engine v4.0.1
                </p>
            </div>
            <div className="mt-2 flex items-center gap-2">
               <span className="bg-zinc-900/80 text-gray-500 text-[9px] px-2 py-0.5 rounded border border-zinc-800 backdrop-blur-sm">
                 SPACE + DRAG TO PAN
               </span>
            </div>
        </div>

        <ForceGraph3D
            ref={fgRef}
            graphData={data}
            backgroundColor="#000000" 
            showNavInfo={false}
            
            // Updated: Show Name + Title on Hover (Tooltip)
            nodeLabel={(node: any) => `
                <div style="background: rgba(10, 10, 10, 0.9); color: white; padding: 8px 12px; border: 1px solid #333; border-radius: 6px; font-family: sans-serif; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                    <strong style="font-size: 16px; color: ${node.color || '#fff'}; letter-spacing: 0.5px;">${node.label}</strong>
                    <div style="font-size: 10px; color: #aaa; margin-top: 4px; font-weight: 600; text-transform: uppercase;">${node.title || ''}</div>
                </div>
            `}
            
            onNodeHover={(node: BandNode | null) => {
                setHoveredNode(node);
                // Also update cursor
                if (containerRef.current) {
                    containerRef.current.style.cursor = node ? 'pointer' : 'grab';
                }
            }}

            nodeResolution={16} 
            nodeColor={getNodeColor}
            
            nodeVal={(node) => {
                let size = node.size * 0.5; 
                if (highlightedNodeIds?.has(node.id)) size *= 1.8; // Bigger discovery
                if (isTourActive && focusedNodeId && node.id === focusedNodeId) size *= 1.5;
                if (isSynthActive && isSynthMatch(node)) size += (getSynthScore(node as BandNode) * 3);
                if (selectedNodeId === node.id) size *= 1.2; 
                return size;
            }}
            
            nodeOpacity={0.9}
            nodeThreeObjectExtend={true}
            nodeThreeObject={getNodeThreeObject}

            onNodeClick={(node) => {
                const distance = 120;
                if(node.x && node.y && node.z !== undefined && fgRef.current) {
                    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
                    fgRef.current.cameraPosition(
                        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                        { x: node.x, y: node.y, z: node.z },
                        1000
                    );
                }
                onNodeClick(node as BandNode);
            }}
            
            onBackgroundClick={onBackgroundClick}

            linkColor={(link: any) => {
                const l = link as BandLink;
                if (isTourActive) return '#222';
                // Always show links connected to highlighted nodes
                const sId = (l.source as BandNode).id;
                const tId = (l.target as BandNode).id;
                if (highlightedNodeIds?.has(sId) || highlightedNodeIds?.has(tId)) return '#fbbf24';

                if (tracedMarker) {
                    const s = l.source as BandNode;
                    const t = l.target as BandNode;
                    if (hasMarker(s) && hasMarker(t)) return '#10b981';
                    return '#222';
                }
                if (selectedNodeId) {
                    if (sId === selectedNodeId) return '#22d3ee'; 
                    if (tId === selectedNodeId) return '#e879f9'; 
                    return '#111';
                }
                if (selection?.type === 'link' && selection.data === link) return '#6366f1'; 
                if (l.influenceType === 'stylistic') return '#444'; 
                return '#666';
            }}
            
            linkWidth={(link: any) => {
                if (selectedNodeId && isConnectedLink(link)) return 2.5; 
                if (selection?.type === 'link' && selection.data === link) return 2;
                if (tracedMarker) {
                    const s = link.source as BandNode;
                    const t = link.target as BandNode;
                    if (hasMarker(s) && hasMarker(t)) return 1.5;
                }
                // Thicker links for discoveries
                const l = link as BandLink;
                if (highlightedNodeIds?.has((l.source as BandNode).id) || highlightedNodeIds?.has((l.target as BandNode).id)) return 1.5;

                return 0.3; 
            }}
            
            linkOpacity={selectedNodeId ? 0.2 : 0.3}
            
            linkLabel={(link: any) => {
                const l = link as BandLink;
                const s = l.source as BandNode;
                const t = l.target as BandNode;
                return `
                    <div style="text-align: center; font-family: sans-serif; padding: 4px;">
                        <div style="margin-bottom: 4px; font-size: 14px;">
                            <span style="color: #22d3ee; font-weight: 800;">${s.label}</span> 
                            <span style="color: #888; margin: 0 4px;">➔</span> 
                            <span style="color: #e879f9; font-weight: 800;">${t.label}</span>
                        </div>
                        <div style="font-size: 10px; text-transform: uppercase; color: #aaa; letter-spacing: 1px; font-weight: bold; margin-bottom: 2px;">
                            ${l.influenceType} INFLUENCE
                        </div>
                        <div style="font-size: 12px; color: #fff; max-width: 200px; line-height: 1.2;">
                            "${l.influenceContext || ''}"
                        </div>
                    </div>
                `;
            }}
            
            onLinkClick={(link: any) => {
                onLinkClick(link as BandLink, (link.source as BandNode).label, (link.target as BandNode).label);
            }}

            linkDirectionalParticles={(link: any) => {
                const l = link as BandLink;
                if (selectedNodeId && isConnectedLink(link)) return 4;
                if (highlightedNodeIds?.has((l.source as BandNode).id) || highlightedNodeIds?.has((l.target as BandNode).id)) return 4; // Flow for discoveries
                
                if (tracedMarker) {
                    const s = l.source as BandNode;
                    const t = l.target as BandNode;
                    if (hasMarker(s) && hasMarker(t)) {
                        return Math.min(getMarkerValue(s), getMarkerValue(t)); 
                    }
                }
                if (selection?.type === 'link' && selection.data === link) return 4;
                return 0;
            }}
            linkDirectionalParticleWidth={(link: any) => {
                const l = link as BandLink;
                if (highlightedNodeIds?.has((l.source as BandNode).id) || highlightedNodeIds?.has((l.target as BandNode).id)) return 3;
                return selectedNodeId && isConnectedLink(link) ? 4 : 2;
            }}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleColor={(link: any) => {
                if (selectedNodeId) {
                     const sId = (link.source as BandNode).id;
                     if (sId === selectedNodeId) return '#22d3ee';
                     return '#e879f9'; 
                }
                const l = link as BandLink;
                if (highlightedNodeIds?.has((l.source as BandNode).id) || highlightedNodeIds?.has((l.target as BandNode).id)) return '#fbbf24';
                return tracedMarker ? '#10b981' : '#6366f1';
            }}

            d3AlphaDecay={0.01} 
            d3VelocityDecay={0.3}
            warmupTicks={100}
            cooldownTicks={1000}
        />
        
        {/* Influence Legend (Hidden if highlighting discovery) */}
        {selectedNodeId && !highlightedNodeIds?.size && (
            <div className="absolute top-20 right-6 z-20 bg-zinc-900/80 backdrop-blur-md p-3 rounded-lg border border-zinc-700 animate-fadeIn pointer-events-none hidden sm:block">
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-wider">Influence Flow</div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-0.5 bg-[#e879f9] shadow-[0_0_5px_#e879f9]"></span>
                    <span className="text-xs text-gray-300">Influenced By (Input)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-0.5 bg-[#22d3ee] shadow-[0_0_5px_#22d3ee]"></span>
                    <span className="text-xs text-gray-300">Influenced (Output)</span>
                </div>
            </div>
        )}
    </div>
  );
});

export default ForceGraph;
