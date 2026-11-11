import { esc } from './utils.js';
import * as DataManager from './data.js';
import * as UI from './ui.js';
import { LANGUAGE_LEVELS, LANGUAGES, langName } from './constants.js';

let activeTab = 'decks';

export function initPublicLibrary() {
  populateFilterOptions();

  UI.publicLibraryShowDecksBtn?.addEventListener('click', () => setActiveTab('decks'));
  UI.publicLibraryShowStoriesBtn?.addEventListener('click', () => setActiveTab('stories'));
  UI.refreshPublicLibraryBtn?.addEventListener('click', loadPublicLibrary);

  setActiveTab('decks');
  loadPublicLibrary();
}

function populateFilterOptions() {
  if (UI.publicLibraryFilterLang) {
    UI.publicLibraryFilterLang.innerHTML = '<option value="">All languages</option>' + LANGUAGES.map(lang => `<option value="${lang.code}">${lang.name}</option>`).join('');
  }

  if (UI.publicLibraryFilterLevel) {
    UI.publicLibraryFilterLevel.innerHTML = '<option value="">All levels</option>' + LANGUAGE_LEVELS.map(level => `<option value="${level}">${level}</option>`).join('');
  }
}

function setActiveTab(tab) {
  activeTab = tab;
  if (!UI.publicLibraryDeckList || !UI.publicLibraryStoryList) return;

  UI.publicLibraryDeckList.style.display = tab === 'decks' ? 'grid' : 'none';
  UI.publicLibraryStoryList.style.display = tab === 'stories' ? 'grid' : 'none';

  UI.publicLibraryShowDecksBtn?.classList.toggle('active', tab === 'decks');
  UI.publicLibraryShowStoriesBtn?.classList.toggle('active', tab === 'stories');
}

function getFilters() {
  return {
    learningLang: UI.publicLibraryFilterLang?.value || '',
    level: UI.publicLibraryFilterLevel?.value || ''
  };
}

async function loadPublicLibrary() {
  if (!UI.refreshPublicLibraryBtn) return;
 

  try {
    const filters = getFilters();
    const [decks, stories] = await Promise.all([
      fetchPublicDecks(filters),
      fetchPublicStories(filters)
    ]);

    renderDeckList(decks);
    renderStoryList(stories);
  } catch (error) {
    console.error('Failed to load public library:', error);
    toast('Unable to load public library. Try again later.', 'error');
  } finally {
    
  }
}

