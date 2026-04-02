import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Users } from 'lucide-react';
import { CofactsResult, Language } from '../types';

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
    poweredBy: '查證資料取自「Cofacts 真的假的」社群協作查核，採 CC BY-SA 4.0 授權',
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
    poweredBy: 'Data from Cofacts crowd-sourced fact-checking, licensed under CC BY-SA 4.0',
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
    poweredBy: 'Dữ liệu từ cộng đồng Cofacts, giấy phép CC BY-SA 4.0',
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

      {/* Primary reply summary */}
      {primaryReply && (
        <div className="rounded-2xl border border-gray-700 bg-gray-950/60 p-4 text-sm text-gray-200 leading-relaxed mb-3">
          {primaryReply.text.slice(0, 300)}
          {primaryReply.text.length > 300 ? '...' : ''}
        </div>
      )}

      {/* View on Cofacts link */}
      <a
        href={`https://cofacts.tw/article/${primaryArticle.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mb-3"
      >
        <ExternalLink className="w-3 h-3" />
        {t.viewOnCofacts}
      </a>

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
                <div key={article.id} className="rounded-xl border border-gray-800 bg-gray-950/40 p-3">
                  <p className="text-xs text-gray-500 mb-2">
                    {article.text.slice(0, 100)}{article.text.length > 100 ? '...' : ''}
                  </p>
                  {article.replies.slice(0, 1).map((reply, i) => (
                    <div key={i} className="mt-1">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${VERDICT_STYLE[reply.type] || VERDICT_STYLE.NOT_ARTICLE}`}>
                        {getVerdictLabel(reply.type)}
                      </span>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        {reply.text.slice(0, 200)}{reply.text.length > 200 ? '...' : ''}
                      </p>
                    </div>
                  ))}
                  <a
                    href={`https://cofacts.tw/article/${article.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {t.viewOnCofacts}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attribution (CC BY-SA 4.0 required) */}
      <p className="text-xs text-gray-600 mt-3">
        {t.poweredBy}
        {' '}
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
