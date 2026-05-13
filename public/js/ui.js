// ============ UI & DOM MANAGEMENT ============

import { MODES } from './constants.js';

// DOM Elements - Main
export const deckSelect = document.getElementById('deckSelect');
export const newDeckBtn = document.getElementById('newDeck');
export const logoutBtn = document.getElementById('logoutBtn');
export const languageSelect = document.getElementById('languageSelect');

// DOM Elements - Flashcards
export const card = document.getElementById('card');
export const questionEl = document.getElementById('question');
export const answerEl = document.getElementById('answer');
export const nextBtn = document.getElementById('next');
export const prevBtn = document.getElementById('prev');
export const swapSidesBtn = document.getElementById('swapSides');
export const speakFrontBtn = document.getElementById('speakFrontBtn');
export const speakBackBtn = document.getElementById('speakBackBtn');
export const correctBtn = document.getElementById('correctBtn');
export const incorrectBtn = document.getElementById('incorrectBtn');
export const flashShuffleToggle = document.getElementById('flashShuffleToggle');
export const studyModeToggle = document.getElementById('studyModeToggle');
export const speakModeSelect = document.getElementById('speakMode');
export const cardProgress = document.getElementById('cardProgress');

// DOM Elements - Learn Mode
export const learnQuestion = document.getElementById('learnQuestion');
export const learnAnswer = document.getElementById('learnAnswer');
export const submitLearn = document.getElementById('submitLearn');
export const learnFeedback = document.getElementById('learnFeedback');
export const shuffleToggle = document.getElementById('shuffleToggle');

// DOM Elements - Test Mode
export const testQuestion = document.getElementById('testQuestion');
export const testOptions = document.getElementById('testOptions');
export const testFeedback = document.getElementById('testFeedback');
export const testScore = document.getElementById('testScore');

// DOM Elements - Match Game
export const matchGrid = document.getElementById('matchGrid');
export const matchTimerEl = document.getElementById('matchTimer');
export const matchFeedback = document.getElementById('matchFeedback');

// DOM Elements - Deck Editor
export const cardList = document.getElementById('cardList');
export const editorQuestion = document.getElementById('editorQuestion');
export const editorAnswer = document.getElementById('editorAnswer');
export const editorAdd = document.getElementById('editorAdd');
export const deleteDeckBtn = document.getElementById('deleteDeckBtn');
export const deckPromptLevel = document.getElementById('deckPromptLevel');
export const deckPromptTopic = document.getElementById('deckPromptTopic');
export const deckPromptCount = document.getElementById('deckPromptCount');
export const generateDeckPromptBtn = document.getElementById('generateDeckPromptBtn');
export const copyDeckPromptBtn = document.getElementById('copyDeckPromptBtn');
export const deckPromptOutput = document.getElementById('deckPromptOutput');
export const deckImportJson = document.getElementById('deckImportJson');
export const importDeckJsonBtn = document.getElementById('importDeckJsonBtn');

// DOM Elements - Story Analyzer
export const storyInput = document.getElementById('storyInput');
export const analyzeStoryBtn = document.getElementById('analyzeStory');
export const storyDisplay = document.getElementById('storyDisplay');
export const unknownWordsList = document.getElementById('unknownWordsList');
export const createDeckFromStory = document.getElementById('createDeckFromStory');
export const speakStoryBtn = document.getElementById('speakStoryBtn');
export const stopStoryBtn = document.getElementById('stopStoryBtn');
export const ignoreBasicWords = document.getElementById('ignoreBasicWords');
export const userLevelSelect = document.getElementById('userLevelSelect');

// Prompt generator
export const promptLevel = document.getElementById('promptLevel');
export const promptLength = document.getElementById('promptLength');
export const promptTopic = document.getElementById('promptTopic');
export const generatePromptBtn = document.getElementById('generatePromptBtn');
export const generateFromTextBtn = document.getElementById('generateFromTextBtn');
export const copyPromptBtn = document.getElementById('copyPromptBtn');
export const promptOutput = document.getElementById('promptOutput');

/**
 * Render mode - show/hide containers
 */
export function renderMode(mode) {
  document.querySelectorAll('.mode-container').forEach(c => c.style.display = 'none');

  const containerId =
    mode === MODES.FLASHCARDS ? 'flashcardContainer' :
    mode === MODES.LEARN ? 'learnContainer' :
    mode === MODES.TEST ? 'testContainer' :
    mode === MODES.MATCH ? 'matchContainer' :
    mode === MODES.DECK_EDITOR ? 'deckEditorContainer' :
    mode === MODES.STORY_ANALYZER ? 'storyAnalyzerContainer' :
    null;

  if (containerId) {
    document.getElementById(containerId).style.display = 'block';
  }
}

/**
 * Update study mode styling
 */
export function updateStudyControls(studyMode) {
  document.body.classList.toggle('study-mode', studyMode);
}

/**
 * Update deck select dropdown
 */
export function updateDeckSelect(filteredDecks) {
  deckSelect.innerHTML = '';
  filteredDecks.forEach((deck, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = deck.name;
    deckSelect.appendChild(opt);
  });

  if (filteredDecks.length > 0) {
    deckSelect.value = 0;
  }
}

/**
 * Show loading state
 */
export function showLoading(element, show = true) {
  if (show) {
    element.disabled = true;
    element.textContent = 'Loading...';
  } else {
    element.disabled = false;
  }
}

/**
 * Show popup message
 */
export function showPopup(message) {
  const popup = document.createElement('div');
  popup.className = 'popup';
  popup.textContent = message;
  popup.style.position = 'fixed';
  popup.style.top = '20px';
  popup.style.right = '20px';
  popup.style.background = '#333';
  popup.style.color = '#fff';
  popup.style.padding = '12px 16px';
  popup.style.borderRadius = '6px';
  popup.style.zIndex = '1001';
  
  document.body.appendChild(popup);
  
  setTimeout(() => popup.remove(), 3000);
}

/**
 * Clear input fields
 */
export function clearInputs(...inputs) {
  inputs.forEach(input => {
    if (input) input.value = '';
  });
}
