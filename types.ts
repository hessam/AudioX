import { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

export interface DnaEntry {
  id: string;
  value: number; // 0-5 Scale (0=Absent, 5=Dominant)
}

export interface DnaProfile {
  [layerId: string]: DnaEntry[]; 
}

export interface BandNode extends SimulationNodeDatum {
  id: string;
  label: string;
  color: string;
  title: string;
  size: number;
  group: number;
  tier?: 'core' | 'root' | 'branch'; // Level of Detail: 'core' is always visible, others fade in on zoom
  
  // Coordinates (2D & 3D)
  x?: number;
  y?: number;
  z?: number; // Added for 3D
  
  // Velocity
  vx?: number;
  vy?: number;
  vz?: number; // Added for 3D
  
  // Fixed Position
  fx?: number | null;
  fy?: number | null;
  fz?: number | null; // Added for 3D

  dnaProfile?: DnaProfile; // Updated to support values
  isSequenced?: boolean; // True if AI has generated high-res DNA
}

export interface BandLink extends SimulationLinkDatum<BandNode> {
  source: string | BandNode;
  target: string | BandNode;
  width: number;
  color?: string;
  influenceType?: 'direct' | 'stylistic' | 'compositional' | 'member' | 'cover';
  influenceContext?: string;
}

export interface GraphData {
  nodes: BandNode[];
  links: BandLink[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isLoading?: boolean;
}

export type SelectionType = 
  | { type: 'node'; data: BandNode }
  | { type: 'link'; data: BandLink; sourceLabel: string; targetLabel: string }
  | null;

export interface TracedMarker {
  id: string;
  name: string;
  layerName: string;
}

// --- TOUR INTERFACES ---
export interface TourStep {
  targetId: string;
  narrative: string;
  duration?: number; // Time in ms to stay on this step during auto-play
}

export interface Tour {
  id: string;
  title: string;
  description: string;
  steps: TourStep[];
}