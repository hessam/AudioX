import { BandNode, DnaProfile } from '../types';

export interface SynthParams {
    heaviness: number;   // 0-100
    speed: number;       // 0-100
    atmosphere: number;  // 0-100
    complexity: number;  // 0-100
    groove: number;      // 0-100
    vocals: number;      // 0-100 (Instrumental <-> Vocal Centric)
    production: number;  // 0-100 (Raw/LoFi <-> Polished/HiFi)
    mood: number;        // 0-100 (Dark/Minor <-> Bright/Major)
}

export const DEFAULT_SYNTH_PARAMS: SynthParams = {
    heaviness: 0,
    speed: 0,
    atmosphere: 0,
    complexity: 0,
    groove: 0,
    vocals: 0,
    production: 0,
    mood: 0
};

// Helper: Check if a node has a specific DNA marker and return its value (0-5)
const getDnaVal = (profile: DnaProfile | undefined, id: string): number => {
    if (!profile) return 0;
    for (const layerKey in profile) {
        const marker = profile[layerKey].find(m => m.id === id);
        if (marker) return marker.value;
    }
    return 0;
};

// Helper: Check for keyword matches in metadata (Title/Genre)
const checkMeta = (node: BandNode, keywords: string[]): boolean => {
    const text = (node.title + " " + node.label).toLowerCase();
    return keywords.some(k => text.includes(k.toLowerCase()));
};

