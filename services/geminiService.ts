import { GoogleGenAI } from "@google/genai";
import { KOLAnalysis, Sentiment, HistoryEvent } from "../types";

// Helper to extract JSON from a markdown code block if present
const extractJson = (text: string): any => {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch (e) {
    // Try to find markdown block
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e2) {
        console.error("Failed to parse JSON from markdown block", e2);
      }
    }
    // Try finding the first { and last }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(text.substring(start, end + 1));
      } catch (e3) {
        console.error("Failed to parse JSON by bracket slicing", e3);
      }
    }
    return null;
  }
};

export const analyzeKOLHandle = async (handle: string): Promise<KOLAnalysis> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    I need a detailed reputation analysis of the Cryptocurrency KOL (Key Opinion Leader) / Twitter User: "${handle}".
    
    Using Google Search, find information about:
    1. Positive contributions, accurate analysis, successful calls (Good Reports).
    2. Failed predictions, rug pulls promoted, scams, or controversies (Negative Findings).
    3. Their general reputation in the community.
    
    RETURN ONLY A VALID JSON OBJECT (inside a json markdown block) with this specific structure:
    {
      "displayName": "Their Name or Handle",
      "bioSummary": "A short 1-2 sentence summary of who they are and their niche (e.g., shitcoins, BTC maxis, NFTs).",
      "trustScore": 75, // Integer 0-100 based on the ratio of good reports to negative findings/scams.
      "totalWins": 5, // Estimated count of Good Reports (wins, positive contributions) found
      "totalLosses": 2, // Estimated count of Negative Findings (losses, scams, controversies) found
      "followersCount": "100K", // Approximate if found
      "history": [
        {
          "id": "unique_id_1",
          "date": "YYYY-MM-DD or 'Recent'",
          "description": "Short title of event (e.g. 'Predicted SOL drop')",
          "type": "PREDICTION_WIN", // Use "PREDICTION_WIN" for Good Reports, "PREDICTION_LOSS" or "CONTROVERSY" for Negative Findings
          "token": "SOL", // Optional token symbol involved
          "sentiment": "POSITIVE", // "POSITIVE", "NEGATIVE", "NEUTRAL"
          "details": "A longer explanation of what happened."
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        // We use Google Search to actually 'scrape'/find the history
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Extract sources from grounding chunks
    const sources = groundingChunks
      .map((chunk: any) => {
        if (chunk.web) {
          return { title: chunk.web.title, url: chunk.web.uri };
        }
        return null;
      })
      .filter((source: any) => source !== null);

    const data = extractJson(text);

    if (!data) {
      throw new Error("Failed to parse analysis results.");
    }

    // Merge sources into data structure
    return {
      ...data,
      handle,
      sources: sources,
      lastAnalyzed: new Date().toISOString()
    };

  } catch (error) {
    console.error("Error analyzing KOL:", error);
    throw error;
  }
};