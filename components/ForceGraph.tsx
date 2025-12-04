import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { BandNode, BandLink, GraphData, SelectionType, TracedMarker } from '../types';

interface ForceGraphProps {
  data: GraphData;
  onNodeClick: (node: BandNode) => void;
  onLinkClick: (link: BandLink, sourceLabel: string, targetLabel: string) => void;
  selection: SelectionType;
  searchTargetId: string | null;
  focusedNodeId?: string | null; // Unified focus prop for Search & Tours
  isTourActive?: boolean; // Spotlight mode flag
  tracedMarker: TracedMarker | null;
  synthResults?: Map<string, number> | null; // NodeId -> Score
}

const ForceGraph: React.FC<ForceGraphProps> = ({ 
    data, 
    onNodeClick, 
    onLinkClick, 
    selection, 
    searchTargetId, 
    focusedNodeId, 
    isTourActive,
    tracedMarker, 
    synthResults 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<BandNode, BandLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const particlesRef = useRef<any[]>([]);
  const animationFrameRef = useRef<number>(0);

  // Initialize Graph
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.nodes.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // --- DEFINE MARKERS (ARROWS) ---
    const defs = svg.append("defs");

    // Default Arrow
    defs.append("marker")
      .attr("id", "arrow-default")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 0) 
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#555") 
      .attr("fill-opacity", 0.6)
      .attr("d", "M0,-5L10,0L0,5");

    // Active/Selected Arrow
    defs.append("marker")
      .attr("id", "arrow-active")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 0)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#6366f1") // Indigo
      .attr("d", "M0,-5L10,0L0,5");
    
    // Trace Arrow (Emerald)
    defs.append("marker")
      .attr("id", "arrow-trace")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 0)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#10b981") // Emerald
      .attr("d", "M0,-5L10,0L0,5");


    const g = svg.append("g");
    gRef.current = g;

    // --- TIMELINE AXIS LABELS (Background) ---
    const timelineLabels = [
        { label: "Ancestors", x: width * 0.1 },
        { label: "1960s Roots", x: width * 0.3 },
        { label: "70s Rock & Prog", x: width * 0.5 },
        { label: "80s Metal", x: width * 0.7 },
        { label: "Modern & Branches", x: width * 0.9 }
    ];

    g.append("g")
        .attr("class", "timeline-labels")
        .selectAll("text")
        .data(timelineLabels)
        .join("text")
        .attr("x", d => d.x)
        .attr("y", height * 0.15) 
        .text(d => d.label)
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .attr("font-size", `${Math.min(width * 0.05, 80)}px`) 
        .attr("font-weight", "900")
        .attr("opacity", 0.5) 
        .style("pointer-events", "none");


    // Zoom behavior with LOD Logic
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        const { k } = event.transform;
        g.attr("transform", event.transform);
        
        // Level of Detail (LOD) Logic
        // Ghost nodes (root/branch) are invisible at zoom < 0.6, and fade in until 1.0
        // Modified to start visible (0.4) and fade to 1
        const ghostOpacity = k > 1.0 ? 1 : Math.max(0.4, k); 
        
        // Apply opacity to ghost nodes
        g.selectAll(".node-tier-ghost").attr("opacity", ghostOpacity);
        // Enable pointer events when reasonable visible
        g.selectAll(".node-tier-ghost").style("pointer-events", k > 0.6 ? "all" : "none");
        
        // Apply opacity to ghost links
        g.selectAll(".link-tier-ghost").attr("opacity", ghostOpacity * 0.5);
      });
    
    zoomRef.current = zoom;
    svg.call(zoom);

    // Initial positioning
    data.nodes.forEach(d => {
        // Spread groups more widely for LOD
        if (!d.x) d.x = width / 2 + (d.group - 3.5) * 220; 
        if (!d.y) d.y = height / 2 + (Math.random() - 0.5) * 200;
    });

    // Simulation Setup
    const simulation = d3.forceSimulation<BandNode, BandLink>(data.nodes)
      .force("link", d3.forceLink<BandNode, BandLink>(data.links)
            .id(d => d.id)
            .distance(d => {
                const strength = d.width || 1;
                return Math.max(60, 200 - (strength * 30));
            })
      )
      .force("charge", d3.forceManyBody().strength(-800)) 
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force("collide", d3.forceCollide().radius(d => d.size + 25).strength(0.7))
      // Timeline Force
      .force("x", d3.forceX((d) => {
          const groupSpacing = 220;
          return width / 2 + (d.group - 3.5) * groupSpacing;
      }).strength(0.35)) 
      .force("y", d3.forceY(height / 2).strength(0.1));

    simulationRef.current = simulation;

    // --- LINKS ---
    const linkGroup = g.append("g").attr("class", "links");

    const linkEnter = linkGroup.selectAll("g")
      .data(data.links)
      .join("g")
      .attr("class", (d) => {
          const s = d.source as BandNode;
          const t = d.target as BandNode;
          const isGhost = (s.tier === 'root' || s.tier === 'branch' || t.tier === 'root' || t.tier === 'branch');
          return `link-group ${isGhost ? 'link-tier-ghost' : 'link-tier-core'}`;
      })
      .attr("cursor", "pointer")
      // Set initial opacity for ghost links (visible but faint)
      .attr("opacity", (d) => {
          const s = d.source as BandNode;
          const t = d.target as BandNode;
          const isGhost = (s.tier === 'root' || s.tier === 'branch' || t.tier === 'root' || t.tier === 'branch');
          return isGhost ? 0.3 : 1;
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        const s = d.source as BandNode;
        const t = d.target as BandNode;
        onLinkClick(d, s.label, t.label);
      });

    // Invisible thick line for click detection
    const linkHitArea = linkEnter.append("line")
      .attr("stroke", "transparent")
      .attr("stroke-width", 25);
      
    // Tooltip for link
    linkHitArea.append("title")
        .text(d => `${d.influenceType ? d.influenceType.toUpperCase() + ': ' : ''}${d.influenceContext || 'Click to analyze connection'}`);

    // Visible line with arrow
    const linkVisible = linkEnter.append("line")
      .attr("class", "visible-link")
      .attr("stroke", "#555555")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", d => Math.max(1, (d.width || 1)))
      .attr("marker-end", "url(#arrow-default)")
      // Dashed line for stylistic influence
      .attr("stroke-dasharray", d => d.influenceType === 'stylistic' ? "5,5" : "0");
    
    // Particle Flow Group (For Trace Mode)
    const particlesGroup = g.append("g").attr("class", "particles");

    // --- NODES ---
    const node = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("class", d => d.tier === 'root' || d.tier === 'branch' ? 'node-tier-ghost' : 'node-tier-core')
      .attr("cursor", "pointer")
      // Set initial opacity for ghost nodes (visible but faint)
      .attr("opacity", d => d.tier === 'root' || d.tier === 'branch' ? 0.4 : 1)
      .style("pointer-events", "all")
      .call(d3.drag<SVGGElement, BandNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Circle
    node.append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => d.color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("class", "node-circle")
      .transition().duration(500);

    // Label
    node.append("text")
      .attr("x", d => d.size + 8)
      .attr("y", 5)
      .text(d => d.label)
      .attr("fill", "white")
      .attr("font-size", "14px")
      .attr("font-weight", "600")
      .style("pointer-events", "none")
      .style("text-shadow", "0 2px 4px rgba(0,0,0,0.8)")
      .attr("class", "node-label");

    // Click Interaction
    node.on("click", (event, d) => {
      event.stopPropagation();
      onNodeClick(d);
    });

    // Tick Function
    simulation.on("tick", () => {
      
      const calculateLinkEndpoints = (l: BandLink) => {
          const s = l.source as BandNode;
          const t = l.target as BandNode;
          
          if (!s.x || !s.y || !t.x || !t.y) return { x1: 0, y1: 0, x2: 0, y2: 0 };

          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist === 0) return { x1: s.x, y1: s.y, x2: t.x, y2: t.y };

          const targetOffset = t.size + 12; 
          
          const nx = dx / dist;
          const ny = dy / dist;

          const x2 = t.x - nx * targetOffset;
          const y2 = t.y - ny * targetOffset;

          return { x1: s.x, y1: s.y, x2, y2 };
      };

      // Update Links
      const linkCoords = new Map();

      linkHitArea
        .attr("x1", d => calculateLinkEndpoints(d).x1)
        .attr("y1", d => calculateLinkEndpoints(d).y1)
        .attr("x2", d => calculateLinkEndpoints(d).x2)
        .attr("y2", d => calculateLinkEndpoints(d).y2);

      linkVisible
        .attr("x1", function(d) {
            const coords = calculateLinkEndpoints(d);
            linkCoords.set(d.index, coords);
            return coords.x1;
        })
        .attr("y1", d => calculateLinkEndpoints(d).y1)
        .attr("x2", d => calculateLinkEndpoints(d).x2)
        .attr("y2", d => calculateLinkEndpoints(d).y2);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);

      // Update Particles
      if (particlesRef.current.length > 0) {
          particlesRef.current.forEach(p => {
              const coords = linkCoords.get(p.linkIndex);
              if (coords) {
                  p.start = { x: coords.x1, y: coords.y1 };
                  p.end = { x: coords.x2, y: coords.y2 };
              }
          });
      }
    });

    function dragstarted(event: d3.D3DragEvent<SVGGElement, BandNode, BandNode>, d: BandNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, BandNode, BandNode>, d: BandNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, BandNode, BandNode>, d: BandNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [data]); 

  // --- REACTIVE UPDATES (Selection & Search & Trace & Synth) ---
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    
    // Helper for Tracing
    const getMarkerValue = (node: BandNode): number => {
        if (!tracedMarker) return 0;
        if (!node.dnaProfile) return 0;
        const layer = node.dnaProfile[Object.keys(node.dnaProfile).find(k => node.dnaProfile![k].some(m => m.id === tracedMarker.id)) || ""];
        const marker = layer?.find(m => m.id === tracedMarker.id);
        return marker ? marker.value : 0;
    };
    const hasMarker = (node: BandNode) => getMarkerValue(node) > 0;

    // Helper for Synth
    const isSynthActive = !!synthResults;
    const isSynthMatch = (node: BandNode) => synthResults && synthResults.has(node.id);
    const getSynthScore = (node: BandNode) => (synthResults && synthResults.get(node.id)) || 0;

    // --- NODE STYLING ---
    svg.selectAll<SVGCircleElement, BandNode>(".node-circle")
      .attr("stroke", d => {
        if (isTourActive && focusedNodeId) return d.id === focusedNodeId ? "#ffffff" : "#444";
        if (isSynthActive && isSynthMatch(d)) return "#fca5a5"; 
        if (selection?.type === 'node' && selection.data.id === d.id) return "#fff";
        if (tracedMarker && hasMarker(d)) return "#10b981"; 
        return "#222"; 
      })
      .attr("stroke-width", d => {
        if (isTourActive && focusedNodeId) return d.id === focusedNodeId ? 6 : 1;
        if (isSynthActive) return isSynthMatch(d) ? 4 : 2;
        if (selection?.type === 'node' && selection.data.id === d.id) return 6;
        if (tracedMarker && hasMarker(d)) return 4;
        return 2;
      })
      .attr("fill-opacity", d => {
        // Spotlight Mode (Tour)
        if (isTourActive && focusedNodeId) {
             return d.id === focusedNodeId ? 1 : 0.1;
        }

        if (isSynthActive) {
            return isSynthMatch(d) ? 1 : 0.1; 
        }

        if (tracedMarker) {
            return hasMarker(d) ? 1 : 0.1; 
        }

        if (!selection) return 1;
        
        let isConnected = false;
        if (selection.type === 'node') {
           if (selection.data.id === d.id) isConnected = true;
           data.links.forEach(l => {
               if ((l.source as BandNode).id === selection.data.id && (l.target as BandNode).id === d.id) isConnected = true;
               if ((l.target as BandNode).id === selection.data.id && (l.source as BandNode).id === d.id) isConnected = true;
           });
        } else if (selection.type === 'link') {
            if ((selection.data.source as BandNode).id === d.id) isConnected = true;
            if ((selection.data.target as BandNode).id === d.id) isConnected = true;
        }
        return isConnected ? 1 : 0.2;
      })
      .attr("r", d => {
          if (isTourActive && focusedNodeId && d.id === focusedNodeId) return d.size * 1.3;
          if (isSynthActive && isSynthMatch(d)) {
              return d.size + (getSynthScore(d) * 5); 
          }
          return d.size;
      });
      
    // Node Labels Opacity
    svg.selectAll<SVGTextElement, BandNode>(".node-label")
        .attr("opacity", d => {
            if (isTourActive && focusedNodeId) return d.id === focusedNodeId ? 1 : 0;
            if (isSynthActive) return isSynthMatch(d) ? 1 : 0.1;
            if (tracedMarker) return hasMarker(d) ? 1 : 0.1;
            return 1;
        });

    // --- LINK STYLING ---
    svg.selectAll<SVGLineElement, BandLink>(".visible-link")
      .attr("stroke", (d) => {
        if (isTourActive) return "#222"; // Fade links in tour mode
        if (isSynthActive) return "#333"; 
        if (tracedMarker) {
            const s = d.source as BandNode;
            const t = d.target as BandNode;
            if (hasMarker(s) && hasMarker(t)) return "#10b981"; 
            return "#444";
        }
        if (selection?.type === 'link' && d === selection.data) return "#6366f1"; 
        return "#888";
      })
      .attr("stroke-opacity", (d) => {
        if (isTourActive) return 0.05; 
        if (isSynthActive) return 0.05; 
        const s = d.source as BandNode;
        const t = d.target as BandNode;
        if (tracedMarker) return (hasMarker(s) && hasMarker(t)) ? 0.8 : 0.05;
        if (selection?.type === 'link' && d === selection.data) return 1;
        if (selection) return 0.1;
        return 0.5;
      });
      
      // ... (Particles logic unchanged) ...

  }, [selection, data, tracedMarker, synthResults, isTourActive, focusedNodeId]);

  // Handle Zoom (Search OR Tour)
  useEffect(() => {
    // Determine the effective target and duration logic
    const effectiveTargetId = focusedNodeId || searchTargetId;
    const isTour = !!isTourActive;

    if (effectiveTargetId && svgRef.current && zoomRef.current && gRef.current) {
      const targetNode = data.nodes.find(n => n.id === effectiveTargetId);
      if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
        const svg = d3.select(svgRef.current);
        const width = containerRef.current?.clientWidth || 0;
        const height = containerRef.current?.clientHeight || 0;
        
        // Tours = Closer zoom, Slower pan
        const scale = isTour ? 3.0 : 2.5; 
        const duration = isTour ? 2000 : 750;

        const x = -targetNode.x * scale + width / 2;
        const y = -targetNode.y * scale + height / 2;
        
        const transform = d3.zoomIdentity.translate(x, y).scale(scale);

        svg.transition()
          .duration(duration)
          .ease(d3.easeCubicOut) // Smooth easing for cinematic feel
          .call(zoomRef.current.transform, transform);
          
        if (!isTour) {
            onNodeClick(targetNode);
        }
      }
    }
  }, [searchTargetId, focusedNodeId, data.nodes, isTourActive]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#111111] relative overflow-hidden">
        <div className="absolute top-4 left-4 z-10 pointer-events-none select-none">
            <h1 className="text-4xl font-black text-white drop-shadow-lg tracking-tighter">ROCK GENEALOGY</h1>
            <p className="text-indigo-400 text-sm font-mono drop-shadow-md tracking-wider">MUSICAL DNA VISUALIZER</p>
        </div>
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
    </div>
  );
};

export default ForceGraph;