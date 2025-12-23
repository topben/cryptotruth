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
  type: 'PREDICTION_WIN' | 'PREDICTION_LOSS' | 'CONTROVERSY' | 'NEUTRAL_NEWS' | 'SCAM_ALLEGATION' | 'INVESTIGATION';
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
  engagementQuality?: EngagementQuality; // Assessment of follower authenticity (from search grounding)
  riskFactors?: string[]; // List of identified risk factors from search results
  engagementAudit?: EngagementAudit; // Detailed engagement metrics (optional, from search grounding)
  shillAnalysis?: ShillAnalysisSummary; // Promotional content analysis (optional, from search grounding)
  history: HistoryEvent[];
  sources: SourceLink[];
  searchQueries?: string[]; // Search queries used by Google Search grounding
  groundedSearch?: boolean; // Indicates if Google Search grounding was used
  lastAnalyzed: string;
  source?: 'cache' | 'api'; // Whether result came from cache or live API
  cachedAt?: number; // Timestamp when result was cached
}

export type LoadingState = 'IDLE' | 'SEARCHING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';

export type Language = 'en' | 'zh-TW';