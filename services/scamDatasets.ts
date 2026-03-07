/**
 * Scam detection datasets from AWS Hackathon 2026 competition materials.
 *
 * Three datasets (each 100 samples):
 *  A. SMS Scam dataset  — loan scams + bank/app impersonation alerts
 *  B. URL Scam dataset  — typosquatting (CTBC, ESUN, e-invoice), suspicious TLDs, short-URL chains
 *  C. Social Media dataset — one-page shopping scams + fake celebrity investment scams
 *
 * NOTE (PDF security requirement): phone numbers and LINE IDs in any output
 * must be masked before being stored in cache or displayed to end-users.
 */

// ─────────────────────────────────────────────────────────────────────────────
// A. KNOWN SCAM URL DATABASE (100 entries)
// ─────────────────────────────────────────────────────────────────────────────

export const KNOWN_SCAM_URLS: string[] = [
  "https://carrell.bajrisialid.top",
  "https://e-invoicepltfoi-tw.com/index/login.html",
  "https://einvoiceplatformd-tw.com/index/card.html",
  "https://einvolaev.com/tw/#/page/index",
  "https://elnarvolae.com/twe/#/page/cards",
  "https://harem-smrt.com",
  "https://linebbn.com",
  "https://lineopc.com",
  "https://maqwtp.com",
  "https://tantalusappraisals.com/jiko",
  "https://xjquery.com",
  "https://myship-711-com-tw-iwud.shop/index/message/kefu",
  "https://wifts.me",
  "http://docs.google.com/drawings/d/1WW1e0thPcEjFgEvub1H04c_0UmjQrPCVf6MwD0BlXyo/preview",
  "https://aytz.shop/risgv53ctk00",
  "https://h5.gotoborrow.com",
  "https://iqbrain.app/terminate",
  "https://mypersonalitylab.com",
  "https://tghjj.com/",
  "https://www.adidas-originals.com.tw",
  "https://www.happyel.top",
  "https://www.kcqoje.com",
  "https://www.mfk.com.tw/",
  "1jy.cn/QF0ewH",
  "1jy.cn/Wu5TCS",
  "https://ctbcbanklees.com/tw",
  "https://ctbcbankess.com/TW",
  "https://ctbcbankstw.com/ctbc",
  "https://ctbcbanktws.com/ctbc",
  "https://ctbcbanktw-com.top/ctbc",
  "https://ctbcbanktwes.com/ctbc",
  "https://ctbcbanktwss.com/ctbc",
  "0ab.cn/oflMDc",
  "j5z.cn/FhMYn0",
  "j3b.cn/0cjKGF",
  "1jy.cn/Q2QjXZ",
  "a7o.cn/hXHdvq",
  "uz1pp.com/p575",
  "d0c.cn/sA-dl5",
  "https://twiskjh.sbs",
  "https://twkjkjhd.sbs",
  "https://twljjlp.sbs",
  "https://twiljkbl.sbs",
  "https://twihjds.sbs",
  "https://esunbanktw.com/esun",
  "https://esunbankstw.com/esun",
  "https://esunbankstws.com/esun",
  "https://esunbankestws.com/tw",
  "fw1.cn/S57FYJ",
  "fw1.cn/zz3wCn",
  "5yj.cn/IZo?aCgNzj",
  "3dm.tw/s/HC",
  "https://startrack.online/profile",
  "https://tcb-profile.com.tw/addr",
  "q7u.cn/m8mWY2",
  "kz5.cn/t8v?aCgNzj",
  "2wr.cn/1r8OZB",
  "2wr.cn/iZpsSd",
  "1jy.cn/B4fKZy",
  "2wr.cn/ITMf2k",
  "2wr.cn/85KLcX",
  "2wr.cn/R6ekWp",
  "w6j.cn/Ku3173",
  "fw1.cn/bmyA6S",
  "1jy.cn/o60IjZ",
  "2wr.cn/vhDzec",
  "9lw.cn/iJk0E7",
  "https://wsd.giov.my/hk",
  "fw1.cn/IpIifN",
  "https://vip.jkompay.com",
  "http://a5pxm.cn/44lp",
  "e7b.cn/05LzvR",
  "https://fetcer-ects.net/u",
  "https://fetcetc-tw.net/u",
  "https://vip.ipass-moneyd.cloud",
  "https://vips.ipass-fpay.cloud",
  "https://cdic-gov.com/tw",
  "https://mvdis.icu/tw",
  "whatsauapp.com",
  "h5.sureloantw.com",
  "whtaesapp.org",
  "https://telegram.college",
  "ebd.tw/BJKF6",
  "ated.tc/RNCdT5",
  "www.faqh-whats.xyz",
  "https://TeIeprenm.com",
  "whatas-cn.net",
  "www.chaty-ws.xyz",
  "www.whatcstapp.com",
  "www.whaatzcpp.com",
  "https://whtasapp-a.com",
  "t.ly/ws-checke",
  "http://web.whatsiapp.cc",
  "https://whatsa-appk.com",
  "www.tghj.cc",
  "www.ck-whatszapp.com",
  "https://whats-en.com",
  "https://smart4.help/rewards",
  "https://ltoportalph-gov.com",
  "https://suneis.com",
];

