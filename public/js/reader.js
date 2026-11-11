// ============ STORY READER ============
// The reading view: stable text, a popup per word, sentence audio with live
// highlighting and adjustable speed, and a "Words to learn" list.

import { speakText, pickVoice, speechLang, hasVoiceFor } from './tts.js';
import { lookupWords } from './data.js';
import { showGrammar } from './grammar.js';
import { langName } from './constants.js';

const $ = (id) => document.getElementById(id);
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFC').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();
const SPEEDS = [0.6, 0.8, 1];
const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5Z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  speak: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
};

const state = {
  open: false,
  data: null,              // { title, story, tokens }
  lang: 'pl',
  nativeLang: 'en',
  meanings: new Map(),     // norm word/phrase -> translation (from the story's own word list)
  dict: {},                // norm word -> { translation, lemma } (shared dictionary)
  saved: new Map(),        // norm -> { text, translation, lemma }
  sentences: [],           // [{ el, text, words: [{ el, start, end }] }]
  current: 0,
  playing: false,
  run: 0,                  // bumps on every start/stop so stale speech callbacks are ignored
  speed: Number(safeGet('readerSpeed')) || 0.8,
  activeWord: null,
  callbacks: {},
};

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } }

const meaningOf = (key) => state.meanings.get(key) || state.dict[key]?.translation || '';
const lemmaOf = (key) => {
  const l = state.dict[key]?.lemma;
  return l && l !== key ? l : '';
};

// ---------- Rendering ----------

function segmenter(granularity) {
  try { return new Intl.Segmenter(state.lang === 'jp' ? 'ja' : state.lang, { granularity }); } catch { return null; }
}

function splitSentences(text) {
  const seg = segmenter('sentence');
  if (seg) return [...seg.segment(text)].map((s) => s.segment);
  return text.match(/[^.!?…]+[.!?…]*["»”’)]*\s*|.+$/gs) || [text];
}

// Numbers ("1999", footnote marks like [6]) aren't words to translate.
const HAS_LETTER = /\p{L}/u;
function splitWords(text) {
  const seg = segmenter('word');
  if (seg) return [...seg.segment(text)].map((s) => ({ text: s.segment, word: !!s.isWordLike && HAS_LETTER.test(s.segment), index: s.index }));
  const out = [];
  const re = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}]+)*/gu;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), word: false, index: last });
    out.push({ text: m[0], word: HAS_LETTER.test(m[0]), index: m.index });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), word: false, index: last });
  return out;
}

function render() {
  const box = $('storyDisplay');
  box.replaceChildren();
  box.lang = state.lang;
  state.sentences = [];
  let wordIndex = 0;

  // Multi-word entries in the story's word list ("Dzień dobry") stay one tappable unit.
  const phrases = [...state.meanings.keys()].filter((k) => k.includes(' '));
  const maxPhrase = Math.min(4, Math.max(1, ...phrases.map((p) => p.split(' ').length)));

  for (const paragraph of state.data.story.split(/\n+/)) {
    const p = document.createElement('p');
    p.className = 'reader-paragraph';
    for (const sentenceText of splitSentences(paragraph)) {
      const sEl = document.createElement('span');
      sEl.className = 'sentence';
      const sentence = { el: sEl, text: sentenceText, words: [] };
      const parts = splitWords(sentenceText);
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part.word) { sEl.append(part.text); continue; }

        // Longest phrase from here that the word list knows
        let end = i;
        for (let n = maxPhrase; n > 1; n--) {
          const wordsAhead = [];
          let j = i;
          while (j < parts.length && wordsAhead.length < n) {
            if (parts[j].word) wordsAhead.push(parts[j]);
            else if (parts[j].text.trim()) break;
            j++;
          }
          if (wordsAhead.length === n && state.meanings.has(norm(wordsAhead.map((w) => w.text).join(' ')))) { end = j - 1; break; }
        }

        const text = parts.slice(i, end + 1).map((x) => x.text).join('');
        const key = norm(text);
        const w = document.createElement('span');
        w.className = 'w';
        w.textContent = text;
        w.dataset.key = key;
        w.dataset.i = wordIndex++;
        w.tabIndex = 0;
        w.setAttribute('role', 'button');
        sEl.appendChild(w);
        sentence.words.push({ el: w, start: part.index, end: parts[end].index + parts[end].text.length });
        i = end;
      }
      p.appendChild(sEl);
      state.sentences.push(sentence);
    }
    box.appendChild(p);
  }
  refreshWordMarks();
}

