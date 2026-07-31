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

const ARABIC = /\p{Script=Arabic}/u;

// Pad with spaces and strip punctuation so a keyword only matches a whole word
// or a whole phrase. Without this, معقد counts as عقد and everything gets
// tagged as a contract.
function padded(text) {
  return ' ' + text.replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
}

function matched(text, words) {
  return words.filter((w) => text.includes(' ' + w + ' '));
}

// Whether the page itself is mostly Arabic. Only used to break a tie when a
// document matched a rule in both scripts.
function mostlyArabic(text) {
  let ar = 0, latin = 0;
  for (const ch of text) {
    if (ARABIC.test(ch)) ar++;
    else if (ch >= 'a' && ch <= 'z') latin++;
  }
  return ar >= latin;
}

// The label follows the document, not the UI. A page that says "Passport" gets
// tagged Passport; one that says جواز سفر gets جواز سفر.
function label(rule, hits, arabicPage) {
  const ar = hits.filter((w) => ARABIC.test(w)).length;
  const en = hits.length - ar;
  if (ar && !en) return rule.ar;
  if (en && !ar) return rule.en;
  return arabicPage ? rule.ar : rule.en;
}

// The single best guess, shown as the document type on the card.
export function suggestType(text) {
  if (!text) return null;
  const p = padded(text);
  const arabicPage = mostlyArabic(text);

  let best = null;
  for (const rule of RULES) {
    const hits = matched(p, rule.words);
    if (hits.length && (!best || hits.length > best.hits.length)) {
      best = { rule, hits };
    }
  }
  return best
    ? { type: label(best.rule, best.hits, arabicPage),
        confidence: Math.min(1, best.hits.length / 3) }
    : null;
}

// Every rule that matched, applied as tags. A payslip that mentions a bank
// legitimately is both things.
export function suggestTags(text) {
  if (!text) return [];
  const p = padded(text);
  const arabicPage = mostlyArabic(text);

  return RULES
    .map((rule) => ({ rule, hits: matched(p, rule.words) }))
    .filter((r) => r.hits.length)
    .map((r) => label(r.rule, r.hits, arabicPage));
}