// Normalized domains extracted from KNOWN_SCAM_URLS
export const KNOWN_SCAM_DOMAINS: string[] = [
  "carrell.bajrisialid.top", "e-invoicepltfoi-tw.com", "einvoiceplatformd-tw.com",
  "einvolaev.com", "elnarvolae.com", "harem-smrt.com", "linebbn.com", "lineopc.com",
  "maqwtp.com", "tantalusappraisals.com", "xjquery.com", "myship-711-com-tw-iwud.shop",
  "wifts.me", "aytz.shop", "h5.gotoborrow.com", "iqbrain.app", "mypersonalitylab.com",
  "tghjj.com", "adidas-originals.com.tw", "happyel.top", "kcqoje.com", "mfk.com.tw",
  "1jy.cn", "0ab.cn", "j5z.cn", "j3b.cn", "a7o.cn", "uz1pp.com", "d0c.cn",
  "ctbcbanklees.com", "ctbcbankess.com", "ctbcbankstw.com", "ctbcbanktws.com",
  "ctbcbanktw-com.top", "ctbcbanktwes.com", "ctbcbanktwss.com",
  "twiskjh.sbs", "twkjkjhd.sbs", "twljjlp.sbs", "twiljkbl.sbs", "twihjds.sbs",
  "esunbanktw.com", "esunbankstw.com", "esunbankstws.com", "esunbankestws.com",
  "fw1.cn", "5yj.cn", "3dm.tw", "startrack.online", "tcb-profile.com.tw",
  "q7u.cn", "kz5.cn", "2wr.cn", "w6j.cn", "9lw.cn", "wsd.giov.my",
  "vip.jkompay.com", "a5pxm.cn", "e7b.cn", "fetcer-ects.net", "fetcetc-tw.net",
  "vip.ipass-moneyd.cloud", "vips.ipass-fpay.cloud", "cdic-gov.com", "mvdis.icu",
  "whatsauapp.com", "h5.sureloantw.com", "whtaesapp.org", "telegram.college",
  "ebd.tw", "ated.tc", "faqh-whats.xyz", "teieprenm.com", "whatas-cn.net",
  "chaty-ws.xyz", "whatcstapp.com", "whaatzcpp.com", "whtasapp-a.com",
  "t.ly", "whatsiapp.cc", "whatsa-appk.com", "tghj.cc", "ck-whatszapp.com",
  "whats-en.com", "smart4.help", "ltoportalph-gov.com", "suneis.com",
];

// TLDs heavily used in Taiwan scam infrastructure
export const SUSPICIOUS_TLDS: string[] = [
  ".sbs", ".top", ".xyz", ".icu", ".shop", ".cc", ".cloud", ".help", ".me", ".ly", ".tc",
];

// Short URL / redirect services used to hide scam destinations
export const SCAM_SHORT_URL_DOMAINS: string[] = [
  "maac.io", "lihi.cc", "lihi1.cc", "lin.ee", "reurl.cc", "lurl.cc", "csms.tw",
  "0ab.cn", "1jy.cn", "2wr.cn", "3dm.tw", "5yj.cn", "9lw.cn",
  "a5pxm.cn", "a7o.cn", "d0c.cn", "e7b.cn", "ebd.tw", "fw1.cn",
  "j3b.cn", "j5z.cn", "kz5.cn", "l8h.cn", "q7u.cn", "w6j.cn",
  "t.ly", "uz1pp.com", "bit.ly", "ated.tc", "pe.pe", "e.so", "smart4.help",
];

