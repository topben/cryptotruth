import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, AtSign, Link, Phone, MessageSquare, ImagePlus, FileText, X, ScanText } from 'lucide-react';
import { Language, InputType } from '../types';
import { createWorker } from 'tesseract.js';

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
    uploadTxt: 'Upload .txt file',
    imageReady: 'Screenshot ready — click Check to analyze',
    txtReady: '{name} loaded — click Check to analyze',
    pasteImage: 'or paste a screenshot (Ctrl+V) · or upload a .txt file',
    txtTooLarge: 'File too large — showing first 50,000 characters',
    ocrRunning: 'Reading text from screenshot...',
    ocrDone: 'Text extracted — ready to check',
    ocrFailed: 'Could not read text — please type it manually',
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
    uploadTxt: '上傳 .txt 文字檔',
    imageReady: '截圖已就緒，點擊「檢查」開始分析',
    txtReady: '已載入 {name}，點擊「檢查」開始分析',
    pasteImage: '或直接貼上截圖（Ctrl+V）· 或上傳 .txt 檔案',
    txtTooLarge: '檔案過大，僅顯示前 50,000 字元',
    ocrRunning: '正在辨識截圖文字...',
    ocrDone: '文字已擷取，可以開始檢查',
    ocrFailed: '無法辨識文字，請手動輸入',
  },
  vi: {
    placeholder: 'Dán liên kết, số điện thoại, @tài khoản hoặc tin nhắn đáng ngờ...',
    placeholderSenior: 'Dán bất kỳ liên kết, số điện thoại hoặc tin nhắn đáng ngờ vào đây...',
    scanning: 'Đang quét...',
    scanningSenior: 'Đang kiểm tra...',
    audit: 'Kiểm tra',
    auditSenior: 'Có an toàn không?',
    detected: {
      HANDLE: 'Tài khoản',
      URL: 'Liên kết',
      SMS_TEXT: 'Tin nhắn',
      PHONE: 'Số điện thoại',
    },
    detectedLabel: 'Phát hiện:',
    scenarioHint: 'Các tình huống lừa đảo phổ biến — nhấn để thử ví dụ:',
    uploadImage: 'Tải ảnh chụp màn hình',
    uploadTxt: 'Tải file .txt',
    imageReady: 'Ảnh chụp màn hình đã sẵn sàng — nhấn Kiểm tra để phân tích',
    txtReady: 'Đã tải {name} — nhấn Kiểm tra để phân tích',
    pasteImage: 'hoặc dán ảnh chụp màn hình (Ctrl+V) · hoặc tải file .txt',
    txtTooLarge: 'File quá lớn — chỉ hiển thị 50.000 ký tự đầu tiên',
    ocrRunning: 'Đang đọc văn bản từ ảnh chụp màn hình...',
    ocrDone: 'Đã trích xuất văn bản — sẵn sàng kiểm tra',
    ocrFailed: 'Không thể đọc văn bản — vui lòng nhập thủ công',
  },
};

