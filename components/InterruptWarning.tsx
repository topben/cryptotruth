import React from 'react';
import { ShieldAlert, PhoneCall } from 'lucide-react';
import { Language } from '../types';

interface InterruptWarningProps {
  scamProbability: number;
  verdict?: string;
  seniorModeVerdict?: string;
  language?: Language;
  isSeniorMode?: boolean;
}

const TRANSLATIONS = {
  en: {
    highTitle: '🚨 STOP — Read This First',
    medTitle: '⚠️ CAUTION — Proceed Carefully',
    lowTitle: '✅ Appears Safe',
    highSubtitle: 'High probability of scam detected. Do not take any action until you read this report.',
    medSubtitle: 'Some risk signals found. Verify carefully before taking any action.',
    lowSubtitle: 'No major risk signals detected. Stay alert — verify anything unusual.',
    stopLabel: '⛔ Stop',
    leaveLabel: '🚪 Leave',
    verifyLabel: '✅ Verify',
    stopItems: ['Do NOT send money or gift cards', 'Do NOT click any links', 'Do NOT share personal info or passwords'],
    leaveItems: ['Step back from the conversation', 'Close this chat or hang up the call', 'Take a breath before acting'],
    verifyItems: ['Only contact via official websites', 'Legitimate businesses never rush you', 'Call the official number yourself to confirm'],
    call165: '📞 Call 165 Anti-Fraud Hotline',
    tapToCall: 'Tap to call immediately',
  },
  'zh-TW': {
    highTitle: '🚨 停下來 — 先看這裡',
    medTitle: '⚠️ 小心 — 謹慎繼續',
    lowTitle: '✅ 目前看起來安全',
    highSubtitle: '偵測到高機率詐騙。閱讀完這份報告前，請不要採取任何行動。',
    medSubtitle: '偵測到部分風險訊號。採取任何行動前請先仔細確認。',
    lowSubtitle: '未偵測到重大風險訊號。保持警惕，若有任何可疑之處請再次確認。',
    stopLabel: '⛔ 停止',
    leaveLabel: '🚪 離開',
    verifyLabel: '✅ 驗證',
    stopItems: ['絕對不要轉帳或匯款', '不要點擊任何連結', '不要透露個人資料或密碼'],
    leaveItems: ['先退出對話', '關閉聊天或掛掉電話', '冷靜一下再行動'],
    verifyItems: ['只透過官方網站或電話聯繫', '正規機構不會催促您', '自行撥打官方電話確認'],
    call165: '📞 撥打 165 反詐騙專線',
    tapToCall: '點擊立即撥打',
  },
  vi: {
    highTitle: '🚨 DỪNG LẠI — Đọc điều này trước',
    medTitle: '⚠️ CẨN THẬN — Tiến hành cẩn thận',
    lowTitle: '✅ Có vẻ an toàn',
    highSubtitle: 'Phát hiện khả năng lừa đảo cao. Không thực hiện bất kỳ hành động nào trước khi đọc xong báo cáo này.',
    medSubtitle: 'Phát hiện một số tín hiệu rủi ro. Hãy xác minh cẩn thận trước khi hành động.',
    lowSubtitle: 'Không phát hiện tín hiệu rủi ro lớn. Hãy cảnh giác và xác minh nếu có điều gì bất thường.',
    stopLabel: '⛔ Dừng',
    leaveLabel: '🚪 Rời đi',
    verifyLabel: '✅ Xác minh',
    stopItems: ['KHÔNG gửi tiền hoặc thẻ quà tặng', 'KHÔNG nhấp vào bất kỳ liên kết nào', 'KHÔNG chia sẻ thông tin cá nhân hoặc mật khẩu'],
    leaveItems: ['Rút lui khỏi cuộc trò chuyện', 'Đóng cuộc trò chuyện này hoặc cúp máy', 'Hít thở trước khi hành động'],
    verifyItems: ['Chỉ liên hệ qua trang web chính thức', 'Doanh nghiệp hợp pháp không bao giờ vội vàng bạn', 'Tự gọi số điện thoại chính thức để xác nhận'],
    call165: '📞 Gọi đường dây chống lừa đảo',
    tapToCall: 'Nhấn để gọi ngay',
  },
};

