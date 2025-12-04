import { BandNode, BandLink, DnaProfile, DnaEntry, Tour } from './types';
import { DNA_LAYERS } from './dnaData';

// --- 1. DEFINING LINKS FIRST (To drive inheritance) ---
export const LINKS: BandLink[] = [
    // Roots -> Evolution
    { source: "The Animals", target: "Deep Purple", width: 3, influenceType: 'stylistic', influenceContext: "The gritty, blues-based vocal delivery of Eric Burdon heavily influenced Ian Gillan's style." },
    { source: "The Animals", target: "The Doors", width: 2, influenceType: 'stylistic', influenceContext: "Shared roots in dark, bluesy psychedelia." },
    { source: "The Beatles", target: "Queen", width: 4, influenceType: 'compositional', influenceContext: "Harmonic complexity, studio experimentation, and multi-part vocal harmonies." },
    { source: "Rolling Stones", target: "Aerosmith", width: 4, influenceType: 'stylistic', influenceContext: "The 'Bad Boys' attitude, Jagger's swagger, and blues-rock riff structures." }, 
    { source: "Cream", target: "Black Sabbath", width: 4, influenceType: 'stylistic', influenceContext: "Heavy, distorted blues riffs played at high volume were the blueprint for metal." },
    
    // Hendrix Influence
    { source: "Jimi Hendrix", target: "Cream", width: 5, influenceType: 'stylistic', influenceContext: "Mutual admiration; Clapton was famously intimidated by Hendrix's technique." }, 
    { source: "Jimi Hendrix", target: "Black Sabbath", width: 3, influenceType: 'stylistic', influenceContext: "The heavy, down-tuned tritone sound influenced Iommi." },
    { source: "Jimi Hendrix", target: "Deep Purple", width: 3, influenceType: 'stylistic', influenceContext: "Ritchie Blackmore adopted the heavy feedback and Stratocaster abuse." },
    { source: "Jimi Hendrix", target: "Stevie Ray Vaughan", width: 5, influenceType: 'stylistic', influenceContext: "SRV built his entire style on Hendrix's vocabulary, notably covering 'Voodoo Child'." },

    // Southern Connections
    { source: "Allman Bros", target: "Lynyrd Skynyrd", width: 5, influenceType: 'stylistic', influenceContext: "Established the dual-lead guitar harmony attack standard in Southern Rock." },
    { source: "Lynyrd Skynyrd", target: "ZZ Top", width: 4, influenceType: 'stylistic', influenceContext: "Shared Texas/Southern boogie roots and gritty storytelling." },
    { source: "Lynyrd Skynyrd", target: "Metallica", width: 1, influenceType: 'cover', influenceContext: "Metallica covered 'Tuesday's Gone', showing their softer southern roots." }, 
    { source: "Eagles", target: "Allman Bros", width: 3, influenceType: 'stylistic', influenceContext: "Country-rock harmonies and twin guitar lines." },
    
    // The Prog/Pomp Web
    { source: "Deep Purple", target: "Uriah Heep", width: 4, influenceType: 'stylistic', influenceContext: "Heavy use of Hammond organ and high-register vocals." },
    { source: "Deep Purple", target: "Iron Maiden", width: 2, influenceType: 'stylistic', influenceContext: "Galloping rhythms and twin guitar harmonies." },
    { source: "Deep Purple", target: "Rush", width: 2, influenceType: 'stylistic', influenceContext: "Hard rock virtuosity mixed with classical influences." },
    { source: "Deep Purple", target: "Dream Theater", width: 2, influenceType: 'stylistic', influenceContext: "Technical prowess and keyboard/guitar duels." },
    { source: "Yes", target: "Kansas", width: 4, influenceType: 'compositional', influenceContext: "Bringing complex British prog structures to an American arena rock format." },
    { source: "Yes", target: "Rush", width: 3, influenceType: 'compositional', influenceContext: "Complex time signatures and high-register vocals." },
    { source: "Pink Floyd", target: "Tool", width: 3, influenceType: 'stylistic', influenceContext: "Atmospheric textures, long compositions, and visual art integration." },
    { source: "Pink Floyd", target: "Dream Theater", width: 3, influenceType: 'stylistic', influenceContext: "Concept albums and cinematic soundscapes." },
    { source: "Pink Floyd", target: "Radiohead", width: 4, influenceType: 'stylistic', influenceContext: "Art-rock experimentation and electronic integration." },
    { source: "Queen", target: "Meat Loaf", width: 5, influenceType: 'stylistic', influenceContext: "Theatrical, operatic rock style with piano-driven ballads." },
    { source: "Queen", target: "Kansas", width: 2, influenceType: 'compositional', influenceContext: "Vocal harmonies and blending rock with classical motifs." },
    { source: "Queen", target: "Dream Theater", width: 2, influenceType: 'stylistic', influenceContext: "Brian May's melodic guitar solos and epic song structures." },
    
    // Occult/Heavy Lineage
    { source: "Blue Oyster Cult", target: "Metallica", width: 2, influenceType: 'cover', influenceContext: "Metallica covered 'Astronomy'; shared love for darker lyrical themes." },
    { source: "Blue Oyster Cult", target: "Ghost", width: 5, influenceType: 'stylistic', influenceContext: "Ghost's sound is widely considered a direct modern revival of BOC's melodic occult rock." },
    { source: "Black Sabbath", target: "Blue Oyster Cult", width: 3, influenceType: 'stylistic', influenceContext: "Heavy riff-based songwriting and dark imagery." },
    { source: "Black Sabbath", target: "Metallica", width: 4, influenceType: 'stylistic', influenceContext: "The blueprint for heavy metal riffs and doom tempo sections." },
    { source: "Uriah Heep", target: "Demons and Wizards", width: 1, influenceType: 'stylistic', influenceContext: "High fantasy lyrics and power metal origins." }, 
    
    // Prog Metal Tree
    { source: "Kansas", target: "Dream Theater", width: 3, influenceType: 'compositional', influenceContext: "Complex violin/keyboard distinct passages and odd time signatures." },
    { source: "Rush", target: "Dream Theater", width: 5, influenceType: 'direct', influenceContext: "Primary influence; technical virtuosity and power trio dynamics." },
    { source: "Rush", target: "Tool", width: 3, influenceType: 'compositional', influenceContext: "Mathematical rhythms and philosophical lyrics." },
    { source: "Rush", target: "Primus", width: 3, influenceType: 'stylistic', influenceContext: "Les Claypool cites Geddy Lee as a massive bass influence." },
    
    // Metal Tree
    { source: "Black Sabbath", target: "Judas Priest", width: 5, influenceType: 'stylistic', influenceContext: "Birmingham roots; taking the heavy riff and speeding it up." },
    { source: "Judas Priest", target: "Slayer", width: 3, influenceType: 'stylistic', influenceContext: "Twin guitar attacks and darker lyrical themes." },
    { source: "Judas Priest", target: "Iron Maiden", width: 3, influenceType: 'stylistic', influenceContext: "Refined the NWOBHM dual-guitar sound." },
    { source: "Motorhead", target: "Metallica", width: 4, influenceType: 'direct', influenceContext: "Lars Ulrich was the head of the Motorhead fan club; pure speed influence." },
    { source: "Black Sabbath", target: "Pantera", width: 3, influenceType: 'stylistic', influenceContext: "The heavy groove and 'Paranoid' era riffing." },
    { source: "Metallica", target: "Pantera", width: 3, influenceType: 'stylistic', influenceContext: "Pantera shifted from glam to groove metal largely due to Thrash influence." },
    { source: "Iron Maiden", target: "Metallica", width: 3, influenceType: 'compositional', influenceContext: "Harmony guitars and epic song structures." },
    
    // Led Zeppelin Links (The Missing Core)
    { source: "Robert Johnson", target: "Led Zeppelin", width: 5, influenceType: 'cover', influenceContext: "Direct lineage of blues phrasing and 'Lemon Song' interpolations." },
    { source: "Led Zeppelin", target: "Aerosmith", width: 5, influenceType: 'stylistic', influenceContext: "The absolute prototype for Aerosmith's blues-hard-rock sound." },
    { source: "Led Zeppelin", target: "Rush", width: 4, influenceType: 'stylistic', influenceContext: "Early Rush was heavily modeled on Zeppelin's riff-oriented hard rock." },
    { source: "Led Zeppelin", target: "Soundgarden", width: 4, influenceType: 'stylistic', influenceContext: "Cornell's vocals and the heavy, sludgy riffs are pure Zep." },
    { source: "Led Zeppelin", target: "Tool", width: 2, influenceType: 'stylistic', influenceContext: "Bonham's drumming power and Eastern scales." },
    
    // Cross-Genre / Ancestors (Roots)
    { source: "Robert Johnson", target: "Cream", width: 5, influenceType: 'cover', influenceContext: "Clapton covered 'Crossroads', electrifying the Delta blues." },
    { source: "Muddy Waters", target: "Rolling Stones", width: 5, influenceType: 'direct', influenceContext: "The band named themselves after a Muddy Waters song." },
    { source: "Chuck Berry", target: "The Beatles", width: 5, influenceType: 'cover', influenceContext: "Beatles covered 'Roll Over Beethoven' and 'Rock and Roll Music'." },
    { source: "Little Richard", target: "The Beatles", width: 4, influenceType: 'stylistic', influenceContext: "Paul McCartney's high-energy vocal style ('Woooo!') is pure Little Richard." },
    { source: "Miles Davis", target: "Jimi Hendrix", width: 4, influenceType: 'stylistic', influenceContext: "Mutual admiration; Miles wanted to record with Jimi. Fusion influence." },
    
    // Cross-Genre / Branches
    { source: "Aerosmith", target: "Run-D.M.C.", width: 5, influenceType: 'direct', influenceContext: "The 'Walk This Way' collaboration bridged Rock and Hip-Hop forever." },
    { source: "Black Sabbath", target: "Nine Inch Nails", width: 3, influenceType: 'stylistic', influenceContext: "Doom tempos and dark atmospheres influencing Industrial Metal." },
    { source: "Kraftwerk", target: "Daft Punk", width: 5, influenceType: 'stylistic', influenceContext: "The robot personas and synthesized vocals are direct tributes." },
    { source: "Pink Floyd", target: "Daft Punk", width: 3, influenceType: 'stylistic', influenceContext: "Concept albums and cinematic synthesis." },
    { source: "Nirvana", target: "Radiohead", width: 3, influenceType: 'stylistic', influenceContext: "Creep was notably influenced by the loud-quiet dynamics of Grunge." },
];

