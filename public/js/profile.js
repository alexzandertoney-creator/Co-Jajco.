// ============ PROFILE & ACTIVITY ============
// Shared by the main app and the Review page: profile data, daily activity
// (for streaks, the daily goal and the heatmap) and learning stats.

import { isDue } from './utils.js';

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

let profile = null;
const listeners = new Set();
export const onProfileChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn(profile));
export const getProfile = () => profile;

// Local calendar date, so "today" matches the learner's clock, not UTC.
export const dayKey = (d = new Date()) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD

export async function loadProfile() {
  try {
    const res = await fetch('/api/auth/me/profile', { headers: authHeaders() });
    if (!res.ok) throw new Error(res.status);
    profile = await res.json();
  } catch (e) {
    // Profile extras are optional: the app keeps working without them.
    console.warn('Profile unavailable:', e);
    profile = profile || { activity: {}, dailyGoal: 20 };
  }
  profile.activity ||= {};
  profile.dailyGoal ||= 20;
  emit();
  return profile;
}

export async function saveProfile(changes) {
  const res = await fetch('/api/auth/me/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(changes),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not save your profile.');
  profile = { ...profile, ...data, activity: data.activity || profile?.activity || {} };
  emit();
  return profile;
}

// Answers are counted locally right away and sent in small batches.
let pending = 0;
let flushTimer = null;
export function recordAnswer() {
  if (!profile) profile = { activity: {}, dailyGoal: 20 };
  const today = dayKey();
  profile.activity[today] = (profile.activity[today] || 0) + 1;
  pending++;
  emit();
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 1500);
}
async function flush() {
  if (!pending) return;
  const count = pending;
  pending = 0;
  try {
    const res = await fetch('/api/auth/me/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ date: dayKey(), count }),
      keepalive: true, // still sends if the page is closing
    });
    if (!res.ok) throw new Error(res.status);
  } catch {
    pending += count; // try again with the next answer
  }
}
globalThis.window?.addEventListener('pagehide', flush);

export const todayCount = () => profile?.activity?.[dayKey()] || 0;

// Consecutive days with at least one answer, ending today (or yesterday, so a
// streak isn't shown as broken before you've studied today).
export function streak(activity = profile?.activity || {}) {
  const d = new Date();
  if (!activity[dayKey(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (activity[dayKey(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// Learning stats across the given decks (Master Vocab excluded: it repeats other decks' cards).
export function deckStats(decks) {
  const cards = decks.filter((d) => d.id !== 'master-vocab').flatMap((d) => d.cards || []);
  let right = 0, missed = 0;
  cards.forEach((c) => { right += c.stats?.correct || 0; missed += c.stats?.incorrect || 0; });
  return {
    total: cards.length,
    learned: cards.filter((c) => c.srs?.reps > 0).length,
    mastered: cards.filter((c) => c.srs?.interval >= 21).length, // remembered 3+ weeks out
    due: cards.filter((c) => isDue(c)).length,
    accuracy: right + missed ? Math.round((right / (right + missed)) * 100) : null,
  };
}

export const displayName = (p = profile, email = '') =>
  p?.displayName || (p?.email || email).split('@')[0].replace(/^./, (c) => c.toUpperCase()) || 'there';

// Longest run of consecutive active days in the activity map.
export function bestStreak(activity = profile?.activity || {}) {
  const days = Object.keys(activity).filter((k) => activity[k] > 0).sort();
  let best = 0, run = 0, prev = null;
  for (const k of days) {
    const d = new Date(`${k}T12:00:00`);
    run = prev && Math.round((d - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

// Merit patches. value/goal drive both "earned" and the progress shown on locked ones.
export function achievements(stats, activity = profile?.activity || {}) {
  const best = Math.max(bestStreak(activity), streak(activity));
  return [
    { icon: 'sprout', tone: 'moss', name: 'First steps', desc: 'Learn your first word', value: stats.learned, goal: 1 },
    { icon: 'books', tone: 'bark', name: 'Bookworm', desc: 'Learn 25 words', value: stats.learned, goal: 25 },
    { icon: 'mountain', tone: 'pine', name: 'Trailblazer', desc: 'Learn 100 words', value: stats.learned, goal: 100 },
    { icon: 'flag', tone: 'sky', name: 'Summit', desc: 'Learn 500 words', value: stats.learned, goal: 500 },
    { icon: 'flame', tone: 'yolk', name: 'Week on the trail', desc: 'Study 7 days in a row', value: best, goal: 7 },
    { icon: 'campfire', tone: 'bark', name: 'Campfire regular', desc: 'Study 30 days in a row', value: best, goal: 30 },
    { icon: 'star', tone: 'yolk', name: 'First mastery', desc: 'Master your first word', value: stats.mastered, goal: 1 },
    { icon: 'pine', tone: 'pine', name: 'Old growth', desc: 'Master 50 words', value: stats.mastered, goal: 50 },
  ].map((a) => ({ ...a, earned: a.value >= a.goal }));
}
