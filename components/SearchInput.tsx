import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, AtSign, Link, Phone, MessageSquare, ImagePlus, X } from 'lucide-react';
import { Language, InputType } from '../types';

type InputMode = 'HANDLE' | 'URL' | 'SMS_TEXT' | 'PHONE';

interface SearchInputProps {
  onSearch: (input: string, inputType?: InputType, imageData?: { base64: string; mediaType: string }) => void;
  isLoading: boolean;
  language: Language;
  isSeniorMode?: boolean;
}

const TRANSLATIONS = {
  en: {
    placeholder: 'Paste a link, phone number, @handle, or suspicious message...',
    placeholderSenior: 'Paste any suspicious link, phone number, or message here...',
    scanning: 'Scanning...',
    scanningSenior: 'Checking...',
    audit: 'Check',
    auditSenior: 'Is This Safe?',
    detected: {
      HANDLE: 'Account',
      URL: 'Link',
      SMS_TEXT: 'Message',
      PHONE: 'Phone Number',
    },
    detectedLabel: 'Detected:',
    scenarioHint: 'Common scam scenarios — click to try an example:',
    uploadImage: 'Upload Screenshot',
    imageReady: 'Screenshot ready — click Check to analyze',
    pasteImage: 'or paste a screenshot (Ctrl+V)',
  },
  'zh-TW': {
    placeholder: '貼上網址、電話號碼、@帳號或可疑訊息...',
    placeholderSenior: '把可疑的連結、電話號碼或訊息貼在這裡...',
    scanning: '掃描中...',
    scanningSenior: '檢查中...',
    audit: '檢查',
    auditSenior: '這安全嗎？',
    detected: {
      HANDLE: '帳號',
      URL: '網址',
      SMS_TEXT: '訊息',
      PHONE: '電話號碼',
    },
    detectedLabel: '偵測到：',
    scenarioHint: '常見詐騙情境，點擊體驗範例：',
    uploadImage: '上傳截圖',
    imageReady: '截圖已就緒，點擊「檢查」開始分析',
    pasteImage: '或直接貼上截圖（Ctrl+V）',
  },
};

// Scenario chips — each fills the input with a representative example
const SCENARIO_CHIPS: Array<{
  id: string;
  icon: string;
  label: { en: string; 'zh-TW': string };
  sample: string;
}> = [
  {
    id: 'social_ad',
    icon: '📢',
    label: { en: 'Social Media Ad', 'zh-TW': '社群廣告' },
    sample: 'https://bit.ly/3invest-now-crypto',
  },
  {
    id: 'celeb_invest',
    icon: '💰',
    label: { en: 'Fake Celebrity Investment', 'zh-TW': '假名人投資' },
    sample: '馬斯克推薦：每月保證30%報酬！立即點擊加入 https://elon-crypto-tw.com',
  },
  {
    id: 'customer_service',
    icon: '📞',
    label: { en: 'Fake Customer Service', 'zh-TW': '客服詐騙' },
    sample: '您好，我是台灣銀行客服，您的帳戶出現異常交易，請立即撥打 02-1234-5678 處理',
  },
  {
    id: 'phishing_sms',
    icon: '📩',
    label: { en: 'Phishing SMS', 'zh-TW': '釣魚簡訊' },
    sample: '您的包裹無法投遞，請點擊更新地址：https://post-tw-delivery.net/verify',
  },
  {
    id: 'fake_account',
    icon: '🎭',
    label: { en: 'Fake Official Account', 'zh-TW': '假官方帳號' },
    sample: '@TaiwanBank_Official',
  },
  {
    id: 'fake_giveaway',
    icon: '🎁',
    label: { en: 'Fake Giveaway', 'zh-TW': '假抽獎/假活動' },
    sample: '恭喜您中獎！請點擊領取 iPhone 15：https://apple-lucky-tw.com/prize',
  },
];

const detectInputType = (value: string): InputMode => {
  const trimmed = value.trim();
  if (!trimmed) return 'SMS_TEXT';

  // Phone: starts with + or digits only, 7–15 digits, short
  const digitsOnly = trimmed.replace(/[\s\-+()\u200b]/g, '');
  if (
    /^[+\d][\d\s\-()]+$/.test(trimmed) &&
    digitsOnly.length >= 7 &&
    digitsOnly.length <= 15
  ) {
    return 'PHONE';
  }

  // URL: starts with http(s):// or www.
  if (/^(https?:\/\/|www\.)/i.test(trimmed)) {
    return 'URL';
  }

  // Handle: starts with @ or short pure alphanumeric/underscore
  if (trimmed.startsWith('@') || /^[a-zA-Z0-9_]{3,15}$/.test(trimmed)) {
    return 'HANDLE';
  }

  return 'SMS_TEXT';
};

const getModeIcon = (mode: InputMode, className: string) => {
  switch (mode) {
    case 'HANDLE': return <AtSign className={className} />;
    case 'URL':    return <Link className={className} />;
    case 'SMS_TEXT': return <MessageSquare className={className} />;
    case 'PHONE':  return <Phone className={className} />;
  }
};

const DETECTED_COLORS: Record<InputMode, string> = {
  HANDLE: 'text-crypto-accent border-crypto-accent/40 bg-crypto-accent/10',
  URL:    'text-blue-400 border-blue-400/40 bg-blue-400/10',
  SMS_TEXT: 'text-purple-400 border-purple-400/40 bg-purple-400/10',
  PHONE:  'text-green-400 border-green-400/40 bg-green-400/10',
};

