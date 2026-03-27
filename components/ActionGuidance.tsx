import React from 'react';
import { ShieldAlert, PhoneCall, Ban, Building2, Flag, CheckCircle2, XCircle } from 'lucide-react';
import { ActionPlan, Language } from '../types';

interface ActionGuidanceProps {
  actions: ActionPlan[];
  scamProbability: number;
  language?: Language;
  isSeniorMode?: boolean;
}

const TRANSLATIONS = {
  en: {
    title: 'Recommended Safety Actions',
    titleSenior: 'What Should You Do?',
    highRisk: 'HIGH RISK DETECTED',
    mediumRisk: 'CAUTION ADVISED',
    lowRisk: 'APPEARS SAFE',
    callNow: 'Call Now',
    tapToCall: 'Tap to call 165 Anti-Fraud Hotline',
  },
  'zh-TW': {
    title: '建議採取的安全行動',
    titleSenior: '您應該怎麼做？',
    highRisk: '偵測到高風險',
    mediumRisk: '建議小心謹慎',
    lowRisk: '目前看起來安全',
    callNow: '立即撥打',
    tapToCall: '點擊撥打 165 反詐騙專線',
  },
  vi: {
    title: 'Hành động an toàn được đề xuất',
    titleSenior: 'Bạn nên làm gì?',
    highRisk: 'PHÁT HIỆN RỦI RO CAO',
    mediumRisk: 'NÊN CẨN THẬN',
    lowRisk: 'CÓ VẺ AN TOÀN',
    callNow: 'Gọi ngay',
    tapToCall: 'Nhấn để gọi đường dây chống lừa đảo',
  },
};

const ActionGuidance: React.FC<ActionGuidanceProps> = ({
  actions,
  scamProbability,
  language = 'en',
  isSeniorMode = false,
}) => {
  const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] ?? TRANSLATIONS.en;

  // Determine risk level for styling
  const isHighRisk = scamProbability >= 70;
  const isMediumRisk = scamProbability >= 40 && scamProbability < 70;

  // Get appropriate icon for action type
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'CALL_165':
        return <PhoneCall className={isSeniorMode ? 'w-8 h-8' : 'w-5 h-5'} />;
      case 'BLOCK':
        return <Ban className={isSeniorMode ? 'w-8 h-8' : 'w-5 h-5'} />;
      case 'OFFICIAL_CHANNEL':
        return <Building2 className={isSeniorMode ? 'w-8 h-8' : 'w-5 h-5'} />;
      case 'REPORT':
        return <Flag className={isSeniorMode ? 'w-8 h-8' : 'w-5 h-5'} />;
      case 'VERIFY':
        return <CheckCircle2 className={isSeniorMode ? 'w-8 h-8' : 'w-5 h-5'} />;
      case 'IGNORE':
        return <XCircle className={isSeniorMode ? 'w-8 h-8' : 'w-5 h-5'} />;
      default:
        return <ShieldAlert className={isSeniorMode ? 'w-8 h-8' : 'w-5 h-5'} />;
    }
  };

  // Get button style based on action type and risk level
  const getButtonStyle = (type: string, priority: number) => {
    const baseStyle = isSeniorMode
      ? 'flex items-center justify-center gap-3 px-8 py-5 font-bold rounded-2xl transition-all text-xl'
      : 'flex items-center justify-center gap-2 px-6 py-3 font-bold rounded-xl transition-all';

    if (type === 'CALL_165') {
      return `${baseStyle} bg-red-600 hover:bg-red-500 text-white shadow-lg hover:shadow-red-500/30`;
    }
    if (type === 'BLOCK') {
      return `${baseStyle} bg-orange-600 hover:bg-orange-500 text-white`;
    }
    if (type === 'REPORT') {
      return `${baseStyle} bg-yellow-600 hover:bg-yellow-500 text-white`;
    }
    if (type === 'OFFICIAL_CHANNEL' || type === 'VERIFY') {
      return `${baseStyle} bg-blue-600 hover:bg-blue-500 text-white`;
    }
    return `${baseStyle} bg-gray-600 hover:bg-gray-500 text-white`;
  };

  // Handle action click
  const handleActionClick = (action: ActionPlan) => {
    if (action.actionUrl) {
      if (action.type === 'CALL_165') {
        // For phone calls, use tel: protocol
        window.location.href = action.actionUrl;
      } else {
        window.open(action.actionUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // Container style based on risk level
  const containerStyle = isHighRisk
    ? 'bg-red-900/30 border-red-500'
    : isMediumRisk
    ? 'bg-yellow-900/20 border-yellow-500'
    : 'bg-green-900/20 border-green-500';

  // Header style based on risk level
  const headerStyle = isHighRisk
    ? 'text-red-400'
    : isMediumRisk
    ? 'text-yellow-400'
    : 'text-green-400';

  // Risk badge
  const riskBadge = isHighRisk
    ? t.highRisk
    : isMediumRisk
    ? t.mediumRisk
    : t.lowRisk;

  return (
    <div className={`border rounded-2xl ${isSeniorMode ? 'p-8' : 'p-6'} mt-6 ${containerStyle}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold flex items-center gap-2 ${headerStyle} ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
          <ShieldAlert className={isSeniorMode ? 'w-8 h-8' : 'w-6 h-6'} />
          {isSeniorMode ? t.titleSenior : t.title}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
          isHighRisk
            ? 'bg-red-500 text-white animate-pulse'
            : isMediumRisk
            ? 'bg-yellow-500 text-black'
            : 'bg-green-500 text-white'
        }`}>
          {riskBadge}
        </span>
      </div>

      {/* Action Buttons */}
      <div className={`grid gap-4 ${isSeniorMode ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {actions
          .sort((a, b) => a.priority - b.priority)
          .map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleActionClick(action)}
              className={getButtonStyle(action.type, action.priority)}
            >
              {getActionIcon(action.type)}
              <span>{action.label}</span>
            </button>
          ))}
      </div>

      {/* Special 165 Call-to-Action for High Risk in Senior Mode */}
      {isHighRisk && isSeniorMode && (
        <div className="mt-6 p-4 bg-red-800/50 rounded-xl text-center">
          <p className="text-white text-lg mb-2">{t.tapToCall}</p>
          <a
            href="tel:165"
            className="inline-flex items-center gap-3 px-10 py-4 bg-red-500 hover:bg-red-400 text-white text-2xl font-bold rounded-2xl shadow-lg animate-pulse"
          >
            <PhoneCall className="w-10 h-10" />
            165
          </a>
        </div>
      )}
    </div>
  );
};

export default ActionGuidance;
