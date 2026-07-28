// Rule-based document type suggestion — zero AI.  Manual §4.10
// Keyword rules over the normalized text; explainable and offline.

/** @returns {{type: string, confidence: number} | null} */
export function suggestType(normalizedText) {
  throw new Error('TODO §4.10');
}
