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

const LABELS = {
  en: {
    title: 'Agent verification results',
    originalUrl: 'Original URL',
    redirectChain: 'Redirect chain',
    landing: 'Final landing page',
    pageTitle: 'Page title',
    asks: 'What the page asks you to do',
    observations: 'Risk observations',
  },
  'zh-TW': {
    title: '我替你點開後，看到了這些事',
    originalUrl: '原始網址',
    redirectChain: '轉址過程',
    landing: '最終 landing page',
    pageTitle: '頁面標題',
    asks: '它下一步想叫你做什麼',
    observations: '風險觀察',
  },
  vi: {
    title: 'Kết quả xác minh của agent',
    originalUrl: 'URL gốc',
    redirectChain: 'Chuỗi chuyển hướng',
    landing: 'Trang đích cuối',
    pageTitle: 'Tiêu đề trang',
    asks: 'Trang yêu cầu bạn làm gì',
    observations: 'Quan sát rủi ro',
  },
};

const AgentFindings: React.FC<AgentFindingsProps> = ({ agent, language = 'zh-TW' }) => {
  const t = LABELS[language];
  const asks = [
    agent.asksForLogin && '登入',
    agent.asksForOtp && '提供 OTP',
    agent.asksForPayment && '付款',
    agent.asksForAppDownload && '下載 App',
    agent.asksToAddChat && '加 LINE / Telegram / 外部聊天',
  ].filter(Boolean) as string[];

  return (
    <section className="mb-6 rounded-3xl border border-gray-800 bg-gray-900/60 p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">{t.title}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 text-sm text-gray-300">
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-gray-500">{t.originalUrl}</div>
            <div className="break-all">{agent.originalUrl ?? 'N/A'}</div>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-gray-500">{t.redirectChain}</div>
            <div className="space-y-1">
              {agent.redirectChain.length > 0 ? agent.redirectChain.map((item) => (
                <div key={item} className="break-all rounded-xl border border-gray-800 bg-gray-950/70 px-3 py-2">{item}</div>
              )) : <div className="text-gray-500">N/A</div>}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-gray-500">{t.landing}</div>
            <div className="break-all">{agent.finalLandingPage ?? 'N/A'}</div>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-gray-500">{t.pageTitle}</div>
            <div>{agent.pageTitle ?? 'N/A'}</div>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-300">
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-gray-500">{t.asks}</div>
            <div className="flex flex-wrap gap-2">
              {asks.length > 0 ? asks.map((ask) => (
                <span key={ask} className="rounded-full border border-orange-700/50 bg-orange-950/30 px-3 py-1 text-orange-200">
                  {ask}
                </span>
              )) : <span className="text-gray-500">未觀察到高風險要求</span>}
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
