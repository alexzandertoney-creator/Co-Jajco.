// Builds the bundled seed dictionaries in src/data/dictionary/<lang>-en.json.
//
//   node scripts/buildDictionary.mjs pl   (or es, fr, it)
//
// Sources (both CC BY-SA, credited in the app and in src/data/dictionary/LICENSE.md):
// - Wiktionary, via kaikki.org's machine-readable extract (word, part of speech, English glosses, inflected forms)
// - FrequencyWords by Hermit Dave (OpenSubtitles word frequencies), to keep the most common words
// Plus the app's own starter decks (and, for Spanish, public/vocab/spanish_words.json).
//
// The Wiktionary file is streamed and filtered line by line; it is never saved to disk.

import fs from 'node:fs';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = { pl: 'Polish', es: 'Spanish', fr: 'French', it: 'Italian' };
const TOP_WORDS = 100000;    // most frequent word forms to cover (plus every Wiktionary base word)
const VERSION = 2;           // bump to make servers re-seed (new pairs are added, nothing is removed)
const SKIP_POS = new Set(['character', 'symbol', 'prefix', 'suffix', 'romanization', 'letter', 'abbrev', 'infix', 'interfix', 'phrase']);

const code = process.argv[2];
if (import.meta.url === `file://${process.argv[1]}` && !LANGS[code]) { console.error('Usage: node scripts/buildDictionary.mjs pl|es|fr|it'); process.exit(1); }

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFC').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();

// "(transitive) to buy, purchase" -> "to buy, purchase"; keep it short for a tooltip.
export function cleanGloss(g) {
  const raw = String(g).replace(/\s+/g, ' ').trim();
  // Drop explanations in brackets: "cat (any mammal of the genus Felis)" -> "cat"
  let s = raw.replace(/\s*\([^()]*\)/g, '').replace(/\s*\([^)]*$/, '').trim();
  if (!s) s = raw;
  s = s.split(/;\s/)[0].replace(/[\s,:]+$/, '');
  if (s.length > 60) s = s.slice(0, 57).replace(/[ ,][^ ,]*$/, '') + '…';
  return s;
}

async function lines(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return readline.createInterface({ input: Readable.fromWeb(res.body), crlfDelay: Infinity });
}

// 1. Most frequent words
const freq = [];
const freqSeen = new Set();
for await (const line of await lines(`https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${code}/${code}_full.txt`)) {
  const w = norm(line.split(' ')[0]);
  if (w && /\p{L}/u.test(w) && !freqSeen.has(w)) { freqSeen.add(w); freq.push(w); }
  if (freq.length >= TOP_WORDS) break;
}
const wanted = new Set(freq);
console.error(`${code}: ${freq.length} frequent words`);

// 2. Stream Wiktionary: glosses for lemmas, and form -> lemma links
const lemmaGloss = new Map();   // lemma -> gloss
const formOf = new Map();       // form -> [lemmas]
const addForm = (form, lemma) => { const l = formOf.get(form) || []; if (!l.includes(lemma)) formOf.set(form, [...l, lemma]); };
let n = 0;
for await (const line of await lines(`https://kaikki.org/dictionary/${LANGS[code]}/kaikki.org-dictionary-${LANGS[code]}.jsonl`)) {
  if (++n % 100000 === 0) console.error(`  ${n} entries…`);
  let e;
  try { e = JSON.parse(line); } catch { continue; }
  if (!e.word || SKIP_POS.has(e.pos)) continue;
  const word = norm(e.word);
  if (!word) continue;
  for (const s of e.senses || []) {
    if (s.form_of?.length) {
      // "kota: genitive singular of kot"
      for (const f of s.form_of) {
        const lemma = norm(f.word);
        if (lemma && lemma !== word && wanted.has(word)) addForm(word, lemma);
      }
      continue;
    }
    if (s.tags?.includes('form-of')) continue;
    const g = s.glosses?.[0] && cleanGloss(s.glosses[0]);
    if (g && !lemmaGloss.has(word)) lemmaGloss.set(word, g);
    if (g) break;
  }
  // Inflection tables listed on the lemma's own entry
  for (const f of e.forms || []) {
    const form = norm(f.form);
    if (form && form !== word && wanted.has(form) && !(f.tags || []).includes('table-tags')) addForm(form, word);
  }
}
console.error(`${code}: ${lemmaGloss.size} lemma glosses, ${formOf.size} form links`);

// 3. Entries: [word, translation, lemma?]
const entries = [];
const have = new Set();
const add = (w, t, l) => {
  const word = norm(w);
  const tr = String(t ?? '').trim();
  const key = `${word}\u0000${tr.toLowerCase()}`;
  if (!word || !tr || have.has(key)) return;
  have.add(key);
  entries.push(l ? [word, tr, l] : [word, tr]);
};

// Starter decks first: hand-written, so they win ties.
const { recommendedVocabSets } = await import(path.join(ROOT, 'public/recommendedSets.js'));
for (const set of recommendedVocabSets) {
  if (set.learningLang !== code || set.nativeLang !== 'en') continue;
  for (const c of set.cards) for (const alt of String(c.answer).split('/')) add(alt, c.question);
}
if (code === 'es') {
  for (const c of JSON.parse(fs.readFileSync(path.join(ROOT, 'public/vocab/spanish_words.json'), 'utf8'))) add(c.question, c.answer);
}
const lemmaFor = (w) => (formOf.get(w) || []).find((l) => lemmaGloss.has(l));
for (const w of freq) {
  if (lemmaGloss.has(w)) add(w, lemmaGloss.get(w));
  else if (lemmaFor(w)) add(w, lemmaGloss.get(lemmaFor(w)), lemmaFor(w));
}
// Every other single-word base form, so the server's ending rules (dictionary.service.js)
// can find rarer words from their inflected forms.
for (const [w, g] of lemmaGloss) if (!w.includes(' ')) add(w, g);

const out = path.join(ROOT, 'src/data/dictionary', `${code}-en.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ version: VERSION, source: 'Wiktionary (CC BY-SA 4.0) via kaikki.org; FrequencyWords (CC BY-SA 4.0); Co? Jajco. starter decks', entries }));
const covered = freq.filter((w) => lemmaGloss.has(w) || lemmaFor(w)).length;
console.error(`${code}: wrote ${entries.length} entries (${(fs.statSync(out).size / 1e6).toFixed(1)} MB); ${covered}/${freq.length} frequent words covered`);
