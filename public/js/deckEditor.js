// ============ DECK EDITOR ============

import { cardList, editorQuestion, editorAnswer } from './ui.js';
import * as DataManager from './data.js';
import { langName } from './constants.js';

export class DeckEditor {
  constructor() {
    this.currentDeckIndex = 0;
  }

  /**
   * Render deck editor UI
   */
  render(filteredDecks, currentDeckIndex) {
    this.currentDeckIndex = currentDeckIndex;
    const deck = filteredDecks[currentDeckIndex];
    const isMaster = deck?.id === 'master-vocab';

    cardList.innerHTML = '';
    if (deck) {
      editorAnswer.placeholder = `${langName(deck.learningLang)} word`;
      editorQuestion.placeholder = `Meaning in ${langName(deck.nativeLang)}`;
    }
    // "All my words" is a read-only roll-up of every deck, so hide the editing tools.
    document.body.classList.toggle('editor-readonly', !deck || isMaster);

    if (!deck) {
      cardList.appendChild(hint('Create a deck with “+ New deck” to start adding cards.'));
      return;
    }
    const count = document.getElementById('cardCount');
    if (count) count.textContent = deck.cards.length ? `· ${deck.cards.length}` : '';
    if (!deck.cards.length) {
      cardList.appendChild(hint('No cards yet. Add your first one above.'));
      return;
    }

    // Built with textContent: card text comes from users, AI imports and the public library.
    deck.cards.forEach((card, index) => {
      const li = document.createElement('li');
      li.className = 'card-item';

      // Cards store question = meaning, answer = word being learned; show the word first.
      const pair = document.createElement('span');
      pair.className = 'pair';
      const word = document.createElement('strong');
      word.textContent = card.answer;
      const meaning = document.createElement('span');
      meaning.className = 'meta';
      meaning.textContent = card.question;
      pair.append(word, meaning);
      if (card.note) {
        const note = document.createElement('span');
        note.className = 'card-note';
        note.textContent = card.note;
        pair.appendChild(note);
      }
      li.appendChild(pair);

      const stats = document.createElement('span');
      stats.className = 'card-stats';
      const right = card.stats?.correct || 0;
      const missed = card.stats?.incorrect || 0;
      stats.textContent = right + missed ? `${right} right · ${missed} missed` : 'New';
      li.appendChild(stats);

      if (!isMaster) {
        const edit = document.createElement('button');
        edit.className = 'ghost small';
        edit.textContent = 'Edit';
        edit.setAttribute('aria-label', `Edit ${card.answer}`);
        edit.addEventListener('click', () => this.editCard(deck, index));
        const del = document.createElement('button');
        del.className = 'ghost danger small';
        del.textContent = 'Delete';
        del.setAttribute('aria-label', `Delete ${card.answer}`);
        del.addEventListener('click', () => this.deleteCard(deck.id, index));
        li.append(edit, del);
      }
      cardList.appendChild(li);
    });
    filterCards();
  }

  /**
   * Add card to deck
   */
  async addCard(deckIndex, question, answer, filteredDecks, note = '') {
    const deck = filteredDecks[deckIndex];
    if (!deck || deck.id === 'master-vocab') return false;

    const result = await DataManager.addCardToDeck(deck.id, question, answer, note);
    if (result) DataManager.contributeTranslations([{ word: answer, translation: question }], deck.learningLang, deck.nativeLang);
    if (result) {
      editorQuestion.value = '';
      editorAnswer.value = '';
    }
  
    return result;
  }

  /**
   * Delete card from deck
   */
  async deleteCard(deckId, cardIndex) {
    const confirmed = await confirmDialog('Delete this card?', 'It will be removed from the deck. This can’t be undone.', { confirmLabel: 'Delete', danger: true });
    if (!confirmed) return;

    const ok = await DataManager.deleteCardFromDeck(deckId, cardIndex);
    if (!ok) toast('Couldn’t delete the card. Try again.', 'error');
    this.render(DataManager.filteredDecks, this.currentDeckIndex);
  }

  /**
   * Edit card
   */
  async editCard(deck, index) {
    const card = deck.cards[index];
    const res = await formDialog('Edit card', [
      { label: `${langName(deck.learningLang)} word`, value: card.answer },
      { label: `Meaning in ${langName(deck.nativeLang)}`, value: card.question },
      { label: 'Note or example (optional)', value: card.note || '', required: false, placeholder: 'e.g. masculine · Mam kota = I have a cat' },
    ]);
    if (!res) return;
    const [newAnswer, newQuestion, newNote] = res;
    if (!newQuestion || !newAnswer) return toast('Both sides of the card need text.', 'error');

    const ok = await DataManager.updateCard(deck.id, index, newQuestion, newAnswer, newNote);
    if (!ok) toast('Couldn’t save your changes. Try again.', 'error');
    else DataManager.contributeTranslations([{ word: newAnswer, translation: newQuestion }], deck.learningLang, deck.nativeLang);
    this.render(DataManager.filteredDecks, this.currentDeckIndex);
  }

