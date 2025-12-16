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

export interface KOLAnalysis {
  handle: string;
  displayName: string;
  bioSummary: string;
  trustScore: number; // 0 to 100
  totalWins: number;
  totalLosses: number;
  followersCount?: string;
  walletAddresses?: string[]; // Public wallet addresses found
  verdict?: string; // One-sentence summary verdict (e.g., "High Risk Scammer")
  history: HistoryEvent[];
  sources: SourceLink[];
  lastAnalyzed: string;
}

export type LoadingState = 'IDLE' | 'SEARCHING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';

export type Language = 'en' | 'zh-TW';