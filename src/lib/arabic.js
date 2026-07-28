// Everything written to the search index passes through here, and so does
// every query. If the two ever disagree, searches come back empty.

export function normalize(text) {
  if (!text) return '';
  return text
    .replace(/[ً-ْٰ]/g, '')        // tashkeel
    .replace(/ـ/g, '')                        // tatweel
    .replace(/[آأإٱ]/g, 'ا') // alef variants
    .replace(/ى/g, 'ي')                  // alef maqsura -> yaa
    .replace(/ة/g, 'ه')                  // taa marbuta -> haa
    .replace(/[٠-٩]/g, (d) =>            // arabic-indic digits
      String.fromCharCode(d.charCodeAt(0) - 0x0630))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
