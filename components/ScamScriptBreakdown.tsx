import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { RiskSignal, Language } from '../types';

interface ScamScriptBreakdownProps {
  signals: RiskSignal[];
  scamProbability: number;
  language?: Language;
  isSeniorMode?: boolean;
}

type ScamType =
  | 'INVESTMENT'
  | 'IMPERSONATION'
  | 'PHISHING'
  | 'PONZI'
  | 'CRYPTO_RUG'
  | 'CELEBRITY_INVEST'
  | 'GENERAL';

interface Stage {
  id: number;
  en: { label: string; quote: string };
  'zh-TW': { label: string; quote: string };
  vi: { label: string; quote: string };
  triggerSignals: string[];
}

const PLAYBOOKS: Record<ScamType, {
  name: { en: string; 'zh-TW': string; vi: string };
  desc: { en: string; 'zh-TW': string; vi: string };
  stages: Stage[];
}> = {
  INVESTMENT: {
    name: { en: 'Fake Investment Platform', 'zh-TW': '假投資平台詐騙', vi: 'Nền tảng đầu tư giả' },
    desc: {
      en: 'A classic "pig-butchering" or fake investment scam. The scammer builds trust, shows fabricated returns, then drains your money.',
      'zh-TW': '這是典型的「殺豬盤」或假投資詐騙。詐騙者建立信任、展示偽造獲利，然後榨乾你的錢。',
      vi: 'Đây là vụ lừa đảo đầu tư giả điển hình. Kẻ lừa đảo xây dựng lòng tin, cho thấy lợi nhuận giả, sau đó rút cạn tiền của bạn.',
    },
    stages: [
      {
        id: 1,
        en: { label: 'Cold contact & trust-building', quote: '"I just want to share something that changed my life..."' },
        'zh-TW': { label: '陌生接觸、建立信任', quote: '「我只是想分享一個改變我人生的機會...」' },
        vi: { label: 'Tiếp cận lạnh & xây dựng lòng tin', quote: '"Tôi chỉ muốn chia sẻ điều đã thay đổi cuộc đời tôi..."' },
        triggerSignals: [],
      },
      {
        id: 2,
        en: { label: 'Showing fake trading wins', quote: '"Look at my profit today — 340% return in 3 days!"' },
        'zh-TW': { label: '展示假獲利截圖', quote: '「你看我今天的收益——3 天 340% 報酬！」' },
        vi: { label: 'Hiển thị chiến thắng giao dịch giả', quote: '"Nhìn lợi nhuận của tôi hôm nay — 340% lợi nhuận trong 3 ngày!"' },
        triggerSignals: ['GUARANTEED_RETURNS'],
      },
      {
        id: 3,
        en: { label: 'Inviting a small trial investment', quote: '"Just try 100 USD to see how it works. Nothing to lose."' },
        'zh-TW': { label: '邀請試投小額資金', quote: '「先投 3,000 台幣試試，賺了再加碼。」' },
        vi: { label: 'Mời đầu tư thử nhỏ', quote: '"Thử 100 USD để xem cách hoạt động. Không có gì để mất."' },
        triggerSignals: ['GUARANTEED_RETURNS', 'SUSPICIOUS_PAYMENT'],
      },
      {
        id: 4,
        en: { label: 'Pushing for bigger commitment', quote: '"The market is perfect right now. This window won\'t last!"' },
        'zh-TW': { label: '催促更大額投入', quote: '「現在市場條件完美，這個窗口不會持續太久！」' },
        vi: { label: 'Thúc đẩy cam kết lớn hơn', quote: '"Thị trường hoàn hảo ngay bây giờ. Cửa sổ này sẽ không kéo dài!"' },
        triggerSignals: ['PRESSURE_TACTICS', 'SUSPICIOUS_PAYMENT'],
      },
      {
        id: 5,
        en: { label: 'Creating urgency — deadline pressure', quote: '"This closes in 6 hours. After that the platform locks. Last chance!"' },
        'zh-TW': { label: '製造緊迫感——截止期限', quote: '「6 小時後就截止了，平台要鎖單了，最後機會！」' },
        vi: { label: 'Tạo sự cấp bách — áp lực thời hạn', quote: '"Điều này đóng cửa trong 6 giờ. Sau đó nền tảng khóa. Cơ hội cuối cùng!"' },
        triggerSignals: ['PRESSURE_TACTICS'],
      },
      {
        id: 6,
        en: { label: 'Blocking withdrawal / demanding "unlock fees"', quote: '"To withdraw, you must first pay 15% tax to the system account."' },
        'zh-TW': { label: '阻止提款，要求「解鎖手續費」', quote: '「要提款必須先繳 15% 的稅到系統帳戶。」' },
        vi: { label: 'Chặn rút tiền / yêu cầu "phí mở khóa"', quote: '"Để rút tiền, bạn phải trả trước 15% thuế cho tài khoản hệ thống."' },
        triggerSignals: ['SUSPICIOUS_PAYMENT'],
      },
    ],
  },
  IMPERSONATION: {
    name: { en: 'Government / Bank Impersonation', 'zh-TW': '假冒官員 / 機構詐騙', vi: 'Mạo danh Chính phủ / Ngân hàng' },
    desc: {
      en: 'Scammer poses as a law enforcement officer, bank, or regulator. Uses fear, secrecy, and fake authority to extract money or personal data.',
      'zh-TW': '詐騙者假冒執法人員、銀行或監管機構。利用恐懼、保密要求和偽造權威來索取金錢或個人資料。',
      vi: 'Kẻ lừa đảo giả vờ là cơ quan thực thi pháp luật, ngân hàng, hoặc cơ quan quản lý. Sử dụng nỗi sợ hãi và quyền lực giả để lấy tiền hoặc dữ liệu cá nhân.',
    },
    stages: [
      {
        id: 1,
        en: { label: 'Authority claim with official-sounding title', quote: '"This is Detective Chen from the Cybercrime Division."' },
        'zh-TW': { label: '自稱官方頭銜', quote: '「我是刑事局網路犯罪科陳偵查員。」' },
        vi: { label: 'Xưng danh quyền lực', quote: '"Đây là Thám tử Trần từ Bộ phận Tội phạm Mạng."' },
        triggerSignals: ['IMPERSONATION'],
      },
      {
        id: 2,
        en: { label: 'Threatening legal action / frozen account', quote: '"Your account is linked to money laundering. You could be arrested."' },
        'zh-TW': { label: '威脅法律行動 / 凍結帳號', quote: '「你的帳號涉及洗錢，如果不配合可能會被逮捕。」' },
        vi: { label: 'Đe dọa hành động pháp lý / tài khoản bị đóng băng', quote: '"Tài khoản của bạn liên quan đến rửa tiền. Bạn có thể bị bắt."' },
        triggerSignals: ['IMPERSONATION', 'PRESSURE_TACTICS'],
      },
      {
        id: 3,
        en: { label: '"Keep this confidential" isolation', quote: '"Do NOT tell your family or bank. This is an active investigation."' },
        'zh-TW': { label: '「保密」指令——孤立你', quote: '「不可以告訴家人或銀行，這是正在進行的調查。」' },
        vi: { label: '"Giữ bí mật" cô lập', quote: '"ĐỪNG nói với gia đình hoặc ngân hàng. Đây là cuộc điều tra đang tiến hành."' },
        triggerSignals: ['IMPERSONATION'],
      },
      {
        id: 4,
        en: { label: 'Requesting payment to "clear your name"', quote: '"Transfer to our safe account to prove you\'re not involved."' },
        'zh-TW': { label: '要求付款「洗清你的嫌疑」', quote: '「轉到我們的安全帳戶，以證明你沒有涉案。」' },
        vi: { label: 'Yêu cầu thanh toán để "xóa tên bạn"', quote: '"Chuyển vào tài khoản an toàn của chúng tôi để chứng minh bạn không liên quan."' },
        triggerSignals: ['SUSPICIOUS_PAYMENT'],
      },
    ],
  },
  PHISHING: {
    name: { en: 'Phishing / Credential Harvest', 'zh-TW': '網路釣魚 / 帳號盜取', vi: 'Lừa đảo / Thu thập thông tin đăng nhập' },
    desc: {
      en: 'A link, form, or fake site designed to capture your login credentials, payment info, or personal data.',
      'zh-TW': '連結、表單或假網站，設計用來截取你的帳號密碼、付款資訊或個人資料。',
      vi: 'Liên kết, biểu mẫu hoặc trang web giả được thiết kế để thu thập thông tin đăng nhập, thông tin thanh toán hoặc dữ liệu cá nhân của bạn.',
    },
    stages: [
      {
        id: 1,
        en: { label: 'Hook message with urgency or reward', quote: '"Your account has unusual activity. Verify now to avoid suspension."' },
        'zh-TW': { label: '誘餌訊息：緊急通知或獎勵', quote: '「你的帳號有異常活動，立即驗證以避免停用。」' },
        vi: { label: 'Tin nhắn móc câu với sự cấp bách hoặc phần thưởng', quote: '"Tài khoản của bạn có hoạt động bất thường. Xác minh ngay để tránh bị đình chỉ."' },
        triggerSignals: ['PHISHING_URL', 'PRESSURE_TACTICS'],
      },
      {
        id: 2,
        en: { label: 'Link to look-alike domain', quote: '"Click here: secure-login-bankofXXX.com — looks identical to the real site."' },
        'zh-TW': { label: '連結至山寨網域', quote: '「點擊這裡：secure-login-bankofXXX.com——看起來與真實網站一模一樣。」' },
        vi: { label: 'Liên kết đến tên miền giống thật', quote: '"Nhấp vào đây: secure-login-bankofXXX.com — trông giống hệt trang web thật."' },
        triggerSignals: ['PHISHING_URL', 'TYPOSQUATTING'],
      },
      {
        id: 3,
        en: { label: 'Fake login / payment form harvests your data', quote: '(You enter credentials — they go directly to the attacker.)' },
        'zh-TW': { label: '假登入頁面截取你的資料', quote: '（你輸入帳號密碼——直接傳送給攻擊者。）' },
        vi: { label: 'Biểu mẫu đăng nhập / thanh toán giả thu thập dữ liệu của bạn', quote: '(Bạn nhập thông tin — chúng đến thẳng kẻ tấn công.)' },
        triggerSignals: ['PHISHING_URL'],
      },
    ],
  },
  PONZI: {
    name: { en: 'Ponzi / MLM Pyramid', 'zh-TW': '龐氏騙局 / 傳銷老鼠會', vi: 'Ponzi / Kim tự tháp MLM' },
    desc: {
      en: 'Returns are paid from new member money, not profits. The structure mathematically must collapse — the only question is when.',
      'zh-TW': '報酬來自新會員的資金，不是真實獲利。這個結構在數學上必然崩潰——唯一的問題是何時。',
      vi: 'Lợi nhuận được trả từ tiền của thành viên mới, không phải lợi nhuận. Cấu trúc này về mặt toán học phải sụp đổ.',
    },
    stages: [
      {
        id: 1,
        en: { label: 'Impressive return claims & "members only" exclusivity', quote: '"Our members earn 50% monthly. This isn\'t public — you\'re invited."' },
        'zh-TW': { label: '驚人的報酬聲明和「會員專屬」', quote: '「我們的會員每月賺 50%。這不公開——你被邀請了。」' },
        vi: { label: 'Tuyên bố lợi nhuận ấn tượng & tính độc quyền "chỉ thành viên"', quote: '"Thành viên của chúng tôi kiếm 50% mỗi tháng. Điều này không công khai — bạn được mời."' },
        triggerSignals: ['GUARANTEED_RETURNS', 'PONZI_SIGNS'],
      },
      {
        id: 2,
        en: { label: 'Early members receive payouts (from new member money)', quote: '"See? My first 5,000 payout just arrived!" (funded by your entry fee)' },
        'zh-TW': { label: '早期成員收到報酬（來自新會員資金）', quote: '「看！我的第一筆 5,000 出金剛到！」（用你的入場費支付）' },
        vi: { label: 'Thành viên đầu tiên nhận được thanh toán (từ tiền thành viên mới)', quote: '"Xem kìa? Lần rút 5,000 đầu tiên của tôi vừa đến!" (được tài trợ từ phí gia nhập của bạn)' },
        triggerSignals: ['PONZI_SIGNS'],
      },
      {
        id: 3,
        en: { label: 'Referral pressure: "recruit to unlock higher tiers"', quote: '"Bring in 3 friends and your commission doubles automatically."' },
        'zh-TW': { label: '推薦壓力：「拉人解鎖更高層級」', quote: '「介紹 3 個朋友，你的佣金自動翻倍。」' },
        vi: { label: 'Áp lực giới thiệu: "tuyển dụng để mở khóa cấp cao hơn"', quote: '"Giới thiệu 3 người bạn và hoa hồng của bạn tự động tăng gấp đôi."' },
        triggerSignals: ['PONZI_SIGNS'],
      },
      {
        id: 4,
        en: { label: 'Collapse: withdrawals blocked, organizer disappears', quote: '"System maintenance in progress. Withdrawals temporarily suspended."' },
        'zh-TW': { label: '崩潰：提款被封鎖，主辦人消失', quote: '「系統維護中，提款暫時停止。」（然後就消失了）' },
        vi: { label: 'Sụp đổ: rút tiền bị chặn, người tổ chức biến mất', quote: '"Đang bảo trì hệ thống. Rút tiền tạm thời bị đình chỉ."' },
        triggerSignals: ['PONZI_SIGNS', 'SUSPICIOUS_PAYMENT'],
      },
    ],
  },
  CRYPTO_RUG: {
    name: { en: 'Crypto Rug Pull / Exit Scam', 'zh-TW': '加密貨幣捲款跑路', vi: 'Crypto Rug Pull / Lừa đảo thoát' },
    desc: {
      en: 'Project team raises funds, then abandons the project and disappears with investor money.',
      'zh-TW': '專案團隊募集資金後，拋棄專案並帶著投資者的錢消失。',
      vi: 'Nhóm dự án huy động vốn, sau đó từ bỏ dự án và biến mất cùng tiền của nhà đầu tư.',
    },
    stages: [
      {
        id: 1,
        en: { label: 'Hype launch with whitepaper & roadmap', quote: '"We\'re changing DeFi forever. Read our whitepaper and join the presale."' },
        'zh-TW': { label: '炒作上線，有白皮書和路線圖', quote: '「我們要永遠改變 DeFi。閱讀我們的白皮書，加入預售。」' },
        vi: { label: 'Ra mắt hype với whitepaper & lộ trình', quote: '"Chúng tôi đang thay đổi DeFi mãi mãi. Đọc whitepaper của chúng tôi và tham gia presale."' },
        triggerSignals: ['RUG_PULL_HISTORY'],
      },
      {
        id: 2,
        en: { label: 'Influencer promotion & FOMO drive', quote: '"This token 10x\'d in 48 hours. Don\'t miss the next leg up."' },
        'zh-TW': { label: '網紅推廣和製造 FOMO', quote: '「這個代幣 48 小時漲了 10 倍，不要錯過下一波。」' },
        vi: { label: 'Quảng bá người có ảnh hưởng & thúc đẩy FOMO', quote: '"Token này tăng 10 lần trong 48 giờ. Đừng bỏ lỡ đợt tăng tiếp theo."' },
        triggerSignals: ['RUG_PULL_HISTORY', 'CELEBRITY_IMPERSONATION'],
      },
      {
        id: 3,
        en: { label: 'Liquidity drained / project abandoned', quote: '(Founders dump tokens, withdraw liquidity. Price crashes to zero.)' },
        'zh-TW': { label: '流動性被抽走，專案被放棄', quote: '（創始人拋售代幣，撤走流動性。幣價歸零。）' },
        vi: { label: 'Thanh khoản cạn kiệt / dự án bị bỏ rơi', quote: '(Người sáng lập bán phá giá token, rút thanh khoản. Giá về không.)' },
        triggerSignals: ['RUG_PULL_HISTORY'],
      },
    ],
  },
  CELEBRITY_INVEST: {
    name: { en: 'Celebrity-Endorsed Fake Investment', 'zh-TW': '假名人代言投資詐騙', vi: 'Đầu tư giả được người nổi tiếng xác nhận' },
    desc: {
      en: 'Scammer clones or impersonates a famous person\'s identity to promote a fake investment opportunity.',
      'zh-TW': '詐騙者克隆或假冒名人身份來推廣假投資機會。',
      vi: 'Kẻ lừa đảo sao chép hoặc mạo danh danh tính của người nổi tiếng để quảng bá cơ hội đầu tư giả.',
    },
    stages: [
      {
        id: 1,
        en: { label: 'DM or post from fake celebrity account', quote: '"Elon here. I\'m personally selecting 200 people for my private fund."' },
        'zh-TW': { label: '假名人帳號的私訊或貼文', quote: '「我是 Elon，我親自挑選 200 人加入我的私人基金。」' },
        vi: { label: 'DM hoặc bài đăng từ tài khoản người nổi tiếng giả', quote: '"Elon đây. Tôi đang chọn 200 người cho quỹ riêng của mình."' },
        triggerSignals: ['CELEBRITY_IMPERSONATION'],
      },
      {
        id: 2,
        en: { label: '"Send X to receive 2X back" offer', quote: '"Send 0.1 ETH and I\'ll send 0.2 ETH back within the hour."' },
        'zh-TW': { label: '「轉入 X，我回給你 2X」邀約', quote: '「發送 0.1 ETH，我在一小時內回你 0.2 ETH。」' },
        vi: { label: 'Ưu đãi "Gửi X để nhận 2X lại"', quote: '"Gửi 0.1 ETH và tôi sẽ gửi lại 0.2 ETH trong vòng một giờ."' },
        triggerSignals: ['CELEBRITY_IMPERSONATION', 'SUSPICIOUS_PAYMENT'],
      },
    ],
  },
  GENERAL: {
    name: { en: 'Fraud / Unclassified Scam', 'zh-TW': '詐騙（未分類）', vi: 'Gian lận / Lừa đảo chưa phân loại' },
    desc: {
      en: 'Risk signals were detected that do not cleanly match a single scam type. Treat with high caution.',
      'zh-TW': '偵測到風險訊號，但不完全符合單一詐騙類型。請高度謹慎對待。',
      vi: 'Phát hiện tín hiệu rủi ro không khớp hoàn toàn với một loại lừa đảo. Hãy cực kỳ thận trọng.',
    },
    stages: [
      {
        id: 1,
        en: { label: 'Initial contact establishes false trust', quote: '"I just need a moment of your time..."' },
        'zh-TW': { label: '初步接觸建立虛假信任', quote: '「我只需要您花一點時間...」' },
        vi: { label: 'Tiếp xúc ban đầu thiết lập lòng tin giả', quote: '"Tôi chỉ cần một chút thời gian của bạn..."' },
        triggerSignals: [],
      },
      {
        id: 2,
        en: { label: 'Escalating commitment / sunk-cost trap', quote: '"You\'ve already invested this far — just one more step."' },
        'zh-TW': { label: '逐步升級承諾 / 沉沒成本陷阱', quote: '「你都已經投入這麼多了——再走最後一步就好。」' },
        vi: { label: 'Leo thang cam kết / bẫy chi phí chìm', quote: '"Bạn đã đầu tư đến đây rồi — chỉ cần thêm một bước nữa thôi."' },
        triggerSignals: ['PRESSURE_TACTICS', 'SUSPICIOUS_PAYMENT'],
      },
    ],
  },
};

