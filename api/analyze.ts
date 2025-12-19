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

    // Validate and sanitize input (handles, display names, nicknames)
    const inputQuery = sanitizeInput(rawHandle);
    if (!inputQuery) {
      return res.status(400).json({
        error: 'Invalid input format. Please enter a valid handle or display name (max 50 chars).'
      });
    }

    // Use input as cache key (normalized)
    const handle = inputQuery.toLowerCase().replace(/\s+/g, '_');

    // Validate language
    const language = ALLOWED_LANGUAGES.includes(rawLanguage) ? rawLanguage : 'en';

    // === CACHE CHECK (no rate limit for cache hits) ===
    if (!forceRefresh) {
      const cached = await getCachedAnalysis(handle, language);
      if (cached) {
        return res.status(200).json({
          ...cached.data,
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
      ? "Output fields 'bioSummary', 'verdict', 'description', 'details', 'resolutionNote' in Traditional Chinese (繁體中文)."
      : "Output all text fields in English.";

    const insufficientVerdictText = language === 'zh-TW'
      ? "公開資料不足，無法評估風險"
      : "Insufficient public data to assess risk";

    // Two-phase prompt: Identity Resolution + Reputation Analysis
    const prompt = `
      Analyze Crypto KOL: "${inputQuery}".
      ${langInstruction}

      PHASE 1 - Identity Resolution:
      - Determine if "${inputQuery}" corresponds to a crypto-related individual/account.
      - Try to resolve the most likely Twitter/X handle (if any).
      - Provide confidence (0-100) for the identity resolution.
      - If no clear account found, set confidence low and note "unresolved".

      PHASE 2 - Reputation Analysis (ONLY if identity is reasonably confident):
      - Use ONLY publicly verifiable sources (news, public posts, forums).
      - Do NOT invent blockchain transactions or unverified claims.
      - Do NOT treat lack of data as negative evidence.

      CRITICAL RULES:
      - If insufficient public data exists:
        * Set trustScore to null
        * Set verdict to: "${insufficientVerdictText}"
        * Set history to empty array []
        * Set dataCoverage to "INSUFFICIENT"
      - Each history event MUST have a valid sourceUrl. If no source URL available, do NOT include that event.
      - dataCoverage levels:
        * HIGH: Multiple reliable sources, verified account
        * MEDIUM: Some sources, partially verified
        * LOW: Few sources, uncertain verification
        * INSUFFICIENT: No reliable public data

      Score logic (only when data is sufficient):
      - High score (80+): Accurate calls, community trust, verified track record.
      - Low score (<40): Documented paid promos, scams, rug pulls.
    `;

    const analysisSchema = {
      type: Type.OBJECT,
      properties: {
        identity: {
          type: Type.OBJECT,
          description: "Identity resolution result",
          properties: {
            input: { type: Type.STRING, description: "Original search input" },
            resolvedHandle: { type: Type.STRING, description: "Twitter/X handle if found", nullable: true },
            displayName: { type: Type.STRING, description: "Display name if found", nullable: true },
            confidence: { type: Type.NUMBER, description: "Confidence 0-100 for identity resolution" },
            resolutionNote: { type: Type.STRING, description: "Brief note about resolution result" }
          },
          required: ["input", "confidence", "resolutionNote"]
        },
        dataCoverage: {
          type: Type.STRING,
          enum: ["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"],
          description: "Level of available public data"
        },
        displayName: { type: Type.STRING, description: "Name of the KOL" },
        bioSummary: { type: Type.STRING, description: "1-2 sentence summary of their niche" },
        trustScore: { type: Type.NUMBER, description: "0-100 score, or null if insufficient data", nullable: true },
        totalWins: { type: Type.NUMBER, description: "Count of successful calls/good reports" },
        totalLosses: { type: Type.NUMBER, description: "Count of failed calls/scams/controversies" },
        followersCount: { type: Type.STRING, description: "Approximate follower count (e.g. '100K')" },
        verdict: { type: Type.STRING, description: "One-sentence verdict" },
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
              sourceUrl: { type: Type.STRING, description: "Required URL to evidence source" }
            },
            required: ["id", "date", "description", "type", "sentiment", "details", "sourceUrl"]
          }
        }
      },
      required: ["identity", "dataCoverage", "displayName", "bioSummary", "totalWins", "totalLosses", "verdict", "history"]
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

    // Ensure identity.input is set to original query
    if (data.identity) {
      data.identity.input = inputQuery;
    }

    // Filter history events without sourceUrl
    if (data.history && Array.isArray(data.history)) {
      data.history = data.history.filter((event: any) => event.sourceUrl);
    }

    const result = {
      ...data,
      handle,
      sources: sources,
      lastAnalyzed: new Date().toISOString()
    };

    // Save to cache (async, don't wait)
    setCachedAnalysis(handle, language, result);

    return res.status(200).json({
      ...result,
      source: 'api'
    });

  } catch (error: any) {
    console.error("API Error:", error);
    const status = error.status || (error.message?.includes('429') ? 429 : 500);
    return res.status(status).json({ error: error.message || 'An unexpected error occurred' });
  }
}
