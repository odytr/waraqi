# Third Party Components

Waraqi runs entirely offline. Every model, binary and font it needs is committed
under `public/` and ships inside the application bundle. Nothing is fetched at
runtime. The components below are redistributed under the licences listed.

| Component | Version | Bundled as | Licence | Upstream |
|---|---|---|---|---|
| Tesseract OCR trained data (Arabic, English) | 4.0.0 | `public/tessdata/{ara,eng}.traineddata.gz` | Apache-2.0 | https://github.com/tesseract-ocr/tessdata |
| tesseract.js | 7.0.0 | `public/tesseract/worker.min.js` | Apache-2.0 | https://github.com/naptha/tesseract.js |
| tesseract.js-core (WASM) | 7.0.0 | `public/tesseract/tesseract-core-*-lstm.wasm.js` | Apache-2.0 | https://github.com/naptha/tesseract.js-core |
| Amiri | 1.x | `public/fonts/Amiri-Regular.ttf` | SIL OFL 1.1 | https://github.com/aliftype/amiri |
| pdf-lib | ^1.17 | npm dependency | MIT | https://github.com/Hopding/pdf-lib |
| @pdf-lib/fontkit | ^1.1 | npm dependency | MIT | https://github.com/Hopding/fontkit |
| Tauri | 2.x | Rust and npm dependencies | MIT / Apache-2.0 | https://github.com/tauri-apps/tauri |
| Vite | ^6 | build tooling, not shipped | MIT | https://github.com/vitejs/vite |

## Licence notes

**Apache-2.0** (Tesseract, tesseract.js) requires that the copyright and licence
notices are retained, and that modified files are marked as modified. Waraqi
ships these artifacts unmodified. Full text: https://www.apache.org/licenses/LICENSE-2.0

**SIL Open Font License 1.1** (Amiri) permits bundling and redistribution with
software. The font ships unmodified and is not sold on its own. The Reserved
Font Name "Amiri" is not used for any modified version, because there is no
modified version in this project. Full text: https://openfontlicense.org/

**MIT** (pdf-lib, fontkit, Vite) requires retaining the copyright notice, which
is preserved in the distributions.

OpenCV.js was used during development and removed before release. It is no
longer bundled or loaded.
