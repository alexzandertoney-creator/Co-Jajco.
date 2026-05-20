// ============ DATA MANAGEMENT ============

import { buildMasterVocab } from './utils.js';

// Global state
export let decks = JSON.parse(localStorage.getItem('decks')) || [];
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
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.error('Auth failed:', res.status);
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return;
    }

    const user = await res.json();
    setCurrentUser(user);
    console.log('Loaded user:', user);
    return user;
  } catch (error) {
    console.error('Failed to load user:', error);
    localStorage.removeItem('token');
    window.location.href = 'login.html';
    return;
  }
}

/**
 * Save decks to localStorage
 */
export function saveDecks() {
  localStorage.setItem('decks', JSON.stringify(decks));
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
      name: '📚 Master Vocab',
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
 * Create new deck
 */
export function createDeck(name, learningLang, nativeLang) {
  const newDeck = {
    id: Date.now(),
    name,
    learningLang,
    nativeLang,
    cards: []
  };

  decks.push(newDeck);
  saveDecks();
  updateFilteredDecks();

  return newDeck;
}

/**
 * Delete deck by ID
 */
export function deleteDeck(deckId) {
  decks = decks.filter(d => d.id !== deckId);
  saveDecks();
  updateFilteredDecks();
}

/**
 * Add card to deck
 */
export function addCardToDeck(deckId, question, answer) {
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return false;

  if (deck.id === 'master-vocab') return false;

  deck.cards.push({
    question,
    answer,
    stats: { correct: 0, incorrect: 0 }
  });

  saveDecks();
  return true;
}

/**
 * Delete card from deck
 */
export function deleteCardFromDeck(deckId, cardIndex) {
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return false;

  if (deck.id === 'master-vocab') return false;

  deck.cards.splice(cardIndex, 1);
  saveDecks();
  return true;
}

/**
 * Update card in deck
 */
export function updateCard(deckId, cardIndex, question, answer) {
  const deck = decks.find(d => d.id === deckId);
  if (!deck || !deck.cards[cardIndex]) return false;

  deck.cards[cardIndex].question = question;
  deck.cards[cardIndex].answer = answer;
  saveDecks();
  return true;
}

/**
 * Update card stats (correct/incorrect)
 */
export function updateCardStats(deckId, cardIndex, correct) {
  const deck = decks.find(d => d.id === deckId);
  if (!deck || !deck.cards[cardIndex]) return false;

  if (!deck.cards[cardIndex].stats) {
    deck.cards[cardIndex].stats = { correct: 0, incorrect: 0 };
  }

  if (correct) {
    deck.cards[cardIndex].stats.correct++;
  } else {
    deck.cards[cardIndex].stats.incorrect++;
  }

  saveDecks();
  return true;
}

/**
 * Update stats for a card object directly
 */
export function updateCardStatsFromCard(card, correct) {
  if (!card) return false;

  if (!card.stats) {
    card.stats = { correct: 0, incorrect: 0 };
  }

  if (correct) {
    card.stats.correct++;
  } else {
    card.stats.incorrect++;
  }

  saveDecks();
  return true;
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
