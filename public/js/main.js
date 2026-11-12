// ============ MAIN APPLICATION INITIALIZATION ============

import { renderGrammarGuide } from './grammarGuide.js';
import { renderNotes } from './notes.js';
import * as DataManager from './data.js';
import { isDue, shuffleArray } from './utils.js';
import { STARTER_STORIES, wordsIn } from './starterStories.js';
import { langName, learnableFor } from './constants.js';
import * as UI from './ui.js';
import { setKeyboardContext, setupKeyboardListener, handleFlashcardsKeys } from './keyboard.js';
import { initTTS, setSpeakMode, speakText } from './tts.js';
import { MODES, KEYBOARD_CONTEXTS, SPEAK_MODES } from './constants.js';
import { generateStoryPrompt, generateTextTokenizationPrompt, generateDeckCurationPrompt, parseStoryResponse, looksLikeStoryJson } from '../storyPromptService.js';
import { openReader, closeReader, clearSavedWords } from './reader.js';
import * as StoryAnalyzer from '../storyAnalyzer.js';
import * as PublicLibrary from './publicLibrary.js';

import flashcardsMode from './modes/flashcards.js';
import learnMode from './modes/learn.js';
import testMode from './modes/test.js';
import matchMode from './modes/match.js';
import deckEditor, { filterCards } from './deckEditor.js';

// Screen <-> URL. Keep in step with PAGES in Server/server.js and "routes" in vercel.json.
const MODE_PATHS = {
  home: '/', profile: '/profile', flashcards: '/study', learn: '/study/learn', test: '/study/test', match: '/study/match',
  deckEditor: '/decks', storyAnalyzer: '/stories', grammar: '/grammar', notes: '/notes', publicLibrary: '/library',
};
const modeFromPath = (p) => {
  const clean = String(p).replace(/\/+$/, '') || '/';
  return Object.keys(MODE_PATHS).find((m) => MODE_PATHS[m] === clean) || null;
};
import { loadProfile, recordAnswer, onProfileChange } from './profile.js';
import { renderHome, renderProfile, renderIdentity, setupProfileForm, rememberDeck, downloadReminder } from './home.js';

// Global state
let currentMode = MODES.HOME;
let currentDeckIndex = 0;

/**
 * Initialize the application
 */