// --- 2. SPECIFIC DNA OVERRIDES (v4.0.1 IDs) ---
// We seed key bands with their signature traits.
const SPECIFIC_DNA: Record<string, {id: string, val: number}[]> = {
    "The Animals": [
        {id: "R14", val: 4}, {id: "H1", val: 5}, {id: "P31", val: 5}, {id: "HE4", val: 5}
    ],
    "The Beatles": [
        {id: "R14", val: 4}, {id: "H11", val: 5}, {id: "H17", val: 4}, {id: "P27", val: 5}, {id: "P30", val: 3}, {id: "A9", val: 5}, {id: "PF48", val: 4}
    ],
    "Rolling Stones": [
        {id: "R14", val: 5}, {id: "R10", val: 5}, {id: "H1", val: 5}, {id: "P9", val: 4}, {id: "G63", val: 5}
    ],
    "Jimi Hendrix": [
        {id: "R1", val: 5}, {id: "S3", val: 4}, {id: "H11", val: 5}, {id: "F33", val: 5}, {id: "F36", val: 5}, {id: "H5", val: 3}
    ],
    "The Doors": [
        {id: "F26", val: 5}, {id: "B21", val: 5}, {id: "P31", val: 4}, {id: "H3", val: 5}, {id: "H11", val: 3}
    ],
    "Cream": [
        {id: "R14", val: 4}, {id: "F33", val: 5}, {id: "H1", val: 5}, {id: "A10", val: 5}
    ],
    "Pink Floyd": [
        {id: "F1", val: 5}, // Reverb Hall
        {id: "H3", val: 5}, // Dorian Mode
        {id: "F26", val: 4}, // Rotary Speaker
        {id: "W30", val: 4}, // Silence
        {id: "A39", val: 5}, // Through-composed
        {id: "C60", val: 5}  // Ambient
    ],
    
    "Lynyrd Skynyrd": [
        {id: "R28", val: 4}, {id: "H10", val: 5}, {id: "A10", val: 5}, {id: "C36", val: 4}
    ],
    "Allman Bros": [
        {id: "R14", val: 5}, {id: "H10", val: 5}, {id: "H3", val: 3}, {id: "PF80", val: 4}
    ],
    "ZZ Top": [
        {id: "R10", val: 5}, {id: "H11", val: 5}, {id: "B34", val: 4}, {id: "G5", val: 5}
    ],
    "The Eagles": [
        {id: "P27", val: 5}, {id: "H10", val: 5}, {id: "A10", val: 3}, {id: "C35", val: 5}
    ],

    "Uriah Heep": [
        {id: "F26", val: 5}, {id: "P30", val: 4}, {id: "P27", val: 4}, {id: "H5", val: 3}
    ],
    "Deep Purple": [
        {id: "F26", val: 5}, // Hammond Organ (Rotary)
        {id: "H4", val: 4}, {id: "P20", val: 3}, {id: "P31", val: 5}
    ],
    "Kansas": [
        {id: "MS18", val: 5}, {id: "C36", val: 3}, {id: "H28", val: 4}, {id: "P27", val: 4}
    ],
    "Rush": [
        {id: "MS18", val: 5}, {id: "B10", val: 4}, {id: "P30", val: 5}, {id: "R36", val: 5}, {id: "H5", val: 4}
    ],
    "Queen": [
        {id: "P27", val: 5}, {id: "P30", val: 5}, {id: "H17", val: 4}, {id: "MS17", val: 5}, {id: "PF27", val: 4}
    ],
    "Meat Loaf": [
        {id: "C4", val: 5}, {id: "P31", val: 5}, {id: "MS11", val: 5}, {id: "A9", val: 4}
    ],
    "Blue Oyster Cult": [
        {id: "H8", val: 4}, {id: "P27", val: 4}, {id: "C2", val: 5}
    ],
    "Yes": [
        {id: "MS18", val: 5}, {id: "B10", val: 5}, {id: "P27", val: 5}, {id: "H28", val: 4}
    ],

    "Black Sabbath": [
        {id: "H27", val: 5}, // Tritone (The Devil's Interval)
        {id: "H4", val: 5},  // Phrygian
        {id: "B5", val: 4},  // Palm Mute
        {id: "P9", val: 3}
    ],
    "Judas Priest": [
        {id: "P30", val: 4}, {id: "P18", val: 3}, {id: "D30", val: 4}, {id: "H26", val: 5}
    ],
    "Motorhead": [
        {id: "B34", val: 5}, {id: "D32", val: 5}, {id: "P10", val: 4}
    ],
    "Iron Maiden": [
        {id: "B16", val: 5}, {id: "H26", val: 5}, {id: "P31", val: 4}, {id: "A10", val: 5}
    ],

    "Metallica": [
        {id: "D30", val: 5}, {id: "B5", val: 5}, {id: "P19", val: 3}, {id: "P31", val: 4}, {id: "H4", val: 4}
    ],
    "Slayer": [
        {id: "R40", val: 5}, {id: "H13", val: 5}, {id: "P20", val: 5}, {id: "A54", val: 5}
    ],
    "Pantera": [
        {id: "R14", val: 4}, {id: "B5", val: 5}, {id: "P20", val: 5}, {id: "H11", val: 4}
    ],
    
    "Ghost": [
        {id: "P27", val: 5}, {id: "F26", val: 4}, {id: "H1", val: 4}, {id: "H21", val: 4}
    ],
    "Tool": [
        {id: "H28", val: 5}, {id: "MS18", val: 5}, {id: "B16", val: 4}, {id: "G50", val: 5}
    ],
    "Dream Theater": [
        {id: "MS18", val: 5}, {id: "D30", val: 5}, {id: "P33", val: 4}, {id: "H28", val: 5}, {id: "C52", val: 3}, {id: "B14", val: 5}
    ],
    
    // Missing Node Specific DNA
    "Aerosmith": [
        {id: "P34", val: 5}, {id: "R14", val: 5}, {id: "H1", val: 5}
    ],
    "Stevie Ray Vaughan": [
        {id: "R14", val: 5}, {id: "IS1", val: 5}, {id: "B2", val: 4}
    ],
    "Radiohead": [
        {id: "H53", val: 5}, {id: "F62", val: 5}, {id: "A39", val: 4}
    ],
    "Primus": [
        {id: "B3", val: 5}, {id: "G35", val: 5}, {id: "R9", val: 4}
    ],
    "Led Zeppelin": [
        {id: "R19", val: 5}, {id: "D2", val: 5}, {id: "P33", val: 5}, {id: "H11", val: 5}
    ],
    "Run-D.M.C.": [
        {id: "R16", val: 5}, {id: "P21", val: 5}, {id: "C43", val: 5}
    ],
    "Daft Punk": [
        {id: "R15", val: 5}, {id: "P43", val: 5}, {id: "F49", val: 5}, {id: "IR1", val: 5}
    ],
    "Robert Johnson": [
        {id: "H11", val: 5}, {id: "G5", val: 5}, {id: "P34", val: 4}
    ]
};

