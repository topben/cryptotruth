import { GoogleGenAI, Type } from "@google/genai";
import { list, put } from "@vercel/blob";

// Configuration
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 API calls per IP per hour
const MAX_HANDLE_LENGTH = 50;
const ALLOWED_LANGUAGES = ['en', 'zh-TW'];

/**
 * Sanitize input - accepts handles, display names (including non-Latin), nicknames
 * Blocks dangerous characters but allows Unicode text
 */
const sanitizeInput = (input: string): string | null => {
  if (!input || typeof input !== 'string') return null;

  // Remove @ prefix if present
  let sanitized = input.trim().replace(/^@/, '');

  // Check length
  if (sanitized.length === 0 || sanitized.length > MAX_HANDLE_LENGTH) return null;

  // Block dangerous patterns (injection attempts) but allow Unicode
  const dangerousPatterns = /[<>{}()\[\];`$\\|&]/;
  if (dangerousPatterns.test(sanitized)) return null;

  return sanitized;
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
 * Build cache file path for Vercel Blob (mode-aware)
 */
const buildCachePath = (handle: string, language: string, mode: 'quick' | 'deep'): string => {
  return `cache/${mode}/${handle.toLowerCase()}-${language}-v1.json`;
};

/**
 * Check if cached data exists and is still valid
 */
const getCachedAnalysis = async (handle: string, language: string, mode: 'quick' | 'deep') => {
  try {
    const cachePath = buildCachePath(handle, language, mode);
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
const setCachedAnalysis = async (handle: string, language: string, mode: 'quick' | 'deep', data: any) => {
  try {
    const cachePath = buildCachePath(handle, language, mode);
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
    const inputQuery = sanitizeInput(rawHandle);
    if (!inputQuery) {
      return res.status(400).json({
        error: 'Invalid input format. Please enter a valid handle or display name (max 50 chars).'
      });
    }

    const handle = inputQuery.toLowerCase().replace(/\s+/g, '_');
    const language = ALLOWED_LANGUAGES.includes(rawLanguage) ? rawLanguage : 'en';

    // forceRefresh=true triggers DEEP SCAN, otherwise QUICK SCAN
    const scanMode: 'quick' | 'deep' = forceRefresh ? 'deep' : 'quick';

    // === CACHE CHECK ===
    const cached = await getCachedAnalysis(handle, language, scanMode);
    if (cached) {
      return res.status(200).json({
        ...cached.data,
        handle,
        source: 'cache',
        cachedAt: cached.cachedAt
      });
    }

    // === RATE LIMITING (only for DEEP scan to save API costs) ===
    if (scanMode === 'deep') {
      const clientIP = getClientIP(req);
      const rateLimit = await checkRateLimit(clientIP);
      res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
      res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000 / 60) + ' minutes'
        });
      }
    }

    // === CALL GEMINI API ===
    const ai = new GoogleGenAI({ apiKey });

    const langInstruction = language === 'zh-TW'
      ? "Output all text fields in Traditional Chinese (繁體中文)."
      : "Output all text fields in English.";

    const insufficientVerdictText = language === 'zh-TW'
      ? "公開資料不足，無法評估風險"
      : "Insufficient public data to assess risk";

    // ============ QUICK SCAN ============
    if (scanMode === 'quick') {
      const quickPrompt = `
        Quick identity check for crypto KOL: "${inputQuery}".
        ${langInstruction}

        Tasks:
        1. Identify if this corresponds to a crypto-related person/account.
        2. Find the most likely Twitter/X handle if possible.
        3. Suggest up to 3 alternative search queries (romanized names, aliases, common handles).
        4. List up to 3 candidate Twitter handles that might match.

        Keep output minimal. Do NOT do deep reputation analysis.
      `;

      const quickSchema = {
        type: Type.OBJECT,
        properties: {
          identity: {
            type: Type.OBJECT,
            properties: {
              input: { type: Type.STRING },
              resolvedHandle: { type: Type.STRING, nullable: true },
              displayName: { type: Type.STRING, nullable: true },
              confidence: { type: Type.NUMBER },
              resolutionNote: { type: Type.STRING }
            },
            required: ["input", "confidence", "resolutionNote"]
          },
          dataCoverage: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"] },
          displayName: { type: Type.STRING },
          bioSummary: { type: Type.STRING },
          suggestedQueries: { type: Type.ARRAY, items: { type: Type.STRING } },
          candidates: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["identity", "dataCoverage", "displayName", "bioSummary"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: quickPrompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: quickSchema,
          maxOutputTokens: 600,
          temperature: 0.3,
        },
      });

      const data = JSON.parse(response.text || "{}");
      if (data.identity) data.identity.input = inputQuery;

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .slice(0, 3)
        .map((c: any) => c.web ? { title: c.web.title, url: c.web.uri } : null)
        .filter(Boolean);

      const result = {
        ...data,
        handle,
        trustScore: null,
        totalWins: 0,
        totalLosses: 0,
        verdict: insufficientVerdictText,
        history: [],
        sources,
        scanMode: 'quick',
        lastAnalyzed: new Date().toISOString()
      };

      setCachedAnalysis(handle, language, 'quick', result);
      return res.status(200).json({ ...result, source: 'api' });
    }

    // ============ DEEP SCAN ============
    const deepPrompt = `
      Deep analysis of Crypto KOL: "${inputQuery}".
      ${langInstruction}

      PHASE 1 - Identity:
      - Resolve Twitter/X handle and display name.
      - Confidence 0-100.

      PHASE 2 - Reputation (strict evidence rules):
      - Use ONLY publicly verifiable sources.
      - Do NOT invent data or treat lack of data as negative.
      - Every history event MUST have a valid sourceUrl. Skip events without source.
      - Max 8 history items, max 280 chars per details field.
      - verdict: one sentence.

      dataCoverage: HIGH (many sources) / MEDIUM / LOW / INSUFFICIENT.
      If insufficient data: trustScore=null, verdict="${insufficientVerdictText}", history=[].

      Score logic: 80+ = trusted, <40 = risky/scammer.
    `;

    const deepSchema = {
      type: Type.OBJECT,
      properties: {
        identity: {
          type: Type.OBJECT,
          properties: {
            input: { type: Type.STRING },
            resolvedHandle: { type: Type.STRING, nullable: true },
            displayName: { type: Type.STRING, nullable: true },
            confidence: { type: Type.NUMBER },
            resolutionNote: { type: Type.STRING }
          },
          required: ["input", "confidence", "resolutionNote"]
        },
        dataCoverage: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"] },
        displayName: { type: Type.STRING },
        bioSummary: { type: Type.STRING },
        trustScore: { type: Type.NUMBER, nullable: true },
        totalWins: { type: Type.NUMBER },
        totalLosses: { type: Type.NUMBER },
        followersCount: { type: Type.STRING },
        verdict: { type: Type.STRING },
        history: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["PREDICTION_WIN", "PREDICTION_LOSS", "CONTROVERSY", "NEUTRAL_NEWS"] },
              token: { type: Type.STRING, nullable: true },
              sentiment: { type: Type.STRING, enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"] },
              details: { type: Type.STRING },
              sourceUrl: { type: Type.STRING }
            },
            required: ["id", "date", "description", "type", "sentiment", "details", "sourceUrl"]
          }
        }
      },
      required: ["identity", "dataCoverage", "displayName", "bioSummary", "totalWins", "totalLosses", "verdict", "history"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: deepPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: deepSchema,
        maxOutputTokens: 1800,
        temperature: 0.3,
      },
    });

    const data = JSON.parse(response.text || "{}");
    if (data.identity) data.identity.input = inputQuery;

    // Filter history without sourceUrl and limit to 8
    if (data.history && Array.isArray(data.history)) {
      data.history = data.history.filter((e: any) => e.sourceUrl).slice(0, 8);
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .slice(0, 5)
      .map((c: any) => c.web ? { title: c.web.title, url: c.web.uri } : null)
      .filter(Boolean);

    const result = {
      ...data,
      handle,
      sources,
      scanMode: 'deep',
      lastAnalyzed: new Date().toISOString()
    };

    setCachedAnalysis(handle, language, 'deep', result);
    return res.status(200).json({ ...result, source: 'api' });

  } catch (error: any) {
    console.error("API Error:", error);
    const status = error.status || (error.message?.includes('429') ? 429 : 500);
    return res.status(status).json({ error: error.message || 'An unexpected error occurred' });
  }
}
