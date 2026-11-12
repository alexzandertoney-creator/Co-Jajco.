// ============ REVIEW (spaced repetition) ============
// Shows the cards whose review date has arrived, plus a few new ones each session.
// "I knew it" schedules a card further out; "Not yet" brings it back later in
// this session and resets its schedule. See scheduleCard() in js/utils.js.

import { scheduleCard, isDue, isNew, shuffleArray } from './js/utils.js';
import { speakText } from './js/tts.js';
import { loadProfile, recordAnswer } from './js/profile.js';
import { renderIdentity } from './js/home.js';
import { mascot } from './js/art.js';
import { showCardGrammar } from './js/grammar.js';

const NEW_PER_SESSION = 10;
const ALL = 'all';

const $ = (id) => document.getElementById(id);
const cardEl = $('card');
const questionEl = $('question');
const answerEl = $('answer');
const noteEl = $('answerNote');
const progressEl = $('cardProgress');
const deckSelect = $('reviewDeckSelect');
const speakModeSelect = $('speakMode');

let user = null;
let decks = [];
let queue = [];        // [{ card, deck }]
let index = 0;
let frontIsQuestion = true; // question = meaning, answer = word being learned
let reviewedThisSession = 0;

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ---------- Loading ----------

async function loadUser() {
  if (!localStorage.getItem('token')) return (window.location.href = '/login'), null;
  try {
    const res = await fetch('/api/auth/me', { headers: authHeaders() });
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return null;
    }
    if (!res.ok) throw new Error(res.status);
    return res.json();
  } catch {
    toast('Can’t reach the server right now. Refresh to try again.', 'error');
    return null;
  }
}

async function init() {
  const profileReady = loadProfile();
  user = await loadUser();
  if (!user) return document.body.classList.remove('app-loading');
  await profileReady;
  renderIdentity(user);
  try {
    const res = await fetch('/api/library/decks', { headers: authHeaders() });
    if (!res.ok) throw new Error(res.status);
    decks = (await res.json()).filter(d => d.learningLang === user.learningLang && d.nativeLang === user.nativeLang);
  } catch {
    toast('Couldn’t load your decks. Refresh to try again.', 'error');
    document.body.classList.remove('app-loading');
    return;
  }

  const dueIn = (deck) => deck.cards.filter(c => isDue(c)).length;
  deckSelect.replaceChildren(new Option(`All decks`, ALL));
  decks.forEach(d => deckSelect.add(new Option(`${d.name}${dueIn(d) ? ` (${dueIn(d)} due)` : ''}`, String(d.id))));
  // "Review this deck" from Flashcards preselects that deck.
  const wanted = new URLSearchParams(location.search).get('deck');
  if (wanted && decks.some((d) => String(d.id) === wanted)) deckSelect.value = wanted;
  deckSelect.addEventListener('change', buildQueue);
  buildQueue();
}

function buildQueue() {
  const chosen = deckSelect.value === ALL ? decks : decks.filter(d => String(d.id) === deckSelect.value);
  const items = chosen.flatMap(deck => (deck.cards || []).map(card => ({ card, deck })));
  const due = items.filter(i => isDue(i.card)).sort((a, b) => a.card.srs.due - b.card.srs.due);
  const fresh = shuffleArray(items.filter(i => isNew(i.card))).slice(0, NEW_PER_SESSION);
  queue = [...due, ...fresh];
  index = 0;
  reviewedThisSession = 0;

  $('reviewSummary').textContent = queue.length
    ? `${due.length} due for review${fresh.length ? ` · ${fresh.length} new` : ''}`
    : 'Cards come back right before you’d forget them.';
  updateBadge();
  showCard();
  document.body.classList.remove('app-loading');
}

// ---------- Session ----------

function showCard() {
  const done = !queue.length;
  $('smartReviewContainer').style.display = done ? 'none' : 'flex';
  $('reviewDone').hidden = !done;
  if (done) return renderDone();

  const { card } = queue[index];
  cardEl.classList.add('no-transition');
  cardEl.classList.remove('flipped');
  requestAnimationFrame(() => {
    questionEl.textContent = frontIsQuestion ? card.question : card.answer;
    answerEl.textContent = frontIsQuestion ? card.answer : card.question;
    noteEl.textContent = card.note || '';
    noteEl.hidden = !card.note;
    showCardGrammar(cardEl, card, frontIsQuestion, user?.learningLang);
    requestAnimationFrame(() => cardEl.classList.remove('no-transition'));
    autoSpeak();
  });
  progressEl.textContent = `${index + 1} / ${queue.length}`;
}