// --- Helper Functions ---

const getLayerFromId = (markerId: string): string => {
    // Optimization: find the layer that contains this marker
    for (const layer of DNA_LAYERS) {
        if (layer.markers.some(m => m.id === markerId)) return layer.id;
    }
    // Fallback based on prefix
    const prefix = markerId.replace(/[0-9]/g, '');
    if (prefix === 'W') return "L0";
    if (prefix === 'R') return "L1";
    if (prefix === 'S') return "L2";
    if (prefix === 'H') return "L3"; // Harmonic
    if (prefix === 'P') return "L4";
    if (prefix === 'D') return "L5";
    if (prefix === 'B') return "L6";
    if (prefix === 'F') return "L7";
    if (prefix === 'A') return "L8";
    if (prefix === 'E') return "L9";
    if (prefix === 'C') return "L10";
    if (prefix === 'HE') return "L11"; // Historical Era (Updated from H)
    if (prefix === 'M') return "L12";
    if (prefix === 'RH') return "L13";
    if (prefix === 'SS') return "L14";
    if (prefix === 'IS') return "L15";
    if (prefix === 'G') return "L16";
    if (prefix === 'PM') return "L17";
    if (prefix === 'ML') return "L18";
    if (prefix === 'TA') return "L19";
    if (prefix === 'MS') return "L20";
    if (prefix === 'IR') return "L21";
    if (prefix === 'PF') return "L22";
    if (prefix === 'LS') return "L23";
    return "L1"; 
};

