// ============ POLISH GRAMMAR HELP ============
// Gender, case and conjugation for any Polish word, from Wiktionary tables built by
// scripts/buildGrammar.mjs into /grammar/pl/<first two letters>.json (fetched on demand).
// Used by the story reader popup, flashcards, Learn, Test and Review.

const cache = new Map(); // shard -> Promise<object>
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFC').replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').trim();
const shardOf = (w) => [...w.normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l')].filter((c) => /[a-z]/.test(c)).slice(0, 2).join('').padEnd(2, '_'); // ASCII file names

function loadShard(s) {
  if (!cache.has(s)) {
    cache.set(s, fetch(`/grammar/pl/${s}.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => { cache.delete(s); return {}; }));
  }
  return cache.get(s);
}
async function entriesOf(word) {
  const w = norm(word);
  if (!w) return null;
  return (await loadShard(shardOf(w)))[w] || null;
}

// ---------- Labels ----------
export const CASES = [
  { pl: 'mianownik', en: 'nominative', q: 'kto? co?', use: 'The subject: who or what does something. Also the dictionary form.', ex: 'Kot śpi. — The cat is sleeping.', preps: '' },
  { pl: 'dopełniacz', en: 'genitive', q: 'kogo? czego?', use: '“Of” and belonging, after a negated verb (nie mam…), after amounts (dużo, mało, kilogram) and numbers 5+.', ex: 'Nie mam kota. — I don’t have a cat.', preps: 'do, z (out of / from), od, bez, dla, u, obok, koło, podczas, według, zamiast' },
  { pl: 'celownik', en: 'dative', q: 'komu? czemu?', use: 'The person something is given, said or shown to (“to / for someone”). Also with podobać się, pomagać, dziękować.', ex: 'Daję kotu mleko. — I give the cat milk.', preps: 'dzięki, przeciw(ko), ku, wbrew' },
  { pl: 'biernik', en: 'accusative', q: 'kogo? co?', use: 'The direct object of most verbs (mieć, widzieć, kochać, lubić). With na / w for a direction (where to) and with przez / za for time.', ex: 'Widzę kota. Idę na pocztę. — I see the cat. I’m going to the post office.', preps: 'na (onto / to), w (into), przez (through / for), za (in / for), o (ask for)' },
  { pl: 'narzędnik', en: 'instrumental', q: '(z) kim? (z) czym?', use: '“With” or “by means of”. After być / zostać for jobs and identity (Jestem nauczycielem).', ex: 'Idę z kotem. Piszę długopisem. — I walk with the cat. I write with a pen.', preps: 'z (with), za (behind), przed (in front of), nad (above), pod (under), między (between)' },
  { pl: 'miejscownik', en: 'locative', q: 'o kim? o czym? (gdzie?)', use: 'Only after prepositions: where something is (w, na) and what it is about (o).', ex: 'Mieszkam w Polsce. Mówimy o kocie. — I live in Poland. We talk about the cat.', preps: 'w (in), na (on / at), o (about), przy (by), po (after / around)' },
  { pl: 'wołacz', en: 'vocative', q: '—', use: 'Calling or addressing someone directly. In everyday speech the nominative often replaces it, but not in Panie / Pani forms.', ex: 'Mamo! Panie doktorze! — Mum! Doctor!', preps: '' },
];
export const GENDERS = {
  'm-pers': { short: 'm', name: 'masculine · person', tip: 'Masculine personal (people). In the plural it takes the “men” forms: ci studenci, dobrzy panowie, byli. Its accusative looks like the genitive: widzę studenta.' },
  'm-anim': { short: 'm', name: 'masculine · animate', tip: 'Masculine animate (animals and some objects like pies, kot, komputer in speech). Singular accusative looks like the genitive: widzę kota (not kot).' },
  'm-inan': { short: 'm', name: 'masculine · thing', tip: 'Masculine inanimate. Its accusative is the same as the nominative: mam dom, widzę stół.' },
  f: { short: 'f', name: 'feminine', tip: 'Feminine. Adjectives end in -a (dobra), and the past tense in -ła (ona była). Accusative singular usually ends in -ę: widzę kobietę.' },
  n: { short: 'n', name: 'neuter', tip: 'Neuter. Adjectives end in -e (dobre), and the past tense in -ło (ono było). Accusative is the same as the nominative.' },
  pl: { short: 'pl', name: 'plural only', tip: 'Only used in the plural (like drzwi, spodnie, okulary). Count them with special numbers: dwoje drzwi, pięcioro drzwi.' },
};
const POS = { n: 'noun', a: 'adjective', v: 'verb' };
const PERSONS = ['ja', 'ty', 'on / ona / ono', 'my', 'wy', 'oni / one'];
const PERSON_EN = ['1st person singular (ja)', '2nd person singular (ty)', '3rd person singular (on / ona / ono)', '1st person plural (my)', '2nd person plural (wy)', '3rd person plural (oni / one)'];
const PAST_G = { m: 'masculine', f: 'feminine', n: 'neuter', v: 'men / mixed group', nv: 'women / things' };
const ADJ_COLS = ['masculine', 'feminine', 'neuter', 'plural (men)', 'plural (others)'];

const split = (cell) => String(cell || '').split('/').filter(Boolean);
const has = (cell, w) => split(cell).some((x) => x.toLowerCase() === w);
const first = (cell) => split(cell)[0] || '';

// ---------- What is this form? ----------
/** Human labels for where `form` appears in the entry's tables, e.g. "biernik (accusative) · singular". */
export function describeForm(entry, form) {
  const w = norm(form);
  const out = [];
  if (!entry || !w) return out;
  if (entry.p === 'n') {
    entry.f.forEach((cell, i) => {
      if (!has(cell, w)) return;
      const c = CASES[i % 7];
      out.push({ text: `${c.pl} (${c.en}) · ${i < 7 ? 'singular' : 'plural'}`, caseIndex: i % 7 });
    });
  } else if (entry.p === 'a') {
    entry.f.forEach((cell, i) => {
      if (!has(cell, w)) return;
      if (i === 35) return out.push({ text: 'biernik (accusative) · masculine thing', caseIndex: 3 });
      const c = CASES[Math.floor(i / 5)];
      out.push({ text: `${c.pl} (${c.en}) · ${ADJ_COLS[i % 5]}`, caseIndex: Math.floor(i / 5) });
    });
  } else if (entry.p === 'v') {
    if (has(entry.inf, w)) out.push({ text: 'infinitive (dictionary form)' });
    entry.pres?.forEach((cell, i) => has(cell, w) && out.push({ text: `present · ${PERSON_EN[i]}` }));
    entry.fut?.forEach((cell, i) => has(cell, w) && out.push({ text: `future · ${PERSON_EN[i]}` }));
    for (const [g, cells] of Object.entries(entry.past || {})) cells.forEach((cell, i) => has(cell, w) && out.push({ text: `past · ${PERSON_EN[i + (g === 'v' || g === 'nv' ? 3 : 0)]} · ${PAST_G[g]}` }));
    for (const [g, cells] of Object.entries(entry.cond || {})) cells.forEach((cell, i) => has(cell, w) && out.push({ text: `conditional (would) · ${PERSON_EN[i + (g === 'v' || g === 'nv' ? 3 : 0)]} · ${PAST_G[g]}` }));
    entry.imp?.forEach((cell, i) => has(cell, w) && out.push({ text: `command · ${['ty', 'my (let’s…)', 'wy'][i]}` }));
    const P = { act: 'active participle (…ing, as an adjective)', pass: 'passive participle (…ed, as an adjective)', advPres: 'adverbial participle (while …ing)', advPast: 'adverbial participle (having …ed)' };
    for (const [k, v] of Object.entries(entry.part || {})) if (has(v, w)) out.push({ text: P[k] });
    if (has(entry.vn, w)) out.push({ text: 'verbal noun (the …ing)' });
  }
  return out;
}

// ---------- Lookup ----------
/**
 * Grammar for a word (as written in a text or on a card). `hint` is a known base form
 * (e.g. the dictionary's lemma). Multi-word answers use their first word that has data.
 * Resolves to { lemma, entries, entry, forms } or null.
 */
export async function grammarFor(word, hint) {
  // The word itself, else its first word ("źdźbło trawy" -> źdźbło), never a later one.
  const tries = [hint, word, String(word || '').split(/[\s/,;]+/)[0]].map(norm).filter(Boolean);
  for (const t0 of [...new Set(tries)]) {
    let t = t0;
    let entries = await entriesOf(t);
    // An inflected form ("dziękuję") points to its base word(s) ["dziękować"].
    if (typeof entries?.[0] === 'string') { t = entries[0]; entries = await entriesOf(t); }
    if (!Array.isArray(entries) || typeof entries[0] !== 'object') continue;
    const target = norm(word).split(/\s+/).find(Boolean) || t;
    // Prefer the entry whose tables contain the word itself (noun vs verb homographs).
    const scored = entries.map((e) => ({ e, forms: describeForm(e, target) }));
    const pick = scored.find((x) => x.forms.length) || scored.find((x) => !x.e.name) || scored[0];
    return { lemma: t, entries, entry: pick.e, forms: pick.forms, word: target };
  }
  return null;
}

// ---------- Small inline summary (popups, cards, feedback) ----------
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

export function genderBadge(g) {
  const info = GENDERS[g];
  if (!info) return null;
  const b = el('span', `gram-badge g-${info.short}`, info.short);
  b.title = info.name;
  b.setAttribute('aria-label', info.name);
  return b;
}

/** One-line summary: [m] masculine · animate  —  dopełniacz (genitive) · singular of kot. */
export function grammarSummary(info, { onOpen, onClose } = {}) {
  const box = el('div', 'gram-summary');
  const { entry, forms, lemma } = info;
  const line = el('p', 'gram-line');
  if (entry.p === 'n' && entry.g) {
    line.append(genderBadge(entry.g), ` ${GENDERS[entry.g].name}`);
  } else if (entry.p === 'v') {
    line.append(el('span', 'gram-badge g-v', entry.a === 'pf' ? 'pf' : entry.a === 'impf' ? 'impf' : 'verb'),
      ` ${entry.a === 'pf' ? 'perfective (one finished action)' : entry.a === 'impf' ? 'imperfective (ongoing / habit)' : 'verb'}`);
  } else {
    line.append(el('span', 'gram-badge g-a', POS[entry.p]?.slice(0, 3) || ''), ` ${POS[entry.p] || ''}`);
  }
  box.appendChild(line);
  // Only worth saying when the word isn't already the dictionary form.
  if (forms.length && norm(lemma) !== norm(info.word)) {
    const f = el('p', 'gram-form');
    f.append(forms.slice(0, 2).map((x) => x.text).join('  or  '));
    if (lemma && norm(lemma) !== norm(info.word)) { f.append(' of '); f.appendChild(el('b', null, lemma)); }
    box.appendChild(f);
  }
  if (entry.p === 'v' && entry.pair) {
    box.appendChild(el('p', 'gram-form', `${entry.a === 'pf' ? 'Imperfective' : 'Perfective'} pair: ${entry.pair}`));
  }
  const open = el('button', 'link-btn gram-open', entry.p === 'v' ? 'Conjugation & tips' : entry.p === 'n' ? 'All cases & tips' : 'All forms & tips');
  open.type = 'button';
  open.addEventListener('click', (e) => { e.stopPropagation(); onOpen?.(); openGrammarSheet(info, null, { onClose }); });
  box.appendChild(open);
  return box;
}

/**
 * Fills `container` with the grammar summary for a Polish word (no-op for other languages
 * or words without data). Returns the info, or null.
 */
export async function showGrammar(container, word, { lang = 'pl', hint, fallback, onOpen, onClose, onReady } = {}) {
  if (!container) return null;
  container.replaceChildren();
  container.hidden = true;
  if (lang !== 'pl' || !word) return null;
  const token = (container.dataset.gramToken = String(Math.random()));
  // `fallback`: the card's other side, for decks stored the other way round.
  const info = (await grammarFor(word, hint).catch(() => null)) || (fallback ? await grammarFor(fallback).catch(() => null) : null);
  if (!info || container.dataset.gramToken !== token) return null;
  container.appendChild(grammarSummary(info, { onOpen, onClose }));
  container.hidden = false;
  onReady?.(info);
  return info;
}

// ---------- Full sheet ----------
let sheet = null;
function sheetEl() {
  if (sheet) return sheet;
  sheet = document.createElement('dialog');
  sheet.className = 'app-dialog gram-sheet';
  sheet.setAttribute('aria-labelledby', 'gramTitle');
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
  sheet.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(); });
  sheet.addEventListener('close', () => { const fn = onSheetClose; onSheetClose = null; fn?.(); });
  document.body.appendChild(sheet);
  return sheet;
}

function table(headers, rows, highlight) {
  const t = el('table', 'gram-table');
  const thead = el('thead'); const hr = el('tr');
  headers.forEach((h) => hr.appendChild(el('th', null, h)));
  thead.appendChild(hr); t.appendChild(thead);
  const tb = el('tbody');
  for (const [label, sub, ...cells] of rows) {
    const tr = el('tr');
    const th = el('th'); th.scope = 'row';
    th.append(label);
    if (sub) th.appendChild(el('small', null, sub));
    tr.appendChild(th);
    for (const c of cells) {
      const td = el('td', null, split(c).join(' / ') || '—');
      if (highlight && has(c, highlight)) td.className = 'hit';
      tr.appendChild(td);
    }
    tb.appendChild(tr);
  }
  t.appendChild(tb);
  const wrap = el('div', 'gram-table-wrap');
  wrap.appendChild(t);
  return wrap;
}

function formsView(entry, word) {
  const box = el('div');
  if (entry.p === 'n') {
    box.appendChild(table(['Case', 'Singular', 'Plural'], CASES.map((c, i) => [c.pl, `${c.en} · ${c.q}`, entry.f[i], entry.f[i + 7]]), word));
  } else if (entry.p === 'a') {
    box.appendChild(table(['Case', 'm', 'f', 'n', 'pl men', 'pl others'], CASES.slice(0, 6).map((c, i) => {
      const row = [c.pl, c.en, ...entry.f.slice(i * 5, i * 5 + 5)];
      if (i === 3 && entry.f[35]) row[2] = `${first(row[2])} / ${entry.f[35]}`;
      return row;
    }), word));
    if (i18nComp(entry)) box.appendChild(el('p', 'meta gram-note', i18nComp(entry)));
  } else if (entry.p === 'v') {
    const tense = entry.pres ? ['Present', entry.pres] : entry.fut ? ['Future', entry.fut] : null;
    if (tense) {
      box.appendChild(el('h4', null, entry.pres ? 'Present (now / usually)' : 'Future (perfective: will do, once)'));
      box.appendChild(table(['', tense[0]], PERSONS.map((p, i) => [p, '', tense[1][i]]), word));
    }
    if (entry.past) {
      box.appendChild(el('h4', null, 'Past'));
      const sg = ['m', 'f', 'n'].filter((g) => entry.past[g]);
      box.appendChild(table(['', ...sg.map((g) => ({ m: 'he / m', f: 'she / f', n: 'it / n' })[g])], PERSONS.slice(0, 3).map((p, i) => [p, '', ...sg.map((g) => entry.past[g][i])]), word));
      const pl = ['v', 'nv'].filter((g) => entry.past[g]);
      if (pl.length) box.appendChild(table(['', ...pl.map((g) => ({ v: 'men / mixed', nv: 'women / things' })[g])], PERSONS.slice(3).map((p, i) => [p, '', ...pl.map((g) => entry.past[g][i])]), word));
    }
    if (entry.a === 'impf' && entry.inf && entry.inf !== 'być') {
      box.appendChild(el('h4', null, 'Future'));
      box.appendChild(el('p', 'meta gram-note', `będę ${entry.inf}, będziesz ${entry.inf}, będzie ${entry.inf}, będziemy ${entry.inf}, będziecie ${entry.inf}, będą ${entry.inf}`));
    }
    if (entry.imp) {
      box.appendChild(el('h4', null, 'Commands'));
      box.appendChild(table(['', 'Form'], [['ty', 'do it!', entry.imp[0]], ['my', 'let’s…', entry.imp[1]], ['wy', 'you all', entry.imp[2]]], word));
    }
    if (entry.cond?.m) {
      box.appendChild(el('h4', null, 'Would (conditional)'));
      box.appendChild(el('p', 'meta gram-note', `${first(entry.cond.m[0])} / ${first(entry.cond.f?.[0])} — I would… · ${first(entry.cond.m[2])} / ${first(entry.cond.f?.[2])} — he / she would…`));
    }
    const p = entry.part || {};
    const extra = [p.act && `${p.act} (…ing)`, p.pass && `${p.pass} (…ed / done)`, p.advPres && `${p.advPres} (while …ing)`, p.advPast && `${p.advPast} (having …ed)`, entry.vn && `${entry.vn} (the …ing)`].filter(Boolean);
    if (extra.length) {
      box.appendChild(el('h4', null, 'Related forms'));
      box.appendChild(el('p', 'meta gram-note', extra.join(' · ')));
    }
  }
  return box;
}
const i18nComp = (e) => [e.comp && `Comparative: ${e.comp} (more …)`, e.sup && `Superlative: ${e.sup} (the most …)`].filter(Boolean).join(' · ');

function tipsView(entry, lemma) {
  const box = el('div', 'gram-tips');
  const tip = (title, text, example) => {
    const d = el('div', 'gram-tip');
    d.appendChild(el('strong', null, title));
    d.appendChild(el('p', null, text));
    if (example) d.appendChild(el('p', 'gram-ex', example));
    box.appendChild(d);
  };
  if (entry.p === 'n') {
    const f = (i) => first(entry.f[i]);
    if (entry.g && GENDERS[entry.g]) tip(`Gender: ${GENDERS[entry.g].name}`, GENDERS[entry.g].tip);
    if (f(0) && f(1) && f(3)) tip('Negation changes the case', 'After a negated verb the object moves from biernik to dopełniacz.', `Mam ${f(3)}. → Nie mam ${f(1)}.`);
    if (f(0) && f(7) && f(8)) {
      tip('Counting', entry.g === 'm-pers'
        ? 'With 1 use the nominative; 2–4 take the nominative plural, but groups of men take dopełniacz plural (dwóch…); 5 and more always take dopełniacz plural.'
        : '1 takes the nominative singular, 2, 3, 4 (and 22, 23, 24…) the nominative plural, 5 and more the dopełniacz plural.',
      entry.g === 'm-pers' ? `jeden ${f(0)} · dwóch ${f(8)} · pięciu ${f(8)}` : `${entry.g === 'f' ? 'jedna' : entry.g === 'n' ? 'jedno' : 'jeden'} ${f(0)} · ${entry.g === 'f' ? 'dwie' : 'dwa'} ${f(7)} · pięć ${f(8)}`);
    }
    if (f(5) && f(4) && f(1)) tip('With prepositions', 'Prepositions decide the case. A few common ones with this word:', `w ${f(5)} (in) · o ${f(5)} (about) · z ${f(4)} (with) · bez ${f(1)} (without) · dla ${f(1)} (for)`);
    tip('Guessing gender from the ending', 'Ends in a consonant → usually masculine. Ends in -a → usually feminine (but mężczyzna, kolega, tata are masculine). Ends in -o, -e, -ę, -um → neuter. Ends in -ść → feminine (miłość, kość).');
  } else if (entry.p === 'a') {
    const f = (i) => first(entry.f[i]);
    tip('Agreement', 'An adjective copies the gender, number and case of its noun.', `${f(0)} kot · ${f(1)} kobieta · ${f(2)} okno · ${f(3)} panowie · ${f(4)} koty`);
    tip('Men vs. everyone else', 'In the plural, groups with at least one man use the “men” form; women, animals and things use the other form.', `${f(3)} studenci · ${f(4)} studentki`);
    if (entry.comp || entry.sup) tip('Comparing', 'More / most:', `${f(0)} → ${entry.comp || '…'} → ${entry.sup || '…'}`);
    tip('Endings at a glance', 'Masculine -y / -i (after k, g), feminine -a, neuter -e. Dopełniacz: -ego (m, n), -ej (f). Narzędnik: -ym / -im (m, n), -ą (f).');
  } else if (entry.p === 'v') {
    if (entry.a === 'impf' || entry.a === 'pf') {
      tip('Aspect', entry.a === 'impf'
        ? 'Imperfective: an action in progress, repeated, or a habit. It has a present tense, and its future is będę + infinitive.'
        : 'Perfective: one complete action with a result. It has no present tense — the forms that look present mean the future (zrobię = I will do).',
      entry.pair ? `${entry.a === 'impf' ? lemma : entry.pair} (imperfective) ↔ ${entry.a === 'impf' ? entry.pair : lemma} (perfective)` : null);
    }
    const t = entry.pres || entry.fut;
    if (t && t[0] && t[1]) {
      const a = first(t[0]); const b = first(t[1]);
      const group = /m$/.test(a) && /sz$/.test(b) ? (/asz$/.test(b) ? '-am, -asz' : '-em, -esz') : /ę$/.test(a) ? (/[iy]sz$/.test(b) ? '-ę, -isz / -ysz' : '-ę, -esz') : null;
      if (group) tip('Conjugation pattern', `This verb goes ${group}. Learn ja + ty and the rest follows: on drops -sz, my adds -my, wy adds -cie, oni ends in -ą / -ją / -dzą.`, `${a}, ${b}, ${first(t[2])}, ${first(t[3])}, ${first(t[4])}, ${first(t[5])}`);
    }
    if (entry.past?.m && entry.past?.f) tip('Past tense shows gender', 'The speaker’s gender changes the ending: men say -łem, women -łam. Groups with a man use -li, others -ły.', `${first(entry.past.m[0])} / ${first(entry.past.f[0])} · ${first(entry.past.m[2])} / ${first(entry.past.f[2])} · ${first(entry.past.v?.[2])} / ${first(entry.past.nv?.[2])}`);
    if (t && t[2]) tip('Polite “you”', 'Speaking formally, use Pan (to a man) / Pani (to a woman) with the 3rd person form.', `Czy Pan ${first(t[2])}? · Czy Pani ${first(t[2])}?`);
    if (entry.imp?.[0]) tip('Giving commands', 'Imperative for ty, my (let’s) and wy. Add proszę to make it polite; use nie + imperfective to forbid.', `${first(entry.imp[0])}! · ${first(entry.imp[1])}! · ${first(entry.imp[2])}!`);
  }
  return box;
}

function casesView(highlight) {
  const box = el('div', 'gram-cases');
  CASES.forEach((c, i) => {
    const d = el('details', 'gram-case');
    if (i === highlight) d.open = true;
    const s = el('summary');
    s.append(el('strong', null, c.pl), ` ${c.en}`, el('span', 'gram-q', c.q));
    d.appendChild(s);
    d.appendChild(el('p', null, c.use));
    if (c.preps) d.appendChild(el('p', 'meta', `With: ${c.preps}`));
    d.appendChild(el('p', 'gram-ex', c.ex));
    box.appendChild(d);
  });
  return box;
}

let onSheetClose = null;
function closeSheet() {
  if (sheet?.open) sheet.close();
  const fn = onSheetClose; onSheetClose = null; fn?.();
}

/** Opens the full grammar sheet for a looked-up word. `onClose` runs once when it closes. */
export function openGrammarSheet(info, startTab, { onClose } = {}) {
  const dlg = sheetEl();
  onSheetClose = onClose || null;
  dlg.replaceChildren();
  const { entry, lemma, word, forms } = info;
  const head = el('div', 'gram-head');
  const title = el('h2', null, entry.p === 'n' ? first(entry.f[0]) || lemma : entry.inf || lemma);
  title.id = 'gramTitle';
  head.appendChild(title);
  const sub = el('p', 'meta');
  if (entry.p === 'n' && entry.g) sub.append(genderBadge(entry.g), ` ${GENDERS[entry.g].name} noun`);
  else sub.append(entry.p === 'v' ? `verb${entry.a ? ` · ${entry.a === 'pf' ? 'perfective' : entry.a === 'impf' ? 'imperfective' : 'both aspects'}` : ''}` : POS[entry.p] || '');
  head.appendChild(sub);
  if (forms.length && norm(word) !== norm(lemma)) head.appendChild(el('p', 'gram-form', `“${word}” = ${forms.map((f) => f.text).join('  or  ')}`));
  const close = el('button', 'icon-btn gram-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', closeSheet);
  head.appendChild(close);
  dlg.appendChild(head);

  const tabs = el('div', 'segmented gram-tabs');
  tabs.setAttribute('role', 'tablist');
  const body = el('div', 'gram-body');
  const views = { forms: () => formsView(entry, norm(word)), tips: () => tipsView(entry, lemma), cases: () => casesView(forms.find((f) => f.caseIndex != null)?.caseIndex) };
  const labels = { forms: entry.p === 'v' ? 'Conjugation' : 'Forms', tips: 'How to use it', cases: 'The 7 cases' };
  const show = (k) => {
    body.replaceChildren(views[k]());
    for (const b of tabs.children) b.setAttribute('aria-selected', String(b.dataset.tab === k));
  };
  for (const k of Object.keys(views)) {
    const b = el('button', null, labels[k]);
    b.type = 'button';
    b.dataset.tab = k;
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => show(k));
    tabs.appendChild(b);
  }
  dlg.append(tabs, body);
  show(startTab || 'forms');
  if (!dlg.open) dlg.showModal();
}

/**
 * Flashcards / Review: grammar under the card's Polish word, on whichever side shows it.
 * By convention the answer is the Polish word, but imported decks are sometimes the other
 * way round, so the question is tried too.
 */
export async function showCardGrammar(cardEl, cardData, frontIsQuestion, lang) {
  const sides = [cardEl?.querySelector('.card-front'), cardEl?.querySelector('.card-back')];
  if (!sides[0] || !sides[1]) return;
  for (const side of sides) {
    let box = side.querySelector('.card-grammar');
    if (!box) {
      box = el('div', 'card-grammar');
      box.addEventListener('click', (e) => e.stopPropagation());
      side.insertBefore(box, side.querySelector('.speak'));
    }
    box.replaceChildren();
    box.hidden = true;
  }
  if (lang !== 'pl' || !cardData) return;
  const token = (cardEl.dataset.gramToken = String(Math.random()));
  let onAnswer = true;
  let info = await grammarFor(cardData.answer).catch(() => null);
  if (!info && cardData.question) { onAnswer = false; info = await grammarFor(cardData.question).catch(() => null); }
  if (!info || cardEl.dataset.gramToken !== token) return;
  // The answer is on the back when the question is on the front, and vice versa.
  const box = sides[onAnswer === frontIsQuestion ? 1 : 0].querySelector('.card-grammar');
  box.appendChild(grammarSummary(info));
  box.hidden = false;
}
