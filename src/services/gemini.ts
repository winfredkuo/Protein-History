import { GoogleGenAI, Type } from "@google/genai";

const CACHE_KEY = "proteinTracker_ai_cache";

function getCache(): Record<string, { name: string; protein: number; notes?: string }> {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, { name: string; protein: number; notes?: string }>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error("Failed to save cache", e);
  }
}

export async function estimateProtein(
  foodQuery: string,
): Promise<{ name: string; protein: number; notes?: string }> {
  const normalizedQuery = foodQuery.trim().toLowerCase();
  const cache = getCache();

  if (cache[normalizedQuery]) {
    console.log("Using cached result for:", normalizedQuery);
    return cache[normalizedQuery];
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Estimate the protein content in grams for the following food item: "${foodQuery}". Return ONLY a JSON object. Please output the 'name' and 'notes' fields in Traditional Chinese (zh-TW).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The name of the food item, formatted nicely.",
            },
            protein: {
              type: Type.NUMBER,
              description: "The estimated protein content in grams.",
            },
            notes: {
              type: Type.STRING,
              description:
                "Optional brief note about the estimation or portion size.",
            },
          },
          required: ["name", "protein"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    
    // Save to cache
    cache[normalizedQuery] = data;
    saveCache(cache);

    return data;
  } catch (error: any) {
    console.error("Error estimating protein:", error);
    throw new Error(`Failed to estimate protein content: ${error?.message || "Unknown error"}`);
  }
}

export async function analyzeInBodyImage(
  base64Data: string,
  mimeType: string,
): Promise<{
  weight: number;
  muscleMass: number;
  bodyFat: number;
  recommendedMultiplier: number;
  recommendedProtein: number;
}> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };
    
    const textPart = {
      text: `Analyze this InBody test result image. Extract the following metrics:
1. Weight (kg)
2. Skeletal Muscle Mass (kg)
3. Body Fat Percentage (%)

Based on these metrics, recommend a daily protein intake multiplier (g/kg) for optimal muscle gain and fat loss, and calculate the total recommended daily protein intake (g). 
Return ONLY a JSON object.`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weight: {
              type: Type.NUMBER,
              description: "Weight in kg extracted from the image.",
            },
            muscleMass: {
              type: Type.NUMBER,
              description: "Skeletal Muscle Mass in kg extracted from the image.",
            },
            bodyFat: {
              type: Type.NUMBER,
              description: "Body Fat Percentage (%) extracted from the image.",
            },
            recommendedMultiplier: {
              type: Type.NUMBER,
              description: "Recommended daily protein intake multiplier (g/kg). Usually between 1.6 and 2.2 depending on body composition.",
            },
            recommendedProtein: {
              type: Type.NUMBER,
              description: "Total recommended daily protein intake in grams (weight * recommendedMultiplier).",
            },
          },
          required: ["weight", "muscleMass", "bodyFat", "recommendedMultiplier", "recommendedProtein"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    return data;
  } catch (error: any) {
    console.error("Error analyzing InBody image:", error);
    throw new Error(`Failed to analyze InBody image: ${error?.message || "Unknown error"}`);
  }
}