// --- CORE LOGIC ENGINE ---
export const calculateSynthScore = (node: BandNode, params: SynthParams): number => {
    let score = 0;
    let maxPossible = 0;

    // Helper to calculate score for a single dimension
    const evalDimension = (paramValue: number, calculateBandValue: () => number) => {
        if (paramValue <= 10) return; // Slider at 0-10 means "Don't Care"
        
        maxPossible += 10;
        const bandVal = Math.min(10, calculateBandValue()); // Ensure 0-10 range
        const target = paramValue / 10; // Scale 0-100 to 0-10
        const diff = Math.abs(target - bandVal);
        score += (10 - diff);
    };

    // 1. HEAVINESS (Distortion, Aggression)
    evalDimension(params.heaviness, () => {
        let v = 0;
        // DNA
        v += getDnaVal(node.dnaProfile, "F33"); // Tube Dist
        v += getDnaVal(node.dnaProfile, "B34"); // Dist Bass
        v += getDnaVal(node.dnaProfile, "P20"); // Scream
        v += getDnaVal(node.dnaProfile, "H25"); // Power Chord
        // Meta
        if (checkMeta(node, ["Metal", "Heavy", "Thrash", "Doom"])) v += 4;
        if (checkMeta(node, ["Hard Rock", "Grunge"])) v += 2;
        return v;
    });

    // 2. SPEED (Tempo, Note Density)
    evalDimension(params.speed, () => {
        let v = 0;
        // DNA
        v += getDnaVal(node.dnaProfile, "RH8") * 2; // BPM > 180 (strong weight)
        v += getDnaVal(node.dnaProfile, "RH7"); // BPM 160-180
        v += getDnaVal(node.dnaProfile, "D30"); // Double Pedal
        v += getDnaVal(node.dnaProfile, "R40"); // Blast Beat
        v += getDnaVal(node.dnaProfile, "R1");  // 16th notes
        // Meta
        if (checkMeta(node, ["Thrash", "Speed", "Power Metal", "Punk"])) v += 5;
        if (checkMeta(node, ["Doom", "Sludge"])) v -= 3; // Penalty for slow
        return v;
    });

    // 3. ATMOSPHERE (Reverb, Space, Psych)
    evalDimension(params.atmosphere, () => {
        let v = 0;
        // DNA
        v += getDnaVal(node.dnaProfile, "F1"); // Hall Reverb
        v += getDnaVal(node.dnaProfile, "F8"); // Shimmer
        v += getDnaVal(node.dnaProfile, "C60"); // Ambient
        v += getDnaVal(node.dnaProfile, "IS129"); // Synths
        // Meta
        if (checkMeta(node, ["Psych", "Prog", "Art", "Shoegaze", "Pink Floyd", "Tool"])) v += 4;
        return v;
    });

    // 4. COMPLEXITY (Odd Times, Virtuosity)
    evalDimension(params.complexity, () => {
        let v = 0;
        // DNA
        v += getDnaVal(node.dnaProfile, "RH18"); // Polymetric
        v += getDnaVal(node.dnaProfile, "RH15"); // 7/4
        v += getDnaVal(node.dnaProfile, "MS18"); // Tempo Change
        v += getDnaVal(node.dnaProfile, "A10"); // Solo Guitar
        // Meta
        if (checkMeta(node, ["Prog", "Technical", "Math", "Jazz", "Fusion"])) v += 6;
        if (checkMeta(node, ["Punk", "Garage"])) v -= 2;
        return v;
    });

    // 5. GROOVE (Swing, Syncopation, Bass)
    evalDimension(params.groove, () => {
        let v = 0;
        // DNA
        v += getDnaVal(node.dnaProfile, "G5"); // Swing
        v += getDnaVal(node.dnaProfile, "R14"); // Human Swing
        v += getDnaVal(node.dnaProfile, "H11"); // Blues Scale
        v += getDnaVal(node.dnaProfile, "B3"); // Slap Bass
        // Meta
        if (checkMeta(node, ["Funk", "Soul", "Blues", "Groove", "Southern"])) v += 5;
        if (checkMeta(node, ["Pantera", "Rage"])) v += 4;
        return v;
    });

    // 6. VOCALS (Instrumental vs Vocal Dominance)
    evalDimension(params.vocals, () => {
        let v = 0;
        // DNA
        v += getDnaVal(node.dnaProfile, "SS1") * 2; // Vocal Conf High
        v += getDnaVal(node.dnaProfile, "P27"); // Choir
        v += getDnaVal(node.dnaProfile, "P33"); // Belting
        // Meta
        if (checkMeta(node, ["Instrumental"])) return 0; // Hard override
        if (checkMeta(node, ["Queen", "Opera", "Choral"])) v += 4;
        return v;
    });

    // 7. PRODUCTION (LoFi vs HiFi)
    evalDimension(params.production, () => {
        let v = 0; // 0=Raw, 10=Polished
        // DNA
        v += getDnaVal(node.dnaProfile, "HE25") * 2; // Hi-Fi
        v += getDnaVal(node.dnaProfile, "PF92"); // Major Label
        v -= getDnaVal(node.dnaProfile, "HE24"); // Lo-Fi (Penalty)
        v -= getDnaVal(node.dnaProfile, "W22"); // Vinyl Crackle (Penalty)
        // Meta
        if (checkMeta(node, ["Modern", "Pop", "Industrial"])) v += 4;
        if (checkMeta(node, ["Garage", "Black Metal", "Roots"])) v -= 2;
        // Default average
        if (v === 0) v = 5; 
        return Math.max(0, v);
    });

    // 8. MOOD (Dark vs Bright)
    evalDimension(params.mood, () => {
        let v = 5; // Start neutral
        // DNA
        if (getDnaVal(node.dnaProfile, "E27")) v -= 3; // Dark
        if (getDnaVal(node.dnaProfile, "H8")) v -= 2; // Minor/Aeolian
        if (getDnaVal(node.dnaProfile, "E30")) v -= 2; // Cold
        
        if (getDnaVal(node.dnaProfile, "E1")) v += 3; // Joy
        if (getDnaVal(node.dnaProfile, "H10")) v += 2; // Major Pentatonic
        if (getDnaVal(node.dnaProfile, "E28")) v += 2; // Bright

        // Meta
        if (checkMeta(node, ["Doom", "Goth", "Black", "Slayer", "Ghost"])) v = 1;
        if (checkMeta(node, ["Pop", "Glam", "Beatles", "Queen"])) v = 9;
        
        return v;
    });

    if (maxPossible === 0) return 0;
    return score / maxPossible; // 0 to 1
};