import React from 'react';
import { AgentVerification, Language, TrustLane } from '../types';

interface AgentFindingsProps {
  agent: AgentVerification;
  language?: Language;
}

const LANE_STYLE: Record<TrustLane, string> = {
  OBSERVED: 'border-emerald-700/50 bg-emerald-950/30 text-emerald-300',
  CORROBORATED: 'border-cyan-700/50 bg-cyan-950/30 text-cyan-300',
  MODEL_INFERENCE: 'border-blue-700/50 bg-blue-950/30 text-blue-300',
  UNVERIFIED: 'border-gray-700 bg-gray-900 text-gray-400',
};

const PAGE_STATUS_LABEL: Record<string, { zh: string; en: string; vi: string; style: string }> = {
  observed:        { zh: '✅ 已觀察',          en: '✅ Observed',         vi: '✅ Đã quan sát',      style: 'text-emerald-400' },
  not_found:       { zh: '🔴 頁面不存在 (404)', en: '🔴 Not found (404)',   vi: '🔴 Không tìm thấy',   style: 'text-red-400' },
  forbidden:       { zh: '🔴 存取被拒 (403)',   en: '🔴 Forbidden (403)',   vi: '🔴 Bị từ chối (403)', style: 'text-red-400' },
  server_error:    { zh: '🟠 伺服器錯誤',       en: '🟠 Server error',      vi: '🟠 Lỗi máy chủ',      style: 'text-orange-400' },
  bot_challenge:   { zh: '🟡 反爬蟲保護',       en: '🟡 Bot protection',    vi: '🟡 Bảo vệ bot',       style: 'text-yellow-400' },
  timeout:         { zh: '⏱ 連線逾時',          en: '⏱ Timeout',           vi: '⏱ Hết thời gian',     style: 'text-gray-400' },
  network_error:   { zh: '❌ 無法連線',          en: '❌ Network error',     vi: '❌ Lỗi mạng',          style: 'text-gray-400' },
  redirect_loop_or_too_many_hops: { zh: '🔄 重定向過多', en: '🔄 Too many redirects', vi: '🔄 Quá nhiều chuyển hướng', style: 'text-orange-400' },
};

const LABELS = {
  en: {
    title: 'Agent verification results',
    originalUrl: 'Original URL',
    redirectChain: 'Redirect chain',
    landing: 'Final landing page',
    pageTitle: 'Page title',
    pageStatus: 'Page status',
    httpStatus: 'HTTP status',
    asks: 'What the page asks you to do',
    observations: 'Risk observations',
    noAsks: 'No high-risk requests observed',
  },
  'zh-TW': {
    title: '我替你點開後，看到了這些事',
    originalUrl: '原始網址',
    redirectChain: '轉址過程',
    landing: '最終 landing page',
    pageTitle: '頁面標題',
    pageStatus: '頁面狀態',
    httpStatus: 'HTTP 狀態碼',
    asks: '它下一步想叫你做什麼',
    observations: '風險觀察',
    noAsks: '未觀察到高風險要求',
  },
  vi: {
    title: 'Kết quả xác minh của agent',
    originalUrl: 'URL gốc',
    redirectChain: 'Chuỗi chuyển hướng',
    landing: 'Trang đích cuối',
    pageTitle: 'Tiêu đề trang',
    pageStatus: 'Trạng thái trang',
    httpStatus: 'HTTP status',
    asks: 'Trang yêu cầu bạn làm gì',
    observations: 'Quan sát rủi ro',
    noAsks: 'Không phát hiện yêu cầu rủi ro cao',
  },
};

const AgentFindings: React.FC<AgentFindingsProps> = ({ agent, language = 'zh-TW' }) => {
  const t = LABELS[language];
  const lang = language === 'zh-TW' ? 'zh' : language === 'vi' ? 'vi' : 'en';

  const asksLabels: Record<string, { zh: string; en: string; vi: string }> = {
    login:   { zh: '登入',                    en: 'Login',              vi: 'Đăng nhập' },
    otp:     { zh: '提供 OTP',                en: 'OTP / 2FA code',     vi: 'Mã OTP' },
    payment: { zh: '付款',                    en: 'Payment',            vi: 'Thanh toán' },
    app:     { zh: '下載 App',                en: 'Download App',       vi: 'Tải App' },
    chat:    { zh: '加 LINE / Telegram / 外聊', en: 'Join external chat', vi: 'Chat ngoài' },
  };

  const asks = [
    agent.asksForLogin       && asksLabels.login[lang],
    agent.asksForOtp         && asksLabels.otp[lang],
    agent.asksForPayment     && asksLabels.payment[lang],
    agent.asksForAppDownload && asksLabels.app[lang],
    agent.asksToAddChat      && asksLabels.chat[lang],
  ].filter(Boolean) as string[];

  const pageStatusInfo = (agent as any).pageStatus
    ? PAGE_STATUS_LABEL[(agent as any).pageStatus] ?? null
    : null;

  return (
    <section className="mb-6 rounded-3xl border border-gray-800 bg-gray-900/60 p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">{t.title}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 text-sm text-gray-300">
          {/* Page status — most important signal, show first */}
          {pageStatusInfo && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-widest text-gray-500">{t.pageStatus}</div>
              <span className={`font-semibold ${pageStatusInfo.style}`}>
                {pageStatusInfo[lang]}
                {(agent as any).httpStatus && (agent as any).pageStatus !== 'observed' && (
                  <span className="ml-2 text-xs text-gray-500">({(agent as any).httpStatus})</span>
                )}
              </span>
            </div>
          )}
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-gray-500">{t.originalUrl}</div>
            <div className="break-all">{agent.originalUrl ?? 'N/A'}</div>
          </div>
          {agent.redirectChain.length > 1 && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-widest text-gray-500">{t.redirectChain}</div>
              <div className="space-y-1">
                {agent.redirectChain.map((item, idx) => (
                  <div key={`${item}-${idx}`} className="break-all rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-2 flex items-start gap-2">
                    <span className="text-gray-600 flex-shrink-0 text-xs mt-0.5">{idx + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {agent.finalLandingPage && agent.finalLandingPage !== agent.originalUrl && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-widest text-gray-500">{t.landing}</div>
              <div className="break-all">{agent.finalLandingPage}</div>
            </div>
          )}
          {agent.pageTitle && (
            <div>
              <div className="mb-1 text-xs uppercase tracking-widest text-gray-500">{t.pageTitle}</div>
              <div>{agent.pageTitle}</div>
            </div>
          )}
        </div>

        <div className="space-y-3 text-sm text-gray-300">
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-gray-500">{t.asks}</div>
            <div className="flex flex-wrap gap-2">
              {asks.length > 0 ? asks.map((ask) => (
                <span key={ask} className="rounded-full border border-orange-700/50 bg-orange-950/30 px-3 py-1 text-orange-200">
                  {ask}
                </span>
              )) : <span className="text-gray-500">{t.noAsks}</span>}
            </div>
          </div>

          {agent.visibleSummary && (
            <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-3 leading-relaxed text-gray-300">
              {agent.visibleSummary}
            </div>
          )}

          {agent.riskObservations.length > 0 && (
            <div>
              <div className="mb-2 text-xs uppercase tracking-widest text-gray-500">{t.observations}</div>
              <div className="flex flex-wrap gap-2">
                {agent.riskObservations.map((item) => (
                  <span key={`${item.label}-${item.value}`} className={`rounded-full border px-3 py-1 text-xs ${LANE_STYLE[item.lane]}`}>
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AgentFindings;
