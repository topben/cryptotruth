import React from 'react';
import { Language } from '../types';
import TrustMeter from './TrustMeter';
import { AlertCircle } from 'lucide-react';

/**
 * Props for KOLVerdictHeader component.
 *
 * To plug in a future `verdict` field from the API:
 * - Ensure KOLAnalysis.verdict is populated by the backend
 * - Pass analysis.verdict to the `summary` prop here
 */
export interface KOLVerdictHeaderProps {
  /** KOL's Twitter/X handle (without @) */
  handle: string;
  /** Optional display name for the KOL */
  displayName?: string;
  /** Trust score from 0-100. If undefined/null, TrustMeter is hidden */
  score?: number;
  /**
   * Short summary/verdict text (1-2 sentences).
   * Currently uses KOLAnalysis.verdict field.
   * Will be truncated to ~200 chars if longer.
   */
  summary?: string;
  /** Language for localized text */
  language: Language;
}

const TRANSLATIONS = {
  en: {
    noScoreAvailable: 'No score available yet',
    disclaimer: 'This is an AI-generated reputational assessment, not financial advice.',
  },
  'zh-TW': {
    noScoreAvailable: '暫無評分',
    disclaimer: '這是 AI 生成的聲譽評估，並非財務建議。',
  },
};

/**
 * Truncates text to a maximum length, adding ellipsis if needed.
 */
const truncateText = (text: string, maxLength: number = 200): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * KOLVerdictHeader - A prominent header section showing immediate verdict for a KOL.
 * Displays the KOL's identity, trust score, and a quick TL;DR summary.
 */
const KOLVerdictHeader: React.FC<KOLVerdictHeaderProps> = ({
  handle,
  displayName,
  score,
  summary,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const hasScore = score !== undefined && score !== null;
  const hasSummary = summary && summary.trim().length > 0;

  return (
    <div className="bg-crypto-card p-6 rounded-2xl border border-gray-800 shadow-2xl mb-8">
      <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start">
        {/* Left: Trust Meter or No Score Fallback */}
        <div className="flex-shrink-0 w-48">
          {hasScore ? (
            <TrustMeter score={score} language={language} />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 bg-gray-900/50 rounded-2xl border border-gray-700 h-full min-h-[200px]">
              <AlertCircle className="w-12 h-12 text-gray-500 mb-3" />
              <span className="text-gray-400 text-sm text-center">{t.noScoreAvailable}</span>
            </div>
          )}
        </div>

        {/* Right: KOL Info + Summary */}
        <div className="flex-1 text-center lg:text-left">
          {/* KOL Handle & Name */}
          <div className="mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              @{handle}
            </h2>
            {displayName && (
              <p className="text-crypto-muted font-mono text-sm mt-1">
                {displayName}
              </p>
            )}
          </div>

          {/* TL;DR Summary */}
          {hasSummary && (
            <div className="mb-4">
              <p className="text-lg text-gray-200 leading-relaxed">
                {truncateText(summary)}
              </p>
            </div>
          )}

          {/* Disclaimer - Always shown */}
          <div className="pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 italic">
              {t.disclaimer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KOLVerdictHeader;
