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

export interface IdentityResolution {
  input: string;
  resolvedHandle?: string;
  displayName?: string;
  confidence: number; // 0-100
  resolutionNote: string;
}

export type DataCoverage = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

export interface KOLAnalysis {
  handle: string;
  displayName: string;
  bioSummary: string;
  trustScore: number | null; // 0 to 100, null if insufficient data
  totalWins: number;
  totalLosses: number;
  followersCount?: string;
  walletAddresses?: string[]; // Public wallet addresses found
  verdict?: string; // One-sentence summary verdict (e.g., "High Risk Scammer")
  history: HistoryEvent[];
  sources: SourceLink[];
  lastAnalyzed: string;
  source?: 'cache' | 'api'; // Whether result came from cache or live API
  cachedAt?: number; // Timestamp when result was cached
  identity?: IdentityResolution; // Identity resolution info
  dataCoverage?: DataCoverage; // Data availability level
}

export type LoadingState = 'IDLE' | 'SEARCHING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';

export type Language = 'en' | 'zh-TW';