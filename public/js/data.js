// ============ DATA MANAGEMENT ============

import { buildMasterVocab, scheduleCard } from './utils.js';

// Global state
export let decks = [];
export let filteredDecks = [];
export let currentUser = null;

/**
 * Set current user
 */
export function setCurrentUser(user) {
  currentUser = user;
  window.currentUser = user; // Keep global for legacy code
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Load user from server
 */
export async function loadUser() {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = '/login';
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return;
    }
    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const user = await res.json();
    setCurrentUser(user);
    console.log('Loaded user:', user);
    
    // Load user's decks after user is loaded
    await loadDecks();
    
    return user;
  } catch (error) {
    // Network/server trouble: keep the session, tell the user.
    console.error('Failed to load user:', error);
    window.toast?.('Can’t reach the server right now. Refresh to try again.', 'error');
    throw error;
  }
}

/**
 * Load user's decks from server
 */
export async function loadDecks() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.warn('No token available');
    return;
  }

  try {
    const res = await fetch('/api/library/decks', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.error('Failed to load decks:', res.status);
      decks = [];
      return;
    }

    decks = await res.json();
    console.log('Loaded decks from server:', decks);
    updateFilteredDecks();
  } catch (error) {
    console.error('Failed to load decks:', error);
    decks = [];
  }
}

/**
 * Save/sync decks to server (called after modifications)
 */
async function syncDecksToServer() {
  // This is called after each modification
  // Decks are already on the server, so we just refresh local state
  await loadDecks();
}

/**
 * Get decks filtered for current user's language pair
 */
export function getDecksForCurrentLanguage() {
  if (!currentUser) {
    console.warn('User not loaded yet');
    return [];
  }

  const learningLang = currentUser.learningLang;
  const nativeLang = currentUser.nativeLang;

  const filtered = decks.filter(
    d => d.learningLang === learningLang && d.nativeLang === nativeLang
  );

  const masterWords = buildMasterVocab(decks, learningLang, nativeLang);

  if (masterWords.length) {
    filtered.unshift({
      id: 'master-vocab',
      name: 'All my words',
      learningLang,
      nativeLang,
      cards: masterWords
    });
  }

  return filtered;
}

/**
 * Update filtered decks based on current user
 */
export function updateFilteredDecks() {
  filteredDecks = getDecksForCurrentLanguage();
}

/**
 * Create new deck (async)
 */
// cards: optional initial cards, saved in the same request (imports used to PUT once per card).
export async function createDeck(name, learningLang, nativeLang, cards = []) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No token available');
    return null;
  }

  try {
    const res = await fetch('/api/library/decks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name,
        learningLang,
        nativeLang,
        cards
      })
    });

    if (!res.ok) {
      console.error('Failed to create deck:', res.status);
      return null;
    }

    const newDeck = await res.json();
    decks.push(newDeck);
    updateFilteredDecks();
    console.log('Created deck:', newDeck);
    try {
      window.dispatchEvent(new CustomEvent('deckCreated', { detail: newDeck }));
    } catch (e) {
      // ignore if dispatch not available in environment
    }
    return newDeck;
  } catch (error) {
    console.error('Failed to create deck:', error);
    return null;
  }
}

/**
 * Delete deck by ID (async)
 */
export async function deleteDeck(deckId) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No token available');
    return false;
  }

  if (deckId === 'master-vocab') {
    console.warn('Cannot delete master vocab');
    return false;
  }

  try {
    const res = await fetch(`/api/library/decks/${deckId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.error('Failed to delete deck:', res.status);
      return false;
    }

    decks = decks.filter(d => d.id !== deckId);
    updateFilteredDecks();
    console.log('Deleted deck:', deckId);
    return true;
  } catch (error) {
    console.error('Failed to delete deck:', error);
    return false;
  }
}

/**
 * Add card to deck (async)
 */
export async function addCardToDeck(deckId, question, answer, note = '') {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No token available');
    return false;
  }

  const deck = decks.find(d => d.id == deckId);
  if (!deck) {
    console.error('Deck not found:', deckId);
    return false;
  }

  if (deckId === 'master-vocab') {
    console.warn('Cannot add to master vocab');
    return false;
  }

  try {
    // Add card to local deck first
    if (!deck.cards) deck.cards = [];
    deck.cards.push({
      question,
      answer,
      ...(note ? { note } : {}),
      stats: { correct: 0, incorrect: 0 }
    });

    // Update on server
    const res = await fetch(`/api/library/decks/${deckId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        cards: deck.cards
      })
    });

    if (!res.ok) {
  console.error(
    'Failed to update deck:',
    res.status,
    await res.text()
  );

  deck.cards.pop();
  return false;
}

    const updated = await res.json();
    syncCards(deck, updated.cards);
    console.log('Card added to deck:', deckId);
    return true;
  } catch (error) {
    console.error('Failed to add card:', error);
    // Remove the card we tried to add
    deck.cards.pop();
    return false;
  }
}

