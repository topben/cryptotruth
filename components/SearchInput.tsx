import React, { useState } from 'react';
import { Search, Loader2, TrendingUp, AlertTriangle, Shield, Link, MessageSquare, AtSign, Phone } from 'lucide-react';
import { Language, InputType } from '../types';

type InputMode = 'HANDLE' | 'URL' | 'SMS_TEXT' | 'PHONE';

interface SearchInputProps {
  onSearch: (input: string, inputType?: InputType) => void;
  isLoading: boolean;
  language: Language;
  isSeniorMode?: boolean;
}

const TRANSLATIONS = {
  en: {
    placeholder: {
      HANDLE: 'Enter Twitter/X handle...',
      URL: 'Paste suspicious URL here...',
      SMS_TEXT: 'Paste suspicious message here...',
      PHONE: 'Enter phone number (e.g. +886912345678)...',
    },
    placeholderSenior: {
      HANDLE: 'Type the account name...',
      URL: 'Paste the link here...',
      SMS_TEXT: 'Paste the message here...',
      PHONE: 'Type the phone number here...',
    },
    scanning: 'Scanning...',
    scanningSenior: 'Checking...',
    audit: 'Check',
    auditSenior: 'Is This Safe?',
    inputModes: {
      HANDLE: 'Account',
      URL: 'Link',
      SMS_TEXT: 'Message',
      PHONE: 'Phone',
    },
    inputModesSenior: {
      HANDLE: 'Check Account',
      URL: 'Check Link',
      SMS_TEXT: 'Check Message',
      PHONE: 'Check Phone',
    },
    categories: {
      controversial: 'Controversial',
      investigators: 'Investigators',
      influencers: 'Influencers',
    },
    suggestedHandles: {
      zhusu: '3AC Co-founder',
      kyleLDavies: '3AC Co-founder',
      sbfFtx: 'FTX Founder',
      zachxbt: 'On-chain Sleuth',
      coffeebreak: 'Scam Investigator',
      cobie: 'Crypto Trader',
      pentosh1: 'Crypto Analyst',
      gainzy222: 'Trading Influencer',
    },
    exampleScams: {
      fakeInvestment: 'Fake Investment',
      phishingLink: 'Phishing Link',
    },
  },
  'zh-TW': {
    placeholder: {
      HANDLE: '輸入 Twitter/X 帳號...',
      URL: '貼上可疑網址...',
      SMS_TEXT: '貼上可疑訊息內容...',
      PHONE: '輸入電話號碼（如 0912345678）...',
    },
    placeholderSenior: {
      HANDLE: '請輸入帳號名稱...',
      URL: '請貼上網址連結...',
      SMS_TEXT: '請貼上收到的訊息...',
      PHONE: '請輸入電話號碼...',
    },
    scanning: '掃描中...',
    scanningSenior: '檢查中...',
    audit: '檢查',
    auditSenior: '這安全嗎？',
    inputModes: {
      HANDLE: '帳號',
      URL: '網址',
      SMS_TEXT: '訊息',
      PHONE: '電話',
    },
    inputModesSenior: {
      HANDLE: '查帳號',
      URL: '查網址',
      SMS_TEXT: '查訊息',
      PHONE: '查電話',
    },
    categories: {
      controversial: '爭議人物',
      investigators: '調查員',
      influencers: '意見領袖',
    },
    suggestedHandles: {
      zhusu: '3AC 聯合創辦人',
      kyleLDavies: '3AC 聯合創辦人',
      sbfFtx: 'FTX 創辦人',
      zachxbt: '鏈上偵探',
      coffeebreak: '詐騙調查員',
      cobie: '加密貨幣交易員',
      pentosh1: '加密貨幣分析師',
      gainzy222: '交易意見領袖',
    },
    exampleScams: {
      fakeInvestment: '假投資',
      phishingLink: '釣魚連結',
    },
  },
};

