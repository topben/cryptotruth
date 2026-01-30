import React from 'react';
import { AlertTriangle, AlertOctagon, Info, Shield } from 'lucide-react';
import { RiskSignal, Language } from '../types';

interface RiskSignalsProps {
  signals: RiskSignal[];
  language?: Language;
  isSeniorMode?: boolean;
}

const TRANSLATIONS = {
  en: {
    title: 'Why This May Be a Scam',
    titleSenior: 'Warning Signs Found',
    noSignals: 'No specific risk signals detected.',
    criticalLabel: 'CRITICAL',
    warningLabel: 'WARNING',
    infoLabel: 'INFO',
    evidenceLabel: 'Evidence:',
  },
  'zh-TW': {
    title: '為什麼這可能是詐騙',
    titleSenior: '發現的警示訊號',
    noSignals: '未偵測到特定風險訊號。',
    criticalLabel: '嚴重',
    warningLabel: '警告',
    infoLabel: '資訊',
    evidenceLabel: '證據：',
  },
};

// Human-readable signal type names
const SIGNAL_TYPE_LABELS: Record<string, { en: string; 'zh-TW': string }> = {
  GUARANTEED_RETURNS: { en: 'Guaranteed Returns Promise', 'zh-TW': '保證獲利承諾' },
  PRESSURE_TACTICS: { en: 'Pressure/Urgency Tactics', 'zh-TW': '壓力/催促手法' },
  IMPERSONATION: { en: 'Impersonation Detected', 'zh-TW': '偵測到冒充行為' },
  PHISHING_URL: { en: 'Suspicious/Phishing URL', 'zh-TW': '可疑/釣魚網址' },
  TYPOSQUATTING: { en: 'Fake Domain (Typosquatting)', 'zh-TW': '假冒網域' },
  KNOWN_SCAM: { en: 'Known Scam Pattern', 'zh-TW': '已知詐騙模式' },
  SUSPICIOUS_PAYMENT: { en: 'Suspicious Payment Request', 'zh-TW': '可疑付款要求' },
  CELEBRITY_IMPERSONATION: { en: 'Celebrity Impersonation', 'zh-TW': '冒充名人' },
  PONZI_SIGNS: { en: 'Ponzi/MLM Characteristics', 'zh-TW': '龐氏/傳銷特徵' },
  INSUFFICIENT_DATA: { en: 'Insufficient Verification Data', 'zh-TW': '驗證資料不足' },
  RUG_PULL_HISTORY: { en: 'Rug Pull History', 'zh-TW': '捲款跑路紀錄' },
  SCAM_ALLEGATION: { en: 'Scam Allegations Found', 'zh-TW': '發現詐騙指控' },
  BOT_ACTIVITY: { en: 'Bot/Fake Activity Detected', 'zh-TW': '偵測到機器人/假活動' },
  UNKNOWN: { en: 'Unverified Risk', 'zh-TW': '未驗證風險' },
};

const RiskSignals: React.FC<RiskSignalsProps> = ({
  signals,
  language = 'en',
  isSeniorMode = false,
}) => {
  const t = TRANSLATIONS[language];

  if (!signals || signals.length === 0) {
    return (
      <div className={`bg-green-900/20 border border-green-700 rounded-2xl ${isSeniorMode ? 'p-8' : 'p-6'}`}>
        <div className="flex items-center gap-3 text-green-400">
          <Shield className={isSeniorMode ? 'w-8 h-8' : 'w-6 h-6'} />
          <span className={isSeniorMode ? 'text-xl' : 'text-base'}>{t.noSignals}</span>
        </div>
      </div>
    );
  }

  // Sort by severity: CRITICAL first, then WARNING, then INFO
  const sortedSignals = [...signals].sort((a, b) => {
    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return (order[a.level] ?? 2) - (order[b.level] ?? 2);
  });

  const getSignalIcon = (level: string) => {
    const iconClass = isSeniorMode ? 'w-8 h-8' : 'w-6 h-6';
    switch (level) {
      case 'CRITICAL':
        return <AlertOctagon className={`${iconClass} text-red-500`} />;
      case 'WARNING':
        return <AlertTriangle className={`${iconClass} text-orange-500`} />;
      default:
        return <Info className={`${iconClass} text-blue-400`} />;
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return t.criticalLabel;
      case 'WARNING':
        return t.warningLabel;
      default:
        return t.infoLabel;
    }
  };

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-900/30 border-red-700';
      case 'WARNING':
        return 'bg-orange-900/20 border-orange-700';
      default:
        return 'bg-blue-900/20 border-blue-700';
    }
  };

  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500 text-white';
      case 'WARNING':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  };

  const getSignalTypeLabel = (type: string): string => {
    const labels = SIGNAL_TYPE_LABELS[type] || SIGNAL_TYPE_LABELS.UNKNOWN;
    return labels[language];
  };

  return (
    <div className={`space-y-4 ${isSeniorMode ? 'mt-8' : 'mt-6'}`}>
      <h3 className={`font-bold text-red-400 flex items-center gap-2 ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
        <AlertTriangle className={isSeniorMode ? 'w-8 h-8' : 'w-6 h-6'} />
        {isSeniorMode ? t.titleSenior : t.title}
      </h3>

      <div className="space-y-3">
        {sortedSignals.map((signal, idx) => (
          <div
            key={idx}
            className={`border rounded-xl ${isSeniorMode ? 'p-6' : 'p-4'} ${getLevelStyle(signal.level)}`}
          >
            <div className="flex items-start gap-3">
              {getSignalIcon(signal.level)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`font-bold ${isSeniorMode ? 'text-xl' : 'text-lg'} text-white`}>
                    {getSignalTypeLabel(signal.type)}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getBadgeStyle(signal.level)}`}>
                    {getLevelLabel(signal.level)}
                  </span>
                </div>
                <div className={`text-gray-300 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
                  <span className="text-gray-400 font-medium">{t.evidenceLabel}</span>{' '}
                  {signal.evidence}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RiskSignals;
