# Waraqi — build log

## Day 0 — setup
- Tauri 2 + vanilla JS. Scaffolded with the no-bundler template by mistake, added Vite
  by hand (`vite.config.js`, port 1420 strictPort, `index.html` moved to root).
- Plugins: sql (sqlite), fs, dialog. All permissions in `capabilities/default.json`.
- Identifier `ngo.josa.waraqi`.

## Day 0 — offline assets
Everything OCR needs is committed under `public/`, nothing is fetched at runtime:
- `tessdata/` ara + eng traineddata
- `tesseract/` worker.min.js + the `-lstm` cores
- `fonts/Amiri-Regular.ttf` for Arabic in exported PDFs

Two things cost time here. tesseract.js v7 picks its core at runtime based on
WASM SIMD support and only ever asks for the `-lstm` variants — shipping the
plain ones gives a 404 with no fallback. And `'wasm-unsafe-eval'` has to be in
the CSP or Tesseract does not start.

## Storage
SQLite via tauri-plugin-sql. `documents`, `tags`, `doc_tags`, plus an FTS5
virtual table with `content='documents'`. That content option means SQLite does
*not* maintain the index — three triggers do it on insert/update/delete. The
plugin also runs one statement per `execute()`, so the schema is an array.

## Arabic
`lib/arabic.js` strips tashkeel and tatweel, folds alef/yaa/taa-marbuta variants
and Arabic-Indic digits. Text is normalized before it is indexed and queries are
normalized the same way. FTS5's `unicode61` tokenizer does none of this for
Arabic, so without it search misses almost everything a user would actually type.

## Pipeline
drop or pick → sha256 (skip duplicates) → copy into AppData/library → decode
bytes to a canvas → Tesseract → normalize → keyword type guess → insert.

The copy is not tidiness: the webview can only display files inside
`$APPDATA/**` via `convertFileSrc`, so importing has to move the file first.

## Type suggestion
`lib/types.js`, keyword rules over the normalized text. No model. It is worse
than an LLM and it can be explained in one sentence, which is the trade we want.

## Export
- Searchable PDF: page image with the OCR text drawn at opacity 0 over it, Amiri
  embedded through fontkit. Invisible on screen, found by Ctrl+F.
- Whole archive: `files/` plus `index.csv` (UTF-8 BOM so Excel reads Arabic) and
  a README. Opens without Waraqi — that is the point.

## UI
Grid of cards, search box, viewer with tags and per-document PDF export. No
framework. Arabic and English, RTL and LTR, dark and light.

## Fixes after first run
- Blank grey window that swallowed clicks: `#viewer` is the fullscreen overlay
  and my CSS gave it `display: flex`, which overrides the browser's built-in
  `[hidden] { display: none }`. So it sat invisible on top of the page eating
  every click. Added a global `[hidden] { display: none !important }`.
- Import appeared to hang: progress was only reported once recognition started,
  so asset loading looked identical to a stall. The bar now shows the Tesseract
  stage (`loading tesseract core`, `loading language traineddata`, …) and every
  worker message is logged.

## Tainted canvas
Imports failed with `SecurityError: Tainted canvases may not be exported`. The
pipeline was loading the copied file back through `convertFileSrc`, which serves
it from `asset.localhost` — a different origin, so the canvas is tainted and
Tesseract cannot read the pixels back. Fixed by decoding the bytes we already
have in memory (`createImageBitmap(new Blob([bytes]))`) instead of round-tripping
through a URL. Faster too. `convertFileSrc` is still used for display, where
tainting does not matter.

## Broken relaxedsimd core
`RuntimeError: Aborted(missing function: _ZN9tesseract13DotProductSSEEPKfS1_i)`
on every import. tesseract.js picks its wasm core at runtime from
wasm-feature-detect, preferring relaxedsimd > simd > plain. Grepping the three
cores, `DotProductSSE` appears only in `tesseract-core-relaxedsimd-lstm.wasm.js`
— that build references a symbol it does not define, and this machine supports
relaxed SIMD so it was always the one selected. Fixed by pinning `corePath` to
`tesseract-core-simd-lstm.wasm.js` instead of handing it the directory. Cost:
the app now requires a WebView with WASM SIMD, which every current one has.

Also set `cacheMethod: 'none'`. Tesseract caches traineddata in IndexedDB keyed
by language name, so swapping a `.traineddata` file on disk changes nothing
until you clear site data. The models are local anyway; the cache only bought
confusion.

## OpenCV dropped
`opencv.js` is 11 MB of unminified JS with a 3 MB wasm embedded as base64. The
browser parses that synchronously on the main thread, so the window froze for
the whole load — no clicks, and timers did not even fire. Tried making it
opt-in, then cut it. Tesseract already does its own Otsu thresholding, so the
accuracy gain did not justify the size or the freeze. `lib/cv.js` is still in
the tree, unused, and `public/opencv/` can go.

