// ============ FLASHCARDS MODE ============

import { shuffleArray } from '../utils.js';
import { autoSpeakCard, speakText } from '../tts.js';
import { card, questionEl, answerEl } from '../ui.js';
import { showCardGrammar } from '../grammar.js';

export class FlashcardsMode {
  constructor() {
    this.currentCardIndex = 0;
    this.activeFlashcards = [];
    this.frontIsQuestion = true;
  }


  /**
   * Show classic card (non-study mode)
   */
  showClassicCard(deck, learningLang) {
    if (!deck || !deck.cards.length) return;

    const cards = this.activeFlashcards.length ? this.activeFlashcards : deck.cards;
    // Guard against an index left over from a longer deck.
    if (this.currentCardIndex >= cards.length) this.currentCardIndex = 0;
    const currentCard = cards[this.currentCardIndex];

    const progressEl = document.getElementById('cardProgress');
    if (progressEl) progressEl.textContent = `${this.currentCardIndex + 1} / ${cards.length}`;

    if (!currentCard.stats) {
      currentCard.stats = { correct: 0, incorrect: 0 };
    }

    // Force front side
    card.classList.add('no-transition');
    card.classList.remove('flipped');

    requestAnimationFrame(() => {
      if (this.frontIsQuestion) {
        questionEl.textContent = currentCard.question;
        answerEl.textContent = currentCard.answer;
      } else {
        questionEl.textContent = currentCard.answer;
        answerEl.textContent = currentCard.question;
      }
      showNote(currentCard);
      showCardGrammar(card, currentCard, this.frontIsQuestion, learningLang);

      requestAnimationFrame(() => {
        card.classList.remove('no-transition');
      });

      this.autoSpeak(currentCard, deck, learningLang);
    });

  }


  /**
   * Show card based on mode
   */
  showCard(deck, learningLang) {
    this.showClassicCard(deck, learningLang);
  }

  /**
   * Auto-speak card
   */
  autoSpeak(cardData, deck, learningLang) {
    const isFlipped = card.classList.contains('flipped');
    // question = meaning (native language), answer = word being learned.
    const isFrontLearning = !this.frontIsQuestion;

    autoSpeakCard(cardData, this.frontIsQuestion, isFrontLearning, isFlipped, learningLang, deck.nativeLang);
  }

  /**
   * Toggle card flip
   */
  toggleFlip() {
    card.classList.toggle('flipped');
  }

  /**
   * Reset card to front
   */
  resetCardToFront() {
    card.classList.remove('flipped');
  }

  /**
   * Next card
   */
  nextCard(deck) {
    if (!deck?.cards.length) return;

    this.resetCardToFront();
    const cardsLength = this.activeFlashcards.length || deck.cards.length;
    this.currentCardIndex = (this.currentCardIndex + 1) % cardsLength;
  }

  /**
   * Previous card
   */
  prevCard(deck) {
    if (!deck?.cards.length) return;

    this.resetCardToFront();
    const cardsLength = this.activeFlashcards.length || deck.cards.length;
    this.currentCardIndex = (this.currentCardIndex - 1 + cardsLength) % cardsLength;
  }

  /**
   * Swap front/back
   */
  swapSides() {
    this.frontIsQuestion = !this.frontIsQuestion;
    this.resetCardToFront();
  }


  /**
   * Set shuffle mode
   */
  setShuffleMode(deck, shouldShuffle) {
    this.activeFlashcards = shouldShuffle
      ? shuffleArray([...deck.cards])
      : [...deck.cards];

    this.currentCardIndex = 0;
  }





  /**
   * Get current card
   */
  getCurrentCard(deck) {
    const cards = this.activeFlashcards.length ? this.activeFlashcards : deck.cards;
    return cards[this.currentCardIndex] || null;
  }

  /**
   * Get front text
   */
  getFrontText(card) {
    return this.frontIsQuestion ? card.question : card.answer;
  }

  /**
   * Get back text
   */
  getBackText(card) {
    return this.frontIsQuestion ? card.answer : card.question;
  }

  /**
   * Speak visible text
   */
  speakVisible(card, langCode, nativeLang = 'en') {
    const isFlipped = document.getElementById('card').classList.contains('flipped');
    const visibleText = isFlipped ? this.getBackText(card) : this.getFrontText(card);
    // question = meaning (native); the visible side is the question when front-is-question XOR flipped
    const showingQuestion = this.frontIsQuestion !== isFlipped;
    speakText(visibleText, showingQuestion ? nativeLang : langCode);
  }
}

export default new FlashcardsMode();

// Notes and example sentences appear under the answer on the back of the card.
function showNote(cardData) {
  const el = document.getElementById('answerNote');
  if (!el) return;
  el.textContent = cardData?.note || '';
  el.hidden = !cardData?.note;
}
