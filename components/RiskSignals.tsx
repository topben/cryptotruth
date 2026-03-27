import React, { useState } from 'react';
import { AlertTriangle, AlertOctagon, Info, Shield, ChevronDown } from 'lucide-react';
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
    showAll: 'Show all {n} signals',
    showLess: 'Show less',
  },
  'zh-TW': {
    title: '為什麼這可能是詐騙',
    titleSenior: '發現的警示訊號',
    noSignals: '未偵測到特定風險訊號。',
    criticalLabel: '嚴重',
    warningLabel: '警告',
    infoLabel: '資訊',
    evidenceLabel: '證據：',
    showAll: '顯示全部 {n} 個風險訊號',
    showLess: '收起',
  },
  vi: {
    title: 'Tại sao đây có thể là lừa đảo',
    titleSenior: 'Dấu hiệu cảnh báo được phát hiện',
    noSignals: 'Không phát hiện tín hiệu rủi ro cụ thể.',
    criticalLabel: 'NGHIÊM TRỌNG',
    warningLabel: 'CẢNH BÁO',
    infoLabel: 'THÔNG TIN',
    evidenceLabel: 'Bằng chứng:',
    showAll: 'Hiện tất cả {n} tín hiệu',
    showLess: 'Thu gọn',
  },
};

// Human-readable signal type names
const SIGNAL_TYPE_LABELS: Record<string, { en: string; 'zh-TW': string; vi: string }> = {
  GUARANTEED_RETURNS: { en: 'Guaranteed Returns Promise', 'zh-TW': '保證獲利承諾', vi: 'Hứa hẹn lợi nhuận đảm bảo' },
  PRESSURE_TACTICS: { en: 'Pressure/Urgency Tactics', 'zh-TW': '壓力/催促手法', vi: 'Chiến thuật áp lực/thúc giục' },
  IMPERSONATION: { en: 'Impersonation Detected', 'zh-TW': '偵測到冒充行為', vi: 'Phát hiện mạo danh' },
  PHISHING_URL: { en: 'Suspicious/Phishing URL', 'zh-TW': '可疑/釣魚網址', vi: 'URL đáng ngờ/lừa đảo' },
  TYPOSQUATTING: { en: 'Fake Domain (Typosquatting)', 'zh-TW': '假冒網域', vi: 'Tên miền giả mạo' },
  KNOWN_SCAM: { en: 'Known Scam Pattern', 'zh-TW': '已知詐騙模式', vi: 'Mô hình lừa đảo đã biết' },
  SUSPICIOUS_PAYMENT: { en: 'Suspicious Payment Request', 'zh-TW': '可疑付款要求', vi: 'Yêu cầu thanh toán đáng ngờ' },
  CELEBRITY_IMPERSONATION: { en: 'Celebrity Impersonation', 'zh-TW': '冒充名人', vi: 'Mạo danh người nổi tiếng' },
  PONZI_SIGNS: { en: 'Ponzi/MLM Characteristics', 'zh-TW': '龐氏/傳銷特徵', vi: 'Đặc điểm Ponzi/MLM' },
  INSUFFICIENT_DATA: { en: 'Insufficient Verification Data', 'zh-TW': '驗證資料不足', vi: 'Dữ liệu xác minh không đủ' },
  RUG_PULL_HISTORY: { en: 'Rug Pull History', 'zh-TW': '捲款跑路紀錄', vi: 'Lịch sử lừa đảo bỏ trốn' },
  SCAM_ALLEGATION: { en: 'Scam Allegations Found', 'zh-TW': '發現詐騙指控', vi: 'Phát hiện cáo buộc lừa đảo' },
  BOT_ACTIVITY: { en: 'Bot/Fake Activity Detected', 'zh-TW': '偵測到機器人/假活動', vi: 'Phát hiện hoạt động bot/giả mạo' },
  UNKNOWN: { en: 'Unverified Risk', 'zh-TW': '未驗證風險', vi: 'Rủi ro chưa xác minh' },
};

const VISIBLE_COUNT = 3;

const RiskSignals: React.FC<RiskSignalsProps> = ({
  signals,
  language = 'en',
  isSeniorMode = false,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<Set<number>>(new Set([0, 1, 2]));
  const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] ?? TRANSLATIONS.en;

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

  const visibleSignals = showAll ? sortedSignals : sortedSignals.slice(0, VISIBLE_COUNT);
  const hiddenCount = sortedSignals.length - VISIBLE_COUNT;

  const toggleExpand = (idx: number) => {
    setExpandedIdx(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const getSignalIcon = (level: string) => {
    const iconClass = isSeniorMode ? 'w-7 h-7' : 'w-5 h-5';
    switch (level) {
      case 'CRITICAL':
        return <AlertOctagon className={`${iconClass} text-red-500 flex-shrink-0`} />;
      case 'WARNING':
        return <AlertTriangle className={`${iconClass} text-orange-500 flex-shrink-0`} />;
      default:
        return <Info className={`${iconClass} text-blue-400 flex-shrink-0`} />;
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'CRITICAL': return t.criticalLabel;
      case 'WARNING': return t.warningLabel;
      default: return t.infoLabel;
    }
  };

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'border-red-800 bg-red-950/30';
      case 'WARNING': return 'border-orange-800/60 bg-orange-950/20';
      default: return 'border-blue-800/50 bg-blue-950/20';
    }
  };

  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'WARNING': return 'bg-orange-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getSignalTypeLabel = (type: string): string => {
    const labels = SIGNAL_TYPE_LABELS[type] || SIGNAL_TYPE_LABELS.UNKNOWN;
    return labels[language as keyof typeof labels] ?? labels.en;
  };

  return (
    <div className={`${isSeniorMode ? 'mb-8' : 'mb-6'}`}>
      <h3 className={`font-bold text-red-400 flex items-center gap-2 mb-4 ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
        <AlertTriangle className={isSeniorMode ? 'w-8 h-8' : 'w-6 h-6'} />
        {isSeniorMode ? t.titleSenior : t.title}
      </h3>

      <div className="space-y-2">
        {visibleSignals.map((signal, idx) => {
          const isExpanded = expandedIdx.has(idx);
          return (
            <div
              key={idx}
              className={`border rounded-xl overflow-hidden ${getLevelStyle(signal.level)}`}
            >
              <button
                onClick={() => toggleExpand(idx)}
                className={`w-full text-left flex items-center gap-3 transition-colors hover:bg-white/5 ${isSeniorMode ? 'p-5' : 'p-4'}`}
              >
                {getSignalIcon(signal.level)}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <span className={`font-bold text-white truncate ${isSeniorMode ? 'text-xl' : 'text-base'}`}>
                    {getSignalTypeLabel(signal.type)}
                  </span>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold ${getBadgeStyle(signal.level)}`}>
                    {getLevelLabel(signal.level)}
                  </span>
                </div>
                <ChevronDown className={`flex-shrink-0 w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className={`border-t border-white/5 ${isSeniorMode ? 'px-5 py-4' : 'px-4 py-3'}`}>
                  <span className={`text-gray-400 font-medium ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>{t.evidenceLabel}</span>{' '}
                  <span className={`text-gray-300 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>{signal.evidence}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(s => !s)}
          className={`mt-3 flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors ${isSeniorMode ? 'text-lg' : 'text-sm'}`}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          {showAll
            ? t.showLess
            : t.showAll.replace('{n}', String(sortedSignals.length))}
        </button>
      )}
    </div>
  );
};

export default RiskSignals;