// Assign basic DNA 
const generateInitialDna = (id: string, group: number): DnaProfile => {
    const profile: DnaProfile = {};
    DNA_LAYERS.forEach(layer => {
        profile[layer.id] = [];
    });

    const addMarker = (mid: string, val: number) => {
        const layer = getLayerFromId(mid);
        if (!profile[layer]) profile[layer] = [];
        if (!profile[layer].find(m => m.id === mid)) {
            profile[layer].push({ id: mid, value: val });
        }
    };
    
    // 1. Group Defaults (The "Base Stats")
    addMarker("R10", 5); // Snare on 2&4 (Rock Standard)

    if (group === 0) { // Roots (Blues/Jazz)
        addMarker("H11", 5); // Blues Scale
        addMarker("G5", 5); // Swing 51-55%
        addMarker("R14", 5); // Humanized Swing
        addMarker("IS33", 4); // Guitar Amp Fender
        addMarker("HE1", 5); // Pre-1950
    }
    else if (group === 1) { // 60s Roots
        addMarker("R14", 4); // Swing
        addMarker("H11", 5); // Blues scale
        addMarker("B2", 3); // Finger pluck
        addMarker("P31", 4); // Chest voice
        addMarker("HE4", 5); // 1960-1964
    }
    else if (group === 2) { // 70s Southern
        addMarker("R28", 3); // Tambourine
        addMarker("H10", 5); // Pentatonic Major
        addMarker("G5", 4); // Swing
        addMarker("P31", 5); // Chest
        addMarker("HE6", 5); // 1970-1974
    }
    else if (group === 3) { // Prog
        addMarker("R36", 4); // Tom fill 8ths
        addMarker("H5", 5); // Lydian
        addMarker("H15", 3); // Sus4
        addMarker("MS18", 5); // Tempo change
        addMarker("HE6", 5); 
    }
    else if (group === 4) { // Heavy Metal
        addMarker("H4", 5); // Phrygian
        addMarker("H25", 5); // Power chord
        addMarker("B34", 4); // Distorted bass
        addMarker("P30", 3); // Falsetto
        addMarker("HE8", 5); // 80s
    }
    else if (group === 5) { // Thrash
        addMarker("D30", 5); // Double Pedal
        addMarker("H13", 4); // Chromatic
        addMarker("P19", 4); // Growl
        addMarker("HE8", 5); // 80s
    }
    else if (group === 6) { // Modern
        addMarker("R19", 3); // Ghost notes
        addMarker("H28", 5); // Quartal
        addMarker("D1", 4); // Kick tight
        addMarker("HE10", 5); // 90s+
    }
    else if (group === 7) { // Branches (HipHop/Electronic)
        addMarker("D16", 5); // 909 Kick
        addMarker("IR1", 5); // Sample Exact
        addMarker("PF77", 5); // Loop Based
        addMarker("HE10", 5); // 90s+
    }

    // 2. Specific Overrides
    if (SPECIFIC_DNA[id]) {
        SPECIFIC_DNA[id].forEach(m => {
            addMarker(m.id, m.val);
        });
    }

    return profile;
};

