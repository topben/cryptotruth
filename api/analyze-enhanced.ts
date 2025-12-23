import { GoogleGenAI, Type } from "@google/genai";
import { TwitterApi } from 'twitter-api-v2';
import { list, put } from "@vercel/blob";

// Configuration
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_HANDLE_LENGTH = 50;
const ALLOWED_LANGUAGES = ['en', 'zh-TW'];
const DEFAULT_TWEET_COUNT = 50;

// Regex patterns for crypto wallet addresses
const WALLET_PATTERNS = {
  ETH: /0x[a-fA-F0-9]{40}/g,
  SOL: /[1-9A-HJ-NP-Za-km-z]{32,44}/g, // Base58 Solana addresses
  BTC: /(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}/g
};

// High-pressure shill phrases to detect
const SHILL_PATTERNS = [
  /100x\s*(soon|potential|guaranteed)/i,
  /don'?t\s*miss\s*(out|this)/i,
  /unlimited\s*potential/i,
  /guaranteed\s*(returns?|profit|gains?)/i,
  /easy\s*(money|gains?|profit)/i,
  /last\s*chance/i,
  /moon\s*(soon|imminent)/i,
  /once\s*in\s*a\s*lifetime/i,
  /financial\s*freedom/i,
  /early\s*(bird|investor)/i,
  /massive\s*(gains?|returns?|pump)/i,
  /next\s*(100x|1000x)/i,
  /generational\s*wealth/i
];

// Disclosure patterns (to identify proper ad disclosure)
const DISCLOSURE_PATTERNS = [
  /#ad\b/i,
  /#sponsored\b/i,
  /#paid\b/i,
  /\bad\b/i,
  /sponsored\s*(content|post)?/i,
  /partnership/i,
  /paid\s*promotion/i,
  /nfa|not\s*financial\s*advice/i
];

