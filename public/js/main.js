// ============ MAIN APPLICATION INITIALIZATION ============

import * as DataManager from './data.js';
import * as UI from './ui.js';
import { setKeyboardContext, setupKeyboardListener, handleFlashcardsKeys } from './keyboard.js';
import { initTTS, setSpeakMode, speakText } from './tts.js';
import { MODES, KEYBOARD_CONTEXTS, SPEAK_MODES } from './constants.js';
import { generateStoryPrompt, generateTextTokenizationPrompt, generateDeckCurationPrompt, parseStoryResponse, StoryTokenizer, renderInteractiveStory, renderSelectedTokens, createDeckFromTokens, StoryTTSPlayer, renderStoryTTSControls, attachStoryTTSKeyboardShortcuts } from '../storyPromptService.js';

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
    
    // Set language selector to user's current language
    if (DataManager.currentUser?.learningLang) {
      UI.languageSelect.value = DataManager.currentUser.learningLang;
    }
    
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
    
    // Show first card
    flashcardsMode.showCard(DataManager.getDeck(0), DataManager.currentUser.learningLang);
    
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

  // Language selection
  UI.languageSelect?.addEventListener('change', async () => {
    const selectedLang = UI.languageSelect.value;
    
    try {
      // Update language on server
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/me/language', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ learningLang: selectedLang })
      });

      if (!response.ok) {
        throw new Error('Failed to update language');
      }

      // Reload user data
      await DataManager.loadUser();
      
      // Update filtered decks for new language
      DataManager.updateFilteredDecks();
      
      // Update UI
      UI.updateDeckSelect(DataManager.filteredDecks);
      
      // Reset to first deck
      currentDeckIndex = 0;
      UI.deckSelect.value = 0;
      
      // Show first card in new language
      const deck = DataManager.getDeck(0);
      flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
      
      alert(`Learning language updated to: ${selectedLang}`);
    } catch (error) {
      console.error('Failed to update language:', error);
      alert('Failed to update language. Please try again.');
      // Revert the select value
      UI.languageSelect.value = DataManager.currentUser.learningLang;
    }
  });

  // Load saved language
  if (DataManager.currentUser?.learningLang) {
    UI.languageSelect.value = DataManager.currentUser.learningLang;
  }

  // Deck selection
  UI.deckSelect?.addEventListener('change', (e) => {
    currentDeckIndex = Number(e.target.value);
    const deck = DataManager.getDeck(currentDeckIndex);

    if (currentMode === MODES.DECK_EDITOR) {
      deckEditor.render(DataManager.filteredDecks, currentDeckIndex);
    } else {
      flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
    }
  });

  // New deck
  UI.newDeckBtn?.addEventListener('click', () => {
    const name = prompt('Deck name?');
    if (!name) return;

    const deck = DataManager.createDeck(
      name,
      DataManager.currentUser.learningLang,
      DataManager.currentUser.nativeLang
    );

    DataManager.updateFilteredDecks();
    UI.updateDeckSelect(DataManager.filteredDecks);

    currentDeckIndex = DataManager.filteredDecks.findIndex(d => d.id === deck.id);
    UI.deckSelect.value = currentDeckIndex;

    flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
  });

  // Mode switching
  document.querySelectorAll('.mode-selector button')?.forEach(btn => {
    btn.addEventListener('click', () => {
      clearInterval(matchMode.interval);
      
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
      const isFlipped = UI.card.classList.contains('flipped');
      const isFrontLearning = flashcardsMode.frontIsQuestion
        ? deck.learningLang === DataManager.currentUser.learningLang
        : deck.nativeLang === DataManager.currentUser.learningLang;
      
      // Auto-speak if needed
      const speakMode = document.getElementById('speakMode')?.value || SPEAK_MODES.OFF;
    }
  });

  UI.speakFrontBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const deck = DataManager.getDeck(currentDeckIndex);
    const currentCard = flashcardsMode.getCurrentCard(deck);
    if (currentCard) {
      flashcardsMode.speakVisible(currentCard, DataManager.currentUser.learningLang);
    }
  });

  UI.speakBackBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const deck = DataManager.getDeck(currentDeckIndex);
    const currentCard = flashcardsMode.getCurrentCard(deck);
    if (currentCard) {
      flashcardsMode.speakVisible(currentCard, DataManager.currentUser.learningLang);
    }
  });

  UI.flashShuffleToggle?.addEventListener('change', () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    flashcardsMode.setShuffleMode(deck, UI.flashShuffleToggle.checked);
    flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
  });

  UI.correctBtn?.addEventListener('click', () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    if (flashcardsMode.studyMode) {
      flashcardsMode.markCorrect();
      DataManager.updateCardStats(deck.id, flashcardsMode.sessionIndex, true);
      DataManager.saveDecks();
      flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
    }
  });

  UI.incorrectBtn?.addEventListener('click', () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    if (flashcardsMode.studyMode) {
      flashcardsMode.markIncorrect();
      DataManager.updateCardStats(deck.id, flashcardsMode.sessionIndex, false);
      DataManager.saveDecks();
      flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
    }
  });
}