function detectScamType(signals: RiskSignal[]): ScamType {
  const types = new Set(signals.map(s => s.type));
  const has = (t: string) => types.has(t);

  if (has('PONZI_SIGNS')) return 'PONZI';
  if (has('RUG_PULL_HISTORY')) return 'CRYPTO_RUG';
  if (has('PHISHING_URL') || has('TYPOSQUATTING')) return 'PHISHING';
  if (has('CELEBRITY_IMPERSONATION')) return 'CELEBRITY_INVEST';
  if (has('IMPERSONATION') && (has('SUSPICIOUS_PAYMENT') || has('PRESSURE_TACTICS'))) return 'IMPERSONATION';
  if (has('GUARANTEED_RETURNS') || (has('SUSPICIOUS_PAYMENT') && has('PRESSURE_TACTICS'))) return 'INVESTMENT';
  return 'GENERAL';
}

function detectCurrentStage(stages: Stage[], signals: RiskSignal[]): number {
  const signalTypes = new Set(signals.map(s => s.type));
  // Find the highest stage whose triggerSignals are all present
  let highestMatchId = 1;
  for (const stage of stages) {
    if (stage.triggerSignals.length > 0 && stage.triggerSignals.every(t => signalTypes.has(t))) {
      highestMatchId = stage.id;
    }
  }
  return highestMatchId;
}

