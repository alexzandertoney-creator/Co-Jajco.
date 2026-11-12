import { mascot, loader } from './art.js';
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
  // Changing a filter reloads the list (it used to wait for Refresh).
  UI.publicLibraryFilterLang?.addEventListener('change', loadPublicLibrary);
  UI.publicLibraryFilterLevel?.addEventListener('change', loadPublicLibrary);

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
 

  UI.publicLibraryDeckList.innerHTML = loader('Loading the Library…');
  UI.publicLibraryStoryList.innerHTML = loader('Loading the Library…');
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
    UI.publicLibraryDeckList.innerHTML = `<div class="empty-hint with-art">${mascot('rest')}<p>No public decks here yet. Try a different language or level — or share one of yours.</p></div>`;
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
        <button type="button" class="link-btn" data-action="report">Report</button>
      </div>
    `;

    const importBtn = card.querySelector('[data-action="import-deck"]');
    const copyBtn = card.querySelector('[data-action="copy-deck-json"]');

    importBtn?.addEventListener('click', async () => await importPublicDeck(deck));
    card.querySelector('[data-action="report"]')?.addEventListener('click', () => reportItem('deck', deck, card));
    copyBtn?.addEventListener('click', () => copyText(JSON.stringify(deck, null, 2)));

    UI.publicLibraryDeckList.appendChild(card);
  });
}

function renderStoryList(stories) {
  if (!UI.publicLibraryStoryList) return;
  UI.publicLibraryStoryList.innerHTML = '';

  if (!stories.length) {
    UI.publicLibraryStoryList.innerHTML = `<div class="empty-hint with-art">${mascot('rest')}<p>No public stories here yet. Try a different language or level — or share one from the reader.</p></div>`;
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
        <button type="button" data-action="read-story">Read</button>
        <button type="button" class="ghost" data-action="copy-story-json" data-story-id="${esc(story.id)}">Copy JSON</button>
        <button type="button" class="link-btn" data-action="report">Report</button>
      </div>
    `;

    const copyBtn = card.querySelector('[data-action="copy-story-json"]');
    copyBtn?.addEventListener('click', () => copyText(JSON.stringify(story, null, 2)));
    // Opens in the reader (and saves a copy to the reader's Past stories).
    card.querySelector('[data-action="report"]')?.addEventListener('click', () => reportItem('story', story, card));
    card.querySelector('[data-action="read-story"]')?.addEventListener('click', () =>
      window.dispatchEvent(new CustomEvent('openStory', { detail: story })));
    UI.publicLibraryStoryList.appendChild(card);
  });
}

async function importPublicDeck(deck) {
  if (!deck || !Array.isArray(deck.cards)) return;

  try {
    const localDeckName = deck.name || 'Imported Deck';
    const learningLang = deck.learningLang || DataManager.currentUser?.learningLang || 'en';
    const nativeLang = deck.nativeLang || DataManager.currentUser?.nativeLang || 'en';

    const cards = deck.cards
      .filter((c) => c && (c.question || c.answer))
      .map((c) => ({ question: c.question || '', answer: c.answer || '', ...(c.note ? { note: c.note } : {}), stats: { correct: 0, incorrect: 0 } }));
    // One request for the whole deck (used to be one PUT per card).
    const newDeck = await DataManager.createDeck(localDeckName, learningLang, nativeLang, cards);
    if (!newDeck) {
      toast('Couldn’t add the deck. Try again.', 'error');
      return;
    }

    DataManager.updateFilteredDecks();
    UI.updateDeckSelect(DataManager.filteredDecks);
    toast(`Added “${localDeckName}” to your decks.`, 'success');
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

// Report something inappropriate or wrong; enough reports hide it for everyone.
async function reportItem(kind, item, cardEl) {
  const res = await formDialog(`Report this ${kind}?`, [
    { label: 'What’s wrong? (optional)', required: false, placeholder: 'e.g. offensive, spam, lots of wrong translations' },
  ], { confirmLabel: 'Send report', message: `“${item.name || item.title}” will be hidden once several people report it.` });
  if (!res) return;
  try {
    const r = await fetch('/api/library/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ kind, id: item.id, reason: res[0] }),
    });
    if (!r.ok) throw new Error(r.status);
    cardEl.remove(); // hide it for the reporter right away
    toast('Thanks. The report was sent and it’s hidden for you.', 'success');
  } catch {
    toast('Couldn’t send the report. Try again.', 'error');
  }
}
