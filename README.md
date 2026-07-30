# ورقي / Waraqi

An offline document archive for Arabic paperwork.

You photograph your documents, Waraqi reads the text out of them and lets you
search that text later. Everything happens on your machine. There is no account,
no server, and no network call at any point, including the first run.

## Why

The tools that do this already exist, but they assume a server you have to run,
and none of them handle Arabic well. That combination puts them out of reach of
the people who need them most: anyone holding a folder of contracts, IDs,
prescriptions and invoices they cannot search.

## What it does

- Import photos by dragging them onto the window or through a file picker
- OCR in Arabic, English, or both
- Full text search over the extracted text, with Arabic normalization so that
  writing فاتوره finds فاتورة
- Tags, and search by tag
- A rule based guess at what kind of document it is
- Export a single document as a searchable PDF
- Export the whole archive as plain files plus a CSV that opens anywhere

## Running it

Needs Node 20+ and Rust.

```bash
npm install
npm run tauri dev
```

To build an installer:

```bash
npm run tauri build
```

Everything OCR needs is committed under `public/`, so a fresh clone builds and
runs without downloading anything.

## How it is put together

Tauri 2 for the shell, vanilla JavaScript for the frontend, SQLite for storage.

```
src/lib/    arabic.js normalization, db.js schema and FTS triggers,
            ocr.js Tesseract, importer.js the pipeline, search.js,
            tags.js, types.js, export/
src/ui/     library grid, document viewer, import handling
public/     tessdata, tesseract cores, Amiri font
```

Search uses SQLite FTS5. Text is normalized before it is indexed and queries are
normalized the same way, which is the part that makes Arabic search actually
work. Tesseract runs in a worker with its models loaded from disk.


## Licence

MIT, see `LICENSE`. Third party components and their licences are listed in
`THIRD_PARTY.md`.