const LABEL_T = {
  en: {
    sectionTitle: 'Scam Playbook Analysis',
    detectedType: 'Detected pattern',
    stageLabel: 'Stage',
    likelyHere: 'You may be here',
    expand: 'View all stages',
    collapse: 'Collapse',
  },
  'zh-TW': {
    sectionTitle: '詐騙劇本分析',
    detectedType: '偵測到的類型',
    stageLabel: '步驟',
    likelyHere: '你可能在這裡',
    expand: '查看所有步驟',
    collapse: '收起',
  },
  vi: {
    sectionTitle: 'Phân tích kịch bản lừa đảo',
    detectedType: 'Mô hình được phát hiện',
    stageLabel: 'Giai đoạn',
    likelyHere: 'Bạn có thể đang ở đây',
    expand: 'Xem tất cả các giai đoạn',
    collapse: 'Thu gọn',
  },
};

const ScamScriptBreakdown: React.FC<ScamScriptBreakdownProps> = ({
  signals,
  scamProbability,
  language = 'en',
  isSeniorMode = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (scamProbability < 30 || signals.length === 0) return null;

  const t = LABEL_T[language as keyof typeof LABEL_T] ?? LABEL_T.en;
  const scamType = detectScamType(signals);
  const playbook = PLAYBOOKS[scamType];

  const typeName = playbook.name[language as keyof typeof playbook.name] ?? playbook.name.en;
  const typeDesc = playbook.desc[language as keyof typeof playbook.desc] ?? playbook.desc.en;

  const currentStageId = detectCurrentStage(playbook.stages, signals);
  const visibleStages = expanded ? playbook.stages : playbook.stages.slice(0, currentStageId);

  return (
    <div className={`${isSeniorMode ? 'mb-8' : 'mb-5'}`}>
      <h3 className={`font-bold text-white mb-1 flex items-center gap-2 ${isSeniorMode ? 'text-2xl' : 'text-lg'}`}>
        🎭 {t.sectionTitle}
      </h3>

      {/* Type chip + description */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`text-gray-400 ${isSeniorMode ? 'text-base' : 'text-xs'}`}>{t.detectedType}:</span>
        <span className={`bg-purple-900/40 border border-purple-700 text-purple-300 rounded-full font-semibold px-3 py-0.5 ${isSeniorMode ? 'text-base' : 'text-xs'}`}>
          {typeName}
        </span>
      </div>
      <p className={`text-gray-400 mb-4 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>{typeDesc}</p>

      {/* Stage timeline */}
      <div className="relative ml-3">
        {/* Vertical line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-700" />

        <div className="space-y-3 pl-6">
          {visibleStages.map((stage) => {
            const isCurrentStage = stage.id === currentStageId;
            const stageData = stage[language as keyof typeof stage] ?? stage.en;
            const { label, quote } = stageData as { label: string; quote: string };

            return (
              <div key={stage.id} className="relative">
                {/* Dot */}
                <div className={`absolute -left-[27px] top-3 w-3 h-3 rounded-full border-2 ${
                  isCurrentStage
                    ? 'bg-orange-500 border-orange-400 animate-pulse'
                    : 'bg-gray-700 border-gray-600'
                }`} />

                <div className={`rounded-xl border p-3 ${
                  isCurrentStage
                    ? 'border-orange-700/60 bg-orange-950/25'
                    : 'border-gray-800 bg-gray-900/30'
                }`}>
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`font-mono font-bold flex-shrink-0 ${
                      isCurrentStage ? 'text-orange-400' : 'text-gray-500'
                    } ${isSeniorMode ? 'text-base' : 'text-xs'}`}>
                      {t.stageLabel} {stage.id}
                    </span>
                    <span className={`font-semibold ${
                      isCurrentStage ? 'text-orange-200' : 'text-gray-300'
                    } ${isSeniorMode ? 'text-xl' : 'text-sm'}`}>
                      {label}
                    </span>
                    {isCurrentStage && (
                      <span className={`ml-auto flex-shrink-0 bg-orange-500/20 border border-orange-600 text-orange-300 rounded-full font-bold px-2 py-0.5 ${isSeniorMode ? 'text-base' : 'text-xs'}`}>
                        ← {t.likelyHere}
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-gray-400 italic ${isSeniorMode ? 'text-base' : 'text-xs'}`}>
                    {quote}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expand / collapse toggle */}
      {playbook.stages.length > currentStageId && (
        <button
          onClick={() => setExpanded(e => !e)}
          className={`mt-3 ml-9 flex items-center gap-1.5 text-gray-400 hover:text-gray-200 transition-colors ${isSeniorMode ? 'text-lg' : 'text-sm'}`}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? t.collapse : t.expand}
        </button>
      )}
    </div>
  );
};

export default ScamScriptBreakdown;
