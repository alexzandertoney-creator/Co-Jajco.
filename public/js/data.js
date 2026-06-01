// ============ DATA MANAGEMENT ============

import { buildMasterVocab } from './utils.js';

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
    
    // Load user's decks after user is loaded
    await loadDecks();
    
    return user;
  } catch (error) {
    console.error('Failed to load user:', error);
    localStorage.removeItem('token');
    window.location.href = 'login.html';
    return;
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
 * Create new deck (async)
 */
export async function createDeck(name, learningLang, nativeLang) {
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
        cards: []
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
export async function addCardToDeck(deckId, question, answer) {
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
      console.error('Failed to update deck:', res.status);
      // Remove the card we just added
      deck.cards.pop();
      return false;
    }

    const updated = await res.json();
    deck.cards = updated.cards || [];
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

  try {
    // Remove card from local deck first
    const removedCard = deck.cards.splice(cardIndex, 1);

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
    deck.cards = updated.cards || [];
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
export async function updateCard(deckId, cardIndex, question, answer) {
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

  try {
    // Update local deck first
    const oldCard = { ...deck.cards[cardIndex] };
    deck.cards[cardIndex].question = question;
    deck.cards[cardIndex].answer = answer;

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
      deck.cards[cardIndex] = oldCard;
      return false;
    }

    const updated = await res.json();
    deck.cards = updated.cards || [];
    console.log('Card updated in deck:', deckId);
    return true;
  } catch (error) {
    console.error('Failed to update card:', error);
    // Restore old card
    deck.cards[cardIndex] = oldCard;
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

  try {
    // Update local card first
    if (!deck.cards[cardIndex].stats) {
      deck.cards[cardIndex].stats = { correct: 0, incorrect: 0 };
    }

    if (correct) {
      deck.cards[cardIndex].stats.correct++;
    } else {
      deck.cards[cardIndex].stats.incorrect++;
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
      console.error('Failed to update stats:', res.status);
      // Revert the stat change
      if (correct) {
        deck.cards[cardIndex].stats.correct--;
      } else {
        deck.cards[cardIndex].stats.incorrect--;
      }
      return false;
    }

    const updated = await res.json();
    deck.cards = updated.cards || [];
    return true;
  } catch (error) {
    console.error('Failed to update card stats:', error);
    // Revert the stat change
    if (correct) {
      deck.cards[cardIndex].stats.correct--;
    } else {
      deck.cards[cardIndex].stats.incorrect--;
    }
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
