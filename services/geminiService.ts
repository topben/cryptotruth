import { GoogleGenAI } from "@google/genai";
import { KOLAnalysis, Sentiment, HistoryEvent } from "../types";

// Custom error class to carry HTTP status codes
export class APIError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

// Helper to extract HTTP status code from error
const extractStatusCode = (error: any): number | null => {
  // Check for status or statusCode property
  if (error?.status) return error.status;
  if (error?.statusCode) return error.statusCode;
  if (error?.response?.status) return error.response.status;

  // Check error message for common patterns
  const message = error?.message || String(error);
  if (message.includes('429') || message.toLowerCase().includes('too many requests') || message.toLowerCase().includes('rate limit')) {
    return 429;
  }
  if (message.includes('404') || message.toLowerCase().includes('not found')) {
    return 404;
  }
  if (message.includes('400') || message.toLowerCase().includes('bad request')) {
    return 400;
  }

  return null;
};

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

  const buildPrompt = (isRetry: boolean = false) => {
    if (isRetry) {
      // Simplified prompt for retry attempts
      return `
        Analyze the Cryptocurrency KOL: "${handle}".

        Search for information about their reputation, predictions, and controversies.
        Also search for keywords: "ZachXBT ${handle}", "Coffeezilla ${handle}", "Reddit r/CryptoCurrency ${handle}".
        Identify if they engage in paid promotions or shilling behavior.
        Extract any public wallet addresses if mentioned.

        RETURN ONLY VALID JSON (no extra text, no markdown block):
        {
          "displayName": "Name",
          "bioSummary": "Summary",
          "trustScore": 75,
          "totalWins": 5,
          "totalLosses": 2,
          "followersCount": "100K",
          "walletAddresses": ["0x..."],
          "verdict": "One-sentence summary verdict",
          "history": [{"id": "1", "date": "2024-01-01", "description": "Event", "type": "PREDICTION_WIN", "token": "BTC", "sentiment": "POSITIVE", "details": "Details", "sourceUrl": "https://..."}]
        }
      `;
    }

    // Full detailed prompt for first attempt
    return `
      I need a detailed reputation analysis of the Cryptocurrency KOL (Key Opinion Leader) / Twitter User: "${handle}".

      Using Google Search, find information about:
      1. Positive contributions, accurate analysis, successful calls (Good Reports).
      2. Failed predictions, rug pulls promoted, scams, or controversies (Negative Findings).
      3. Their general reputation in the community.

      IMPORTANT SEARCH INSTRUCTIONS:
      - Explicitly search for: "ZachXBT ${handle}", "Coffeezilla ${handle}", "Reddit r/CryptoCurrency ${handle}"
      - Look for mentions on investigative crypto accounts and community discussions
      - Identify if they engage in "Paid Promo", "Shilling", or repetitive promotion of the same projects
      - Try to extract any public wallet addresses (ETH, SOL, BTC, etc.) associated with this person

      RETURN ONLY A VALID JSON OBJECT (inside a json markdown block) with this specific structure:
      {
        "displayName": "Their Name or Handle",
        "bioSummary": "A short 1-2 sentence summary of who they are and their niche (e.g., shitcoins, BTC maxis, NFTs).",
        "trustScore": 75, // Integer 0-100 based on the ratio of good reports to negative findings/scams. Lower if paid promo/shilling detected.
        "totalWins": 5, // Estimated count of Good Reports (wins, positive contributions) found
        "totalLosses": 2, // Estimated count of Negative Findings (losses, scams, controversies) found
        "followersCount": "100K", // Approximate if found
        "walletAddresses": ["0x1234...", "So1abc..."], // Array of public wallet addresses found (leave empty array if none)
        "verdict": "One-sentence summary verdict (e.g., 'High Risk Scammer' or 'Trusted Analyst' or 'Potential Paid Promoter')",
        "history": [
          {
            "id": "unique_id_1",
            "date": "YYYY-MM-DD or 'Recent'",
            "description": "Short title of event (e.g. 'Predicted SOL drop' or 'Promoted rug pull')",
            "type": "PREDICTION_WIN", // Use "PREDICTION_WIN" for Good Reports, "PREDICTION_LOSS" or "CONTROVERSY" for Negative Findings
            "token": "SOL", // Optional token symbol involved
            "sentiment": "POSITIVE", // "POSITIVE", "NEGATIVE", "NEUTRAL"
            "details": "A longer explanation of what happened. Include if it was paid promo or shilling if detected.",
            "sourceUrl": "https://example.com/evidence" // REQUIRED: Direct URL to the evidence source for this specific event (tweet, article, Reddit post, etc.)
          }
        ]
      }

      CRITICAL: Ensure the JSON is properly formatted with no trailing commas, valid escaping, and all required fields present.
    `;
  };

  const attemptAnalysis = async (attemptNumber: number): Promise<KOLAnalysis> => {
    const isRetry = attemptNumber > 1;
    const prompt = buildPrompt(isRetry);

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
      throw new Error("Failed to parse JSON from response");
    }

    // Merge sources into data structure
    return {
      ...data,
      handle,
      sources: sources,
      lastAnalyzed: new Date().toISOString()
    };
  };

  // Retry logic: up to 3 attempts
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxAttempts} to analyze KOL: ${handle}`);
      const result = await attemptAnalysis(attempt);
      console.log(`Successfully analyzed KOL on attempt ${attempt}`);
      return result;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error as Error;

      // Check for specific HTTP error codes that shouldn't be retried
      const statusCode = extractStatusCode(error);
      if (statusCode === 429) {
        // Rate limit - throw immediately without retrying
        throw new APIError('Too many requests. Rate limit exceeded.', 429);
      }
      if (statusCode === 404) {
        // Not found - throw immediately without retrying
        throw new APIError('Resource not found.', 404);
      }
      if (statusCode === 400) {
        // Bad request - throw immediately without retrying
        throw new APIError('Bad request.', 400);
      }

      // If this wasn't the last attempt, wait before retrying
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 1s, 2s
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed - check if last error has a status code
  const lastStatusCode = extractStatusCode(lastError);
  if (lastStatusCode) {
    throw new APIError(`Failed to analyze KOL after ${maxAttempts} attempts.`, lastStatusCode);
  }

  console.error(`All ${maxAttempts} attempts failed for KOL: ${handle}`);
  throw new Error(`Failed to analyze KOL after ${maxAttempts} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
};