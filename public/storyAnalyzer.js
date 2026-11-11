// --------------------
// Story Analyzer Module
// --------------------
let topWordsMap = new Map();
/**
 * Load top Spanish words from JSON
 */
export async function loadTopWords(learningLang) {
  // The only word list shipped is Spanish; other languages have nothing to load.
  if (learningLang !== "es") return;
  try {
    const res = await fetch("/vocab/spanish_words.json");
    const data = await res.json();
    topWordsMap = new Map();
    // The file is a flat list of { question, answer, type }; older builds grouped it by level.
    const add = (card, level) => topWordsMap.set(String(card.question).toLowerCase(), { translation: card.answer, level });
    data.forEach(item => (Array.isArray(item.cards) ? item.cards.forEach(c => add(c, item.category)) : add(item, item.level)));
  } catch (err) {
    console.error("Failed to load top words:", err);
  }
}
/**
 * Check if a word is in the top words list
 */
export function isTopWord(word) {
  return topWordsMap.has(word.toLowerCase());
}

/**
 * Get translation from top words list
 */
export function getTopWordData(word) {
  return topWordsMap.get(word.toLowerCase()) || null;
}

export function getTopWordTranslation(word) {
  return getTopWordData(word)?.translation || null;
}

export function getTopWordLevel(word) {
  return getTopWordData(word)?.level || null;
}

/**
 * Extract words from a story text
 */
export function extractStoryWords(text) {
  return [...new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, "") // remove punctuation, supports accents
      .split(/\s+/)
      .filter(w => w.length > 1) // ignore single letters
  )];
}

/**
 * Get unknown words from story
 * @param {string} storyText
 * @param {Set<string>} knownSet - words already studied
 */
export function getUnknownStoryWords(storyText, knownSet, options = {}) {
  const { ignoreBasic = false, userLevel = "A1" } = options;

  const levelOrder = ["PreA1", "A1", "A2", "B1", "B2"];

  const storyWords = extractStoryWords(storyText);

  return storyWords.filter(w => {
    if (knownSet.has(w)) return false;

    const wordData = getTopWordData(w);

    if (!wordData) return true;

    // 🚀 Ignore A1 / PreA1
    if (ignoreBasic) {
      if (wordData.level === "A1" || wordData.level === "PreA1") {
        return false;
      }
    }

    // 🚀 Level-based filtering
    if (
      levelOrder.indexOf(wordData.level) <
      levelOrder.indexOf(userLevel)
    ) {
      return false;
    }

    return true;
  });
}