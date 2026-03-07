import { GoogleGenAI } from "@google/genai";
import { list, put } from "@vercel/blob";
import {
  checkUrl,
  checkNumber,
  extractUrls,
  extractPhoneNumbers,
  summarizeUrlResult,
  summarizeNumberResult,
} from "../services/gogolookService.js";
import {
  checkUrlAgainstDataset,
  analyzeSmsText,
  isFacebookAdUrl,
  getSocialMediaAdContext,
  maskPII,
  LOAN_SCAM_SMS_EXAMPLES,
  ACCOUNT_ALERT_SMS_EXAMPLES,
} from "../services/scamDatasets.js";

// Configuration
const CACHE_DURATION_MS = 72 * 60 * 60 * 1000; // 72 hours
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 API calls per IP per hour
const MAX_HANDLE_LENGTH = 50;
const MAX_INPUT_LENGTH = 2000; // Max length for URL or SMS text
const ALLOWED_LANGUAGES = ['en', 'zh-TW'];
const ALLOWED_INPUT_TYPES = ['HANDLE', 'URL', 'SMS_TEXT'];

// Inflation Maps for minified schema
const HISTORY_TYPE_MAP: Record<number, string> = {
  0: "PREDICTION_WIN", 1: "PREDICTION_LOSS", 2: "CONTROVERSY",
  3: "NEUTRAL_NEWS", 4: "SCAM_ALLEGATION", 5: "INVESTIGATION"
};
const SENTIMENT_MAP: Record<number, string> = { 0: "POSITIVE", 1: "NEGATIVE", 2: "NEUTRAL" };
const ENGAGEMENT_MAP: Record<number, string> = { 0: "ORGANIC", 1: "MIXED", 2: "SUSPICIOUS", 3: "BOT_HEAVY" };
const IDENTITY_MAP: Record<number, string> = { 0: "UNKNOWN_ENTITY", 1: "VERIFIED_INFLUENCER", 2: "IMPERSONATOR", 3: "OFFICIAL_PROJECT" };
const RISK_LEVEL_MAP: Record<number, string> = { 0: "CRITICAL", 1: "WARNING", 2: "INFO" };
const ACTION_TYPE_MAP: Record<number, string> = { 0: "CALL_165", 1: "BLOCK", 2: "OFFICIAL_CHANNEL", 3: "REPORT", 4: "VERIFY", 5: "IGNORE" };

/**
 * Detect input type from content
 */
const detectInputType = (input: string): 'HANDLE' | 'URL' | 'SMS_TEXT' => {
  const trimmed = input.trim();

  // Check if it's a URL
  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) {
    return 'URL';
  }

  // Check if it looks like a Twitter handle (alphanumeric + underscores, optionally with @)
  const handlePattern = /^@?[a-zA-Z0-9_]{1,50}$/;
  if (handlePattern.test(trimmed)) {
    return 'HANDLE';
  }

  // Otherwise, treat as SMS/text content
  return 'SMS_TEXT';
};

/**
 * Sanitize and validate input based on type
 */
const sanitizeInput = (input: string, inputType: 'HANDLE' | 'URL' | 'SMS_TEXT'): string | null => {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  switch (inputType) {
    case 'HANDLE':
      // Remove @ prefix and validate
      let sanitized = trimmed.replace(/^@/, '');
      if (sanitized.length === 0 || sanitized.length > MAX_HANDLE_LENGTH) return null;
      if (!/^[a-zA-Z0-9_]+$/.test(sanitized)) return null;
      return sanitized.toLowerCase();

    case 'URL':
      // Basic URL validation
      if (trimmed.length > MAX_INPUT_LENGTH) return null;
      try {
        const urlStr = trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed;
        new URL(urlStr);
        return urlStr;
      } catch {
        return null;
      }

    case 'SMS_TEXT':
      // Validate text length and sanitize
      if (trimmed.length === 0 || trimmed.length > MAX_INPUT_LENGTH) return null;
      // Basic sanitization - remove control characters
      return trimmed.replace(/[\x00-\x1F\x7F]/g, '');

    default:
      return null;
  }
};

