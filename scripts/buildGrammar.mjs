// Builds Polish grammar tables into public/grammar/pl/<first two letters>.json:
// gender + case tables for nouns, agreement tables for adjectives, aspect + conjugation for verbs.
//
//   node scripts/buildGrammar.mjs            (streams Wiktionary from kaikki.org, ~5 min)
//   GRAMMAR_RAW=path.jsonl node scripts/...  (reuse a saved kaikki extract)
//
// Which words: the base forms of the 100k most frequent Polish word forms (same frequency
// list and dictionary as buildDictionary.mjs). Source: Wiktionary, CC BY-SA 4.0.

import fs from 'node:fs';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/grammar/pl');
const TOP = 100000;
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFC').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();

async function lines(src) {
  if (!/^https?:/.test(src)) return readline.createInterface({ input: fs.createReadStream(src), crlfDelay: Infinity });
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
  return readline.createInterface({ input: Readable.fromWeb(res.body), crlfDelay: Infinity });
}

// ---------- 1. Which lemmas ----------
const dict = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/dictionary/pl-en.json'), 'utf8')).entries;
const lemmaOf = new Map();
for (const [w, , l] of dict) if (!lemmaOf.has(w)) lemmaOf.set(w, l || w);
const wanted = new Set();
const frequent = new Set(); // the top forms themselves, indexed below so inflected words find their table
let n = 0;
for await (const line of await lines('https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pl/pl_full.txt')) {
  const w = norm(line.split(' ')[0]);
  if (!w || !/\p{L}/u.test(w)) continue;
  frequent.add(w);
  if (lemmaOf.has(w)) wanted.add(lemmaOf.get(w));
  if (++n >= TOP) break;
}
console.error(`${wanted.size} lemmas wanted`);

// ---------- 2. Parse tables ----------
const CASES = ['nominative', 'genitive', 'dative', 'accusative', 'instrumental', 'locative', 'vocative'];
const caseOf = (t) => CASES.findIndex((c) => t.includes(c));
const SKIP_TAGS = ['derogatory', 'archaic', 'obsolete', 'dialectal', 'rare', 'Middle', 'alternative'];

// Only the first inflection table (later ones are historical variants), single words only.
function tableRows(forms) {
  const rows = [];
  let inTable = false;
  for (const f of forms || []) {
    const t = f.tags || [];
    if (t.includes('inflection-template')) { if (inTable && rows.length) break; inTable = true; continue; }
    if (t.includes('table-tags')) { if (rows.length) break; continue; }
    if (!inTable) continue;
    const form = String(f.form || '').trim();
    if (!form || form === '-' || form.startsWith('-') || /\s/.test(form)) continue;
    if (SKIP_TAGS.some((x) => t.includes(x))) continue;
    rows.push({ form, t });
  }
  return rows;
}

const put = (arr, i, form) => { if (i < 0) return; const v = arr[i] ? arr[i].split('/') : []; if (!v.includes(form)) arr[i] = [...v, form].join('/'); };

function parseHead(word, head) {
  const h = String(head || '').slice(word.length).trim();
  const out = {};
  const g = h.match(/^(m|f|n)(?:\s+(pers|anim|animal|inan))?(?:\s+pl)?\b/);
  if (g) out.g = g[1] === 'm' ? `m-${({ pers: 'pers', anim: 'anim', animal: 'anim', inan: 'inan' })[g[2]] || 'inan'}` : g[1];
  if (/^(?:m |f |n )?pl\b/.test(h) && !g) out.g = 'pl';
  if (/\bpl\b/.test(h.split('(')[0]) && g) out.plOnly = true;
  const a = h.match(/^(impf|pf|biasp)\b/);
  if (a) out.a = a[1];
  const pair = h.match(/\((?:[^)]*?\b)?(perfective|imperfective) ([^\s,)]+)/);
  if (pair) out.pair = pair[2];
  const comp = h.match(/comparative ([^,)]+?)(?: or |[,)]|$)/);
  if (comp) out.comp = comp[1];
  const sup = h.match(/superlative ([^,)]+?)(?: or |[,)]|$)/);
  if (sup) out.sup = sup[1];
  return out;
}

function noun(e, head) {
  const f = new Array(14).fill('');
  for (const { form, t } of tableRows(e.forms)) {
    const c = caseOf(t);
    if (c < 0) continue;
    put(f, c + (t.includes('plural') ? 7 : 0), form);
  }
  if (!f.some(Boolean)) return null;
  return { p: 'n', ...(head.g && { g: head.g }), f };
}

// Adjectives: per case, columns m, f, n, plural virile, plural non-virile (+ accusative m inanimate).
function adjective(e, head) {
  const f = new Array(36).fill('');
  for (const { form, t } of tableRows(e.forms)) {
    let c = caseOf(t);
    if (c < 0) c = 0; // the nominative row is tagged without a case
    let col;
    if (t.includes('plural')) col = t.includes('virile') ? 3 : 4;
    else col = t.includes('feminine') ? 1 : t.includes('neuter') ? 2 : 0;
    if (c === 3 && col === 0 && t.includes('inanimate')) { put(f, 35, form); continue; }
    put(f, c * 5 + col, form);
  }
  if (!f.some(Boolean)) return null;
  return { p: 'a', f, ...(head.comp && { comp: head.comp }), ...(head.sup && { sup: head.sup }) };
}

