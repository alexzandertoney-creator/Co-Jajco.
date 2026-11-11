// Checks the built grammar files (public/grammar/pl) and the lookup in public/js/grammar.js.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// grammar.js fetches /grammar/pl/<shard>.json; serve those from disk.
globalThis.fetch = async (url) => {
  const file = path.join(ROOT, 'public', decodeURIComponent(String(url)));
  return fs.existsSync(file)
    ? { ok: true, json: async () => JSON.parse(fs.readFileSync(file, 'utf8')) }
    : { ok: false, json: async () => ({}) };
};
const { grammarFor, describeForm } = await import('../public/js/grammar.js');

// Nouns: gender + all cases
let g = await grammarFor('kota');
assert.equal(g.lemma, 'kot'); assert.equal(g.entry.g, 'm-anim');
assert.deepEqual(g.forms.map((f) => f.text), ['dopełniacz (genitive) · singular', 'biernik (accusative) · singular']);
g = await grammarFor('kobietą');
assert.equal(g.entry.g, 'f'); assert.match(g.forms[0].text, /narzędnik/);
assert.equal((await grammarFor('okno')).entry.g, 'n');
assert.equal((await grammarFor('mężczyzna')).entry.g, 'm-pers');

// Verbs: aspect pair, persons recovered from row order, inflected forms find their verb
g = await grammarFor('robić');
assert.equal(g.entry.a, 'impf'); assert.equal(g.entry.pair, 'zrobić');
assert.deepEqual(g.entry.pres, ['robię', 'robisz', 'robi', 'robimy', 'robicie', 'robią']);
assert.deepEqual(g.entry.past.f, ['robiłam', 'robiłaś', 'robiła']);
g = await grammarFor('dziękuję');
assert.equal(g.lemma, 'dziękować'); assert.equal(g.forms[0].text, 'present · 1st person singular (ja)');
g = await grammarFor('poszła');
assert.equal(g.lemma, 'pójść'); assert.match(g.forms[0].text, /^past · 3rd person singular .* feminine$/);

// Adjectives: agreement table + comparison
g = await grammarFor('dobrą');
assert.equal(g.entry.p, 'a'); assert.equal(g.entry.comp, 'lepszy'); assert.equal(g.entry.sup, 'najlepszy');
assert.ok(describeForm(g.entry, 'dobrą').some((f) => /biernik.*feminine/.test(f.text)));

// Multi-word answers use their first word only; unknown words give null
assert.equal(await grammarFor('xyzzy'), null);
g = await grammarFor('źdźbło trawy');
assert.ok(!g || g.lemma !== 'trawa', 'never the second word');

// Decks stored the other way round: the English side has no data, the Polish side does
assert.equal(await grammarFor('Europe'), null);
assert.equal((await grammarFor('Europa')).entry.g, 'f');

console.log('grammar ok');
