// Rule-based, not AI. Runs on the normalized text, so the keywords are written
// normalized too (no hamza, no taa marbuta). Being able to explain exactly why
// a document was labelled is worth more here than being clever.
//
// Each rule is [label, keywords]. The label is what the user sees, the keywords
// are what we look for. Add rules here, nothing else needs to change.

const RULES = [
  ['جواز سفر',  ['جواز', 'passport']],
  ['هوية',      ['الرقم الوطني', 'هويه', 'id card', 'national id']],
  ['فاتورة',    ['فاتوره', 'ضريبه', 'المجموع', 'invoice', 'vat', 'total due']],
  ['عقد',       ['عقد', 'اتفاقيه', 'الطرف الاول', 'contract', 'agreement']],
  ['شهادة',     ['شهاده', 'يشهد', 'certificate', 'diploma']],
  ['وصفة طبية', ['وصفه', 'دواء', 'الطبيب', 'prescription', 'clinic']],
  ['كشف بنكي',  ['كشف حساب', 'رصيد', 'بنك', 'statement', 'iban']],
  ['رخصة قيادة',['رخصه قياده', 'driving licence', 'driver license', 'driving license']],
];

function hits(text, words) {
  return words.filter((w) => text.includes(w)).length;
}

// The single best guess, used for the document type shown on the card.
export function suggestType(text) {
  if (!text) return null;
  let best = null;
  for (const [label, words] of RULES) {
    const n = hits(text, words);
    if (n && (!best || n > best.n)) best = { label, n };
  }
  return best ? { type: best.label, confidence: Math.min(1, best.n / 3) } : null;
}

// Every rule that matched, used to tag the document automatically. A payslip
// that mentions a bank is legitimately both things.
export function suggestTags(text) {
  if (!text) return [];
  return RULES.filter(([, words]) => hits(text, words) > 0).map(([label]) => label);
}
