import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { TruthGuardAnalysis, LoadingState, Language, InputType } from './types';
import { analyzeTruthGuard, APIError } from './services/geminiService';
import SearchInput from './components/SearchInput';
import TrustMeter from './components/TrustMeter';
import HistoryTimeline from './components/HistoryTimeline';
import ActionGuidance from './components/ActionGuidance';
import RiskSignals from './components/RiskSignals';
import { ShieldAlert, Activity, Search, Share2, Globe, CheckCircle2, AlertTriangle, Sparkles, ExternalLink, Accessibility, Eye } from 'lucide-react';

// UI Text dictionary for all static text
const UI_TEXT = {
  en: {
    appName: 'TruthGuard',
    appNameHighlight: 'AI',
    poweredBy: 'Powered by Google Gemini',
    seniorMode: 'Senior Mode',
    seniorModeOn: 'Easy Mode ON',
    seniorModeOff: 'Easy Mode OFF',
    hero: {
      title: 'Verify Before You',
      titleHighlight: 'Trust',
      description: 'AI-powered scam detection. Check suspicious messages, links, and accounts instantly.',
      descriptionSenior: 'Got a suspicious message? Paste it here and we\'ll tell you if it\'s safe!'
    },
    loading: {
      messages: [
        'Checking for scam patterns...',
        'Searching fraud databases...',
        'Analyzing content...',
        'Cross-referencing sources...',
        'Investigating red flags...',
        'Compiling safety report...'
      ],
      messagesSenior: [
        'Checking if it\'s safe...',
        'Looking for warning signs...',
        'Almost done...'
      ],
      wait: 'This usually takes 15-30 seconds',
      waitSenior: 'Please wait a moment...'
    },
    error: {
      title: 'Check Failed',
      titleSenior: 'Something Went Wrong',
      tooManyRequests: 'Too many requests. Please wait a moment and try again.',
      notFound: 'Could not find information. Please try again.',
      badRequest: 'Invalid input. Please check what you entered.',
      defaultMessage: 'An unexpected error occurred. Please try again.',
      defaultMessageSenior: 'We couldn\'t check this. Please try again or call 165 for help.'
    },
    common: {
      unknown: 'Unknown'
    },
    results: {
      shareOnX: 'Share on X',
      cachedAgo: '📦 Cached {time} ago',
      cachedResult: '📦 Cached Result',
      liveAnalysis: '🟢 Live Analysis',
      executiveSummary: 'Summary',
      executiveSummarySenior: 'Is This Safe?',
      detailedAnalysis: 'Detailed Analysis',
      credibilityFactors: 'Safe Signs',
      risksAndCriticisms: 'Warning Signs',
      noStrengths: 'No specific safe signs found',
      noRisks: 'No specific warnings found',
      trackRecord: 'History'
    },
    share: {
      tweetTemplate: 'I just checked this on TruthGuard AI!\n\n📊 {verdict}\n🔍 Safety Score: {score}/100\n\nCheck suspicious messages yourself:\nhttps://cryptotruth.news'
    },
    search: {
      newSearch: 'Check Another'
    },
    guidance: {
      advancedInfo: 'Want more details? Ask Gemini for a deeper analysis.',
      call165: 'Not sure? Call 165 (Taiwan Anti-Fraud Hotline) for free advice!'
    }
  },
  'zh-TW': {
    appName: 'TruthGuard',
    appNameHighlight: 'AI',
    poweredBy: '由 Google Gemini 提供技術支援',
    seniorMode: '長輩模式',
    seniorModeOn: '簡易模式 開啟',
    seniorModeOff: '簡易模式 關閉',
    hero: {
      title: '信任前，先',
      titleHighlight: '驗證',
      description: 'AI 驅動的防詐偵測。即時檢查可疑訊息、連結和帳號。',
      descriptionSenior: '收到可疑訊息？貼上來讓我們幫您檢查是否安全！'
    },
    loading: {
      messages: [
        '正在檢查詐騙特徵...',
        '搜尋詐騙資料庫...',
        '分析內容...',
        '交叉比對來源...',
        '調查危險訊號...',
        '整理安全報告...'
      ],
      messagesSenior: [
        '正在檢查是否安全...',
        '尋找警示訊號...',
        '快好了...'
      ],
      wait: '這通常需要 15-30 秒',
      waitSenior: '請稍等一下...'
    },
    error: {
      title: '檢查失敗',
      titleSenior: '出了點問題',
      tooManyRequests: '請求過於頻繁。請稍後再試。',
      notFound: '找不到相關資訊。請重試。',
      badRequest: '輸入無效。請確認您輸入的內容。',
      defaultMessage: '發生未預期的錯誤。請重試。',
      defaultMessageSenior: '我們無法檢查這個。請重試或撥打 165 尋求協助。'
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
      executiveSummarySenior: '這安全嗎？',
      detailedAnalysis: '詳細分析',
      credibilityFactors: '安全跡象',
      risksAndCriticisms: '警示訊號',
      noStrengths: '未發現特定安全跡象',
      noRisks: '未發現特定警示',
      trackRecord: '歷史紀錄'
    },
    share: {
      tweetTemplate: '我剛在 TruthGuard AI 查了這個！\n\n📊 {verdict}\n🔍 安全分數：{score}/100\n\n自己來查查可疑訊息：\nhttps://cryptotruth.news'
    },
    search: {
      newSearch: '再查一個'
    },
    guidance: {
      advancedInfo: '想要更詳細的分析？請 Gemini 提供更深入的調查。',
      call165: '不確定嗎？撥打 165（反詐騙專線）免費諮詢！'
    }
  }
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('zh-TW');
  const [loadingState, setLoadingState] = useState<LoadingState>('IDLE');
  const [analysis, setAnalysis] = useState<TruthGuardAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState<number>(0);
  const [isSeniorMode, setIsSeniorMode] = useState<boolean>(false);

  // Get current language text
  const t = UI_TEXT[language];

  // Get loading messages based on mode
  const loadingMessages = isSeniorMode ? t.loading.messagesSenior : t.loading.messages;

  // Cycle through loading messages
  useEffect(() => {
    if (loadingState === 'SEARCHING' || loadingState === 'ANALYZING') {
      const interval = setInterval(() => {
        setLoadingMessageIndex(Math.floor(Math.random() * loadingMessages.length));
      }, isSeniorMode ? 3000 : 2000);
      return () => clearInterval(interval);
    }
  }, [loadingState, loadingMessages.length, isSeniorMode]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh-TW' : 'en');
  };

  const toggleSeniorMode = () => {
    setIsSeniorMode(prev => !prev);
  };

  const handleSearch = async (input: string, inputType?: InputType, forceRefresh: boolean = false) => {
    setError(null);
    setAnalysis(null);
    setLoadingState('SEARCHING');
    setLoadingMessageIndex(0);

    // Artificial delay to show "searching" phase if API is too fast
    setTimeout(() => {
        if (loadingState === 'SEARCHING') setLoadingState('ANALYZING');
    }, 1500);

    try {
      // Use the new TruthGuard analysis function
      const result = await analyzeTruthGuard(input, inputType, language, forceRefresh);

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
            setError(isSeniorMode ? t.error.defaultMessageSenior : t.error.defaultMessage);
        }
      } else {
        setError(isSeniorMode ? t.error.defaultMessageSenior : t.error.defaultMessage);
      }

      setLoadingState('ERROR');
    }
  };

  const handleShareOnX = () => {
    if (!analysis) return;

    const verdict = analysis.verdict || `Safety Score: ${analysis.trustScore}/100`;
    const displayHandle = analysis.handle || analysis.originalInput?.substring(0, 30) || 'content';
    const tweetText = `⚠️ ${t.share.tweetTemplate
      .replace('{handle}', displayHandle)
      .replace('{verdict}', verdict)
      .replace('{score}', String(analysis.trustScore))} 👇`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  // Senior mode styles
  const seniorModeStyles = isSeniorMode ? {
    container: 'text-xl',
    heading: 'text-3xl md:text-4xl',
    text: 'text-xl',
  } : {
    container: '',
    heading: 'text-4xl md:text-6xl',
    text: 'text-lg',
  };

  return (
    <div className={`min-h-screen bg-crypto-dark text-crypto-text font-sans selection:bg-crypto-accent selection:text-crypto-dark pb-20 ${seniorModeStyles.container} ${isSeniorMode ? 'senior-mode' : ''}`}>
      <Analytics />

      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md bg-crypto-dark/80 border-b border-gray-800 ${isSeniorMode ? 'py-2' : ''}`}>
        <div className={`container mx-auto px-4 flex items-center justify-between ${isSeniorMode ? 'h-20' : 'h-16'}`}>
          <div className="flex items-center gap-2">
            <ShieldAlert className={`text-crypto-accent ${isSeniorMode ? 'w-8 h-8' : 'w-6 h-6'}`} />
            <span className={`font-display font-bold tracking-tight text-white ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
              {t.appName}<span className="text-crypto-accent">{t.appNameHighlight}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Senior Mode Toggle */}
            <button
              onClick={toggleSeniorMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                isSeniorMode
                  ? 'bg-green-600 hover:bg-green-500 border-green-500 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
              } ${isSeniorMode ? 'text-base px-4 py-2' : 'text-sm'}`}
            >
              <Accessibility className={isSeniorMode ? 'w-5 h-5' : 'w-4 h-4'} />
              <span className="hidden sm:inline">
                {isSeniorMode ? t.seniorModeOn : t.seniorModeOff}
              </span>
              <Eye className={`${isSeniorMode ? 'w-5 h-5' : 'w-4 h-4'} sm:hidden`} />
            </button>
            {/* Language Toggle Button */}
            <button
              onClick={toggleLanguage}
              className={`flex items-center gap-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors font-medium ${
                isSeniorMode ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm'
              }`}
            >
              <Globe className={isSeniorMode ? 'w-5 h-5 text-crypto-accent' : 'w-4 h-4 text-crypto-accent'} />
              <span className="text-white">{language === 'en' ? 'EN' : '繁中'}</span>
            </button>
            <div className="text-xs text-gray-500 font-mono hidden md:block">
              {t.poweredBy}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`container mx-auto px-4 ${isSeniorMode ? 'mt-8' : 'mt-12'}`}>

        {/* Hero / Search */}
        <div className={`transition-all duration-500 ease-in-out ${analysis ? 'mt-0' : isSeniorMode ? 'mt-10' : 'mt-20'}`}>
            <div className={`text-center ${isSeniorMode ? 'mb-8' : 'mb-10'}`}>
                <h1 className={`font-display font-bold text-white mb-4 ${seniorModeStyles.heading}`}>
                    {t.hero.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-crypto-accent to-blue-500">{t.hero.titleHighlight}</span>
                </h1>
                <p className={`text-gray-400 max-w-2xl mx-auto ${seniorModeStyles.text}`}>
                    {isSeniorMode ? t.hero.descriptionSenior : t.hero.description}
                </p>
            </div>

            <SearchInput
              onSearch={handleSearch}
              isLoading={loadingState === 'SEARCHING' || loadingState === 'ANALYZING'}
              language={language}
              isSeniorMode={isSeniorMode}
            />
        </div>

        {/* Loading State Overlay */}
        {(loadingState === 'SEARCHING' || loadingState === 'ANALYZING') && (
            <div className={`flex flex-col items-center justify-center ${isSeniorMode ? 'mt-16' : 'mt-20'}`}>
                <div className={`border-4 border-crypto-accent border-t-transparent rounded-full animate-spin mb-4 ${
                  isSeniorMode ? 'w-24 h-24' : 'w-16 h-16'
                }`}></div>
                <p className={`font-display text-crypto-accent animate-pulse ${isSeniorMode ? 'text-3xl' : 'text-xl'}`}>
                    {loadingMessages[loadingMessageIndex]}
                </p>
                <p className={`text-gray-500 mt-2 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
                  {isSeniorMode ? t.loading.waitSenior : t.loading.wait}
                </p>
            </div>
        )}

        {/* Error State */}
        {loadingState === 'ERROR' && (
             <div className={`max-w-2xl mx-auto mt-10 bg-red-900/20 border border-red-900 rounded-lg text-center ${
               isSeniorMode ? 'p-8' : 'p-6'
             }`}>
                <ShieldAlert className={`text-red-500 mx-auto mb-4 ${isSeniorMode ? 'w-16 h-16' : 'w-12 h-12'}`} />
                <h3 className={`font-bold text-red-400 mb-2 ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
                  {isSeniorMode ? t.error.titleSenior : t.error.title}
                </h3>
                <p className={`text-gray-400 ${isSeniorMode ? 'text-xl' : ''}`}>{error}</p>
                {isSeniorMode && (
                  <a
                    href="tel:165"
                    className="inline-flex items-center gap-2 mt-6 px-8 py-4 bg-red-600 hover:bg-red-500 text-white text-xl font-bold rounded-xl"
                  >
                    📞 {language === 'zh-TW' ? '撥打 165 求助' : 'Call 165 for Help'}
                  </a>
                )}
             </div>
        )}

        {/* Results View */}
        {analysis && loadingState === 'COMPLETED' && (
          <div className="animate-fade-in-up">

            {/* Senior Mode: Simple Summary First */}
            {isSeniorMode && analysis.seniorModeVerdict && (
              <div className={`mb-8 p-8 rounded-2xl border-2 text-center ${
                analysis.scamProbability >= 70
                  ? 'bg-red-900/30 border-red-500'
                  : analysis.scamProbability >= 40
                  ? 'bg-yellow-900/20 border-yellow-500'
                  : 'bg-green-900/20 border-green-500'
              }`}>
                <p className="text-3xl font-bold text-white mb-4">
                  {analysis.seniorModeVerdict}
                </p>
                {analysis.scamProbability >= 70 && (
                  <a
                    href="tel:165"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-red-600 hover:bg-red-500 text-white text-2xl font-bold rounded-2xl shadow-lg animate-pulse"
                  >
                    📞 165
                  </a>
                )}
              </div>
            )}

            {/* Action Guidance - Module C (Show prominently for high risk) */}
            {analysis.suggestedActions && analysis.suggestedActions.length > 0 && (
              <ActionGuidance
                actions={analysis.suggestedActions}
                scamProbability={analysis.scamProbability}
                language={language}
                isSeniorMode={isSeniorMode}
              />
            )}

            {/* Risk Signals - Module B (Explainable Evidence) */}
            {analysis.riskSignals && analysis.riskSignals.length > 0 && (
              <RiskSignals
                signals={analysis.riskSignals}
                language={language}
                isSeniorMode={isSeniorMode}
              />
            )}

            {/* Top Section: Profile + Trust Meter + Executive Summary */}
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 ${isSeniorMode ? 'mt-8' : 'mt-6'}`}>
                {/* Profile Info */}
                <div className={`lg:col-span-5 bg-crypto-card rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden ${
                  isSeniorMode ? 'p-8' : 'p-6'
                }`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Activity size={80} />
                    </div>

                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className={`font-bold text-white mb-1 ${isSeniorMode ? 'text-3xl' : 'text-2xl'}`}>
                              {analysis.inputType === 'HANDLE' ? `@${analysis.handle}` :
                               analysis.inputType === 'URL' ? '🔗 URL' :
                               '💬 ' + (language === 'zh-TW' ? '訊息' : 'Message')}
                            </h2>
                            <p className={`text-crypto-muted font-mono mb-4 ${isSeniorMode ? 'text-base' : 'text-sm'}`}>
                              {analysis.displayName}
                            </p>
                        </div>

                        {/* Identity Status Badge */}
                        {analysis.identityStatus === 'UNKNOWN_ENTITY' && (
                            <span className={`bg-gray-700 text-gray-300 px-2 py-1 rounded border border-gray-600 ${
                              isSeniorMode ? 'text-sm' : 'text-xs'
                            }`}>
                                ❓ {language === 'zh-TW' ? '身分未明' : 'Unknown'}
                            </span>
                        )}
                        {analysis.identityStatus === 'IMPERSONATOR' && (
                            <span className={`bg-red-900/50 text-red-400 px-2 py-1 rounded border border-red-800 animate-pulse ${
                              isSeniorMode ? 'text-sm' : 'text-xs'
                            }`}>
                                ⚠️ {language === 'zh-TW' ? '冒充者' : 'Fake'}
                            </span>
                        )}
                    </div>

                    <p className={`text-gray-300 leading-relaxed ${isSeniorMode ? 'text-lg' : ''}`}>
                        {analysis.bioSummary}
                    </p>

                    {/* Cache/Live Badge */}
                    {!isSeniorMode && (
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
                    )}
                </div>

                {/* Trust Meter */}
                <div className="lg:col-span-3">
                    <TrustMeter score={analysis.trustScore} language={language} />
                    {/* Share Button - Hide in senior mode */}
                    {!isSeniorMode && (
                      <button
                        onClick={handleShareOnX}
                        className="w-full mt-4 bg-gradient-to-r from-crypto-accent to-blue-500 hover:from-blue-500 hover:to-crypto-accent text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group"
                      >
                        <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        {t.results.shareOnX}
                      </button>
                    )}
                </div>

                {/* Executive Summary */}
                <div className={`lg:col-span-4 bg-gradient-to-br from-gray-900 to-crypto-card rounded-2xl border border-gray-700 shadow-2xl ${
                  isSeniorMode ? 'p-8' : 'p-6'
                }`}>
                    <h3 className={`font-bold text-white mb-4 flex items-center gap-2 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
                        <ShieldAlert className={isSeniorMode ? 'w-7 h-7 text-crypto-accent' : 'w-5 h-5 text-crypto-accent'} />
                        {isSeniorMode ? t.results.executiveSummarySenior : t.results.executiveSummary}
                    </h3>
                    {analysis.verdict && (
                      <p className={`text-gray-200 leading-relaxed font-medium ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
                        {analysis.verdict}
                      </p>
                    )}

                    {/* Guidance Banner */}
                    {!isSeniorMode ? (
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
                    ) : (
                      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded-xl">
                        <p className="text-lg text-blue-300">
                          💡 {t.guidance.call165}
                        </p>
                      </div>
                    )}
                </div>
            </div>

            {/* Detailed Analysis Section: Two Columns - Hide in Senior Mode */}
            {!isSeniorMode && (
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
            )}

            {/* Track Record Timeline - Hide in Senior Mode for SMS_TEXT type */}
            {!(isSeniorMode && analysis.inputType === 'SMS_TEXT') && analysis.history && analysis.history.length > 0 && (
              <div className={isSeniorMode ? 'mt-8' : ''}>
                  <HistoryTimeline
                    events={analysis.history}
                    title={t.results.trackRecord}
                    language={language}
                  />
              </div>
            )}

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