async function fetchPublicDecks(filters) {
  const params = new URLSearchParams();
  if (filters.learningLang) params.append('learningLang', filters.learningLang);
  if (filters.level) params.append('level', filters.level);
  params.append('limit', '100');

  const res = await fetch(`/api/library/public-decks?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load decks');
  return res.json();
}

async function fetchPublicStories(filters) {
  const params = new URLSearchParams();
  if (filters.learningLang) params.append('learningLang', filters.learningLang);
  if (filters.level) params.append('level', filters.level);
  params.append('limit', '100');

  const res = await fetch(`/api/library/public-stories?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load stories');
  return res.json();
}

function renderDeckList(decks) {
  if (!UI.publicLibraryDeckList) return;
  UI.publicLibraryDeckList.innerHTML = '';

  if (!decks.length) {
    UI.publicLibraryDeckList.innerHTML = '<p class="empty-hint">No public decks found. Try a different language or level.</p>';
    return;
  }

  decks.forEach(deck => {
    const card = document.createElement('div');
    card.className = 'public-library-card';
    card.innerHTML = `
      <div>
          <h3>${esc(deck.name)}</h3>
          <p class="lib-lang">${esc(langName(deck.learningLang))} → ${esc(langName(deck.nativeLang))} · ${esc(deck.level || 'Any level')}</p>
          <p class="meta">By ${esc(deck.author || 'Anonymous')} · ${esc(new Date(deck.created_at).toLocaleDateString())}</p>
        </div>
      <div class="lib-actions">
        <button type="button" data-action="import-deck" data-deck-id="${esc(deck.id)}">Add to my decks</button>
        <button type="button" class="ghost" data-action="copy-deck-json" data-deck-id="${esc(deck.id)}">Copy JSON</button>
      </div>
    `;

    const importBtn = card.querySelector('[data-action="import-deck"]');
    const copyBtn = card.querySelector('[data-action="copy-deck-json"]');

    importBtn?.addEventListener('click', async () => await importPublicDeck(deck));
    copyBtn?.addEventListener('click', () => copyText(JSON.stringify(deck, null, 2)));

    UI.publicLibraryDeckList.appendChild(card);
  });
}

function renderStoryList(stories) {
  if (!UI.publicLibraryStoryList) return;
  UI.publicLibraryStoryList.innerHTML = '';

  if (!stories.length) {
    UI.publicLibraryStoryList.innerHTML = '<p class="empty-hint">No public stories found. Try a different language or level.</p>';
    return;
  }

  stories.forEach(story => {
    const card = document.createElement('div');
    card.className = 'public-library-card';
    card.innerHTML = `
      <div>
          <h3>${esc(story.title || 'Published Story')}</h3>
          <p class="lib-lang">${esc(langName(story.learningLang))} → ${esc(langName(story.nativeLang))} · ${esc(story.level || 'Any level')}</p>
          <p class="meta">By ${esc(story.author || 'Anonymous')} · ${esc(new Date(story.created_at).toLocaleDateString())}</p>
        </div>
      <div class="lib-actions">
        <button type="button" class="ghost" data-action="copy-story-json" data-story-id="${esc(story.id)}">Copy JSON</button>
      </div>
    `;

    const copyBtn = card.querySelector('[data-action="copy-story-json"]');
    copyBtn?.addEventListener('click', () => copyText(JSON.stringify(story, null, 2)));
    UI.publicLibraryStoryList.appendChild(card);
  });
}

async function importPublicDeck(deck) {
  if (!deck || !Array.isArray(deck.cards)) return;

  try {
    const localDeckName = deck.name || 'Imported Deck';
    const learningLang = deck.learningLang || DataManager.currentUser?.learningLang || 'en';
    const nativeLang = deck.nativeLang || DataManager.currentUser?.nativeLang || 'en';

    // Create deck on server
    const newDeck = await DataManager.createDeck(localDeckName, learningLang, nativeLang);
    
    if (!newDeck) {
      toast('Failed to create deck on server', 'error');
      return;
    }

    // Add cards to the deck
    for (const card of deck.cards) {
      await DataManager.addCardToDeck(
        newDeck.id,
        card.question || '',
        card.answer || ''
      );
    }

    DataManager.updateFilteredDecks();
    UI.updateDeckSelect(DataManager.filteredDecks);
    toast(`Imported public deck: ${localDeckName}`, 'success');
  } catch (error) {
    console.error('Failed to import public deck:', error);
    toast('Failed to import deck', 'error');
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    toast('Copied to clipboard', 'success');
  }).catch(err => {
    console.error('Copy failed:', err);
    toast('Unable to copy', 'error');
  });
}

export async function publishCurrentDeck(deck, level) {
  if (!deck || !Array.isArray(deck.cards)) {
    toast('No deck selected to publish.', 'error');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const payload = {
      name: deck.name,
      learningLang: deck.learningLang,
      nativeLang: deck.nativeLang,
      level: level || 'Unspecified',
      cards: deck.cards
    };

    const res = await fetch('/api/library/public-decks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body?.error || 'Publish failed');
    }

    const published = await res.json();
    toast(`Deck published as "${published.name}"`, 'success');
    loadPublicLibrary();
  } catch (error) {
    console.error('Publish deck failed:', error);
    toast(`Unable to publish deck: ${error.message}`, 'error');
  }
}

export async function publishCurrentStory(data, level, title) {
  if (!data?.story || !Array.isArray(data.tokens)) {
    toast('No story loaded to publish. Analyze a story first.', 'error');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const finalTitle = title || `Story ${new Date().toLocaleDateString()}`;
    const payload = {
      title: finalTitle,
      story: data.story,
      tokens: data.tokens,
      learningLang: data.learningLang || DataManager.currentUser?.learningLang || 'en',
      nativeLang: data.nativeLang || DataManager.currentUser?.nativeLang || 'en',
      level: level || 'Unspecified'
    };

    const res = await fetch('/api/library/public-stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body?.error || 'Publish failed');
    }

    const published = await res.json();
    toast(`Story published as "${published.title || 'Published Story'}"`, 'success');
    loadPublicLibrary();
  } catch (error) {
    console.error('Publish story failed:', error);
    toast(`Unable to publish story: ${error.message}`, 'error');
  }
}
