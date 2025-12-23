import { GoogleGenAI, Type } from "@google/genai";
import { list, put } from "@vercel/blob";

// Configuration
const CACHE_DURATION_MS = 72 * 60 * 60 * 1000; // 72 hours
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 API calls per IP per hour
const MAX_HANDLE_LENGTH = 50;
const ALLOWED_LANGUAGES = ['en', 'zh-TW'];

// Inflation Maps for minified schema
const HISTORY_TYPE_MAP: Record<number, string> = {
  0: "PREDICTION_WIN", 1: "PREDICTION_LOSS", 2: "CONTROVERSY",
  3: "NEUTRAL_NEWS", 4: "SCAM_ALLEGATION", 5: "INVESTIGATION"
};
const SENTIMENT_MAP: Record<number, string> = { 0: "POSITIVE", 1: "NEGATIVE", 2: "NEUTRAL" };
const ENGAGEMENT_MAP: Record<number, string> = { 0: "ORGANIC", 1: "MIXED", 2: "SUSPICIOUS", 3: "BOT_HEAVY" };
const IDENTITY_MAP: Record<number, string> = { 0: "UNKNOWN_ENTITY", 1: "VERIFIED_INFLUENCER", 2: "IMPERSONATOR", 3: "OFFICIAL_PROJECT" };

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

    // Check if cache is expired (> 72 hours)
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

    // Optimized prompt - minified for token efficiency
    const prompt = `
    TASK: Background check Crypto KOL "${handle}".
    LANG: ${language === 'zh-TW' ? 'Traditional Chinese' : 'English'}.
    STEPS:
    1. ID: Verify if user is real/notable. If unknown/random, set s=0. If verified influencer, s=1. If impersonator, s=2.
    2. SEARCH: "ZachXBT ${handle}", "Coffeezilla ${handle}", "Reddit r/CryptoCurrency ${handle}", "${handle} scam", "${handle} rug pull", "${handle} paid promo".
    3. SCORE: 0(Scam)-100(Trusted). <20: Fraud. 20-40: Shiller. 40-60: Unknown. >80: Leader.
    OUTPUT: JSON only.
    `;

    // Minified schema for token efficiency
    const analysisSchema = {
      type: Type.OBJECT,
      properties: {
        d: { type: Type.STRING, description: "Display Name" },
        b: { type: Type.STRING, description: "Bio Summary (max 15 words)" },
        s: { type: Type.NUMBER, description: "Status: 0=Unknown, 1=Verified, 2=Impersonator, 3=Official" },
        ts: { type: Type.NUMBER, description: "Trust Score (0-100)" },
        v: { type: Type.STRING, description: "Verdict (Short)" },
        eq: { type: Type.NUMBER, description: "Engagement: 0=Org, 1=Mix, 2=Sus, 3=Bot", nullable: true },
        c: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Credibility Strengths" },
        r: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Risk Factors" },
        h: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dt: { type: Type.STRING, description: "Date (YYYY-MM-DD or 'Recent')" },
              e: { type: Type.STRING, description: "Event description" },
              t: { type: Type.NUMBER, description: "Type: 0=Win,1=Loss,2=Controv,3=News,4=Scam,5=Invest" },
              tk: { type: Type.STRING, description: "Token symbol", nullable: true },
              s: { type: Type.NUMBER, description: "Sentiment: 0=Pos,1=Neg,2=Neu" },
              x: { type: Type.STRING, description: "Details" }
            },
            required: ["dt", "e", "t", "s", "x"]
          }
        }
      },
      required: ["d", "b", "s", "ts", "v", "c", "r", "h"]
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
    const minData = JSON.parse(text || "{}");

    // Extract Grounding Metadata (Citations/Sources)
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: any) => chunk.web ? { title: chunk.web.title, url: chunk.web.uri } : null)
      .filter((s: any) => s !== null);

    // Extract search queries used for grounding (if available)
    const searchQueries = groundingMetadata?.webSearchQueries || [];

    // === INFLATE MINIFIED DATA TO FULL SCHEMA ===
    // Convert minified API response back to full UI-compatible format
    const fullData: any = {
      handle,
      displayName: minData.d || handle,
      bioSummary: minData.b || "No bio available",
      identityStatus: IDENTITY_MAP[minData.s] || "UNKNOWN_ENTITY",
      trustScore: minData.ts ?? 50,
      verdict: minData.v || "Insufficient data",
      engagementQuality: ENGAGEMENT_MAP[minData.eq] || "MIXED",
      credibilityStrengths: minData.c || [],
      riskFactors: minData.r || [],
      history: (minData.h || []).map((item: any, index: number) => ({
        id: `evt-${index}`,
        date: item.dt,
        description: item.e,
        type: HISTORY_TYPE_MAP[item.t] || "NEUTRAL_NEWS",
        token: item.tk || undefined,
        sentiment: SENTIMENT_MAP[item.s] || "NEUTRAL",
        details: item.x,
        sourceUrl: undefined
      })),
      // UI flow compatibility fields
      searchQueries: searchQueries.length > 0 ? searchQueries : undefined,
      groundedSearch: (groundingChunks?.length || 0) > 0,
      lastAnalyzed: new Date().toISOString(),
      followersCount: undefined // Explicitly undefined to respect types
    };

    // === LOW VISIBILITY PENALTY LOGIC ===
    // If identity status is UNKNOWN_ENTITY (s=0), cap trust score and add risk factor
    if (minData.s === 0) {
      fullData.trustScore = Math.min(fullData.trustScore, 40);
      if (fullData.riskFactors.length === 0) {
        fullData.riskFactors.push(
          language === 'zh-TW' ? "缺乏公眾記錄" : "Low public visibility"
        );
      }
    }

    // === LOW-EVIDENCE FALLBACK NORMALIZATION ===
    // If Gemini returned minimal data and there are no grounded sources,
    // force a standard "insufficient information" response for predictability.
    if (
      sources.length === 0 &&
      (!Array.isArray(fullData.history) || fullData.history.length === 0)
    ) {
      fullData.trustScore = 50;
      fullData.credibilityStrengths = [];
      fullData.riskFactors = [
        language === 'zh-TW'
          ? '缺乏足夠公開資訊進行完整評估'
          : 'Insufficient public information for complete assessment'
      ];

      // If model didn't give a meaningful bio, provide a safe default
      if (!fullData.bioSummary || !fullData.bioSummary.trim() || fullData.bioSummary === "No bio available") {
        fullData.bioSummary =
          language === 'zh-TW'
            ? `目前缺乏足夠的公開資訊，無法為 ${fullData.displayName || handle} 建立詳細的加密貨幣相關介紹。`
            : `There is currently not enough public information to build a detailed crypto-related bio for ${fullData.displayName || handle}.`;
      }

      fullData.verdict =
        language === 'zh-TW'
          ? '需要更多公開資訊才能進行風險評估。'
          : 'Needs more public information before a fair risk assessment is possible.';

      fullData.history = [
        {
          id: 'insufficient-data',
          date: 'Recent',
          description:
            language === 'zh-TW'
              ? `缺乏足夠的公開證據評估 ${fullData.displayName || handle} 的加密貨幣相關聲譽`
              : `Insufficient public evidence to evaluate ${fullData.displayName || handle}'s crypto-related reputation`,
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

    // Save to cache (async, don't wait)
    setCachedAnalysis(handle, language, fullData);

    return res.status(200).json({
      ...fullData,
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