// Verbs: rows come 1st, 2nd, 3rd person within each tense/number/gender slot; only 3rd is tagged.
function verb(e, head) {
  const v = { inf: '', pres: Array(6).fill(''), fut: Array(6).fill(''), past: {}, cond: {}, imp: Array(3).fill(''), part: {} };
  const seen = {};
  for (const { form, t } of tableRows(e.forms)) {
    if (t.includes('impersonal')) continue;
    if (t.includes('infinitive')) { v.inf ||= form; continue; }
    if (t.includes('noun-from-verb')) { v.vn ||= form; continue; }
    if (t.includes('participle')) {
      const k = t.includes('contemporary') ? 'advPres' : t.includes('anterior') ? 'advPast' : t.includes('active') ? 'act' : t.includes('passive') ? 'pass' : null;
      if (k && !v.part[k]) v.part[k] = form;
      continue;
    }
    const pl = t.includes('plural') ? 1 : 0;
    if (t.includes('imperative')) {
      if (t.includes('third-person')) continue;
      const key = `imp${pl}`; seen[key] = (seen[key] || 0) + 1;
      put(v.imp, pl ? seen[key] : 0, form); // sg: 2nd; pl: 1st then 2nd
      continue;
    }
    const tense = ['present', 'future', 'past', 'conditional'].find((x) => t.includes(x));
    if (!tense) continue;
    const gender = pl ? (t.includes('nonvirile') ? 'nv' : 'v') : t.includes('feminine') ? 'f' : t.includes('neuter') ? 'n' : t.includes('masculine') ? 'm' : '';
    const key = `${tense}${pl}${gender}`;
    const person = t.includes('third-person') ? 3 : t.includes('second-person') ? 2 : t.includes('first-person') ? 1 : (seen[key] || 0) + 1;
    seen[key] = Math.max(seen[key] || 0, person);
    const idx = (person - 1) + (pl ? 3 : 0);
    if (tense === 'present' || tense === 'future') put(tense === 'present' ? v.pres : v.fut, idx, form);
    else { const tbl = tense === 'past' ? v.past : v.cond; tbl[gender] ||= Array(3).fill(''); put(tbl[gender], person - 1, form); }
  }
  if (!v.inf && !v.pres.some(Boolean) && !v.fut.some(Boolean)) return null;
  for (const k of ['pres', 'fut', 'imp']) if (!v[k].some(Boolean)) delete v[k];
  for (const k of ['past', 'cond', 'part']) if (!Object.keys(v[k]).length) delete v[k];
  return { p: 'v', ...(head.a && { a: head.a }), ...(head.pair && { pair: head.pair }), ...v };
}

const out = new Map(); // lemma -> [entries]
let read = 0;
for await (const line of await lines(process.env.GRAMMAR_RAW || 'https://kaikki.org/dictionary/Polish/kaikki.org-dictionary-Polish.jsonl')) {
  if (++read % 50000 === 0) console.error(`  ${read}…`);
  let e;
  try { e = JSON.parse(line); } catch { continue; }
  const word = norm(e.word);
  if (!wanted.has(word) || /\s/.test(word)) continue;
  const headText = e.head || e.head_templates?.map((h) => h.expansion);
  const head = parseHead(String(e.word), Array.isArray(headText) ? headText[0] : headText);
  let g = null;
  if (e.pos === 'noun' || e.pos === 'name' || e.pos === 'pron' || e.pos === 'num') g = noun(e, head);
  else if (e.pos === 'adj') g = adjective(e, head);
  else if (e.pos === 'verb') g = verb(e, head);
  if (!g) continue;
  if (e.pos === 'name') g.name = 1;
  const list = out.get(word) || [];
  if (!list.some((x) => x.p === g.p)) list.push(g);
  out.set(word, list);
}

// ---------- 3. Form index: "dziękuję" -> ["dziękować"] (frequent forms only) ----------
const cellsOf = (g) => [g.f, g.inf, g.pres, g.fut, g.imp, g.vn, ...Object.values(g.past || {}), ...Object.values(g.cond || {}), ...Object.values(g.part || {})]
  .flat().filter(Boolean).flatMap((c) => String(c).split('/'));
const pointers = new Map();
for (const [lemma, list] of out) {
  for (const g of list) for (const form of cellsOf(g)) {
    const f = norm(form);
    if (!f || f === lemma || out.has(f) || !frequent.has(f)) continue;
    const l = pointers.get(f) || [];
    if (!l.includes(lemma)) pointers.set(f, [...l, lemma]);
  }
}

// ---------- 4. Write shards ----------
// Each shard maps a word to its grammar entries, or (inflected form) to a list of base words.
const shardOf = (w) => [...w.normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l')].filter((c) => /[a-z]/.test(c)).slice(0, 2).join('').padEnd(2, '_'); // ASCII file names
const shards = new Map();
for (const [w, list] of [...out, ...pointers]) {
  const s = shardOf(w);
  if (!shards.has(s)) shards.set(s, {});
  shards.get(s)[w] = list;
}
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let bytes = 0;
for (const [s, obj] of shards) {
  const json = JSON.stringify(obj);
  bytes += json.length;
  fs.writeFileSync(path.join(OUT, `${s}.json`), json);
}
console.error(`${out.size} words with grammar, ${pointers.size} inflected forms indexed, in ${shards.size} files, ${(bytes / 1e6).toFixed(1)} MB`);