async function initializeApp() {
  try {
    // Load user first; profile extras (streak, goal, name) load alongside.
    const profileReady = loadProfile();
    await DataManager.loadUser();
    await profileReady;
    renderIdentity(DataManager.currentUser);
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

    // Clean URLs: /stories, /decks… open their screen; Back / Forward move between screens.
    // Old links (index.html#storyAnalyzer) still work and are rewritten to the new path.
    const openRoute = () => {
      const legacy = location.hash.slice(1);
      const mode = Object.values(MODES).includes(legacy) ? legacy : modeFromPath(location.pathname);
      switchMode(mode || MODES.HOME, { history: 'replace' });
    };
    window.addEventListener('popstate', openRoute);
    window.addEventListener('hashchange', openRoute);
    // Links to another screen of this page switch in place instead of reloading.
    document.addEventListener('click', (e) => {
      const a = e.target.closest?.('a[href]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
      const url = new URL(a.href, location.href);
      const mode = url.origin === location.origin && !url.search && modeFromPath(url.pathname);
      if (!mode) return;
      e.preventDefault();
      switchMode(mode);
    });
    openRoute();
    document.body.classList.remove('app-loading');

    // Every answered card counts toward today's goal and the streak.
    window.addEventListener('reviewScheduleChanged', () => recordAnswer());
    onProfileChange(() => {
      renderIdentity(DataManager.currentUser);
      if (currentMode === MODES.HOME) renderHome(homeContext());
    });
    setupProfileForm(async (changes) => {
      // A different native language changes which decks apply, so reload cleanly.
      if (!changes.nativeLang || changes.nativeLang === DataManager.currentUser?.nativeLang) return;
      const allowed = learnableFor(changes.nativeLang);
      if (!allowed.includes(DataManager.currentUser.learningLang)) {
        await fetch('/api/auth/me/language', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ learningLang: allowed[0] }),
        }).catch(() => {});
        localStorage.setItem('learningLang', allowed[0]);
      }
      location.reload();
    });
    document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => switchMode(b.dataset.go)));

    console.log('App initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    document.body.classList.remove('app-loading');
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Logout
  UI.logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  });

  // Appearance: system / light / dark (stored per device).
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    try { themeSelect.value = localStorage.getItem('theme') || 'system'; } catch { /* storage blocked */ }
    themeSelect.addEventListener('change', () => {
      const v = themeSelect.value;
      try { v === 'system' ? localStorage.removeItem('theme') : localStorage.setItem('theme', v); } catch { /* storage blocked */ }
      if (v === 'system') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = v;
    });
  }

  document.getElementById('reminderBtn')?.addEventListener('click', () => {
    downloadReminder(document.getElementById('reminderTime')?.value, DataManager.currentUser);
    toast('Open the downloaded file to add the reminder to your calendar.', 'success');
  });

  document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
    const res = await formDialog('Change password', [
      { label: 'Current password', type: 'password', autocomplete: 'current-password' },
      { label: 'New password (8+ characters)', type: 'password', autocomplete: 'new-password' },
    ], { confirmLabel: 'Change password' });
    if (!res) return;
    const [currentPassword, newPassword] = res;
    const r = await fetch('/api/auth/me/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    }).catch(() => null);
    const data = await r?.json().catch(() => ({}));
    if (!r?.ok) return toast(data?.error || 'Couldn’t change the password. Try again.', 'error');
    toast('Password changed.', 'success');
  });

  document.getElementById('deleteAccountBtn')?.addEventListener('click', async () => {
    const res = await formDialog('Delete your account?', [
      { label: 'Type your password to confirm', type: 'password', autocomplete: 'current-password' },
    ], { confirmLabel: 'Delete my account', danger: true, message: 'Your decks, stories and progress will be deleted for good. This can’t be undone.' });
    if (!res) return;
    const r = await fetch('/api/auth/me', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ password: res[0] }),
    }).catch(() => null);
    const data = await r?.json().catch(() => ({}));
    if (!r?.ok) return toast(data?.error || 'Couldn’t delete the account. Try again.', 'error');
    localStorage.clear();
    flash('Your account has been deleted. Sorry to see you go!', 'info');
    window.location.replace('/login');
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
    window.location.href = '/library/starter';
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
    if (suggestHint) suggestHint.hidden = true;
    UI.editorAnswer.focus();
    refreshDecks(deck.id);
  });

  // Typing a word fills in its meaning from the shared dictionary (only if the meaning is empty).
  const suggestHint = document.getElementById('editorSuggestHint');
  let suggestTimer = null;
  UI.editorAnswer?.addEventListener('input', () => {
    clearTimeout(suggestTimer);
    if (suggestHint) suggestHint.hidden = true;
    const word = UI.editorAnswer.value.trim();
    if (!word || UI.editorQuestion.value.trim()) return;
    suggestTimer = setTimeout(async () => {
      const deck = DataManager.getDeck(currentDeckIndex);
      const hit = await DataManager.suggestTranslation(word, deck?.learningLang, deck?.nativeLang).catch(() => null);
      // Only fill if the user hasn't typed a meaning or changed the word meanwhile.
      if (hit && UI.editorAnswer.value.trim() === word && !UI.editorQuestion.value.trim()) {
        UI.editorQuestion.value = hit.translation;
        if (suggestHint) suggestHint.hidden = false;
      }
    }, 400);
  });
  UI.editorQuestion?.addEventListener('input', () => { if (suggestHint) suggestHint.hidden = true; });

  document.getElementById('renameDeckBtn')?.addEventListener('click', async () => {
    const deck = DataManager.getDeck(currentDeckIndex);
    if (!deck || deck.id === 'master-vocab') return;
    const name = await promptDialog('Rename deck', { label: 'Deck name', value: deck.name, confirmLabel: 'Rename' });
    if (!name || name === deck.name) return;
    if (!await DataManager.renameDeck(deck.id, name)) return toast('Couldn’t rename the deck. Try again.', 'error');
    refreshDecks(deck.id);
    toast(`Renamed to “${name}”.`, 'success');
  });

  document.getElementById('cardSearch')?.addEventListener('input', filterCards);

  // Dictionary search: either language, results can go straight into this deck.
  const dictInput = document.getElementById('dictSearch');
  const dictResults = document.getElementById('dictResults');
  let dictTimer = null, dictSeq = 0;
  const renderDict = (rows, q) => {
    dictResults.replaceChildren();
    if (!q) return;
    if (!rows.length) {
      const li = document.createElement('li');
      li.className = 'empty-hint';
      li.textContent = `Nothing found for “${q}”. Add it as a card above and it joins the dictionary.`;
      dictResults.appendChild(li);
      return;
    }
    const deck = DataManager.getDeck(currentDeckIndex);
    const canAdd = deck && deck.id !== 'master-vocab';
    const inDeck = new Set((deck?.cards || []).map((c) => c.answer.toLowerCase()));
    rows.forEach((r) => {
      const li = document.createElement('li');
      const main = document.createElement('div');
      main.className = 'wl-main';
      const w = document.createElement('strong');
      w.textContent = r.word;
      const t = document.createElement('span');
      t.textContent = r.translation;
      main.append(w, t);
      if (r.lemma) {
        const l = document.createElement('span');
        l.className = 'wl-lemma';
        l.textContent = `form of ${r.lemma}`;
        main.appendChild(l);
      }
      const speak = document.createElement('button');
      speak.type = 'button';
      speak.className = 'wl-icon';
      speak.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';
      speak.setAttribute('aria-label', `Listen to ${r.word}`);
      speak.addEventListener('click', () => speakText(r.word, DataManager.currentUser.learningLang, 0.8));
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'ghost small';
      const already = inDeck.has(r.word.toLowerCase());
      add.textContent = already ? 'In deck ✓' : '+ Add';
      add.disabled = !canAdd || already;
      if (!canAdd) add.title = 'Pick one of your own decks first';
      add.addEventListener('click', async () => {
        add.disabled = true;
        const ok = await deckEditor.addCard(currentDeckIndex, r.translation, r.word, DataManager.filteredDecks, r.lemma ? `Form of ${r.lemma}` : '');
        if (!ok) { add.disabled = false; return toast('Couldn’t add the word. Try again.', 'error'); }
        add.textContent = 'In deck ✓';
        refreshDecks(deck.id);
      });
      li.append(main, speak, add);
      dictResults.appendChild(li);
    });
  };
  dictInput?.addEventListener('input', () => {
    clearTimeout(dictTimer);
    const q = dictInput.value.trim();
    if (q.length < 2) return renderDict([], '');
    dictTimer = setTimeout(async () => {
      const seq = ++dictSeq;
      const rows = await DataManager.searchDictionary(q).catch(() => []);
      if (seq === dictSeq) renderDict(rows, q); // ignore slower, older answers
    }, 250);
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
 * Setup story analyzer listeners
 */
function setupStoryAnalyzerListeners() {
  const analyzeStoryBtn = document.getElementById('analyzeStory');
  const backToInputBtn = document.getElementById('backToInput');
  const storyInputMode = document.getElementById('storyInputMode');
  const storyReviewMode = document.getElementById('storyReviewMode');
  const publishStoryBtn = document.getElementById('publishStoryBtn');
  const generateFromTextBtn = document.getElementById('generateFromTextBtn');
  const clearStoryArchiveBtn = document.getElementById('clearStoryArchive');
  const storyArchiveList = document.getElementById('storyArchiveList');
  const storyArchiveEmpty = document.getElementById('storyArchiveEmpty');
  const promptOutput = document.getElementById('promptOutput');
  const storyInput = document.getElementById('storyInput');
  let currentStoryData = null;

  // ---- Past stories: saved to the account, so they follow you to any device ----
  const authJson = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });
  const langQuery = () => {
    const u = DataManager.currentUser;
    return `learningLang=${encodeURIComponent(u?.learningLang || '')}&nativeLang=${encodeURIComponent(u?.nativeLang || '')}`;
  };
  let storyArchive = [];
  let currentSavedStoryId = null;

  const loadStoryArchive = async () => {
    try {
      const res = await fetch(`/api/library/stories?${langQuery()}`, { headers: authJson() });
      if (!res.ok) throw new Error(res.status);
      storyArchive = await res.json();
    } catch (e) {
      console.error('Failed to load stories:', e);
      toast('Couldn’t load your past stories. Refresh to try again.', 'error');
    }
    return storyArchive;
  };

  const renderStoryArchive = () => {
    if (!storyArchiveList || !storyArchiveEmpty) return;
    storyArchiveList.replaceChildren();
    storyArchiveEmpty.style.display = storyArchive.length ? 'none' : 'block';

    storyArchive.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'archive-item';

      const details = document.createElement('div');
      details.className = 'archive-details';
      const title = document.createElement('div');
      title.textContent = entry.title;
      title.className = 'archive-title';
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${new Date(entry.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · ${entry.tokens.length} words`;
      details.append(title, meta);

      const actions = document.createElement('div');
      actions.className = 'archive-actions';
      const openBtn = document.createElement('button');
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', () => openArchivedStory(entry));
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'ghost';
      deleteBtn.setAttribute('aria-label', `Delete ${entry.title}`);
      deleteBtn.addEventListener('click', async () => {
        if (!await confirmDialog('Delete this story?', `“${entry.title}” will be removed from your past stories.`, { confirmLabel: 'Delete', danger: true })) return;
        try {
          const res = await fetch(`/api/library/stories/${entry.id}`, { method: 'DELETE', headers: authJson() });
          if (!res.ok) throw new Error(res.status);
          storyArchive = storyArchive.filter((s) => s.id !== entry.id);
          renderStoryArchive();
        } catch {
          toast('Couldn’t delete the story. Try again.', 'error');
        }
      });
      actions.append(openBtn, deleteBtn);
      item.append(details, actions);
      storyArchiveList.appendChild(item);
    });
  };

  const archiveStory = async (data) => {
    const u = DataManager.currentUser;
    const preview = data.story ? data.story.slice(0, 60).replace(/\s+/g, ' ').trim() : 'Saved story';
    try {
      const res = await fetch('/api/library/stories', {
        method: 'POST',
        headers: authJson(),
        body: JSON.stringify({
          clientId: `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: data.title || (data.story?.length > 60 ? `${preview}…` : preview),
          story: data.story,
          tokens: data.tokens,
          learningLang: u?.learningLang,
          nativeLang: u?.nativeLang,
        }),
      });
      const saved = await res.json().catch(() => null);
      if (!res.ok) throw new Error(saved?.error || res.status);
      if (saved?.id) {
        storyArchive = [saved, ...storyArchive];
        currentSavedStoryId = saved.id;
      }
      renderStoryArchive();
    } catch (e) {
      console.error('Failed to save story:', e);
      toast('The story opened, but it couldn’t be saved to your past stories.', 'error');
    }
  };

  // Stories used to be saved only in this browser. Upload them to the account once,
  // then remove the local copy. Safe to repeat: the server ignores ones it already has.
  const migrateLocalStories = async () => {
    const u = DataManager.currentUser;
    if (!u) return;
    const prefix = `storyArchive:${u.id}:`;
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(prefix) || k === 'storyArchive:guest') keys.push(k);
      }
    } catch { return; }
    if (!keys.length) return;

    const stories = keys.flatMap((k) => {
      const [, , learningLang = u.learningLang, nativeLang = u.nativeLang] = k.split(':');
      let list = [];
      try { list = JSON.parse(localStorage.getItem(k) || '[]'); } catch { /* corrupt entry: skip */ }
      return (Array.isArray(list) ? list : []).map((e) => ({
        clientId: e.id, title: e.title, story: e.story, tokens: e.tokens, createdAt: e.createdAt, learningLang, nativeLang,
      }));
    });
    if (!stories.length) { keys.forEach((k) => localStorage.removeItem(k)); return; }

    try {
      const res = await fetch('/api/library/stories/import', { method: 'POST', headers: authJson(), body: JSON.stringify({ stories }) });
      if (!res.ok) throw new Error(res.status);
      const { imported } = await res.json();
      keys.forEach((k) => localStorage.removeItem(k)); // only after the server confirmed
      if (imported) toast(`Moved ${imported} past ${imported === 1 ? 'story' : 'stories'} to your account. They’ll show on every device now.`, 'success');
    } catch (e) {
      console.error('Story migration failed; will retry next time:', e); // local copy kept
    }
  };

  const openArchivedStory = (entry) => {
    if (!entry || !entry.story || !Array.isArray(entry.tokens)) return;
    currentSavedStoryId = entry.id;
    const json = JSON.stringify({ title: entry.title, story: entry.story, tokens: entry.tokens });
    storyInput.value = json;
    analyzeStoryData(json, false, false);
    showStoryReviewMode();
  };

  const showStoryInputMode = () => {
    closeReader();
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
      toast('That AI reply is incomplete. Copy the whole reply again, or ask the chat to “send the full JSON”.', 'error');
      return null;
    }

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
    openReader(currentStoryData, {
      learningLang: DataManager.currentUser.learningLang,
      nativeLang: DataManager.currentUser.nativeLang,
      callbacks: { onTranslationAdded, onAddToDeck: addWordsToDeck },
    });
    return data;
  };

  // A translation typed into the word popup: keep it in this story and share it.
  const onTranslationAdded = (word, translation) => {
    if (!currentStoryData) return;
    const key = word.toLowerCase();
    const has = currentStoryData.tokens.some((t) => t.text.toLowerCase() === key);
    currentStoryData.tokens = has
      ? currentStoryData.tokens.map((t) => (t.text.toLowerCase() === key ? { ...t, translation } : t))
      : [...currentStoryData.tokens, { text: word, translation }];
    DataManager.contributeTranslations([{ word, translation }]);
    if (currentSavedStoryId) {
      fetch(`/api/library/stories/${currentSavedStoryId}`, { method: 'PUT', headers: authJson(), body: JSON.stringify({ tokens: currentStoryData.tokens }) })
        .then((r) => r.ok && r.json()).then((row) => { if (row) storyArchive = storyArchive.map((x) => (x.id === row.id ? row : x)); })
        .catch(() => {});
    }
    toast('Translation added. Thanks for helping other learners!', 'success');
  };

  // "Add N words to a deck": an existing deck or a new one, saved in one request.
  const addWordsToDeck = async (words) => {
    if (!words.length) return;
    const own = DataManager.filteredDecks.filter((d) => d.id !== 'master-vocab');
    const NEW = '+ New deck';
    const res = await formDialog(`Add ${words.length} word${words.length === 1 ? '' : 's'} to a deck`, [
      { label: 'Deck', options: [NEW, ...own.map((d) => d.name)], value: NEW },
      { label: 'Name for a new deck', value: currentStoryData?.title || 'Story words', required: false },
    ], { confirmLabel: 'Add words' });
    if (!res) return;
    const [choice, newName] = res;
    // Cards: question = meaning, answer = the word (same as every deck)
    const cards = words.map((w) => ({
      question: w.translation, answer: w.text,
      ...(w.lemma ? { note: `Form of ${w.lemma}` } : {}), // "ogromną" -> base form "ogromny" on the card
      stats: { correct: 0, incorrect: 0 },
    }));
    DataManager.contributeTranslations(words.map((w) => ({ word: w.text, translation: w.translation })));

    let ok = false, target = null;
    if (choice === NEW) {
      target = await DataManager.createDeck(newName || currentStoryData?.title || 'Story words', DataManager.currentUser.learningLang, DataManager.currentUser.nativeLang, cards);
      ok = !!target;
    } else {
      target = own.find((d) => d.name === choice);
      const existing = new Set(target.cards.map((c) => c.answer.toLowerCase()));
      const fresh = cards.filter((c) => !existing.has(c.answer.toLowerCase()));
      ok = fresh.length ? await DataManager.setDeckCards(target.id, [...target.cards, ...fresh]) : true;
    }
    if (!ok) return toast('Couldn’t save the words. Try again.', 'error');
    refreshDecks(DataManager.getDeck(currentDeckIndex)?.id ?? null, { rerender: false });
    clearSavedWords();
    toast(`Added to “${target.name}”. Find them under Study.`, 'success');
  };

  // Plain text -> story: every word gets its translation from the shared dictionary.
  const storyFromText = async (text, { title, glossary = {} } = {}) => {
    const words = [...new Set(wordsIn(text))];
    let found = {};
    try {
      found = await DataManager.lookupWords(words);
    } catch (e) {
      console.error(e);
      toast('The dictionary is unavailable right now. You can still read and add translations.', 'error');
    }
    const key = (w) => w.toLowerCase().normalize('NFC');
    const tokens = words.map((w) => ({ text: w, translation: glossary[key(w)] || found[key(w)]?.translation || '' }));
    return { title: title || text.trim().split(/\s+/).slice(0, 6).join(' '), story: text.trim(), tokens };
  };

  // Opens whatever is in the box: an AI reply (JSON, with or without extra chat text) or plain text.
  const analyzeCurrentStory = async () => {
    const sourceText = storyInput.value.trim();
    if (!sourceText) return toast('Paste some text or an AI story first.', 'error');
    if (looksLikeStoryJson(sourceText)) {
      currentSavedStoryId = null;
      analyzeStoryData(sourceText);
      return;
    }
    analyzeStoryBtn.disabled = true;
    analyzeStoryBtn.textContent = 'Opening…';
    try {
      currentSavedStoryId = null;
      analyzeStoryData(JSON.stringify(await storyFromText(sourceText)));
    } finally {
      analyzeStoryBtn.disabled = false;
      analyzeStoryBtn.textContent = 'Open story';
    }
  };

  // Pasting opens the story straight away; no extra click needed.
  storyInput?.addEventListener('paste', () => setTimeout(() => {
    if (storyInput.value.trim().length > 20) analyzeCurrentStory();
  }, 0));

  // Public stories open straight in the reader (and are kept in Past stories).
  window.addEventListener('openStory', (e) => {
    const st = e.detail;
    if (!st?.story || !Array.isArray(st.tokens)) return toast('This story can’t be opened.', 'error');
    switchMode(MODES.STORY_ANALYZER);
    currentSavedStoryId = null;
    analyzeStoryData(JSON.stringify({ title: st.title, story: st.story, tokens: st.tokens }));
  });

  // ---- Starter stories for the current language ----
  const renderStarterStories = () => {
    const panel = document.getElementById('starterStoriesPanel');
    const list = document.getElementById('starterStoryList');
    const lang = DataManager.currentUser?.learningLang;
    const stories = STARTER_STORIES.filter((st) => st.lang === lang && (st.native || 'en') === DataManager.currentUser?.nativeLang);
    if (!panel || !list) return;
    panel.hidden = !stories.length;
    list.replaceChildren();
    stories.forEach((st) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'starter-story';
      const level = document.createElement('span');
      level.className = 'starter-level';
      level.textContent = st.level;
      const title = document.createElement('strong');
      title.textContent = st.title;
      const preview = document.createElement('span');
      preview.className = 'meta';
      preview.textContent = `${st.story.replace(/\s+/g, ' ').slice(0, 70)}…`;
      b.append(level, title, preview);
      b.addEventListener('click', async () => {
        b.disabled = true;
        try {
          currentSavedStoryId = null;
          // Starter stories aren't added to Past stories; they're always here.
          analyzeStoryData(JSON.stringify(await storyFromText(st.story, { title: st.title, glossary: st.glossary })), false);
        } finally {
          b.disabled = false;
        }
      });
      list.appendChild(b);
    });
    const label = document.getElementById('storyInputLabel');
    if (label) label.textContent = `Read any ${langName(lang)} text`;
  };
  renderStarterStories();

  const buildStoryPrompt = () => generateStoryPrompt({
    level: document.getElementById('promptLevel').value,
    length: document.getElementById('promptLength').value,
    topic: document.getElementById('promptTopic').value || 'daily life',
    learningLang: DataManager.currentUser.learningLang,
    nativeLang: DataManager.currentUser.nativeLang,
  });

  // The window is opened first (inside the click) so pop-up blockers allow it.
  const copyAndOpen = async (prompt, url) => {
    // No 'noopener' feature: with it, window.open always returns null and we'd wrongly report a block.
    const win = window.open(url, '_blank');
    if (win) win.opener = null;
    promptOutput.value = prompt;
    await copyToClipboard(prompt, 'Prompt copied. Paste it into the chat, then paste the reply back here.');
    if (!win) toast('Your browser blocked the new tab. The prompt is copied; open the chat yourself.', 'info');
  };
  document.getElementById('copyToChatGPT')?.addEventListener('click', () => copyAndOpen(buildStoryPrompt(), 'https://chatgpt.com/'));
  document.getElementById('copyToClaude')?.addEventListener('click', () => copyAndOpen(buildStoryPrompt(), 'https://claude.ai/new'));

  generateFromTextBtn?.addEventListener('click', () => {
    const rawText = storyInput.value.trim();
    if (!rawText) return toast('Paste your text in the box above first.', 'error');
    const level = document.getElementById('promptLevel').value;
    const prompt = generateTextTokenizationPrompt({
      rawText,
      level,
      learningLang: DataManager.currentUser.learningLang,
      nativeLang: DataManager.currentUser.nativeLang,
      simplify: level !== 'Original',
    });
    copyAndOpen(prompt, 'https://chatgpt.com/');
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
    try {
      const res = await fetch(`/api/library/stories?${langQuery()}`, { method: 'DELETE', headers: authJson() });
      if (!res.ok) throw new Error(res.status);
      storyArchive = [];
      renderStoryArchive();
    } catch {
      toast('Couldn’t clear your stories. Try again.', 'error');
    }
  });

  // Upload any browser-only stories first, then show the account's list.
  migrateLocalStories().then(loadStoryArchive).then(renderStoryArchive);

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
  if (deck && deck.id !== 'master-vocab') rememberDeck(deck.id);
  flashcardsMode.currentCardIndex = 0;
  flashcardsMode.activeFlashcards = [];
  if (deck?.cards?.length && UI.flashShuffleToggle?.checked) flashcardsMode.setShuffleMode(deck, true);
  // "Review this deck" opens the graded review for just this deck.
  const reviewLink = document.getElementById('reviewThisDeck');
  if (reviewLink) reviewLink.href = deck && deck.id !== 'master-vocab' ? `/review?deck=${encodeURIComponent(deck.id)}` : '/review';
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

