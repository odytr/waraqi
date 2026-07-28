import { createWorker } from 'tesseract.js';

// All four paths point at files in public/. Nothing here may reach a CDN -
// that is the whole promise of the app.
let worker;
let workerLangs;

export async function getWorker(langs = ['ara', 'eng'], onStatus) {
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
      onStatus?.(m);
    },
    errorHandler: (e) => console.error('[ocr] worker error', e),
  });
  workerLangs = key;
  return worker;
}

export async function recognize(canvas, langs, onStatus) {
  const w = await getWorker(langs, onStatus);
  const { data } = await w.recognize(canvas);
  return data.text ?? '';
}

export async function terminate() {
  if (!worker) return;
  await worker.terminate();
  worker = undefined;
  workerLangs = undefined;
}
