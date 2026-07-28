// Rule-based, not AI. Runs on the normalized text, so keywords are written
// normalized too (no hamza, no taa marbuta). Being able to explain exactly
// why a document was labelled is worth more here than being clever.

const RULES = [
  ['فاتوره',   ['فاتوره', 'ضريبه', 'المجموع', 'invoice', 'total', 'vat']],
  ['هويه',     ['الرقم الوطني', 'هويه', 'جواز', 'passport', 'id card']],
  ['عقد',      ['عقد', 'اتفاقيه', 'الطرف الاول', 'contract', 'agreement']],
  ['شهاده',    ['شهاده', 'يشهد', 'certificate', 'diploma']],
  ['وصفه طبيه',['وصفه', 'دواء', 'الطبيب', 'prescription', 'clinic']],
  ['كشف بنكي', ['كشف حساب', 'رصيد', 'بنك', 'statement', 'balance', 'iban']],
];

export function suggestType(normalizedText) {
  if (!normalizedText) return null;
  let best = null;
  for (const [type, words] of RULES) {
    const hits = words.filter((w) => normalizedText.includes(w)).length;
    if (hits && (!best || hits > best.hits)) best = { type, hits };
  }
  if (!best) return null;
  return { type: best.type, confidence: Math.min(1, best.hits / 3) };
}
