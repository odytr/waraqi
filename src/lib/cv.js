let ready;

export function loadCv() {
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/opencv/opencv.js';
    s.onerror = reject;
    s.onload = () => {
      // Newer builds resolve a promise; older ones use onRuntimeInitialized.
      if (window.cv instanceof Promise) window.cv.then(m => { window.cv = m; resolve(m); });
      else if (window.cv?.Mat) resolve(window.cv);
      else window.cv.onRuntimeInitialized = () => resolve(window.cv);
    };
    document.head.appendChild(s);
  });
  return ready;
}

/** imgEl: an <img> or <canvas> already loaded. Returns a <canvas> to feed Tesseract. */
export async function clean(imgEl) {
  const cv = await loadCv();
  const src = cv.imread(imgEl);
  const gray = new cv.Mat();

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.adaptiveThreshold(gray, gray, 255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 31, 10);

  const angle = estimateSkew(cv, gray);
  if (Math.abs(angle) > 0.7 && Math.abs(angle) < 20) rotate(cv, gray, -angle);

  const out = document.createElement('canvas');
  cv.imshow(out, gray);
  src.delete(); gray.delete();
  return out;
}

function estimateSkew(cv, bin) {
  const inv = new cv.Mat();
  cv.bitwise_not(bin, inv);                 // text becomes white on black
  const pts = new cv.Mat();
  cv.findNonZero(inv, pts);
  if (pts.rows === 0) { inv.delete(); pts.delete(); return 0; }
  const rect = cv.minAreaRect(pts);         // tightest rotated box around all text
  let a = rect.angle;
  if (a < -45) a += 90;
  inv.delete(); pts.delete();
  return a;
}

function rotate(cv, mat, deg) {
  const center = new cv.Point(mat.cols / 2, mat.rows / 2);
  const M = cv.getRotationMatrix2D(center, deg, 1);
  cv.warpAffine(mat, mat, M, new cv.Size(mat.cols, mat.rows),
      cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
  M.delete();
}