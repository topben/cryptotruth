import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { RiskSignal, Language } from '../types';

interface TacticCardsProps {
  signals: RiskSignal[];
  language?: Language;
  isSeniorMode?: boolean;
}

interface TacticLang {
  title: string;
  scammerSay: string;
  interpret: string;
  manipulative: string;
  doInstead: string;
}

interface TacticDef {
  en: TacticLang;
  'zh-TW': TacticLang;
  vi: TacticLang;
}

const TACTIC_MAP: Record<string, TacticDef> = {
  GUARANTEED_RETURNS: {
    en: {
      title: 'The "Guaranteed Profit" Lure',
      scammerSay: '"This investment guarantees 20–30% monthly returns, zero risk. I\'ll show you the proof."',
      interpret: 'They are creating false confidence to get you to move money quickly. The "proof" is fabricated.',
      manipulative: 'Greed and FOMO. Once you believe a guarantee, you skip critical thinking and due diligence.',
      doInstead: '"No legitimate investment can guarantee returns. I\'ll do my own research before committing anything."',
    },
    'zh-TW': {
      title: '「保證獲利」誘餌',
      scammerSay: '「這個投資保證每月 20–30% 報酬，零風險。我讓你看證明。」',
      interpret: '對方在製造虛假信心，讓你快速轉移資金。所謂「證明」都是偽造的。',
      manipulative: '利用貪念和錯失恐懼（FOMO）。一旦你相信「保證」，就會跳過獨立思考和盡職調查。',
      doInstead: '「任何合法投資都無法保證報酬。我需要先獨立查證，才可能考慮。」',
    },
    vi: {
      title: 'Bẫy "Lợi nhuận đảm bảo"',
      scammerSay: '"Khoản đầu tư này đảm bảo lợi nhuận 20-30% mỗi tháng, không rủi ro. Tôi sẽ cho bạn xem bằng chứng."',
      interpret: 'Họ đang tạo ra sự tự tin giả để khiến bạn chuyển tiền nhanh chóng. "Bằng chứng" là giả mạo.',
      manipulative: 'Lòng tham và FOMO. Khi bạn tin vào sự đảm bảo, bạn bỏ qua tư duy phản biện.',
      doInstead: '"Không có khoản đầu tư hợp pháp nào có thể đảm bảo lợi nhuận. Tôi cần tự nghiên cứu trước."',
    },
  },
  PRESSURE_TACTICS: {
    en: {
      title: 'The Artificial Urgency Trap',
      scammerSay: '"This window closes in 2 hours! If you don\'t act now, you\'ll miss the only chance!"',
      interpret: 'The deadline is invented. Its only purpose is to stop you from thinking clearly or consulting anyone.',
      manipulative: 'Urgency bypasses rational decision-making. Scammers know that if you sleep on it, the spell breaks.',
      doInstead: '"Anything that can\'t wait 24 hours for me to think is not for me. Real opportunities don\'t expire."',
    },
    'zh-TW': {
      title: '「人工緊迫感」陷阱',
      scammerSay: '「這個窗口只剩 2 小時！你現在不行動，就只能錯過了！」',
      interpret: '截止時間是捏造的。它唯一的目的是阻止你冷靜思考或諮詢任何人。',
      manipulative: '緊迫感會繞過理性決策。詐騙者知道，只要你睡一覺再想，魔法就破了。',
      doInstead: '「任何不能等我 24 小時思考的事，都不適合我。真正的機會不會到期。」',
    },
    vi: {
      title: 'Bẫy Khẩn Cấp Giả Tạo',
      scammerSay: '"Cơ hội này chỉ còn 2 tiếng! Nếu bạn không hành động ngay, bạn sẽ bỏ lỡ cơ hội duy nhất!"',
      interpret: 'Thời hạn là bịa đặt. Mục đích duy nhất của nó là ngăn bạn suy nghĩ rõ ràng hoặc tham khảo ai đó.',
      manipulative: 'Sự cấp bách bỏ qua quá trình ra quyết định hợp lý. Kẻ lừa đảo biết nếu bạn ngủ qua đêm, câu thần chú sẽ bị phá vỡ.',
      doInstead: '"Bất cứ điều gì không thể chờ 24 giờ để tôi suy nghĩ thì không dành cho tôi."',
    },
  },
  IMPERSONATION: {
    en: {
      title: 'The False Authority Play',
      scammerSay: '"This is Officer Zhang from the Fraud Investigation Unit. Your account is under investigation. Do NOT tell anyone."',
      interpret: 'Real law enforcement does not contact you by phone or social media to demand immediate action or payment.',
      manipulative: 'Fear of authority + secrecy. The "don\'t tell anyone" instruction is the biggest giveaway — it isolates you.',
      doInstead: '"I will call the official number listed on the government website myself to verify this before doing anything."',
    },
    'zh-TW': {
      title: '「假冒官方身份」手法',
      scammerSay: '「我是刑事局張警官，你的帳戶正在接受調查，不可以告訴任何人。」',
      interpret: '真正的執法機關不會透過電話或社群媒體要求你立即行動或付款。',
      manipulative: '利用對權威的恐懼＋保密要求。「不可以告訴任何人」是最大的破綻——這就是在孤立你。',
      doInstead: '「我會自行撥打政府官網上的電話號碼確認，才會做任何事。」',
    },
    vi: {
      title: 'Chiến thuật Quyền lực Giả',
      scammerSay: '"Đây là Trung sĩ Trần từ Đơn vị Điều tra Gian lận. Tài khoản của bạn đang được điều tra. ĐỪNG nói với ai."',
      interpret: 'Cơ quan thực thi pháp luật thực sự không liên hệ qua điện thoại hoặc mạng xã hội để yêu cầu hành động ngay.',
      manipulative: 'Sợ hãi trước quyền lực + bí mật. Lệnh "đừng nói với ai" là dấu hiệu rõ ràng nhất — nó cô lập bạn.',
      doInstead: '"Tôi sẽ tự gọi số điện thoại chính thức trên trang web chính phủ để xác minh trước khi làm bất cứ điều gì."',
    },
  },
  PHISHING_URL: {
    en: {
      title: 'The Fake Login Page Trap',
      scammerSay: '"Click here to verify your account and claim your reward. Hurry — it expires in 10 minutes."',
      interpret: 'The link leads to a page that looks like a real website but captures your login or payment details.',
      manipulative: 'Familiarity + urgency. The page looks legit to reduce suspicion, then timing pressure stops you from inspecting the URL.',
      doInstead: '"I will navigate to the official site by typing the address in a new browser tab — never through a link in a message."',
    },
    'zh-TW': {
      title: '「假登入頁面」釣魚陷阱',
      scammerSay: '「點擊這裡驗證你的帳號並領取獎品。快，10 分鐘內到期。」',
      interpret: '連結導向一個看起來像真實網站的頁面，但會截取你的帳號或付款資訊。',
      manipulative: '利用熟悉感＋緊迫感。頁面看起來合法以降低懷疑，時間壓力則阻止你檢查網址。',
      doInstead: '「我會在新的瀏覽器分頁自己輸入官方網址——絕對不點訊息中的連結。」',
    },
    vi: {
      title: 'Bẫy Trang Đăng Nhập Giả',
      scammerSay: '"Nhấp vào đây để xác minh tài khoản và nhận phần thưởng. Nhanh — hết hạn trong 10 phút."',
      interpret: 'Liên kết dẫn đến trang trông giống trang web thực nhưng thu thập thông tin đăng nhập hoặc thanh toán của bạn.',
      manipulative: 'Sự quen thuộc + cấp bách. Trang trông hợp lệ để giảm nghi ngờ, sau đó áp lực thời gian ngăn bạn kiểm tra URL.',
      doInstead: '"Tôi sẽ điều hướng đến trang chính thức bằng cách gõ địa chỉ trong tab trình duyệt mới — không bao giờ qua liên kết trong tin nhắn."',
    },
  },
  TYPOSQUATTING: {
    en: {
      title: 'The Look-alike Domain Trick',
      scammerSay: '"Here is the official investment portal: bınance-wallet.com — log in to check your balance."',
      interpret: 'The domain is a near-copy of a real one with subtle character swaps (e.g., "ı" instead of "i"). Every character looks right, but one is wrong.',
      manipulative: 'Visual similarity exploits trust. You see a familiar name, your guard drops, and you log in — handing over your credentials.',
      doInstead: '"I will verify this domain letter by letter against the official site. If anything looks off, I\'ll navigate there directly myself."',
    },
    'zh-TW': {
      title: '「山寨網域」偽裝手法',
      scammerSay: '「這是官方投資平台：bınance-wallet.com——登入查看你的餘額。」',
      interpret: '網域是真實網域的近似副本，有細微的字元替換（例如用「ı」代替「i」）。每個字看起來都對，但有一個是錯的。',
      manipulative: '視覺相似性利用信任感。你看到熟悉的名稱，放下戒心登入——就把帳號資訊拱手送出。',
      doInstead: '「我會逐字核對這個網域與官方網站。若有任何不對勁，我會自己直接輸入網址前往。」',
    },
    vi: {
      title: 'Chiêu Tên Miền Giống Thật',
      scammerSay: '"Đây là cổng đầu tư chính thức: bınance-wallet.com — đăng nhập để kiểm tra số dư của bạn."',
      interpret: 'Tên miền là bản sao gần giống với tên thật có sự hoán đổi ký tự tinh tế. Mọi ký tự đều trông đúng, nhưng một ký tự sai.',
      manipulative: 'Sự tương đồng về hình thức khai thác lòng tin. Bạn thấy tên quen thuộc, hạ thấp cảnh giác và đăng nhập.',
      doInstead: '"Tôi sẽ xác minh tên miền này từng chữ cái so với trang web chính thức và tự điều hướng trực tiếp."',
    },
  },
  SUSPICIOUS_PAYMENT: {
    en: {
      title: 'The "Processing Fee" or Gift-Card Demand',
      scammerSay: '"To release your winnings, you need to pay a 500 USD processing fee in iTunes gift cards first."',
      interpret: 'Gift cards, crypto, and "fees to unlock prizes" are permanent and untraceable. This is the actual money theft.',
      manipulative: 'Sunk-cost psychology: "You\'ve already invested this much — just one more step to claim it all back."',
      doInstead: '"Real prizes never require a fee to claim. Real companies never accept gift cards. I will not pay this."',
    },
    'zh-TW': {
      title: '「手續費」或禮物卡要求',
      scammerSay: '「要領取你的獎金，需要先支付 500 美元的手續費，用 iTunes 禮物卡支付。」',
      interpret: '禮物卡、加密貨幣和「解鎖獎品的費用」是永久且不可追蹤的。這才是真正的竊款行為。',
      manipulative: '沉沒成本心理：「你都已經投入這麼多了——再走最後一步就能全拿回來。」',
      doInstead: '「真正的獎品不需要繳費才能領取。真正的公司不接受禮物卡。我不會付這筆錢。」',
    },
    vi: {
      title: 'Yêu Cầu "Phí Xử Lý" hoặc Thẻ Quà Tặng',
      scammerSay: '"Để nhận thưởng, bạn cần thanh toán phí xử lý 500 USD bằng thẻ quà tặng iTunes trước."',
      interpret: 'Thẻ quà tặng, tiền điện tử và "phí để mở khóa giải thưởng" là vĩnh viễn và không thể theo dõi.',
      manipulative: 'Tâm lý chi phí chìm: "Bạn đã đầu tư nhiều rồi — chỉ cần thêm một bước nữa để lấy lại tất cả."',
      doInstead: '"Giải thưởng thực sự không bao giờ yêu cầu phí để nhận. Công ty thực sự không chấp nhận thẻ quà tặng."',
    },
  },
  CELEBRITY_IMPERSONATION: {
    en: {
      title: 'The Fake Celebrity Endorsement',
      scammerSay: '"Elon Musk is personally inviting you to join his exclusive crypto fund. Send 0.1 BTC and it\'s doubled instantly."',
      interpret: 'The celebrity\'s identity is stolen or cloned. The verified checkmark may be fake or on a copycat account.',
      manipulative: 'Authority + excitement. The fan response overrides critical thinking — "a famous person chose ME specifically."',
      doInstead: '"Real celebrities don\'t DM strangers with investment opportunities. I\'ll check the official verified account directly."',
    },
    'zh-TW': {
      title: '「假冒名人代言」詐騙',
      scammerSay: '「Elon Musk 親自邀請你加入他的獨家加密基金。發送 0.1 BTC，立即翻倍。」',
      interpret: '名人身份被盜用或克隆。認證標誌可能是假的，或者是在仿冒帳號上。',
      manipulative: '權威感＋興奮感。粉絲反應凌駕批判思考——「這個名人專門選了我。」',
      doInstead: '「真正的名人不會私訊陌生人提供投資機會。我會直接去查他們官方認證帳號。」',
    },
    vi: {
      title: 'Lừa Đảo Mạo Danh Người Nổi Tiếng',
      scammerSay: '"Elon Musk đang mời bạn tham gia quỹ tiền điện tử độc quyền của anh ấy. Gửi 0.1 BTC và nó sẽ được nhân đôi ngay lập tức."',
      interpret: 'Danh tính của người nổi tiếng bị đánh cắp hoặc sao chép. Dấu tích xác minh có thể là giả.',
      manipulative: 'Quyền uy + hứng khởi. Phản ứng của người hâm mộ vượt qua tư duy phản biện.',
      doInstead: '"Người nổi tiếng thực sự không nhắn tin riêng cho người lạ về cơ hội đầu tư. Tôi sẽ kiểm tra tài khoản chính thức trực tiếp."',
    },
  },
  PONZI_SIGNS: {
    en: {
      title: 'The "Recruit to Earn" Structure',
      scammerSay: '"Just bring in 3 friends and your investment doubles automatically. The more you recruit, the more you earn."',
      interpret: 'Returns come from new recruit money, not real profits. When recruitment slows, the structure collapses and everyone below loses.',
      manipulative: 'Social trust + commission greed. You become a recruiter who brings in people you know — destroying relationships when it falls apart.',
      doInstead: '"Any investment that requires recruiting others to generate returns is a pyramid scheme by definition. I\'m not interested."',
    },
    'zh-TW': {
      title: '「拉人賺錢」傳銷結構',
      scammerSay: '「只要介紹 3 個朋友，你的投資自動翻倍。你拉越多人，賺越多。」',
      interpret: '報酬來自新會員的資金，不是真實獲利。當招募速度放緩，結構崩潰，所有下線都損失一切。',
      manipulative: '社交信任＋佣金貪念。你變成了招募者，把認識的人拉進來——結構崩潰後會毀掉這些關係。',
      doInstead: '「任何需要拉人才能產生報酬的投資，依定義就是老鼠會。我沒有興趣。」',
    },
    vi: {
      title: 'Cấu Trúc "Tuyển Dụng để Kiếm Tiền"',
      scammerSay: '"Chỉ cần giới thiệu 3 người bạn và khoản đầu tư của bạn tự động tăng gấp đôi."',
      interpret: 'Lợi nhuận đến từ tiền của người mới tuyển dụng, không phải lợi nhuận thực. Khi tuyển dụng chậm lại, cấu trúc sụp đổ.',
      manipulative: 'Lòng tin xã hội + lòng tham hoa hồng. Bạn trở thành người tuyển dụng đưa người quen vào.',
      doInstead: '"Bất kỳ khoản đầu tư nào yêu cầu tuyển dụng người khác để tạo ra lợi nhuận là kế hoạch kim tự tháp theo định nghĩa."',
    },
  },
  SCAM_ALLEGATION: {
    en: {
      title: 'Multiple Independent Scam Reports',
      scammerSay: '"Those reports are from jealous competitors trying to ruin my reputation. I can prove my legitimacy."',
      interpret: 'Multiple independent victims with similar loss patterns is the strongest evidence available. The "jealous competitor" dismissal is a standard deflection.',
      manipulative: 'Creates doubt about the reporters, not the scammer. "Why would so many unconnected people lie?" — they wouldn\'t.',
      doInstead: '"Where there\'s smoke from multiple independent sources, there\'s fire. I will not engage further."',
    },
    'zh-TW': {
      title: '多起獨立詐騙舉報',
      scammerSay: '「那些舉報都是嫉妒的競爭對手想毀我的名聲。我可以證明我是合法的。」',
      interpret: '多名獨立受害者有相似的損失模式，是現有最強的證據。「嫉妒的競爭對手」這個說法是標準的轉移焦點手法。',
      manipulative: '讓你懷疑舉報者，而非詐騙者。「為什麼這麼多毫無關聯的人要說謊？」——他們不會。',
      doInstead: '「多個獨立來源都有煙，必然有火。我不會再繼續接觸。」',
    },
    vi: {
      title: 'Nhiều Báo Cáo Lừa Đảo Độc Lập',
      scammerSay: '"Những báo cáo đó từ đối thủ cạnh tranh ghen tuông muốn phá hoại danh tiếng của tôi."',
      interpret: 'Nhiều nạn nhân độc lập với mô hình tổn thất tương tự là bằng chứng mạnh nhất. "Đối thủ ghen tuông" là cách né tránh tiêu chuẩn.',
      manipulative: 'Tạo ra sự nghi ngờ về những người báo cáo, không phải kẻ lừa đảo.',
      doInstead: '"Khi có nhiều nguồn độc lập đều báo cáo, đó là sự thật. Tôi sẽ không tiếp tục tương tác."',
    },
  },
};

