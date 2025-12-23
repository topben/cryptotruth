import { TwitterApi, ApiResponseError } from 'twitter-api-v2';
import { list, put } from '@vercel/blob';

// Configuration
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_HANDLE_LENGTH = 50;
const DEFAULT_MAX_RESULTS = 50;

// Types
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

interface TwitterSearchResponse {
  tweets: TweetData[];
  user?: {
    id: string;
    name: string;
    username: string;
    public_metrics?: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
    };
  };
  source: 'cache' | 'api';
  cachedAt?: number;
  rateLimit?: {
    remaining: number;
    reset: number;
  };
}

/**
 * Sanitize handle input - remove @ prefix and validate format
 */
const sanitizeHandle = (handle: string): string | null => {
  if (!handle || typeof handle !== 'string') return null;

  let sanitized = handle.trim().replace(/^@/, '');

  if (sanitized.length === 0 || sanitized.length > MAX_HANDLE_LENGTH) return null;
  if (!/^[a-zA-Z0-9_]+$/.test(sanitized)) return null;

  return sanitized.toLowerCase();
};

/**
 * Build cache file path for Vercel Blob
 */
const buildCachePath = (handle: string, type: 'timeline' | 'search'): string => {
  return `twitter-cache/${type}/${handle.toLowerCase()}.json`;
};

/**
 * Check if cached data exists and is still valid
 */
const getCachedData = async (handle: string, type: 'timeline' | 'search') => {
  try {
    const cachePath = buildCachePath(handle, type);
    const { blobs } = await list({ prefix: cachePath });

    if (blobs.length === 0) {
      return null;
    }

    const blob = blobs[0];
    const uploadedAt = new Date(blob.uploadedAt).getTime();
    const age = Date.now() - uploadedAt;

    if (age > CACHE_DURATION_MS) {
      console.log(`Twitter cache expired for ${handle} (age: ${Math.round(age / 1000 / 60)} minutes)`);
      return null;
    }

    const response = await fetch(blob.url);
    const data = await response.json();

    console.log(`Twitter cache hit for ${handle} (age: ${Math.round(age / 1000 / 60)} minutes)`);
    return {
      data,
      cachedAt: uploadedAt
    };
  } catch (error) {
    console.error('Error reading Twitter cache:', error);
    return null;
  }
};

/**
 * Save data to Vercel Blob cache
 */
const setCachedData = async (handle: string, type: 'timeline' | 'search', data: any) => {
  try {
    const cachePath = buildCachePath(handle, type);
    await put(cachePath, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json'
    });
    console.log(`Cached Twitter data for ${handle}`);
  } catch (error) {
    console.error('Error writing Twitter cache:', error);
  }
};

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key configuration
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    return res.status(500).json({ error: 'Server configuration error: Twitter Bearer Token missing' });
  }

  try {
    const { username: rawUsername, query, maxResults = DEFAULT_MAX_RESULTS, forceRefresh } = req.body;

    // Validate inputs
    if (!rawUsername && !query) {
      return res.status(400).json({ error: 'Either username or query is required' });
    }

    // Initialize Twitter client with Bearer Token (App-only auth)
    const client = new TwitterApi(bearerToken);

    let responseData: TwitterSearchResponse;

    if (rawUsername) {
      // === USER TIMELINE MODE ===
      const username = sanitizeHandle(rawUsername);
      if (!username) {
        return res.status(400).json({
          error: 'Invalid username format. Use alphanumeric characters and underscores only.'
        });
      }

      // Check cache first
      if (!forceRefresh) {
        const cached = await getCachedData(username, 'timeline');
        if (cached) {
          return res.status(200).json({
            ...cached.data,
            source: 'cache',
            cachedAt: cached.cachedAt
          } as TwitterSearchResponse);
        }
      }

      // Fetch user info first
      const userResponse = await client.v2.userByUsername(username, {
        'user.fields': ['public_metrics', 'description', 'profile_image_url']
      });

      if (!userResponse.data) {
        return res.status(404).json({ error: `User @${username} not found` });
      }

      const user = userResponse.data;

      // Fetch user timeline
      const timelineResponse = await client.v2.userTimeline(user.id, {
        max_results: Math.min(maxResults, 100), // API limit is 100
        expansions: ['attachments.media_keys', 'referenced_tweets.id'],
        'tweet.fields': ['created_at', 'public_metrics', 'text', 'entities'],
        'media.fields': ['url', 'preview_image_url'],
      });

      const tweets: TweetData[] = timelineResponse.data?.data?.map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics
      })) || [];

      responseData = {
        tweets,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          public_metrics: user.public_metrics
        },
        source: 'api'
      };

      // Cache the result (async)
      setCachedData(username, 'timeline', responseData);

    } else {
      // === SEARCH MODE ===
      // Check cache for query
      const queryHash = Buffer.from(query).toString('base64').slice(0, 32);

      if (!forceRefresh) {
        const cached = await getCachedData(queryHash, 'search');
        if (cached) {
          return res.status(200).json({
            ...cached.data,
            source: 'cache',
            cachedAt: cached.cachedAt
          } as TwitterSearchResponse);
        }
      }

      // Execute search
      const searchResponse = await client.v2.search(query, {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': ['created_at', 'public_metrics', 'text', 'author_id'],
      });

      const tweets: TweetData[] = searchResponse.data?.data?.map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics
      })) || [];

      responseData = {
        tweets,
        source: 'api'
      };

      // Cache the result (async)
      setCachedData(queryHash, 'search', responseData);
    }

    return res.status(200).json(responseData);

  } catch (error: any) {
    console.error('Twitter API Error:', error);

    // Handle Twitter API rate limiting
    if (error instanceof ApiResponseError && error.rateLimitError) {
      const resetTime = error.rateLimit?.reset || Math.floor(Date.now() / 1000) + 900;
      return res.status(429).json({
        error: 'Twitter rate limit exceeded',
        reset: resetTime,
        retryAfter: `${Math.ceil((resetTime - Date.now() / 1000) / 60)} minutes`
      });
    }

    // Handle other Twitter API errors
    if (error instanceof ApiResponseError) {
      return res.status(error.code || 500).json({
        error: error.message || 'Twitter API error'
      });
    }

    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
