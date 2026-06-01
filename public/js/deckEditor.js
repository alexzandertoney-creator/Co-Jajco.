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

    cardList.innerHTML = '';

    if (!deck) return;

    if (!deck.cards.length) {
      cardList.innerHTML = '<li>No cards yet. Add one above!</li>';
    }

    // Show Master Vocab as read-only with stats
    if (deck.id === 'master-vocab') {
      deck.cards.forEach((card, index) => {
        const li = document.createElement('li');
        li.className = 'card-item';
        li.style.opacity = '0.6';

        const statsSpan = document.createElement('span');
        statsSpan.style.marginLeft = '10px';
        statsSpan.style.fontSize = '12px';
        statsSpan.style.color = '#666';
        statsSpan.textContent =
          `✅ ${card.stats?.correct || 0} | ❌ ${card.stats?.incorrect || 0}`;

        li.innerHTML = `<strong>${card.question}</strong> → ${card.answer}`;
        li.appendChild(statsSpan);

        cardList.appendChild(li);
      });
      return;
    }

    // Normal deck: editable
    deck.cards.forEach((card, index) => {
      const li = document.createElement('li');
      li.className = 'card-item';

      li.innerHTML = `
        <strong>${card.question}</strong> → ${card.answer}
        <button class="btn-edit" data-index="${index}">✏️</button>
        <button class="btn-delete" data-index="${index}">🗑️</button>
      `;

      li.querySelector('.btn-delete').addEventListener('click', () => {
        this.deleteCard(deck.id, index);
      });

      li.querySelector('.btn-edit').addEventListener('click', () => {
        this.editCard(deck, index);
      });

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
    const confirmed = confirm('Delete this card? This cannot be undone.');
    if (!confirmed) return;

    await DataManager.deleteCardFromDeck(deckId, cardIndex);
    this.render(DataManager.filteredDecks, this.currentDeckIndex);
  }

  /**
   * Edit card
   */
  async editCard(deck, index) {
    const card = deck.cards[index];
    const newQuestion = prompt('Edit question:', card.question);
    if (newQuestion === null) return;

    const newAnswer = prompt('Edit answer:', card.answer);
    if (newAnswer === null) return;

    await DataManager.updateCard(deck.id, index, newQuestion, newAnswer);
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

    const confirmed = confirm('Delete this entire deck? This cannot be undone.');
    if (!confirmed) return;

    await DataManager.deleteDeck(deckId);
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
              await DataManager.addCardToDeck(
                deck.id,
                card.question || '',
                card.answer || ''
              );
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

      // Add cards to the deck
      for (const card of normalizedCards) {
        await DataManager.addCardToDeck(deck.id, card.question, card.answer);
      }

      return deck;
    } catch (error) {
      console.error('Failed to import deck from JSON:', error);
      return null;
    }
  }
}

export default new DeckEditor();
