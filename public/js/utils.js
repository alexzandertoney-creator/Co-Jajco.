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