function answer(correct) {
  if (!queue.length) return;
  const item = queue[index];
  const { card, deck } = item;
  if (!card.stats) card.stats = { correct: 0, incorrect: 0 };
  card.stats[correct ? 'correct' : 'incorrect']++;
  scheduleCard(card, correct);
  saveCard(deck, card);
  recordAnswer();
  reviewedThisSession++;

  queue.splice(index, 1);
  if (!correct) queue.push(item); // try it again before the session ends
  if (index >= queue.length) index = 0;
  updateBadge();
  showCard();
}

function renderDone() {
  $('reviewSummary').textContent = reviewedThisSession
    ? `Session complete · ${reviewedThisSession} review${reviewedThisSession === 1 ? '' : 's'}`
    : 'Cards come back right before you’d forget them.';
  const box = $('reviewDone');
  box.replaceChildren();
  const h = document.createElement('h2');
  const p = document.createElement('p');
  p.className = 'meta';
  const all = decks.flatMap(d => d.cards || []);

  if (!all.length) {
    h.textContent = 'Nothing to review yet';
    p.textContent = 'Add a deck and study it once. Cards then come back here when they’re due.';
  } else {
    h.textContent = reviewedThisSession ? 'All caught up!' : 'Nothing due right now';
    const next = Math.min(...all.filter(c => c.srs && c.srs.due > Date.now()).map(c => c.srs.due));
    p.textContent = Number.isFinite(next)
      ? `Next review ${whenText(next)}. Come back then and these words will stick.`
      : 'Study some cards and they’ll be scheduled here.';
  }
  const actions = document.createElement('div');
  actions.className = 'actions';
  const home = document.createElement('a');
  home.href = '/';
  home.className = 'button-link';
  home.textContent = 'Back to studying';
  actions.appendChild(home);
  const art = document.createElement('div');
  art.innerHTML = mascot(reviewedThisSession ? 'cheer' : 'rest');
  box.append(art.firstElementChild, h, p, actions);
}

function whenText(ts) {
  const days = Math.round((new Date(ts).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days <= 0) return 'later today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

// Saves just the answered card's progress (no whole-deck rewrite), one request at a time.
let saveChain = Promise.resolve();
function saveCard(deck, card) {
  saveChain = saveChain.then(async () => {
    try {
      const res = await fetch(`/api/library/decks/${deck.id}/card`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          match: { question: card.question, answer: card.answer },
          set: { stats: card.stats, srs: card.srs, lastReviewed: card.lastReviewed },
        }),
      });
      if (!res.ok) throw new Error(res.status);
    } catch {
      toast('Couldn’t save your progress. Check your connection.', 'error');
    }
  });
}

function updateBadge() {
  const badge = $('dueBadge');
  if (!badge) return;
  const n = decks.reduce((sum, d) => sum + (d.cards || []).filter(c => isDue(c)).length, 0);
  badge.textContent = n > 99 ? '99+' : String(n);
  badge.hidden = n === 0;
}

// ---------- Speech ----------

function speakSide(back) {
  const { card } = queue[index] || {};
  if (!card) return;
  // question = meaning (native language), answer = word being learned
  const showingQuestion = frontIsQuestion !== back;
  speakText(showingQuestion ? card.question : card.answer, showingQuestion ? user.nativeLang : user.learningLang);
}

function autoSpeak() {
  const mode = speakModeSelect.value;
  if (mode === 'off' || !queue.length) return;
  const flipped = cardEl.classList.contains('flipped');
  const showingQuestion = frontIsQuestion !== flipped;
  if (mode === 'both' || (mode === 'learning' && !showingQuestion) || (mode === 'native' && showingQuestion)) speakSide(flipped);
}

// ---------- Controls ----------

function flip() {
  cardEl.classList.toggle('flipped');
  setTimeout(autoSpeak, 50);
}
const step = (d) => {
  if (!queue.length) return;
  index = (index + d + queue.length) % queue.length;
  showCard();
};

$('correctBtn').addEventListener('click', () => answer(true));
$('incorrectBtn').addEventListener('click', () => answer(false));
$('next').addEventListener('click', () => step(1));
$('prev').addEventListener('click', () => step(-1));
$('swapSides').addEventListener('click', () => { frontIsQuestion = !frontIsQuestion; showCard(); });
$('speakFrontBtn').addEventListener('click', (e) => { e.stopPropagation(); speakSide(false); });
$('speakBackBtn').addEventListener('click', (e) => { e.stopPropagation(); speakSide(true); });
cardEl.addEventListener('click', (e) => { if (!e.target.closest('button')) flip(); });

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || !queue.length) return;
  if (e.target.closest('input, textarea, select, [contenteditable], .select-wrap') || document.querySelector('dialog[open]')) return;
  if (e.key === ' ') { e.preventDefault(); flip(); }
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
  else if (e.key === 'c' || e.key === '2') answer(true);
  else if (e.key === 'i' || e.key === '1') answer(false);
});

$('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
});

document.body.classList.add('study-mode');
init();