/**
 * Delete card from deck (async)
 */
export async function deleteCardFromDeck(deckId, cardIndex) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No token available');
    return false;
  }

  const deck = decks.find(d => d.id == deckId);
  if (!deck) {
    console.error('Deck not found:', deckId);
    return false;
  }

  if (deckId === 'master-vocab') {
    console.warn('Cannot delete from master vocab');
    return false;
  }

  if (!deck.cards || !deck.cards[cardIndex]) {
    console.error('Card not found at index:', cardIndex);
    return false;
  }

  // Declared outside try so the catch block can roll back.

  let removedCard = [];

  try {
    removedCard = deck.cards.splice(cardIndex, 1);

    // Update on server
    const res = await fetch(`/api/library/decks/${deckId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        cards: deck.cards
      })
    });

    if (!res.ok) {
      console.error('Failed to update deck:', res.status);
      // Restore the card
      deck.cards.splice(cardIndex, 0, removedCard[0]);
      return false;
    }

    const updated = await res.json();
    syncCards(deck, updated.cards);
    console.log('Card deleted from deck:', deckId);
    return true;
  } catch (error) {
    console.error('Failed to delete card:', error);
    // Restore the card
    if (removedCard && removedCard.length) {
      deck.cards.splice(cardIndex, 0, removedCard[0]);
    }
    return false;
  }
}

/**
 * Update card in deck (async)
 */
export async function updateCard(deckId, cardIndex, question, answer, note) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No token available');
    return false;
  }

  const deck = decks.find(d => d.id == deckId);
  if (!deck || !deck.cards || !deck.cards[cardIndex]) {
    console.error('Card not found');
    return false;
  }

  if (deckId === 'master-vocab') {
    console.warn('Cannot update master vocab');
    return false;
  }

  // Declared outside try so the catch block can roll back.
  const oldCard = { ...deck.cards[cardIndex] };
  try {
    // Update local deck first
    deck.cards[cardIndex].question = question;
    deck.cards[cardIndex].answer = answer;
    if (note !== undefined) {
      if (note) deck.cards[cardIndex].note = note;
      else delete deck.cards[cardIndex].note;
    }

    // Update on server
    const res = await fetch(`/api/library/decks/${deckId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        cards: deck.cards
      })
    });

    if (!res.ok) {
      console.error('Failed to update deck:', res.status);
      // Restore old card
      Object.assign(deck.cards[cardIndex], oldCard);
      return false;
    }

    const updated = await res.json();
    syncCards(deck, updated.cards);
    console.log('Card updated in deck:', deckId);
    return true;
  } catch (error) {
    console.error('Failed to update card:', error);
    // Restore old card
    Object.assign(deck.cards[cardIndex], oldCard);
    return false;
  }
}

/**
 * Update card stats (correct/incorrect) (async)
 */
export async function updateCardStats(deckId, cardIndex, correct) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No token available');
    return false;
  }

  const deck = decks.find(d => d.id == deckId);
  if (!deck || !deck.cards || !deck.cards[cardIndex]) {
    console.error('Card not found');
    return false;
  }

  const card = deck.cards[cardIndex];
  if (!card.stats) card.stats = { correct: 0, incorrect: 0 };
  const before = { stats: { ...card.stats }, srs: card.srs, lastReviewed: card.lastReviewed };
  // If the save fails, put the card back exactly as it was.
  const revert = () => Object.assign(card, before);

  try {
    if (correct) card.stats.correct++;
    else card.stats.incorrect++;
    // Every answer, in any mode, feeds the spaced-repetition schedule.
    scheduleCard(card, correct);
    window.dispatchEvent(new Event('reviewScheduleChanged'));

    // Save just this card's progress, so other cards' answers (other tab/device) aren't overwritten.
    const res = await fetch(`/api/library/decks/${deckId}/card`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        match: { question: card.question, answer: card.answer },
        set: { stats: card.stats, srs: card.srs, lastReviewed: card.lastReviewed },
      })
    });

    if (!res.ok) {
      console.error('Failed to update stats:', res.status);
      revert();
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to update card stats:', error);
    revert();
    return false;
  }
}

/**
 * Update stats for a card object directly (async)
 */
