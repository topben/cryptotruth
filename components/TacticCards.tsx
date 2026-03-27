import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { RiskSignal, Language } from '../types';

interface TacticCardsProps {
  signals: RiskSignal[];
  language?: Language;
  isSeniorMode?: boolean;
}

interface TacticDef {
  en: { title: string; tactic: string; reality: string; script: string };
  'zh-TW': { title: string; tactic: string; reality: string; script: string };
  vi: { title: string; tactic: string; reality: string; script: string };
}

const TACTIC_MAP: Record<string, TacticDef> = {
  GUARANTEED_RETURNS: {
    en: {
      title: 'Guaranteed Profit Promise',
      tactic: 'They promise guaranteed returns, "risk-free" profits, or "secret" investment methods.',
      reality: 'No legitimate investment can guarantee returns. This is always a scam tactic.',
      script: '"If it\'s real, it\'ll still be available after I\'ve done independent research. I\'ll get back to you."',
    },
    'zh-TW': {
      title: '保證獲利承諾',
      tactic: '對方承諾保證獲利、「零風險」收益或「秘密」投資方式。',
      reality: '任何合法投資都無法保證獲利。這永遠是詐騙手法。',
      script: '「如果是真的，做完獨立研究後還是會有機會。我考慮一下再告訴你。」',
    },
    vi: {
      title: 'Lời hứa lợi nhuận đảm bảo',
      tactic: 'Họ hứa lợi nhuận đảm bảo, lợi nhuận "không rủi ro", hoặc phương pháp đầu tư "bí mật".',
      reality: 'Không có khoản đầu tư hợp pháp nào có thể đảm bảo lợi nhuận. Đây luôn là chiến thuật lừa đảo.',
      script: '"Nếu là thật, nó vẫn sẽ còn đó sau khi tôi nghiên cứu độc lập. Tôi sẽ liên lạc lại với bạn."',
    },
  },
  PRESSURE_TACTICS: {
    en: {
      title: 'Urgency / Fear of Missing Out',
      tactic: '"Act now or lose the opportunity!" Deadlines, countdown timers, and threats of missing out.',
      reality: 'Artificial urgency is designed to stop you from thinking clearly or consulting others.',
      script: '"I never make financial decisions under pressure. If this offer expires, it wasn\'t for me."',
    },
    'zh-TW': {
      title: '緊迫感 / 機不可失',
      tactic: '「立刻行動，否則錯過機會！」截止日期、倒數計時及錯過的威脅。',
      reality: '人為製造的緊迫感是為了阻止您冷靜思考或諮詢他人。',
      script: '「我不在壓力下做財務決策。如果這個機會到期了，說明它不適合我。」',
    },
    vi: {
      title: 'Sự cấp bách / Sợ bỏ lỡ',
      tactic: '"Hành động ngay hoặc mất cơ hội!" Thời hạn, đồng hồ đếm ngược, và đe dọa bỏ lỡ.',
      reality: 'Sự cấp bách giả tạo được thiết kế để ngăn bạn suy nghĩ rõ ràng hoặc tham khảo người khác.',
      script: '"Tôi không bao giờ đưa ra quyết định tài chính dưới áp lực. Nếu ưu đãi này hết hạn, nó không dành cho tôi."',
    },
  },
  IMPERSONATION: {
    en: {
      title: 'False Authority / Impersonation',
      tactic: 'Pretending to be a government official, bank, police, or trusted institution to gain compliance.',
      reality: 'Real officials never demand payments by gift card, crypto, or wire transfer. Always call official numbers to verify.',
      script: '"I will call the official number I find on the government/bank website to verify this before doing anything."',
    },
    'zh-TW': {
      title: '假冒身份 / 偽裝官方',
      tactic: '假裝是政府官員、銀行、警察或可信機構以獲取服從。',
      reality: '真正的官員不會要求用禮物卡、加密貨幣或電匯付款。永遠撥打官方電話確認。',
      script: '「我會先撥打政府/銀行官方網站上的電話確認，再做任何事。」',
    },
    vi: {
      title: 'Mạo danh / Quyền lực giả',
      tactic: 'Giả vờ là quan chức chính phủ, ngân hàng, cảnh sát, hoặc tổ chức đáng tin cậy để tuân thủ.',
      reality: 'Quan chức thực sự không bao giờ yêu cầu thanh toán bằng thẻ quà tặng, tiền điện tử, hoặc chuyển khoản. Luôn gọi số chính thức để xác minh.',
      script: '"Tôi sẽ gọi số điện thoại chính thức trên trang web chính phủ/ngân hàng để xác minh trước khi làm bất cứ điều gì."',
    },
  },
  PHISHING_URL: {
    en: {
      title: 'Fake / Phishing Website',
      tactic: 'A link disguised as a legitimate website to steal your login credentials or payment info.',
      reality: 'Always navigate to sites directly in a new tab. Never click links in messages — type the official URL yourself.',
      script: '"I\'ll go to the official website by typing the address myself, not by clicking this link."',
    },
    'zh-TW': {
      title: '釣魚網站 / 假冒連結',
      tactic: '偽裝成合法網站的連結，用於竊取您的帳號或付款資訊。',
      reality: '永遠在新分頁直接輸入網址。不要點擊訊息中的連結——自己輸入官方網址。',
      script: '「我會自己輸入網址前往官方網站，而不是點擊這個連結。」',
    },
    vi: {
      title: 'Trang web giả mạo / Lừa đảo',
      tactic: 'Một liên kết được ngụy trang như trang web hợp pháp để đánh cắp thông tin đăng nhập hoặc thanh toán của bạn.',
      reality: 'Luôn điều hướng đến các trang web trực tiếp trong tab mới. Không bao giờ nhấp vào liên kết trong tin nhắn — tự gõ URL chính thức.',
      script: '"Tôi sẽ tự gõ địa chỉ để vào trang web chính thức, không nhấp vào liên kết này."',
    },
  },
  TYPOSQUATTING: {
    en: {
      title: 'Look-alike / Fake Domain',
      tactic: 'A domain that looks almost identical to a real one (e.g., "bınance.com" instead of "binance.com").',
      reality: 'Scammers register domains with subtle differences. Always double-check the exact URL in your browser.',
      script: '"I\'ll verify this domain letter by letter against the official website before logging in."',
    },
    'zh-TW': {
      title: '假冒網域 / 山寨網址',
      tactic: '看起來幾乎與真實網域相同的網址（例如用「bınance.com」代替「binance.com」）。',
      reality: '詐騙者會申請有細微差異的網域。永遠在瀏覽器中逐字確認網址。',
      script: '「我會在登入前逐字核對這個網域與官方網站的差異。」',
    },
    vi: {
      title: 'Tên miền giả mạo / Nhái',
      tactic: 'Một tên miền trông gần giống với tên miền thật (ví dụ: "bınance.com" thay vì "binance.com").',
      reality: 'Kẻ lừa đảo đăng ký tên miền với sự khác biệt tinh tế. Luôn kiểm tra kỹ URL chính xác trên trình duyệt của bạn.',
      script: '"Tôi sẽ xác minh tên miền này từng chữ cái so với trang web chính thức trước khi đăng nhập."',
    },
  },
  SUSPICIOUS_PAYMENT: {
    en: {
      title: 'Unusual Payment Request',
      tactic: 'Requesting payment via gift cards, crypto, wire transfer, or "processing fees" for prizes.',
      reality: 'Legitimate businesses use traceable payment methods. Gift cards, crypto, and fees for "prizes" are always scams.',
      script: '"Real companies don\'t ask for gift cards or crypto. I won\'t pay this way."',
    },
    'zh-TW': {
      title: '異常付款要求',
      tactic: '要求透過禮物卡、加密貨幣、電匯或為「獎品」支付「手續費」。',
      reality: '合法機構使用可追蹤的付款方式。禮物卡、加密貨幣及「獎品手續費」永遠是詐騙。',
      script: '「真正的公司不會要求禮物卡或加密貨幣。我不會這樣付款。」',
    },
    vi: {
      title: 'Yêu cầu thanh toán bất thường',
      tactic: 'Yêu cầu thanh toán qua thẻ quà tặng, tiền điện tử, chuyển khoản, hoặc "phí xử lý" cho giải thưởng.',
      reality: 'Doanh nghiệp hợp pháp sử dụng phương thức thanh toán có thể theo dõi. Thẻ quà tặng, tiền điện tử, và phí cho "giải thưởng" luôn là lừa đảo.',
      script: '"Công ty thực sự không yêu cầu thẻ quà tặng hoặc tiền điện tử. Tôi sẽ không thanh toán theo cách này."',
    },
  },
  CELEBRITY_IMPERSONATION: {
    en: {
      title: 'Celebrity / Influencer Scam',
      tactic: 'Using a famous person\'s identity to promote fake investments or giveaways.',
      reality: 'Real celebrities don\'t DM strangers offering investment opportunities. Verified accounts don\'t ask for money.',
      script: '"I\'ll verify this by going to their official verified account, not responding to this message."',
    },
    'zh-TW': {
      title: '名人冒充詐騙',
      tactic: '使用名人身份推廣假投資或假贈品活動。',
      reality: '真正的名人不會私訊陌生人提供投資機會。認證帳號不會要求匯款。',
      script: '「我會前往他們的官方認證帳號確認，而不是回覆這則訊息。」',
    },
    vi: {
      title: 'Lừa đảo mạo danh người nổi tiếng',
      tactic: 'Sử dụng danh tính của người nổi tiếng để quảng bá các khoản đầu tư hoặc tặng quà giả.',
      reality: 'Người nổi tiếng thực sự không nhắn tin riêng cho người lạ về cơ hội đầu tư. Tài khoản đã xác minh không yêu cầu tiền.',
      script: '"Tôi sẽ xác minh bằng cách vào tài khoản chính thức đã xác minh của họ, không phản hồi tin nhắn này."',
    },
  },
  PONZI_SIGNS: {
    en: {
      title: 'Ponzi / MLM Structure',
      tactic: '"Recruit 3 friends and earn 200%!" Returns paid from new investor money, not real profits.',
      reality: 'When recruitment stops, the scheme collapses. Most participants lose everything.',
      script: '"Any investment that requires recruiting others is a pyramid scheme. I\'m not interested."',
    },
    'zh-TW': {
      title: '龐氏 / 傳銷結構',
      tactic: '「拉 3 個朋友就賺 200%！」用新投資者的錢支付報酬，而非真實獲利。',
      reality: '當招募停止時，結構崩潰。大多數參與者損失一切。',
      script: '「任何需要拉人的投資都是老鼠會。我沒有興趣。」',
    },
    vi: {
      title: 'Cấu trúc Ponzi / MLM',
      tactic: '"Giới thiệu 3 bạn và kiếm 200%!" Lợi nhuận được trả từ tiền của nhà đầu tư mới, không phải lợi nhuận thực.',
      reality: 'Khi việc tuyển dụng dừng lại, kế hoạch sụp đổ. Hầu hết người tham gia mất tất cả.',
      script: '"Bất kỳ khoản đầu tư nào yêu cầu giới thiệu người khác đều là kế hoạch kim tự tháp. Tôi không quan tâm."',
    },
  },
  SCAM_ALLEGATION: {
    en: {
      title: 'Known Scam Reports',
      tactic: 'This entity has been flagged or reported by multiple victims or news sources.',
      reality: 'Where there are multiple independent scam reports, the risk is very real.',
      script: '"Multiple people have already reported this as a scam. I won\'t engage further."',
    },
    'zh-TW': {
      title: '已知詐騙舉報',
      tactic: '此實體已被多名受害者或新聞來源標記或舉報。',
      reality: '有多份獨立詐騙報告的地方，風險是非常真實的。',
      script: '「已有多人將此舉報為詐騙。我不會進一步接觸。」',
    },
    vi: {
      title: 'Báo cáo lừa đảo đã biết',
      tactic: 'Tổ chức này đã bị đánh dấu hoặc báo cáo bởi nhiều nạn nhân hoặc nguồn tin tức.',
      reality: 'Khi có nhiều báo cáo lừa đảo độc lập, rủi ro là rất thực tế.',
      script: '"Nhiều người đã báo cáo điều này là lừa đảo. Tôi sẽ không tiếp tục tương tác."',
    },
  },
};