// --- 3. DNA INHERITANCE (The Fix) ---
// This function ensures that if Band A -> Band B, Band B *inherits* some DNA from A.
// This guarantees that the Tracer visualizer will work for connected nodes.
const inheritDna = (nodes: BandNode[], links: BandLink[]): BandNode[] => {
    const nodeMap = new Map<string, BandNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as BandNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as BandNode).id;
        
        const sourceNode = nodeMap.get(sourceId);
        const targetNode = nodeMap.get(targetId);

        if (sourceNode && targetNode && sourceNode.dnaProfile && targetNode.dnaProfile) {
            // Find Source's most dominant traits (Value >= 4)
            const dominantTraits: DnaEntry[] = [];
            Object.values(sourceNode.dnaProfile).forEach(layer => {
                layer.forEach(marker => {
                    if (marker.value >= 4) dominantTraits.push(marker);
                });
            });

            // Pass down 2 random dominant traits to the child if they don't have them
            // This simulates artistic influence
            if (dominantTraits.length > 0) {
                // Deterministic pseudo-random based on string length to keep graph stable across renders
                const traitIndex1 = (sourceId.length + targetId.length) % dominantTraits.length;
                const trait1 = dominantTraits[traitIndex1];
                
                const traitIndex2 = (sourceId.length * targetId.length) % dominantTraits.length;
                const trait2 = dominantTraits[traitIndex2];

                [trait1, trait2].forEach(trait => {
                    if (!trait) return;
                    const layerId = getLayerFromId(trait.id);
                    
                    // Check if child has it
                    const childHasIt = targetNode.dnaProfile![layerId]?.some(m => m.id === trait.id);
                    
                    if (!childHasIt) {
                        // Inherit it with slightly less intensity (-1)
                        if (!targetNode.dnaProfile![layerId]) targetNode.dnaProfile![layerId] = [];
                        targetNode.dnaProfile![layerId].push({
                            id: trait.id,
                            value: Math.max(1, trait.value - 1)
                        });
                    }
                });
            }
        }
    });

    return nodes;
};