// Saved words get a yellow underline; words with no translation a dotted one.
function refreshWordMarks() {
  document.querySelectorAll('#storyDisplay .w').forEach((w) => {
    w.classList.toggle('saved', state.saved.has(w.dataset.key));
    w.classList.toggle('untranslated', !meaningOf(w.dataset.key));
  });
  const missing = new Set([...document.querySelectorAll('#storyDisplay .w.untranslated')].map((w) => w.dataset.key)).size;
  const note = $('untranslatedNote');
  note.hidden = !missing;
  note.textContent = `${missing} word${missing === 1 ? ' has' : 's have'} no translation yet. Tap the ones with a dotted underline to add one.`;
}

// ---------- Word popup ----------

function openPopup(wordEl) {
  closePopup();
  state.activeWord = wordEl;
  wordEl.classList.add('active');
  const key = wordEl.dataset.key;
  const meaning = meaningOf(key);
  const lemma = lemmaOf(key);
  const pop = $('wordPopup');
  pop.replaceChildren();

  const head = document.createElement('div');
  head.className = 'wp-head';
  const word = document.createElement('strong');
  word.className = 'wp-word';
  word.textContent = wordEl.textContent;
  const speak = document.createElement('button');
  speak.type = 'button';
  speak.className = 'wp-speak';
  speak.innerHTML = ICON.speak;
  speak.setAttribute('aria-label', `Listen to ${wordEl.textContent}`);
  speak.addEventListener('click', () => speakText(wordEl.textContent, state.lang, 0.8));
  head.append(word, speak);
  pop.appendChild(head);

  if (meaning) {
    const m = document.createElement('p');
    m.className = 'wp-meaning';
    m.textContent = meaning;
    pop.appendChild(m);
  }
  if (lemma) {
    const l = document.createElement('p');
    l.className = 'wp-lemma';
    l.append('form of ');
    const b = document.createElement('b');
    b.textContent = lemma;
    l.appendChild(b);
    pop.appendChild(l);
  }
  if (!meaning) {
    // No translation anywhere: let the reader add one (it also helps everyone else).
    const form = document.createElement('form');
    form.className = 'wp-add';
    const input = document.createElement('input');
    input.placeholder = `Meaning in ${langName(state.nativeLang)}`;
    input.setAttribute('aria-label', `Translation of ${wordEl.textContent}`);
    input.autocomplete = 'off';
    const add = document.createElement('button');
    add.type = 'submit';
    add.className = 'small';
    add.textContent = 'Add';
    form.append(input, add);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const t = input.value.trim();
      if (!t) return input.focus();
      state.meanings.set(key, t);
      state.callbacks.onTranslationAdded?.(wordEl.textContent, t);
      refreshWordMarks();
      openPopup(wordEl);
    });
    const hint = document.createElement('p');
    hint.className = 'wp-lemma';
    hint.textContent = 'Not in the dictionary yet. Know it? Add it for everyone.';
    pop.append(hint, form);
  }

  // Gender / case / conjugation, loaded after the popup is shown (Polish only).
  const gram = document.createElement('div');
  gram.className = 'wp-grammar';
  gram.hidden = true;
  pop.appendChild(gram);
  showGrammar(gram, wordEl.textContent, {
    lang: state.lang, hint: lemma,
    onReady: () => { if (state.activeWord === wordEl && !pop.hidden) placePopup(pop, wordEl); },
  });

  const saved = state.saved.has(key);
  const save = document.createElement('button');
  save.type = 'button';
  save.className = saved ? 'ghost wp-save' : 'wp-save';
  save.textContent = saved ? 'Saved ✓  Remove' : 'Save word';
  save.disabled = !meaning && !saved;
  save.title = save.disabled ? 'Add a translation first' : '';
  save.addEventListener('click', () => {
    toggleSaved(key, wordEl.textContent);
    openPopup(wordEl);
  });
  pop.appendChild(save);

  pop.hidden = false;
  placePopup(pop, wordEl);
  if (!meaning) pop.querySelector('input')?.focus({ preventScroll: true });
}

// Above the word when there's room, otherwise below; kept inside the viewport.
function placePopup(pop, wordEl) {
  const r = wordEl.getBoundingClientRect();
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  const left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left + r.width / 2 - pw / 2));
  const above = r.top - ph - 12 > 8;
  pop.style.left = `${left}px`;
  pop.style.top = `${above ? r.top - ph - 12 : r.bottom + 12}px`;
  pop.classList.toggle('below', !above);
  pop.style.setProperty('--arrow-x', `${r.left + r.width / 2 - left}px`);
}

