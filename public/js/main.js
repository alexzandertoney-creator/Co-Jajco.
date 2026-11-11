// ============ MAIN APPLICATION INITIALIZATION ============

import * as DataManager from './data.js';
import { isDue } from './utils.js';
import * as UI from './ui.js';
import { setKeyboardContext, setupKeyboardListener, handleFlashcardsKeys } from './keyboard.js';
import { initTTS, setSpeakMode, speakText } from './tts.js';
import { MODES, KEYBOARD_CONTEXTS, SPEAK_MODES } from './constants.js';
import { generateStoryPrompt, generateTextTokenizationPrompt, generateDeckCurationPrompt, parseStoryResponse, StoryTokenizer, renderInteractiveStory, renderSelectedTokens, createDeckFromTokens, StoryTTSPlayer, renderStoryTTSControls, attachStoryTTSKeyboardShortcuts } from '../storyPromptService.js';
import * as StoryAnalyzer from '../storyAnalyzer.js';
import * as PublicLibrary from './publicLibrary.js';

import flashcardsMode from './modes/flashcards.js';
import learnMode from './modes/learn.js';
import testMode from './modes/test.js';
import matchMode from './modes/match.js';
import deckEditor from './deckEditor.js';

// Global state
let currentMode = MODES.FLASHCARDS;
let currentDeckIndex = 0;

/**
 * Initialize the application
 */
async function initializeApp() {
  try {
    // Load user first
    await DataManager.loadUser();
    // Load top words for story analysis (used to mark common words)
    StoryAnalyzer.loadTopWords(DataManager.currentUser?.learningLang); // not awaited: don't block startup
    
    
    // Load decks for user
    DataManager.updateFilteredDecks();
    
    // Initialize UI
    UI.updateDeckSelect(DataManager.filteredDecks);
    UI.renderMode(currentMode);
    
    // Initialize TTS
    initTTS();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup keyboard with button callbacks
    const flashcardCallbacks = {
      correctBtn: UI.correctBtn,
      incorrectBtn: UI.incorrectBtn,
      nextBtn: UI.nextBtn,
      prevBtn: UI.prevBtn,
      toggleFlip: () => {
        flashcardsMode.toggleFlip();
        // Trigger TTS on flip
        const deck = DataManager.getDeck(currentDeckIndex);
        const currentCard = flashcardsMode.getCurrentCard(deck);
        if (currentCard && deck && DataManager.currentUser?.learningLang) {
          flashcardsMode.autoSpeak(currentCard, deck, DataManager.currentUser.learningLang);
        }
      }
    };
    
    const wrappedFlashcardHandler = (e) => handleFlashcardsKeys(e, flashcardCallbacks);
    
    // Use same callbacks for both FLASHCARDS and REVIEW (study mode) contexts
    setupKeyboardListener(
      wrappedFlashcardHandler,
      wrappedFlashcardHandler
    );
    
    // Set initial keyboard context for flashcards mode
    setKeyboardContext(KEYBOARD_CONTEXTS.FLASHCARDS);
    
    // Show first card if decks exist
    const firstDeck = DataManager.getDeck(0);
    refreshDecks(firstDeck?.id ?? null, { rerender: false });
    if (firstDeck) flashcardsMode.showCard(firstDeck, DataManager.currentUser.learningLang);

    // Decks created elsewhere (library import, story decks): add to the picker
    // but keep the user on the deck they're looking at.
    window.addEventListener('deckCreated', () => {
      refreshDecks(DataManager.getDeck(currentDeckIndex)?.id ?? null, { rerender: false });
    });

    // Deep link from other pages, e.g. index.html#deckEditor
    const hashMode = location.hash.slice(1);
    if (Object.values(MODES).includes(hashMode)) switchMode(hashMode);

    console.log('App initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Logout
  UI.logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });

  // Language switching lives in languageSync.js (shared by every page).

  // Deck selection
  UI.deckSelect?.addEventListener('change', (e) => {
    refreshDecks(DataManager.getDeck(Number(e.target.value))?.id ?? null);
  });

  // New deck
  UI.newDeckBtn?.addEventListener('click', async () => {
    const name = await promptDialog('New deck', { label: 'Deck name', placeholder: 'e.g. Kitchen words', confirmLabel: 'Create deck' });
    if (!name) return;

    const deck = await DataManager.createDeck(
      name,
      DataManager.currentUser.learningLang,
      DataManager.currentUser.nativeLang
    );

    if (!deck) return toast('Couldn’t create the deck. Try again.', 'error');
    refreshDecks(deck.id, { rerender: false });
    switchMode(MODES.DECK_EDITOR);
    toast(`Deck “${deck.name}” created. Add your first cards.`, 'success');
    UI.editorQuestion?.focus();
  });

  // Mode switching
  document.querySelectorAll('.mode-selector button')?.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode) switchMode(mode);
    });
  });

  // Flashcards mode
  setupFlashcardsListeners();

  // Learn mode
  setupLearnListeners();

  // Test mode
  setupTestListeners();

  // Deck editor
  setupDeckEditorListeners();

  // Study mode
  setupStudyModeListeners();

  // Story analyzer
  setupStoryAnalyzerListeners();

  // Public library
  PublicLibrary.initPublicLibrary();

  // Speak mode
  UI.speakModeSelect?.addEventListener('change', () => {
    setSpeakMode(UI.speakModeSelect.value);
  });

  // Recommended decks
  document.getElementById('recommendedDecksBtn')?.addEventListener('click', () => {
    window.location.href = 'recommended.html';
  });
}

