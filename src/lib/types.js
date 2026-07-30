import { lang } from './i18n.js';

// Rule-based, not AI. Runs on the normalized text, so the keywords are written
// normalized too (no hamza, no taa marbuta). Being able to explain exactly why
// a document was labelled is worth more here than being clever.
//
// Add a rule here and you get both a document type and an auto tag from it.
// Nothing else needs to change.

const RULES = [
  { ar: 'جواز سفر',   en: 'Passport',
    words: ['جواز سفر', 'جواز', 'passport'] },

  { ar: 'هوية',       en: 'ID',
    words: ['الرقم الوطني', 'هويه', 'بطاقه شخصيه', 'id card', 'national id'] },

  { ar: 'رخصة قيادة', en: 'Driving licence',
    words: ['رخصه قياده', 'رخصه سياقه', 'driving licence', 'driving license',
            'driver licence', 'driver license'] },

  { ar: 'فاتورة',     en: 'Invoice',
    words: ['فاتوره', 'ضريبه', 'invoice', 'vat', 'total due', 'amount due'] },

  { ar: 'عقد',        en: 'Contract',
    words: ['عقد', 'اتفاقيه', 'الطرف الاول', 'contract', 'agreement'] },

  { ar: 'شهادة',      en: 'Certificate',
    words: ['شهاده', 'يشهد', 'certificate', 'diploma'] },

  { ar: 'وصفة طبية',  en: 'Prescription',
    words: ['وصفه طبيه', 'وصفه', 'الصيدليه', 'prescription'] },

  { ar: 'كشف بنكي',   en: 'Bank statement',
    words: ['كشف حساب', 'رصيد', 'iban', 'bank statement', 'account balance'] },
];

// Pad with spaces and strip punctuation so a keyword only matches a whole word
// or a whole phrase. Without this, معقد counts as عقد and everything gets
// tagged as a contract.
function padded(text) {
  return ' ' + text.replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
}

function hits(text, words) {
  return words.filter((w) => text.includes(' ' + w + ' ')).length;
}

function label(rule) {
  return lang() === 'en' ? rule.en : rule.ar;
}

// The single best guess, shown as the document type on the card.
export function suggestType(text) {
  if (!text) return null;
  const p = padded(text);
  let best = null;
  for (const rule of RULES) {
    const n = hits(p, rule.words);
    if (n && (!best || n > best.n)) best = { rule, n };
  }
  return best
    ? { type: label(best.rule), confidence: Math.min(1, best.n / 3) }
    : null;
}

// Every rule that matched, applied as tags. A payslip that mentions a bank
// legitimately is both things.
export function suggestTags(text) {
  if (!text) return [];
  const p = padded(text);
  return RULES.filter((r) => hits(p, r.words) > 0).map(label);
}
