// ============ UTILITY FUNCTIONS ============

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build master vocabulary from all decks with specific language pair
 */
export function buildMasterVocab(decks, learningLang, nativeLang) {
  const seen = new Set();
  const words = [];

  decks
    .filter(d => d.learningLang === learningLang && d.nativeLang === nativeLang)
    .forEach(deck => {
      deck.cards.forEach(card => {
        const key = `${card.question}|${card.answer}`;
        if (!seen.has(key)) {
          seen.add(key);
          words.push(card);
        }
      });
    });

  return words;
}

/**
 * Safely get token translation or return empty string
 */
export function getTokenTranslation(tokenMap, word) {
  return tokenMap.get(word.toLowerCase()) || '';
}

/**
 * Get all sentences from text
 */
export function getSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g) || [text];
}

/**
 * Format deck name for display
 */
export function formatDeckName(name, isSpecial = false) {
  return isSpecial ? name : name;
}

/**
 * Validate deck has required fields
 */
export function isValidDeck(deck) {
  return deck && 
         deck.id && 
         deck.name && 
         Array.isArray(deck.cards) &&
         typeof deck.learningLang === 'string' &&
         typeof deck.nativeLang === 'string';
}

/**
 * Validate card has required fields
 */
export function isValidCard(card) {
  return card &&
         typeof card.question === 'string' &&
         typeof card.answer === 'string';
}

/**
 * Escape text for safe use inside innerHTML templates.
 * Deck names, cards and stories come from users, AI output and the public library.
 */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// ---------- Answer grading ----------

const stripMarks = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l').replace(/Ł/g, 'L');
const clean = (s) => String(s ?? '')
  .normalize('NFC')
  .toLowerCase()
  .replace(/[.,!?¿¡;:"'“”‘’()\[\]…-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/**
 * Grade a typed answer the way a patient teacher would.
 * - Case, punctuation and extra spaces never matter.
 * - "hello / hi" accepts either alternative ("/" or ";" separate them).
 * - Missing accents (dziekuje → dziękuję) or one typo in a longer word: right, with a note.
 * Returns { result: 'correct' | 'almost' | 'wrong', expected } where expected is the matched alternative.
 */
export function gradeAnswer(input, expected) {
  const given = clean(input);
  const alternatives = String(expected ?? '').split(/[\/;]/).map((a) => a.trim()).filter(Boolean);
  if (!given) return { result: 'wrong', expected: alternatives[0] || '' };

  for (const alt of alternatives) if (clean(alt) === given) return { result: 'correct', expected: alt };
  for (const alt of alternatives) {
    const want = clean(alt);
    if (stripMarks(want) === stripMarks(given)) return { result: 'almost', expected: alt };
    if (want.length >= 5 && editDistance(stripMarks(want), stripMarks(given)) === 1) return { result: 'almost', expected: alt };
  }
  return { result: 'wrong', expected: alternatives[0] || '' };
}

// ---------- Spaced repetition ----------
// Simplified SM-2 (the algorithm behind classic Anki). Each card carries
// srs = { reps, interval (days), ease, due (ms timestamp) }.
// Right answers push the next review further out (1 day, 3 days, then ×ease);
// a miss resets the card so it comes back today.

const DAY = 86400000;

export function scheduleCard(card, correct, now = Date.now()) {
  const srs = { reps: 0, interval: 0, ease: 2.5, ...(card.srs || {}) };
  if (correct) {
    srs.reps += 1;
    srs.interval = srs.reps === 1 ? 1 : srs.reps === 2 ? 3 : Math.round(srs.interval * srs.ease);
    srs.ease = Math.min(3, srs.ease + 0.1);
  } else {
    srs.reps = 0;
    srs.interval = 0;
    srs.ease = Math.max(1.3, srs.ease - 0.2);
  }
  // Due at the start of the target day, so "due today" means any time today.
  const due = new Date(now + srs.interval * DAY);
  due.setHours(0, 0, 0, 0);
  srs.due = srs.interval === 0 ? now : due.getTime();
  card.srs = srs;
  card.lastReviewed = now;
  return srs;
}

// A card is due if it has been studied and its review date has arrived.
// Never-studied cards are "new", not due; the review queue mixes in a few per day.
export const isDue = (card, now = Date.now()) => !!card.srs && card.srs.due <= now;
export const isNew = (card) => !card.srs;
