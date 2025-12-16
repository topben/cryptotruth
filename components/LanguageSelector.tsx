import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
];

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    // Update HTML lang attribute
    document.documentElement.lang = langCode;
  };

  const currentLang = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors text-sm"
        aria-label="Select language"
      >
        <Globe className="w-4 h-4 text-crypto-accent" />
        <span className="text-gray-300">{currentLang.flag} {currentLang.label}</span>
      </button>

      <div className="absolute right-0 mt-2 w-40 py-2 bg-gray-900 rounded-lg border border-gray-700 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors flex items-center gap-2 ${
              i18n.language === lang.code ? 'text-crypto-accent' : 'text-gray-300'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;
