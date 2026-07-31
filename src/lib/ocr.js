import { createWorker } from 'tesseract.js';

// All four paths point at files in public/. Nothing here may reach a CDN -
// that is the whole promise of the app.
let worker;
let workerLangs;

// The logger is baked into the worker when it is created, so it cannot close
// over a per-file callback. It reads this instead, and recognize() swaps it
// for each document. Without this, every file after the first reported
// progress against file one and the counter stuck at "1 / n".
let statusHandler = null;

export async function getWorker(langs = ['ara', 'eng']) {
  const key = langs.join('+');
  if (worker && workerLangs === key) return worker;
  if (worker) await terminate();

  worker = await createWorker(langs, 1, {
    workerPath: '/tesseract/worker.min.js',
    // Pinned, not a directory. Left to auto-detect, tesseract.js picks the
    // relaxedsimd build on machines that support it, and that build aborts
    // with "missing function: _ZN9tesseract13DotProductSSEEPKfS1_i".
    corePath: '/tesseract/tesseract-core-simd-lstm.wasm.js',
    langPath: '/tessdata',
    gzip: true,
    workerBlobURL: false,
    // The models are bundled locally, so caching them in IndexedDB buys
    // nothing and means swapping a .traineddata file has no effect until
    // you clear site data.
    cacheMethod: 'none',
    logger: (m) => {
      console.log('[ocr]', m.status, m.progress);
      statusHandler?.(m);
    },
    errorHandler: (e) => console.error('[ocr] worker error', e),
  });
  // We upscale to roughly 300 DPI in prep.js. Telling Tesseract that stops it
  // estimating the resolution itself, which it often gets wrong on photos.
  await worker.setParameters({ user_defined_dpi: '300' });

  workerLangs = key;
  return worker;
}

// Running two models means the one with nothing to do invents words out of
// whatever texture is on the page. On an English ID card the Arabic model
// reads the guilloche background and the hologram as Arabic. Those guesses
// come back with low confidence, so we can throw them away.
// Tuned against a sharp scan first, which was a mistake: on a low resolution
// photo every word is low confidence and an aggressive cut deletes the whole
// page. These are deliberately permissive, because the shape test below does
// most of the work.
const MIN_WORD_CONF = 45;
const MIN_LINE_CONF = 40;

// The noise a spare language model produces is nearly always punctuation and
// digit soup: "><", "~", "7 27 2 7 . :". Real content has letters in it, or is
// a number of at least two digits. MRZ lines like P<JORALAMARNEH<<MUATH survive
// because they contain letters.
// \p{Nd} rather than \d, otherwise Arabic-Indic numerals like ٢٧ are treated
// as noise and deleted. They are all over Jordanian documents.
const LETTER = /\p{L}/u;
const NUMBER = /\p{Nd}{2,}/u;

function looksLikeContent(word) {
  return LETTER.test(word) || NUMBER.test(word);
}

// Logged so the thresholds above can be tuned against real documents rather
// than guessed at. A page averaging under about 50 is too small or too blurred
// for OCR and no amount of filtering will save it.
function meanConfidence(data) {
  let sum = 0, n = 0;
  for (const b of data.blocks ?? [])
    for (const p of b.paragraphs ?? [])
      for (const l of p.lines ?? [])
        for (const w of l.words ?? []) { sum += w.confidence; n++; }
  return n ? sum / n : 0;
}

function cleanText(data) {
  if (!Array.isArray(data.blocks) || !data.blocks.length) return data.text ?? '';

  const lines = [];
  for (const block of data.blocks) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        const words = (line.words ?? [])
          .filter((w) => w.confidence >= MIN_WORD_CONF)
          .filter((w) => looksLikeContent(w.text ?? ''));
        if (!words.length) continue;

        const mean = words.reduce((sum, w) => sum + w.confidence, 0) / words.length;
        if (mean < MIN_LINE_CONF) continue;

        const text = words.map((w) => w.text).join(' ').replace(/\s+/g, ' ').trim();
        if (text.length < 2) continue;
        lines.push(text);
      }
    }
  }

  // If filtering ate everything, the thresholds were wrong for this page.
  // Half-noisy text beats no text.
  return lines.length ? lines.join('\n') : (data.text ?? '');
}

export async function recognize(canvas, langs, onStatus) {
  const w = await getWorker(langs);
  statusHandler = onStatus ?? null;
  try {
    const { data } = await w.recognize(canvas, {}, { text: true, blocks: true });
    const kept = cleanText(data);
    console.log('[ocr] raw', (data.text ?? '').length, 'chars ->', kept.length,
                'kept, mean confidence', meanConfidence(data).toFixed(1));
    return kept;
  } finally {
    statusHandler = null;
  }
}

export async function terminate() {
  statusHandler = null;
  if (!worker) return;
  await worker.terminate();
  worker = undefined;
  workerLangs = undefined;
}