// ─────────────────────────────────────────────────────────────────────────────
// B. CATEGORIZED SMS SCAM EXAMPLES (for few-shot Gemini prompting)
// ─────────────────────────────────────────────────────────────────────────────

/** Loan scam SMS (44/100 samples): "免聯徵", "快速撥款", Line IDs, short URLs */
export const LOAN_SCAM_SMS_EXAMPLES: string[] = [
  "（優惠通報）\n憑此則訊息\n可享30萬內月繳額度\n最低可拿9成\n免聯徵、照會\n輕鬆還款無負擔 maac.io/4Z6nr/kNZZC",
  "[通知]\n小林恭喜您有專案額度,初審20萬月付約三千元最快1天內核貸,詳情加賴:https://lin.ee/3ReA8Bd",
  "《1-10萬快速借款》只需10分鐘，當日線上速審，個資保密，免聯徵。\n客服小茉 csms.tw/0rAzCJ",
  "《輕鬆借》30萬內當日撥款 可本利攤還 免押免保 有工作來就借 線上諮詢 csms.tw/OXGHQ2",
  "「支援錢線」請問有需要資金嗎？金額10-20萬，不照會、保密。Line：lihi.cc/liwQB",
];

/** Account alert phishing SMS (16/100 samples): fake bank/app urgency + phishing link */
export const ACCOUNT_ALERT_SMS_EXAMPLES: string[] = [
  "【中國信託】您的帳戶異常，系統更新將暫時關閉您的帳戶，在2025/7/8前實名驗證，逾期者將關閉信用卡功能:https://ctbcbanklees.com/tw",
  "【中國信託銀行】系統更新將暫時關閉您的帳戶，在2025/7/4前實名驗證，逾期者將關閉信用卡功能:https://ctbcbankess.com/TW",
  "【玉山銀行】您的帳戶異常，系統更新將暫時關閉您的帳戶，在2025/7/5前實名驗證:https://esunbanktw.com/esun",
  "【合作金庫銀行】親愛的客戶，請於48小時內點選連結更新通訊地址。https://tcb-profile.com.tw/addr",
  "【中國信託銀行】您的帳戶異常，在5/17前實名驗證，逾期者將關閉信用卡功能:https://ctbcbank-gift.com/u",
];

// ─────────────────────────────────────────────────────────────────────────────
// C. CATEGORIZED SOCIAL MEDIA SCAM EXAMPLES
// ─────────────────────────────────────────────────────────────────────────────

/** One-page shopping scam ads (69/100 samples): cheap everyday goods, fake imports */
export const SHOPPING_SCAM_AD_EXAMPLES: string[] = [
  "【德國原裝進口】熱銷NO.1電推剪! ✨多功能設計,在家自己理髮、修鬍超便利 ✅一鍵啟動、安全可靠、續航長久",
  "✨ 想最大化利用你的旅行空间？探索我们全新的真空收纳套装！✅ 压缩衣物，节省高达60%的空间！点击链接立即购买！",
  "🍵 別再花冤枉錢買昂貴的保健品了！83%改善率，91%精準度，點擊下方連結把這份「家庭健康守護神」帶回家！http://rwttsac.xyz/WBKFofg",
];

/** Investment/celebrity scam ads (31/100 samples): USDT, fake celebs, LINE groups */
export const INVESTMENT_SCAM_AD_EXAMPLES: string[] = [
  "🚨 出現價量與結構變化，後續走勢值得持續追蹤。✅不喊單、不承諾收益 ✅只分享市場觀察與篩選邏輯。👉點擊加入LINE｜免費接收，不適合可隨時退出。",
  "立刻完成KYC，免手续费交易USDT。加入我们的交易社群，获取内部行情。",
  "🚀 更快執行，且風險管控更方便。交易前即可設置獲利和止損。訪問免費的TradingView指標，加入我們的Telegram群組。",
];