// Categorized interesting handles for quick search
const SUGGESTED_HANDLES = {
  controversial: [
    { handle: 'zhusu', label: 'Zhu Su', noteKey: 'zhusu' as const },
    { handle: 'KyleLDavies', label: 'Kyle Davies', noteKey: 'kyleLDavies' as const },
    { handle: 'SBF_FTX', label: 'SBF', noteKey: 'sbfFtx' as const },
  ],
  investigators: [
    { handle: 'zachxbt', label: 'ZachXBT', noteKey: 'zachxbt' as const },
    { handle: 'coffeebreak_YT', label: 'Coffeezilla', noteKey: 'coffeebreak' as const },
  ],
  influencers: [
    { handle: 'cobie', label: 'Cobie', noteKey: 'cobie' as const },
    { handle: 'pentosh1', label: 'Pentoshi', noteKey: 'pentosh1' as const },
    { handle: 'gainzy222', label: 'Gainzy', noteKey: 'gainzy222' as const },
  ]
};

const SearchInput: React.FC<SearchInputProps> = ({ onSearch, isLoading, language, isSeniorMode = false }) => {
  const t = TRANSLATIONS[language];
  const [input, setInput] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('HANDLE');
  const [activeCategory, setActiveCategory] = useState<'controversial' | 'investigators' | 'influencers'>('controversial');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input.trim(), inputMode);
    }
  };

  // Get appropriate placeholder
  const getPlaceholder = () => {
    const placeholders = isSeniorMode ? t.placeholderSenior : t.placeholder;
    return placeholders[inputMode];
  };

  // Get mode icon
  const getModeIcon = (mode: InputMode) => {
    const iconClass = isSeniorMode ? 'w-6 h-6' : 'w-4 h-4';
    switch (mode) {
      case 'HANDLE':
        return <AtSign className={iconClass} />;
      case 'URL':
        return <Link className={iconClass} />;
      case 'SMS_TEXT':
        return <MessageSquare className={iconClass} />;
      case 'PHONE':
        return <Phone className={iconClass} />;
    }
  };

  // Get input prefix display
  const getInputPrefix = () => {
    if (inputMode === 'HANDLE') {
      return <span className="font-mono text-crypto-accent">@</span>;
    }
    return getModeIcon(inputMode);
  };

  // Use tel input type for PHONE mode for better mobile UX
  const getInputType = () => inputMode === 'PHONE' ? 'tel' : 'text';

  return (
    <div className={`w-full mx-auto mb-12 ${isSeniorMode ? 'max-w-3xl' : 'max-w-2xl'}`}>
      {/* Input Mode Tabs */}
      <div className={`flex justify-center gap-2 mb-4 ${isSeniorMode ? 'gap-4' : ''}`}>
        {(['HANDLE', 'URL', 'SMS_TEXT', 'PHONE'] as InputMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setInputMode(mode);
              setInput('');
            }}
            className={`flex items-center gap-2 rounded-lg font-medium transition-all ${
              isSeniorMode
                ? 'px-6 py-4 text-lg'
                : 'px-4 py-2 text-sm'
            } ${
              inputMode === mode
                ? 'bg-crypto-accent text-crypto-dark'
                : 'bg-gray-800 text-gray-400 hover:text-gray-300 hover:bg-gray-700'
            }`}
          >
            {getModeIcon(mode)}
            <span>{isSeniorMode ? t.inputModesSenior[mode] : t.inputModes[mode]}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-0 bg-crypto-accent opacity-20 blur-xl group-hover:opacity-30 transition-opacity rounded-full"></div>

        {/* Text input for HANDLE, URL, and PHONE modes */}
        {inputMode !== 'SMS_TEXT' ? (
          <div className={`relative flex items-center bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden focus-within:border-crypto-accent transition-colors ${
            isSeniorMode ? 'rounded-2xl' : 'rounded-full'
          }`}>
            <div className={`text-gray-400 ${isSeniorMode ? 'pl-8' : 'pl-6'}`}>
              {getInputPrefix()}
            </div>
            <input
              type={getInputType()}
              className={`w-full bg-transparent text-white placeholder-gray-500 focus:outline-none font-sans ${
                isSeniorMode ? 'px-4 py-6 text-2xl' : 'px-2 py-4 text-lg'
              }`}
              placeholder={getPlaceholder()}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`bg-crypto-accent text-crypto-dark font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                isSeniorMode ? 'mr-3 px-8 py-4 rounded-xl text-xl' : 'mr-2 px-6 py-2 rounded-full'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className={`animate-spin ${isSeniorMode ? 'w-7 h-7' : 'w-5 h-5'}`} />
                  <span>{isSeniorMode ? t.scanningSenior : t.scanning}</span>
                </>
              ) : (
                <>
                  <Search className={isSeniorMode ? 'w-7 h-7' : 'w-5 h-5'} />
                  <span>{isSeniorMode ? t.auditSenior : t.audit}</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Textarea for SMS_TEXT mode */
          <div className={`relative bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden focus-within:border-crypto-accent transition-colors ${
            isSeniorMode ? 'rounded-2xl' : 'rounded-2xl'
          }`}>
            <textarea
              className={`w-full bg-transparent text-white placeholder-gray-500 focus:outline-none font-sans resize-none ${
                isSeniorMode ? 'p-6 text-xl min-h-[200px]' : 'p-4 text-lg min-h-[120px]'
              }`}
              placeholder={getPlaceholder()}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <div className={`flex justify-end border-t border-gray-800 ${isSeniorMode ? 'p-4' : 'p-3'}`}>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={`bg-crypto-accent text-crypto-dark font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  isSeniorMode ? 'px-8 py-4 rounded-xl text-xl' : 'px-6 py-2 rounded-full'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className={`animate-spin ${isSeniorMode ? 'w-7 h-7' : 'w-5 h-5'}`} />
                    <span>{isSeniorMode ? t.scanningSenior : t.scanning}</span>
                  </>
                ) : (
                  <>
                    <Search className={isSeniorMode ? 'w-7 h-7' : 'w-5 h-5'} />
                    <span>{isSeniorMode ? t.auditSenior : t.audit}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Category Tabs - Only show for HANDLE mode */}
      {inputMode === 'HANDLE' && !isSeniorMode && (
        <>
          <div className="flex justify-center gap-2 mt-6 mb-4">
            <button
              onClick={() => setActiveCategory('controversial')}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === 'controversial'
                  ? 'bg-red-900/30 text-red-400 border border-red-800'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              {t.categories.controversial}
            </button>
            <button
              onClick={() => setActiveCategory('investigators')}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === 'investigators'
                  ? 'bg-blue-900/30 text-blue-400 border border-blue-800'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-300'
              }`}
            >
              <Shield className="w-4 h-4" />
              {t.categories.investigators}
            </button>
            <button
              onClick={() => setActiveCategory('influencers')}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === 'influencers'
                  ? 'bg-green-900/30 text-green-400 border border-green-800'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-300'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              {t.categories.influencers}
            </button>
          </div>

          {/* Suggested Handles */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {SUGGESTED_HANDLES[activeCategory].map(({ handle, noteKey }) => (
              <button
                key={handle}
                onClick={() => {
                  setInput(handle);
                  onSearch(handle, 'HANDLE');
                }}
                className="group relative bg-gray-900/50 hover:bg-gray-800 border border-gray-700 hover:border-crypto-accent rounded-lg px-4 py-2 transition-all"
                disabled={isLoading}
              >
                <div className="flex flex-col items-start">
                  <span className="text-crypto-accent font-medium">@{handle}</span>
                  <span className="text-xs text-gray-500 group-hover:text-gray-400">{t.suggestedHandles[noteKey]}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Senior Mode - Simple Instructions */}
      {isSeniorMode && (
        <div className="mt-6 text-center">
          <p className="text-xl text-gray-300">
            {language === 'zh-TW'
              ? '收到可疑訊息、連結或電話？貼上來讓我們幫您檢查！'
              : 'Got a suspicious message, link, or phone number? Paste it here and we\'ll check it for you!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchInput;
