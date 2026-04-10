import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Users } from 'lucide-react';
import { CofactsResult, Language } from '../types';

/** Truncate text to at most the first two sentences. */
function truncateToSentences(text: string, maxSentences = 2): string {
  // Split on sentence-ending punctuation (Chinese and English)
  const sentenceEnd = /(?<=[。！？.!?])\s*/;
  const sentences = text.split(sentenceEnd).filter(Boolean);
  const truncated = sentences.slice(0, maxSentences).join('');
  return truncated.length < text.length ? `${truncated}⋯⋯` : truncated;
}

interface CofactsFindingsProps {
  cofacts: CofactsResult;
  language?: Language;
}

const LABELS = {
  'zh-TW': {
    title: '社群事實查核',
    subtitle: '來自 Cofacts 真的假的',
    matchCount: (n: number) => `在 Cofacts 資料庫中找到 ${n} 筆相似回報`,
    verdictRumor: '❌ 不實訊息',
    verdictNotRumor: '✅ 查證屬實',
    verdictOpinionated: '💬 含有個人意見',
    verdictNotArticle: '📝 非查核對象',
    showMore: '查看查核內容',
    hideMore: '收合查核內容',
    reportedOn: '回報日期',
    viewOnCofacts: '在 Cofacts 上查看',
    poweredBy: '以上資料取自「Cofacts 真的假的」訊息回報機器人與查證協作社群，採 CC BY-SA 4.0 授權提供。若欲補充資訊請訪問 Cofacts LINE bot',
    lineBotUrl: 'https://line.me/ti/p/@cofacts',
  },
  en: {
    title: 'Community Fact-Check',
    subtitle: 'via Cofacts',
    matchCount: (n: number) => `Found ${n} similar report(s) in Cofacts database`,
    verdictRumor: '❌ Rumor (False)',
    verdictNotRumor: '✅ Not a Rumor (True)',
    verdictOpinionated: '💬 Contains Opinion',
    verdictNotArticle: '📝 Not an Article',
    showMore: 'Show fact-check details',
    hideMore: 'Hide fact-check details',
    reportedOn: 'Reported on',
    viewOnCofacts: 'View on Cofacts',
    poweredBy: 'Data from Cofacts crowd-sourced fact-checking community and LINE bot, licensed under CC BY-SA 4.0. To contribute, visit Cofacts LINE bot',
    lineBotUrl: 'https://line.me/ti/p/@cofacts',
  },
  vi: {
    title: 'Kiểm tra sự thật cộng đồng',
    subtitle: 'qua Cofacts',
    matchCount: (n: number) => `Tìm thấy ${n} báo cáo tương tự trong Cofacts`,
    verdictRumor: '❌ Tin đồn (Sai)',
    verdictNotRumor: '✅ Không phải tin đồn (Đúng)',
    verdictOpinionated: '💬 Chứa ý kiến cá nhân',
    verdictNotArticle: '📝 Không phải bài viết',
    showMore: 'Xem chi tiết kiểm tra',
    hideMore: 'Ẩn chi tiết',
    reportedOn: 'Ngày báo cáo',
    viewOnCofacts: 'Xem trên Cofacts',
    poweredBy: 'Dữ liệu từ cộng đồng Cofacts và LINE bot, giấy phép CC BY-SA 4.0. Để đóng góp, hãy truy cập Cofacts LINE bot',
    lineBotUrl: 'https://line.me/ti/p/@cofacts',
  },
};

const VERDICT_STYLE: Record<string, string> = {
  RUMOR: 'border-red-700/50 bg-red-950/30 text-red-300',
  NOT_RUMOR: 'border-emerald-700/50 bg-emerald-950/30 text-emerald-300',
  OPINIONATED: 'border-yellow-700/50 bg-yellow-950/30 text-yellow-300',
  NOT_ARTICLE: 'border-gray-700 bg-gray-900 text-gray-400',
};

const CofactsFindings: React.FC<CofactsFindingsProps> = ({ cofacts, language = 'zh-TW' }) => {
  const [expanded, setExpanded] = useState(false);
  const t = LABELS[language];

  if (cofacts.status !== 'FOUND' || cofacts.articles.length === 0) return null;

  const articlesWithReplies = cofacts.articles.filter(a => a.replyCount > 0);
  if (articlesWithReplies.length === 0) return null;

  const getVerdictLabel = (type: string) => {
    switch (type) {
      case 'RUMOR': return t.verdictRumor;
      case 'NOT_RUMOR': return t.verdictNotRumor;
      case 'OPINIONATED': return t.verdictOpinionated;
      default: return t.verdictNotArticle;
    }
  };

  // Show the first article's primary verdict as the headline
  const primaryArticle = articlesWithReplies[0];
  const primaryReply = primaryArticle.replies[0];

  return (
    <section className="mb-6 rounded-3xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-white">{t.title}</h3>
        <span className="text-xs text-gray-500 ml-1">— {t.subtitle}</span>
      </div>

      {/* Match count */}
      <p className="text-sm text-gray-400 mb-3">{t.matchCount(cofacts.totalMatches)}</p>

      {/* Primary verdict badge */}
      {primaryReply && (
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium mb-4 ${VERDICT_STYLE[primaryReply.type] || VERDICT_STYLE.NOT_ARTICLE}`}>
          {getVerdictLabel(primaryReply.type)}
        </div>
      )}

      {/* Primary reply summary — entire block links to Cofacts */}
      {primaryReply && (
        <a
          href={`https://cofacts.tw/article/${primaryArticle.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl border border-gray-700 bg-gray-950/60 p-4 mb-3 hover:border-indigo-500/50 hover:bg-gray-950/80 transition-colors cursor-pointer group"
        >
          <p className="text-sm text-gray-200 leading-relaxed">
            {truncateToSentences(primaryReply.text)}
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs text-indigo-400 group-hover:text-indigo-300 mt-2">
            <ExternalLink className="w-3 h-3" />
            {t.viewOnCofacts}
          </span>
        </a>
      )}

      {/* Expandable: more articles */}
      {articlesWithReplies.length > 1 && (
        <div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mt-2"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? t.hideMore : t.showMore}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              {articlesWithReplies.slice(1, 4).map(article => (
                <a
                  key={article.id}
                  href={`https://cofacts.tw/article/${article.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-gray-800 bg-gray-950/40 p-3 hover:border-indigo-500/50 hover:bg-gray-950/60 transition-colors cursor-pointer group"
                >
                  <p className="text-xs text-gray-500 mb-2">
                    {truncateToSentences(article.text, 1)}
                  </p>
                  {article.replies.slice(0, 1).map((reply, i) => (
                    <div key={i} className="mt-1">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${VERDICT_STYLE[reply.type] || VERDICT_STYLE.NOT_ARTICLE}`}>
                        {getVerdictLabel(reply.type)}
                      </span>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        {truncateToSentences(reply.text)}
                      </p>
                    </div>
                  ))}
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-400 group-hover:text-indigo-300 mt-2">
                    <ExternalLink className="w-3 h-3" />
                    {t.viewOnCofacts}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attribution (CC BY-SA 4.0 required, with LINE bot link per Cofacts guidelines) */}
      <p className="text-xs text-gray-600 mt-3 leading-relaxed">
        {t.poweredBy}
        {' '}
        <a
          href={t.lineBotUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-indigo-500/70 hover:text-indigo-400"
        >
          @cofacts
        </a>
        {' · '}
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-400"
        >
          CC BY-SA 4.0
        </a>
      </p>
    </section>
  );
};

export default CofactsFindings;
