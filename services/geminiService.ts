import { GoogleGenAI, Type } from "@google/genai";
import { KOLAnalysis, Language } from "../types";

export class APIError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

const extractStatusCode = (error: any): number | null => {
  if (error?.status) return error.status;
  if (error?.statusCode) return error.statusCode;
  if (error?.response?.status) return error.response.status;
  const message = error?.message || String(error);
  if (message.includes('429') || /too many requests|rate limit/i.test(message)) return 429;
  if (message.includes('404') || /not found/i.test(message)) return 404;
  if (message.includes('400') || /bad request/i.test(message)) return 400;
  return null;
};

// Define output Schema to save tokens on prompt examples
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    displayName: { type: Type.STRING, description: "Name of the KOL" },
    bioSummary: { type: Type.STRING, description: "1-2 sentence summary of their niche" },
    trustScore: { type: Type.NUMBER, description: "0-100 score based on reputation (lower if scammer/shiller)" },
    totalWins: { type: Type.NUMBER, description: "Count of successful calls/good reports" },
    totalLosses: { type: Type.NUMBER, description: "Count of failed calls/scams/controversies" },
    followersCount: { type: Type.STRING, description: "Approximate follower count (e.g. '100K')" },
    walletAddresses: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Public wallet addresses found (ETH, SOL, etc.)"
    },
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

export const analyzeKOLHandle = async (handle: string, language: Language = 'en'): Promise<KOLAnalysis> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const buildPrompt = () => {
    const langInstruction = language === 'zh-TW'
      ? "Output fields 'bioSummary', 'verdict', 'description', 'details' in Traditional Chinese (繁體中文)."
      : "Output all text fields in English.";

    return `
      Analyze Crypto KOL: "${handle}".
      ${langInstruction}

      Tasks:
      1. Search "ZachXBT ${handle}", "Coffeezilla ${handle}", "Reddit r/CryptoCurrency ${handle}".
      2. Find positive calls (Good Reports) and scams/rug pulls/failed predictions (Negative Findings).
      3. Detect paid promos or shilling.
      4. Extract public wallet addresses.

      Score logic:
      - High score (80+): Accurate calls, community trust.
      - Low score (<40): Paid promos, scams, rug pulls.
    `;
  };

  const attemptAnalysis = async (attemptNumber: number): Promise<KOLAnalysis> => {
    const prompt = buildPrompt();

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

    let data;
    try {
      data = JSON.parse(text || "{}");
    } catch (e) {
      console.error("JSON parse error:", text);
      throw new Error("Invalid JSON response from AI");
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: any) => chunk.web ? { title: chunk.web.title, url: chunk.web.uri } : null)
      .filter((s: any) => s !== null);

    return {
      ...data,
      handle,
      sources: sources,
      lastAnalyzed: new Date().toISOString()
    };
  };

  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await attemptAnalysis(attempt);
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error as Error;

      const statusCode = extractStatusCode(error);
      if (statusCode === 429 || statusCode === 404 || statusCode === 400) {
        throw new APIError(lastError.message, statusCode);
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  throw new APIError(`Analysis failed: ${lastError?.message}`, 500);
};