// ─────────────────────────────────────────────────────────────────────────────
// SCAM KEYWORDS
// ─────────────────────────────────────────────────────────────────────────────

export const LOAN_SCAM_KEYWORDS_ZH = [
  '免聯徵', '不照會', '快速撥款', '當日撥款', '當日核貸', '月付',
  '核貸', '撥款', '貸款', '借款', '周轉', '資金缺口', '急用錢',
  '免押免保', '輕鬆還款', '低利息', '代償整合',
];

export const ALERT_SCAM_KEYWORDS_ZH = [
  '帳戶異常', '帳號異常', '系統更新', '實名驗證', '立即驗證', '點擊驗證',
  '停用', '封鎖', '停權', '暫時關閉', '逾期', '違規', '緊急通知',
];

export const INVESTMENT_SCAM_KEYWORDS = [
  '老師帶單', '穩賺不賠', '內線消息', '保證獲利', '高額回報', '被動收入',
  '模擬金', 'USDT', 'USDC', '黃董', '蘇姿丰', '免費贈書', '加入群組',
  'guaranteed profit', 'guaranteed return', 'no risk', 'passive income',
];

export const PRESSURE_KEYWORDS = [
  '限時', '限量', '立即', '馬上', '趕快', '最後機會', '錯過不再',
  'act now', 'limited time', 'last chance', 'hurry',
];

// ─────────────────────────────────────────────────────────────────────────────
// TYPOSQUATTING DETECTOR
// Real domains: ctbcbank.com.tw, esunbank.com.tw, einvoice.nat.gov.tw,
//               whatsapp.com, line.me, telegram.org, ipass.com.tw
// ─────────────────────────────────────────────────────────────────────────────

export interface TyposquatMatch {
  institution: string;
  legitimateDomain: string;
  scamType: 'BANK_PHISHING' | 'GOVT_PHISHING' | 'APP_IMPERSONATION';
}

