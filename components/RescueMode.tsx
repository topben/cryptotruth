import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Language } from '../types';

interface RescueModeProps {
  scamProbability: number;
  language?: Language;
  isSeniorMode?: boolean;
}

interface RescueFlow {
  id: string;
  trigger: { en: string; 'zh-TW': string; vi: string };
  steps: { en: string[]; 'zh-TW': string[]; vi: string[] };
}

const RESCUE_FLOWS: RescueFlow[] = [
  {
    id: 'sent_money',
    trigger: {
      en: '💸 I already sent money',
      'zh-TW': '💸 我已經匯款了',
      vi: '💸 Tôi đã gửi tiền rồi',
    },
    steps: {
      en: [
        'Contact your bank immediately — request a recall or fraud block',
        'Call your credit card company if a card was used',
        'File a police report (keep the case number)',
        'Report to your national fraud authority',
        'Do not send more money to "recover" what was lost — this is always another scam',
      ],
      'zh-TW': [
        '立即聯繫您的銀行——要求帳款追回或詐騙凍結',
        '如使用信用卡，聯繫信用卡公司',
        '向警察局報案（保留案件編號）',
        '撥打 165 反詐騙專線報告',
        '不要再匯款「追回」損失——這永遠又是另一個騙局',
      ],
      vi: [
        'Liên hệ ngân hàng ngay lập tức — yêu cầu thu hồi hoặc chặn gian lận',
        'Gọi cho công ty thẻ tín dụng nếu thẻ đã được sử dụng',
        'Lập báo cáo cảnh sát (giữ số hồ sơ)',
        'Báo cáo cho cơ quan chống gian lận quốc gia của bạn',
        'Không gửi thêm tiền để "lấy lại" những gì đã mất — đây luôn là một vụ lừa đảo khác',
      ],
    },
  },
  {
    id: 'shared_credentials',
    trigger: {
      en: '🔑 I shared my password or login info',
      'zh-TW': '🔑 我洩露了密碼或帳號資訊',
      vi: '🔑 Tôi đã chia sẻ mật khẩu hoặc thông tin đăng nhập',
    },
    steps: {
      en: [
        'Change the password immediately on every site where you used it',
        'Enable two-factor authentication (2FA) on all accounts',
        'Check account activity for unauthorized logins',
        'Log out all active sessions from your account settings',
        'Alert your contacts — they may receive scam messages from your account',
      ],
      'zh-TW': [
        '立即更改所有使用相同密碼的網站密碼',
        '在所有帳號啟用雙重驗證（2FA）',
        '檢查帳號活動記錄，尋找未授權登入',
        '從帳號設定登出所有活躍工作階段',
        '提醒您的聯絡人——他們可能收到從您帳號發出的詐騙訊息',
      ],
      vi: [
        'Thay đổi mật khẩu ngay lập tức trên mọi trang web bạn đã sử dụng',
        'Bật xác thực hai yếu tố (2FA) trên tất cả tài khoản',
        'Kiểm tra hoạt động tài khoản để tìm các đăng nhập trái phép',
        'Đăng xuất tất cả các phiên đang hoạt động từ cài đặt tài khoản',
        'Cảnh báo danh bạ của bạn — họ có thể nhận tin nhắn lừa đảo từ tài khoản của bạn',
      ],
    },
  },
  {
    id: 'clicked_link',
    trigger: {
      en: '🔗 I clicked a suspicious link',
      'zh-TW': '🔗 我點擊了可疑連結',
      vi: '🔗 Tôi đã nhấp vào liên kết đáng ngờ',
    },
    steps: {
      en: [
        'Do NOT enter any information on the page that opened',
        'Close the browser tab immediately',
        'Run a malware scan on your device',
        'If you logged in on the page, change that password now',
        'Monitor your accounts for suspicious activity over the next few weeks',
      ],
      'zh-TW': [
        '不要在打開的頁面輸入任何資訊',
        '立即關閉瀏覽器分頁',
        '在您的裝置上執行惡意軟體掃描',
        '如果您在該頁面登入過，立即更改那個密碼',
        '未來數週監控您的帳號是否有可疑活動',
      ],
      vi: [
        'KHÔNG nhập bất kỳ thông tin nào trên trang đã mở',
        'Đóng tab trình duyệt ngay lập tức',
        'Chạy quét phần mềm độc hại trên thiết bị của bạn',
        'Nếu bạn đã đăng nhập trên trang, hãy thay đổi mật khẩu đó ngay bây giờ',
        'Theo dõi tài khoản của bạn để phát hiện hoạt động đáng ngờ trong vài tuần tới',
      ],
    },
  },
  {
    id: 'gave_personal_info',
    trigger: {
      en: '📋 I gave out personal information',
      'zh-TW': '📋 我透露了個人資料',
      vi: '📋 Tôi đã cung cấp thông tin cá nhân',
    },
    steps: {
      en: [
        'File a report with your national identity theft authority',
        'Monitor your credit report for new accounts you didn\'t open',
        'Place a fraud alert or freeze on your credit (if available in your country)',
        'Inform your bank and any financial institutions',
        'Keep records of all communications as evidence',
      ],
      'zh-TW': [
        '向國家個資外洩主管機關報告',
        '監控您的信用報告，尋找您未申請的新帳戶',
        '在您的信用上設置詐騙警告或凍結（如您的國家提供此服務）',
        '告知您的銀行及任何金融機構',
        '保留所有通訊記錄作為證據',
      ],
      vi: [
        'Lập báo cáo với cơ quan đánh cắp danh tính quốc gia của bạn',
        'Theo dõi báo cáo tín dụng của bạn để tìm các tài khoản mới bạn không mở',
        'Đặt cảnh báo gian lận hoặc đóng băng tín dụng của bạn (nếu có ở quốc gia của bạn)',
        'Thông báo cho ngân hàng và bất kỳ tổ chức tài chính nào',
        'Lưu giữ hồ sơ tất cả thông tin liên lạc làm bằng chứng',
      ],
    },
  },
  {
    id: 'installed_app',
    trigger: {
      en: '📱 I installed an app they sent me',
      'zh-TW': '📱 我安裝了對方傳來的應用程式',
      vi: '📱 Tôi đã cài đặt ứng dụng họ gửi',
    },
    steps: {
      en: [
        'Uninstall the app immediately',
        'Run a full device security scan',
        'Change passwords for any accounts accessed from this device',
        'Check for apps with unusual permissions in your device settings',
        'If you use mobile banking, contact your bank immediately',
      ],
      'zh-TW': [
        '立即解除安裝該應用程式',
        '執行完整的裝置安全掃描',
        '更改從此裝置使用過的所有帳號密碼',
        '在裝置設定中檢查有異常權限的應用程式',
        '如果您使用行動銀行，立即聯繫您的銀行',
      ],
      vi: [
        'Gỡ cài đặt ứng dụng ngay lập tức',
        'Chạy quét bảo mật toàn bộ thiết bị',
        'Thay đổi mật khẩu cho bất kỳ tài khoản nào được truy cập từ thiết bị này',
        'Kiểm tra các ứng dụng có quyền bất thường trong cài đặt thiết bị',
        'Nếu bạn sử dụng ngân hàng di động, hãy liên hệ ngân hàng ngay lập tức',
      ],
    },
  },
  {
    id: 'shared_otp',
    trigger: {
      en: '🔢 I shared a one-time code or OTP',
      'zh-TW': '🔢 我傳送了一次性驗證碼（OTP）',
      vi: '🔢 Tôi đã chia sẻ mã một lần (OTP)',
    },
    steps: {
      en: [
        'Contact the platform the code was for (bank, email, social media) immediately',
        'Report that your account may be compromised',
        'Check for recent logins or profile changes',
        'Change your password and enable 2FA if not already on',
        'Review any transactions that may have occurred',
      ],
      'zh-TW': [
        '立即聯繫該驗證碼所屬的平台（銀行、電子郵件、社群媒體）',
        '回報您的帳號可能已遭入侵',
        '檢查最近的登入記錄或個人資料變更',
        '更改密碼並啟用雙重驗證（如尚未開啟）',
        '審查可能已發生的任何交易',
      ],
      vi: [
        'Liên hệ ngay với nền tảng mà mã này dành cho (ngân hàng, email, mạng xã hội)',
        'Báo cáo rằng tài khoản của bạn có thể bị xâm phạm',
        'Kiểm tra các lần đăng nhập gần đây hoặc thay đổi hồ sơ',
        'Thay đổi mật khẩu và bật 2FA nếu chưa bật',
        'Xem xét bất kỳ giao dịch nào có thể đã xảy ra',
      ],
    },
  },
];

