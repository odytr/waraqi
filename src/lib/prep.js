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

// Skew estimation by projection profile. Shear the page by a candidate angle,
// sum dark pixels per row, and score how uneven those sums are. Text lines that
// are level give sharp peaks and troughs; a tilted page smears them flat. The
// angle with the highest variance is the skew.
//
// Done on a ~500px wide copy, so all of this is a few million operations rather
// than a few hundred million.
const MAX_SKEW = 8;         // degrees either way, beyond this it is not a scan
const STEP = 0.25;
const APPLY_ABOVE = 0.3;    // rotating by less than this is not worth the resample

// Returns the angle to rotate BY, not the tilt of the page. The winning shear
// is the one that undoes the tilt, so it already has the opposite sign.
function correctionAngle(canvas) {
  const scale = Math.min(1, 500 / canvas.width);
  const w = Math.max(1, Math.round(canvas.width * scale));
  const h = Math.max(1, Math.round(canvas.height * scale));

  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  small.getContext('2d').drawImage(canvas, 0, 0, w, h);

  const px = small.getContext('2d', { willReadFrequently: true })
                  .getImageData(0, 0, w, h).data;

  // 1 where there is ink. The image is already contrast stretched by here.
  const ink = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    ink[j] = px[i] < 128 ? 1 : 0;
  }

  let bestAngle = 0;
  let bestScore = -1;

  for (let deg = -MAX_SKEW; deg <= MAX_SKEW; deg += STEP) {
    const slope = Math.tan((deg * Math.PI) / 180);
    const rows = new Float64Array(h);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (!ink[row + x]) continue;
        const ry = y + slope * (x - w / 2);
        if (ry >= 0 && ry < h) rows[ry | 0]++;
      }
    }
    let mean = 0;
    for (let y = 0; y < h; y++) mean += rows[y];
    mean /= h;
    let variance = 0;
    for (let y = 0; y < h; y++) {
      const d = rows[y] - mean;
      variance += d * d;
    }
    if (variance > bestScore) {
      bestScore = variance;
      bestAngle = deg;
    }
  }
  return bestAngle;
}

function rotate(canvas, deg) {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = Math.round(canvas.width * cos + canvas.height * sin);
  const h = Math.round(canvas.width * sin + canvas.height * cos);

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#fff';           // corners exposed by the rotation
  ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return out;
}

function deskew(canvas) {
  const deg = correctionAngle(canvas);
  console.log('[prep] rotating by', deg.toFixed(2), 'deg');
  return Math.abs(deg) < APPLY_ABOVE ? canvas : rotate(canvas, deg);
}

export function prepare(canvas) {
  return deskew(stretch(resize(canvas)));
}