## Round of fixes after first real use
- Cancel did nothing mid-document: the flag was only checked between files.
  It now terminates the Tesseract worker, which is the only way to stop a
  recognition already in flight.
- Search returned nothing and failed silently. Rewrote the FTS query without
  the table alias, and added a LIKE fallback over `ocr_norm` and `filename`
  for when MATCH errors or a document's OCR came back empty.
- PDF export opened the save dialog and wrote nothing — the error was thrown
  and never surfaced. Wrapped it, and switched image format detection from the
  file extension to the PNG magic bytes, since a .jpg that is really a PNG is
  common once phones are involved.

## Language
Two separate things, deliberately.

OCR language: no control at all, both models run on every page. There was a
picker for a while and it was the wrong idea. Asking someone to classify a
document before importing it is work the app should be doing, and a lot of what
people here scan is mixed anyway. Costs a little speed and a little accuracy
against a single model on a page that is purely one language.

Worth being clear that this is not language detection. Real script detection in
Tesseract needs `osd.traineddata` and the legacy engine, and the legacy cores
were dropped to fix the DotProductSSE crash. So "automatic" here means running
both, not choosing between them. `LANGS` at the top of `ui/importui.js` if it
ever needs to change.

UI language is the ع / EN button. `lib/i18n.js`, remembered in localStorage,
flips `dir` between rtl and ltr.

## Dark mode
`lib/theme.js`. Every colour was already a CSS variable, so it is one override
block on `html[data-theme="dark"]`. Follows the OS setting until the user picks
one, then remembers it. The icon shows what you get if you press it.

## Tag search
Typing a tag name finds documents carrying it, partial matches included. Tag
hits are returned ahead of full-text hits — if you typed a tag's name, that is
what you meant. Cards show their tags as chips and clicking one searches for it,
so the library is navigable without typing. Results are deduplicated across the
three passes (tags → FTS → LIKE fallback).

## Tag sidebar
`ui/sidebar.js`. Lists every tag that has documents, with counts, from the
`listTags()` that already existed. Clicking a row puts the tag in the search box
and re-runs the search, so there is one filtering path rather than two. "All
documents" clears it. The highlighted row follows the search box, so a tag
clicked in the sidebar and one typed by hand look the same.

Collapses sideways to a narrow strip rather than folding the list away, and the
state is remembered. The arrow shows the direction the panel is about to move,
which means it has to flip twice over: once for collapsed or open, and again for
rtl against ltr, because the sidebar sits on the right in Arabic and the left in
English.

## Tag normalization
A tag saved as فاتورة is now found by typing فاتوره. Rather than add a
normalized column and deal with migrating existing databases, tags are compared
in JS through the same `normalize()` the text index uses. There are only ever a
few dozen tags so the cost is irrelevant. `addTag` reuses an existing tag that
differs only by spelling, which stops فاتورة and فاتوره becoming two tags.

## Auto tags
`suggestTags()` in `lib/types.js` returns every rule that matched, and the
importer applies them as tags. Same rule table that already produced the
document type, so adding a rule gives you both a type and a tag with one edit.
A document can get several, which is right: a payslip that mentions a bank
genuinely is both. Auto tags are ordinary tags, so they can be removed by hand.

## Auto tag fixes
Two problems showed up once real documents went through.

Matching was `text.includes(word)`, which finds a keyword inside other words.
معقد contains عقد, so ordinary documents were being tagged as contracts, and
"totally" would have matched "total". Now the text is padded and stripped of
punctuation and keywords are matched as whole words or whole phrases.

Labels were Arabic only, left over from when the UI was Arabic only. Then they
briefly followed the UI language, which was also wrong: the tag should describe
the document, not the app chrome. Now each rule carries an `ar` and an `en`
label and the script of the keyword that actually matched decides which is used.
A page reading "Passport" is tagged Passport, one reading جواز سفر is tagged
جواز سفر. If a bilingual page matches in both scripts, the dominant script of
the page breaks the tie.

Side effect worth having: `types.js` no longer imports `i18n.js`, and the same
document always produces the same tag regardless of who imports it or what
language their UI is set to.

## Form controls in dark mode
The search box had a background but no `color`, so the box followed the theme
and the text stayed at the browser default black. `select` had it, the input
did not, which is why only one of them looked wrong. Replaced with one rule
covering `input`, `select` and `textarea`, which also fixed the tag field in
the viewer since that had no rule at all. Added `::placeholder`, a focus
outline that did not exist, and `color-scheme: dark` so the engine draws its
own widgets and scrollbars dark instead of light.

## Delete left the file behind
`deleteDoc` only removed the database rows. The image stayed in
`AppData/library`, so deleting a document hid it from the app while leaving it
on disk. On an app whose pitch is that your documents are yours and stay local,
that is the wrong kind of bug.