interface TweetData {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

interface EngagementAudit {
  averageLikes: number;
  averageRetweets: number;
  averageReplies: number;
  engagementRate: number;
  ghostFollowerRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  analysisNote: string;
}

interface ShillAnalysis {
  totalShillTweets: number;
  undisclosedPromos: number;
  disclosedPromos: number;
  flaggedTweets: {
    text: string;
    patterns: string[];
    hasDisclosure: boolean;
  }[];
}

interface WalletExtraction {
  ETH: string[];
  SOL: string[];
  BTC: string[];
}

/**
 * Sanitize handle input
 */
const sanitizeHandle = (handle: string): string | null => {
  if (!handle || typeof handle !== 'string') return null;
  let sanitized = handle.trim().replace(/^@/, '');
  if (sanitized.length === 0 || sanitized.length > MAX_HANDLE_LENGTH) return null;
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
 * Hash IP for privacy
 */
const hashIP = (ip: string): string => {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

/**
 * Check rate limit
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

      if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
        const newData = { windowStart: now, count: 1 };
        await put(rateLimitPath, JSON.stringify(newData), {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'application/json'
        });
        return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
      }

      if (data.count >= MAX_REQUESTS_PER_WINDOW) {
        return { allowed: false, remaining: 0 };
      }

      const newData = { windowStart: data.windowStart, count: data.count + 1 };
      await put(rateLimitPath, JSON.stringify(newData), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json'
      });
      return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - newData.count };
    }

    const newData = { windowStart: now, count: 1 };
    await put(rateLimitPath, JSON.stringify(newData), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json'
    });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };

  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW };
  }
};

/**
 * Build cache path
 */
const buildCachePath = (handle: string, language: string): string => {
  return `cache-enhanced/${handle.toLowerCase()}-${language}.json`;
};

/**
 * Get cached analysis
 */
const getCachedAnalysis = async (handle: string, language: string) => {
  try {
    const cachePath = buildCachePath(handle, language);
    const { blobs } = await list({ prefix: cachePath });

    if (blobs.length === 0) return null;

    const blob = blobs[0];
    const uploadedAt = new Date(blob.uploadedAt).getTime();
    const age = Date.now() - uploadedAt;

    if (age > CACHE_DURATION_MS) {
      console.log(`Enhanced cache expired for ${handle}`);
      return null;
    }

    const response = await fetch(blob.url);
    const data = await response.json();

    console.log(`Enhanced cache hit for ${handle}`);
    return { data, cachedAt: uploadedAt };
  } catch (error) {
    console.error('Error reading enhanced cache:', error);
    return null;
  }
};

/**
 * Save to cache
 */
const setCachedAnalysis = async (handle: string, language: string, data: any) => {
  try {
    const cachePath = buildCachePath(handle, language);
    await put(cachePath, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json'
    });
    console.log(`Cached enhanced analysis for ${handle}`);
  } catch (error) {
    console.error('Error writing enhanced cache:', error);
  }
};

/**
 * Extract wallet addresses from tweets
 */
const extractWalletAddresses = (tweets: TweetData[]): WalletExtraction => {
  const wallets: WalletExtraction = { ETH: [], SOL: [], BTC: [] };
  const allText = tweets.map(t => t.text).join(' ');

  // Extract ETH addresses
  const ethMatches = allText.match(WALLET_PATTERNS.ETH) || [];
  wallets.ETH = [...new Set(ethMatches)];

  // Extract BTC addresses
  const btcMatches = allText.match(WALLET_PATTERNS.BTC) || [];
  wallets.BTC = [...new Set(btcMatches)];

  // Extract SOL addresses (more careful to avoid false positives)
  const solMatches = allText.match(WALLET_PATTERNS.SOL) || [];
  // Filter to likely SOL addresses (32-44 chars, not matching other patterns)
  wallets.SOL = [...new Set(solMatches.filter(addr =>
    addr.length >= 32 &&
    addr.length <= 44 &&
    !wallets.ETH.includes(addr) &&
    !wallets.BTC.includes(addr)
  ))].slice(0, 5); // Limit to 5 to avoid noise

  return wallets;
};

/**
 * Analyze engagement quality
 */
const analyzeEngagement = (tweets: TweetData[], followersCount: number): EngagementAudit => {
  if (tweets.length === 0) {
    return {
      averageLikes: 0,
      averageRetweets: 0,
      averageReplies: 0,
      engagementRate: 0,
      ghostFollowerRisk: 'HIGH',
      analysisNote: 'No tweets available for analysis'
    };
  }

  const totalLikes = tweets.reduce((sum, t) => sum + (t.public_metrics?.like_count || 0), 0);
  const totalRetweets = tweets.reduce((sum, t) => sum + (t.public_metrics?.retweet_count || 0), 0);
  const totalReplies = tweets.reduce((sum, t) => sum + (t.public_metrics?.reply_count || 0), 0);

  const avgLikes = totalLikes / tweets.length;
  const avgRetweets = totalRetweets / tweets.length;
  const avgReplies = totalReplies / tweets.length;

  // Calculate engagement rate (total engagements / followers / tweets * 100)
  const totalEngagements = totalLikes + totalRetweets + totalReplies;
  const engagementRate = followersCount > 0
    ? (totalEngagements / followersCount / tweets.length) * 100
    : 0;

  // Determine ghost follower risk
  // Typical organic engagement rate is 1-3% for crypto accounts
  let ghostFollowerRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  let analysisNote: string;

  if (engagementRate >= 1) {
    ghostFollowerRisk = 'LOW';
    analysisNote = `Healthy engagement rate (${engagementRate.toFixed(2)}%). Followers appear organic.`;
  } else if (engagementRate >= 0.3) {
    ghostFollowerRisk = 'MEDIUM';
    analysisNote = `Below average engagement (${engagementRate.toFixed(2)}%). Some followers may be inactive or purchased.`;
  } else {
    ghostFollowerRisk = 'HIGH';
    analysisNote = `Very low engagement (${engagementRate.toFixed(3)}%). High likelihood of purchased/bot followers.`;
  }

  // Special case: very high followers with almost no engagement
  if (followersCount > 100000 && avgLikes < 50) {
    ghostFollowerRisk = 'HIGH';
    analysisNote = `ALERT: ${followersCount.toLocaleString()} followers but averaging only ${avgLikes.toFixed(0)} likes/tweet. Strong ghost follower signal.`;
  }

  return {
    averageLikes: Math.round(avgLikes),
    averageRetweets: Math.round(avgRetweets),
    averageReplies: Math.round(avgReplies),
    engagementRate: parseFloat(engagementRate.toFixed(3)),
    ghostFollowerRisk,
    analysisNote
  };
};

/**
 * Analyze tweets for shill patterns
 */
const analyzeShillPatterns = (tweets: TweetData[]): ShillAnalysis => {
  const flaggedTweets: ShillAnalysis['flaggedTweets'] = [];
  let undisclosedPromos = 0;
  let disclosedPromos = 0;

  for (const tweet of tweets) {
    const matchedPatterns: string[] = [];

    // Check for shill patterns
    for (const pattern of SHILL_PATTERNS) {
      if (pattern.test(tweet.text)) {
        matchedPatterns.push(pattern.source);
      }
    }

    if (matchedPatterns.length > 0) {
      // Check if there's a disclosure
      const hasDisclosure = DISCLOSURE_PATTERNS.some(p => p.test(tweet.text));

      if (hasDisclosure) {
        disclosedPromos++;
      } else {
        undisclosedPromos++;
      }

      flaggedTweets.push({
        text: tweet.text.slice(0, 200) + (tweet.text.length > 200 ? '...' : ''),
        patterns: matchedPatterns,
        hasDisclosure
      });
    }
  }

  return {
    totalShillTweets: flaggedTweets.length,
    undisclosedPromos,
    disclosedPromos,
    flaggedTweets: flaggedTweets.slice(0, 10) // Limit to top 10
  };
};

/**
 * Format tweets for prompt (summarized)
 */
const formatTweetsForPrompt = (tweets: TweetData[], limit: number = 20): string => {
  return tweets.slice(0, limit).map((t, i) => {
    const metrics = t.public_metrics;
    const engagement = metrics
      ? `[❤️${metrics.like_count} 🔄${metrics.retweet_count} 💬${metrics.reply_count}]`
      : '';
    return `${i + 1}. ${t.text.slice(0, 280)} ${engagement}`;
  }).join('\n\n');
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!geminiApiKey) {
    return res.status(500).json({ error: 'Server configuration error: Gemini API Key missing' });
  }

  try {
    const { handle: rawHandle, language: rawLanguage, forceRefresh } = req.body;

    // Validate handle
    const handle = sanitizeHandle(rawHandle);
    if (!handle) {
      return res.status(400).json({
        error: 'Invalid handle format. Use alphanumeric characters and underscores only.'
      });
    }

    const language = ALLOWED_LANGUAGES.includes(rawLanguage) ? rawLanguage : 'en';

    // Check cache
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

    // Rate limiting
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

    // === PHASE 1: Fetch Twitter Data ===
    let timelineData = '';
    let controversyData = '';
    let displayName = handle;
    let bioSummary = '';
    let followersCount = 0;
    let timelineTweets: TweetData[] = [];
    let engagementAudit: EngagementAudit | null = null;
    let shillAnalysis: ShillAnalysis | null = null;
    let walletAddresses: WalletExtraction | null = null;

    if (twitterBearerToken) {
      try {
        const twitterClient = new TwitterApi(twitterBearerToken);

        // Fetch user info
        const userResponse = await twitterClient.v2.userByUsername(handle, {
          'user.fields': ['public_metrics', 'description', 'name']
        });

        if (userResponse.data) {
          const user = userResponse.data;
          displayName = user.name;
          bioSummary = (user as any).description || '';
          followersCount = user.public_metrics?.followers_count || 0;

          // Fetch timeline
          const timelineResponse = await twitterClient.v2.userTimeline(user.id, {
            max_results: DEFAULT_TWEET_COUNT,
            'tweet.fields': ['created_at', 'public_metrics', 'text']
          });

          timelineTweets = timelineResponse.data?.data?.map((tweet: any) => ({
            id: tweet.id,
            text: tweet.text,
            created_at: tweet.created_at,
            public_metrics: tweet.public_metrics
          })) || [];

          if (timelineTweets.length > 0) {
            timelineData = formatTweetsForPrompt(timelineTweets);
            engagementAudit = analyzeEngagement(timelineTweets, followersCount);
            shillAnalysis = analyzeShillPatterns(timelineTweets);
            walletAddresses = extractWalletAddresses(timelineTweets);
          }
        }

        // Search for controversy mentions
        const controversyQueries = [
          `"${handle}" scam`,
          `"${handle}" rug pull`,
          `"${handle}" fraud`
        ];

        const controversyTweets: TweetData[] = [];
        for (const query of controversyQueries) {
          try {
            const searchResponse = await twitterClient.v2.search(query, {
              max_results: 10,
              'tweet.fields': ['created_at', 'public_metrics', 'text']
            });
            if (searchResponse.data?.data) {
              controversyTweets.push(...searchResponse.data.data.map((t: any) => ({
                id: t.id,
                text: t.text,
                created_at: t.created_at,
                public_metrics: t.public_metrics
              })));
            }
          } catch (searchError) {
            console.warn(`Search failed for query: ${query}`, searchError);
          }
        }

        if (controversyTweets.length > 0) {
          controversyData = formatTweetsForPrompt(controversyTweets, 15);
        }

      } catch (twitterError) {
        console.warn('Twitter API error (continuing without Twitter data):', twitterError);
      }
    }

    // === PHASE 2: Build Enhanced Prompt ===
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    const langInstruction = language === 'zh-TW'
      ? "Output fields 'bioSummary', 'verdict', 'description', 'details' in Traditional Chinese (繁體中文)."
      : "Output all text fields in English.";

    // Build data context section
    let dataContext = '';
    if (timelineData) {
      dataContext += `\n## DIRECT TWEETS (${timelineTweets.length} recent tweets):\n${timelineData}\n`;
    }
    if (controversyData) {
      dataContext += `\n## COMMUNITY MENTIONS & CONTROVERSY SEARCH:\n${controversyData}\n`;
    }
    if (engagementAudit) {
      dataContext += `\n## ENGAGEMENT AUDIT:\n`;
      dataContext += `- Followers: ${followersCount.toLocaleString()}\n`;
      dataContext += `- Avg Likes: ${engagementAudit.averageLikes}\n`;
      dataContext += `- Avg Retweets: ${engagementAudit.averageRetweets}\n`;
      dataContext += `- Engagement Rate: ${engagementAudit.engagementRate}%\n`;
      dataContext += `- Ghost Follower Risk: ${engagementAudit.ghostFollowerRisk}\n`;
      dataContext += `- Analysis: ${engagementAudit.analysisNote}\n`;
    }
    if (shillAnalysis && shillAnalysis.totalShillTweets > 0) {
      dataContext += `\n## SHILL PATTERN DETECTION:\n`;
      dataContext += `- Total promotional tweets detected: ${shillAnalysis.totalShillTweets}\n`;
      dataContext += `- Undisclosed promotions: ${shillAnalysis.undisclosedPromos}\n`;
      dataContext += `- Properly disclosed: ${shillAnalysis.disclosedPromos}\n`;
      if (shillAnalysis.flaggedTweets.length > 0) {
        dataContext += `- Sample flagged tweets:\n`;
        shillAnalysis.flaggedTweets.slice(0, 3).forEach((t, i) => {
          dataContext += `  ${i + 1}. "${t.text}" [Patterns: ${t.patterns.join(', ')}] [Disclosed: ${t.hasDisclosure ? 'Yes' : 'NO'}]\n`;
        });
      }
    }
    if (walletAddresses) {
      const hasWallets = walletAddresses.ETH.length > 0 || walletAddresses.SOL.length > 0 || walletAddresses.BTC.length > 0;
      if (hasWallets) {
        dataContext += `\n## ON-CHAIN WALLET ADDRESSES FOUND:\n`;
        if (walletAddresses.ETH.length > 0) {
          dataContext += `- ETH: ${walletAddresses.ETH.join(', ')}\n`;
        }
        if (walletAddresses.SOL.length > 0) {
          dataContext += `- SOL: ${walletAddresses.SOL.join(', ')}\n`;
        }
        if (walletAddresses.BTC.length > 0) {
          dataContext += `- BTC: ${walletAddresses.BTC.join(', ')}\n`;
        }
      }
    }

    const prompt = `
Analyze Crypto KOL: "${handle}"
Display Name: ${displayName}
Bio: ${bioSummary || 'Not available'}
${langInstruction}

${dataContext ? `\n=== REAL-TIME DATA FROM TWITTER/X ===\n${dataContext}` : ''}

=== REQUIRED WEB SEARCHES ===
Use exact queries to find investigative reports:
1. "ZachXBT ${handle}" - On-chain investigative reports
2. "Coffeezilla ${handle}" - Video exposés
3. "Reddit r/CryptoCurrency ${handle}" - Community warnings or scam threads
4. "${handle} crypto scam allegations"
5. "${handle} rug pull history"

=== VERIFICATION TASKS ===
1. **Engagement Quality**: ${engagementAudit
  ? `Based on the audit data above (${engagementAudit.ghostFollowerRisk} ghost follower risk), verify if engagement seems organic.`
  : 'Search for follower-to-engagement ratio analysis.'}
2. **Shill Detection**: ${shillAnalysis && shillAnalysis.undisclosedPromos > 0
  ? `We detected ${shillAnalysis.undisclosedPromos} undisclosed promotional tweets. Factor this into the trust score.`
  : 'Look for patterns of undisclosed paid promotions.'}
3. **On-Chain Verification**: ${walletAddresses && (walletAddresses.ETH.length > 0 || walletAddresses.SOL.length > 0)
  ? `Wallet addresses found: ${[...walletAddresses.ETH, ...walletAddresses.SOL].slice(0, 3).join(', ')}. Note these for user verification.`
  : 'Search for any wallet addresses associated with this KOL.'}

=== SCORE LOGIC ===
- 85-100: TRUSTED. Transparent about ads, high organic engagement, praised by investigators.
- 60-84: MIXED. Some failed calls or aggressive marketing, but no theft or rug pulls.
- 30-59: RISKY. Frequent shilling, undisclosed ads, or significant backlash.
- 0-29: SCAM ALERT. Confirmed rug pulls, exit scams, or documented fraud.

Provide a data-driven 'verdict' and 'trustScore' based on the ratio of wins vs controversies/scams.
`;

    const analysisSchema = {
      type: Type.OBJECT,
      properties: {
        displayName: { type: Type.STRING },
        bioSummary: { type: Type.STRING },
        trustScore: { type: Type.NUMBER, description: "0-100 based on reputation" },
        totalWins: { type: Type.NUMBER },
        totalLosses: { type: Type.NUMBER },
        followersCount: { type: Type.STRING },
        verdict: { type: Type.STRING, description: "One-sentence verdict" },
        engagementQuality: {
          type: Type.STRING,
          enum: ["ORGANIC", "MIXED", "SUSPICIOUS", "BOT_HEAVY"],
          description: "Assessment of follower/engagement authenticity"
        },
        history: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              date: { type: Type.STRING },
              description: { type: Type.STRING },
              type: {
                type: Type.STRING,
                enum: ["PREDICTION_WIN", "PREDICTION_LOSS", "CONTROVERSY", "NEUTRAL_NEWS"]
              },
              token: { type: Type.STRING, nullable: true },
              sentiment: { type: Type.STRING, enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"] },
              details: { type: Type.STRING },
              sourceUrl: { type: Type.STRING, nullable: true }
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

    // Extract grounding sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map((chunk: any) => chunk.web ? { title: chunk.web.title, url: chunk.web.uri } : null)
      .filter((s: any) => s !== null);

    // Compile wallet addresses for response
    const allWallets: string[] = [];
    if (walletAddresses) {
      allWallets.push(...walletAddresses.ETH.map(w => `ETH:${w}`));
      allWallets.push(...walletAddresses.SOL.map(w => `SOL:${w}`));
      allWallets.push(...walletAddresses.BTC.map(w => `BTC:${w}`));
    }

    const result = {
      ...data,
      handle,
      sources,
      // Enhanced data
      engagementAudit: engagementAudit || undefined,
      shillAnalysis: shillAnalysis ? {
        totalShillTweets: shillAnalysis.totalShillTweets,
        undisclosedPromos: shillAnalysis.undisclosedPromos,
        disclosedPromos: shillAnalysis.disclosedPromos
      } : undefined,
      walletAddresses: allWallets.length > 0 ? allWallets : undefined,
      lastAnalyzed: new Date().toISOString()
    };

    // Cache the result
    setCachedAnalysis(handle, language, result);

    return res.status(200).json({
      ...result,
      source: 'api'
    });

  } catch (error: any) {
    console.error("Enhanced Analysis API Error:", error);
    const status = error.status || (error.message?.includes('429') ? 429 : 500);
    return res.status(status).json({ error: error.message || 'An unexpected error occurred' });
  }
}
