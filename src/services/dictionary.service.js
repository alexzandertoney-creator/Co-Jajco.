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
  'en:pl': () => require('../data/dictionary/en-pl.json'),
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
const seeded = new Set();
const CHUNK = 5000;
// A big seed doesn't fit in one serverless request, so each request inserts for at most
// this long, saves how far it got, and the next request continues. Entries are stored
// most-frequent first, so a half-loaded dictionary already covers the common words.
const SEED_BUDGET_MS = Number(process.env.DICT_SEED_BUDGET_MS) || 4000;

// Loads (or upgrades) the bundled seed for a pair. Re-running is harmless: duplicate
// pairs are skipped. Progress is kept in dictionary_seeds under "<pair>#<version>".
function ensureSeeded(learningLang, nativeLang) {
  const pair = `${learningLang}:${nativeLang}`;
  const load = SEEDS[pair];
  if (!load || seeded.has(pair)) return Promise.resolve();
  if (!seeding.has(pair)) {
    seeding.set(pair, (async () => {
      const seed = load(); // { version, entries: [[word, translation, lemma?], ...] }
      const progressKey = `${pair}#${seed.version}`;
      const rows = (await db.query('SELECT pair, version FROM dictionary_seeds WHERE pair = ANY($1)', [[pair, progressKey]])).rows;
      if (rows.find((r) => r.pair === pair)?.version >= seed.version) { seeded.add(pair); return; }
      const started = Date.now();
      for (let c = rows.find((r) => r.pair === progressKey)?.version ?? 0; c * CHUNK < seed.entries.length; c++) {
        if (Date.now() - started > SEED_BUDGET_MS) return; // the next request carries on
        const chunk = seed.entries.slice(c * CHUNK, (c + 1) * CHUNK).map(([w, t, l]) => ({ w, t, l: l || null }));
        await db.query(
          `INSERT INTO dictionary_entries (learning_lang, native_lang, word, translation, lemma, source)
           SELECT $1, $2, x.w, x.t, x.l, 'seed' FROM json_to_recordset($3::json) AS x(w text, t text, l text)
           ON CONFLICT (learning_lang, native_lang, word, translation) DO NOTHING`,
          [learningLang, nativeLang, JSON.stringify(chunk)]
        );
        await db.query(
          `INSERT INTO dictionary_seeds (pair, version) VALUES ($1, $2)
           ON CONFLICT (pair) DO UPDATE SET version = GREATEST(dictionary_seeds.version, EXCLUDED.version)`,
          [progressKey, c + 1]
        );
      }
      await db.query(
        `INSERT INTO dictionary_seeds (pair, version) VALUES ($1, $2)
         ON CONFLICT (pair) DO UPDATE SET version = EXCLUDED.version`,
        [pair, seed.version]
      );
      await db.query('DELETE FROM dictionary_seeds WHERE pair = $1', [progressKey]);
      seeded.add(pair);
    })().finally(() => seeding.delete(pair)));
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
  const found = await best(learningLang, nativeLang, wanted);
  // Not found? Try the base form by its ending ("dialektami" -> "dialekt").
  const guesses = new Map(); // candidate -> words it may explain
  for (const w of wanted) {
    if (found[w]) continue;
    for (const c of baseForms(learningLang, w)) guesses.set(c, [...(guesses.get(c) || []), w]);
  }
  if (guesses.size) {
    const base = await best(learningLang, nativeLang, [...guesses.keys()]);
    for (const [c, ws] of guesses) {
      if (!base[c]) continue;
      for (const w of ws) found[w] ??= { translation: base[c].translation, lemma: base[c].lemma || c };
    }
  }
  return found;
}

async function best(learningLang, nativeLang, words) {
  const result = await db.query(
    `SELECT DISTINCT ON (word) word, translation, lemma
       FROM dictionary_entries
      WHERE learning_lang = $1 AND native_lang = $2 AND word = ANY($3::text[])
      ORDER BY word, uses DESC, (source = 'user') DESC, id`,
    [learningLang, nativeLang, words]
  );
  return Object.fromEntries(result.rows.map((r) => [r.word, { translation: r.translation, lemma: r.lemma }]));
}

// Polish case/adjective endings -> base form, tried in order (first hit wins).
// ponytail: plain suffix rules, not a real morphological analyser; checked on real texts
// (Wikipedia, news) to be right on the words they rescue. Swap in Morfeusz if it ever matters.
const ENDINGS = {
  pl: [
    ...['ymi', 'imi', 'ego', 'emu', 'ych', 'ich', 'ej', 'ym', 'im', 'ą', 'e', 'a'].flatMap((e) => [[e, 'y'], [e, 'i'], [e, '']]),
    ['ę', 'a'], ['ii', 'ia'], ['ami', ''], ['ami', 'a'], ['em', 'e'], ['em', ''], ['y', 'a'], ['i', 'a'], ['ie', 'a'],
    ['owi', ''], ['u', ''], ['ach', ''], ['ach', 'a'], ['om', ''], ['ów', ''], ['ce', 'ka'], ['dze', 'ga'],
  ],
};
const baseForms = (lang, w) => (ENDINGS[lang] || [])
  .filter(([e]) => w.length > e.length + 2 && w.endsWith(e))
  .map(([e, r]) => w.slice(0, -e.length) + r)
  .filter((c) => c !== w)
  .slice(0, 12);

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

/**
 * Search both ways: words starting with q (Polish -> English) and translations
 * containing q (English -> Polish). Exact and base-form entries come first.
 */
async function search(learningLang, nativeLang, q) {
  const term = String(q ?? '').trim().toLowerCase().normalize('NFC').slice(0, 60);
  if (term.length < 2) return [];
  await ensureTables();
  await ensureSeeded(learningLang, nativeLang);
  const like = term.replace(/[\\%_]/g, '\\$&');
  const result = await db.query(
    `SELECT DISTINCT ON (word) word, translation, lemma,
            CASE WHEN word = $3 THEN 0
                 WHEN word LIKE $4 || '%' AND lemma IS NULL THEN 1
                 WHEN word LIKE $4 || '%' THEN 2
                 WHEN lower(translation) = $3 THEN 3
                 ELSE 4 END AS rank
       FROM dictionary_entries
      WHERE learning_lang = $1 AND native_lang = $2
        AND (word LIKE $4 || '%' OR lower(translation) LIKE '%' || $4 || '%')
      ORDER BY word, uses DESC, id
      LIMIT 400`,
    [learningLang, nativeLang, term, like]
  );
  return result.rows
    .sort((a, b) => a.rank - b.rank || a.word.length - b.word.length || a.word.localeCompare(b.word))
    .slice(0, 30)
    .map(({ word, translation, lemma }) => ({ word, translation, lemma }));
}

module.exports = { lookup, contribute, search, normalize, baseForms };