const LABEL_T = {
  en: {
    sectionTitle: 'Counter-Manipulation Guide',
    sectionSubtitle: 'What they say, what it really means, and what to say back',
    scammerSay: '🗣️ They may say',
    interpret: '🔍 What it really means',
    manipulative: '⚠️ Why this is manipulative',
    doInstead: '🛡️ Your response',
    showScript: 'Show response',
    hideScript: 'Hide response',
  },
  'zh-TW': {
    sectionTitle: '反操控指南',
    sectionSubtitle: '對方說了什麼、真正的意思是什麼、你可以怎麼回應',
    scammerSay: '🗣️ 對方可能說',
    interpret: '🔍 真正的意思',
    manipulative: '⚠️ 為什麼這樣說',
    doInstead: '🛡️ 你可以這樣回應',
    showScript: '顯示回應話術',
    hideScript: '收起',
  },
  vi: {
    sectionTitle: 'Hướng Dẫn Chống Thao Túng',
    sectionSubtitle: 'Họ nói gì, ý nghĩa thực sự là gì, và bạn nên nói lại gì',
    scammerSay: '🗣️ Họ có thể nói',
    interpret: '🔍 Ý nghĩa thực sự',
    manipulative: '⚠️ Tại sao điều này là thao túng',
    doInstead: '🛡️ Phản hồi của bạn',
    showScript: 'Hiện phản hồi',
    hideScript: 'Ẩn',
  },
};