function homeContext() {
  return {
    user: DataManager.currentUser,
    decks: DataManager.filteredDecks,
    onStudy: (deckId) => {
      if (deckId != null) refreshDecks(deckId, { rerender: false });
      switchMode(MODES.FLASHCARDS);
    },
    onNewDeck: () => UI.newDeckBtn?.click(),
  };
}

async function copyToClipboard(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    toast(successMessage, 'success');
  } catch {
    toast('Couldn’t copy automatically. Select the text and copy it yourself.', 'error');
  }
}

function switchMode(mode, { history = 'push' } = {}) {
  // Stop timers (and story audio) from the mode we're leaving so they can't fire into the new one.
  if (mode !== MODES.STORY_ANALYZER) closeReader();
  matchMode.reset();
  testMode.reset();
  learnMode.reset();
  currentMode = mode;
  UI.renderMode(mode);

  const deck = DataManager.getDeck(currentDeckIndex);

  // Keep the URL in step (a new history entry, so Back works), unless told otherwise.
  const path = MODE_PATHS[mode] || '/';
  if (history && (location.pathname !== path || location.hash)) window.history[history === 'replace' ? 'replaceState' : 'pushState'](null, '', path);

  switch (mode) {
    case MODES.HOME:
      setKeyboardContext(KEYBOARD_CONTEXTS.DISABLED);
      renderHome(homeContext());
      break;

    case MODES.PROFILE:
      setKeyboardContext(KEYBOARD_CONTEXTS.DISABLED);
      renderProfile({ user: DataManager.currentUser, decks: DataManager.filteredDecks });
      break;

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

    case MODES.NOTES:
      setKeyboardContext(KEYBOARD_CONTEXTS.DISABLED);
      renderNotes({
        user: DataManager.currentUser,
        getDeckWords: () => DataManager.filteredDecks.flatMap((d) => d.cards.map((c) => String(c.answer || '').split(/[\s/,;]+/)[0])).filter(Boolean),
      });
      break;

    case MODES.GRAMMAR:
      setKeyboardContext(KEYBOARD_CONTEXTS.DISABLED);
      renderGrammarGuide({
        learningLang: DataManager.currentUser?.learningLang,
        // Both sides of every card: the guide keeps only the ones that are Polish nouns.
        getDeckWords: () => shuffleArray(DataManager.filteredDecks.flatMap((d) => d.cards.flatMap((c) => [c.answer, c.question])))
          .map((w) => String(w || '').split(/[\s/,;]+/)[0]).filter(Boolean),
      });
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
