export enum Sentiment {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  NEUTRAL = 'NEUTRAL'
}

export interface SourceLink {
  title: string;
  url: string;
}

export interface HistoryEvent {
  id: string;
  date: string;
  description: string;
  type: 'PREDICTION_WIN' | 'PREDICTION_LOSS' | 'CONTROVERSY' | 'NEUTRAL_NEWS';
  token?: string; // e.g., "BTC", "SOL"
  sentiment: Sentiment;
  details: string;
  sourceUrl?: string; // URL to evidence source for this specific event
}

// Engagement Quality Audit Results
export interface EngagementAudit {
  averageLikes: number;
  averageRetweets: number;
  averageReplies: number;
  engagementRate: number; // Percentage
  ghostFollowerRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  analysisNote: string;
}

// Shill/Promotional Content Analysis
export interface ShillAnalysisSummary {
  totalShillTweets: number;
  undisclosedPromos: number;
  disclosedPromos: number;
}

// Engagement Quality Assessment
export type EngagementQuality = 'ORGANIC' | 'MIXED' | 'SUSPICIOUS' | 'BOT_HEAVY';

export interface KOLAnalysis {
  handle: string;
  displayName: string;
  bioSummary: string;
  trustScore: number; // 0 to 100
  totalWins: number;
  totalLosses: number;
  followersCount?: string;
  walletAddresses?: string[]; // Public wallet addresses found (format: "ETH:0x...", "SOL:...")
  verdict?: string; // One-sentence summary verdict (e.g., "High Risk Scammer")
  engagementQuality?: EngagementQuality; // Assessment of follower authenticity
  engagementAudit?: EngagementAudit; // Detailed engagement metrics
  shillAnalysis?: ShillAnalysisSummary; // Promotional content analysis
  history: HistoryEvent[];
  sources: SourceLink[];
  lastAnalyzed: string;
  source?: 'cache' | 'api'; // Whether result came from cache or live API
  cachedAt?: number; // Timestamp when result was cached
}

export type LoadingState = 'IDLE' | 'SEARCHING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';

export type Language = 'en' | 'zh-TW';

// Twitter/X API Types
export interface TweetMetrics {
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
}

export interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: TweetMetrics;
}

export interface TwitterUserMetrics {
  followers_count: number;
  following_count: number;
  tweet_count: number;
}

export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  public_metrics?: TwitterUserMetrics;
}

export interface TwitterSearchResult {
  tweets: Tweet[];
  user?: TwitterUser;
  source: 'cache' | 'api';
  cachedAt?: number;
  error?: string;
}