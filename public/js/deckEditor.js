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
  addCard(deckIndex, question, answer, filteredDecks) {
    const deck = filteredDecks[deckIndex];
    if (!deck || deck.id === 'master-vocab') return false;

    DataManager.addCardToDeck(deck.id, question, answer);
    editorQuestion.value = '';
    editorAnswer.value = '';

    return true;
  }

  /**
   * Delete card from deck
   */
  deleteCard(deckId, cardIndex) {
    const confirmed = confirm('Delete this card? This cannot be undone.');
    if (!confirmed) return;

    DataManager.deleteCardFromDeck(deckId, cardIndex);
    DataManager.saveDecks();
    this.render(DataManager.filteredDecks, this.currentDeckIndex);
  }

  /**
   * Edit card
   */
  editCard(deck, index) {
    const card = deck.cards[index];
    const newQuestion = prompt('Edit question:', card.question);
    if (newQuestion === null) return;

    const newAnswer = prompt('Edit answer:', card.answer);
    if (newAnswer === null) return;

    DataManager.updateCard(deck.id, index, newQuestion, newAnswer);
    DataManager.saveDecks();
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
        DataManager.addCardToDeck(deck.id, word, translated);
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
  deleteDeck(deckId, onDeleteCallback) {
    if (!deckId || deckId === 'master-vocab') return;

    const confirmed = confirm('Delete this entire deck? This cannot be undone.');
    if (!confirmed) return;

    DataManager.deleteDeck(deckId);
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const deck = JSON.parse(e.target.result);
          deck.id = Date.now();
          deck.learningLang = learningLang;
          deck.nativeLang = nativeLang;

          DataManager.decks.push(deck);
          DataManager.saveDecks();

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
  importDeckFromJson(jsonString, learningLang, nativeLang, deckName) {
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

      const deck = {
        id: Date.now(),
        name: deckName || `AI Curation ${new Date().toLocaleDateString()}`,
        learningLang,
        nativeLang,
        cards: normalizedCards
      };

      DataManager.decks.push(deck);
      DataManager.saveDecks();

      return deck;
    } catch (error) {
      console.error('Failed to import deck from JSON:', error);
      return null;
    }
  }
}

export default new DeckEditor();
