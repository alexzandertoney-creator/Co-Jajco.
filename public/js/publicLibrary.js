import * as DataManager from './data.js';
import * as UI from './ui.js';
import { LANGUAGE_LEVELS, LANGUAGES } from './constants.js';

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

  UI.publicLibraryDeckList.style.display = tab === 'decks' ? 'block' : 'none';
  UI.publicLibraryStoryList.style.display = tab === 'stories' ? 'block' : 'none';

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
    alert('Unable to load public library. Try again later.');
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
    UI.publicLibraryDeckList.innerHTML = '<p style="color:#666;">No public decks found. Try a different language or level.</p>';
    return;
  }

  decks.forEach(deck => {
    const card = document.createElement('div');
    card.className = 'public-library-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="flex:1;">
          <h3 style="margin:0 0 6px;">${deck.name}</h3>
          <p style="margin:0 0 6px; color:#555; font-size:14px;">${deck.learningLang || 'Unknown'} → ${deck.nativeLang || 'Unknown'} · ${deck.level || 'Unspecified'}</p>
          <p style="margin:0; color:#777; font-size:12px;">By ${deck.author || 'Anonymous'} · ${new Date(deck.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
        <button type="button" data-action="import-deck" data-deck-id="${deck.id}">Import Deck</button>
        <button type="button" data-action="copy-deck-json" data-deck-id="${deck.id}">Copy JSON</button>
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
    UI.publicLibraryStoryList.innerHTML = '<p style="color:#666;">No public stories found. Try a different language or level.</p>';
    return;
  }

  stories.forEach(story => {
    const card = document.createElement('div');
    card.className = 'public-library-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="flex:1;">
          <h3 style="margin:0 0 6px;">${story.title || 'Published Story'}</h3>
          <p style="margin:0 0 6px; color:#555; font-size:14px;">${story.learningLang || 'Unknown'} → ${story.nativeLang || 'Unknown'} · ${story.level || 'Unspecified'}</p>
          <p style="margin:0; color:#777; font-size:12px;">By ${story.author || 'Anonymous'} · ${new Date(story.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
        <button type="button" data-action="copy-story-json" data-story-id="${story.id}">Copy JSON</button>
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
      alert('Failed to create deck on server');
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
    alert(`Imported public deck: ${localDeckName}`);
  } catch (error) {
    console.error('Failed to import public deck:', error);
    alert('Failed to import deck');
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied to clipboard');
  }).catch(err => {
    console.error('Copy failed:', err);
    alert('Unable to copy');
  });
}

export async function publishCurrentDeck(deck, level) {
  if (!deck || !Array.isArray(deck.cards)) {
    alert('No deck selected to publish.');
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
    alert(`Deck published as "${published.name}"`);
    loadPublicLibrary();
  } catch (error) {
    console.error('Publish deck failed:', error);
    alert(`Unable to publish deck: ${error.message}`);
  }
}

export async function publishCurrentStory(data, level, title) {
  if (!data?.story || !Array.isArray(data.tokens)) {
    alert('No story loaded to publish. Analyze a story first.');
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
    alert(`Story published as "${published.title || 'Published Story'}"`);
    loadPublicLibrary();
  } catch (error) {
    console.error('Publish story failed:', error);
    alert(`Unable to publish story: ${error.message}`);
  }
}