const LABEL_TRANSLATIONS = {
  en: {
    title: 'How to Tackle These Tactics',
    tactic: '🎭 The Tactic',
    reality: '🔍 The Reality',
    script: '💬 Your Script',
    showMore: 'Show script',
    showLess: 'Hide script',
  },
  'zh-TW': {
    title: '如何應對這些手法',
    tactic: '🎭 詐騙手法',
    reality: '🔍 真相',
    script: '💬 您的應對話術',
    showMore: '顯示話術',
    showLess: '收起話術',
  },
  vi: {
    title: 'Cách đối phó với các chiến thuật này',
    tactic: '🎭 Chiến thuật',
    reality: '🔍 Thực tế',
    script: '💬 Kịch bản của bạn',
    showMore: 'Hiện kịch bản',
    showLess: 'Ẩn kịch bản',
  },
};

const TacticCards: React.FC<TacticCardsProps> = ({
  signals,
  language = 'en',
  isSeniorMode = false,
}) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const t = LABEL_TRANSLATIONS[language as keyof typeof LABEL_TRANSLATIONS] ?? LABEL_TRANSLATIONS.en;

  // Filter signals that have a matching tactic card
  const tacticSignals = signals.filter(s => TACTIC_MAP[s.type]);
  if (tacticSignals.length === 0) return null;

  return (
    <div className={`${isSeniorMode ? 'mb-8' : 'mb-6'}`}>
      <h3 className={`font-bold text-white mb-4 flex items-center gap-2 ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
        🛡️ {t.title}
      </h3>
      <div className="space-y-3">
        {tacticSignals.map((signal, idx) => {
          const def = TACTIC_MAP[signal.type];
          if (!def) return null;
          const langDef = def[language as keyof typeof def] ?? def.en;
          const isExpanded = expandedIdx === idx;

          return (
            <div
              key={idx}
              className={`border rounded-xl overflow-hidden transition-colors ${
                signal.level === 'CRITICAL'
                  ? 'border-red-800 bg-red-950/30'
                  : signal.level === 'WARNING'
                  ? 'border-orange-800/60 bg-orange-950/20'
                  : 'border-gray-700 bg-gray-900/40'
              }`}
            >
              {/* Header */}
              <div className={`${isSeniorMode ? 'p-5' : 'p-4'}`}>
                <div className={`font-semibold text-white mb-2 ${isSeniorMode ? 'text-xl' : 'text-base'}`}>
                  {(langDef as { title: string }).title}
                </div>
                <div className={`mb-2 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
                  <span className="text-gray-400 font-medium">{t.tactic} </span>
                  <span className="text-gray-300">{(langDef as { tactic: string }).tactic}</span>
                </div>
                <div className={`mb-3 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
                  <span className="text-gray-400 font-medium">{t.reality} </span>
                  <span className="text-gray-300">{(langDef as { reality: string }).reality}</span>
                </div>
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className={`flex items-center gap-1 text-crypto-accent hover:text-blue-400 transition-colors font-medium ${isSeniorMode ? 'text-lg' : 'text-sm'}`}
                >
                  {isExpanded ? t.showLess : t.showMore}
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Script (expandable) */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className={`bg-green-950/40 border border-green-800/50 rounded-lg p-3 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
                    <span className="text-green-400 font-medium">{t.script} </span>
                    <span className="text-green-200 italic">{(langDef as { script: string }).script}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TacticCards;