/**
 * Setup flashcards listeners
 */
function setupFlashcardsListeners() {
  UI.nextBtn?.addEventListener('click', () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    flashcardsMode.nextCard(deck);
    flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
  });

  UI.prevBtn?.addEventListener('click', () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    flashcardsMode.prevCard(deck);
    flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
  });

  UI.swapSidesBtn?.addEventListener('click', () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    flashcardsMode.swapSides();
    flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
  });

  UI.card?.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;

    flashcardsMode.toggleFlip();

    const deck = DataManager.getDeck(currentDeckIndex);
    const currentCard = flashcardsMode.getCurrentCard(deck);
    if (currentCard) {
      flashcardsMode.autoSpeak(currentCard, deck, DataManager.currentUser.learningLang);
    }
  });

  UI.speakFrontBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const deck = DataManager.getDeck(currentDeckIndex);
    const currentCard = flashcardsMode.getCurrentCard(deck);
    if (currentCard) {
      flashcardsMode.speakVisible(currentCard, DataManager.currentUser.learningLang, DataManager.currentUser.nativeLang);
    }
  });

  UI.speakBackBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const deck = DataManager.getDeck(currentDeckIndex);
    const currentCard = flashcardsMode.getCurrentCard(deck);
    if (currentCard) {
      flashcardsMode.speakVisible(currentCard, DataManager.currentUser.learningLang, DataManager.currentUser.nativeLang);
    }
  });

  UI.flashShuffleToggle?.addEventListener('change', () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    flashcardsMode.setShuffleMode(deck, UI.flashShuffleToggle.checked);
    flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
  });

  UI.correctBtn?.addEventListener('click', async () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    if (flashcardsMode.studyMode) {
      const card = flashcardsMode.getCurrentCard(deck);
      if (!card) return;
      flashcardsMode.markCorrect();
      flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
      // Master Vocab holds the real cards from other decks; let data.js find the owner.
      DataManager.updateCardStatsFromCard(card, true, deck.id === 'master-vocab' ? undefined : deck.id);
    }
  });

  UI.incorrectBtn?.addEventListener('click', async () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    if (flashcardsMode.studyMode) {
      const card = flashcardsMode.getCurrentCard(deck);
      if (!card) return;
      flashcardsMode.markIncorrect();
      flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
      // Master Vocab holds the real cards from other decks; let data.js find the owner.
      DataManager.updateCardStatsFromCard(card, false, deck.id === 'master-vocab' ? undefined : deck.id);
    }
  });
}

/**
 * Setup learn mode listeners
 */