/**
 * Setup learn mode listeners
 */
function setupLearnListeners() {
  UI.submitLearn?.addEventListener('click', () => {
    learnMode.submitAnswer();
  });

  UI.learnAnswer?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') learnMode.submitAnswer();
  });

  UI.shuffleToggle?.addEventListener('change', () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    
    // Handle shuffle for study mode
    if (flashcardsMode.studyMode) {
      flashcardsMode.setStudyShuffle(deck, UI.shuffleToggle.checked);
      flashcardsMode.showCard(deck, DataManager.currentUser.learningLang);
    } 
    // Handle shuffle for learn mode
    else if (currentMode === MODES.LEARN) {
      learnMode.startSession(deck, UI.shuffleToggle.checked);
    }
  });
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
  UI.editorAdd?.addEventListener('click', () => {
    const q = UI.editorQuestion.value.trim();
    const a = UI.editorAnswer.value.trim();
    if (!q || !a) return;

    deckEditor.addCard(currentDeckIndex, q, a, DataManager.filteredDecks);
    deckEditor.render(DataManager.filteredDecks, currentDeckIndex);
    DataManager.saveDecks();
  });

  UI.deleteDeckBtn?.addEventListener('click', () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    if (!deck || deck.id === 'master-vocab') return;

    deckEditor.deleteDeck(deck.id, () => {
      currentDeckIndex = 0;
      DataManager.updateFilteredDecks();
      UI.updateDeckSelect(DataManager.filteredDecks);
      flashcardsMode.showCard(DataManager.getDeck(0), DataManager.currentUser.learningLang);
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
    if (!UI.deckPromptOutput.value) return alert('Generate a prompt first!');
    navigator.clipboard.writeText(UI.deckPromptOutput.value);
    alert('Deck prompt copied! Paste it into your AI tool.');
  });

  UI.importDeckJsonBtn?.addEventListener('click', () => {
    const jsonText = UI.deckImportJson.value.trim();
    if (!jsonText) return alert('Paste deck JSON to import it.');

    const level = UI.deckPromptLevel.value;
    const topic = UI.deckPromptTopic.value.trim() || 'Custom deck';
    const deckName = `${topic} (${level})`;

    const deck = deckEditor.importDeckFromJson(
      jsonText,
      DataManager.currentUser.learningLang,
      DataManager.currentUser.nativeLang,
      deckName
    );

    if (!deck) {
      return alert('Invalid deck JSON. Make sure the AI returns an array of cards with question and answer fields.');
    }

    DataManager.updateFilteredDecks();
    UI.updateDeckSelect(DataManager.filteredDecks);

    currentDeckIndex = DataManager.filteredDecks.findIndex(d => d.id === deck.id);
    if (currentDeckIndex < 0) currentDeckIndex = 0;
    UI.deckSelect.value = currentDeckIndex;

    deckEditor.render(DataManager.filteredDecks, currentDeckIndex);
    alert(`Deck "${deck.name}" imported successfully!`);
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
  const generatePromptBtn = document.getElementById('generatePromptBtn');
  const generateFromTextBtn = document.getElementById('generateFromTextBtn');
  const copyPromptBtn = document.getElementById('copyPromptBtn');
  const clearStoryArchiveBtn = document.getElementById('clearStoryArchive');
  const storyArchiveList = document.getElementById('storyArchiveList');
  const storyArchiveEmpty = document.getElementById('storyArchiveEmpty');
  const createDeckFromStoryTokensBtn = document.getElementById('createDeckFromStoryTokens');
  const promptOutput = document.getElementById('promptOutput');
  const storyInput = document.getElementById('storyInput');

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
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'flex-start';
      item.style.padding = '12px 14px';
      item.style.border = '1px solid #dde2ea';
      item.style.borderRadius = '8px';
      item.style.backgroundColor = '#ffffff';
      item.style.gap = '12px';

      const details = document.createElement('div');
      details.style.flex = '1';

      const title = document.createElement('div');
      title.textContent = entry.title;
      title.style.fontWeight = '600';
      title.style.marginBottom = '6px';

      const meta = document.createElement('div');
      meta.textContent = `${new Date(entry.createdAt).toLocaleString()} · ${entry.tokens.length} tokens`;
      meta.style.fontSize = '12px';
      meta.style.color = '#666';

      details.appendChild(title);
      details.appendChild(meta);

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.flexDirection = 'column';
      actions.style.gap = '8px';

      const openBtn = document.createElement('button');
      openBtn.textContent = 'Open';
      openBtn.style.padding = '8px 12px';
      openBtn.style.cursor = 'pointer';
      openBtn.style.border = '1px solid #0066cc';
      openBtn.style.borderRadius = '6px';
      openBtn.style.backgroundColor = '#0066cc';
      openBtn.style.color = '#fff';
      openBtn.addEventListener('click', () => {
        openArchivedStory(entry);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.style.padding = '8px 12px';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.border = '1px solid #ccc';
      deleteBtn.style.borderRadius = '6px';
      deleteBtn.style.backgroundColor = '#fff';
      deleteBtn.style.color = '#333';
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
    const entry = {
      id: `story-${Date.now()}`,
      title: `Story ${new Date().toLocaleString()} - ${storyPreview}${data.story.length > 70 ? '…' : ''}`,
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
    analyzeStoryData(json, false);
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

  const analyzeStoryData = (rawText, shouldArchive = true) => {
    const data = parseStoryResponse(rawText);

    if (!data) {
      alert('Invalid JSON. Make sure you pasted the AI response correctly.');
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
      document.querySelector('.prompt-generator')?.appendChild(ttsContainer);
    } else {
      ttsContainer.innerHTML = ''; // Clear existing controls
    }

    let selectedContainer = document.getElementById('selectedTokens');
    if (!selectedContainer) {
      selectedContainer = document.createElement('div');
      selectedContainer.id = 'selectedTokens';
      selectedContainer.style.marginTop = '20px';
      selectedContainer.style.padding = '15px';
      selectedContainer.style.backgroundColor = '#f5f5f5';
      selectedContainer.style.borderRadius = '4px';
      document.querySelector('.prompt-generator')?.appendChild(selectedContainer);
    }

    const { updatePlayBtn, updateCurrentTokenDisplay } = renderStoryTTSControls(
      '#storyTTSContainer',
      window.storyTTSPlayer
    );

    attachStoryTTSKeyboardShortcuts(window.storyTTSPlayer, updatePlayBtn);

    renderInteractiveStory('#storyDisplay', window.storyTokenizer, (token, translation) => {
      renderSelectedTokens('#selectedTokens', window.storyTokenizer);
    });

    renderSelectedTokens('#selectedTokens', window.storyTokenizer);
    if (shouldArchive) {
      archiveStory(data);
    }
    showStoryReviewMode();
    return data;
  };

  const analyzeCurrentStory = () => {
    const sourceText = storyInput.value.trim();
    if (!sourceText) {
      return alert('Please paste the tokenized story JSON into the text area first.');
    }

    analyzeStoryData(sourceText);
  };

  // Generate prompt
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

  // Generate from real-world text
  generateFromTextBtn?.addEventListener('click', () => {
    const storyInput = document.getElementById('storyInput');
    const rawText = storyInput.value.trim();

    if (!rawText) {
      alert('Paste a story in the Story Input field first!');
      return;
    }

    const level = document.getElementById('promptLevel').value;
    let simplify = confirm(`Do you want to simplify the text to level ${level}?\n\n"OK" = Simplify\n"Cancel" = Keep original text`);

    const prompt = generateTextTokenizationPrompt({
      rawText,
      level,
      learningLang: DataManager.currentUser.learningLang,
      nativeLang: DataManager.currentUser.nativeLang,
      simplify
    });

    promptOutput.value = prompt;
    alert('Prompt generated! Copy it and paste the AI response back to analyze.');
  });

  // Copy prompt
  copyPromptBtn?.addEventListener('click', () => {
    if (!promptOutput.value) return alert('Generate a prompt first!');
    navigator.clipboard.writeText(promptOutput.value);
    alert('Prompt copied! Paste it into ChatGPT.');
  });

  // Analyze story from story input
  analyzeStoryBtn?.addEventListener('click', analyzeCurrentStory);
  backToInputBtn?.addEventListener('click', showStoryInputMode);

  // Clear archive button
  clearStoryArchiveBtn?.addEventListener('click', () => {
    if (!confirm('Clear all archived stories for this language?')) return;
    saveStoryArchive([]);
    renderStoryArchive();
  });

  renderStoryArchive();

  // Create deck from selected story tokens
  createDeckFromStoryTokensBtn?.addEventListener('click', () => {
    if (!window.storyTokenizer) {
      alert('No story loaded. Analyze a story first!');
      return;
    }

    const selectedTokens = window.storyTokenizer.getSelectedTokens();
    if (selectedTokens.length === 0) {
      alert('No tokens selected! Click tokens in the story to add them.');
      return;
    }

    const deckName = prompt(
      `Create deck with ${selectedTokens.length} tokens. Name:`,
      `Story - ${new Date().toLocaleDateString()}`
    );
    if (!deckName) return;

    // Create new deck
    const newDeck = {
      id: `deck-${Date.now()}`,
      name: deckName,
      learningLang: DataManager.currentUser.learningLang,
      nativeLang: DataManager.currentUser.nativeLang,
      cards: selectedTokens.map(token => ({
        question: token.text,
        answer: token.translation,
        stats: { correct: 0, incorrect: 0 }
      }))
    };

    DataManager.filteredDecks.push(newDeck);
    DataManager.saveDecks();
    UI.updateDeckSelect(DataManager.filteredDecks);

    alert(`Deck "${deckName}" created with ${selectedTokens.length} tokens!`);
  });
}

/**
 * Switch mode
 */
function switchMode(mode) {
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
