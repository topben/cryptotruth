import React from 'react';
import { AlertTriangle, BadgeCheck, ShieldAlert, Siren } from 'lucide-react';
import { FinalVerdict, Language } from '../types';

interface VerdictSummaryProps {
  conclusion: string;
  verdict: FinalVerdict;
  language?: Language;
}

const VERDICT_META: Record<FinalVerdict, { icon: React.ReactNode; tone: string; label: Record<Language, string> }> = {
  A_MARKETING: {
    icon: <BadgeCheck className="w-5 h-5" />,
    tone: 'border-emerald-700/50 bg-emerald-950/30 text-emerald-300',
    label: { en: 'A. General marketing', 'zh-TW': 'A. 一般行銷訊息', vi: 'A. Tiếp thị thông thường' },
  },
  B_RISKY_MARKETING: {
    icon: <AlertTriangle className="w-5 h-5" />,
    tone: 'border-amber-700/50 bg-amber-950/30 text-amber-300',
    label: { en: 'B. Aggressive marketing / risky tactics', 'zh-TW': 'B. 高壓行銷 / 有風險手法', vi: 'B. Tiếp thị áp lực / có rủi ro' },
  },
  C_SUSPICIOUS_NEEDS_VERIFICATION: {
    icon: <ShieldAlert className="w-5 h-5" />,
    tone: 'border-orange-700/50 bg-orange-950/30 text-orange-300',
    label: { en: 'C. Suspicious, needs verification', 'zh-TW': 'C. 可疑，需要驗證', vi: 'C. Đáng ngờ, cần xác minh' },
  },
  D_HIGH_RISK_SCAM: {
    icon: <Siren className="w-5 h-5" />,
    tone: 'border-red-700/50 bg-red-950/40 text-red-300',
    label: { en: 'D. High risk, likely scam', 'zh-TW': 'D. 高風險，疑似詐騙', vi: 'D. Rủi ro cao, nghi lừa đảo' },
  },
};

const VerdictSummary: React.FC<VerdictSummaryProps> = ({ conclusion, verdict, language = 'zh-TW' }) => {
  const meta = VERDICT_META[verdict];

  return (
    <section className="mb-5 rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6 shadow-2xl">
      <p className="mb-4 text-xl font-semibold leading-relaxed text-white md:text-2xl">
        {conclusion}
      </p>
      <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${meta.tone}`}>
        {meta.icon}
        <span>{meta.label[language]}</span>
      </div>
    </section>
  );
};

export default VerdictSummary;
