import React from 'react';
import { Language } from '../types';

interface TrustMeterProps {
  score: number;
  language: Language;
}

// 5 risk levels keyed by scamProbability (derived as 100 - trustScore)
// We receive trustScore, so convert internally
const LEVELS = [
  {
    maxTrust: 100, // trust 80-100 → sp 0-20
    minTrust: 80,
    bars: 5,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-700/50',
    bgColor: 'bg-emerald-950/30',
    label: {
      'zh-TW': '幾乎沒有風險',
      en: 'Very low risk',
      vi: 'Rủi ro rất thấp',
    },
    desc: {
      'zh-TW': '目前沒有發現足以令人擔心的跡象。',
      en: 'No concerning signals found.',
      vi: 'Không tìm thấy tín hiệu đáng lo ngại.',
    },
  },
  {
    maxTrust: 79,
    minTrust: 60,
    bars: 4,
    color: 'bg-lime-500',
    textColor: 'text-lime-400',
    borderColor: 'border-lime-700/50',
    bgColor: 'bg-lime-950/30',
    label: {
      'zh-TW': '有幾個值得注意的地方',
      en: 'A few things to watch',
      vi: 'Một vài điều cần lưu ý',
    },
    desc: {
      'zh-TW': '整體看來還算正常，但有部分資訊需要再確認。',
      en: 'Generally looks fine, but a few details need verification.',
      vi: 'Nhìn chung ổn, nhưng một số chi tiết cần xác minh.',
    },
  },
  {
    maxTrust: 59,
    minTrust: 40,
    bars: 3,
    color: 'bg-amber-500',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-700/50',
    bgColor: 'bg-amber-950/30',
    label: {
      'zh-TW': '有明顯可疑跡象',
      en: 'Noticeable suspicious signs',
      vi: 'Dấu hiệu đáng ngờ rõ ràng',
    },
    desc: {
      'zh-TW': '建議在繼續之前先透過官方管道確認。',
      en: 'Verify through official channels before proceeding.',
      vi: 'Xác minh qua kênh chính thức trước khi tiếp tục.',
    },
  },
  {
    maxTrust: 39,
    minTrust: 20,
    bars: 2,
    color: 'bg-orange-500',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-700/50',
    bgColor: 'bg-orange-950/30',
    label: {
      'zh-TW': '風險相當高',
      en: 'Quite high risk',
      vi: 'Rủi ro khá cao',
    },
    desc: {
      'zh-TW': '有多個紅旗訊號，強烈建議先停下來，不要繼續操作。',
      en: 'Multiple red flags — strongly recommend stopping and not proceeding.',
      vi: 'Nhiều dấu hiệu cảnh báo — khuyên bạn dừng lại.',
    },
  },
  {
    maxTrust: 19,
    minTrust: 0,
    bars: 1,
    color: 'bg-red-500',
    textColor: 'text-red-400',
    borderColor: 'border-red-700/50',
    bgColor: 'bg-red-950/30',
    label: {
      'zh-TW': '幾乎確定是詐騙',
      en: 'Almost certainly a scam',
      vi: 'Gần như chắc chắn là lừa đảo',
    },
    desc: {
      'zh-TW': '這個內容符合多種詐騙特徵，請不要繼續，並考慮向 165 回報。',
      en: 'Matches multiple scam patterns — do not proceed, consider reporting to 165.',
      vi: 'Khớp với nhiều đặc điểm lừa đảo — đừng tiếp tục, cân nhắc báo cáo.',
    },
  },
];

const TrustMeter: React.FC<TrustMeterProps> = ({ score, language }) => {
  const lang = language as keyof typeof LEVELS[0]['label'];
  const level = LEVELS.find(l => score >= l.minTrust && score <= l.maxTrust) ?? LEVELS[4];

  return (
    <div className={`rounded-2xl border p-5 ${level.bgColor} ${level.borderColor}`}>
      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <span className={`font-bold text-base ${level.textColor}`}>
          {level.label[lang] ?? level.label.en}
        </span>
        {/* 5-bar indicator */}
        <div className="flex items-end gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={n}
              className={`w-2.5 rounded-sm transition-all ${
                n <= level.bars ? level.color : 'bg-gray-700'
              }`}
              style={{ height: `${8 + n * 4}px` }}
            />
          ))}
        </div>
      </div>
      {/* Plain language description */}
      <p className="text-sm text-gray-300 leading-relaxed">
        {level.desc[lang] ?? level.desc.en}
      </p>
    </div>
  );
};

export default TrustMeter;
