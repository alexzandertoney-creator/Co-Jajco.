# Dictionary seed data

The files in this folder (`pl-en.json`, `es-en.json`, `fr-en.json`, `it-en.json`, and `en-pl.json`, which is reversed from `pl-en.json`) are derived from:

- **Wiktionary** (https://en.wiktionary.org/), via the machine-readable extracts at https://kaikki.org/ (Tatu Ylonen, *Wiktextract*). Licensed **CC BY-SA 4.0** (and GFDL).
- **FrequencyWords** by Hermit Dave (https://github.com/hermitdave/FrequencyWords), word frequencies from OpenSubtitles. Licensed **CC BY-SA 4.0**.
- The Co? Jajco. starter decks (`public/recommendedSets.js`) and, for Spanish, `public/vocab/spanish_words.json`.

Because of the share-alike terms, these derived files are also available under **CC BY-SA 4.0**. The app credits the sources on the Stories page.

Rebuild with: `node scripts/buildDictionary.mjs pl` (or `es`, `fr`, `it`), then `node scripts/buildReverseDictionary.mjs`.
