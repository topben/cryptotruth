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
}

export interface KOLAnalysis {
  handle: string;
  displayName: string;
  bioSummary: string;
  trustScore: number; // 0 to 100
  totalWins: number;
  totalLosses: number;
  followersCount?: string;
  history: HistoryEvent[];
  sources: SourceLink[];
  lastAnalyzed: string;
}

export type LoadingState = 'IDLE' | 'SEARCHING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';