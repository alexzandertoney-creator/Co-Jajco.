// ============ FLASHCARDS MODE ============

import { shuffleArray } from '../utils.js';
import { autoSpeakCard, speakText } from '../tts.js';
import { card, questionEl, answerEl } from '../ui.js';

export class FlashcardsMode {
  constructor() {
    this.currentCardIndex = 0;
    this.sessionCards = [];
    this.sessionIndex = 0;
    this.studyMode = false;
    this.activeFlashcards = [];
    this.frontIsQuestion = true;
  }

  /**
   * Start a flashcard session
   */
  startSession(deck, shouldShuffle = false) {
    if (!deck?.cards.length) return;

    this.sessionCards = shouldShuffle
      ? shuffleArray(deck.cards)
      : [...deck.cards];

    this.sessionIndex = 0;
    this.currentCardIndex = 0;
  }

  /**
   * Show classic card (non-study mode)
   */
  showClassicCard(deck, learningLang) {
    if (!deck || !deck.cards.length) return;

    const currentCard = this.activeFlashcards.length
      ? this.activeFlashcards[this.currentCardIndex]
      : deck.cards[this.currentCardIndex];

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

      requestAnimationFrame(() => {
        card.classList.remove('no-transition');
      });

      this.autoSpeak(currentCard, deck, learningLang);
    });

    const statsEl = document.getElementById('cardStats');
    if (statsEl) {
      statsEl.textContent = `✅ ${currentCard.stats.correct} | ❌ ${currentCard.stats.incorrect}`;
    }
  }

  /**
   * Show study card (study mode)
   */
  showStudyCard(deck, learningLang) {
    if (!this.sessionCards || this.sessionCards.length === 0) {
      questionEl.textContent = '🎉 Done!';
      answerEl.textContent = 'You finished the set';
      card.classList.remove('flipped');

      const progressEl = document.getElementById('cardProgress');
      if (progressEl) progressEl.textContent = '✅ Complete!';
      return;
    }

    const currentCard = this.sessionCards[this.sessionIndex];

    if (!currentCard.stats) {
      currentCard.stats = { correct: 0, incorrect: 0 };
    }

    // Force front instantly
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

      requestAnimationFrame(() => {
        card.classList.remove('no-transition');
      });
    });

    // Stats
    const statsEl = document.getElementById('cardStats');
    if (statsEl) {
      statsEl.textContent = `✅ ${currentCard.stats.correct} | ❌ ${currentCard.stats.incorrect}`;
    }

    // Progress
    const progressEl = document.getElementById('cardProgress');
    if (progressEl) {
      progressEl.textContent = `${this.sessionIndex + 1} / ${this.sessionCards.length}`;
    }

    this.autoSpeak(currentCard, deck, learningLang);
  }

  /**
   * Show card based on mode
   */
  showCard(deck, learningLang) {
    if (this.studyMode) {
      this.showStudyCard(deck, learningLang);
    } else {
      this.showClassicCard(deck, learningLang);
    }
  }

  /**
   * Auto-speak card
   */
  autoSpeak(cardData, deck, learningLang) {
    const isFlipped = card.classList.contains('flipped');
    const isFrontLearning = this.frontIsQuestion
      ? deck.learningLang === learningLang
      : deck.nativeLang === learningLang;

    autoSpeakCard(cardData, this.frontIsQuestion, isFrontLearning, isFlipped, learningLang);
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
   * Set shuffle mode for study sessions
   */
  setStudyShuffle(deck, shouldShuffle) {
    if (!this.studyMode) return;

    // Preserve the current card
    const currentCard = this.sessionCards[this.sessionIndex];

    // Reorganize cards
    this.sessionCards = shouldShuffle
      ? shuffleArray([...this.sessionCards])
      : [...deck.cards];

    // Find the current card in the new arrangement and set index
    if (currentCard) {
      this.sessionIndex = this.sessionCards.findIndex(c => c === currentCard);
      if (this.sessionIndex === -1) {
        this.sessionIndex = 0;
      }
    }
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
   * Start study mode
   */
  startStudyMode(deck, shouldShuffle = false) {
    this.studyMode = true;
    this.startSession(deck, shouldShuffle);
    this.sessionIndex = 0;
  }

  /**
   * End study mode
   */
  endStudyMode() {
    this.studyMode = false;
    this.sessionCards = [];
    this.sessionIndex = 0;
    this.currentCardIndex = 0;

    const progressEl = document.getElementById('cardProgress');
    if (progressEl) progressEl.textContent = '';
  }

  /**
   * Handle correct answer in study mode
   */
  markCorrect() {
    if (!this.studyMode || !this.sessionCards.length) return;

    const card = this.sessionCards[this.sessionIndex];
    card.stats.correct++;

    this.sessionCards.splice(this.sessionIndex, 1);
    if (this.sessionIndex >= this.sessionCards.length) {
      this.sessionIndex = Math.max(0, this.sessionCards.length - 1);
    }
  }

  /**
   * Handle incorrect answer in study mode
   */
  markIncorrect() {
    if (!this.studyMode || !this.sessionCards.length) return;

    const card = this.sessionCards[this.sessionIndex];
    card.stats.incorrect++;

    this.sessionCards.push(this.sessionCards.splice(this.sessionIndex, 1)[0]);
  }

  /**
   * Get current card
   */
  getCurrentCard(deck) {
    if (this.studyMode) {
      return this.sessionCards[this.sessionIndex] || null;
    }

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
  speakVisible(card, langCode) {
    const isFlipped = document.getElementById('card').classList.contains('flipped');
    const visibleText = isFlipped ? this.getBackText(card) : this.getFrontText(card);
    speakText(visibleText, langCode);
  }
}

export default new FlashcardsMode();
