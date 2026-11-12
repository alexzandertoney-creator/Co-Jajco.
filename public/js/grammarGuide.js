// ============ GRAMMAR GUIDE (the "Grammar" section) ============
// A friendly reference for Polish: cases, gender, verbs, adjectives, numbers, prepositions
// and pronouns, with real word forms from the grammar data, a word lookup and a case quiz.

import { CASES, GENDERS, grammarFor, openGrammarSheet, shardOf } from './grammar.js';
import { shuffleArray } from './utils.js';
import { mascot, loader } from './art.js';
import { CASE_CHART, chartCell } from './caseChart.js';

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const first = (cell) => String(cell || '').split('/')[0];
const CASE_TONES = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

/** "kot" + "kotem" -> kot<b>em</b>: the part that changed is bold. */
function ending(base, form) {
  const span = el('span', 'gg-form');
  if (!form) { span.textContent = '—'; return span; }
  let i = 0;
  const b = base.toLowerCase(); const f = form.toLowerCase();
  while (i < b.length && i < f.length && b[i] === f[i]) i++;
  if (i >= f.length - 0 && f.length === b.length) { span.textContent = form; return span; }
  span.append(form.slice(0, i));
  span.appendChild(el('b', null, form.slice(i)));
  return span;
}

const section = (title, intro) => {
  const s = el('section', 'gg-block');
  s.appendChild(el('h3', null, title));
  if (intro) s.appendChild(el('p', 'gg-intro', intro));
  return s;
};

const examplesCache = new Map();
// Looks the words up in parallel (each may need a different data file).
async function nouns(words) {
  const found = await Promise.all(words.map((w) => {
    if (!examplesCache.has(w)) examplesCache.set(w, grammarFor(w).catch(() => null));
    return examplesCache.get(w);
  }));
  return found.filter((g) => g?.entry?.p === 'n' && g.entry.f?.[0]);
}

// Deck words grouped by data file, taken from the fullest files first, so practice
// needs only a few small downloads instead of one per word.
function fewFiles(words, max = 60, files = 5) {
  const byShard = new Map();
  for (const w of new Set(words.map((x) => String(x).toLowerCase()))) {
    if (!/\p{L}{3,}/u.test(w)) continue;
    const s = shardOf(w);
    byShard.set(s, [...(byShard.get(s) || []), w]);
  }
  const unique = [...byShard.values()].flat();
  if (unique.length <= max) return unique; // small deck: use every word
  const fullest = [...byShard.values()].sort((a, b) => b.length - a.length).slice(0, files * 2);
  return shuffleArray(fullest).slice(0, files).flat().slice(0, max);
}

// ---------- Topics ----------

