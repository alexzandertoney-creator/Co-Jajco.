// ============ HOME & PROFILE ============

import { getProfile, todayCount, streak, bestStreak, deckStats, displayName, dayKey, saveProfile, achievements } from './profile.js';
import { langName } from './constants.js';
import { isDue } from './utils.js';
import { speakText } from './tts.js';
import { mascot, patch } from './art.js';

const $ = (id) => document.getElementById(id);

// Time-of-day greeting in the language being learned, with its translation.
const GREETINGS = {
  pl: [['Dzień dobry', 'Good morning'], ['Dzień dobry', 'Good afternoon'], ['Dobry wieczór', 'Good evening']],
  es: [['Buenos días', 'Good morning'], ['Buenas tardes', 'Good afternoon'], ['Buenas noches', 'Good evening']],
  fr: [['Bonjour', 'Good morning'], ['Bonjour', 'Good afternoon'], ['Bonsoir', 'Good evening']],
  de: [['Guten Morgen', 'Good morning'], ['Guten Tag', 'Good afternoon'], ['Guten Abend', 'Good evening']],
  it: [['Buongiorno', 'Good morning'], ['Buon pomeriggio', 'Good afternoon'], ['Buonasera', 'Good evening']],
  jp: [['おはよう', 'Good morning'], ['こんにちは', 'Good afternoon'], ['こんばんは', 'Good evening']],
  en: [['Good morning', 'Good morning'], ['Good afternoon', 'Good afternoon'], ['Good evening', 'Good evening']],
};

function greeting(lang) {
  const h = new Date().getHours();
  return (GREETINGS[lang] || GREETINGS.en)[h < 12 ? 0 : h < 18 ? 1 : 2];
}