const TacticCards: React.FC<TacticCardsProps> = ({
  signals,
  language = 'en',
  isSeniorMode = false,
}) => {
  const [expandedScripts, setExpandedScripts] = useState<Set<number>>(new Set());
  const t = LABEL_T[language as keyof typeof LABEL_T] ?? LABEL_T.en;

  const tacticSignals = signals
    .filter(s => TACTIC_MAP[s.type])
    .sort((a, b) => {
      const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return (order[a.level as keyof typeof order] ?? 2) - (order[b.level as keyof typeof order] ?? 2);
    });

  if (tacticSignals.length === 0) return null;

  const toggleScript = (idx: number) => {
    setExpandedScripts(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className={`${isSeniorMode ? 'mb-8' : 'mb-5'}`}>
      <div className="mb-4">
        <h3 className={`font-bold text-white flex items-center gap-2 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
          🛡️ {t.sectionTitle}
        </h3>
        <p className={`text-gray-400 mt-0.5 ${isSeniorMode ? 'text-lg' : 'text-xs'}`}>{t.sectionSubtitle}</p>
      </div>

      <div className="space-y-3">
        {tacticSignals.map((signal, idx) => {
          const def = TACTIC_MAP[signal.type];
          const lang = (def[language as keyof typeof def] ?? def.en) as TacticLang;
          const scriptOpen = expandedScripts.has(idx);

          const borderColor = signal.level === 'CRITICAL'
            ? 'border-red-800'
            : signal.level === 'WARNING'
            ? 'border-orange-800/60'
            : 'border-gray-700';

          const bgColor = signal.level === 'CRITICAL'
            ? 'bg-red-950/25'
            : signal.level === 'WARNING'
            ? 'bg-orange-950/15'
            : 'bg-gray-900/30';

          return (
            <div key={idx} className={`border rounded-xl overflow-hidden ${borderColor} ${bgColor}`}>
              {/* Title bar */}
              <div className={`${isSeniorMode ? 'px-5 pt-5 pb-3' : 'px-4 pt-4 pb-2'}`}>
                <p className={`font-bold text-white ${isSeniorMode ? 'text-xl' : 'text-base'} mb-3`}>
                  {lang.title}
                </p>

                {/* 3 always-visible parts */}
                <div className="space-y-2">
                  <div className={isSeniorMode ? 'text-lg' : 'text-sm'}>
                    <span className="text-gray-400 font-medium">{t.scammerSay}: </span>
                    <span className="text-gray-200 italic">"{lang.scammerSay}"</span>
                  </div>
                  <div className={isSeniorMode ? 'text-lg' : 'text-sm'}>
                    <span className="text-gray-400 font-medium">{t.interpret}: </span>
                    <span className="text-gray-300">{lang.interpret}</span>
                  </div>
                  <div className={isSeniorMode ? 'text-lg' : 'text-sm'}>
                    <span className="text-orange-400 font-medium">{t.manipulative}: </span>
                    <span className="text-gray-300">{lang.manipulative}</span>
                  </div>
                </div>
              </div>

              {/* Script toggle (4th part — tap to expand) */}
              <div className={`border-t border-white/5 ${isSeniorMode ? 'px-5 py-3' : 'px-4 py-2'}`}>
                <button
                  onClick={() => toggleScript(idx)}
                  className={`flex items-center gap-1.5 text-green-400 hover:text-green-300 active:text-green-200 transition-colors font-medium ${isSeniorMode ? 'text-lg' : 'text-sm'}`}
                >
                  {scriptOpen ? t.hideScript : t.showScript}
                  <ChevronDown className={`w-4 h-4 transition-transform ${scriptOpen ? 'rotate-180' : ''}`} />
                </button>

                {scriptOpen && (
                  <div className={`mt-2 bg-green-950/40 border border-green-800/50 rounded-lg ${isSeniorMode ? 'p-4 text-lg' : 'p-3 text-sm'}`}>
                    <span className="text-green-400 font-medium">{t.doInstead}: </span>
                    <span className="text-green-100 italic">"{lang.doInstead}"</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TacticCards;