async function casesTopic() {
  const box = el('div');
  const s1 = section('Seven jobs a noun can do', 'Polish shows a word’s job in the sentence by changing its ending, not by word order. Each job is a case. Ask the case’s question to find it.');
  const finder = el('ol', 'gg-finder');
  [
    ['Is it the one doing the action?', 0],
    ['Is it what you have, see, love, buy? (the object)', 3],
    ['Is it after nie, or “of”, or after a lot / a kilo / 5+?', 1],
    ['Are you giving / telling / showing it to someone?', 2],
    ['Is it “with” something, or a job after “jestem”?', 4],
    ['Are you saying where it is, or what you talk about? (w, na, o)', 5],
    ['Are you calling someone?', 6],
  ].forEach(([q, c]) => {
    const li = el('li');
    li.append(el('span', null, q), el('span', `gg-case-pill ${CASE_TONES[c]}`, CASES[c].pl));
    finder.appendChild(li);
  });
  s1.appendChild(finder);
  box.appendChild(s1);

  const s2 = section('The cases one by one');
  const toChart = el('button', 'link-btn gg-to-chart', 'Every adjective and noun ending, case by case: open the endings chart →');
  toChart.type = 'button';
  toChart.addEventListener('click', () => openTopic?.('chart'));
  s2.appendChild(toChart);
  const grid = el('div', 'gg-cards');
  CASES.forEach((c, i) => {
    const card = el('article', `gg-card ${CASE_TONES[i]}`);
    const h = el('header');
    h.append(el('strong', null, c.pl), el('span', null, c.en));
    card.appendChild(h);
    card.appendChild(el('p', 'gg-q', c.q));
    card.appendChild(el('p', null, c.use));
    if (c.preps) {
      const chips = el('div', 'gg-chips');
      c.preps.split(', ').forEach((p) => chips.appendChild(el('span', null, p)));
      card.appendChild(chips);
    }
    card.appendChild(el('p', 'gg-ex', c.ex));
    grid.appendChild(card);
  });
  s2.appendChild(grid);
  box.appendChild(s2);

  const s3 = section('One word, seven endings', 'The same three nouns in every case. The bold part is what changes.');
  const sample = await nouns(['kot', 'kobieta', 'okno']);
  if (sample.length) {
    const plural = el('label', 'study-toggle gg-toggle');
    const cb = el('input'); cb.type = 'checkbox';
    plural.append(cb, ' Plural');
    s3.appendChild(plural);
    const wrap = el('div', 'gram-table-wrap');
    const render = () => {
      const t = el('table', 'gram-table gg-table');
      const hr = el('tr');
      hr.appendChild(el('th', null, 'Case'));
      sample.forEach((g) => { const th = el('th'); th.append(first(g.entry.f[0]), ' '); th.appendChild(el('span', `gram-badge g-${GENDERS[g.entry.g]?.short || 'n'}`, GENDERS[g.entry.g]?.short || '')); hr.appendChild(th); });
      const thead = el('thead'); thead.appendChild(hr); t.appendChild(thead);
      const tb = el('tbody');
      CASES.forEach((c, i) => {
        const tr = el('tr');
        const th = el('th'); th.scope = 'row'; th.append(c.pl); th.appendChild(el('small', null, c.q)); tr.appendChild(th);
        sample.forEach((g) => { const td = el('td'); td.appendChild(ending(first(g.entry.f[0]), first(g.entry.f[i + (cb.checked ? 7 : 0)]))); tr.appendChild(td); });
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      wrap.replaceChildren(t);
    };
    cb.addEventListener('change', render);
    render();
    s3.appendChild(wrap);
  }
  box.appendChild(s3);
  return box;
}

function genderTopic() {
  const box = el('div');
  const s1 = section('Every noun has a gender', 'It decides the endings of everything around it: adjectives, the past tense, “this”, “one”. You can usually tell it from the last letter.');
  const cols = el('div', 'gg-cards gg-three');
  [
    ['m', 'Masculine', 'Ends in a consonant', 'dom, kot, stół, telefon', 'Watch out: mężczyzna, kolega, tata end in -a but are masculine.'],
    ['f', 'Feminine', 'Ends in -a (or -ść, -i)', 'mama, kawa, książka, miłość, pani', 'Some soft-consonant words are feminine too: noc, rzecz, sól.'],
    ['n', 'Neuter', 'Ends in -o, -e, -ę or -um', 'okno, morze, imię, muzeum', '-um words don’t change in the singular: w muzeum.'],
  ].forEach(([g, name, rule, ex, warn]) => {
    const c = el('article', `gg-card g-${g}`);
    const h = el('header');
    h.append(el('span', `gram-badge g-${g}`, g), el('strong', null, ` ${name}`));
    c.append(h, el('p', 'gg-q', rule), el('p', 'gg-ex', ex), el('p', 'meta', warn));
    cols.appendChild(c);
  });
  s1.appendChild(cols);
  box.appendChild(s1);

  const s2 = section('Three kinds of masculine', 'Masculine nouns split by what they name. It matters in the accusative and in the plural.');
  const t = [
    ['Person', 'mężczyzna, student, brat', 'Widzę studenta.', 'ci studenci byli (men forms)'],
    ['Animal', 'kot, pies, koń', 'Widzę kota.', 'te koty były'],
    ['Thing', 'dom, stół, telefon', 'Widzę dom.', 'te domy były'],
  ];
  s2.appendChild(simpleTable(['', 'Examples', 'Accusative (I see…)', 'Plural'], t));
  box.appendChild(s2);

  const s3 = section('Why it matters', 'Words that go with a noun copy its gender:');
  s3.appendChild(simpleTable(['', 'masculine', 'feminine', 'neuter'], [
    ['this', 'ten kot', 'ta kawa', 'to okno'],
    ['one', 'jeden', 'jedna', 'jedno'],
    ['good', 'dobry', 'dobra', 'dobre'],
    ['my', 'mój', 'moja', 'moje'],
    ['was', 'był', 'była', 'było'],
  ]));
  box.appendChild(s3);
  return box;
}

async function verbsTopic() {
  const box = el('div');
  const s1 = section('Aspect: two verbs for one action', 'Most verbs come in pairs. Pick by how you see the action, not by when it happened.');
  const two = el('div', 'gg-cards gg-two');
  const a = el('article', 'gg-card gg-impf');
  a.append(el('header', null, ''), el('p', 'gg-q', 'Imperfective — the process'), el('div', 'gg-line wavy'),
    el('p', null, 'Ongoing, repeated or habitual. Has a present tense.'), el('p', 'gg-ex', 'Czytałem książkę. — I was reading a book.'));
  a.querySelector('header').append(el('span', 'gram-badge g-v', 'impf'), el('strong', null, ' robić, czytać, pisać'));
  const b = el('article', 'gg-card gg-pf');
  b.append(el('header', null, ''), el('p', 'gg-q', 'Perfective — the result'), el('div', 'gg-line dot'),
    el('p', null, 'One complete action. No present: its “present” forms mean the future.'), el('p', 'gg-ex', 'Przeczytałem książkę. — I read (finished) the book.'));
  b.querySelector('header').append(el('span', 'gram-badge g-v', 'pf'), el('strong', null, ' zrobić, przeczytać, napisać'));
  two.append(a, b);
  s1.appendChild(two);
  s1.appendChild(simpleTable(['imperfective', 'perfective', 'meaning'], [
    ['robić', 'zrobić', 'do / make'], ['czytać', 'przeczytać', 'read'], ['pisać', 'napisać', 'write'],
    ['kupować', 'kupić', 'buy'], ['mówić', 'powiedzieć', 'say'], ['brać', 'wziąć', 'take'],
    ['widzieć', 'zobaczyć', 'see'], ['jeść', 'zjeść', 'eat'], ['pić', 'wypić', 'drink'], ['iść', 'pójść', 'go (on foot)'],
  ]));
  box.appendChild(s1);

  const s2 = section('Present tense: four patterns', 'Learn ja and ty for each verb and you can build the rest. Real forms:');
  const verbs = [];
  const patterns = [['czytać', '-am, -asz'], ['pisać', '-ę, -esz'], ['mówić', '-ę, -isz'], ['umieć', '-em, -esz']];
  const found = await Promise.all(patterns.map(([w]) => grammarFor(w).catch(() => null)));
  patterns.forEach(([w, label], k) => { if (found[k]?.entry?.pres) verbs.push([w, label, found[k].entry.pres]); });
  if (verbs.length) {
    const persons = ['ja', 'ty', 'on / ona', 'my', 'wy', 'oni / one'];
    s2.appendChild(simpleTable(['', ...verbs.map(([w, l]) => `${w} (${l})`)], persons.map((p, i) => [p, ...verbs.map(([w, , f]) => ending(w.slice(0, -2), first(f[i])))])));
  }
  box.appendChild(s2);

  // Verbs ending in -wać: the classic trap, the -wa- usually vanishes in the present.
  const sw = section('Verbs ending in -wać', 'In the present tense most of them lose part of the ending: gotować → gotuję, dawać → daję. The past tense keeps it: gotowałem, dawałem.');
  const wac = [['gotować', '-ować → -uję'], ['dawać', '-awać → -aję'], ['pokazywać', '-ywać → -uję'], ['używać', '-ywać → -am']];
  const wacFound = await Promise.all(wac.map(([w]) => grammarFor(w).catch(() => null)));
  const wacRows = wac.map(([w, l], k) => [w, l, wacFound[k]?.entry]).filter(([, , e]) => e?.pres);
  if (wacRows.length) {
    const persons = ['ja', 'ty', 'on / ona', 'my', 'wy', 'oni / one'];
    sw.appendChild(simpleTable(['', ...wacRows.map(([w, l]) => `${w} (${l})`)], [
      ...persons.map((p, i) => [p, ...wacRows.map(([w, , e]) => ending(w.slice(0, -2), first(e.pres[i])))]),
      ['past (on)', ...wacRows.map(([, , e]) => first(e.past?.m?.[2]))],
      ['command', ...wacRows.map(([, , e]) => first(e.imp?.[0]) ? `${first(e.imp[0])}!` : '—')],
    ]));
  }
  const groups = el('div', 'gg-cards gg-three');
  [
    ['-ować → -uję', 'Almost always. Only chować (chowam) breaks it.', 'gotować, kupować, pracować, studiować, budować, malować, rysować, podróżować, dziękować, potrzebować, żałować'],
    ['-awać → -aję', 'Always: the -wa- just disappears.', 'dawać, wstawać, dostawać, sprzedawać, poznawać, zostawać, oddawać'],
    ['-ywać / -iwać', 'Two groups, no safe rule — tap the verb to see which. Most made from a shorter verb (pokazać → pokazywać) go -uję.', '-uję: pokazywać, zapisywać, obiecywać, oczekiwać · -am: używać, nazywać, pływać, odpoczywać, odkrywać, śpiewać'],
  ].forEach(([title, rule, list]) => {
    const c = el('article', 'gg-card');
    c.append(el('header', null, ''), el('p', null, rule), el('p', 'gg-ex', list));
    c.querySelector('header').appendChild(el('strong', null, title));
    groups.appendChild(c);
  });
  sw.appendChild(groups);
  box.appendChild(sw);

  const s3 = section('Past tense: it shows who did it', 'Take the infinitive, drop -ć, add -ł- plus an ending for the person and gender.');
  s3.appendChild(simpleTable(['', 'man', 'woman', ''], [
    ['ja', 'robiłem', 'robiłam', ''], ['ty', 'robiłeś', 'robiłaś', ''], ['on / ona / ono', 'robił', 'robiła', 'robiło'],
    ['my', 'robiliśmy', 'robiłyśmy', ''], ['wy', 'robiliście', 'robiłyście', ''], ['oni / one', 'robili', 'robiły', ''],
  ]));
  s3.appendChild(el('p', 'meta gg-note', 'Plural: -li for groups with at least one man, -ły for everyone else.'));
  box.appendChild(s3);

  const s4 = section('Future tense');
  s4.appendChild(simpleTable(['', 'imperfective', 'perfective'], [
    ['how', 'będę + infinitive', 'just conjugate it'],
    ['I will…', 'będę robić', 'zrobię'], ['you will…', 'będziesz robić', 'zrobisz'], ['they will…', 'będą robić', 'zrobią'],
  ]));
  box.appendChild(s4);

  const s5 = section('Być (to be)', 'The most irregular verb, and you need it everywhere.');
  s5.appendChild(simpleTable(['', 'present', 'past (m / f)', 'future'], [
    ['ja', 'jestem', 'byłem / byłam', 'będę'], ['ty', 'jesteś', 'byłeś / byłaś', 'będziesz'], ['on / ona', 'jest', 'był / była', 'będzie'],
    ['my', 'jesteśmy', 'byliśmy / byłyśmy', 'będziemy'], ['wy', 'jesteście', 'byliście / byłyście', 'będziecie'], ['oni / one', 'są', 'byli / były', 'będą'],
  ]));
  box.appendChild(s5);

  const s6 = section('Good to know');
  const tips = el('div', 'gram-tips');
  [
    ['Polite “you”', 'Use Pan (man) / Pani (woman) with the on / ona form.', 'Czy Pan mówi po angielsku?'],
    ['Się', 'Many verbs come with się (myself / each other). It floats, usually after the verb.', 'Uczę się polskiego. Nazywam się Ola.'],
    ['Drop the pronoun', 'The ending already says who it is, so ja / ty are usually left out.', 'Mówię po polsku. (not “Ja mówię…”)'],
    ['Negation', 'Put nie right before the verb. The object switches to dopełniacz.', 'Mam czas. → Nie mam czasu.'],
  ].forEach(([t, p, ex]) => { const d = el('div', 'gram-tip'); d.append(el('strong', null, t), el('p', null, p), el('p', 'gram-ex', ex)); tips.appendChild(d); });
  s6.appendChild(tips);
  box.appendChild(s6);
  return box;
}

function adjectivesTopic() {
  const box = el('div');
  const s1 = section('Adjectives copy their noun', 'Same gender, same number, same case. The endings are regular, so one table covers almost all of them.');
  s1.appendChild(simpleTable(['Case', 'masculine', 'feminine', 'neuter', 'plural (men)', 'plural (others)'], [
    ['mianownik', 'dobry', 'dobra', 'dobre', 'dobrzy', 'dobre'],
    ['dopełniacz', 'dobrego', 'dobrej', 'dobrego', 'dobrych', 'dobrych'],
    ['celownik', 'dobremu', 'dobrej', 'dobremu', 'dobrym', 'dobrym'],
    ['biernik', 'dobrego / dobry*', 'dobrą', 'dobre', 'dobrych', 'dobre'],
    ['narzędnik', 'dobrym', 'dobrą', 'dobrym', 'dobrymi', 'dobrymi'],
    ['miejscownik', 'dobrym', 'dobrej', 'dobrym', 'dobrych', 'dobrych'],
  ].map(([c, ...r]) => [c, ...r.map((f) => ending('dobr', f))])));
  s1.appendChild(el('p', 'meta gg-note', '* dobrego for people and animals (widzę dobrego psa), dobry for things (mam dobry telefon).'));
  box.appendChild(s1);

  const s2 = section('Spelling: -y or -i?', 'After k and g the ending is -i: polski, drogi, wysoki. After soft consonants too: tani, ostatni. Everywhere else -y: dobry, nowy, ładny.');
  box.appendChild(s2);

  const s3 = section('Comparing', 'Add -szy / -ejszy for “more”, put naj- in front for “the most”. Long adjectives use bardziej / najbardziej.');
  s3.appendChild(simpleTable(['', 'more', 'the most'], [
    ['nowy (new)', 'nowszy', 'najnowszy'], ['ładny (pretty)', 'ładniejszy', 'najładniejszy'],
    ['dobry (good)', 'lepszy', 'najlepszy'], ['zły (bad)', 'gorszy', 'najgorszy'],
    ['duży (big)', 'większy', 'największy'], ['mały (small)', 'mniejszy', 'najmniejszy'],
    ['interesujący', 'bardziej interesujący', 'najbardziej interesujący'],
  ]));
  box.appendChild(s3);
  return box;
}

async function numbersTopic() {
  const box = el('div');
  const s1 = section('The 1 · 2–4 · 5+ rule', 'The number decides the noun’s ending. After 5 and up, the noun goes into dopełniacz plural, and the verb becomes singular neuter (było, jest).');
  const sample = await nouns(['kot', 'kobieta', 'okno', 'dom']);
  const one = { m: 'jeden', f: 'jedna', n: 'jedno' };
  const two = { m: 'dwa', f: 'dwie', n: 'dwa' };
  if (sample.length) {
    s1.appendChild(simpleTable(['', '1', '2, 3, 4', '5 and more'], sample.map((g) => {
      const s = GENDERS[g.entry.g]?.short || 'm';
      return [first(g.entry.f[0]), `${one[s] || 'jeden'} ${first(g.entry.f[0])}`, `${two[s] || 'dwa'} ${first(g.entry.f[7])}`, `pięć ${first(g.entry.f[8])}`];
    })));
  }
  s1.appendChild(el('p', 'meta gg-note', '22, 23, 24, 32… follow 2–4 (dwadzieścia dwa koty). 12, 13, 14 follow 5+ (dwanaście kotów).'));
  box.appendChild(s1);

  const s2 = section('Groups of men', 'For men (and mixed groups) Polish uses special forms: dwaj / dwóch, trzech, pięciu + dopełniacz plural.');
  s2.appendChild(simpleTable(['', 'men', 'others'], [['2', 'dwóch studentów', 'dwie studentki'], ['3', 'trzech braci', 'trzy siostry'], ['5', 'pięciu panów', 'pięć pań']]));
  box.appendChild(s2);

  const s3 = section('Counting words', 'dużo, mało, kilka, ile, trochę and amounts like kilogram, butelka, szklanka all take dopełniacz.');
  s3.appendChild(el('p', 'gram-ex gg-ex-line', 'dużo czasu · kilka jabłek · kilogram cukru · szklanka wody · Ile kosztuje?'));
  box.appendChild(s3);
  return box;
}

function prepositionsTopic() {
  const box = el('div');
  const s1 = section('Prepositions choose the case', 'Learn each preposition together with its case — that’s half of Polish grammar done.');
  const groups = [
    [1, 'do (to), z (out of / from), od (from), bez (without), dla (for), u (at someone’s), obok (next to), koło (near), podczas (during), według (according to)', 'Idę do sklepu. Kawa bez cukru. Jestem u mamy.'],
    [2, 'dzięki (thanks to), przeciw (against), ku (towards)', 'Dzięki tobie!'],
    [3, 'przez (through / for), na (to, for — direction or time), w (into), za (in, for — time or price), o (for — asking)', 'Idę na pocztę. Dziękuję za kawę.'],
    [4, 'z (with), za (behind), przed (in front of / before), nad (above), pod (under), między (between)', 'Kawa z mlekiem. Kot jest pod stołem.'],
    [5, 'w (in), na (on, at), o (about), przy (by), po (after / around)', 'Mieszkam w Polsce. Książka jest na stole. Mówimy o filmie.'],
  ];
  const grid = el('div', 'gg-cards');
  groups.forEach(([c, preps, ex]) => {
    const card = el('article', `gg-card ${CASE_TONES[c]}`);
    const h = el('header'); h.append(el('strong', null, CASES[c].pl), el('span', null, CASES[c].en));
    const chips = el('div', 'gg-chips');
    preps.split(', ').forEach((p) => chips.appendChild(el('span', null, p)));
    card.append(h, chips, el('p', 'gg-ex', ex));
    grid.appendChild(card);
  });
  s1.appendChild(grid);
  box.appendChild(s1);

  const s2 = section('Where? vs. where to?', 'w and na take miejscownik for a place (where?) and biernik for a direction (where to?). Same with za, pod, nad, przed: narzędnik for “where”, biernik for “where to”.');
  s2.appendChild(simpleTable(['', 'where? (miejscownik / narzędnik)', 'where to? (biernik)'], [
    ['w', 'Jestem w kinie.', 'Idę w góry.'], ['na', 'Jestem na poczcie.', 'Idę na pocztę.'],
    ['pod', 'Kot śpi pod stołem.', 'Kot wchodzi pod stół.'], ['za', 'Stoję za domem.', 'Idę za dom.'],
  ]));
  s2.appendChild(el('p', 'meta gg-note', 'Cities and countries: w Polsce, w Krakowie — but na Węgrzech, na Ukrainie. Going to them: do Polski, do Krakowa.'));
  box.appendChild(s2);
  return box;
}

function pronounsTopic() {
  const box = el('div');
  const s1 = section('Personal pronouns', 'Short forms (mi, cię, go) are the everyday ones; long forms (mnie, ciebie, jego) are for emphasis and after prepositions. After a preposition, on / ona / oni get an n-: do niego, z nią, o nich.');
  s1.appendChild(simpleTable(['', 'ja', 'ty', 'on / ono', 'ona', 'my', 'wy', 'oni / one'], [
    ['mianownik', 'ja', 'ty', 'on / ono', 'ona', 'my', 'wy', 'oni / one'],
    ['dopełniacz', 'mnie', 'ciebie, cię', 'jego, go, niego', 'jej, niej', 'nas', 'was', 'ich, nich'],
    ['celownik', 'mnie, mi', 'tobie, ci', 'jemu, mu, niemu', 'jej, niej', 'nam', 'wam', 'im, nim'],
    ['biernik', 'mnie', 'ciebie, cię', 'jego, go, niego (ono: je)', 'ją, nią', 'nas', 'was', 'ich, nich (one: je, nie)'],
    ['narzędnik', 'mną', 'tobą', 'nim', 'nią', 'nami', 'wami', 'nimi'],
    ['miejscownik', 'mnie', 'tobie', 'nim', 'niej', 'nas', 'was', 'nich'],
  ]));
  box.appendChild(s1);

  const s2 = section('My, your, his…', 'mój / twój / nasz / wasz change like adjectives (moja mama, mojego brata). jego, jej, ich never change.');
  s2.appendChild(simpleTable(['', 'masculine', 'feminine', 'neuter', 'plural'], [
    ['my', 'mój', 'moja', 'moje', 'moi (men) / moje'], ['your', 'twój', 'twoja', 'twoje', 'twoi / twoje'],
    ['our', 'nasz', 'nasza', 'nasze', 'nasi / nasze'], ['your (pl.)', 'wasz', 'wasza', 'wasze', 'wasi / wasze'],
    ['his / her / their', 'jego / jej / ich', '(same)', '(same)', '(same)'], ['one’s own', 'swój', 'swoja', 'swoje', 'swoi / swoje'],
  ]));
  s2.appendChild(el('p', 'meta gg-note', 'swój replaces mój / twój / jego… when it belongs to the subject: Ola kocha swojego psa (her own dog).'));
  box.appendChild(s2);
  return box;
}

function simpleTable(headers, rows) {
  const wrap = el('div', 'gram-table-wrap');
  const t = el('table', 'gram-table gg-table');
  const thead = el('thead'); const hr = el('tr');
  headers.forEach((h) => hr.appendChild(el('th', null, h)));
  thead.appendChild(hr); t.appendChild(thead);
  const tb = el('tbody');
  rows.forEach(([head, ...cells]) => {
    const tr = el('tr');
    const th = el('th', null, head); th.scope = 'row'; tr.appendChild(th);
    cells.forEach((c) => { const td = el('td'); if (c instanceof Node) td.appendChild(c); else td.textContent = c; tr.appendChild(td); });
    tb.appendChild(tr);
  });
  t.appendChild(tb); wrap.appendChild(t);
  return wrap;
}

// ---------- Case practice ----------
// Fill the gap with the right form of a noun. Questions come from the learner's own deck
// nouns when there are enough, otherwise from everyday words.
const DEFAULT_NOUNS = ['kot', 'pies', 'kobieta', 'mama', 'dom', 'okno', 'książka', 'samochód', 'miasto', 'brat', 'siostra', 'kawa', 'stół', 'szkoła', 'telefon', 'dziecko'];
const TEMPLATES = [
  { idx: 1, text: 'Nie widzę ___.', why: 'dopełniacz: the object of a negated verb' },
  { idx: 1, text: 'Idę do ___.', why: 'dopełniacz: after do' },
  { idx: 2, text: 'Przyglądam się ___.', why: 'celownik: przyglądać się komu? czemu?' },
  { idx: 3, text: 'Widzę ___.', why: 'biernik: the direct object (kogo? co?)' },
  { idx: 4, text: 'Rozmawiam z ___.', why: 'narzędnik: after z meaning “with”' },
  { idx: 5, text: 'Myślę o ___.', why: 'miejscownik: after o meaning “about”' },
  { idx: 8, text: 'Mam pięć ___.', why: 'dopełniacz plural: after 5 and more', skip: (g) => g.entry.g === 'm-pers' },
  { idx: 10, text: 'Lubię te ___.', why: 'biernik plural', skip: (g) => g.entry.g === 'm-pers' },
];

async function practiceTopic(getDeckWords) {
  const box = el('div');
  const s = section('Case practice', 'Pick the form that fits the sentence. The word in brackets is the dictionary form.');
  const panel = el('div', 'panel quiz gg-quiz');
  s.appendChild(panel);
  box.appendChild(s);

  let pool = await nouns(fewFiles(getDeckWords?.() || []));
  const fromDecks = pool.length >= 4;
  if (!fromDecks) pool = await nouns(DEFAULT_NOUNS);
  const source = el('p', 'meta', fromDecks ? 'Using nouns from your decks.' : 'Using everyday nouns.');
  s.insertBefore(source, panel);

  let qs = []; let i = 0; let score = 0;
  const build = () => {
    qs = [];
    for (let n = 0; n < 40 && qs.length < 10; n++) {
      const g = pool[Math.floor(Math.random() * pool.length)];
      const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
      if (t.skip?.(g)) continue;
      const answer = first(g.entry.f[t.idx]);
      if (!answer) continue;
      const others = shuffleArray([...new Set(g.entry.f.map(first).filter((f) => f && f !== answer))]).slice(0, 3);
      if (others.length < 2) continue;
      qs.push({ g, t, answer, options: shuffleArray([answer, ...others]) });
    }
    i = 0; score = 0;
  };
  const show = () => {
    panel.replaceChildren();
    if (i >= qs.length) {
      const art = el('div', 'gg-done-art');
      art.innerHTML = mascot(score >= qs.length * 0.7 ? 'cheer' : 'wave');
      panel.append(art, el('p', 'quiz-label', score >= qs.length * 0.7 ? 'Nicely done!' : 'Keep going — cases click with practice'), el('p', 'prompt-word', `${score} / ${qs.length}`));
      const again = el('button', null, 'Practice again'); again.type = 'button';
      again.addEventListener('click', () => { build(); show(); });
      panel.appendChild(again);
      return;
    }
    const q = qs[i];
    panel.appendChild(el('p', 'quiz-label', `Question ${i + 1} of ${qs.length}`));
    const sentence = el('p', 'gg-sentence');
    const [a, b] = q.t.text.split('___');
    sentence.append(a, el('span', 'gg-gap', '____'), b);
    sentence.appendChild(el('span', 'gg-base', ` (${first(q.g.entry.f[0])})`));
    panel.appendChild(sentence);
    const opts = el('div', 'gg-options');
    const fb = el('p', 'gg-feedback');
    q.options.forEach((o) => {
      const btn = el('button', 'test-option', o); btn.type = 'button';
      btn.addEventListener('click', () => {
        if (opts.dataset.done) return;
        opts.dataset.done = '1';
        const ok = o === q.answer;
        if (ok) score++;
        for (const x of opts.children) { x.disabled = true; if (x.textContent === q.answer) x.classList.add('correct'); }
        if (!ok) btn.classList.add('incorrect');
        sentence.querySelector('.gg-gap').textContent = q.answer;
        fb.className = `gg-feedback ${ok ? 'correct' : 'incorrect'}`;
        fb.textContent = `${ok ? 'Correct! ' : ''}${q.t.why}.`;
        const next = el('button', null, i + 1 < qs.length ? 'Next' : 'See score'); next.type = 'button';
        next.addEventListener('click', () => { i++; show(); });
        const more = el('button', 'ghost', `All forms of ${first(q.g.entry.f[0])}`); more.type = 'button';
        more.addEventListener('click', () => openGrammarSheet(q.g));
        const row = el('div', 'gg-next'); row.append(more, next);
        panel.appendChild(row);
        next.focus({ preventScroll: true });
      });
      opts.appendChild(btn);
    });
    panel.append(opts, fb);
  };
  build();
  show();
  return box;
}

// ---------- Endings chart ----------
function chartTable(label, part) {
  const wrap = el('div', 'cc-table-wrap');
  wrap.appendChild(el('h4', 'cc-sub', label));
  const t = el('table', 'cc-table');
  const hr = el('tr');
  hr.appendChild(el('th', 'cc-corner', ''));
  part.cols.forEach((c) => hr.appendChild(el('th', null, c)));
  const thead = el('thead'); thead.appendChild(hr); t.appendChild(thead);
  const tb = el('tbody');
  [['Przymiotnik', part.adj], ['Rzeczownik', part.noun]].forEach(([name, cells]) => {
    const tr = el('tr');
    const th = el('th', null, name); th.scope = 'row'; tr.appendChild(th);
    cells.forEach((c, i) => {
      const td = el('td');
      // A single cell under several columns spans them all ("all genders").
      if (i === cells.length - 1 && cells.length < part.cols.length) td.colSpan = part.cols.length - i;
      td.dataset.label = td.colSpan > 1 ? 'Wszystkie rodzaje' : part.cols[i];
      td.innerHTML = chartCell(c);
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  t.appendChild(tb); wrap.appendChild(t);
  return wrap;
}

function chartTopic(_, jump) {
  const box = el('div');
  const head = section('Case endings chart', 'Adjective and noun endings for all seven cases, singular and plural. Endings in red; examples in italics.');
  const dl = el('a', 'gg-download', 'Download as PDF');
  dl.href = '/files/7-przypadkow.pdf';
  dl.setAttribute('download', 'Polska gramatyka - 7 przypadkow.pdf');
  head.appendChild(dl);
  box.appendChild(head);
  CASE_CHART.forEach((c, i) => {
    const d = el('details', `cc-case ${CASE_TONES[i]}`);
    d.id = `chart-${i}`;
    d.open = jump?.case != null ? jump.case === i : i === 0;
    const s = el('summary');
    s.append(el('span', 'cc-num', String(i + 1)), el('strong', null, c.pl), el('span', 'cc-en', c.en), el('span', 'cc-q', c.q));
    d.appendChild(s);
    const body = el('div', 'cc-body');
    if (c.preps) {
      const chips = el('div', 'gg-chips');
      c.preps.split(', ').forEach((p) => chips.appendChild(el('span', null, p)));
      body.appendChild(chips);
    }
    body.appendChild(chartTable('Liczba pojedyncza', c.sg));
    if (c.plural) body.appendChild(chartTable('Liczba mnoga', c.plural));
    if (c.note) { const n = el('p', 'cc-note'); n.innerHTML = `<strong>Uwaga:</strong> ${chartCell(c.note)}`; body.appendChild(n); }
    const ex = el('p', 'cc-ex'); ex.innerHTML = `<strong>Przykłady:</strong> ${chartCell(c.examples)}`; body.appendChild(ex);
    d.appendChild(body);
    box.appendChild(d);
  });
  if (jump?.case != null) requestAnimationFrame(() => box.querySelector(`#chart-${jump.case}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  return box;
}

/** Ask the Grammar section to open a topic (and case) next time it's shown — used by links elsewhere. */
export function jumpTo(topic, caseIndex) {
  try { sessionStorage.setItem('grammarJump', JSON.stringify({ topic, case: caseIndex ?? null })); } catch { /* storage blocked */ }
}
function takeJump() {
  try { const j = JSON.parse(sessionStorage.getItem('grammarJump') || 'null'); sessionStorage.removeItem('grammarJump'); return j; } catch { return null; }
}

// ---------- Section ----------
const TOPICS = [
  ['cases', 'Cases', casesTopic], ['chart', 'Endings chart', chartTopic], ['gender', 'Gender', genderTopic], ['verbs', 'Verbs', verbsTopic],
  ['adjectives', 'Adjectives', adjectivesTopic], ['numbers', 'Numbers', numbersTopic],
  ['prepositions', 'Prepositions', prepositionsTopic], ['pronouns', 'Pronouns', pronounsTopic], ['practice', 'Practice', practiceTopic],
];

let built = false;
let openTopic = null;
/** Renders the Grammar section once. `getDeckWords()` returns the learner's Polish words. */
export function renderGrammarGuide({ learningLang, getDeckWords } = {}) {
  const root = document.getElementById('grammarContainer');
  if (!root) return;
  if (learningLang && learningLang !== 'pl') {
    built = false;
    root.replaceChildren(el('h2', null, 'Grammar'), el('p', 'meta', 'The grammar guide is for Polish for now. Switch your learning language to Polish in Profile → Settings to use it.'));
    return;
  }
  if (built) { const j = takeJump(); if (j) openTopic?.(j.topic, j); return; }
  built = true;
  root.replaceChildren();

  const hero = el('div', 'gg-hero');
  const text = el('div');
  text.append(el('h2', null, 'Grammar'), el('p', 'meta', 'Polish grammar in plain English: what the cases are for, how gender works, and how verbs change. Look up any word to see all its forms.'));
  const form = el('form', 'gg-search');
  form.setAttribute('role', 'search');
  const input = el('input'); input.type = 'search'; input.placeholder = 'Look up a word, e.g. “kota” or “poszłam”'; input.setAttribute('aria-label', 'Look up a Polish word');
  input.autocomplete = 'off'; input.spellcheck = false;
  const go = el('button', null, 'Look up'); go.type = 'submit';
  const msg = el('p', 'meta gg-msg');
  form.append(input, go);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const w = input.value.trim();
    if (!w) return input.focus();
    msg.textContent = '';
    const g = await grammarFor(w).catch(() => null);
    if (g) openGrammarSheet(g);
    else msg.textContent = `No grammar for “${w}” yet. Try its dictionary form.`;
  });
  text.append(form, msg);
  const art = el('div', 'gg-hero-art');
  art.innerHTML = mascot('cheer');
  hero.append(text, art);
  root.appendChild(hero);

  const tabs = el('div', 'segmented gg-tabs');
  tabs.setAttribute('role', 'tablist');
  const body = el('div', 'gg-body');
  let token = 0;
  const open = async (key, jump) => {
    const t = ++token;
    for (const b of tabs.children) b.setAttribute('aria-selected', String(b.dataset.topic === key));
    try { localStorage.setItem('grammarTopic', key); } catch { /* storage blocked */ }
    const topic = TOPICS.find(([k]) => k === key) || TOPICS[0];
    body.innerHTML = loader('Loading…');
    const content = await topic[2](getDeckWords, jump);
    if (t === token) body.replaceChildren(content);
  };
  TOPICS.forEach(([key, label]) => {
    const b = el('button', null, label);
    b.type = 'button'; b.dataset.topic = key; b.setAttribute('role', 'tab');
    b.addEventListener('click', () => open(key));
    tabs.appendChild(b);
  });
  root.append(tabs, body);
  openTopic = open;
  const jump = takeJump();
  let saved = null;
  try { saved = localStorage.getItem('grammarTopic'); } catch { /* storage blocked */ }
  if (jump && TOPICS.some(([k]) => k === jump.topic)) open(jump.topic, jump);
  else open(TOPICS.some(([k]) => k === saved) ? saved : 'cases');
}