// --- 4. GUIDED TOURS ---
export const TOURS: Tour[] = [
  {
    id: "birth_of_metal",
    title: "The Birth of Heavy Metal",
    description: "Trace the lineage from Blues Rock to the heavy sounds of the 80s.",
    steps: [
      { 
        targetId: "Cream", 
        narrative: "It began here. Cream amplified the blues, introducing the high-volume, distorted improvisation that would lay the groundwork for heavy metal.", 
        duration: 8000 
      },
      { 
        targetId: "Jimi Hendrix", 
        narrative: "Hendrix took electricity further. His use of feedback, tritone intervals, and aggression inspired the dark, heavy sounds to come.", 
        duration: 8000 
      },
      { 
        targetId: "Black Sabbath", 
        narrative: "The Origin Point. Tony Iommi slowed down the blues, detuned his guitar, and birthed the 'Doom' sound. Heavy Metal officially begins here.", 
        duration: 8000 
      },
      { 
        targetId: "Judas Priest", 
        narrative: "Priest stripped away the blues swing. They introduced the twin-guitar attack, leather aesthetics, and pure speed.", 
        duration: 7000 
      },
      { 
        targetId: "Metallica", 
        narrative: "The Thrash evolution. Taking the speed of Motorhead and the structure of Diamond Head, Metallica created a faster, more aggressive beast.", 
        duration: 8000 
      }
    ]
  },
  {
    id: "prog_odyssey",
    title: "The Prog Odyssey",
    description: "A journey through time signatures, synthesizers, and concept albums.",
    steps: [
      { 
        targetId: "The Beatles", 
        narrative: "The seeds of Prog. With 'Sgt. Pepper', they proved rock could be high art, utilizing studio experimentation and orchestral arrangements.", 
        duration: 7000 
      },
      { 
        targetId: "Pink Floyd", 
        narrative: "Masters of atmosphere. They expanded the song format into lengthy, philosophical soundscapes and concept albums.", 
        duration: 8000 
      },
      { 
        targetId: "Yes", 
        narrative: "Symphonic precision. Yes brought classical complexity, virtuosic musicianship, and positive lyrical themes to the forefront.", 
        duration: 7000 
      },
      { 
        targetId: "Rush", 
        narrative: "The Power Trio. Rush took Prog into the hard rock arena, blending sci-fi themes with technical wizardry.", 
        duration: 7000 
      },
      { 
        targetId: "Dream Theater", 
        narrative: "The Modern Virtuosos. Combining the heaviness of Metallica with the complexity of Rush, they defined the Progressive Metal genre.", 
        duration: 8000 
      },
      { 
        targetId: "Tool", 
        narrative: "Alternative Evolution. Tool took Prog into a darker, mathematical direction, emphasizing rhythm and texture over melody.", 
        duration: 8000 
      }
    ]
  }
];


