import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { KOLAnalysis, LoadingState, Language } from './types';
import { analyzeKOLHandle, APIError } from './services/geminiService';
import SearchInput from './components/SearchInput';
import TrustMeter from './components/TrustMeter';
import HistoryTimeline from './components/HistoryTimeline';
import { ShieldAlert, Activity, Search, Share2, Globe, CheckCircle2, AlertTriangle, Sparkles, ExternalLink } from 'lucide-react';

// UI Text dictionary for all static text
const UI_TEXT = {
  en: {
    poweredBy: 'Powered by Google Gemini',
    hero: {
      title: 'Verify Before You',
      titleHighlight: 'Trust',
      description: 'AI-powered due diligence on crypto influencers. Uncover track records, controversies, and hidden red flags.'
    },
    loading: {
      messages: [
        'Scouring the blockchain...',
        'Checking track record...',
        'Analyzing social sentiment...',
        'Cross-referencing sources...',
        'Investigating controversies...',
        'Compiling findings...'
      ],
      wait: 'This usually takes 15-30 seconds'
    },
    error: {
      title: 'Analysis Failed',
      tooManyRequests: 'Too many requests. Please wait a moment and try again.',
      notFound: 'KOL not found. Please check the handle and try again.',
      badRequest: 'Invalid request. Please check the handle format.',
      defaultMessage: 'An unexpected error occurred. Please try again.'
    },
    common: {
      unknown: 'Unknown'
    },
    results: {
      shareOnX: 'Share on X',
      cachedAgo: '📦 Cached {time} ago',
      cachedResult: '📦 Cached Result',
      liveAnalysis: '🟢 Live Analysis',
      executiveSummary: 'Executive Summary',
      detailedAnalysis: 'Detailed Analysis',
      credibilityFactors: 'Credibility Factors',
      risksAndCriticisms: 'Risks & Criticisms',
      noStrengths: 'No specific credibility factors identified',
      noRisks: 'No specific risk factors identified',
      trackRecord: 'Track Record'
    },
    share: {
      tweetTemplate: 'I just checked @{handle} on CryptoTruth!\n\n📊 {verdict}\n🔍 Trust Score: {score}/100\n\nCheck any crypto KOL yourself:\nhttps://cryptotruth.news'
    },
    search: {
      newSearch: 'New Search'
    },
    guidance: {
      advancedInfo: 'Looking for deeper insights? Ask Gemini for a full investigative analysis based on this audit.'
    }
  },
  'zh-TW': {
    poweredBy: '由 Google Gemini 提供技術支援',
    hero: {
      title: '信任前，先',
      titleHighlight: '驗證',
      description: 'AI 驅動的加密貨幣意見領袖盡職調查。揭露歷史紀錄、爭議事件和隱藏的危險信號。'
    },
    loading: {
      messages: [
        '正在搜尋區塊鏈...',
        '檢查歷史紀錄...',
        '分析社群輿情...',
        '交叉比對來源...',
        '調查爭議事件...',
        '整理調查結果...'
      ],
      wait: '這通常需要 15-30 秒'
    },
    error: {
      title: '分析失敗',
      tooManyRequests: '請求過於頻繁。請稍後再試。',
      notFound: '找不到此 KOL。請確認帳號名稱後重試。',
      badRequest: '無效的請求。請確認帳號格式。',
      defaultMessage: '發生未預期的錯誤。請重試。'
    },
    common: {
      unknown: '未知'
    },
    results: {
      shareOnX: '分享到 X',
      cachedAgo: '📦 {time} 前快取',
      cachedResult: '📦 快取結果',
      liveAnalysis: '🟢 即時分析',
      executiveSummary: '總結摘要',
      detailedAnalysis: '詳細分析',
      credibilityFactors: '可信度因素',
      risksAndCriticisms: '風險與批評',
      noStrengths: '未識別出特定的可信度因素',
      noRisks: '未識別出特定的風險因素',
      trackRecord: '歷史紀錄'
    },
    share: {
      tweetTemplate: '我剛在 CryptoTruth 查了 @{handle}！\n\n📊 {verdict}\n🔍 信任分數：{score}/100\n\n自己來查查任何加密貨幣 KOL：\nhttps://cryptotruth.news'
    },
    search: {
      newSearch: '新搜尋'
    },
    guidance: {
      advancedInfo: '想要更深入的分析？請 Gemini 根據這份審核結果提供完整的調查報告。'
    }
  }
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('zh-TW');
  const [loadingState, setLoadingState] = useState<LoadingState>('IDLE');
  const [analysis, setAnalysis] = useState<KOLAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState<number>(0);

  // Get current language text
  const t = UI_TEXT[language];

  // Cycle through loading messages
  useEffect(() => {
    if (loadingState === 'SEARCHING' || loadingState === 'ANALYZING') {
      const interval = setInterval(() => {
        setLoadingMessageIndex(Math.floor(Math.random() * t.loading.messages.length));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loadingState, t.loading.messages.length]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh-TW' : 'en');
  };

  const handleSearch = async (handle: string, forceRefresh: boolean = false) => {
    setError(null);
    setAnalysis(null);
    setLoadingState('SEARCHING');
    setLoadingMessageIndex(0);

    // Artificial delay to show "searching" phase if API is too fast,
    // mostly to improve UX feeling of "scouring the web"
    setTimeout(() => {
        if (loadingState === 'SEARCHING') setLoadingState('ANALYZING');
    }, 1500);

    try {
      // Pass language and forceRefresh to API (server handles caching with Vercel Blob)
      const result = await analyzeKOLHandle(handle, language, forceRefresh);

      setAnalysis(result);
      setLoadingState('COMPLETED');
    } catch (err) {
      console.error(err);

      // Handle specific API error codes
      if (err instanceof APIError) {
        switch (err.statusCode) {
          case 429:
            setError(t.error.tooManyRequests);
            break;
          case 404:
            setError(t.error.notFound);
            break;
          case 400:
            setError(t.error.badRequest);
            break;
          default:
            setError(t.error.defaultMessage);
        }
      } else {
        setError(t.error.defaultMessage);
      }

      setLoadingState('ERROR');
    }
  };

  // DISABLED: Refresh functionality commented out
  // const handleRefresh = () => {
  //   if (analysis) {
  //     handleSearch(analysis.handle, true);
  //   }
  // };

  const handleShareOnX = () => {
    if (!analysis) return;

    const verdict = analysis.verdict || `Trust Score: ${analysis.trustScore}/100`;
    const tweetText = `⚠️ ${t.share.tweetTemplate
      .replace('{handle}', analysis.handle)
      .replace('{verdict}', verdict)
      .replace('{score}', String(analysis.trustScore))} 👇`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-crypto-dark text-crypto-text font-sans selection:bg-crypto-accent selection:text-crypto-dark pb-20">
      <Analytics />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-crypto-dark/80 border-b border-gray-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="text-crypto-accent w-6 h-6" />
            <span className="font-display font-bold text-xl tracking-tight text-white">Crypto<span className="text-crypto-accent">Truth</span></span>
          </div>
          <div className="flex items-center gap-4">
            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors text-sm font-medium"
            >
              <Globe className="w-4 h-4 text-crypto-accent" />
              <span className="text-white">{language === 'en' ? 'EN' : '繁中'}</span>
            </button>
            <div className="text-xs text-gray-500 font-mono hidden sm:block">
              {t.poweredBy}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 mt-12">

        {/* Hero / Search */}
        <div className={`transition-all duration-500 ease-in-out ${analysis ? 'mt-0' : 'mt-20'}`}>
            <div className="text-center mb-10">
                <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4">
                    {t.hero.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-crypto-accent to-blue-500">{t.hero.titleHighlight}</span>
                </h1>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                    {t.hero.description}
                </p>
            </div>

            <SearchInput
              onSearch={handleSearch}
              isLoading={loadingState === 'SEARCHING' || loadingState === 'ANALYZING'}
              language={language}
            />
        </div>

        {/* Loading State Overlay */}
        {(loadingState === 'SEARCHING' || loadingState === 'ANALYZING') && (
            <div className="flex flex-col items-center justify-center mt-20">
                <div className="w-16 h-16 border-4 border-crypto-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xl font-display text-crypto-accent animate-pulse">
                    {t.loading.messages[loadingMessageIndex]}
                </p>
                <p className="text-sm text-gray-500 mt-2">{t.loading.wait}</p>
            </div>
        )}

        {/* Error State */}
        {loadingState === 'ERROR' && (
             <div className="max-w-2xl mx-auto mt-10 p-6 bg-red-900/20 border border-red-900 rounded-lg text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-400 mb-2">{t.error.title}</h3>
                <p className="text-gray-400">{error}</p>
             </div>
        )}

        {/* Results View */}
        {analysis && loadingState === 'COMPLETED' && (
          <div className="animate-fade-in-up">

            {/* Top Section: Profile + Trust Meter + Executive Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                {/* Profile Info */}
                <div className="lg:col-span-5 bg-crypto-card p-6 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Activity size={80} />
                    </div>

                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">@{analysis.handle}</h2>
                            <p className="text-crypto-muted font-mono text-sm mb-4">{analysis.displayName}</p>
                        </div>

                        {/* Identity Status Badge */}
                        {analysis.identityStatus === 'UNKNOWN_ENTITY' && (
                            <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded border border-gray-600">
                                ❓ {language === 'zh-TW' ? '身分未明' : 'Unknown Entity'}
                            </span>
                        )}
                        {analysis.identityStatus === 'IMPERSONATOR' && (
                            <span className="bg-red-900/50 text-red-400 text-xs px-2 py-1 rounded border border-red-800 animate-pulse">
                                ⚠️ {language === 'zh-TW' ? '冒充者警示' : 'Impersonator'}
                            </span>
                        )}
                    </div>

                    <p className="text-gray-300 leading-relaxed">
                        {analysis.bioSummary}
                    </p>

                    {/* Cache/Live Badge */}
                    <div className="mt-4">
                      {analysis.source === 'cache' ? (
                        <div className="bg-blue-900/20 p-2 rounded-lg border border-blue-800 inline-block">
                          <span className="text-xs text-blue-400 font-medium">
                            {t.results.cachedResult}
                          </span>
                          {analysis.cachedAt && (
                            <span className="text-xs text-blue-500 ml-2">
                              {(() => {
                                const ageMs = Date.now() - analysis.cachedAt;
                                const ageMinutes = Math.round(ageMs / 1000 / 60);
                                const timeDisplay = ageMinutes < 60 ? `${ageMinutes}m` : `${Math.round(ageMinutes / 60)}h`;
                                return t.results.cachedAgo.replace('{time}', timeDisplay);
                              })()}
                            </span>
                          )}
                        </div>
                      ) : analysis.source === 'api' ? (
                        <div className="bg-green-900/20 p-2 rounded-lg border border-green-800 inline-block">
                          <span className="text-xs text-green-400 font-medium">
                            {t.results.liveAnalysis}
                          </span>
                        </div>
                      ) : null}
                    </div>
                </div>

                {/* Trust Meter */}
                <div className="lg:col-span-3">
                    <TrustMeter score={analysis.trustScore} language={language} />
                    {/* Share Button */}
                    <button
                      onClick={handleShareOnX}
                      className="w-full mt-4 bg-gradient-to-r from-crypto-accent to-blue-500 hover:from-blue-500 hover:to-crypto-accent text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group"
                    >
                      <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      {t.results.shareOnX}
                    </button>
                </div>

                {/* Executive Summary */}
                <div className="lg:col-span-4 bg-gradient-to-br from-gray-900 to-crypto-card p-6 rounded-2xl border border-gray-700 shadow-2xl">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-crypto-accent" />
                        {t.results.executiveSummary}
                    </h3>
                    {analysis.verdict && (
                      <p className="text-gray-200 leading-relaxed text-lg font-medium">
                        {analysis.verdict}
                      </p>
                    )}

                    {/* Guidance Banner - Link to Gemini */}
                    <a
                      href="https://gemini.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex items-start gap-3 p-3 bg-crypto-accent/5 border border-crypto-accent/20 rounded-lg hover:bg-crypto-accent/10 transition-colors group cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-crypto-accent mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">
                        {t.guidance.advancedInfo}
                      </span>
                      <ExternalLink className="w-4 h-4 text-crypto-accent mt-0.5 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </a>
                </div>
            </div>

            {/* Detailed Analysis Section: Two Columns */}
            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-6">{t.results.detailedAnalysis}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Credibility Factors */}
                    <div className="bg-crypto-card p-6 rounded-2xl border border-gray-800">
                        <h4 className="text-lg font-semibold text-crypto-success mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            {t.results.credibilityFactors}
                        </h4>
                        <ul className="space-y-3">
                            {analysis.credibilityStrengths && analysis.credibilityStrengths.length > 0 ? (
                              analysis.credibilityStrengths.map((strength, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-gray-300">
                                    <CheckCircle2 className="w-4 h-4 text-crypto-success mt-1 flex-shrink-0" />
                                    <span>{strength}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-gray-500 italic">{t.results.noStrengths}</li>
                            )}
                        </ul>
                    </div>

                    {/* Right Column: Risks & Criticisms */}
                    <div className="bg-crypto-card p-6 rounded-2xl border border-gray-800">
                        <h4 className="text-lg font-semibold text-orange-500 mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            {t.results.risksAndCriticisms}
                        </h4>
                        <ul className="space-y-3">
                            {analysis.riskFactors && analysis.riskFactors.length > 0 ? (
                              analysis.riskFactors.map((risk, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-gray-300">
                                    <AlertTriangle className="w-4 h-4 text-orange-500 mt-1 flex-shrink-0" />
                                    <span>{risk}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-gray-500 italic">{t.results.noRisks}</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Track Record Timeline */}
            <div>
                <HistoryTimeline
                  events={analysis.history}
                  title={t.results.trackRecord}
                  language={language}
                />
            </div>

          </div>
        )}
      </main>

      {/* Sticky Action (Mobile Only) usually, but kept generally for this layout */}
      {analysis && (
          <div className="fixed bottom-6 right-6 z-40 md:hidden">
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="bg-crypto-accent text-crypto-dark p-4 rounded-full shadow-lg font-bold flex items-center gap-2"
            >
                <Search size={20} /> {t.search.newSearch}
            </button>
          </div>
      )}

    </div>
  );
};

export default App;
