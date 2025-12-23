import { GoogleGenAI, Type } from "@google/genai";
import { list, put } from "@vercel/blob";

// Configuration
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 API calls per IP per hour
const MAX_HANDLE_LENGTH = 50;
const ALLOWED_LANGUAGES = ['en', 'zh-TW'];

/**
 * Sanitize handle input - remove @ prefix and validate format
 */
const sanitizeHandle = (handle: string): string | null => {
  if (!handle || typeof handle !== 'string') return null;

  // Remove @ prefix if present
  let sanitized = handle.trim().replace(/^@/, '');

  // Check length
  if (sanitized.length === 0 || sanitized.length > MAX_HANDLE_LENGTH) return null;

  // Allow only alphanumeric, underscores (Twitter-like handles)
  if (!/^[a-zA-Z0-9_]+$/.test(sanitized)) return null;

  return sanitized.toLowerCase();
};

/**
 * Get client IP from request headers
 */
const getClientIP = (req: any): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
};

/**
 * Hash IP for privacy (simple hash, not cryptographic)
 */
const hashIP = (ip: string): string => {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Check and update rate limit for an IP
 */
const checkRateLimit = async (ip: string): Promise<{ allowed: boolean; remaining: number }> => {
  const ipHash = hashIP(ip);
  const rateLimitPath = `ratelimit/${ipHash}.json`;

  try {
    const { blobs } = await list({ prefix: rateLimitPath });
    const now = Date.now();

    if (blobs.length > 0) {
      const blob = blobs[0];
      const response = await fetch(blob.url);
      const data = await response.json();

      // Check if window has expired
      if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
        // Reset window
        const newData = { windowStart: now, count: 1 };
        await put(rateLimitPath, JSON.stringify(newData), {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'application/json'
        });
        return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
      }

      // Window still active - check count
      if (data.count >= MAX_REQUESTS_PER_WINDOW) {
        return { allowed: false, remaining: 0 };
      }

      // Increment count
      const newData = { windowStart: data.windowStart, count: data.count + 1 };
      await put(rateLimitPath, JSON.stringify(newData), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json'
      });
      return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - newData.count };
    }

    // No existing rate limit - create new
    const newData = { windowStart: now, count: 1 };
    await put(rateLimitPath, JSON.stringify(newData), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json'
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };

  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow request but log it
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW };
  }
};

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

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key configuration
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  try {
    const { handle: rawHandle, language: rawLanguage, forceRefresh } = req.body;

    // === INPUT VALIDATION ===

    // Validate and sanitize handle
    const handle = sanitizeHandle(rawHandle);
    if (!handle) {
      return res.status(400).json({
        error: 'Invalid handle format. Use alphanumeric characters and underscores only (max 50 chars).'
      });
    }

    // Validate language
    const language = ALLOWED_LANGUAGES.includes(rawLanguage) ? rawLanguage : 'en';

    // === CACHE CHECK (no rate limit for cache hits) ===
    if (!forceRefresh) {
      const cached = await getCachedAnalysis(handle, language);
      if (cached) {
        // Normalize old cached data to new schema (backward compatibility)
        const normalizedCache = {
          ...cached.data,
          // Ensure new required fields exist with defaults
          credibilityStrengths: cached.data.credibilityStrengths || [],
          riskFactors: cached.data.riskFactors || [],
        };
        // Remove deprecated fields from old cache
        delete normalizedCache.totalWins;
        delete normalizedCache.totalLosses;
        delete normalizedCache.sources;

        return res.status(200).json({
          ...normalizedCache,
          handle,
          source: 'cache',
          cachedAt: cached.cachedAt
        });
      }
    }

    // === RATE LIMITING (only for API calls, not cache hits) ===
    const clientIP = getClientIP(req);
    const rateLimit = await checkRateLimit(clientIP);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000 / 60) + ' minutes'
      });
    }

    // === CALL GEMINI API ===
    const ai = new GoogleGenAI({ apiKey });

    const langInstruction = language === 'zh-TW'
      ? "Output fields 'bioSummary', 'verdict', 'description', 'details' in Traditional Chinese (繁體中文)."
      : "Output all text fields in English.";

    // Optimized prompt with specific reputation sources
    const prompt = `
      Analyze Crypto KOL: "${handle}".
      ${langInstruction}

      REQUIRED SEARCHES (use exact queries):
      1. "ZachXBT ${handle}" - Find any investigations, exposés, or mentions by crypto detective ZachXBT
      2. "Coffeezilla ${handle}" - Find any coverage or investigations by YouTube investigator Coffeezilla
      3. "Reddit r/CryptoCurrency ${handle}" - Find community discussions, warnings, or praise on Reddit
      4. "${handle} crypto scam" and "${handle} rug pull" - Find scam allegations
      5. "${handle} paid promotion" and "${handle} sponsored" - Find undisclosed paid content

      ANALYSIS TASKS:
      1. CREDIBILITY STRENGTHS - Identify positive indicators such as:
         - Mainstream media recognition or citations
         - Transparent methodology (shares reasoning, admits uncertainty)
         - History of self-correction when wrong
         - Long-term consistent presence in crypto space
         - Educational content that helps newcomers
         - Verified credentials or professional background
         - Community trust and positive testimonials

      2. RISK FACTORS - Identify warning signs such as:
         - Sponsorship controversies or undisclosed paid promotions
         - Legal risks, investigations, or regulatory issues
         - Aggressive narratives or fear-mongering tactics
         - Association with failed projects or rug pulls
         - Pump-and-dump behavior patterns
         - Fake engagement or bot followers
         - History of deleting failed predictions

      EVIDENCE PRIORITY:
      - ZachXBT threads carry high weight (on-chain investigator)
      - Coffeezilla videos carry high weight (deep-dive investigations)
      - Reddit consensus with evidence carries medium weight
      - Multiple independent sources confirming same issue = high confidence

      SCORE LOGIC (based on qualitative factors):
      - 80-100: Strong credibility strengths (mainstream recognition, transparent methodology, self-correction history), minimal or no risk factors
      - 60-79: Some credibility strengths present, minor risk factors, generally positive community sentiment
      - 40-59: Mixed profile - some strengths offset by notable risk factors, community opinion divided
      - 20-39: Few credibility strengths, multiple significant risk factors (sponsorship issues, aggressive tactics)
      - 0-19: No credibility strengths, severe risk factors (confirmed scams, legal issues, ZachXBT/Coffeezilla exposed)

      IMPORTANT: Do not deep dive into raw blockchain transaction pages. Focus on reputation and track record.
    `;

    const analysisSchema = {
      type: Type.OBJECT,
      properties: {
        displayName: { type: Type.STRING, description: "Name of the KOL" },
        bioSummary: { type: Type.STRING, description: "1-2 sentence summary of their niche" },
        trustScore: { type: Type.NUMBER, description: "0-100 score based on qualitative credibility strengths vs risk factors" },
        followersCount: { type: Type.STRING, description: "Approximate follower count (e.g. '100K')" },
        verdict: { type: Type.STRING, description: "One-sentence verdict (e.g. 'High Risk Scammer')" },
        engagementQuality: {
          type: Type.STRING,
          enum: ["ORGANIC", "MIXED", "SUSPICIOUS", "BOT_HEAVY"],
          description: "Assessment of follower/engagement authenticity based on search evidence",
          nullable: true
        },
        credibilityStrengths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of positive credibility indicators (e.g. mainstream recognition, transparent methodology, self-correction history)"
        },
        riskFactors: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of identified risk factors (e.g. sponsorship controversies, legal risks, aggressive narratives)"
        },
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
                enum: ["PREDICTION_WIN", "PREDICTION_LOSS", "CONTROVERSY", "NEUTRAL_NEWS", "SCAM_ALLEGATION", "INVESTIGATION"]
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
      required: ["displayName", "bioSummary", "trustScore", "verdict", "credibilityStrengths", "riskFactors", "history"]
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

    // Extract Grounding Metadata (Citations/Sources)
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: any) => chunk.web ? { title: chunk.web.title, url: chunk.web.uri } : null)
      .filter((s: any) => s !== null);

    // Extract search queries used for grounding (if available)
    const searchQueries = groundingMetadata?.webSearchQueries || [];

    // === LOW-EVIDENCE FALLBACK NORMALIZATION ===
    // If Gemini returned minimal data and there are no grounded sources,
    // force a standard "insufficient information" response for predictability.
    const normalized: any = { ...data };

    if (
      sources.length === 0 &&
      (!Array.isArray(normalized.history) || normalized.history.length === 0)
    ) {
      normalized.trustScore = 50;
      normalized.credibilityStrengths = [];
      normalized.riskFactors = [
        language === 'zh-TW'
          ? '缺乏足夠公開資訊進行完整評估'
          : 'Insufficient public information for complete assessment'
      ];

      // If model didn't give a meaningful bio, provide a safe default
      if (!normalized.bioSummary || !normalized.bioSummary.trim()) {
        normalized.bioSummary =
          language === 'zh-TW'
            ? `目前缺乏足夠的公開資訊，無法為 ${normalized.displayName || handle} 建立詳細的加密貨幣相關介紹。`
            : `There is currently not enough public information to build a detailed crypto-related bio for ${normalized.displayName || handle}.`;
      }

      normalized.verdict =
        language === 'zh-TW'
          ? '需要更多公開資訊才能進行風險評估。'
          : 'Needs more public information before a fair risk assessment is possible.';

      normalized.history = [
        {
          id: 'insufficient-data',
          date: 'Recent',
          description:
            language === 'zh-TW'
              ? `缺乏足夠的公開證據評估 ${normalized.displayName || handle} 的加密貨幣相關聲譽`
              : `Insufficient public evidence to evaluate ${normalized.displayName || handle}'s crypto-related reputation`,
          type: 'NEUTRAL_NEWS',
          token: undefined,
          sentiment: 'NEUTRAL',
          details:
            language === 'zh-TW'
              ? '在 ZachXBT、Coffeezilla 或 Reddit 等主要風險來源中，尚未找到與此帳號有明確關聯的正面或負面報導。建議觀察其後續發文、贊助揭露與社群互動再做判斷。'
              : 'No strong positive or negative evidence was found in major risk sources (e.g. ZachXBT, Coffeezilla, Reddit). Consider monitoring future posts, sponsorship disclosures, and community interactions before making decisions.',
          sourceUrl: undefined,
        },
      ];
    }

    const result = {
      ...normalized,
      handle,
      // Search queries used by Google Search grounding
      searchQueries: searchQueries.length > 0 ? searchQueries : undefined,
      lastAnalyzed: new Date().toISOString(),
      groundedSearch: sources.length > 0 // Indicates if Google Search grounding was used
    };

    // Save to cache (async, don't wait)
    setCachedAnalysis(handle, language, result);

    return res.status(200).json({
      ...result,
      source: 'api'
    });

  } catch (error: any) {
    console.error("API Error:", error);

    // Handle specific error types
    let status = 500;
    let errorMessage = error.message || 'An unexpected error occurred';

    if (error.message?.includes('429') || error.status === 429) {
      status = 429;
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (error.message?.includes('API key')) {
      status = 500;
      errorMessage = 'Server configuration error: Invalid API key';
    } else if (error.message?.includes('grounding') || error.message?.includes('search')) {
      status = 503;
      errorMessage = 'Google Search grounding temporarily unavailable. Please try again.';
    }

    return res.status(status).json({
      error: errorMessage,
      groundedSearch: false
    });
  }
}
