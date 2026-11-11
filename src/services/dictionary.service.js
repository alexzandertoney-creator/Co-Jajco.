const db = require('../config/db.js');

// ============ SHARED DICTIONARY ============
// One community dictionary per language pair: word (in the language being learned)
// -> translation. It is seeded from bundled data (Wiktionary + the starter decks) and
// grows from translations users add. Entries are anonymous: no user id is stored.
// "uses" counts how many times a pair was added; lookups prefer the most-used.

// Bundled seed files, loaded only when that pair is first used.
// Static require() paths so Vercel's bundler includes the JSON with the function.
const SEEDS = {
  'pl:en': () => require('../data/dictionary/pl-en.json'),
  'es:en': () => require('../data/dictionary/es-en.json'),
  'fr:en': () => require('../data/dictionary/fr-en.json'),
  'it:en': () => require('../data/dictionary/it-en.json'),
};

let tableReady = null;
function ensureTables() {
  // to_regclass first: once the tables exist, no DDL (and no locks) ever run again.
  tableReady ??= db.query(`SELECT to_regclass('public.dictionary_entries') AS t`)
    .then((r) => r.rows[0].t ? null : db.query(`
      CREATE TABLE IF NOT EXISTS dictionary_entries (
        id SERIAL PRIMARY KEY,
        learning_lang TEXT NOT NULL,
        native_lang TEXT NOT NULL,
        word TEXT NOT NULL,
        translation TEXT NOT NULL,
        lemma TEXT,
        uses INTEGER NOT NULL DEFAULT 1,
        source TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (learning_lang, native_lang, word, translation)
      );
      CREATE INDEX IF NOT EXISTS dictionary_lookup ON dictionary_entries (learning_lang, native_lang, word);
      CREATE TABLE IF NOT EXISTS dictionary_seeds (pair TEXT PRIMARY KEY, version INTEGER NOT NULL);
    `))
    .catch((err) => { tableReady = null; throw err; });
  return tableReady;
}

// Lowercase, trim punctuation from the edges ("Kota," -> "kota"), keep inner apostrophes/hyphens.
const normalize = (s) => String(s ?? '').toLowerCase().normalize('NFC')
  .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();

const seeding = new Map();
// Loads (or upgrades) the bundled seed for a pair the first time it is needed.
// Re-running is harmless: duplicate pairs are skipped.
function ensureSeeded(learningLang, nativeLang) {
  const pair = `${learningLang}:${nativeLang}`;
  const load = SEEDS[pair];
  if (!load) return Promise.resolve();
  if (!seeding.has(pair)) {
    seeding.set(pair, (async () => {
      const seed = load(); // { version, entries: [[word, translation, lemma?], ...] }
      const done = await db.query('SELECT version FROM dictionary_seeds WHERE pair = $1', [pair]);
      if (done.rows[0]?.version >= seed.version) return;
      const CHUNK = 5000;
      for (let i = 0; i < seed.entries.length; i += CHUNK) {
        const rows = seed.entries.slice(i, i + CHUNK).map(([w, t, l]) => ({ w, t, l: l || null }));
        await db.query(
          `INSERT INTO dictionary_entries (learning_lang, native_lang, word, translation, lemma, source)
           SELECT $1, $2, x.w, x.t, x.l, 'seed' FROM json_to_recordset($3::json) AS x(w text, t text, l text)
           ON CONFLICT (learning_lang, native_lang, word, translation) DO NOTHING`,
          [learningLang, nativeLang, JSON.stringify(rows)]
        );
      }
      await db.query(
        `INSERT INTO dictionary_seeds (pair, version) VALUES ($1, $2)
         ON CONFLICT (pair) DO UPDATE SET version = EXCLUDED.version`,
        [pair, seed.version]
      );
    })().catch((err) => { seeding.delete(pair); throw err; }));
  }
  return seeding.get(pair);
}

/**
 * Best translation for each word: { [normalizedWord]: { translation, lemma } }.
 * Words not found are simply absent.
 */
async function lookup(learningLang, nativeLang, words) {
  await ensureTables();
  await ensureSeeded(learningLang, nativeLang);
  const wanted = [...new Set(words.map(normalize).filter(Boolean))].slice(0, 3000);
  if (!wanted.length) return {};
  const result = await db.query(
    `SELECT DISTINCT ON (word) word, translation, lemma
       FROM dictionary_entries
      WHERE learning_lang = $1 AND native_lang = $2 AND word = ANY($3::text[])
      ORDER BY word, uses DESC, (source = 'user') DESC, id`,
    [learningLang, nativeLang, wanted]
  );
  return Object.fromEntries(result.rows.map((r) => [r.word, { translation: r.translation, lemma: r.lemma }]));
}

// Rejects junk: empty, very long, links, or no letters at all.
const looksValid = (word, translation) =>
  word && translation && word.length <= 80 && translation.length <= 160 &&
  /\p{L}/u.test(word) && /\p{L}/u.test(translation) &&
  !/https?:|www\.|<|>/i.test(word + translation);

/**
 * Adds word pairs anonymously; repeats increase "uses" so popular translations win.
 * ponytail: no per-user dedupe, so one person repeating a pair counts each time;
 * track contributor ids in a side table if ranking abuse ever shows up.
 */
async function contribute(learningLang, nativeLang, pairs) {
  if (!learningLang || !nativeLang || !Array.isArray(pairs)) return 0;
  const rows = [];
  const seen = new Set();
  for (const p of pairs.slice(0, 500)) {
    const word = normalize(p?.word);
    const translation = String(p?.translation ?? '').trim().replace(/\s+/g, ' ');
    const key = `${word}\u0000${translation.toLowerCase()}`;
    if (!looksValid(word, translation) || seen.has(key)) continue;
    seen.add(key);
    rows.push({ w: word, t: translation });
  }
  if (!rows.length) return 0;
  await ensureTables();
  await db.query(
    `INSERT INTO dictionary_entries (learning_lang, native_lang, word, translation, source)
     SELECT $1, $2, x.w, x.t, 'user' FROM json_to_recordset($3::json) AS x(w text, t text)
     ON CONFLICT (learning_lang, native_lang, word, translation)
     DO UPDATE SET uses = dictionary_entries.uses + 1`,
    [learningLang, nativeLang, JSON.stringify(rows)]
  );
  return rows.length;
}

module.exports = { lookup, contribute, normalize };
