// Builds src/data/dictionary/en-pl.json (English word -> Polish) for Polish speakers
// learning English, by reversing pl-en.json and the Polish starter decks.
//   node scripts/buildReverseDictionary.mjs
// Same licence as the source data (CC BY-SA 4.0, see src/data/dictionary/LICENSE.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFC').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();
const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/dictionary/pl-en.json'), 'utf8'));

const entries = [];
const have = new Set();
const lowerFirst = (pl) => (/\s/.test(pl) || pl === pl.toUpperCase() ? pl : pl[0].toLowerCase() + pl.slice(1));
const add = (en, pl, lemma) => {
  const w = norm(en);
  if (!w || !pl || w.split(' ').length > 3) return;
  pl = lowerFirst(pl.trim());
  const key = `${w}\u0000${pl}`;
  if (have.has(key)) return;
  have.add(key);
  entries.push(lemma ? [w, pl, lemma] : [w, pl]);
};

// Common English endings, so "apples", "buys", "walked", "making" resolve to their base word.
// A generated non-word never appears in real text, so over-generating is harmless.
function forms(w) {
  if (w.includes(' ') || w.length < 3) return [];
  const out = new Set();
  const y = /[^aeiou]y$/.test(w);
  out.add(y ? w.slice(0, -1) + 'ies' : /(s|x|z|ch|sh)$/.test(w) ? w + 'es' : w + 's');
  out.add(w.endsWith('e') ? w + 'd' : y ? w.slice(0, -1) + 'ied' : w + 'ed');
  out.add(w.endsWith('e') && !w.endsWith('ee') ? w.slice(0, -1) + 'ing' : w + 'ing');
  return [...out];
}

// Starter decks first (hand-written).
const { recommendedVocabSets } = await import(path.join(ROOT, 'public/recommendedSets.js'));
for (const set of recommendedVocabSets) {
  if (set.learningLang !== 'pl' || set.nativeLang !== 'en') continue;
  for (const c of set.cards) for (const en of String(c.question).split('/')) add(en, String(c.answer).split('/')[0].trim());
}
// Base forms only (inflected Polish forms would be noise as translations).
for (const [pl, gloss, lemma] of src.entries) {
  if (lemma) continue;
  for (let part of String(gloss).split(/[,;]/)) {
    part = part.trim().replace(/^(to|a|an|the)\s+/i, '');
    if (part && /^[\p{L}' -]+$/u.test(part)) add(part, pl);
  }
}

for (const [w, pl, lemma] of [...entries]) {
  if (lemma) continue;
  for (const f of forms(w)) add(f, pl, w);
}

const out = path.join(ROOT, 'src/data/dictionary/en-pl.json');
fs.writeFileSync(out, JSON.stringify({ version: 1, source: 'Reversed from pl-en.json (Wiktionary CC BY-SA 4.0 via kaikki.org; FrequencyWords) and Co? Jajco. starter decks', entries }));
console.log(`wrote ${entries.length} entries (${(fs.statSync(out).size / 1e6).toFixed(2)} MB)`);