/**
 * Generate cache key for different input types
 */
const generateCacheKey = (input: string, inputType: string): string => {
  // Create a short hash for URLs and SMS text
  if (inputType === 'URL' || inputType === 'SMS_TEXT') {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${inputType.toLowerCase()}-${Math.abs(hash).toString(36)}`;
  }
  // For handles, use the handle directly
  return input.toLowerCase();
};

/**
 * Generate suggested actions based on risk score and signals
 */
const generateActions = (scamProbability: number, riskSignals: any[], language: string): any[] => {
  const actions: any[] = [];

  if (scamProbability >= 70) {
    // High risk - recommend calling 165 and blocking
    actions.push({
      label: language === 'zh-TW' ? '📞 撥打 165 反詐騙專線' : '📞 Call 165 Anti-Fraud Hotline',
      actionUrl: 'tel:165',
      type: 'CALL_165',
      priority: 1
    });
    actions.push({
      label: language === 'zh-TW' ? '🚫 封鎖此聯絡人' : '🚫 Block This Contact',
      type: 'BLOCK',
      priority: 2
    });
    actions.push({
      label: language === 'zh-TW' ? '📋 向警政署檢舉' : '📋 Report to Police',
      actionUrl: 'https://165.npa.gov.tw/',
      type: 'REPORT',
      priority: 3
    });
  } else if (scamProbability >= 40) {
    // Medium risk - recommend verification
    actions.push({
      label: language === 'zh-TW' ? '✅ 透過官方管道驗證' : '✅ Verify via Official Channel',
      type: 'OFFICIAL_CHANNEL',
      priority: 1
    });
    actions.push({
      label: language === 'zh-TW' ? '📋 回報可疑訊息' : '📋 Report Suspicious Message',
      actionUrl: 'https://165.npa.gov.tw/',
      type: 'REPORT',
      priority: 2
    });
  } else {
    // Low risk
    actions.push({
      label: language === 'zh-TW' ? '✅ 看起來安全，但請保持警覺' : '✅ Appears Safe, Stay Vigilant',
      type: 'VERIFY',
      priority: 1
    });
  }

  return actions;
};

/**
 * Generate senior-friendly verdict
 */
const generateSeniorVerdict = (scamProbability: number, language: string): string => {
  if (scamProbability >= 70) {
    return language === 'zh-TW'
      ? '⚠️ 這很可能是詐騙！請不要匯款或提供個人資料。建議撥打 165 諮詢。'
      : '⚠️ This is likely a SCAM! Do NOT send money or personal info. Call 165 for help.';
  } else if (scamProbability >= 40) {
    return language === 'zh-TW'
      ? '⚠️ 這有一些可疑跡象。請先向官方確認後再行動。'
      : '⚠️ This has some suspicious signs. Please verify with official sources first.';
  } else {
    return language === 'zh-TW'
      ? '✅ 目前看起來還好，但請繼續保持警覺。'
      : '✅ Looks okay for now, but stay alert.';
  }
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
 * Extract JSON from a potentially markdown-formatted string
 */
const extractJSON = (text: string): string => {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  // Extract the JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : cleaned;
};

/**
 * Safely parse JSON from a fetch response, returning null on failure
 */
const safeParseJSON = async (response: Response): Promise<any | null> => {
  try {
    if (!response.ok) {
      return null;
    }
    const text = await response.text();
    // Validate it looks like JSON before parsing
    if (!text || !text.trim().startsWith('{')) {
      return null;
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
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
      const data = await safeParseJSON(response);

      // If parsing failed or data is invalid, treat as no existing rate limit
      if (!data || typeof data.windowStart !== 'number' || typeof data.count !== 'number') {
        const newData = { windowStart: now, count: 1 };
        await put(rateLimitPath, JSON.stringify(newData), {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'application/json'
        });
        return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
      }

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
const buildCachePath = (cacheKey: string, language: string): string => {
  return `cache/${cacheKey}-${language}.json`;
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
    const data = await safeParseJSON(response);

    // If parsing failed, treat as cache miss
    if (!data) {
      console.log(`Cache data invalid for ${handle}, treating as miss`);
      return null;
    }

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

/**
 * Fetch external scam signals from the hackathon dataset + Gogolook APIs
 * (ScamAdviser + Whoscall), returning a formatted string for the Gemini prompt.
 *
 * Detection layers by input type:
 *  URL      → dataset (exact/domain/typosquatting/TLD) → ScamAdviser API
 *  SMS_TEXT → SMS classifier + keyword scan → URL sub-checks → Whoscall phone check
 *  URL (Facebook Ads) → social media ad context
 */
const fetchExternalContext = async (input: string, inputType: string): Promise<string> => {
  const sections: string[] = [];

  if (inputType === 'URL') {
    // Layer 1: Social media ad detection (Facebook Ads Library)
    if (isFacebookAdUrl(input)) {
      sections.push(getSocialMediaAdContext());
    }

    // Layer 2: Hackathon dataset check (exact → domain → typosquatting → TLD)
    const datasetMatch = checkUrlAgainstDataset(input);
    if (datasetMatch.matched) {
      sections.push(
        `HACKATHON DATASET MATCH:\n` +
        `- Scam Type: ${datasetMatch.scamType}\n` +
        `- ${datasetMatch.detail}`
      );
    }

    // Layer 3: ScamAdviser via Gogolook API (cache-first)
    const scamAdviserResult = await checkUrl(input);
    if (scamAdviserResult) sections.push(summarizeUrlResult(input, scamAdviserResult));

  } else if (inputType === 'SMS_TEXT') {
    // Layer 1: SMS classifier — scam type + keyword signals + relevant few-shot examples
    const smsAnalysis = analyzeSmsText(input);
    if (smsAnalysis.signals.length > 0 || smsAnalysis.scamType !== 'UNKNOWN') {
      sections.push(
        `HACKATHON DATASET SMS ANALYSIS:\n` +
        `- Detected Scam Type: ${smsAnalysis.scamType}\n` +
        (smsAnalysis.signals.length > 0 ? smsAnalysis.signals.map(s => `- ${s}`).join('\n') : '') +
        `\n\nREFERENCE EXAMPLES (${smsAnalysis.scamType}):\n` +
        smsAnalysis.relevantExamples.map((ex, i) => `  [${i + 1}] ${ex.slice(0, 150)}`).join('\n')
      );
    } else {
      // No keyword match — provide generic few-shot examples to calibrate Gemini
      sections.push(
        `REFERENCE SCAM SMS EXAMPLES (from Taiwan hackathon competition dataset):\n` +
        [...LOAN_SCAM_SMS_EXAMPLES.slice(0, 2), ...ACCOUNT_ALERT_SMS_EXAMPLES.slice(0, 2)]
          .map((ex, i) => `  [${i + 1}] ${ex.slice(0, 150)}`).join('\n')
      );
    }

    // Layer 2: Check URLs embedded in SMS against dataset + ScamAdviser (parallel)
    const urls = extractUrls(input);
    if (urls.length > 0) {
      const urlDatasetChecks = urls.map(u => ({ url: u, match: checkUrlAgainstDataset(u) }));
      const urlApiResults = await Promise.all(urls.map(url => checkUrl(url)));

      urlDatasetChecks.forEach(({ url, match }) => {
        if (match.matched) {
          sections.push(
            `DATASET MATCH for embedded URL "${url}":\n- Scam Type: ${match.scamType}\n- ${match.detail}`
          );
        }
      });
      urlApiResults.forEach((result, i) => {
        if (result) sections.push(summarizeUrlResult(urls[i], result));
      });
    }

    // Layer 3: Check phone numbers via Whoscall (sequential, 1 RPS limit)
    const phones = extractPhoneNumbers(input);
    for (const { country, number } of phones) {
      const result = await checkNumber(country, number);
      if (result) sections.push(summarizeNumberResult(number, result));
    }
  }

  if (sections.length === 0) return '';
  return `\n--- EXTERNAL VERIFICATION DATA (use this to improve accuracy) ---\n${sections.join('\n\n')}\n---\n`;
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
    const { handle: rawHandle, input: rawInput, inputType: rawInputType, language: rawLanguage, forceRefresh } = req.body;

    // === INPUT VALIDATION (Support both legacy 'handle' and new 'input' field) ===
    const inputContent = rawInput || rawHandle;
    if (!inputContent) {
      return res.status(400).json({
        error: 'Missing input. Please provide a Twitter handle, URL, or SMS text.'
      });
    }

    // Detect input type if not provided
    const detectedType = rawInputType && ALLOWED_INPUT_TYPES.includes(rawInputType)
      ? rawInputType
      : detectInputType(inputContent);

    // Sanitize input based on type
    const sanitizedInput = sanitizeInput(inputContent, detectedType);
    if (!sanitizedInput) {
      return res.status(400).json({
        error: detectedType === 'HANDLE'
          ? 'Invalid handle format. Use alphanumeric characters and underscores only (max 50 chars).'
          : detectedType === 'URL'
          ? 'Invalid URL format. Please provide a valid URL.'
          : 'Invalid input. Text must be between 1 and 2000 characters.'
      });
    }

    // For backward compatibility, set handle for HANDLE type
    const handle = detectedType === 'HANDLE' ? sanitizedInput : '';

    // Validate language
    const language = ALLOWED_LANGUAGES.includes(rawLanguage) ? rawLanguage : 'en';

    // Generate cache key
    const cacheKey = generateCacheKey(sanitizedInput, detectedType);

    // === CACHE CHECK (no rate limit for cache hits) ===
    if (!forceRefresh) {
      const cached = await getCachedAnalysis(cacheKey, language);
      if (cached) {
        // Normalize old cached data to new schema (backward compatibility)
        const normalizedCache = {
          ...cached.data,
          // Ensure new required fields exist with defaults
          credibilityStrengths: cached.data.credibilityStrengths || [],
          riskFactors: cached.data.riskFactors || [],
          riskSignals: cached.data.riskSignals || [],
          suggestedActions: cached.data.suggestedActions || [],
          inputType: cached.data.inputType || detectedType,
          originalInput: cached.data.originalInput || sanitizedInput,
          scamProbability: cached.data.scamProbability ?? cached.data.trustScore ? (100 - cached.data.trustScore) : 50,
        };
        // Remove deprecated fields from old cache
        delete normalizedCache.totalWins;
        delete normalizedCache.totalLosses;
        delete normalizedCache.sources;

        return res.status(200).json({
          ...normalizedCache,
          handle: handle || normalizedCache.handle || '',
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

    // === FETCH EXTERNAL SIGNALS (ScamAdviser + Whoscall) ===
    const externalContext = await fetchExternalContext(sanitizedInput, detectedType);

    // === CALL GEMINI API ===
    const ai = new GoogleGenAI({ apiKey });

    // Build prompt based on input type
    const buildPrompt = () => {
      const langInstruction = language === 'zh-TW'
        ? 'Traditional Chinese (繁體中文). You MUST write ALL output text fields — including "d", "b", "v", "c" array items, "r" array items, "rs[].e" evidence strings, and "h[].x" detail strings — entirely in Traditional Chinese (繁體中文). Do not use English in any text field.'
        : 'English. Write all output text fields in English.';

      // Common scam detection instructions
      const scamDetectionInstructions = `
SCAM DETECTION CRITERIA (check for these red flags):
- 保證獲利/Guaranteed returns: Promises of fixed high returns (e.g., "guaranteed 30% monthly")
- 壓力催促/Pressure tactics: Urgency language (e.g., "limited time", "act now", "last chance")
- 冒充官方/Impersonation: Fake official accounts, copied logos, similar-looking URLs
- 不明入金/Suspicious payments: Requests for crypto transfers, gift cards, or wire transfers
- 假冒名人/Celebrity impersonation: Using famous names to build false trust
- 龐氏特徵/Ponzi signs: Referral bonuses, multi-level structures
- 釣魚連結/Phishing: Suspicious URLs, URL shorteners, typosquatting domains
`;

      if (detectedType === 'HANDLE') {
        return `
TASK: 執行「防詐識別分析」- Crypto Influencer Background Check
ANALYSIS TARGET: Twitter/X Handle "@${sanitizedInput}"
LANGUAGE: ${langInstruction}

INSTRUCTIONS:
1. Use Google Search to research this account's history, controversies, and track record.
2. Search for: "ZachXBT ${sanitizedInput}", "Coffeezilla ${sanitizedInput}", "Reddit r/CryptoCurrency ${sanitizedInput}", "${sanitizedInput} rug pull", "${sanitizedInput} scam", "${sanitizedInput} paid promo", "165 ${sanitizedInput}".
3. Check if this account has been flagged by Taiwan's 165 anti-fraud hotline or international scam databases.
${scamDetectionInstructions}

SCORING:
- trustScore: 0(Scam)-100(Trusted). <20: Confirmed Fraud. 20-40: High Risk. 40-60: Unknown/Caution. >80: Trusted.
- scamProbability: Inverse of trustScore adjusted for scam signals. High if multiple red flags found.

OUTPUT JSON ONLY:
{
  "d": "Display Name",
  "b": "Short Bio (max 15 words)",
  "s": 0-3 (0=Unknown, 1=Verified Influencer, 2=Impersonator, 3=Official Project),
  "ts": Trust Score (0-100),
  "sp": Scam Probability (0-100),
  "v": "One sentence verdict",
  "eq": 0-3 (0=Organic, 1=Mixed, 2=Suspicious, 3=BotHeavy),
  "c": ["Credibility Strengths array"],
  "r": ["Risk Factors array"],
  "rs": [{"t": "Signal Type", "e": "Evidence description", "l": 0-2 (0=CRITICAL, 1=WARNING, 2=INFO)}],
  "h": [{"dt": "YYYY-MM-DD", "e": "Event Title", "t": 0-5 (0=Win,1=Loss,2=Controversy,3=News,4=Scam,5=Investigation), "tk": "Token symbol or null", "s": 0-2 (0=Positive,1=Negative,2=Neutral), "x": "Details"}]
}
`;
      } else if (detectedType === 'URL') {
        return `
TASK: 執行「防詐識別分析」- Suspicious URL Analysis
ANALYSIS TARGET: URL "${sanitizedInput}"
LANGUAGE: ${langInstruction}
${externalContext}
INSTRUCTIONS:
1. Use Google Search to research this URL/domain.
2. Search for: "${sanitizedInput} scam", "${sanitizedInput} fraud", "${sanitizedInput} 詐騙", "site:165.npa.gov.tw ${new URL(sanitizedInput).hostname}", "${new URL(sanitizedInput).hostname} phishing".
3. Check if this domain is on blocklists, reported as phishing, or associated with scams.
4. Analyze the URL structure for suspicious patterns (typosquatting, misleading subdomains, etc.)
5. Incorporate the external ScamAdviser data provided above into your scoring.
${scamDetectionInstructions}

CRITICAL RULE FOR RISK SIGNALS:
- Only add a risk signal ("rs") if there is DIRECT evidence that THIS SPECIFIC URL/domain is dangerous.
- Do NOT add risk signals for general warnings like "scammers may impersonate this brand" or "phishing emails may mimic this service" — those are generic internet safety tips, not evidence against this URL.
- A risk signal must be something specific found about this exact domain (e.g., it is on a blocklist, it has been reported as phishing, it has a typosquatted domain name, it was flagged by Taiwan's 165 hotline).
- If the domain is clearly legitimate and well-established, "rs" should be an empty array [].

SCORING:
- trustScore: 0(Dangerous)-100(Safe). <20: Confirmed Scam Site. 20-40: High Risk. 40-60: Suspicious. >80: Likely Safe.
- scamProbability: Based on domain reputation, URL patterns, ScamAdviser data, and search results.

OUTPUT JSON ONLY:
{
  "d": "Website/Service Name",
  "b": "What this URL appears to be (max 15 words)",
  "s": 0-3 (0=Unknown, 1=Legitimate Service, 2=Impersonator/Phishing, 3=Official),
  "ts": Trust Score (0-100),
  "sp": Scam Probability (0-100),
  "v": "One sentence verdict about this URL's safety",
  "eq": 0-3 (0=Legitimate, 1=Questionable, 2=Suspicious, 3=Malicious),
  "c": ["Reasons this might be legitimate"],
  "r": ["Warning signs and risks"],
  "rs": [{"t": "Signal Type (e.g., PHISHING_URL, TYPOSQUATTING, KNOWN_SCAM)", "e": "Direct evidence about this specific URL", "l": 0-2}],
  "h": [{"dt": "YYYY-MM-DD", "e": "Report/Incident", "t": 0-5, "tk": null, "s": 0-2, "x": "Details"}]
}
`;
      } else {
        // SMS_TEXT
        return `
TASK: 執行「防詐識別分析」- Suspicious Message Analysis
ANALYSIS TARGET: Message Content:
"""
${sanitizedInput}
"""
LANGUAGE: ${langInstruction}
${externalContext}
INSTRUCTIONS:
1. Analyze this message for common scam patterns.
2. If it contains URLs or phone numbers, research them via Google Search.
3. Check for language patterns commonly used in Taiwan/Asia scams (investment scams, romance scams, impersonation).
4. Search for: any phone numbers or URLs in the message, common scam phrases used.
5. Incorporate the external ScamAdviser/Whoscall data provided above into your scoring.
${scamDetectionInstructions}

SPECIFIC SCAM TYPES TO CHECK:
- 假投資/Fake Investment: "老師帶單", "穩賺不賠", "內線消息"
- 假交友/Romance Scam: Sudden intimacy, requests for money/crypto
- 假網購/Fake Shopping: Too-good-to-be-true prices, suspicious payment methods
- 假冒機構/Impersonation: Banks, government, delivery companies
- 中獎詐騙/Prize Scam: "恭喜中獎", requires fees to claim

SCORING:
- trustScore: 0(Scam)-100(Legitimate). <20: Confirmed Scam Pattern. 20-40: High Risk. 40-60: Suspicious. >80: Likely OK.
- scamProbability: Based on message content, Whoscall/ScamAdviser data, and known scam patterns.

OUTPUT JSON ONLY:
{
  "d": "Sender/Source (if identifiable)",
  "b": "Message type summary (max 15 words)",
  "s": 0-3 (0=Unknown Source, 1=Likely Legitimate, 2=Likely Scammer, 3=Verified Source),
  "ts": Trust Score (0-100),
  "sp": Scam Probability (0-100),
  "v": "One sentence verdict - is this message safe?",
  "eq": 0-3 (0=Normal, 1=Questionable, 2=Suspicious, 3=Scam Pattern),
  "c": ["Reasons this might be legitimate"],
  "r": ["Warning signs found in message"],
  "rs": [{"t": "Signal Type (e.g., GUARANTEED_RETURNS, PRESSURE_TACTICS, IMPERSONATION)", "e": "Exact quote or evidence from message", "l": 0-2}],
  "h": []
}
`;
      }
    };

    const prompt = buildPrompt();

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const minData = JSON.parse(extractJSON(text) || "{}");

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

    // Calculate scam probability (use sp from response or derive from trustScore)
    const scamProbability = minData.sp ?? (100 - (minData.ts ?? 50));

    // Parse risk signals
    const riskSignals = (minData.rs || []).map((signal: any) => ({
      type: signal.t || 'UNKNOWN',
      evidence: signal.e || '',
      level: RISK_LEVEL_MAP[signal.l] || 'INFO'
    }));

    // Generate actions based on scam probability
    const suggestedActions = generateActions(scamProbability, riskSignals, language);

    const fullData: any = {
      // Legacy handle field for backward compatibility
      handle: handle || sanitizedInput,
      displayName: minData.d || handle || sanitizedInput,
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

      // === TruthGuard AI New Fields ===
      inputType: detectedType,
      originalInput: sanitizedInput,
      scamProbability,
      riskSignals,
      suggestedActions,
      seniorModeVerdict: generateSeniorVerdict(scamProbability, language),

      // UI flow compatibility fields
      searchQueries: searchQueries.length > 0 ? searchQueries : undefined,
      groundedSearch: (groundingChunks?.length || 0) > 0,
      lastAnalyzed: new Date().toISOString(),
      followersCount: undefined // Explicitly undefined to respect types
    };

    // === HIGH-TRUST SIGNAL FILTER (URL only) ===
    // For well-established URLs (trustScore > 80), suppress generic risk factors and
    // WARNING/INFO risk signals that are not direct evidence against this URL
    // (e.g. "scammers may impersonate this brand" on google.com).
    if (detectedType === 'URL' && fullData.trustScore > 80) {
      fullData.riskSignals = fullData.riskSignals.filter((s: any) => s.level === 'CRITICAL');
      fullData.riskFactors = fullData.riskFactors.filter((r: string) => {
        const lower = r.toLowerCase();
        // Remove generic impersonation warnings that aren't about this specific URL
        return !lower.includes('scammer') && !lower.includes('phishing email') &&
               !lower.includes('may try') && !lower.includes('may impersonate') &&
               !lower.includes('be wary') && !lower.includes('be cautious');
      });
    }

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
      fullData.scamProbability = 50;
      fullData.credibilityStrengths = [];
      fullData.riskFactors = [
        language === 'zh-TW'
          ? '缺乏足夠公開資訊進行完整評估'
          : 'Insufficient public information for complete assessment'
      ];

      // Add a generic risk signal for low evidence
      fullData.riskSignals = [{
        type: 'INSUFFICIENT_DATA',
        evidence: language === 'zh-TW'
          ? '無法找到足夠的公開資訊來驗證此內容'
          : 'Unable to find sufficient public information to verify this content',
        level: 'WARNING'
      }];

      // Update suggested actions for uncertain case
      fullData.suggestedActions = generateActions(50, fullData.riskSignals, language);
      fullData.seniorModeVerdict = generateSeniorVerdict(50, language);

      const displayIdentifier = fullData.displayName || handle || sanitizedInput;

      // If model didn't give a meaningful bio, provide a safe default
      if (!fullData.bioSummary || !fullData.bioSummary.trim() || fullData.bioSummary === "No bio available") {
        fullData.bioSummary =
          language === 'zh-TW'
            ? `目前缺乏足夠的公開資訊，無法為 ${displayIdentifier} 建立詳細的介紹。`
            : `There is currently not enough public information to build a detailed profile for ${displayIdentifier}.`;
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
              ? `缺乏足夠的公開證據評估 ${displayIdentifier}`
              : `Insufficient public evidence to evaluate ${displayIdentifier}`,
          type: 'NEUTRAL_NEWS',
          token: undefined,
          sentiment: 'NEUTRAL',
          details:
            language === 'zh-TW'
              ? '在主要風險來源中，尚未找到明確關聯的正面或負面報導。建議保持警覺，如有疑慮可撥打 165 諮詢。'
              : 'No strong positive or negative evidence was found in major risk sources. Stay vigilant and call 165 if you have concerns.',
          sourceUrl: undefined,
        },
      ];
    }

    // Apply PII masking before caching and returning (PDF security requirement)
    if (detectedType === 'SMS_TEXT') {
      fullData.bioSummary = maskPII(fullData.bioSummary);
      fullData.verdict = maskPII(fullData.verdict);
      fullData.seniorModeVerdict = maskPII(fullData.seniorModeVerdict);
      fullData.riskSignals = fullData.riskSignals.map((s: any) => ({ ...s, evidence: maskPII(s.evidence) }));
    }

    // Save to cache (async, don't wait)
    setCachedAnalysis(cacheKey, language, fullData);

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