const LABEL_TRANSLATIONS = {
  en: {
    title: 'Already Took Action? Here\'s What to Do',
    subtitle: 'Select what happened — get immediate steps',
    stepPrefix: 'Step',
  },
  'zh-TW': {
    title: '已經採取行動了？現在怎麼辦',
    subtitle: '選擇發生了什麼——獲取立即行動步驟',
    stepPrefix: '步驟',
  },
  vi: {
    title: 'Đã hành động rồi? Đây là những việc cần làm',
    subtitle: 'Chọn những gì đã xảy ra — nhận các bước ngay lập tức',
    stepPrefix: 'Bước',
  },
};

const RescueMode: React.FC<RescueModeProps> = ({
  scamProbability,
  language = 'en',
  isSeniorMode = false,
}) => {
  const [openId, setOpenId] = useState<string | null>(null);

  if (scamProbability < 40) return null;

  const t = LABEL_TRANSLATIONS[language as keyof typeof LABEL_TRANSLATIONS] ?? LABEL_TRANSLATIONS.en;

  return (
    <div className={`${isSeniorMode ? 'mb-8' : 'mb-6'}`}>
      <h3 className={`font-bold text-white mb-1 flex items-center gap-2 ${isSeniorMode ? 'text-2xl' : 'text-xl'}`}>
        🆘 {t.title}
      </h3>
      <p className={`text-gray-400 mb-4 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>{t.subtitle}</p>

      <div className="space-y-2">
        {RESCUE_FLOWS.map((flow) => {
          const isOpen = openId === flow.id;
          const trigger = flow.trigger[language as keyof typeof flow.trigger] ?? flow.trigger.en;
          const steps = flow.steps[language as keyof typeof flow.steps] ?? flow.steps.en;

          return (
            <div
              key={flow.id}
              className="border border-gray-700 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenId(isOpen ? null : flow.id)}
                className={`w-full text-left flex items-center justify-between gap-3 bg-gray-800/50 hover:bg-gray-800 transition-colors ${isSeniorMode ? 'px-6 py-5' : 'px-4 py-3'}`}
              >
                <span className={`font-medium text-gray-200 ${isSeniorMode ? 'text-xl' : 'text-base'}`}>
                  {trigger}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className={`bg-gray-900/50 ${isSeniorMode ? 'px-6 py-5' : 'px-4 py-4'}`}>
                  <ol className="space-y-3">
                    {steps.map((step, i) => (
                      <li key={i} className={`flex items-start gap-3 text-gray-300 ${isSeniorMode ? 'text-lg' : 'text-sm'}`}>
                        <span className={`flex-shrink-0 font-bold rounded-full bg-crypto-accent/20 text-crypto-accent flex items-center justify-center ${isSeniorMode ? 'w-8 h-8 text-base' : 'w-6 h-6 text-xs'}`}>
                          {i + 1}
                        </span>
                        <span className="mt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RescueMode;