/** Returns typosquat info if domain impersonates a known institution, else null */
export const detectTyposquatting = (domain: string): TyposquatMatch | null => {
  const d = domain.toLowerCase();

  if (/ctbcbank/.test(d) && !d.endsWith('ctbcbank.com.tw'))
    return { institution: '中國信託銀行 (CTBC)', legitimateDomain: 'ctbcbank.com.tw', scamType: 'BANK_PHISHING' };

  if (/esunbank/.test(d) && !d.endsWith('esunbank.com.tw'))
    return { institution: '玉山銀行 (ESUN)', legitimateDomain: 'esunbank.com.tw', scamType: 'BANK_PHISHING' };

  if (/tcb-profile|tcbbank/.test(d) && !d.endsWith('tcb.com.tw'))
    return { institution: '合作金庫銀行 (TCB)', legitimateDomain: 'tcb.com.tw', scamType: 'BANK_PHISHING' };

  if (/einvoice|e-invoice/.test(d) && !d.includes('nat.gov.tw'))
    return { institution: '財政部電子發票 (e-invoice)', legitimateDomain: 'einvoice.nat.gov.tw', scamType: 'GOVT_PHISHING' };

  if (/whats[a-z]*app|what[sz]app/.test(d) && !d.endsWith('whatsapp.com'))
    return { institution: 'WhatsApp', legitimateDomain: 'whatsapp.com', scamType: 'APP_IMPERSONATION' };

  if (/telegram/.test(d) && !d.endsWith('telegram.org'))
    return { institution: 'Telegram', legitimateDomain: 'telegram.org', scamType: 'APP_IMPERSONATION' };

  if (/^line[a-z]/.test(d) && !d.endsWith('line.me') && !d.endsWith('line.naver.jp'))
    return { institution: 'LINE', legitimateDomain: 'line.me', scamType: 'APP_IMPERSONATION' };

  if (/ipass-/.test(d) && !d.endsWith('ipass.com.tw'))
    return { institution: '一卡通 (iPass)', legitimateDomain: 'ipass.com.tw', scamType: 'GOVT_PHISHING' };

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// URL DATASET CHECK
// ─────────────────────────────────────────────────────────────────────────────

export type ScamType =
  | 'LOAN_SCAM' | 'BANK_PHISHING' | 'GOVT_PHISHING' | 'APP_IMPERSONATION'
  | 'INVESTMENT_SCAM' | 'SHOPPING_SCAM' | 'SHORT_URL_REDIRECT'
  | 'SUSPICIOUS_TLD' | 'KNOWN_SCAM_DOMAIN' | 'KNOWN_SCAM_URL';

export interface DatasetMatch {
  matched: true;
  scamType: ScamType;
  detail: string;
}

/** Extract hostname from URL (lowercase, no www) */
export const getDomain = (url: string): string => {
  try {
    const urlStr = url.startsWith('http') ? url : `https://${url}`;
    const hostname = new URL(urlStr).hostname.toLowerCase();
    return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  } catch {
    const m = url.match(/^(?:www\.)?([^/\s]+)/i);
    return m ? m[1].toLowerCase() : url.toLowerCase();
  }
};

/**
 * Check a URL through all dataset layers (most specific first):
 * exact URL → known domain → typosquatting → short URL → suspicious TLD
 */
export const checkUrlAgainstDataset = (
  url: string
): DatasetMatch | { matched: false } => {
  const normalizedInput = url.toLowerCase().trim();
  const domain = getDomain(url);

  if (KNOWN_SCAM_URLS.some(u => u.toLowerCase() === normalizedInput))
    return { matched: true, scamType: 'KNOWN_SCAM_URL', detail: 'Exact match in hackathon scam URL database.' };

  if (KNOWN_SCAM_DOMAINS.includes(domain))
    return { matched: true, scamType: 'KNOWN_SCAM_DOMAIN', detail: `Domain "${domain}" is in the hackathon scam domain database.` };

  const typosquat = detectTyposquatting(domain);
  if (typosquat)
    return {
      matched: true,
      scamType: typosquat.scamType,
      detail: `Typosquatting: "${domain}" impersonates ${typosquat.institution} (legitimate: ${typosquat.legitimateDomain}).`,
    };

  if (SCAM_SHORT_URL_DOMAINS.includes(domain))
    return { matched: true, scamType: 'SHORT_URL_REDIRECT', detail: `"${domain}" is a short URL service used to hide scam destinations.` };

  const tld = domain.includes('.') ? '.' + domain.split('.').pop()! : '';
  if (tld && SUSPICIOUS_TLDS.includes(tld))
    return { matched: true, scamType: 'SUSPICIOUS_TLD', detail: `TLD "${tld}" is frequently used in Taiwan scam infrastructure.` };

  return { matched: false };
};

// ─────────────────────────────────────────────────────────────────────────────
// SMS CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────

export interface SmsAnalysis {
  scamType: 'LOAN_SCAM' | 'ACCOUNT_ALERT_PHISHING' | 'INVESTMENT_SCAM' | 'UNKNOWN';
  signals: string[];
  relevantExamples: string[];
}

/**
 * Classify SMS text by scam type and extract pattern signals.
 * Returns categorized scam type + matched signals + relevant few-shot examples.
 */
export const analyzeSmsText = (text: string): SmsAnalysis => {
  const signals: string[] = [];

  const loanHits = LOAN_SCAM_KEYWORDS_ZH.filter(k => text.includes(k));
  if (loanHits.length > 0) signals.push(`Loan scam keywords: ${loanHits.map(k => `"${k}"`).join(', ')}`);

  const alertHits = ALERT_SCAM_KEYWORDS_ZH.filter(k => text.includes(k));
  if (alertHits.length > 0) signals.push(`Account alert phishing keywords: ${alertHits.map(k => `"${k}"`).join(', ')}`);

  const investHits = INVESTMENT_SCAM_KEYWORDS.filter(k => text.toLowerCase().includes(k.toLowerCase()));
  if (investHits.length > 0) signals.push(`Investment scam keywords: ${investHits.map(k => `"${k}"`).join(', ')}`);

  const pressureHits = PRESSURE_KEYWORDS.filter(k => text.toLowerCase().includes(k.toLowerCase()));
  if (pressureHits.length > 0) signals.push(`Urgency/pressure keywords: ${pressureHits.map(k => `"${k}"`).join(', ')}`);

  const shortUrlHits = SCAM_SHORT_URL_DOMAINS.filter(d => text.toLowerCase().includes(d));
  if (shortUrlHits.length > 0) signals.push(`Short URL redirect services: ${shortUrlHits.join(', ')}`);

  let scamType: SmsAnalysis['scamType'] = 'UNKNOWN';
  if (loanHits.length > 0 && loanHits.length >= alertHits.length && loanHits.length >= investHits.length) {
    scamType = 'LOAN_SCAM';
  } else if (alertHits.length > 0 && alertHits.length >= loanHits.length) {
    scamType = 'ACCOUNT_ALERT_PHISHING';
  } else if (investHits.length > 0) {
    scamType = 'INVESTMENT_SCAM';
  }

  const relevantExamples =
    scamType === 'LOAN_SCAM' ? LOAN_SCAM_SMS_EXAMPLES.slice(0, 3) :
    scamType === 'ACCOUNT_ALERT_PHISHING' ? ACCOUNT_ALERT_SMS_EXAMPLES.slice(0, 3) :
    scamType === 'INVESTMENT_SCAM' ? INVESTMENT_SCAM_AD_EXAMPLES.slice(0, 2) :
    [...LOAN_SCAM_SMS_EXAMPLES.slice(0, 2), ...ACCOUNT_ALERT_SMS_EXAMPLES.slice(0, 2)];

  return { scamType, signals, relevantExamples };
};

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL MEDIA AD DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the URL is a Facebook Ads Library link */
export const isFacebookAdUrl = (url: string): boolean =>
  /facebook\.com\/ads\/library/i.test(url);

/**
 * Build social media ad scam context string for Gemini prompt injection.
 * Covers both shopping scam and investment scam patterns from the dataset.
 */
export const getSocialMediaAdContext = (): string => [
  'SOCIAL MEDIA AD SCAM PATTERNS (from hackathon dataset, 100 samples):',
  '',
  'TYPE 1 — One-page Shopping Scam (69/100 samples):',
  '- Promotes everyday products (shavers, storage bags, health supplements) at suspiciously low prices',
  '- Emotional appeals, vague health/quality claims, fake import origins ("德國原裝進口")',
  '- Redirects to single-page stores with no traceable brand identity',
  `Examples:\n${SHOPPING_SCAM_AD_EXAMPLES.map((e, i) => `  [${i + 1}] ${e.slice(0, 120)}`).join('\n')}`,
  '',
  'TYPE 2 — Investment/Celebrity Endorsement Scam (31/100 samples):',
  '- Impersonates financial celebrities (黃董, 蘇姿丰) or anonymous "market observers"',
  '- Promises free AI books, USDT simulation funds, private LINE/Telegram group access',
  '- Uses soft language to avoid legal liability ("不喊單", "僅供參考") while still recruiting',
  '- Strong urgency and exclusivity: "非長期公開", "部分追蹤者"',
  `Examples:\n${INVESTMENT_SCAM_AD_EXAMPLES.map((e, i) => `  [${i + 1}] ${e.slice(0, 150)}`).join('\n')}`,
].join('\n');

// ─────────────────────────────────────────────────────────────────────────────
// PII MASKING  (PDF security requirement)
// "涉及個資的部分進行適當遮蔽（Masking）"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mask phone numbers and LINE IDs before caching or displaying analysis results.
 */
export const maskPII = (text: string): string => {
  if (!text) return text;
  let t = text;

  // Taiwan mobile: 09xxxxxxxx → 09xx-***-***
  t = t.replace(/0[9]\d{8}/g, m => m.slice(0, 4) + '-***-***');

  // International with +886: +886-9xx-xxx-xxx
  t = t.replace(/\+886[-\s]?9\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, '+886-9xx-***-***');

  // LINE IDs after common prefixes
  t = t.replace(/(加賴|Line\s*[:：]|LINE\s*[:：]|加line\s*[:：])\s*\S+/gi,
    (_, prefix) => `${prefix} [LINE_ID已遮蔽]`);

  // Short URL paths that encode LINE IDs (e.g. lihi.cc/liwQB)
  t = t.replace(/(lihi\.cc\/)[A-Za-z0-9]+/g, '$1[遮蔽]');

  return t;
};