// Scenario chips — each fills the input with a representative example
const SCENARIO_CHIPS: Array<{
  id: string;
  icon: string;
  label: { en: string; 'zh-TW': string; vi: string };
  sample: string;
}> = [
  {
    id: 'social_ad',
    icon: '📢',
    label: { en: 'Social Media Ad', 'zh-TW': '社群廣告', vi: 'Quảng cáo mạng xã hội' },
    sample: 'https://bit.ly/3invest-now-crypto',
  },
  {
    id: 'celeb_invest',
    icon: '💰',
    label: { en: 'Fake Celebrity Investment', 'zh-TW': '假名人投資', vi: 'Đầu tư giả người nổi tiếng' },
    sample: '馬斯克推薦：每月保證30%報酬！立即點擊加入 https://elon-crypto-tw.com',
  },
  {
    id: 'customer_service',
    icon: '📞',
    label: { en: 'Fake Customer Service', 'zh-TW': '客服詐騙', vi: 'Giả nhân viên hỗ trợ' },
    sample: '您好，我是台灣銀行客服，您的帳戶出現異常交易，請立即撥打 02-1234-5678 處理',
  },
  {
    id: 'phishing_sms',
    icon: '📩',
    label: { en: 'Phishing SMS', 'zh-TW': '釣魚簡訊', vi: 'SMS lừa đảo' },
    sample: '您的包裹無法投遞，請點擊更新地址：https://post-tw-delivery.net/verify',
  },
  {
    id: 'fake_account',
    icon: '🎭',
    label: { en: 'Fake Official Account', 'zh-TW': '假官方帳號', vi: 'Tài khoản chính thức giả' },
    sample: '@TaiwanBank_Official',
  },
  {
    id: 'fake_giveaway',
    icon: '🎁',
    label: { en: 'Fake Giveaway', 'zh-TW': '假抽獎/假活動', vi: 'Quà tặng/sự kiện giả' },
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

const MAX_TXT_CHARS = 50_000;

const SearchInput: React.FC<SearchInputProps> = ({ onSearch, isLoading, language, isSeniorMode = false }) => {
  const t = TRANSLATIONS[language];
  const [input, setInput] = useState('');
  const [image, setImage] = useState<{ dataUrl: string; base64: string; mediaType: string } | null>(null);
  const [txtFileName, setTxtFileName] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const txtInputRef = useRef<HTMLInputElement>(null);

  const loadTextFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') return;
    const reader = new FileReader();
    reader.onload = (e) => {
      let text = (e.target?.result as string) ?? '';
      if (text.length > MAX_TXT_CHARS) {
        text = text.slice(0, MAX_TXT_CHARS);
        // small non-blocking toast via console — actual notice shown via txtTooLarge translation
      }
      setInput(text);
      setImage(null);
      setTxtFileName(file.name);
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  const loadImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const originalDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = async () => {
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
        setTxtFileName(null);
        setOcrStatus('running');

        try {
          const langs = language === 'vi' ? 'vie+eng' : 'chi_tra+eng';
          const worker = await createWorker(langs);
          const { data } = await worker.recognize(dataUrl);
          await worker.terminate();
          const extracted = data.text.trim();
          if (extracted.length > 10) {
            setInput(extracted);
            setImage(null);
            setOcrStatus('done');
          } else {
            setOcrStatus('failed');
          }
        } catch {
          setOcrStatus('failed');
        }
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  }, [language]);

  // Handle paste events (image paste via Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) { loadImageFile(file); e.preventDefault(); }
          return;
        }
        if (item.type === 'text/plain') {
          // plain text pastes are handled natively by the input/textarea
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
    if (ocrStatus === 'running') return;
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
      disabled={isLoading || ocrStatus === 'running' || (!input.trim() && !image)}
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
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { loadImageFile(f); setTxtFileName(null); } e.target.value = ''; }}
      />

      {/* Image preview — shown while OCR is running */}
      {image && (
        <div className="relative mb-3 rounded-2xl overflow-hidden border border-crypto-accent/40 bg-gray-900">
          <img src={image.dataUrl} alt="screenshot preview" className="w-full max-h-64 object-contain" />
          {ocrStatus !== 'running' && (
            <button
              type="button"
              onClick={() => { setImage(null); setOcrStatus('idle'); }}
              className="absolute top-2 right-2 bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white rounded-full p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center justify-center gap-2 py-2">
            {ocrStatus === 'running'
              ? <Loader2 className="w-4 h-4 text-crypto-accent animate-spin" />
              : <ScanText className="w-4 h-4 text-crypto-accent" />
            }
            <p className="text-xs text-crypto-accent">
              {ocrStatus === 'running' ? t.ocrRunning : ocrStatus === 'failed' ? t.ocrFailed : t.imageReady}
            </p>
          </div>
        </div>
      )}

      {/* OCR done notice */}
      {ocrStatus === 'done' && !image && input.trim() && (
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <ScanText className="w-3 h-3 text-crypto-accent" />
          <p className="text-xs text-crypto-accent">{t.ocrDone}</p>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={txtInputRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) loadTextFile(f); e.target.value = ''; }}
      />

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-0 bg-crypto-accent opacity-20 blur-xl group-hover:opacity-30 transition-opacity rounded-full pointer-events-none"></div>

        {useTextarea ? (
          <div className={`relative bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden focus-within:border-crypto-accent transition-colors rounded-2xl`}>
            {/* Filename badge when loaded from .txt */}
            {txtFileName && (
              <div className="flex items-center gap-2 px-4 pt-3">
                <FileText className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span className="text-xs text-purple-300 font-medium truncate">{txtFileName}</span>
                {input.length >= MAX_TXT_CHARS && (
                  <span className="text-xs text-yellow-400 flex-shrink-0">· {t.txtTooLarge}</span>
                )}
                <button
                  type="button"
                  onClick={() => { setTxtFileName(null); setInput(''); }}
                  className="ml-auto text-gray-500 hover:text-gray-300 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <textarea
              className={`w-full bg-transparent text-white placeholder-gray-500 focus:outline-none font-sans resize-none ${
                isSeniorMode ? 'p-6 text-xl min-h-[200px]' : 'p-4 text-lg min-h-[120px]'
              } ${txtFileName ? 'pt-2' : ''}`}
              placeholder={placeholder}
              value={input}
              onChange={(e) => { setInput(e.target.value); if (txtFileName) setTxtFileName(null); }}
              disabled={isLoading}
            />
            <div className={`flex items-center justify-between border-t border-gray-800 ${isSeniorMode ? 'p-4' : 'p-3'}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  title={t.uploadImage}
                  className="text-gray-500 hover:text-crypto-accent transition-colors disabled:opacity-40"
                >
                  <ImagePlus className={isSeniorMode ? 'w-5 h-5' : 'w-4 h-4'} />
                </button>
                <button
                  type="button"
                  onClick={() => txtInputRef.current?.click()}
                  disabled={isLoading}
                  title={t.uploadTxt}
                  className="text-gray-500 hover:text-purple-400 transition-colors disabled:opacity-40"
                >
                  <FileText className={isSeniorMode ? 'w-5 h-5' : 'w-4 h-4'} />
                </button>
              </div>
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
              onClick={() => txtInputRef.current?.click()}
              disabled={isLoading}
              title={t.uploadTxt}
              className={`text-gray-500 hover:text-purple-400 transition-colors disabled:opacity-40 flex-shrink-0 ${isSeniorMode ? 'pr-2' : 'pr-1'}`}
            >
              <FileText className={isSeniorMode ? 'w-6 h-6' : 'w-5 h-5'} />
            </button>
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
                <span>{label[language as keyof typeof label] ?? label.en}</span>
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
              : language === 'vi'
              ? 'Nhận được tin nhắn, liên kết hoặc số điện thoại đáng ngờ? Dán vào đây để chúng tôi kiểm tra!'
              : 'Got a suspicious message, link, or phone number? Paste it here and we\'ll check it for you!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchInput;
