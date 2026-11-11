// ============ DECK EDITOR ============

import { cardList, editorQuestion, editorAnswer } from './ui.js';
import * as DataManager from './data.js';

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
    // Master Vocab is a read-only roll-up of every deck, so hide the editing tools.
    document.body.classList.toggle('editor-readonly', !deck || isMaster);

    if (!deck) {
      cardList.appendChild(hint('Create a deck with “+ New deck” to start adding cards.'));
      return;
    }
    if (!deck.cards.length) {
      cardList.appendChild(hint('No cards yet. Add your first one above.'));
      return;
    }

    // Built with textContent: card text comes from users, AI imports and the public library.
    deck.cards.forEach((card, index) => {
      const li = document.createElement('li');
      li.className = 'card-item';

      const pair = document.createElement('span');
      pair.className = 'pair';
      const q = document.createElement('strong');
      q.textContent = card.question;
      const a = document.createElement('span');
      a.className = 'meta';
      a.textContent = card.answer;
      pair.append(q, a);
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
        edit.setAttribute('aria-label', `Edit ${card.question}`);
        edit.addEventListener('click', () => this.editCard(deck, index));
        const del = document.createElement('button');
        del.className = 'ghost danger small';
        del.textContent = 'Delete';
        del.setAttribute('aria-label', `Delete ${card.question}`);
        del.addEventListener('click', () => this.deleteCard(deck.id, index));
        li.append(edit, del);
      }
      cardList.appendChild(li);
    });
  }

  /**
   * Add card to deck
   */
  async addCard(deckIndex, question, answer, filteredDecks) {
    const deck = filteredDecks[deckIndex];
    if (!deck || deck.id === 'master-vocab') return false;

    const result = await DataManager.addCardToDeck(deck.id, question, answer);
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
      { label: 'Word or phrase', value: card.question },
      { label: 'Translation', value: card.answer },
    ]);
    if (!res) return;
    const [newQuestion, newAnswer] = res;
    if (!newQuestion || !newAnswer) return toast('Both sides of the card need text.', 'error');

    const ok = await DataManager.updateCard(deck.id, index, newQuestion, newAnswer);
    if (!ok) toast('Couldn’t save your changes. Try again.', 'error');
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
    try {
      const cards = JSON.parse(jsonString);
      if (!Array.isArray(cards)) return null;

      const normalizedCards = cards
        .map(card => ({
          question: String(card.question || card.text || card.front || '').trim(),
          answer: String(card.answer || card.translation || card.back || '').trim()
        }))
        .filter(card => card.question && card.answer);

      if (!normalizedCards.length) return null;

      const finalDeckName = deckName || `AI Curation ${new Date().toLocaleDateString()}`;
      
      // Create deck on server
      const deck = await DataManager.createDeck(finalDeckName, learningLang, nativeLang);
      
      if (!deck) {
        console.error('Failed to create deck on server');
        return null;
      }

      // Process cards sequentially with retries and a small delay to avoid
      // backend timeouts or rate limits. Concurrent PUTs can cause overwrites
      // on some hosting environments, so a sequential approach is more robust.
      const sleep = (ms) => new Promise(res => setTimeout(res, ms));
      const maxRetries = 3;
      const delayBetweenCards = 200; // ms
      const failed = [];

      for (const card of normalizedCards) {
        let success = false;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            success = await DataManager.addCardToDeck(deck.id, card.question, card.answer);
            console.log(`Imported "${card.question}"`, success, `(attempt ${attempt})`);
            if (success) break;
          } catch (err) {
            console.error(`Error importing "${card.question}" on attempt ${attempt}:`, err);
          }

          // Exponential backoff before retrying
          await sleep(100 * attempt);
        }

        if (!success) {
          failed.push(card);
          console.error('Failed to import card after retries:', card);
        }

        // Small delay between cards to be gentle on the server
        await sleep(delayBetweenCards);
      }

      if (failed.length) {
        console.warn(`${failed.length} cards failed to import.`);
      }

      return deck;
    } catch (error) {
      console.error('Failed to import deck from JSON:', error);
      return null;
    }
  }
}

export default new DeckEditor();

function hint(text) {
  const li = document.createElement('li');
  li.className = 'empty-hint';
  li.textContent = text;
  return li;
}
