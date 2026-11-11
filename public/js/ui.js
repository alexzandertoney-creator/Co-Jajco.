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
export const speakStoryBtn = document.getElementById('speakStoryBtn');
export const stopStoryBtn = document.getElementById('stopStoryBtn');
export const ignoreBasicWords = document.getElementById('ignoreBasicWords');
export const userLevelSelect = document.getElementById('userLevelSelect');
export const publishStoryBtn = document.getElementById('publishStoryBtn');

// Public Library
export const publicLibraryShowDecksBtn = document.getElementById('publicLibraryShowDecksBtn');
export const publicLibraryShowStoriesBtn = document.getElementById('publicLibraryShowStoriesBtn');
export const publicLibraryFilterLang = document.getElementById('publicLibraryFilterLang');
export const publicLibraryFilterLevel = document.getElementById('publicLibraryFilterLevel');
export const refreshPublicLibraryBtn = document.getElementById('refreshPublicLibraryBtn');
export const publicLibraryDeckList = document.getElementById('publicLibraryDeckList');
export const publicLibraryStoryList = document.getElementById('publicLibraryStoryList');
export const publicLibraryContainer = document.getElementById('publicLibraryContainer');
export const publishDeckBtn = document.getElementById('publishDeckBtn');

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
    mode === MODES.PUBLIC_LIBRARY ? 'publicLibraryContainer' :
    null;

  if (containerId) {
    document.getElementById(containerId).style.display = 'flex';
  }
  // Study sub-modes share one main-nav entry; body[data-group] drives which page chrome shows.
  const group = ['flashcards', 'learn', 'test', 'match'].includes(mode) ? 'study' : mode;
  document.body.dataset.group = group;
  document.querySelectorAll('.mode-selector button').forEach(b => {
    const active = b.dataset.group ? b.dataset.group === group : b.dataset.mode === mode;
    b.setAttribute('aria-current', active ? 'page' : 'false');
  });
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
export function showPopup(message, tone = 'info') {
  window.toast(message, tone);
}

/**
 * Clear input fields
 */
export function clearInputs(...inputs) {
  inputs.forEach(input => {
    if (input) input.value = '';
  });
}

/**
 * End-of-round screen shared by Learn and Test.
 * actions: [{ label, onClick, ghost }]
 */
export function renderResults(el, { correct, total, actions = [] }) {
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const message =
    pct === 100 ? 'Perfect round. Every answer right.' :
    pct >= 80 ? 'Great work. Nearly all of them.' :
    pct >= 50 ? 'Good progress. Another round will make these stick.' :
    'These are still new. Repetition is how they stick.';

  el.replaceChildren();
  const score = document.createElement('p');
  score.className = 'results-score';
  score.textContent = `${correct} / ${total}`;
  const title = document.createElement('h2');
  title.textContent = 'Round complete';
  const note = document.createElement('p');
  note.className = 'meta';
  note.textContent = message;
  const row = document.createElement('div');
  row.className = 'actions';
  actions.forEach(({ label, onClick, ghost }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (ghost) b.className = 'ghost';
    b.addEventListener('click', onClick);
    row.appendChild(b);
  });
  el.append(title, score, note, row);
  el.hidden = false;
  row.querySelector('button')?.focus({ preventScroll: true });
}

/**
 * Empty states for the Study section: no decks at all, or a deck with no cards.
 * The Study modes are hidden by CSS while body[data-empty] is set.
 */
export function renderDeckState(deck, deckCount) {
  const box = document.getElementById('deckEmpty');
  const empty = !deckCount ? 'none' : !deck?.cards?.length ? 'cards' : '';
  if (empty) document.body.dataset.empty = empty;
  else delete document.body.dataset.empty;
  if (!box) return;
  box.hidden = !empty;
  if (!empty) return;

  box.replaceChildren();
  const h = document.createElement('h2');
  const p = document.createElement('p');
  p.className = 'meta';
  const row = document.createElement('div');
  row.className = 'actions';
  const primary = document.createElement('button');
  primary.type = 'button';

  if (empty === 'none') {
    h.textContent = 'Start your first deck';
    p.textContent = 'Make your own deck, or add a ready-made starter deck for your level.';
    primary.textContent = 'Browse starter decks';
    primary.addEventListener('click', () => { window.location.href = 'recommended.html'; });
    const create = document.createElement('button');
    create.type = 'button';
    create.className = 'ghost';
    create.textContent = 'Create a deck';
    create.addEventListener('click', () => newDeckBtn?.click());
    row.append(primary, create);
  } else {
    h.textContent = `“${deck.name}” has no cards yet`;
    p.textContent = 'Add a few words to start practising.';
    primary.textContent = 'Add cards';
    primary.addEventListener('click', () => document.querySelector('[data-mode="deckEditor"]')?.click());
    row.append(primary);
  }
  box.append(h, p, row);
}
