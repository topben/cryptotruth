import { GoogleGenAI } from "@google/genai";
import { list, put } from "@vercel/blob";
/**
 * Mask phone numbers and LINE IDs to protect PII before caching.
 */
const maskPII = (text: string): string => {
  if (!text) return text;
  let t = text;
  // Taiwan mobile: 09xxxxxxxx → 09xx-***-***
  t = t.replace(/0[9]\d{8}/g, m => m.slice(0, 4) + '-***-***');
  // International +886: +886-9xx-xxx-xxx
  t = t.replace(/\+886[-\s]?9\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, '+886-9xx-***-***');
  return t;
};

// Configuration
const CACHE_DURATION_MS = 72 * 60 * 60 * 1000; // 72 hours
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 API calls per IP per hour
const MAX_HANDLE_LENGTH = 50;
const MAX_INPUT_LENGTH = 2000; // Max length for URL or SMS text
const ALLOWED_LANGUAGES = ['en', 'zh-TW'];
const ALLOWED_INPUT_TYPES = ['HANDLE', 'URL', 'SMS_TEXT', 'PHONE'];

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
const detectInputType = (input: string): 'HANDLE' | 'URL' | 'SMS_TEXT' | 'PHONE' => {
  const trimmed = input.trim();

  // Check if it's a URL
  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) {
    return 'URL';
  }

  // Check if it looks like a phone number (E.164 international or Taiwan local 09xx)
  if (/^\+\d{7,15}$/.test(trimmed.replace(/[\s\-().]/g, '')) || /^0[89]\d{8}$/.test(trimmed.replace(/[\s\-]/g, ''))) {
    return 'PHONE';
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
const sanitizeInput = (input: string, inputType: 'HANDLE' | 'URL' | 'SMS_TEXT' | 'PHONE'): string | null => {
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

    case 'PHONE': {
      // Normalize phone number: strip spaces, dashes, parens
      const digits = trimmed.replace(/[\s\-().]/g, '');
      // E.164 international format: +[1-3 digit country code][number]
      if (/^\+\d{7,15}$/.test(digits)) return digits;
      // Taiwan local mobile 09xxxxxxxx → +8869xxxxxxxx
      if (/^09\d{8}$/.test(digits)) return `+886${digits.slice(1)}`;
      // Taiwan local landline 0x-xxxxxxxx
      if (/^0[2-8]\d{7,8}$/.test(digits)) return `+886${digits.slice(1)}`;
      return null;
    }

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
  // For phone numbers, use the normalized E.164 number as key
  if (inputType === 'PHONE') {
    return `phone-${input.replace(/\+/g, '')}`;
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


// =============================================================================
// FACT GATHERING — free external checks run before AI analysis
// =============================================================================

const FACT_FETCH_TIMEOUT_MS = 5000;

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FACT_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// --- RDAP: domain registration info (no API key required) ---
async function rdapFacts(hostname: string): Promise<Record<string, string>> {
  try {
    const res = await fetchWithTimeout(`https://rdap.org/domain/${encodeURIComponent(hostname)}`);
    if (!res.ok) return {};
    const d = await res.json();

    const events: any[] = d.events || [];
    const regEvent = events.find((e: any) => e.eventAction === 'registration');
    const expEvent = events.find((e: any) => e.eventAction === 'expiration');

    const regDate = regEvent?.eventDate ? new Date(regEvent.eventDate) : null;
    const ageDays = regDate ? Math.floor((Date.now() - regDate.getTime()) / 86400000) : null;

    const entities: any[] = d.entities || [];
    const registrar = entities.find((e: any) => (e.roles || []).includes('registrar'));
    const registrarName = registrar?.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3] ?? null;

    const result: Record<string, string> = {};
    if (regDate) result.registrationDate = regDate.toISOString().split('T')[0];
    if (ageDays !== null) result.domainAgeDays = String(ageDays);
    if (expEvent?.eventDate) result.expiresDate = new Date(expEvent.eventDate).toISOString().split('T')[0];
    if (registrarName) result.registrar = String(registrarName);
    return result;
  } catch {
    return {};
  }
}

// --- Google Safe Browsing v4 (optional — needs GOOGLE_SAFE_BROWSING_KEY) ---
async function safeBrowsingCheck(url: string): Promise<{ status: 'CLEAN' | 'THREAT' | 'SKIP'; threats?: string[] }> {
  const sbKey = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!sbKey) return { status: 'SKIP' };
  try {
    const body = {
      client: { clientId: 'verify1st', clientVersion: '1.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }],
      },
    };
    const res = await fetchWithTimeout(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${sbKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    if (!res.ok) return { status: 'SKIP' };
    const d = await res.json();
    if (d.matches?.length > 0) {
      return { status: 'THREAT', threats: d.matches.map((m: any) => m.threatType as string) };
    }
    return { status: 'CLEAN' };
  } catch {
    return { status: 'SKIP' };
  }
}

// --- DNS via Google DoH (no API key required) ---
async function dnsFacts(hostname: string): Promise<{ resolvable: boolean; ips: string[] }> {
  try {
    const res = await fetchWithTimeout(
      `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`
    );
    if (!res.ok) return { resolvable: false, ips: [] };
    const d = await res.json();
    const ips: string[] = (d.Answer || [])
      .filter((a: any) => a.type === 1)
      .map((a: any) => a.data as string)
      .slice(0, 3);
    return { resolvable: ips.length > 0, ips };
  } catch {
    return { resolvable: false, ips: [] };
  }
}

// --- ScamSniffer: Web3/crypto phishing blacklist ---
async function scamSnifferCheck(url: string): Promise<{ status: 'BLOCKED' | 'PASSED' | 'SKIP' }> {
  const key = process.env.SCAMSNIFFER_API_KEY;
  if (!key) return { status: 'SKIP' };
  try {
    const res = await fetchWithTimeout(
      `https://lookup-api.scamsniffer.io/site/check?url=${encodeURIComponent(url)}`,
      { headers: { 'x-api-key': key } }
    );
    if (!res.ok) return { status: 'SKIP' };
    const d = await res.json();
    return { status: d.status === 'BLOCKED' ? 'BLOCKED' : 'PASSED' };
  } catch {
    return { status: 'SKIP' };
  }
}

async function scamSnifferAddressCheck(address: string): Promise<{ status: 'BLOCKED' | 'PASSED' | 'SKIP' }> {
  const key = process.env.SCAMSNIFFER_API_KEY;
  if (!key) return { status: 'SKIP' };
  try {
    const res = await fetchWithTimeout(
      `https://lookup-api.scamsniffer.io/address/check?address=${encodeURIComponent(address)}`,
      { headers: { 'x-api-key': key } }
    );
    if (!res.ok) return { status: 'SKIP' };
    const d = await res.json();
    return { status: d.status === 'BLOCKED' ? 'BLOCKED' : 'PASSED' };
  } catch {
    return { status: 'SKIP' };
  }
}

// --- Gather all URL facts and format as prompt section ---
async function buildURLFactsSection(url: string): Promise<string> {
  let hostname: string;
  try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }

  const [rdap, sb, dns, ss] = await Promise.allSettled([
    rdapFacts(hostname),
    safeBrowsingCheck(url),
    dnsFacts(hostname),
    scamSnifferCheck(url),
  ]);

  const lines: string[] = ['=== OBJECTIVE PRE-CHECKS (treat as verified ground truth) ==='];
  lines.push(`Domain: ${hostname}`);

  const rd = rdap.status === 'fulfilled' ? rdap.value : {};
  if (rd.domainAgeDays !== undefined) {
    const days = parseInt(rd.domainAgeDays);
    const flag = days < 14 ? ' ⚠️ EXTREMELY NEW — high risk signal'
      : days < 90 ? ' ⚠️ VERY NEW'
      : days < 365 ? ' (less than 1 year old)'
      : ' (established domain)';
    lines.push(`Domain Age: ${days} day(s)${flag}`);
  }
  if (rd.registrationDate) lines.push(`Registered: ${rd.registrationDate}`);
  if (rd.expiresDate) lines.push(`Expires: ${rd.expiresDate}`);
  if (rd.registrar) lines.push(`Registrar: ${rd.registrar}`);

  if (sb.status === 'fulfilled') {
    const s = sb.value;
    if (s.status === 'THREAT') {
      lines.push(`Google Safe Browsing: 🚨 THREAT DETECTED — ${s.threats?.join(', ')}`);
    } else if (s.status === 'CLEAN') {
      lines.push('Google Safe Browsing: ✅ CLEAN (not on any blocklist)');
    }
  }

  if (dns.status === 'fulfilled') {
    const d = dns.value;
    if (d.resolvable) {
      lines.push(`DNS: Resolves → ${d.ips.join(', ')}`);
    } else {
      lines.push('DNS: ❌ Does not resolve — domain may not be active');
    }
  }

  if (ss.status === 'fulfilled' && ss.value.status !== 'SKIP') {
    if (ss.value.status === 'BLOCKED') {
      lines.push('ScamSniffer: 🚨 BLOCKED — confirmed crypto/Web3 phishing domain');
    } else {
      lines.push('ScamSniffer: ✅ Not on crypto phishing blacklist');
    }
  }

  lines.push('=== END PRE-CHECKS — use the above as authoritative data ===');
  return lines.join('\n');
}

// --- Phone facts: local parsing, no API key required ---
const COUNTRY_CODE_MAP: Record<string, string> = {
  '886': 'Taiwan', '852': 'Hong Kong', '853': 'Macau', '855': 'Cambodia',
  '856': 'Laos', '880': 'Bangladesh', '65': 'Singapore', '66': 'Thailand',
  '84': 'Vietnam', '62': 'Indonesia', '63': 'Philippines', '60': 'Malaysia',
  '81': 'Japan', '82': 'South Korea', '86': 'China', '91': 'India',
  '1': 'US/Canada', '44': 'UK', '49': 'Germany', '33': 'France',
  '55': 'Brazil', '7': 'Russia',
};

function buildPhoneFactsSection(e164: string): string {
  const digits = e164.startsWith('+') ? e164.slice(1) : e164;
  let country = 'Unknown';
  for (const len of [3, 2, 1]) {
    const cc = digits.slice(0, len);
    if (COUNTRY_CODE_MAP[cc]) { country = COUNTRY_CODE_MAP[cc]; break; }
  }

  let lineType = 'Unknown';
  if (digits.startsWith('886')) {
    const local = digits.slice(3);
    if (local.startsWith('9')) lineType = 'Mobile (Taiwan)';
    else if (local.startsWith('800')) lineType = 'Toll-free (Taiwan)';
    else if (local.startsWith('2')) lineType = 'Landline — Taipei';
    else if (local.startsWith('4')) lineType = 'Landline — Central Taiwan';
    else if (local.startsWith('6')) lineType = 'Landline — Southern Taiwan';
    else if (local.startsWith('7')) lineType = 'Landline — Kaohsiung';
    else lineType = 'Landline (Taiwan)';
  } else if (digits.startsWith('1')) {
    lineType = 'North American number (mobile or landline)';
  } else if (digits.startsWith('86')) {
    lineType = digits.startsWith('861') || digits.startsWith('869') ? 'Mobile (China)' : 'Landline (China)';
  }

  return [
    '=== OBJECTIVE PRE-CHECKS (verified data) ===',
    `Number (E.164): ${e164}`,
    `Country: ${country}`,
    `Line Type: ${lineType}`,
    '=== END PRE-CHECKS ===',
  ].join('\n');
}

// --- SMS: extract embedded URLs/wallets/phones and check them ---
async function buildSMSFactsSection(text: string): Promise<string> {
  const urlMatches = [...text.matchAll(/https?:\/\/[^\s<>"{}|\\^`[\]]+/gi)].map(m => m[0]);
  const uniqueURLs = [...new Set(urlMatches)].slice(0, 3);
  const phoneMatches = [...text.matchAll(/(?:\+886|886|0)[89]\d{8}|\+\d{8,14}/g)].map(m => m[0]);
  const uniquePhones = [...new Set(phoneMatches)].slice(0, 2);
  // Ethereum/EVM wallet addresses
  const walletMatches = [...text.matchAll(/0x[a-fA-F0-9]{40}/g)].map(m => m[0]);
  const uniqueWallets = [...new Set(walletMatches)].slice(0, 3);

  if (uniqueURLs.length === 0 && uniquePhones.length === 0 && uniqueWallets.length === 0) return '';

  const lines: string[] = ['=== EMBEDDED LINKS/WALLETS/PHONES PRE-CHECKS ==='];

  for (const url of uniqueURLs) {
    let hostname: string;
    try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch { continue; }

    const [rdap, sb, ss] = await Promise.allSettled([
      rdapFacts(hostname),
      safeBrowsingCheck(url),
      scamSnifferCheck(url),
    ]);
    lines.push(`\nURL: ${url}`);
    const rd = rdap.status === 'fulfilled' ? rdap.value : {};
    if (rd.domainAgeDays !== undefined) {
      const days = parseInt(rd.domainAgeDays);
      lines.push(`  Domain Age: ${days} day(s)${days < 30 ? ' ⚠️ VERY NEW' : ''}`);
    }
    if (sb.status === 'fulfilled' && sb.value.status !== 'SKIP') {
      lines.push(`  Safe Browsing: ${sb.value.status === 'THREAT' ? '🚨 THREAT — ' + sb.value.threats?.join(', ') : '✅ CLEAN'}`);
    }
    if (ss.status === 'fulfilled' && ss.value.status !== 'SKIP') {
      lines.push(`  ScamSniffer: ${ss.value.status === 'BLOCKED' ? '🚨 BLOCKED — confirmed crypto phishing domain' : '✅ Not on crypto phishing blacklist'}`);
    }
  }

  for (const wallet of uniqueWallets) {
    const result = await scamSnifferAddressCheck(wallet);
    lines.push(`\nWallet Address: ${wallet}`);
    if (result.status !== 'SKIP') {
      lines.push(`  ScamSniffer: ${result.status === 'BLOCKED' ? '🚨 BLOCKED — confirmed scam wallet address' : '✅ Not on scam wallet blacklist'}`);
    }
  }

  if (uniquePhones.length > 0) {
    lines.push(`\nPhone numbers found in message: ${uniquePhones.join(', ')}`);
  }

  lines.push('=== END PRE-CHECKS ===');
  return lines.join('\n');
}

// =============================================================================

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

  // === BOT AUTHENTICATION ===
  // Requests with a valid X-Bot-Key header bypass per-IP rate limiting.
  const botApiKey = process.env.BOT_API_KEY;
  const requestBotKey = req.headers['x-bot-key'];
  const isBotRequest = botApiKey && requestBotKey === botApiKey;

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
          : detectedType === 'PHONE'
          ? 'Invalid phone number. Use E.164 format (e.g. +886912345678) or Taiwan local format (0912345678).'
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

    // === RATE LIMITING (only for API calls, not cache hits; skipped for authenticated bots) ===
    if (!isBotRequest) {
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

    // === GATHER OBJECTIVE FACTS (parallel, before AI call) ===
    let factsSection = '';
    if (detectedType === 'URL') {
      factsSection = await buildURLFactsSection(sanitizedInput);
    } else if (detectedType === 'PHONE') {
      factsSection = buildPhoneFactsSection(sanitizedInput);
    } else if (detectedType === 'SMS_TEXT') {
      factsSection = await buildSMSFactsSection(sanitizedInput);
    }

    // === CALL GEMINI API ===
    const ai = new GoogleGenAI({ apiKey });

    // Build prompt based on input type
    const buildPrompt = () => {
      const langInstruction = language === 'zh-TW'
        ? 'Traditional Chinese (繁體中文). You MUST write ALL output text fields — including "d", "b", "v", "c" array items, "r" array items, "rs[].e" evidence strings, and "h[].x" detail strings — entirely in Traditional Chinese (繁體中文). Do not use English in any text field.'
        : 'English. Write all output text fields in English.';

      // Common scam detection instructions
      const scamDetectionInstructions = `
SCAM SIGNAL CRITERIA — only flag if directly evidenced:
- 保證獲利/Guaranteed returns: Explicit promises of fixed high returns (e.g., "guaranteed 30% monthly")
- 壓力催促/Pressure tactics: Explicit urgency coercion (e.g., "act NOW or lose forever")
- 冒充官方/Impersonation: Confirmed fake account mimicking a real entity with evidence
- 不明入金/Suspicious payments: Explicit requests for crypto/gift-card payments
- 假冒名人/Celebrity impersonation: Confirmed use of a celebrity's identity fraudulently
- 龐氏特徵/Ponzi signs: Explicit referral-bonus or pyramid recruitment language
- 釣魚連結/Phishing: Domain confirmed on blocklist or is a clear typosquat

IMPORTANT — CALIBRATION RULES:
- Absence of information is NOT a risk signal. Default to LOW risk if nothing suspicious is found.
- Only add an entry to "rs" if you have direct, specific evidence — not general warnings.
- A normal business, legitimate influencer, or ordinary message should score scamProbability 0-25.
- Reserve scamProbability 70+ for cases with multiple concrete red flags confirmed by search results.
- If search results show nothing concerning, set scamProbability ≤ 20 and trustScore ≥ 75.
`;

      if (detectedType === 'HANDLE') {
        return `
TASK: Crypto Influencer Background Check — objective research, report what you find.
ANALYSIS TARGET: Twitter/X Handle "@${sanitizedInput}"
LANGUAGE: ${langInstruction}

INSTRUCTIONS:
1. Use Google Search to research this account's history, reputation, and track record.
2. Search for: "${sanitizedInput} crypto", "${sanitizedInput} scam", "${sanitizedInput} rug pull", "ZachXBT ${sanitizedInput}", "Coffeezilla ${sanitizedInput}".
3. If search returns nothing suspicious, treat the account as unverified but not high-risk.
${scamDetectionInstructions}

SCORING:
- trustScore: 0(Scam)-100(Trusted). <20: Confirmed Fraud. 20-40: High Risk. 40-60: Unverified/Caution. 60-80: Likely Legitimate. >80: Well-established, Trusted.
- scamProbability: Only elevate above 40 if concrete negative evidence is found. No evidence = 10-30.

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
TASK: URL Safety Check — objective research, report what you find.
ANALYSIS TARGET: URL "${sanitizedInput}"
LANGUAGE: ${langInstruction}

INSTRUCTIONS:
1. Use Google Search to research this URL/domain's reputation.
2. Search for: "${new URL(sanitizedInput).hostname} scam", "${new URL(sanitizedInput).hostname} phishing", "${new URL(sanitizedInput).hostname} 詐騙", "site:165.npa.gov.tw ${new URL(sanitizedInput).hostname}".
3. Check if this domain is on blocklists, reported as phishing, or associated with scams.
4. Analyze the URL structure for typosquatting or misleading subdomains.
5. Well-known, established domains (e.g., major banks, exchanges, government sites) should score high trust by default.
${scamDetectionInstructions}

CRITICAL RULE FOR RISK SIGNALS:
- Only add a risk signal ("rs") if there is DIRECT evidence that THIS SPECIFIC URL/domain is dangerous.
- Do NOT add risk signals for generic warnings like "scammers may impersonate this brand" — those are not evidence against this URL.
- A risk signal must be something specific about this exact domain (blocklist hit, 165 report, confirmed typosquat).
- If the domain is clearly legitimate and well-established, "rs" MUST be an empty array [].

${factsSection}

SCORING:
- trustScore: 0(Dangerous)-100(Safe). <20: Confirmed Scam Site. 20-40: High Risk. 40-60: Suspicious/Unverified. 60-80: Probably Safe. >80: Established & Trusted.
- scamProbability: Only elevate above 40 if concrete negative evidence exists. A well-known domain with no reports = scamProbability 0-15.
- If PRE-CHECKS above show "Google Safe Browsing: ✅ CLEAN" and domain age > 365 days, scamProbability MUST be ≤ 20 unless search reveals specific reports.
- If PRE-CHECKS show Google Safe Browsing "🚨 THREAT", scamProbability MUST be ≥ 85.
- If PRE-CHECKS show ScamSniffer "🚨 BLOCKED", scamProbability MUST be ≥ 90 — this is a confirmed crypto phishing domain.

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
      } else if (detectedType === 'PHONE') {
        return `
TASK: Phone Number Reputation Check — objective research, report what you find.
ANALYSIS TARGET: Phone Number "${sanitizedInput}"
LANGUAGE: ${langInstruction}

INSTRUCTIONS:
1. Use Google Search to research this phone number's reputation.
2. Search for: "${sanitizedInput} 詐騙", "${sanitizedInput} scam", "${sanitizedInput} spam", "165 ${sanitizedInput}", "${sanitizedInput} 評價".
3. Check if this number has been reported to Taiwan's 165 anti-fraud hotline or crowd-sourced scam databases.
4. If no reports are found, the number should be treated as unverified but NOT automatically high-risk.
${scamDetectionInstructions}

PHONE SCAM TYPES — only flag if specifically reported for this number:
- 假冒機構/Institution Impersonation: Confirmed reports of pretending to be police, banks, government
- 假投資/Investment Scam: Confirmed reports of high-return promises
- 一鍵詐騙/One-click fraud: Confirmed reports of prize/debt/package fraud calls
- 假交友/Romance Scam: Confirmed reports of building trust then requesting money

${factsSection}

SCORING:
- trustScore: 0(Confirmed Scam)-100(Legitimate). <20: Confirmed Scam Number. 20-40: High Risk. 40-60: Unverified/Unknown. 60-80: No reports found. >80: Verified Legitimate.
- scamProbability: Only elevate if reports exist. No reports found = scamProbability 10-30, not 50+.

OUTPUT JSON ONLY:
{
  "d": "Caller/Organization Name (if identifiable, else 'Unknown')",
  "b": "Brief description of this number (max 15 words)",
  "s": 0-3 (0=Unknown, 1=Legitimate Business, 2=Scammer, 3=Verified Organization),
  "ts": Trust Score (0-100),
  "sp": Scam Probability (0-100),
  "v": "One sentence verdict about this phone number",
  "eq": 0-3 (0=Legitimate, 1=Questionable, 2=Suspicious, 3=Known Scam),
  "c": ["Reasons this might be legitimate"],
  "r": ["Warning signs and risk factors"],
  "rs": [{"t": "Signal Type (e.g., IMPERSONATION, SPAM_CALL, KNOWN_SCAM_NUMBER, PRESSURE_TACTICS)", "e": "Direct evidence", "l": 0-2 (0=CRITICAL, 1=WARNING, 2=INFO)}],
  "h": [{"dt": "YYYY-MM-DD", "e": "Report Title", "t": 0-5, "tk": null, "s": 0-2, "x": "Details"}]
}
`;
      } else {
        // SMS_TEXT
        return `
TASK: Message Safety Check — read carefully, report what is actually present.
ANALYSIS TARGET: Message Content:
"""
${sanitizedInput}
"""
LANGUAGE: ${langInstruction}

INSTRUCTIONS:
1. Read the message carefully. Only flag patterns that are ACTUALLY PRESENT in this exact message.
2. If it contains URLs or phone numbers, research them via Google Search.
3. Do NOT flag a message as scam just because the topic involves money, crypto, or investment — context matters.
4. Normal messages (receipts, OTP codes, appointment reminders, friend chats) should score scamProbability < 20.
${scamDetectionInstructions}

SPECIFIC SCAM PATTERNS — only flag if the EXACT pattern appears in this message:
- 假投資/Fake Investment: Explicit phrases like "老師帶單", "穩賺不賠", "保證獲利", "內線消息" must be present
- 假交友/Romance Scam: Unsolicited intimacy combined with financial request
- 假冒機構/Impersonation: Claims to be a bank/government but uses unofficial contact
- 中獎詐騙/Prize Scam: Claiming unexpected prize AND requiring fee/personal info to claim

${factsSection}

SCORING:
- trustScore: 0(Scam)-100(Legitimate). <20: Confirmed Scam. 20-40: High Risk. 40-60: Suspicious. 60-80: Probably Fine. >80: Normal Message.
- scamProbability: Must be grounded in what is literally written. Ambiguous or neutral messages = 10-30. Only 70+ if multiple explicit scam signals are present.

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