// --- 5. NODE INITIALIZATION ---
const RAW_NODES: BandNode[] = [
    // --- 0. ANCESTORS (The Roots) ---
    { id: "Robert Johnson", group: 0, tier: 'root', label: "Robert Johnson", color: "#8B4513", title: "USA | 1930s | Delta Blues | The Crossroads Myth", size: 25 },
    { id: "Muddy Waters", group: 0, tier: 'root', label: "Muddy Waters", color: "#8B4513", title: "USA | 1950s | Chicago Blues | Electric Pioneer", size: 25 },
    { id: "Chuck Berry", group: 0, tier: 'root', label: "Chuck Berry", color: "#8B4513", title: "USA | 1950s | Rock n Roll | The Architect", size: 28 },
    { id: "Little Richard", group: 0, tier: 'root', label: "Little Richard", color: "#8B4513", title: "USA | 1950s | Rock n Roll | The Architect", size: 25 },
    { id: "Miles Davis", group: 0, tier: 'root', label: "Miles Davis", color: "#B8860B", title: "USA | 1960s | Jazz Fusion | Cool Jazz", size: 28 },
    
    // --- 1. THE ROCK ROOTS (1960s) ---
    { id: "The Animals", group: 1, tier: 'core', label: "The Animals", color: "#ff4444", title: "UK | 1960s | Blues Rock Roots | Origin of the 'Grit'", size: 25 },
    { id: "The Beatles", group: 1, tier: 'core', label: "The Beatles", color: "#ff4444", title: "UK | 1960s | Pop/Psych | The Melody", size: 35 },
    { id: "Rolling Stones", group: 1, tier: 'core', label: "Rolling Stones", color: "#ff4444", title: "UK | 1960s | Rock n Roll | The Swagger", size: 30 },
    { id: "Jimi Hendrix", group: 1, tier: 'core', label: "Jimi Hendrix", color: "#4444ff", title: "USA | 1960s | Psych Rock | The Electric Guitar God", size: 30 },
    { id: "The Doors", group: 1, tier: 'core', label: "The Doors", color: "#4444ff", title: "USA | 1960s | Psych/Art | The Dark Poet", size: 25 },
    { id: "Cream", group: 1, tier: 'core', label: "Cream", color: "#ff4444", title: "UK | 1960s | Heavy Blues | The Prototype", size: 20 },

    // --- 2. SOUTHERN & HEARTLAND (1970s) ---
    { id: "Lynyrd Skynyrd", group: 2, tier: 'core', label: "Lynyrd Skynyrd", color: "#ffaa00", title: "USA | 1970s | Southern Rock | The Free Birds", size: 30 },
    { id: "Allman Bros", group: 2, tier: 'core', label: "Allman Brothers", color: "#ffaa00", title: "USA | 1970s | Southern Jam | Dual Guitars", size: 20 },
    { id: "ZZ Top", group: 2, tier: 'core', label: "ZZ Top", color: "#ffaa00", title: "USA | 1970s | Blues Rock | Texas Boogie", size: 25 },
    { id: "Eagles", group: 2, tier: 'core', label: "The Eagles", color: "#4444ff", title: "USA | 1970s | Country Rock | Radio Giants", size: 25 },
    { id: "Led Zeppelin", group: 2, tier: 'core', label: "Led Zeppelin", color: "#ff4444", title: "UK | 1970s | Hard Rock | Hammer of the Gods", size: 40 },

    // --- 3. PROG, POMP & THEATRICAL (The Middle Stream) ---
    { id: "Uriah Heep", group: 3, tier: 'core', label: "Uriah Heep", color: "#aa00aa", title: "UK | 1970s | Prog/Heavy | The Fantasy High Note", size: 20 },
    { id: "Deep Purple", group: 3, tier: 'core', label: "Deep Purple", color: "#aa00aa", title: "UK | 1970s | Hard Rock | The Loudest Band", size: 30 },
    { id: "Kansas", group: 3, tier: 'core', label: "Kansas", color: "#aa00aa", title: "USA | 1970s | Arena Prog | American Complexity", size: 20 },
    { id: "Rush", group: 3, tier: 'core', label: "Rush", color: "#ffffff", title: "CAN | 1970s | Prog Rock | The Holy Trinity", size: 28 },
    { id: "Queen", group: 3, tier: 'core', label: "Queen", color: "#aa00aa", title: "UK | 1970s | Art/Glam | The Champions", size: 35 },
    { id: "Meat Loaf", group: 3, tier: 'core', label: "Meat Loaf", color: "#aa00aa", title: "USA | 1970s | Theatrical Rock | Wagnerian Opera", size: 22 },
    { id: "Blue Oyster Cult", group: 3, tier: 'core', label: "Blue Öyster Cult", color: "#aa00aa", title: "USA | 1970s | Occult Rock | Thinking Man's Metal", size: 22 },
    { id: "Pink Floyd", group: 3, tier: 'core', label: "Pink Floyd", color: "#aa00aa", title: "UK | 1970s | Psych/Prog | Atmospheric Kings", size: 35 },
    { id: "Yes", group: 3, tier: 'core', label: "Yes", color: "#aa00aa", title: "UK | 1970s | Symphonic Prog | Mathematical", size: 20 },

    // --- 4. HEAVY METAL EVOLUTION ---
    { id: "Black Sabbath", group: 4, tier: 'core', label: "Black Sabbath", color: "#666666", title: "UK | 1970s | Heavy Metal | The Creators", size: 40 },
    { id: "Judas Priest", group: 4, tier: 'core', label: "Judas Priest", color: "#666666", title: "UK | 1970s | Heavy Metal | The Leather & Studs", size: 30 },
    { id: "Motorhead", group: 4, tier: 'core', label: "Motörhead", color: "#666666", title: "UK | 1970s | Speed Metal | Born to Lose", size: 25 },
    { id: "Iron Maiden", group: 4, tier: 'core', label: "Iron Maiden", color: "#666666", title: "UK | 1980s | NWOBHM | Epic Metal", size: 35 },

    // --- 5. THRASH & MODERN ---
    { id: "Metallica", group: 5, tier: 'core', label: "Metallica", color: "#4444ff", title: "USA | 1980s | Thrash Metal | The Biggest Metal Band", size: 40 },
    { id: "Slayer", group: 5, tier: 'core', label: "Slayer", color: "#4444ff", title: "USA | 1980s | Thrash | Extreme Aggression", size: 25 },
    { id: "Pantera", group: 5, tier: 'core', label: "Pantera", color: "#4444ff", title: "USA | 1990s | Groove Metal | Power", size: 28 },
    { id: "Nirvana", group: 5, tier: 'core', label: "Nirvana", color: "#ffffff", title: "USA | 1990s | Grunge | The Alternative Explosion", size: 35 },
    { id: "Soundgarden", group: 5, tier: 'core', label: "Soundgarden", color: "#ffffff", title: "USA | 1990s | Grunge | Heavy Alternative", size: 30 },

    // --- 6. MODERN & EXPERIMENTAL ---
    { id: "Ghost", group: 6, tier: 'core', label: "Ghost", color: "#ffffff", title: "SWE | 2010s | Occult Rock | The Revival", size: 25 },
    { id: "Tool", group: 6, tier: 'core', label: "Tool", color: "#4444ff", title: "USA | 1990s | Alt-Metal/Prog | The Fibonacci", size: 28 },
    { id: "Dream Theater", group: 6, tier: 'core', label: "Dream Theater", color: "#4444ff", title: "USA | 1990s | Prog Metal | Virtuosos", size: 22 },
    
    // --- 7. BRANCHES (Cross-Genre) ---
    { id: "Run-D.M.C.", group: 7, tier: 'branch', label: "Run-D.M.C.", color: "#333333", title: "USA | 1980s | Hip Hop | The Rock Bridge", size: 25 },
    { id: "Beastie Boys", group: 7, tier: 'branch', label: "Beastie Boys", color: "#333333", title: "USA | 1980s | Hip Hop | Punk Rap", size: 25 },
    { id: "Public Enemy", group: 7, tier: 'branch', label: "Public Enemy", color: "#333333", title: "USA | 1980s | Hip Hop | Noise Revolution", size: 22 },
    { id: "Nine Inch Nails", group: 7, tier: 'branch', label: "Nine Inch Nails", color: "#111111", title: "USA | 1990s | Industrial | Electronic Rock", size: 28 },
    { id: "Kraftwerk", group: 7, tier: 'branch', label: "Kraftwerk", color: "#0000AA", title: "GER | 1970s | Electronic | The Robots", size: 25 },
    { id: "Daft Punk", group: 7, tier: 'branch', label: "Daft Punk", color: "#0000AA", title: "FRA | 1990s | House | Robot Rock", size: 28 },
    { id: "Massive Attack", group: 7, tier: 'branch', label: "Massive Attack", color: "#440044", title: "UK | 1990s | Trip Hop | Dark Groove", size: 20 },
    
    // --- ADDED NODES TO FIX LINKS (Already in RawNodes in previous iterations, ensuring Tier) ---
    { id: "Aerosmith", group: 2, tier: 'core', label: "Aerosmith", color: "#ff4444", title: "USA | 1970s | Hard Rock | Bad Boys from Boston", size: 30 },
    { id: "Stevie Ray Vaughan", group: 2, tier: 'core', label: "Stevie Ray Vaughan", color: "#4444ff", title: "USA | 1980s | Texas Blues | Guitar Hurricane", size: 25 },
    { id: "Radiohead", group: 6, tier: 'core', label: "Radiohead", color: "#ffffff", title: "UK | 1990s | Art Rock | The Experimentalists", size: 30 },
    { id: "Primus", group: 6, tier: 'core', label: "Primus", color: "#4444ff", title: "USA | 1990s | Funk Metal | Bass Driven Weirdness", size: 22 },
    { id: "Demons and Wizards", group: 6, tier: 'core', label: "Demons & Wizards", color: "#666666", title: "USA/EU | 2000s | Power Metal | The Fantasy Union", size: 20 },
];

// Apply Initial DNA
const NODES_WITH_DNA = RAW_NODES.map(node => ({
    ...node,
    dnaProfile: generateInitialDna(node.id, node.group)
}));

// Apply Inheritance (Post-Processing)
export const NODES = inheritDna(NODES_WITH_DNA, LINKS);