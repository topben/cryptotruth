import { describe, it, expect } from 'vitest';
import {
  getDomain,
  detectTyposquatting,
  checkUrlAgainstDataset,
  analyzeSmsText,
  isFacebookAdUrl,
  getSocialMediaAdContext,
  maskPII,
} from '../scamDatasets';

// ─────────────────────────────────────────────────────────────────────────────
// getDomain
// ─────────────────────────────────────────────────────────────────────────────
describe('getDomain', () => {
  it('extracts hostname from full URL', () => {
    expect(getDomain('https://ctbcbanklees.com/tw')).toBe('ctbcbanklees.com');
  });

  it('strips www prefix', () => {
    expect(getDomain('https://www.happyel.top')).toBe('happyel.top');
  });

  it('handles bare domain without protocol', () => {
    expect(getDomain('maac.io/abc123')).toBe('maac.io');
  });

  it('lowercases the result', () => {
    expect(getDomain('https://TeIeprenm.com')).toBe('teieprenm.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// detectTyposquatting
// ─────────────────────────────────────────────────────────────────────────────
describe('detectTyposquatting', () => {
  it('detects fake CTBC domains', () => {
    const result = detectTyposquatting('ctbcbanklees.com');
    expect(result).not.toBeNull();
    expect(result?.scamType).toBe('BANK_PHISHING');
    expect(result?.institution).toContain('CTBC');
  });

  it('does not flag the real CTBC domain', () => {
    expect(detectTyposquatting('ctbcbank.com.tw')).toBeNull();
  });

  it('detects fake ESUN domains', () => {
    const result = detectTyposquatting('esunbanktw.com');
    expect(result?.scamType).toBe('BANK_PHISHING');
    expect(result?.institution).toContain('ESUN');
  });

  it('does not flag the real ESUN domain', () => {
    expect(detectTyposquatting('esunbank.com.tw')).toBeNull();
  });

  it('detects fake e-invoice domains', () => {
    const result = detectTyposquatting('einvoiceplatformd-tw.com');
    expect(result?.scamType).toBe('GOVT_PHISHING');
  });

  it('does not flag the real e-invoice domain', () => {
    expect(detectTyposquatting('einvoice.nat.gov.tw')).toBeNull();
  });

  it('detects WhatsApp impersonation', () => {
    const result = detectTyposquatting('whatsauapp.com');
    expect(result?.scamType).toBe('APP_IMPERSONATION');
    expect(result?.institution).toContain('WhatsApp');
  });

  it('does not flag the real WhatsApp domain', () => {
    expect(detectTyposquatting('whatsapp.com')).toBeNull();
  });

  it('detects Telegram impersonation', () => {
    const result = detectTyposquatting('telegram.college');
    expect(result?.scamType).toBe('APP_IMPERSONATION');
    expect(result?.institution).toContain('Telegram');
  });

  it('detects LINE impersonation', () => {
    const result = detectTyposquatting('linebbn.com');
    expect(result?.scamType).toBe('APP_IMPERSONATION');
    expect(result?.institution).toContain('LINE');
  });

  it('detects iPass impersonation', () => {
    const result = detectTyposquatting('vip.ipass-moneyd.cloud');
    expect(result?.scamType).toBe('GOVT_PHISHING');
    expect(result?.institution).toContain('iPass');
  });

  it('returns null for unrelated domains', () => {
    expect(detectTyposquatting('google.com')).toBeNull();
    expect(detectTyposquatting('amazon.com')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkUrlAgainstDataset
// ─────────────────────────────────────────────────────────────────────────────
describe('checkUrlAgainstDataset', () => {
  it('matches an exact known scam URL', () => {
    const result = checkUrlAgainstDataset('https://carrell.bajrisialid.top');
    expect(result.matched).toBe(true);
    if (result.matched) expect(result.scamType).toBe('KNOWN_SCAM_URL');
  });

  it('matches a known scam domain even with different path', () => {
    const result = checkUrlAgainstDataset('https://tghjj.com/some/other/path');
    expect(result.matched).toBe(true);
    if (result.matched) expect(result.scamType).toBe('KNOWN_SCAM_DOMAIN');
  });

  it('detects typosquatting as most specific match', () => {
    // ctbcbanktwes.com is both in KNOWN_SCAM_DOMAINS and a typosquat — exact/domain wins
    const result = checkUrlAgainstDataset('https://ctbcbanktwes.com/ctbc');
    expect(result.matched).toBe(true);
  });

  it('matches a short URL redirect service', () => {
    const result = checkUrlAgainstDataset('https://maac.io/sometoken');
    expect(result.matched).toBe(true);
    if (result.matched) expect(result.scamType).toBe('SHORT_URL_REDIRECT');
  });

  it('matches a suspicious TLD (.sbs)', () => {
    const result = checkUrlAgainstDataset('https://random-site.sbs');
    expect(result.matched).toBe(true);
    if (result.matched) expect(result.scamType).toBe('SUSPICIOUS_TLD');
  });

  it('matches a suspicious TLD (.top)', () => {
    const result = checkUrlAgainstDataset('https://anything.top');
    expect(result.matched).toBe(true);
    if (result.matched) expect(result.scamType).toBe('SUSPICIOUS_TLD');
  });

  it('does not match a legitimate URL', () => {
    const result = checkUrlAgainstDataset('https://www.google.com');
    expect(result.matched).toBe(false);
  });

  it('does not match real bank domains', () => {
    expect(checkUrlAgainstDataset('https://ctbcbank.com.tw').matched).toBe(false);
    expect(checkUrlAgainstDataset('https://esunbank.com.tw').matched).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// analyzeSmsText
// ─────────────────────────────────────────────────────────────────────────────
describe('analyzeSmsText', () => {
  it('classifies a loan scam SMS', () => {
    const text = '免聯徵、不照會、快速撥款，當日核貸！詳情加賴 lihi.cc/abc';
    const result = analyzeSmsText(text);
    expect(result.scamType).toBe('LOAN_SCAM');
    expect(result.signals.some(s => s.includes('免聯徵'))).toBe(true);
    expect(result.signals.some(s => s.includes('lihi.cc'))).toBe(true);
    expect(result.relevantExamples.length).toBeGreaterThan(0);
  });

  it('classifies an account alert phishing SMS', () => {
    const text = '【中國信託】您的帳戶異常，系統更新將暫時關閉帳戶，逾期者停用';
    const result = analyzeSmsText(text);
    expect(result.scamType).toBe('ACCOUNT_ALERT_PHISHING');
    expect(result.signals.some(s => s.includes('帳戶異常'))).toBe(true);
  });

  it('classifies an investment scam SMS', () => {
    const text = '老師帶單，穩賺不賠，保證獲利，加入我們的USDT群組！';
    const result = analyzeSmsText(text);
    expect(result.scamType).toBe('INVESTMENT_SCAM');
    expect(result.signals.some(s => s.includes('老師帶單'))).toBe(true);
  });

  it('detects short URL services in SMS', () => {
    const text = '有需要資金嗎？詳情請見 maac.io/xyz';
    const result = analyzeSmsText(text);
    expect(result.signals.some(s => s.includes('maac.io'))).toBe(true);
  });

  it('detects pressure keywords', () => {
    const text = '限時優惠！馬上行動，最後機會！';
    const result = analyzeSmsText(text);
    expect(result.signals.some(s => s.toLowerCase().includes('urgency'))).toBe(true);
  });

  it('returns UNKNOWN with generic examples for unrelated text', () => {
    const result = analyzeSmsText('今天天氣很好，我們去爬山吧！');
    expect(result.scamType).toBe('UNKNOWN');
    expect(result.signals).toHaveLength(0);
    expect(result.relevantExamples.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isFacebookAdUrl
// ─────────────────────────────────────────────────────────────────────────────
describe('isFacebookAdUrl', () => {
  it('detects Facebook Ads Library URLs', () => {
    expect(isFacebookAdUrl('https://www.facebook.com/ads/library/?id=2115811475834182')).toBe(true);
  });

  it('returns false for regular Facebook URLs', () => {
    expect(isFacebookAdUrl('https://www.facebook.com/some-page')).toBe(false);
  });

  it('returns false for non-Facebook URLs', () => {
    expect(isFacebookAdUrl('https://google.com')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSocialMediaAdContext
// ─────────────────────────────────────────────────────────────────────────────
describe('getSocialMediaAdContext', () => {
  it('includes both scam subtypes', () => {
    const ctx = getSocialMediaAdContext();
    expect(ctx).toContain('Shopping Scam');
    expect(ctx).toContain('Investment');
  });

  it('includes sample counts from dataset', () => {
    const ctx = getSocialMediaAdContext();
    expect(ctx).toContain('69/100');
    expect(ctx).toContain('31/100');
  });

  it('includes real examples', () => {
    const ctx = getSocialMediaAdContext();
    expect(ctx.length).toBeGreaterThan(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// maskPII
// ─────────────────────────────────────────────────────────────────────────────
describe('maskPII', () => {
  it('masks Taiwan mobile numbers', () => {
    const result = maskPII('聯絡我 0976662342 詢問詳情');
    expect(result).not.toContain('0976662342');
    expect(result).toContain('09');
    expect(result).toContain('***');
  });

  it('masks +886 international format', () => {
    const result = maskPII('來電 +886912345678 洽詢');
    expect(result).not.toContain('912345678');
    expect(result).toContain('+886-9xx-***-***');
  });

  it('masks LINE IDs after 加賴', () => {
    const result = maskPII('詳情加賴:csms_agent_01');
    expect(result).not.toContain('csms_agent_01');
    expect(result).toContain('[LINE_ID已遮蔽]');
  });

  it('masks LINE IDs after Line:', () => {
    const result = maskPII('Line: my_line_id_123');
    expect(result).not.toContain('my_line_id_123');
    expect(result).toContain('[LINE_ID已遮蔽]');
  });

  it('masks lihi.cc short URL paths', () => {
    const result = maskPII('詳情見 lihi.cc/liwQB');
    expect(result).not.toContain('liwQB');
    expect(result).toContain('lihi.cc/[遮蔽]');
  });

  it('passes through text without PII unchanged', () => {
    const text = '今天天氣很好，請查看 https://example.com';
    expect(maskPII(text)).toBe(text);
  });

  it('handles empty string', () => {
    expect(maskPII('')).toBe('');
  });
});