const InterruptWarning: React.FC<InterruptWarningProps> = ({
  scamProbability,
  verdict,
  seniorModeVerdict,
  language = 'en',
  isSeniorMode = false,
}) => {
  const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] ?? TRANSLATIONS.en;
  const isHighRisk = scamProbability >= 70;
  const isMediumRisk = scamProbability >= 40 && scamProbability < 70;

  const headerBg = isHighRisk
    ? 'bg-red-950/80 border-red-500'
    : isMediumRisk
    ? 'bg-yellow-950/60 border-yellow-500'
    : 'bg-green-950/40 border-green-600';

  const headerText = isHighRisk ? 'text-red-300' : isMediumRisk ? 'text-yellow-300' : 'text-green-300';

  const displayTitle = isHighRisk ? t.highTitle : isMediumRisk ? t.medTitle : t.lowTitle;
  const displaySubtitle = isHighRisk ? t.highSubtitle : isMediumRisk ? t.medSubtitle : t.lowSubtitle;
  const displayVerdict = seniorModeVerdict ?? verdict;

  return (
    <div className={`border-2 rounded-2xl overflow-hidden ${headerBg} ${isSeniorMode ? 'mb-8' : 'mb-6'}`}>
      {/* Header */}
      <div className={`px-6 py-5 ${isHighRisk ? 'bg-red-900/40' : isMediumRisk ? 'bg-yellow-900/30' : 'bg-green-900/20'}`}>
        <div className="flex items-start gap-3">
          <ShieldAlert className={`flex-shrink-0 ${isSeniorMode ? 'w-10 h-10' : 'w-7 h-7'} ${headerText} mt-0.5`} />
          <div className="flex-1">
            <h2 className={`font-bold ${headerText} ${isSeniorMode ? 'text-3xl' : 'text-2xl'}`}>
              {displayTitle}
            </h2>
            <p className={`text-gray-300 mt-1 ${isSeniorMode ? 'text-xl' : 'text-sm'}`}>
              {displaySubtitle}
            </p>
            {displayVerdict && (
              <p className={`mt-3 font-semibold text-white ${isSeniorMode ? 'text-2xl' : 'text-base'}`}>
                {displayVerdict}
              </p>
            )}
          </div>
          <div className={`flex-shrink-0 text-right`}>
            <span className={`inline-block px-3 py-1 rounded-full font-bold text-sm ${
              isHighRisk
                ? 'bg-red-500 text-white animate-pulse'
                : isMediumRisk
                ? 'bg-yellow-500 text-black'
                : 'bg-green-500 text-white'
            }`}>
              {scamProbability}%
            </span>
          </div>
        </div>
      </div>

      {/* 3-Layer CTA — only for medium/high risk */}
      {(isHighRisk || isMediumRisk) && (
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-800/50 ${isSeniorMode ? 'text-xl' : ''}`}>
          {/* Layer 1: Stop */}
          <div className="bg-red-950/60 p-4">
            <div className={`font-bold text-red-400 mb-3 flex items-center gap-2 ${isSeniorMode ? 'text-xl' : 'text-sm'}`}>
              {t.stopLabel}
            </div>
            <ul className="space-y-2">
              {t.stopItems.map((item, i) => (
                <li key={i} className={`text-red-200 flex items-start gap-2 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
                  <span className="flex-shrink-0 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Layer 2: Leave */}
          <div className="bg-orange-950/50 p-4">
            <div className={`font-bold text-orange-400 mb-3 flex items-center gap-2 ${isSeniorMode ? 'text-xl' : 'text-sm'}`}>
              {t.leaveLabel}
            </div>
            <ul className="space-y-2">
              {t.leaveItems.map((item, i) => (
                <li key={i} className={`text-orange-200 flex items-start gap-2 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
                  <span className="flex-shrink-0 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Layer 3: Verify */}
          <div className="bg-blue-950/50 p-4">
            <div className={`font-bold text-blue-400 mb-3 flex items-center gap-2 ${isSeniorMode ? 'text-xl' : 'text-sm'}`}>
              {t.verifyLabel}
            </div>
            <ul className="space-y-2">
              {t.verifyItems.map((item, i) => (
                <li key={i} className={`text-blue-200 flex items-start gap-2 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
                  <span className="flex-shrink-0 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 165 CTA — zh-TW high risk only */}
      {isHighRisk && language === 'zh-TW' && (
        <div className="px-6 py-5 bg-red-900/30 text-center border-t border-red-800">
          <p className={`text-gray-300 mb-3 ${isSeniorMode ? 'text-xl' : 'text-sm'}`}>{t.tapToCall}</p>
          <a
            href="tel:165"
            className={`inline-flex items-center gap-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl shadow-lg transition-colors ${
              isSeniorMode ? 'px-12 py-5 text-3xl' : 'px-8 py-4 text-xl'
            }`}
          >
            <PhoneCall className={isSeniorMode ? 'w-10 h-10' : 'w-6 h-6'} />
            {t.call165}
          </a>
        </div>
      )}
    </div>
  );
};

export default InterruptWarning;
