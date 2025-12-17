import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  try {
    const { handle, language } = req.body;

    const ai = new GoogleGenAI({ apiKey });

    const langInstruction = language === 'zh-TW'
      ? "Output fields 'bioSummary', 'verdict', 'description', 'details' in Traditional Chinese (繁體中文)."
      : "Output all text fields in English.";

    const prompt = `
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

    return res.status(200).json({
      ...data,
      handle,
      sources: sources,
      lastAnalyzed: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("API Error:", error);
    const status = error.status || (error.message.includes('429') ? 429 : 500);
    return res.status(status).json({ error: error.message });
  }
}