`deleteDocument()` now lives in `importer.js`, next to the code that put the
file there, and removes the file before the rows. If the file cannot be removed
it logs and deletes the rows anyway, otherwise a locked file would make a
document permanently undeletable from the UI.

The `fs:allow-remove` scope is deliberately narrow, `$APPDATA/library/**` and
nothing else, unlike read and write which are `**` because imports and exports
need to reach arbitrary paths.

## Counter stuck at one
Importing several files showed "1 / n" the whole way through. The Tesseract
logger is baked into the worker at creation, so it closed over the first file's
callback. Every file after that hit the early return in `getWorker` and its
callback was discarded, meaning all progress was reported against file one,
which had `index: 0`. Replaced the closure with a module-level handler that
`recognize()` swaps per document and clears in a `finally`.

## Preprocessing, second attempt
OpenCV was cut for being 11 MB and freezing the main thread. `lib/prep.js` does
the useful part in plain canvas for nothing: upscale so the short side is at
least 1600px, capped at 16 megapixels, then greyscale and stretch the 2nd to
98th percentile of brightness onto the full range. Percentiles rather than min
and max so a single dark speck does not flatten the page.

Also set `user_defined_dpi: '300'` on the worker. Since we now upscale to
roughly that, telling Tesseract stops it estimating resolution itself, which it
frequently gets wrong on photos and which changes how it segments the page.

## Open folder was denied
"Not allowed to open path ...\library". The opener plugin keeps its own path
scope, separate from the fs one. Listing `opener:allow-open-path` as a bare
permission enables the command but leaves its allow list empty, so every path
is refused. Replaced it with a scoped entry naming `$APPDATA/library` and
`$APPDATA/library/**`, the folder itself as well as its contents, because the
two are matched separately.

Same shape of mistake as the fs permissions earlier. In Tauri v2 a bare
permission grants the command, a scoped entry grants the paths, and anything
touching the filesystem needs both.

## Confidence filtering
A US driving licence came back with every real field correct, SOUTH CAROLINA,
the licence number, name, address, dates, height, eye colour, wrapped in a mess
of Arabic fragments. There is no Arabic on that card. The Arabic model, having
nothing to read, was inventing words out of the guilloche background, the
hologram and the microprint.

Those guesses come back with low confidence, so `recognize` now asks for
`blocks` as well as `text` and rebuilds the output line by line rather than
taking `data.text`. First attempt dropped words under 60 confidence and lines
whose surviving mean was under 55. If filtering removes everything the
thresholds were wrong for that page, so it falls back to the raw text.
Half-noisy text beats none.

This is the real answer to running two models at once. It is cheaper than a
second recognition pass and it fixes the symptom directly.

Then a Jordanian passport, a ~600px Google thumbnail, came back nearly empty:
at that size every word is low confidence and thresholds tuned on a sharp scan
deleted the page. Dropped them to 45 and 40 and added a shape test instead,
which is what actually removes the noise. Spare-model output is nearly always
punctuation and digit soup, so a word is kept only if it contains a letter or a
run of two or more digits. MRZ lines survive because they contain letters.

Used `\p{Nd}` rather than `\d` for that, otherwise Arabic-Indic numerals like
٢٧ count as noise and get deleted. On an Arabic-first app that would have been
a bad bug to ship. Mean page confidence is now logged so the thresholds can be
tuned against real documents instead of guessed at.

Current values: `MIN_WORD_CONF` 45, `MIN_LINE_CONF` 40, plus the shape test.
Both were tuned against two stock images off Google, which is not a test set.
They should be revisited once there are real phone photos to check against.

## Deskew
`prep.js` now estimates skew by projection profile. Shear the page by each
candidate angle from -8 to +8 degrees in quarter degree steps, sum the dark
pixels per row, and score how uneven those sums are. Level text lines give sharp
peaks and troughs; a tilted page smears them flat. Highest variance wins. Run on
a 500px wide copy so it is a few million operations, not a few hundred million.

Sign trap worth remembering: the winning shear is the one that *undoes* the
tilt, so the returned angle already has the opposite sign to the page. Rotating
by the negative of it, which is what the code did first, doubles the skew. A
synthetic test of pages tilted 0, +3 and -5 degrees caught it.

Rotations under 0.3 degrees are skipped, since resampling the whole page costs
more than that much tilt does.

## Known gaps
- PDF text layer is unshaped (pdf-lib has no bidi), so it is searchable but the
  invisible layer is not correctly ordered Arabic.
- Multi-page PDFs in, not supported. Images only.
- `ara.traineddata` is still the 4.0.0 build, which carries a legacy engine we
  never use. `_best` would be smaller and more accurate.
