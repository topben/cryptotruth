import { GoogleGenAI, Type } from "@google/genai";
import { list, put } from "@vercel/blob";

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Build cache file path for Vercel Blob
 */
const buildCachePath = (handle: string, language: string): string => {
  return `cache/${handle.toLowerCase()}-${language}.json`;
};

/**
 * Check if cached data exists and is still valid
 */
const getCachedAnalysis = async (handle: string, language: string) => {
  try {
    const cachePath = buildCachePath(handle, language);
    const { blobs } = await list({ prefix: cachePath });

    if (blobs.length === 0) {
      return null;
    }

    const blob = blobs[0];
    const uploadedAt = new Date(blob.uploadedAt).getTime();
    const age = Date.now() - uploadedAt;

    // Check if cache is expired (> 24 hours)
    if (age > CACHE_DURATION_MS) {
      console.log(`Cache expired for ${handle} (age: ${Math.round(age / 1000 / 60)} minutes)`);
      return null;
    }

    // Fetch the cached data
    const response = await fetch(blob.url);
    const data = await response.json();

    console.log(`Cache hit for ${handle} (age: ${Math.round(age / 1000 / 60)} minutes)`);
    return {
      data,
      cachedAt: uploadedAt
    };
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
};

/**
 * Save analysis result to Vercel Blob cache
 */
const setCachedAnalysis = async (handle: string, language: string, data: any) => {
  try {
    const cachePath = buildCachePath(handle, language);
    await put(cachePath, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json'
    });
    console.log(`Cached analysis for ${handle}`);
  } catch (error) {
    console.error('Error writing cache:', error);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  try {
    const { handle, language, forceRefresh } = req.body;

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cached = await getCachedAnalysis(handle, language || 'en');
      if (cached) {
        return res.status(200).json({
          ...cached.data,
          handle,
          source: 'cache',
          cachedAt: cached.cachedAt
        });
      }
    }

    // No valid cache or force refresh - call Gemini API
    const ai = new GoogleGenAI({ apiKey });

    const langInstruction = language === 'zh-TW'
      ? "Output fields 'bioSummary', 'verdict', 'description', 'details' in Traditional Chinese (繁體中文)."
      : "Output all text fields in English.";

    // Optimized prompt - removed wallet extraction, simplified search
    const prompt = `
      Analyze Crypto KOL: "${handle}".
      ${langInstruction}

      Tasks:
      1. Search for recent news, major allegations, and track record. Do not deep dive into raw blockchain transaction pages.
      2. Find positive calls (Good Reports) and scams/rug pulls/failed predictions (Negative Findings).
      3. Detect paid promos or shilling.

      Score logic:
      - High score (80+): Accurate calls, community trust.
      - Low score (<40): Paid promos, scams, rug pulls.
    `;

    const analysisSchema = {
      type: Type.OBJECT,
      properties: {
        displayName: { type: Type.STRING, description: "Name of the KOL" },
        bioSummary: { type: Type.STRING, description: "1-2 sentence summary of their niche" },
        trustScore: { type: Type.NUMBER, description: "0-100 score based on reputation (lower if scammer/shiller)" },
        totalWins: { type: Type.NUMBER, description: "Count of successful calls/good reports" },
        totalLosses: { type: Type.NUMBER, description: "Count of failed calls/scams/controversies" },
        followersCount: { type: Type.STRING, description: "Approximate follower count (e.g. '100K')" },
        verdict: { type: Type.STRING, description: "One-sentence verdict (e.g. 'High Risk Scammer')" },
        history: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              date: { type: Type.STRING, description: "YYYY-MM-DD or 'Recent'" },
              description: { type: Type.STRING, description: "Short title of event" },
              type: {
                type: Type.STRING,
                enum: ["PREDICTION_WIN", "PREDICTION_LOSS", "CONTROVERSY", "NEUTRAL_NEWS"]
              },
              token: { type: Type.STRING, description: "Token symbol if applicable", nullable: true },
              sentiment: {
                type: Type.STRING,
                enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"]
              },
              details: { type: Type.STRING, description: "Explanation of the event" },
              sourceUrl: { type: Type.STRING, description: "URL to evidence source", nullable: true }
            },
            required: ["id", "date", "description", "type", "sentiment", "details"]
          }
        }
      },
      required: ["displayName", "bioSummary", "trustScore", "totalWins", "totalLosses", "verdict", "history"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const text = response.text;
    const data = JSON.parse(text || "{}");

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: any) => chunk.web ? { title: chunk.web.title, url: chunk.web.uri } : null)
      .filter((s: any) => s !== null);

    const result = {
      ...data,
      handle,
      sources: sources,
      lastAnalyzed: new Date().toISOString()
    };

    // Save to cache (async, don't wait)
    setCachedAnalysis(handle, language || 'en', result);

    return res.status(200).json({
      ...result,
      source: 'api'
    });

  } catch (error: any) {
    console.error("API Error:", error);
    const status = error.status || (error.message.includes('429') ? 429 : 500);
    return res.status(status).json({ error: error.message });
  }
}