function setupLearnListeners() {
  // One form submit handles the button and the Enter key (they used to double-submit).
  document.getElementById('learnPanel')?.addEventListener('submit', (e) => {
    e.preventDefault();
    learnMode.submitAnswer();
  });
  document.getElementById('learnSkip')?.addEventListener('click', () => learnMode.skip());

  const restartLearn = () => learnMode.startSession(DataManager.getDeck(currentDeckIndex), UI.shuffleToggle.checked);
  document.getElementById('learnDirection')?.addEventListener('change', restartLearn);
  UI.shuffleToggle?.addEventListener('change', restartLearn);
}

/**
 * Setup test mode listeners
 */
function setupTestListeners() {
  // Tests are managed within testMode class
}

/**
 * Setup deck editor listeners
 */
function setupDeckEditorListeners() {
  document.getElementById('editorControls')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = UI.editorQuestion.value.trim();
    const a = UI.editorAnswer.value.trim();
    const noteInput = document.getElementById('editorNote');
    const note = noteInput?.value.trim() || '';
    if (!q || !a) return toast('Fill in both the word and its meaning.', 'error');
    const deck = DataManager.getDeck(currentDeckIndex);
    if (!deck || deck.id === 'master-vocab') return toast('Pick or create one of your own decks first.', 'error');

    const ok = await deckEditor.addCard(currentDeckIndex, q, a, DataManager.filteredDecks, note);
    if (!ok) return toast('Couldn’t save the card. Try again.', 'error');
    UI.editorQuestion.value = '';
    UI.editorAnswer.value = '';
    if (noteInput) noteInput.value = '';
    UI.editorAnswer.focus();
    refreshDecks(deck.id);
  });

  document.getElementById('swapAllSidesBtn')?.addEventListener('click', async () => {
    await deckEditor.swapAllSides(DataManager.getDeck(currentDeckIndex));
    refreshDecks(DataManager.getDeck(currentDeckIndex)?.id ?? null);
  });

  UI.deleteDeckBtn?.addEventListener('click', async () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    if (!deck || deck.id === 'master-vocab') return;

    await deckEditor.deleteDeck(deck.id, () => {
      refreshDecks(null);
      toast(`Deleted “${deck.name}”.`, 'success');
    });
  });

  UI.generateDeckPromptBtn?.addEventListener('click', () => {
    const level = UI.deckPromptLevel.value;
    const topic = UI.deckPromptTopic.value.trim() || 'daily life';
    const cardCount = UI.deckPromptCount.value;

    const prompt = generateDeckCurationPrompt({
      level,
      topic,
      cardCount,
      learningLang: DataManager.currentUser.learningLang,
      nativeLang: DataManager.currentUser.nativeLang
    });

    UI.deckPromptOutput.value = prompt;
  });

  UI.copyDeckPromptBtn?.addEventListener('click', () => {
    if (!UI.deckPromptOutput.value) return toast('Generate a prompt first.', 'error');
    copyToClipboard(UI.deckPromptOutput.value, 'Prompt copied. Paste it into your AI chat.');
  });

  UI.publishDeckBtn?.addEventListener('click', async () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    if (!deck || deck.id === 'master-vocab') return toast('Pick one of your own decks to publish. Master Vocab can’t be published.', 'error');
    const res = await formDialog('Publish to library', [
      { label: 'Level', options: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], value: UI.deckPromptLevel.value || 'A1' },
    ], { confirmLabel: 'Publish', message: `“${deck.name}” will be visible to everyone learning this language.` });
    if (!res) return;
    PublicLibrary.publishCurrentDeck(deck, res[0]);
  });

  UI.importDeckJsonBtn?.addEventListener('click', () => {
    const jsonText = UI.deckImportJson.value.trim();
    if (!jsonText) return toast('Paste deck JSON to import it.', 'error');

    const level = UI.deckPromptLevel.value;
    const topic = UI.deckPromptTopic.value.trim() || 'Custom deck';
    const deckName = `${topic} (${level})`;


    (async () => {
      const deck = await deckEditor.importDeckFromJson(
        jsonText,
        DataManager.currentUser.learningLang,
        DataManager.currentUser.nativeLang,
        deckName
      );

      if (!deck) {
        return toast('Invalid deck JSON. Make sure the AI returns an array of cards with question and answer fields.', 'error');
      }

      refreshDecks(deck.id);
      UI.deckImportJson.value = '';
      toast(`Imported “${deck.name}” with ${deck.cards?.length ?? 0} cards.`, 'success');
    })();
  });
}

