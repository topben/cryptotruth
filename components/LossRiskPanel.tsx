import React from 'react';
import { Banknote, UserX, LockOpen, HeartCrack } from 'lucide-react';
import { Language } from '../types';

interface LossRiskPanelProps {
  scamProbability: number;
  language?: Language;
  isSeniorMode?: boolean;
}

const TRANSLATIONS = {
  en: {
    title: 'What You Could Lose',
    categories: [
      {
        icon: 'money',
        label: 'Financial Loss',
        desc: 'Transfers, crypto, and gift cards are often unrecoverable once sent.',
        level: 'HIGH',
      },
      {
        icon: 'identity',
        label: 'Identity Theft',
        desc: 'Your personal data can be used to open accounts or take loans in your name.',
        level: 'HIGH',
      },
      {
        icon: 'account',
        label: 'Account Compromise',
        desc: 'Email, social media, or banking accounts may be taken over.',
        level: 'MED',
      },
      {
        icon: 'emotional',
        label: 'Emotional Impact',
        desc: 'Shame, loss of trust, and psychological stress affect many victims.',
        level: 'MED',
      },
    ],
  },
  'zh-TW': {
    title: '您可能面臨的損失',
    categories: [
      {
        icon: 'money',
        label: '財產損失',
        desc: '匯款、加密貨幣及禮物卡一旦轉出，通常無法追回。',
        level: 'HIGH',
      },
      {
        icon: 'identity',
        label: '個資外洩',
        desc: '個人資料可能被用於開戶或以您的名義辦理貸款。',
        level: 'HIGH',
      },
      {
        icon: 'account',
        label: '帳號遭竊',
        desc: '電子郵件、社群媒體或銀行帳號可能被控制。',
        level: 'MED',
      },
      {
        icon: 'emotional',
        label: '心理影響',
        desc: '羞恥感、信任損傷及心理壓力影響許多受害者。',
        level: 'MED',
      },
    ],
  },
  vi: {
    title: 'Những gì bạn có thể mất',
    categories: [
      {
        icon: 'money',
        label: 'Tổn thất tài chính',
        desc: 'Chuyển khoản, tiền điện tử và thẻ quà tặng thường không thể thu hồi sau khi đã gửi.',
        level: 'HIGH',
      },
      {
        icon: 'identity',
        label: 'Đánh cắp danh tính',
        desc: 'Dữ liệu cá nhân có thể được dùng để mở tài khoản hoặc vay nợ dưới tên bạn.',
        level: 'HIGH',
      },
      {
        icon: 'account',
        label: 'Tài khoản bị xâm phạm',
        desc: 'Email, mạng xã hội, hoặc tài khoản ngân hàng có thể bị chiếm đoạt.',
        level: 'MED',
      },
      {
        icon: 'emotional',
        label: 'Tác động tâm lý',
        desc: 'Xấu hổ, mất lòng tin và căng thẳng tâm lý ảnh hưởng đến nhiều nạn nhân.',
        level: 'MED',
      },
    ],
  },
};

const ICONS: Record<string, React.ReactNode> = {
  money: <Banknote className="w-6 h-6" />,
  identity: <UserX className="w-6 h-6" />,
  account: <LockOpen className="w-6 h-6" />,
  emotional: <HeartCrack className="w-6 h-6" />,
};

const LossRiskPanel: React.FC<LossRiskPanelProps> = ({
  scamProbability,
  language = 'en',
  isSeniorMode = false,
}) => {
  if (scamProbability < 40) return null;

  const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] ?? TRANSLATIONS.en;

  return (
    <div className={`${isSeniorMode ? 'mb-8' : 'mb-6'}`}>
      <h3 className={`font-bold text-orange-400 mb-3 flex items-center gap-2 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
        ⚠️ {t.title}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {t.categories.map((cat) => (
          <div
            key={cat.icon}
            className={`rounded-xl border p-4 ${
              cat.level === 'HIGH'
                ? 'bg-red-950/40 border-red-800'
                : 'bg-orange-950/30 border-orange-800/50'
            }`}
          >
            <div className={`mb-2 ${cat.level === 'HIGH' ? 'text-red-400' : 'text-orange-400'}`}>
              {ICONS[cat.icon]}
            </div>
            <div className={`font-semibold text-white mb-1 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
              {cat.label}
            </div>
            <div className={`text-gray-400 leading-snug ${isSeniorMode ? 'text-base' : 'text-xs'}`}>
              {cat.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LossRiskPanel;