const SearchInput: React.FC<SearchInputProps> = ({ onSearch, isLoading, language, isSeniorMode = false }) => {
  const t = TRANSLATIONS[language];
  const [input, setInput] = useState('');
  const [image, setImage] = useState<{ dataUrl: string; base64: string; mediaType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const originalDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1920;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
          else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (dataUrl.length > 5_400_000) dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        const base64 = dataUrl.split(',')[1];
        setImage({ dataUrl, base64, mediaType: 'image/jpeg' });
        setInput('');
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle paste events (image paste via Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) { loadImageFile(file); e.preventDefault(); }
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [loadImageFile]);

  // Debounced type — only updates 600ms after user stops typing (no badge flicker)
  const [displayedType, setDisplayedType] = useState<InputMode | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim()) {
      setDisplayedType(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDisplayedType(detectInputType(input));
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input]);

  // For layout decisions (textarea), use long-text heuristic only — no type flicker
  const isLongText = input.length > 80 || input.includes('\n');
  const useTextarea = isLongText || (displayedType === 'SMS_TEXT' && input.trim().length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (image) {
      onSearch('[screenshot]', 'IMAGE', { base64: image.base64, mediaType: image.mediaType });
      return;
    }
    if (!input.trim()) return;
    // Detect at submit time for accuracy (not the debounced display value)
    const finalType = detectInputType(input);
    const value = finalType === 'HANDLE' && input.trim().startsWith('@')
      ? input.trim().slice(1)
      : input.trim();
    onSearch(value, finalType);
  };

  const placeholder = isSeniorMode ? t.placeholderSenior : t.placeholder;

  const submitButton = (extraClass = '') => (
    <button
      type="submit"
      disabled={isLoading || (!input.trim() && !image)}
      className={`bg-crypto-accent text-crypto-dark font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
        isSeniorMode ? 'px-8 py-4 rounded-xl text-xl' : 'px-6 py-2 rounded-full'
      } ${extraClass}`}
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
  );

  return (
    <div className={`w-full mx-auto mb-12 ${isSeniorMode ? 'max-w-3xl' : 'max-w-2xl'}`}>
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImageFile(f); e.target.value = ''; }}
      />

      {/* Image preview — shown when an image is loaded */}
      {image && (
        <div className="relative mb-3 rounded-2xl overflow-hidden border border-crypto-accent/40 bg-gray-900">
          <img src={image.dataUrl} alt="screenshot preview" className="w-full max-h-64 object-contain" />
          <button
            type="button"
            onClick={() => setImage(null)}
            className="absolute top-2 right-2 bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white rounded-full p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-center text-xs text-crypto-accent py-2">{t.imageReady}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-0 bg-crypto-accent opacity-20 blur-xl group-hover:opacity-30 transition-opacity rounded-full pointer-events-none"></div>

        {useTextarea ? (
          <div className={`relative bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden focus-within:border-crypto-accent transition-colors rounded-2xl`}>
            <textarea
              className={`w-full bg-transparent text-white placeholder-gray-500 focus:outline-none font-sans resize-none ${
                isSeniorMode ? 'p-6 text-xl min-h-[200px]' : 'p-4 text-lg min-h-[120px]'
              }`}
              placeholder={placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <div className={`flex justify-end border-t border-gray-800 ${isSeniorMode ? 'p-4' : 'p-3'}`}>
              {submitButton()}
            </div>
          </div>
        ) : (
          <div className={`relative flex items-center bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden focus-within:border-crypto-accent transition-colors ${
            isSeniorMode ? 'rounded-2xl' : 'rounded-full'
          }`}>
            <div className={`text-gray-400 ${isSeniorMode ? 'pl-8' : 'pl-6'}`}>
              {input.trim() && displayedType
                ? getModeIcon(displayedType, isSeniorMode ? 'w-6 h-6' : 'w-4 h-4')
                : <Search className={isSeniorMode ? 'w-6 h-6' : 'w-4 h-4'} />
              }
            </div>
            <input
              type="text"
              className={`w-full bg-transparent text-white placeholder-gray-500 focus:outline-none font-sans ${
                isSeniorMode ? 'px-4 py-6 text-2xl' : 'px-2 py-4 text-lg'
              }`}
              placeholder={placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title={t.uploadImage}
              className={`text-gray-400 hover:text-crypto-accent transition-colors disabled:opacity-40 flex-shrink-0 ${isSeniorMode ? 'pr-3' : 'pr-2'}`}
            >
              <ImagePlus className={isSeniorMode ? 'w-6 h-6' : 'w-5 h-5'} />
            </button>
            {submitButton(isSeniorMode ? 'mr-3' : 'mr-2')}
          </div>
        )}
      </form>

      {/* Paste hint — shown when no image and no input */}
      {!image && !input.trim() && !isSeniorMode && (
        <p className="text-center text-xs text-gray-600 mt-2">{t.pasteImage}</p>
      )}

      {/* Detected Type Badge — only shown after debounce (600ms after user stops typing) */}
      {displayedType && input.trim() && (
        <div className="flex justify-center mt-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all ${DETECTED_COLORS[displayedType]}`}>
            {getModeIcon(displayedType, 'w-3 h-3')}
            {t.detectedLabel} {t.detected[displayedType]}
          </span>
        </div>
      )}

      {/* Scenario Chips — only when input is empty and not senior mode */}
      {!input.trim() && !isSeniorMode && (
        <>
          <p className="text-center text-xs text-gray-500 mt-6 mb-3">{t.scenarioHint}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SCENARIO_CHIPS.map(({ id, icon, label, sample }) => (
              <button
                key={id}
                onClick={() => setInput(sample)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/80 hover:bg-gray-700 border border-gray-700 hover:border-crypto-accent/50 text-sm text-gray-300 hover:text-white transition-all"
                disabled={isLoading}
              >
                <span>{icon}</span>
                <span>{label[language]}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Senior Mode hint */}
      {isSeniorMode && !input.trim() && (
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
