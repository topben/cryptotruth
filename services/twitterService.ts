/**
 * Twitter/X API Service
 * Frontend helper for fetching KOL tweets and search results
 */

export interface TweetData {
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

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

export interface TwitterSearchResult {
  tweets: TweetData[];
  user?: TwitterUser;
  source: 'cache' | 'api';
  cachedAt?: number;
  error?: string;
}

interface TwitterApiOptions {
  maxResults?: number;
  forceRefresh?: boolean;
}

/**
 * Fetch recent tweets from a specific KOL's timeline
 * @param username Twitter handle (with or without @)
 * @param options Optional settings
 */
export async function fetchKOLTimeline(
  username: string,
  options: TwitterApiOptions = {}
): Promise<TwitterSearchResult> {
  const { maxResults = 50, forceRefresh = false } = options;

  try {
    const response = await fetch('/api/x-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        maxResults,
        forceRefresh
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching KOL timeline:', error);
    return {
      tweets: [],
      source: 'api',
      error: error instanceof Error ? error.message : 'Failed to fetch tweets'
    };
  }
}

/**
 * Search for tweets matching a query
 * Useful for finding controversies, scam mentions, etc.
 * @param query Search query (supports Twitter search operators)
 * @param options Optional settings
 *
 * Example queries:
 * - "Bitcoin scam from:username" - Find scam mentions from a user
 * - "(rug pull OR exit scam) username" - Find controversy mentions
 * - "username -filter:retweets" - Original tweets only
 */
export async function searchTweets(
  query: string,
  options: TwitterApiOptions = {}
): Promise<TwitterSearchResult> {
  const { maxResults = 20, forceRefresh = false } = options;

  try {
    const response = await fetch('/api/x-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        maxResults,
        forceRefresh
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching tweets:', error);
    return {
      tweets: [],
      source: 'api',
      error: error instanceof Error ? error.message : 'Failed to search tweets'
    };
  }
}

/**
 * Fetch comprehensive KOL data for analysis
 * Combines timeline + controversy search
 * @param username Twitter handle
 */
export async function fetchKOLAnalysisData(
  username: string
): Promise<{
  timeline: TwitterSearchResult;
  controversies: TwitterSearchResult;
}> {
  const cleanUsername = username.replace(/^@/, '');

  // Fetch timeline and controversy search in parallel
  const [timeline, controversies] = await Promise.all([
    fetchKOLTimeline(cleanUsername, { maxResults: 50 }),
    searchTweets(`(scam OR "rug pull" OR fraud OR controversy) ${cleanUsername}`, { maxResults: 20 })
  ]);

  return {
    timeline,
    controversies
  };
}

/**
 * Extract engagement metrics summary from tweets
 */
export function summarizeTweetEngagement(tweets: TweetData[]): {
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  avgEngagement: number;
} {
  const totals = tweets.reduce(
    (acc, tweet) => {
      const metrics = tweet.public_metrics;
      if (metrics) {
        acc.likes += metrics.like_count || 0;
        acc.retweets += metrics.retweet_count || 0;
        acc.replies += metrics.reply_count || 0;
      }
      return acc;
    },
    { likes: 0, retweets: 0, replies: 0 }
  );

  const totalEngagement = totals.likes + totals.retweets + totals.replies;
  const avgEngagement = tweets.length > 0 ? totalEngagement / tweets.length : 0;

  return {
    totalLikes: totals.likes,
    totalRetweets: totals.retweets,
    totalReplies: totals.replies,
    avgEngagement: Math.round(avgEngagement)
  };
}