/** Profile name and avatar initial wherever they appear (sidebar chip, ranger card). */
export function renderIdentity(user) {
  const name = displayName(getProfile(), user?.email);
  document.querySelectorAll('[data-display-name]').forEach((el) => (el.textContent = name));
  document.querySelectorAll('[data-avatar]').forEach((el) => (el.textContent = name.charAt(0).toUpperCase()));
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------- Home ----------

/** ctx: { user, decks (filtered, incl. Master Vocab), onStudy(deckId), onNewDeck() } */
export function renderHome(ctx) {
  const { user, decks } = ctx;
  const own = decks.filter((d) => d.id !== 'master-vocab');
  const stats = deckStats(own);
  const profile = getProfile() || {};
  const name = displayName(profile, user?.email);
  const [hello, helloEn] = greeting(user?.learningLang);

  // Hero: one clear next step.
  $('heroMascot').innerHTML = mascot('wave');
  $('heroGreeting').textContent = `${hello}, ${name}!`;
  const translation = hello === helloEn ? '' : `${helloEn}. `;
  $('heroSub').textContent = translation + (stats.due
    ? `${plural(stats.due, 'word')} ${stats.due === 1 ? 'is' : 'are'} ready for review.`
    : own.length ? 'Nothing due for review. A good time to learn new words.' : 'Pick a starter deck or make your own to begin.');
  $('heroReview').hidden = !stats.due;
  $('heroReview').textContent = `Review ${plural(stats.due, 'word')}`;
  const cont = $('heroContinue');
  cont.textContent = own.length ? (stats.due ? 'Learn new words' : 'Continue studying') : 'Browse starter decks';
  cont.classList.toggle('primary-on-dark', !stats.due);
  cont.onclick = () => (own.length ? ctx.onStudy(lastDeckId(own)) : (window.location.href = '/library/starter'));

  renderTrail(profile);
  $('statLearned').textContent = stats.learned;
  $('statMastered').textContent = stats.mastered;
  $('statAccuracy').textContent = stats.accuracy == null ? '–' : `${stats.accuracy}%`;
  renderWordOfDay(own, user);
  renderNotebooks(own, ctx);
}

// The streak as a trail: the last 7 days as markers, today at the end.
function renderTrail(profile) {
  const s = streak();
  const goal = profile.dailyGoal || 20;
  const done = todayCount();
  $('statStreak').textContent = s;
  $('trailNote').textContent = done >= goal
    ? 'Today’s goal reached. See you tomorrow on the trail.'
    : done ? `${goal - done} more card${goal - done === 1 ? '' : 's'} to reach today’s goal.`
    : s ? 'Study today to keep your streak going.' : 'Answer a few cards to start a streak.';

  $('goalCount').textContent = done;
  $('goalOf').textContent = done >= goal ? 'goal met' : `of ${goal}`;
  $('goalArc').setAttribute('stroke-dasharray', `${Math.min(100, (done / goal) * 100)} 100`);
  document.querySelector('.goal').classList.toggle('goal-done', done >= goal);

  const trail = $('trail');
  trail.replaceChildren();
  const activity = profile.activity || {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const n = activity[dayKey(d)] || 0;
    const li = document.createElement('li');
    li.className = `trail-day${n ? ' done' : ''}${i === 0 ? ' today' : ''}`;
    const dot = document.createElement('span');
    dot.className = 'trail-dot';
    const label = document.createElement('span');
    label.className = 'trail-label';
    label.textContent = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' });
    li.append(dot, label);
    li.setAttribute('aria-label', `${i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'long' })}: ${n ? plural(n, 'card') : 'no study'}`);
    trail.appendChild(li);
  }
}

// Same word all day, a new one tomorrow.
function renderWordOfDay(decks, user) {
  const cards = decks.flatMap((d) => d.cards || []);
  const box = $('wordOfDay');
  box.hidden = !cards.length;
  if (!cards.length) return;
  const seed = [...dayKey()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const card = cards[seed % cards.length];
  $('wotdWord').textContent = card.answer;
  $('wotdMeaning').textContent = card.question;
  $('wotdNote').textContent = card.note || '';
  $('wotdNote').hidden = !card.note;
  $('wotdSpeak').onclick = () => speakText(card.answer, user?.learningLang);
}

const LAST_DECK = 'lastDeckId';
export const rememberDeck = (id) => { try { localStorage.setItem(LAST_DECK, String(id)); } catch { /* storage blocked */ } };
function lastDeckId(decks) {
  let id = null;
  try { id = localStorage.getItem(LAST_DECK); } catch { /* storage blocked */ }
  return decks.find((d) => String(d.id) === id)?.id ?? decks[0]?.id ?? null;
}

// Decks as field notebooks: coloured cover, spine, strap, paper label.
function renderNotebooks(decks, ctx) {
  const grid = $('deckTiles');
  grid.replaceChildren();
  decks.forEach((deck, i) => {
    const cards = deck.cards || [];
    const learned = cards.filter((c) => c.srs?.reps > 0).length;
    const due = cards.filter((c) => isDue(c)).length;
    const pct = cards.length ? Math.round((learned / cards.length) * 100) : 0;

    const book = document.createElement('button');
    book.type = 'button';
    book.className = `notebook cover-${i % 5}`;
    book.setAttribute('aria-label', `${deck.name}: ${plural(cards.length, 'card')}, ${pct}% learned${due ? `, ${due} due` : ''}. Study this deck.`);

    const label = document.createElement('span');
    label.className = 'notebook-label';
    const title = document.createElement('strong');
    title.textContent = deck.name;
    const meta = document.createElement('span');
    meta.textContent = plural(cards.length, 'card');
    label.append(title, meta);

    const foot = document.createElement('span');
    foot.className = 'notebook-foot';
    const bar = document.createElement('span');
    bar.className = 'notebook-bar';
    const fill = document.createElement('span');
    fill.style.width = `${pct}%`;
    bar.appendChild(fill);
    const pctText = document.createElement('span');
    pctText.textContent = cards.length ? `${pct}% learned` : 'No cards yet';
    foot.append(bar, pctText);

    book.append(label, foot);
    if (due) {
      const stamp = document.createElement('span');
      stamp.className = 'notebook-due';
      stamp.textContent = `${due} due`;
      book.appendChild(stamp);
    }
    book.addEventListener('click', () => ctx.onStudy(deck.id));
    grid.appendChild(book);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'notebook notebook-add';
  add.innerHTML = '<span class="plus" aria-hidden="true">+</span><strong>New notebook</strong><span>Make your own deck or import one from AI</span>';
  add.addEventListener('click', ctx.onNewDeck);
  grid.appendChild(add);
}

// ---------- Profile ----------

/** ctx: { user, decks } */
export function renderProfile(ctx) {
  const { user, decks } = ctx;
  const profile = getProfile() || {};
  const stats = deckStats(decks);
  renderIdentity(user);
  $('profileEmail').textContent = user?.email || profile.email || '';
  $('profileLangs').textContent = `Learning ${langName(user?.learningLang)} · speaks ${langName(user?.nativeLang)}`;

  $('pStreak').textContent = plural(streak(), 'day');
  $('pBest').textContent = plural(Math.max(bestStreak(), streak()), 'day');
  $('pLearned').textContent = stats.learned;
  $('pMastered').textContent = stats.mastered;
  $('pAccuracy').textContent = stats.accuracy == null ? '–' : `${stats.accuracy}%`;

  renderPatches(stats, profile.activity || {});
  renderHeatmap(profile.activity || {});

  $('profileDisplayName').value = profile.displayName || '';
  $('profileGoal').value = String(profile.dailyGoal || 20);
  $('profileNative').value = user?.nativeLang || 'en';
}

function renderPatches(stats, activity) {
  const list = $('patches');
  list.replaceChildren();
  const all = achievements(stats, activity);
  all.forEach((a) => {
    const li = document.createElement('li');
    li.className = `patch-item${a.earned ? ' earned' : ''}`;
    li.innerHTML = patch(a.icon, a.tone, !a.earned);
    const name = document.createElement('strong');
    name.textContent = a.name;
    const desc = document.createElement('span');
    desc.textContent = a.earned ? a.desc : `${a.desc} · ${Math.min(a.value, a.goal)}/${a.goal}`;
    li.append(name, desc);
    li.setAttribute('aria-label', `${a.name}: ${a.desc}. ${a.earned ? 'Earned' : `${Math.min(a.value, a.goal)} of ${a.goal}`}`);
    list.appendChild(li);
  });
  const earned = all.filter((a) => a.earned).length;
  $('patchCount').textContent = `${earned} of ${all.length} earned`;
}

// About nine months of answers, one square per day (like a contributions graph).
function renderHeatmap(activity) {
  const box = $('heatmap');
  box.replaceChildren();
  const weeks = 38;
  const start = new Date();
  start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);
  let activeDays = 0, total = 0;
  for (let w = 0; w < weeks; w++) {
    const col = document.createElement('div');
    col.className = 'heat-col';
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      const cell = document.createElement('i');
      if (day > new Date()) { cell.className = 'future'; col.appendChild(cell); continue; }
      const n = activity[dayKey(day)] || 0;
      if (n) { activeDays++; total += n; }
      cell.className = `l${n === 0 ? 0 : n < 10 ? 1 : n < 20 ? 2 : n < 40 ? 3 : 4}`;
      cell.title = `${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${plural(n, 'card')}`;
      col.appendChild(cell);
    }
    box.appendChild(col);
  }
  box.setAttribute('aria-label', `${activeDays} active days and ${total} cards in the last ${weeks} weeks`);
  $('heatmapCaption').textContent = `${plural(total, 'card')} on ${plural(activeDays, 'day')}`;
  // On narrow screens the grid scrolls; start at the most recent weeks.
  requestAnimationFrame(() => { box.scrollLeft = box.scrollWidth; });
}

/** Wires the profile form once. onSaved(changes) lets the app react to a new native language. */
export function setupProfileForm(onSaved) {
  $('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('profileSave');
    const changes = {
      displayName: $('profileDisplayName').value.trim(),
      dailyGoal: Number($('profileGoal').value),
      nativeLang: $('profileNative').value,
    };
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      await saveProfile(changes);
      toast('Profile saved.', 'success');
      onSaved?.(changes);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save changes';
    }
  });
}

/**
 * A daily study reminder as a calendar file (.ics): works with Google, Apple and
 * Outlook calendars without any email/push service.
 */
export function downloadReminder(time, user) {
  const [h, m] = (time || '19:00').split(':').map(Number);
  const start = new Date();
  start.setHours(h, m, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  const local = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const goal = getProfile()?.dailyGoal || 20;
  const lang = langName(user?.learningLang);
  const url = `${location.origin}/`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Co Jajco//Reminder//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:cojajco-daily-${Date.now()}@cojajco`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
    `DTSTART:${local(start)}`,
    'DURATION:PT15M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${lang} practice · Co? Jajco.`,
    `DESCRIPTION:Your daily goal: ${goal} cards. Open ${url}`,
    `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:Time for ${lang}!`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'co-jajco-daily-reminder.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