function closePopup() {
  state.activeWord?.classList.remove('active');
  state.activeWord = null;
  const pop = $('wordPopup');
  if (pop) pop.hidden = true;
}

// ---------- Words to learn ----------

function toggleSaved(key, text) {
  if (state.saved.has(key)) state.saved.delete(key);
  else state.saved.set(key, { text, translation: meaningOf(key), lemma: lemmaOf(key) });
  refreshWordMarks();
  renderWords();
}

function renderWords() {
  const list = $('wordsList');
  list.replaceChildren();
  const n = state.saved.size;
  $('wordsCount').textContent = n;
  $('wordsCountMobile').textContent = n;
  $('wordsHint').hidden = n > 0;
  const btn = $('createDeckFromStoryTokens');
  btn.disabled = !n;
  btn.textContent = n ? `Add ${n} word${n === 1 ? '' : 's'} to a deck` : 'Add words to a deck';

  for (const [key, w] of state.saved) {
    const li = document.createElement('li');
    const main = document.createElement('div');
    main.className = 'wl-main';
    const word = document.createElement('strong');
    word.textContent = w.text;
    const meaning = document.createElement('span');
    meaning.textContent = w.translation;
    main.append(word, meaning);
    if (w.lemma) {
      const l = document.createElement('span');
      l.className = 'wl-lemma';
      l.textContent = `form of ${w.lemma}`;
      main.appendChild(l);
    }
    const speak = document.createElement('button');
    speak.type = 'button';
    speak.className = 'wl-icon';
    speak.innerHTML = ICON.speak;
    speak.setAttribute('aria-label', `Listen to ${w.text}`);
    speak.addEventListener('click', () => speakText(w.text, state.lang, 0.8));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'wl-icon wl-remove';
    remove.textContent = '✕';
    remove.setAttribute('aria-label', `Remove ${w.text}`);
    remove.addEventListener('click', () => toggleSaved(key, w.text));
    li.append(main, speak, remove);
    list.appendChild(li);
  }
}

// ---------- Audio ----------

function updateAudioUi() {
  const total = state.sentences.length;
  $('audioPlay').innerHTML = state.playing ? ICON.pause : ICON.play;
  $('audioPlay').setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
  const at = Math.min(state.current + 1, total);
  // Full label on wide screens, compact "3/9" on phones (CSS shows one or the other).
  $('audioStatus').innerHTML = total ? `<span class="long">Sentence ${at} of ${total}</span><span class="short">${at}/${total}</span>` : '';
  $('audioFill').style.width = total ? `${((state.current + (state.playing ? 0.5 : 0)) / total) * 100}%` : '0';
  $('audioSpeed').textContent = `${state.speed}×`;
  state.sentences.forEach((s, i) => s.el.classList.toggle('reading', i === state.current && (state.playing || state.current > 0)));
}

function clearSpeaking() {
  document.querySelectorAll('#storyDisplay .w.speaking').forEach((w) => w.classList.remove('speaking'));
}

function speakSentence(i) {
  const run = ++state.run;
  const s = state.sentences[i];
  if (!s) return stop(true);
  state.current = i;
  clearSpeaking();
  updateAudioUi();
  s.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(s.text);
  u.lang = speechLang(state.lang);
  const voice = pickVoice(state.lang);
  if (voice) u.voice = voice;
  u.rate = state.speed;
  // Light up each word as it's spoken (voices that report word boundaries).
  u.onboundary = (e) => {
    if (run !== state.run || (e.name && e.name !== 'word')) return;
    clearSpeaking();
    s.words.find((w) => e.charIndex >= w.start && e.charIndex < w.end)?.el.classList.add('speaking');
  };
  u.onend = () => {
    if (run !== state.run || !state.playing) return;
    clearSpeaking();
    if (i + 1 < state.sentences.length) setTimeout(() => run === state.run && state.playing && speakSentence(i + 1), 220);
    else stop(true);
  };
  window.speechSynthesis.speak(u);
}

function play() {
  if (!window.speechSynthesis) return;
  state.playing = true;
  speakSentence(state.current);
}

function stop(finished = false) {
  state.run++;
  state.playing = false;
  window.speechSynthesis?.cancel();
  clearSpeaking();
  if (finished) state.current = 0;
  updateAudioUi();
}

