const GOGOLOOK_BASE_URL = 'https://hljaj2f6gf.execute-api.ap-northeast-1.amazonaws.com/prod';

const getApiKey = () => process.env.GOGOLOOK_API_KEY;

export interface NumberCheckResult {
  data: {
    business_categories: string[];
    name: string | null;
    region: string;
    spam_category: string | null;
  };
  query_id: string;
}

/**
 * Check URL reputation via ScamAdviser (cache-first strategy).
 * Returns null if API key is missing or both endpoints fail.
 */
export const checkUrl = async (url: string): Promise<any | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' };
  const body = JSON.stringify({ url });

  try {
    // Try cache first (fast path)
    const cacheRes = await fetch(`${GOGOLOOK_BASE_URL}/url-check-cache`, {
      method: 'POST',
      headers,
      body,
    });

    if (cacheRes.ok) {
      return await cacheRes.json();
    }

    // 404 = no cache, 503 = stale cache — fall through to full check
    if (cacheRes.status === 404 || cacheRes.status === 503) {
      const fullRes = await fetch(`${GOGOLOOK_BASE_URL}/url-check`, {
        method: 'POST',
        headers,
        body,
      });

      if (fullRes.ok) {
        return await fullRes.json();
      }

      // 503 on full check still contains stale data — use it
      if (fullRes.status === 503) {
        return await fullRes.json().catch(() => null);
      }
    }
  } catch (error) {
    console.error('Gogolook URL check error:', error);
  }

  return null;
};

/**
 * Check phone number reputation via Whoscall.
 */
export const checkNumber = async (
  country: string,
  number: string
): Promise<NumberCheckResult | null> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `${GOGOLOOK_BASE_URL}/number-check/${country}/${encodeURIComponent(number)}`,
      { headers: { 'x-api-key': apiKey } }
    );
    if (res.ok) return await res.json();
  } catch (error) {
    console.error('Gogolook number check error:', error);
  }

  return null;
};

/**
 * Extract unique HTTP/HTTPS URLs from a text string (max 3).
 */
export const extractUrls = (text: string): string[] => {
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  return [...new Set(text.match(urlPattern) || [])].slice(0, 3);
};

const COUNTRY_CODE_MAP: Record<string, string> = {
  '886': 'TW', '1': 'US', '44': 'GB', '81': 'JP', '82': 'KR',
  '60': 'MY', '63': 'PH', '65': 'SG', '852': 'HK', '66': 'TH', '55': 'BR',
};

/**
 * Extract phone numbers from text. Returns [{country, number}] pairs in E.164 format.
 * Supports international (+countrycode) and Taiwan local (09xx) formats. Max 2 results.
 */
export const extractPhoneNumbers = (
  text: string
): Array<{ country: string; number: string }> => {
  const results: Array<{ country: string; number: string }> = [];
  const seen = new Set<string>();

  // International E.164: +[country_code][number]
  const e164Pattern = /\+(\d{1,3})[\s-]?(\d[\d\s-]{6,14}\d)/g;
  let match;
  while ((match = e164Pattern.exec(text)) !== null) {
    const number = `+${match[1]}${match[2].replace(/[\s-]/g, '')}`;
    if (!seen.has(number)) {
      seen.add(number);
      results.push({ country: COUNTRY_CODE_MAP[match[1]] || 'TW', number });
    }
  }

  // Taiwan local mobile: 09xxxxxxxx (10 digits)
  const twPattern = /09\d{8}/g;
  while ((match = twPattern.exec(text)) !== null) {
    const number = `+886${match[0].slice(1)}`;
    if (!seen.has(number)) {
      seen.add(number);
      results.push({ country: 'TW', number });
    }
  }

  return results.slice(0, 2);
};

/**
 * Serialize ScamAdviser result to a concise string for Gemini prompt injection.
 */
export const summarizeUrlResult = (url: string, result: any): string => {
  if (!result) return '';
  const lines = [`SCAMADVISER DATA for "${url}":`];
  if (result.trust_score !== undefined) lines.push(`- Trust Score: ${result.trust_score}/100`);
  if (result.domain_age !== undefined) lines.push(`- Domain Age: ${result.domain_age}`);
  if (result.country) lines.push(`- Registrant Country: ${result.country}`);
  if (result.on_blocklists !== undefined) lines.push(`- On Blocklists: ${result.on_blocklists}`);
  if (result.ssl_valid !== undefined) lines.push(`- SSL Valid: ${result.ssl_valid}`);
  if (result.phishing !== undefined) lines.push(`- Phishing Flag: ${result.phishing}`);
  if (result.malware !== undefined) lines.push(`- Malware Flag: ${result.malware}`);
  // Fallback: if none of the known fields matched, include raw (truncated)
  if (lines.length === 1) {
    const raw = JSON.stringify(result);
    lines.push(raw.length > 800 ? raw.slice(0, 800) + '...' : raw);
  }
  return lines.join('\n');
};

/**
 * Serialize Whoscall result to a concise string for Gemini prompt injection.
 */
export const summarizeNumberResult = (number: string, result: NumberCheckResult): string => {
  const lines = [`WHOSCALL DATA for "${number}":`];
  if (result.data.name) lines.push(`- Identified As: ${result.data.name}`);
  if (result.data.spam_category) lines.push(`- SPAM CATEGORY: ${result.data.spam_category}`);
  if (result.data.business_categories?.length)
    lines.push(`- Business Type: ${result.data.business_categories.join(', ')}`);
  if (!result.data.name && !result.data.spam_category)
    lines.push('- No known information found');
  return lines.join('\n');
};
