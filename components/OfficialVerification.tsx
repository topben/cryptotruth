import React from 'react';
import { ExternalLink, AlertTriangle, Search } from 'lucide-react';
import { Language } from '../types';

interface OfficialVerificationProps {
  originalInput: string;
  inputType: string;
  scamProbability: number;
  language?: Language;
  isSeniorMode?: boolean;
}

const T = {
  en: {
    title: 'Official Verification',
    warning: 'Do NOT use the phone number, email, or website provided by the suspicious message to verify.',
    warningDetail: 'Always find the official contact info yourself through a separate, trusted search.',
    searchOfficialBtn: 'Search for official site',
    searchQuery: 'official site',
    shortcuts: 'Direct official resources',
    reportFraud: 'Report fraud to authorities',
    resources: [
      { label: 'FTC Fraud Report (US)', url: 'https://reportfraud.ftc.gov/' },
      { label: 'Action Fraud (UK)', url: 'https://www.actionfraud.police.uk/' },
      { label: 'ScamWatch (AU)', url: 'https://www.scamwatch.gov.au/report-a-scam' },
    ],
  },
  'zh-TW': {
    title: '官方驗證',
    warning: '不要用可疑訊息中提供的電話、電子郵件或網址來做確認。',
    warningDetail: '永遠自己另外搜尋，找到對方所稱機構的官方聯絡方式，再主動聯繫。',
    searchOfficialBtn: '搜尋官方網站',
    searchQuery: '官方網站',
    shortcuts: '直達官方資源',
    reportFraud: '向主管機關回報詐騙',
    resources: [
      { label: '165 反詐騙諮詢專線', url: 'tel:165' },
      { label: '刑事警察局 165 反詐騙官網', url: 'https://165.npa.gov.tw/' },
      { label: '內政部警政署 165 全民防騙', url: 'https://165.npa.gov.tw/web/index.do' },
      { label: '金管會消費者保護', url: 'https://www.fsc.gov.tw/' },
    ],
  },
  vi: {
    title: 'Xác minh chính thức',
    warning: 'KHÔNG dùng số điện thoại, email, hoặc trang web được cung cấp bởi tin nhắn đáng ngờ để xác minh.',
    warningDetail: 'Luôn tự tìm thông tin liên lạc chính thức thông qua tìm kiếm riêng biệt, đáng tin cậy.',
    searchOfficialBtn: 'Tìm kiếm trang web chính thức',
    searchQuery: 'trang web chính thức',
    shortcuts: 'Tài nguyên chính thức trực tiếp',
    reportFraud: 'Báo cáo gian lận cho cơ quan chức năng',
    resources: [
      { label: 'Cổng thông tin tội phạm mạng Bộ Công an', url: 'https://www.bocongan.gov.vn/' },
      { label: 'Cục An toàn thông tin (VNISA)', url: 'https://khonggianmang.vn/' },
    ],
  },
};

function buildSearchUrl(query: string, lang: string): string {
  const terms = lang === 'zh-TW'
    ? `${query} 官方網站 site:gov.tw OR site:com.tw`
    : lang === 'vi'
    ? `${query} trang web chính thức`
    : `${query} official website`;
  return `https://www.google.com/search?q=${encodeURIComponent(terms)}`;
}

const OfficialVerification: React.FC<OfficialVerificationProps> = ({
  originalInput,
  inputType,
  scamProbability,
  language = 'en',
  isSeniorMode = false,
}) => {
  if (scamProbability < 30) return null;

  const t = T[language as keyof typeof T] ?? T.en;

  // Build a useful search query from the input
  const searchTarget = inputType === 'HANDLE' ? originalInput.replace('@', '') :
    inputType === 'URL' ? (() => {
      try { return new URL(originalInput).hostname.replace(/^www\./, ''); } catch { return originalInput.slice(0, 40); }
    })() :
    originalInput.slice(0, 50);

  const searchUrl = buildSearchUrl(searchTarget, language);

  return (
    <div className={`${isSeniorMode ? 'mb-8' : 'mb-5'}`}>
      <h3 className={`font-bold text-white mb-3 flex items-center gap-2 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
        🔎 {t.title}
      </h3>

      {/* Warning box */}
      <div className={`bg-yellow-950/40 border border-yellow-700/60 rounded-xl ${isSeniorMode ? 'p-5 mb-4' : 'p-4 mb-3'}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className={`flex-shrink-0 text-yellow-400 mt-0.5 ${isSeniorMode ? 'w-7 h-7' : 'w-5 h-5'}`} />
          <div>
            <p className={`font-semibold text-yellow-300 ${isSeniorMode ? 'text-xl' : 'text-sm'}`}>
              {t.warning}
            </p>
            <p className={`text-yellow-200/70 mt-1 ${isSeniorMode ? 'text-lg' : 'text-xs'}`}>
              {t.warningDetail}
            </p>
          </div>
        </div>
      </div>

      {/* Official search shortcut */}
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-3 w-full bg-blue-900/30 hover:bg-blue-900/50 active:bg-blue-900/60 border border-blue-700/60 text-blue-200 rounded-xl transition-colors font-semibold ${isSeniorMode ? 'px-5 py-4 text-xl mb-4' : 'px-4 py-3 text-sm mb-3'}`}
      >
        <Search className={`flex-shrink-0 ${isSeniorMode ? 'w-6 h-6' : 'w-4 h-4'}`} />
        <span className="flex-1">{t.searchOfficialBtn}: "{searchTarget.slice(0, 30)}"</span>
        <ExternalLink className={`flex-shrink-0 opacity-60 ${isSeniorMode ? 'w-5 h-5' : 'w-3.5 h-3.5'}`} />
      </a>

      {/* Official resource shortcuts */}
      <p className={`text-gray-500 mb-2 ${isSeniorMode ? 'text-base' : 'text-xs'}`}>{t.shortcuts}</p>
      <div className="flex flex-col gap-2">
        {t.resources.map((res, i) => (
          <a
            key={i}
            href={res.url}
            target={res.url.startsWith('tel:') ? '_self' : '_blank'}
            rel="noopener noreferrer"
            className={`flex items-center gap-2 text-gray-300 hover:text-white active:text-gray-100 transition-colors ${isSeniorMode ? 'text-lg' : 'text-sm'}`}
          >
            <ExternalLink className={`flex-shrink-0 text-gray-500 ${isSeniorMode ? 'w-5 h-5' : 'w-3.5 h-3.5'}`} />
            {res.label}
          </a>
        ))}
      </div>
    </div>
  );
};

export default OfficialVerification;
