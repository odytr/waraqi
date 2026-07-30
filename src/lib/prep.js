// Plain canvas work, no libraries. Tesseract is tuned for roughly 300 DPI and
// guesses badly on small, low contrast phone photos. Upscaling and stretching
// the contrast costs milliseconds and is the cheapest accuracy we can buy.

const MIN_SIDE = 1600;      // below this, letters are too small for the model
const MAX_PIXELS = 16e6;    // above this we are just burning memory

function resize(canvas) {
  const { width: w, height: h } = canvas;
  let scale = Math.min(MIN_SIDE / Math.min(w, h), 3);
  if (scale <= 1) return canvas;
  if (w * h * scale * scale > MAX_PIXELS) {
    scale = Math.sqrt(MAX_PIXELS / (w * h));
  }
  if (scale <= 1) return canvas;

  const out = document.createElement('canvas');
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

// Greyscale, then map the 2nd to 98th percentile of brightness onto 0..255.
// Percentiles rather than min and max so one dark speck or a blown highlight
// does not flatten the whole page.
function stretch(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;

  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
    d[i] = d[i + 1] = d[i + 2] = g;
    hist[g]++;
  }

  const total = d.length / 4;
  const lowCut = total * 0.02;
  const highCut = total * 0.98;
  let lo = 0, hi = 255, seen = 0;
  for (let v = 0; v < 256; v++) { seen += hist[v]; if (seen >= lowCut) { lo = v; break; } }
  seen = 0;
  for (let v = 0; v < 256; v++) { seen += hist[v]; if (seen >= highCut) { hi = v; break; } }
  if (hi - lo < 16) return canvas;   // already flat, leave it alone

  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    lut[v] = Math.max(0, Math.min(255, ((v - lo) * 255) / (hi - lo)));
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i + 1] = d[i + 2] = lut[d[i]];
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function prepare(canvas) {
  return stretch(resize(canvas));
}
