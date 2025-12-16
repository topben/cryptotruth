import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Analytics } from '@vercel/analytics/react';
import { KOLAnalysis, LoadingState } from './types';
import { analyzeKOLHandle } from './services/geminiService';
import { getCachedAnalysis, setCachedAnalysis, getCacheAge } from './services/cacheService';
import SearchInput from './components/SearchInput';
import TrustMeter from './components/TrustMeter';
import HistoryTimeline from './components/HistoryTimeline';
import LanguageSelector from './components/LanguageSelector';
import { ShieldAlert, TrendingUp, TrendingDown, ExternalLink, Activity, Search, Share2, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const App: React.FC = () => {
  const { t } = useTranslation();
  const [loadingState, setLoadingState] = useState<LoadingState>('IDLE');
  const [analysis, setAnalysis] = useState<KOLAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState<number>(0);

  // Get loading messages from translations
  const loadingMessages = t('loading.messages', { returnObjects: true }) as string[];

  // Cycle through loading messages
  useEffect(() => {
    if (loadingState === 'SEARCHING' || loadingState === 'ANALYZING') {
      const interval = setInterval(() => {
        setLoadingMessageIndex(Math.floor(Math.random() * loadingMessages.length));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loadingState, loadingMessages.length]);

  const handleSearch = async (handle: string, forceRefresh: boolean = false) => {
    setError(null);
    setAnalysis(null);

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cached = getCachedAnalysis(handle);
      if (cached) {
        console.log(`Using cached data for ${handle}`);
        setAnalysis(cached);
        setLoadingState('COMPLETED');
        return;
      }
    }

    // No cache or force refresh - fetch from API
    setLoadingState('SEARCHING');
    setLoadingMessageIndex(0);

    // Artificial delay to show "searching" phase if API is too fast,
    // mostly to improve UX feeling of "scouring the web"
    setTimeout(() => {
        if (loadingState === 'SEARCHING') setLoadingState('ANALYZING');
    }, 1500);

    try {
      const result = await analyzeKOLHandle(handle);

      // Cache the result
      setCachedAnalysis(handle, result);

      setAnalysis(result);
      setLoadingState('COMPLETED');
    } catch (err) {
      console.error(err);
      setError(t('error.defaultMessage'));
      setLoadingState('ERROR');
    }
  };

  const handleRefresh = () => {
    if (analysis) {
      handleSearch(analysis.handle, true);
    }
  };

  const handleShareOnX = () => {
    if (!analysis) return;

    const verdict = analysis.verdict || `Trust Score: ${analysis.trustScore}/100`;
    const tweetText = `⚠️ ${t('share.tweetTemplate', {
      verdict,
      handle: analysis.handle,
      wins: analysis.totalWins,
      losses: analysis.totalLosses
    })} 👇`;

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
            <LanguageSelector />
            <div className="text-xs text-gray-500 font-mono hidden sm:block">
              {t('common.poweredBy')}
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
                    {t('hero.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-crypto-accent to-blue-500">{t('hero.titleHighlight')}</span>
                </h1>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                    {t('hero.description')}
                </p>
            </div>

            <SearchInput onSearch={handleSearch} isLoading={loadingState === 'SEARCHING' || loadingState === 'ANALYZING'} />
        </div>

        {/* Loading State Overlay */}
        {(loadingState === 'SEARCHING' || loadingState === 'ANALYZING') && (
            <div className="flex flex-col items-center justify-center mt-20">
                <div className="w-16 h-16 border-4 border-crypto-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xl font-display text-crypto-accent animate-pulse">
                    {loadingMessages[loadingMessageIndex]}
                </p>
                <p className="text-sm text-gray-500 mt-2">{t('loading.wait')}</p>
            </div>
        )}

        {/* Error State */}
        {loadingState === 'ERROR' && (
             <div className="max-w-2xl mx-auto mt-10 p-6 bg-red-900/20 border border-red-900 rounded-lg text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-400 mb-2">{t('error.title')}</h3>
                <p className="text-gray-400">{error}</p>
             </div>
        )}

        {/* Results View */}
        {analysis && loadingState === 'COMPLETED' && (
          <div className="animate-fade-in-up">

            {/* Top Profile Card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                {/* Profile Info */}
                <div className="md:col-span-8 bg-crypto-card p-8 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Activity size={100} />
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold text-white mb-1">@{analysis.handle}</h2>
                            <p className="text-crypto-muted font-mono text-sm mb-4">{analysis.displayName} • {analysis.followersCount || t('common.unknown')} {t('common.followers')}</p>
                            <p className="text-gray-300 leading-relaxed text-lg mb-6">
                                {analysis.bioSummary}
                            </p>

                            <div className="flex gap-4">
                                <div className="bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-700">
                                    <span className="block text-xs text-gray-500 uppercase">{t('results.goodReports')}</span>
                                    <span className="text-xl font-bold text-crypto-success flex items-center gap-1">
                                        <TrendingUp size={16} /> {analysis.totalWins}
                                    </span>
                                </div>
                                <div className="bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-700">
                                    <span className="block text-xs text-gray-500 uppercase">{t('results.negativeFindings')}</span>
                                    <span className="text-xl font-bold text-crypto-danger flex items-center gap-1">
                                        <TrendingDown size={16} /> {analysis.totalLosses}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trust Meter */}
                <div className="md:col-span-4 flex flex-col gap-4">
                    <TrustMeter score={analysis.trustScore} />

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      {/* Share on X Button */}
                      <button
                        onClick={handleShareOnX}
                        className="bg-gradient-to-r from-crypto-accent to-blue-500 hover:from-blue-500 hover:to-crypto-accent text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group"
                      >
                        <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        {t('results.shareOnX')}
                      </button>

                      {/* Refresh Button */}
                      <button
                        onClick={handleRefresh}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2 px-4 rounded-xl border border-gray-700 transition-all duration-300 flex items-center justify-center gap-2 group"
                        title={t('results.refreshAnalysis')}
                      >
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        {t('results.refreshAnalysis')}
                      </button>
                    </div>

                    {/* Cache Info */}
                    {(() => {
                      const cacheAge = getCacheAge(analysis.handle);
                      if (cacheAge !== null && cacheAge < 24 * 60) {
                        const timeDisplay = cacheAge < 60 ? `${cacheAge}m` : `${Math.round(cacheAge / 60)}h`;
                        return (
                          <div className="bg-blue-900/20 p-3 rounded-xl border border-blue-800 text-center">
                            <p className="text-xs text-blue-400">
                              📦 {t('results.cachedAgo', { time: timeDisplay })}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Verdict Display */}
                    {analysis.verdict && (
                      <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                        <h4 className="text-xs text-gray-500 uppercase mb-2">{t('results.verdict')}</h4>
                        <p className="text-white font-medium leading-relaxed">{analysis.verdict}</p>
                      </div>
                    )}
                </div>
            </div>

            {/* Charts & Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Stats */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-crypto-card p-6 rounded-2xl border border-gray-800">
                        <h3 className="text-lg font-bold text-white mb-6">{t('results.reportRatio')}</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: t('results.goodReports'), value: analysis.totalWins, color: '#2ecc71' },
                                    { name: t('results.negativeFindings'), value: analysis.totalLosses, color: '#e74c3c' }
                                ]}>
                                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis hide />
                                    <Tooltip
                                        cursor={{fill: 'transparent'}}
                                        contentStyle={{ backgroundColor: '#1F2833', borderColor: '#374151', color: '#fff' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {
                                          [{ name: t('results.goodReports'), color: '#2ecc71' }, { name: t('results.negativeFindings'), color: '#e74c3c' }].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                          ))
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Sources */}
                    <div className="bg-crypto-card p-6 rounded-2xl border border-gray-800">
                        <h3 className="text-lg font-bold text-white mb-4">{t('results.evidenceSources')}</h3>
                        <ul className="space-y-3">
                            {analysis.sources.slice(0, 5).map((source, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm group">
                                    <ExternalLink className="w-4 h-4 text-crypto-muted mt-0.5 flex-shrink-0" />
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-crypto-accent truncate transition-colors"
                                    >
                                        {source.title}
                                    </a>
                                </li>
                            ))}
                            {analysis.sources.length === 0 && (
                                <li className="text-gray-500 italic">{t('results.noSources')}</li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Right Column: Timeline */}
                <div className="lg:col-span-2">
                    <HistoryTimeline events={analysis.history} />
                </div>
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
                <Search size={20} /> {t('search.newSearch')}
            </button>
          </div>
      )}

    </div>
  );
};

export default App;
