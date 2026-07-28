import { createWorker } from 'tesseract.js';

let workerPromise;

export function getWorker(onProgress) {
  if (!workerPromise) {
    workerPromise = createWorker(['ara', 'eng'], 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath:   '/tesseract/',
      langPath:   '/tessdata/',    // local, bundled — no network
      cacheMethod: 'none',
      logger: m => onProgress?.(m),   // { status: 'recognizing text', progress: 0.42 }
    });
  }
  return workerPromise;
}

export async function recognize(canvasOrImg, onProgress) {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(canvasOrImg, {}, { blocks: true });
  return { text: data.text, confidence: data.confidence, words: flattenWords(data) };
}

/** Tesseract.js changed where word boxes live between versions. Handle both. */
function flattenWords(data) {
  if (Array.isArray(data.words) && data.words.length) return data.words;
  const out = [];
  for (const b of data.blocks ?? [])
    for (const p of b.paragraphs ?? [])
      for (const l of p.lines ?? [])
        for (const w of l.words ?? []) out.push(w);
  return out;
}

export async function shutdown() {
  if (workerPromise) { (await workerPromise).terminate(); workerPromise = null; }
}