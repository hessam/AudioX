import { GoogleGenAI } from "@google/genai";
import { DNA_LAYERS, DnaLayer } from "../dnaData";

let genAI: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      genAI = new GoogleGenAI({ apiKey });
    } else {
      console.warn("API_KEY not found in environment variables.");
    }
  }
  return genAI;
};

export const getBandInsights = async (bandName: string): Promise<string> => {
  const ai = getGenAI();
  if (!ai) return "AI service is unavailable. Please check your API key.";

  try {
    const prompt = `
      Provide a concise but fascinating summary about the band "${bandName}".
      Include:
      1. Their origin and key genre.
      2. One "Did you know?" trivia fact that isn't widely known.
      3. Three bands that are similar in style or influence.
      
      Keep it under 150 words. Format with simple markdown.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    return response.text || "No details found.";
  } catch (error) {
    console.error("Error fetching band insights:", error);
    return "Failed to retrieve insights. Please try again later.";
  }
};

export const getRelationshipInsights = async (sourceBand: string, targetBand: string): Promise<string> => {
  const ai = getGenAI();
  if (!ai) return "AI service is unavailable.";

  try {
    const prompt = `
      Analyze the directional "Musical DNA" connection between the Influencer **${sourceBand}** and the Influenced **${targetBand}**.
      
      Explain:
      1. How specifically did ${sourceBand} influence ${targetBand}? (e.g. riffs, attitude, song structure, specific songs).
      2. What specific "gene" was passed down?
      3. Are there any famous quotes or anecdotes where ${targetBand} acknowledges this influence?
      
      Keep it concise (under 150 words) and engaging.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    return response.text || "Connection unclear.";
  } catch (error) {
    return "Could not analyze this relationship.";
  }
};

export const chatWithMusicExpert = async (message: string, context?: string): Promise<string> => {
  const ai = getGenAI();
  if (!ai) return "AI service is unavailable.";

  try {
    let systemInstruction = "You are a world-class music historian and rock/metal expert. You are witty, knowledgeable, and passionate about music history.";
    if (context) {
        systemInstruction += ` Context: ${context}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction,
      }
    });

    return response.text || "I'm speechless!";
  } catch (error) {
    console.error("Chat error:", error);
    return "I seem to have lost my train of thought. Try again?";
  }
};

// New function for adding bands
export const analyzeBandForGraph = async (newBandName: string, existingNodes: string[]) => {
    const ai = getGenAI();
    if (!ai) throw new Error("AI service unavailable");

    const prompt = `
    I am building a force-directed graph of Rock & Metal history.
    The user wants to add the band: "${newBandName}".
    
    Existing nodes in the graph: ${JSON.stringify(existingNodes)}.

    Please provide a JSON object with the following details for "${newBandName}":
    1. "group": integer (1=60s Roots, 2=70s Southern/Heartland, 3=70s Prog/Pomp, 4=70s/80s Metal, 5=80s Thrash/Modern, 6=90s+ Modern/Alt/Nu-Metal, 7=Branches/Cross-Genre, 0=Ancestors).
    2. "color": hex string (Red #ff4444 for Rock/Roots, Blue #4444ff for USA/Modern, Purple #aa00aa for Prog, Grey #666666 for Heavy Metal, Orange #ffaa00 for Southern, White #ffffff for Unique/Other).
    3. "title": string format "Origin | Decade | Genre | Short 3-word vibe".
    4. "size": integer (popularity/impact score between 20 and 40).
    5. "tier": 'core' (default).
    6. "connections": Array of up to 3 objects representing connections to THE EXISTING NODES provided above. 
       Format: { "target": "Exact Name from Existing List", "direction": "from" or "to", "width": 1-5 }.
       "direction": "to" means NewBand influenced ExistingNode. 
       "direction": "from" means ExistingNode influenced NewBand.
       IMPORTANT: Only connect to bands in the provided list. If none fit perfectly, pick the closest genre match.

    Return ONLY raw JSON. No markdown formatting.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text);
    } catch (e) {
        console.error("Error analyzing band", e);
        throw e;
    }
}

// Explore Lineage (Roots & Branches)
export const exploreLineage = async (targetBand: string, type: 'root' | 'branch', existingNodes: string[]) => {
    const ai = getGenAI();
    if (!ai) throw new Error("AI service unavailable");

    const isRoot = type === 'root';
    const directionPrompt = isRoot 
        ? `Find 3 distinct bands that are major INFLUENCES (Roots/Ancestors) on "${targetBand}".`
        : `Find 3 distinct bands that were heavily INFLUENCED BY (Branches/Descendants) "${targetBand}".`;

    const prompt = `
    I am building a music genealogy graph.
    ${directionPrompt}

    Existing nodes in graph: ${JSON.stringify(existingNodes)}.

    For EACH found band, return a JSON object in a list.
    
    If the band ALREADY EXISTS in the "Existing nodes" list provided above:
      - strict name matching.
      - just return the name and the connection details.
    
    If the band is NEW (not in existing list):
      - Provide full metadata (group, color, title, size).
      - "tier" should be "root" if type is root, or "branch" if type is branch.
      - "group": 0=Ancestors, 1=60s, 2=70s, 3=Prog, 4=Metal, 5=Thrash, 6=Modern, 7=Cross-Genre.

    Return format:
    {
      "results": [
        {
          "name": "Band Name",
          "isNew": boolean,
          "details": { ...only if isNew... group, color, title, size, tier },
          "connection": {
             "influenceType": "direct" | "stylistic" | "cover" | "member",
             "influenceContext": "Short description of the link",
             "width": 1-5
          }
        }
      ]
    }

    Return ONLY raw JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text);
    } catch (e) {
        console.error("Error exploring lineage", e);
        throw e;
    }
}

// Generate Musical DNA based on provided Layers
export const sequenceBandDna = async (bandName: string) => {
    // 1. Check Cache
    const cacheKey = `dna_v4_${bandName}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
        console.log(`[Cache Hit] Using cached DNA for ${bandName}`);
        return JSON.parse(cachedData);
    }

    const ai = getGenAI();
    if (!ai) throw new Error("AI service unavailable");

    // We condense the prompt to avoid token overflow but still give context
    const layersPrompt = DNA_LAYERS.map(l => 
      `${l.id} (${l.name}): ${l.markers.map(m => `${m.id}="${m.name}"`).join(', ')}`
    ).join('\n');

    const prompt = `
    Analyze the musical style of the band: "${bandName}".
    
    Using the specific DNA markers defined below, identify the top 2-4 most characteristic markers for EACH layer that define this band's sound.
    
    For each marker, assign a "Dominance Value" from 1 to 5:
    1 = Subtle / Occasional
    3 = Regular / Noticeable
    5 = Defining Characteristic / Dominant
    
    DNA Definitions:
    ${layersPrompt}

    Return a JSON object where keys are Layer IDs (e.g. "L1", "L2") and values are Arrays of Objects.
    Example format:
    {
      "L1": [{ "id": "R1", "value": 5 }, { "id": "R18", "value": 3 }]
    }
    
    Only return markers that apply (value >= 1).
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        
        const result = JSON.parse(text);
        
        // 2. Save to Cache
        try {
            sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch (e) {
            console.warn("Session storage full, could not cache DNA");
        }

        return result;
    } catch (e) {
        console.error("Error sequencing DNA", e);
        throw e;
    }
}