/**
 * Setup study mode listeners
 */
function setupStudyModeListeners() {
  UI.studyModeToggle?.addEventListener('change', () => {
    if (UI.studyModeToggle.checked) {
      const deck = DataManager.getDeck(currentDeckIndex);
      flashcardsMode.startStudyMode(deck, true);
      setKeyboardContext(KEYBOARD_CONTEXTS.REVIEW);
    } else {
      flashcardsMode.endStudyMode();
      setKeyboardContext(KEYBOARD_CONTEXTS.FLASHCARDS);
    }

    UI.updateStudyControls(UI.studyModeToggle.checked);
    flashcardsMode.showCard(DataManager.getDeck(currentDeckIndex), DataManager.currentUser.learningLang);
  });
}

/**
 * Setup story analyzer listeners
 */
function setupStoryAnalyzerListeners() {
  const analyzeStoryBtn = document.getElementById('analyzeStory');
  const backToInputBtn = document.getElementById('backToInput');
  const storyInputMode = document.getElementById('storyInputMode');
  const storyReviewMode = document.getElementById('storyReviewMode');
  const publishStoryBtn = document.getElementById('publishStoryBtn');
  const generatePromptBtn = document.getElementById('generatePromptBtn');
  const generateFromTextBtn = document.getElementById('generateFromTextBtn');
  const copyPromptBtn = document.getElementById('copyPromptBtn');
  const clearStoryArchiveBtn = document.getElementById('clearStoryArchive');
  const storyArchiveList = document.getElementById('storyArchiveList');
  const storyArchiveEmpty = document.getElementById('storyArchiveEmpty');
  const createDeckFromStoryTokensBtn = document.getElementById('createDeckFromStoryTokens');
  const promptOutput = document.getElementById('promptOutput');
  const storyInput = document.getElementById('storyInput');
  let currentStoryData = null;

  const getStoryArchiveKey = () => {
    const user = DataManager.currentUser;
    if (!user) return 'storyArchive:guest';
    return `storyArchive:${user.id}:${user.learningLang}:${user.nativeLang}`;
  };

  const loadStoryArchive = () => {
    try {
      return JSON.parse(localStorage.getItem(getStoryArchiveKey()) || '[]');
    } catch {
      return [];
    }
  };

  const saveStoryArchive = (archive) => {
    localStorage.setItem(getStoryArchiveKey(), JSON.stringify(archive));
  };

  const renderStoryArchive = () => {
    const archive = loadStoryArchive();
    if (!storyArchiveList || !storyArchiveEmpty) return;

    storyArchiveList.innerHTML = '';

    if (archive.length === 0) {
      storyArchiveEmpty.style.display = 'block';
      return;
    }

    storyArchiveEmpty.style.display = 'none';

    archive.slice().reverse().forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'archive-item';

      const details = document.createElement('div');
      details.className = 'archive-details';

      const title = document.createElement('div');
      title.textContent = entry.title;
      title.className = 'archive-title';

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${new Date(entry.createdAt).toLocaleString()} · ${entry.tokens.length} tokens`;

      details.appendChild(title);
      details.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'archive-actions';

      const openBtn = document.createElement('button');
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', () => {
        openArchivedStory(entry);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'ghost';
      deleteBtn.addEventListener('click', () => {
        const filtered = loadStoryArchive().filter(item => item.id !== entry.id);
        saveStoryArchive(filtered);
        renderStoryArchive();
      });

      actions.appendChild(openBtn);
      actions.appendChild(deleteBtn);
      item.appendChild(details);
      item.appendChild(actions);
      storyArchiveList.appendChild(item);
    });
  };

  const archiveStory = (data) => {
    const archive = loadStoryArchive();
    const storyPreview = data.story ? data.story.slice(0, 70).replace(/\s+/g, ' ') : 'Saved story';
    const titlePart = data.title || storyPreview;
    const entry = {
      id: `story-${Date.now()}`,
      title: `${titlePart} ${new Date().toLocaleString()}${data.story && data.story.length > 70 && !data.title ? '…' : ''}`,
      story: data.story,
      tokens: data.tokens,
      createdAt: new Date().toISOString()
    };

    archive.push(entry);
    while (archive.length > 20) {
      archive.shift();
    }
    saveStoryArchive(archive);
    renderStoryArchive();
  };

  const openArchivedStory = (entry) => {
    if (!entry || !entry.story || !Array.isArray(entry.tokens)) return;
    const json = JSON.stringify({ story: entry.story, tokens: entry.tokens });
    storyInput.value = json;
    analyzeStoryData(json, false, false);
    showStoryReviewMode();
  };

  const showStoryInputMode = () => {
    if (storyInputMode && storyReviewMode) {
      storyInputMode.style.display = 'block';
      storyReviewMode.style.display = 'none';
    }
  };

  const showStoryReviewMode = () => {
    if (storyInputMode && storyReviewMode) {
      storyInputMode.style.display = 'none';
      storyReviewMode.style.display = 'block';
    }
  };

  const analyzeStoryData = (rawText, shouldArchive = true, shouldPublish = false) => {
    const data = parseStoryResponse(rawText);

    if (!data) {
      toast('Invalid JSON. Make sure you pasted the AI response correctly.', 'error');
      return null;
    }

    window.storyTokenizer = new StoryTokenizer(data.story, data.tokens);
    window.storyTTSPlayer = new StoryTTSPlayer(
      window.storyTokenizer,
      DataManager.currentUser.learningLang
    );

    let ttsContainer = document.getElementById('storyTTSContainer');
    if (!ttsContainer) {
      ttsContainer = document.createElement('div');
      ttsContainer.id = 'storyTTSContainer';
      document.querySelector('.story-review-container')?.appendChild(ttsContainer);
    } else {
      ttsContainer.innerHTML = ''; // Clear existing controls
    }

    let selectedContainer = document.getElementById('selectedTokens');
    if (selectedContainer) {
      selectedContainer.innerHTML = '';
    }

    const updateRightPanelFromSelection = () => {
      const listEl = document.getElementById('unknownWordsList');
      if (!listEl || !window.storyTokenizer) return;

      const selected = window.storyTokenizer.getSelectedTokens();
      listEl.innerHTML = '';

      if (selected.length === 0) {
        listEl.innerHTML = '<li class="empty-hint">Tap words in the story to collect them here.</li>';
        return;
      }

      selected.forEach(tok => {
        const li = document.createElement('li');

        const title = document.createElement('div');
        title.textContent = tok.text;
        title.className = 'word';

        const trans = document.createElement('div');
        trans.textContent = tok.translation || '';
        trans.className = 'meta';

        li.appendChild(title);
        li.appendChild(trans);
        li.addEventListener('click', () => {
          window.storyTokenizer.toggleToken(tok.text);
          renderSelectedTokens('#selectedTokens', window.storyTokenizer, updateRightPanelFromSelection);
          updateRightPanelFromSelection();
        });

        listEl.appendChild(li);
      });
    };

    const { updatePlayBtn, updateCurrentTokenDisplay } = renderStoryTTSControls('#storyTTSContainer', window.storyTTSPlayer);
    attachStoryTTSKeyboardShortcuts(window.storyTTSPlayer, updatePlayBtn);

    renderInteractiveStory('#storyDisplay', window.storyTokenizer, (token, translation) => {
      renderSelectedTokens('#selectedTokens', window.storyTokenizer, updateRightPanelFromSelection);
      updateRightPanelFromSelection();
    });

    renderSelectedTokens('#selectedTokens', window.storyTokenizer, updateRightPanelFromSelection);
    updateRightPanelFromSelection();
    if (shouldArchive) {
      archiveStory(data);
    }
    currentStoryData = {
      ...data,
      learningLang: DataManager.currentUser.learningLang,
      nativeLang: DataManager.currentUser.nativeLang
    };

    const autoLevel = document.getElementById('promptLevel')?.value || 'A1';
    if (shouldPublish) {
      const autoTitle = data.title ? `${data.title} ${new Date().toLocaleDateString()}` : undefined;
      PublicLibrary.publishCurrentStory(currentStoryData, autoLevel, autoTitle);
    }

    showStoryReviewMode();
    return data;
  };

  const analyzeCurrentStory = () => {
    const sourceText = storyInput.value.trim();
    if (!sourceText) {
      return toast('Please paste the tokenized story JSON into the text area first.', 'error');
    }

    analyzeStoryData(sourceText);
  };

  generatePromptBtn?.addEventListener('click', () => {
    const level = document.getElementById('promptLevel').value;
    const length = document.getElementById('promptLength').value;
    const topic = document.getElementById('promptTopic').value || 'daily life';

    const prompt = generateStoryPrompt({
      level,
      length,
      topic,
      learningLang: DataManager.currentUser.learningLang,
      nativeLang: DataManager.currentUser.nativeLang
    });

    promptOutput.value = prompt;
  });

  generateFromTextBtn?.addEventListener('click', () => {
    const storyInput = document.getElementById('storyInput');
    const rawText = storyInput.value.trim();

    if (!rawText) {
      toast('Paste a story in the Story Input field first!', 'error');
      return;
    }

    const level = document.getElementById('promptLevel').value;
    // Use the Level select to decide whether to simplify.
    // If user selected the "Original" option, keep the original text (no simplification).
    const simplify = level !== 'Original';

    const prompt = generateTextTokenizationPrompt({
      rawText,
      level,
      learningLang: DataManager.currentUser.learningLang,
      nativeLang: DataManager.currentUser.nativeLang,
      simplify
    });

    promptOutput.value = prompt;
    toast('Prompt generated! Copy it and paste the AI response back to analyze.', 'info');
  });

  copyPromptBtn?.addEventListener('click', () => {
    if (!promptOutput.value) return toast('Generate a prompt first.', 'error');
    copyToClipboard(promptOutput.value, 'Prompt copied. Paste it into your AI chat.');
  });

  analyzeStoryBtn?.addEventListener('click', analyzeCurrentStory);
  backToInputBtn?.addEventListener('click', showStoryInputMode);
  publishStoryBtn?.addEventListener('click', async () => {
    if (!currentStoryData) return toast('Open a story first, then publish it.', 'error');
    const level = document.getElementById('promptLevel')?.value || 'A1';
    const defaultTitle = currentStoryData?.title || '';
    const userTitle = await promptDialog('Publish story', { label: 'Title', value: defaultTitle, placeholder: 'e.g. Daily routine', confirmLabel: 'Publish', message: 'Everyone learning this language will be able to read it.' });
    if (userTitle !== null) {
      let finalTitle;
      if (userTitle) {
        finalTitle = userTitle;
      } else {
        // Use story preview as backup if no title provided
        const storyPreview = currentStoryData?.story 
          ? currentStoryData.story.slice(0, 70).replace(/\s+/g, ' ').trim() 
          : 'Shared story';
        finalTitle = storyPreview + (currentStoryData?.story.length > 70 ? '…' : '');
      }
      PublicLibrary.publishCurrentStory(currentStoryData, level, finalTitle);
    }
  });

  clearStoryArchiveBtn?.addEventListener('click', async () => {
    if (!await confirmDialog('Clear past stories?', 'This removes every saved story for this language. It can’t be undone.', { confirmLabel: 'Clear all', danger: true })) return;
    saveStoryArchive([]);
    renderStoryArchive();
  });

  renderStoryArchive();

  createDeckFromStoryTokensBtn?.addEventListener('click', async () => {
    if (!window.storyTokenizer) {
      toast('No story loaded. Analyze a story first!', 'error');
      return;
    }

    const selectedTokens = window.storyTokenizer.getSelectedTokens();
    if (selectedTokens.length === 0) {
      toast('No tokens selected! Click tokens in the story to add them.', 'error');
      return;
    }

    const deckName = await promptDialog('Create flashcard deck', {
      label: 'Deck name',
      value: currentStoryData?.title || `Story – ${new Date().toLocaleDateString()}`,
      confirmLabel: 'Create deck',
      message: `${selectedTokens.length} word${selectedTokens.length === 1 ? '' : 's'} will become cards.`,
    });
    if (!deckName) return;

    // Same convention as every deck: question = meaning, answer = word being learned.
    const cards = selectedTokens.map(token => ({
      question: token.translation || '',
      answer: token.text,
      stats: { correct: 0, incorrect: 0 }
    }));

    const newDeck = await DataManager.createDeck(
      deckName,
      DataManager.currentUser.learningLang,
      DataManager.currentUser.nativeLang,
      cards
    );

    if (newDeck) {
      refreshDecks(DataManager.getDeck(currentDeckIndex)?.id ?? null, { rerender: false });
      toast(`Deck “${deckName}” created with ${selectedTokens.length} cards.`, 'success');
    } else {
      toast('Failed to create deck', 'error');
    }
  });
}

/**
 * Switch mode
 */
/**
 * Single place that re-syncs everything after the deck list or selection changes:
 * picker options, selected index, flashcard/shuffle/study state, empty state, and the active mode.
 */
function refreshDecks(selectDeckId, { rerender = true } = {}) {
  DataManager.updateFilteredDecks();
  UI.updateDeckSelect(DataManager.filteredDecks);
  const idx = selectDeckId == null ? 0 : DataManager.filteredDecks.findIndex(d => d.id === selectDeckId);
  currentDeckIndex = Math.max(0, idx);
  if (DataManager.filteredDecks.length) UI.deckSelect.value = currentDeckIndex;

  const deck = DataManager.getDeck(currentDeckIndex);
  flashcardsMode.currentCardIndex = 0;
  flashcardsMode.activeFlashcards = [];
  if (deck?.cards?.length) {
    if (UI.flashShuffleToggle?.checked) flashcardsMode.setShuffleMode(deck, true);
    if (flashcardsMode.studyMode) flashcardsMode.startStudyMode(deck, true);
  } else if (flashcardsMode.studyMode) {
    flashcardsMode.sessionCards = [];
  }
  UI.renderDeckState(deck, DataManager.filteredDecks.length);
  updateDueBadge();
  if (rerender) switchMode(currentMode);
}

// Number of cards due for review, shown on the Review nav item.
function updateDueBadge() {
  const badge = document.getElementById('dueBadge');
  if (!badge) return;
  const n = DataManager.filteredDecks
    .filter(d => d.id !== 'master-vocab')
    .reduce((sum, d) => sum + d.cards.filter(c => isDue(c)).length, 0);
  badge.textContent = n > 99 ? '99+' : String(n);
  badge.hidden = n === 0;
}
window.addEventListener('reviewScheduleChanged', updateDueBadge);

async function copyToClipboard(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    toast(successMessage, 'success');
  } catch {
    toast('Couldn’t copy automatically. Select the text and copy it yourself.', 'error');
  }
}

function switchMode(mode) {
  // Stop timers from the mode we're leaving so they can't fire into the new one.
  matchMode.reset();
  testMode.reset();
  learnMode.reset();
  currentMode = mode;
  UI.renderMode(mode);

  const deck = DataManager.getDeck(currentDeckIndex);

  switch (mode) {
    case MODES.FLASHCARDS:
      setKeyboardContext(KEYBOARD_CONTEXTS.FLASHCARDS);
      flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
      break;

    case MODES.LEARN:
      setKeyboardContext(KEYBOARD_CONTEXTS.DISABLED);
      learnMode.startSession(deck, UI.shuffleToggle.checked);
      break;

    case MODES.TEST:
      setKeyboardContext(KEYBOARD_CONTEXTS.DISABLED);
      testMode.start(deck);
      break;

    case MODES.MATCH:
      setKeyboardContext(KEYBOARD_CONTEXTS.DISABLED);
      matchMode.start(deck);
      break;

    case MODES.DECK_EDITOR:
      setKeyboardContext(KEYBOARD_CONTEXTS.DISABLED);
      deckEditor.render(DataManager.filteredDecks, currentDeckIndex);
      break;

    case MODES.STORY_ANALYZER:
      setKeyboardContext(KEYBOARD_CONTEXTS.DISABLED);
      // Story analyzer initialized separately
      break;
  }
}

/**
 * Load user preferences
 */
// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
