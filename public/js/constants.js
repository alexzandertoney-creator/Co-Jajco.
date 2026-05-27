// ============ CONSTANTS & CONFIGURATIONS ============

// Language-to-voice mapping for TTS
export const langMap = {
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  pl: 'pl-PL',
  de: 'de-DE',
  it: 'it-IT',
  ja: 'ja-JP',
  zh: 'zh-CN'
};

// Available language options
export const LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pl', name: 'Polish' },
  { code: 'jp', name: 'Japanese' },
  { code: 'en', name: 'English' }
];

// Language levels for story generation
export const LANGUAGE_LEVELS = ['PreA1', 'A1', 'A2', 'B1', 'B2'];

// Study modes
export const MODES = {
  FLASHCARDS: 'flashcards',
  LEARN: 'learn',
  TEST: 'test',
  MATCH: 'match',
  DECK_EDITOR: 'deckEditor',
  STORY_ANALYZER: 'storyAnalyzer',
  PUBLIC_LIBRARY: 'publicLibrary'
};

// Keyboard contexts
export const KEYBOARD_CONTEXTS = {
  FLASHCARDS: 'flashcards',
  REVIEW: 'review',
  DISABLED: 'disabled'
};

// TTS speak modes
export const SPEAK_MODES = {
  OFF: 'off',
  LEARNING: 'learning',
  NATIVE: 'native',
  BOTH: 'both'
};

// Match game constants
export const MATCH_GAME = {
  CARDS_COUNT: 10,
  INITIAL_TIME: 60,
  UPDATE_INTERVAL: 1000
};