export async function updateCardStatsFromCard(card, correct, deckId) {
  if (!card) return false;

  // Find which deck this card belongs to
  if (!deckId) {
    // Try to find it
    const deck = decks.find(d => d.cards && d.cards.includes(card));
    if (!deck) {
      console.error('Could not find deck for card');
      return false;
    }
    deckId = deck.id;
  }

  const cardIndex = decks.find(d => d.id == deckId)?.cards?.indexOf(card);
  if (cardIndex === undefined || cardIndex === -1) {
    console.error('Could not find card index');
    return false;
  }

  return updateCardStats(deckId, cardIndex, correct);
}

/**
 * Get deck by index in filtered decks
 */
export function getDeck(deckIndex) {
  return filteredDecks[deckIndex] || null;
}

/**
 * Get card from deck
 */
export function getCard(deckIndex, cardIndex) {
  const deck = getDeck(deckIndex);
  if (!deck) return null;
  return deck.cards[cardIndex] || null;
}

/**
 * Check if deck is master vocab
 */
export function isMasterVocab(deckId) {
  return deckId === 'master-vocab';
}

/**
 * Apply the server's copy of a deck's cards while keeping the existing card objects,
 * so modes holding references (learn/match sessions, Master Vocab) stay in sync.
 */
function syncCards(deck, serverCards) {
  if (!Array.isArray(serverCards)) return;
  serverCards.forEach((c, i) => {
    if (deck.cards[i]) Object.assign(deck.cards[i], c);
    else deck.cards[i] = c;
  });
  deck.cards.length = serverCards.length;
}

/**
 * Replace all of a deck's cards in one save (used by "Swap sides of all cards").
 */
export async function setDeckCards(deckId, cards) {
  const deck = decks.find(d => d.id == deckId);
  if (!deck || deckId === 'master-vocab') return false;
  try {
    const res = await fetch(`/api/library/decks/${deckId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ cards })
    });
    if (!res.ok) return false;
    const updated = await res.json();
    syncCards(deck, updated.cards);
    return true;
  } catch (error) {
    console.error('Failed to save deck cards:', error);
    return false;
  }
}

// ---------- Shared dictionary ----------

const dictHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

/** { [normalizedWord]: { translation, lemma } } for the current language pair. */
export async function lookupWords(words, learningLang = currentUser?.learningLang, nativeLang = currentUser?.nativeLang) {
  const res = await fetch('/api/dictionary/lookup', {
    method: 'POST', headers: dictHeaders(), body: JSON.stringify({ learningLang, nativeLang, words }),
  });
  if (!res.ok) throw new Error(`Dictionary lookup failed: ${res.status}`);
  return res.json();
}

/** Best translation for one word, or null (editor suggestions). */
export async function suggestTranslation(word, learningLang = currentUser?.learningLang, nativeLang = currentUser?.nativeLang) {
  const q = new URLSearchParams({ learningLang, nativeLang, word });
  const res = await fetch(`/api/dictionary/suggest?${q}`, { headers: dictHeaders() });
  const data = res.ok ? await res.json() : {};
  return data.translation ? data : null;
}

/**
 * Adds word pairs to the shared dictionary, anonymously (word + translation only).
 * Fire-and-forget: a failure here must never block saving the user's own cards.
 */
export function contributeTranslations(pairs, learningLang = currentUser?.learningLang, nativeLang = currentUser?.nativeLang) {
  const clean = (pairs || []).filter((p) => p?.word && p?.translation);
  if (!clean.length || !learningLang || !nativeLang) return;
  fetch('/api/dictionary/contribute', {
    method: 'POST', headers: dictHeaders(), body: JSON.stringify({ learningLang, nativeLang, pairs: clean }),
  }).catch(() => { /* best effort */ });
}

/** Practice that counts toward today's goal without changing the review schedule (e.g. Match). */
export function recordPractice() {
  window.dispatchEvent(new Event('reviewScheduleChanged'));
}

/** Rename one of the user's decks. */
export async function renameDeck(deckId, name) {
  const deck = decks.find((d) => d.id == deckId);
  if (!deck || deckId === 'master-vocab') return false;
  try {
    const res = await fetch(`/api/library/decks/${deckId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return false;
    deck.name = name;
    return true;
  } catch {
    return false;
  }
}

/** Two-way dictionary search: [{ word, translation, lemma }] */
export async function searchDictionary(q, learningLang = currentUser?.learningLang, nativeLang = currentUser?.nativeLang) {
  const params = new URLSearchParams({ learningLang, nativeLang, q });
  const res = await fetch(`/api/dictionary/search?${params}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  return res.ok ? res.json() : [];
}