function step(delta) {
  const next = Math.max(0, Math.min(state.sentences.length - 1, state.current + delta));
  if (state.playing) speakSentence(next);
  else {
    state.current = next;
    updateAudioUi();
    state.sentences[next]?.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// ---------- Wiring (once) ----------

let wired = false;
function wire() {
  if (wired) return;
  wired = true;

  $('storyDisplay').addEventListener('click', (e) => {
    const w = e.target.closest('.w');
    if (!w) return closePopup();
    if (state.activeWord === w) return closePopup();
    openPopup(w);
  });
  $('storyDisplay').addEventListener('keydown', (e) => {
    const w = e.target.closest('.w');
    if (w && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPopup(w); }
  });
  document.addEventListener('click', (e) => {
    if (state.activeWord && !e.target.closest('#wordPopup, #storyDisplay .w')) closePopup();
  });
  // Follow the word on scroll/resize (e.g. a phone keyboard opening for "add a translation");
  // close only once the word has left the screen.
  const follow = () => {
    const w = state.activeWord;
    if (!w) return;
    const r = w.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) closePopup();
    else placePopup($('wordPopup'), w);
  };
  window.addEventListener('scroll', follow, { passive: true });
  window.addEventListener('resize', follow);

  $('audioPlay').addEventListener('click', () => (state.playing ? stop() : play()));
  $('audioPrev').addEventListener('click', () => step(-1));
  $('audioNext').addEventListener('click', () => step(1));
  $('audioSpeed').addEventListener('click', () => {
    state.speed = SPEEDS[(SPEEDS.indexOf(state.speed) + 1) % SPEEDS.length] || 0.8;
    safeSet('readerSpeed', String(state.speed));
    if (state.playing) speakSentence(state.current); // apply right away
    else updateAudioUi();
  });

  // Mobile: the words list is a bottom sheet opened from the audio bar.
  const sheet = $('wordsPanel');
  const setSheet = (open) => {
    sheet.classList.toggle('open', open);
    $('wordsOpen').setAttribute('aria-expanded', String(open));
  };
  $('wordsOpen').addEventListener('click', () => setSheet(!sheet.classList.contains('open')));
  $('wordsClose').addEventListener('click', () => setSheet(false));
  // Tapping outside the open sheet closes it, like any bottom sheet.
  document.addEventListener('click', (e) => {
    if (sheet.classList.contains('open') && !e.target.closest('#wordsPanel, #wordsOpen, #wordPopup, dialog')) setSheet(false);
  });

  $('createDeckFromStoryTokens').addEventListener('click', () => {
    state.callbacks.onAddToDeck?.([...state.saved.values()]);
  });

  document.addEventListener('keydown', (e) => {
    if (!state.open || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') { closePopup(); setSheet(false); return; }
    if (e.target.closest('input, textarea, select, [contenteditable], .select-wrap') || document.querySelector('dialog[open]')) return;
    if (e.key === ' ' && !e.target.closest('.w, button')) { e.preventDefault(); state.playing ? stop() : play(); }
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });
}

// ---------- Public API ----------

/**
 * Show a story. data: { title, story, tokens:[{text, translation}] }
 * callbacks: { onTranslationAdded(word, translation), onAddToDeck(words) }
 */
export async function openReader(data, { learningLang, nativeLang, callbacks = {} }) {
  wire();
  stop();
  closePopup();
  Object.assign(state, {
    open: true, data, lang: learningLang, nativeLang, callbacks, current: 0, saved: new Map(), dict: {},
    meanings: new Map((data.tokens || []).filter((t) => t.translation).map((t) => [norm(t.text), t.translation])),
  });
  $('readerTitle').textContent = data.title || 'Story';
  render();
  renderWords();
  updateAudioUi();
  $('wordsPanel').classList.remove('open');

  const noVoice = window.speechSynthesis?.getVoices().length && !hasVoiceFor(learningLang);
  $('audioPlay').disabled = !window.speechSynthesis || noVoice;
  $('audioBar').classList.toggle('no-voice', !!noVoice);
  if (noVoice) $('audioStatus').textContent = `No ${langName(learningLang)} voice installed on this device`;

  const words = [...new Set([...document.querySelectorAll('#storyDisplay .w')].map((w) => w.dataset.key))];
  $('readerMeta').textContent = `${words.length} different words`;
  // Base forms ("kota" -> kot) and meanings for words the story's own list didn't cover.
  try {
    state.dict = await lookupWords(words, learningLang, nativeLang);
    if (state.data === data) refreshWordMarks();
  } catch { /* the story still reads fine without it */ }
}

export function closeReader() {
  state.open = false;
  stop();
  closePopup();
  $('wordsPanel')?.classList.remove('open');
}

/** Called after the deck was created, so the list starts fresh. */
export function clearSavedWords() {
  state.saved.clear();
  refreshWordMarks();
  renderWords();
}