  /**
   * Bulk translate words to deck
   */
  async bulkTranslate(words, deckIndex, filteredDecks, sourceLang, targetLang) {
    const deck = filteredDecks[deckIndex];
    if (!deck || deck.id === 'master-vocab') return;

    for (const word of words) {
      try {
        const translated = await this.translateWord(word, sourceLang, targetLang);
        await DataManager.addCardToDeck(deck.id, word, translated);
      } catch (error) {
        console.error(`Failed to translate "${word}":`, error);
      }
    }
  }

  /**
   * Translate single word (stub - implement with real API)
   */
  async translateWord(word, sourceLang, targetLang) {
    // This would call your translation API
    // For now, return placeholder
    console.warn(`Translation for "${word}" not implemented`);
    return `[${word} in ${targetLang}]`;
  }

  /**
   * Delete entire deck
   */
  async deleteDeck(deckId, onDeleteCallback) {
    if (!deckId || deckId === 'master-vocab') return;

    const confirmed = await confirmDialog('Delete this deck?', 'The deck and all its cards will be removed. This can’t be undone.', { confirmLabel: 'Delete deck', danger: true });
    if (!confirmed) return;

    const ok = await DataManager.deleteDeck(deckId);
    if (ok === false) return toast('Couldn’t delete the deck. Try again.', 'error');
    onDeleteCallback?.();
  }

  /**
   * Export deck as JSON
   */
  exportDeck(deck) {
    const dataStr = JSON.stringify(deck, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${deck.name}.json`;
    link.click();
  }

  /**
   * Import deck from JSON file
   */
  async importDeck(file, learningLang, nativeLang) {
    return new Promise(async (resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const deckData = JSON.parse(e.target.result);
          const deckName = deckData.name || file.name.replace('.json', '');
          
          // Create deck on server
          const deck = await DataManager.createDeck(deckName, learningLang, nativeLang);
          
          if (!deck) {
            reject(new Error('Failed to create deck on server'));
            return;
          }

          // Add cards to the deck
          if (Array.isArray(deckData.cards)) {
            for (const card of deckData.cards) {
              const success = await DataManager.addCardToDeck(
                deck.id,
                card.question || '',
                card.answer || ''
              );
              console.log('Importing:', card.question, success);
            }
          }

          resolve(deck);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

/**
   * Import deck from JSON text
   */
  async importDeckFromJson(jsonString, learningLang, nativeLang, deckName) {
    let cards;
    try {
      // AI chats often wrap JSON in ```json fences; strip them before parsing.
      cards = JSON.parse(jsonString.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''));
    } catch {
      return null;
    }
    if (!Array.isArray(cards)) return null;

    const normalizedCards = cards
      .map(card => {
        const note = String(card.note || card.example || '').trim();
        return {
          question: String(card.question || card.text || card.front || '').trim(),
          answer: String(card.answer || card.translation || card.back || '').trim(),
          ...(note ? { note } : {}),
          stats: { correct: 0, incorrect: 0 },
        };
      })
      .filter(card => card.question && card.answer);
    if (!normalizedCards.length) return null;

    DataManager.contributeTranslations(normalizedCards.map((c) => ({ word: c.answer, translation: c.question })), learningLang, nativeLang);
    // One request for the whole deck (this used to be one PUT per card, with delays).
    return DataManager.createDeck(deckName || `AI deck ${new Date().toLocaleDateString()}`, learningLang, nativeLang, normalizedCards);
  }

  /**
   * Swap front and back of every card (fixes decks made with the sides reversed).
   */
  async swapAllSides(deck) {
    if (!deck || deck.id === 'master-vocab' || !deck.cards.length) return;
    const ok = await confirmDialog('Swap sides of all cards?', `Every card in “${deck.name}” will have its two sides switched. Use this if the ${langName(deck.learningLang)} words are on the wrong side.`, { confirmLabel: 'Swap sides' });
    if (!ok) return;
    const swapped = deck.cards.map(c => ({ ...c, question: c.answer, answer: c.question }));
    if (await DataManager.setDeckCards(deck.id, swapped)) toast('Swapped both sides of every card.', 'success');
    else toast('Couldn’t save the swap. Try again.', 'error');
    this.render(DataManager.filteredDecks, this.currentDeckIndex);
  }
}

export default new DeckEditor();

function hint(text) {
  const li = document.createElement('li');
  li.className = 'empty-hint';
  li.textContent = text;
  return li;
}

// Filters the visible card rows by the "Find a card" box (word, meaning or note).
export function filterCards() {
  const q = (document.getElementById('cardSearch')?.value || '').trim().toLowerCase();
  let shown = 0;
  cardList.querySelectorAll('li.card-item').forEach((li) => {
    const hit = !q || li.textContent.toLowerCase().includes(q);
    li.hidden = !hit;
    if (hit) shown++;
  });
  let none = cardList.querySelector('.no-match');
  if (q && !shown) {
    if (!none) { none = hint(''); none.classList.add('no-match'); cardList.appendChild(none); }
    none.textContent = `No cards match “${q}”.`;
  } else none?.remove();
}
