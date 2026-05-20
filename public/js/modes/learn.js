// ============ LEARN MODE ============

import { shuffleArray } from '../utils.js';
import { learnQuestion, learnAnswer, learnFeedback } from '../ui.js';
import { updateCardStatsFromCard } from '../data.js';

export class LearnMode {
  constructor() {
    this.sessionCards = [];
    this.sessionIndex = 0;
  }

  /**
   * Start learn session
   */
  startSession(deck, shouldShuffle = false) {
    if (!deck?.cards.length) return;

    this.sessionCards = shouldShuffle
      ? shuffleArray(deck.cards)
      : [...deck.cards];

    this.sessionIndex = 0;
    this.showQuestion();
  }

  /**
   * Show current question
   */
  showQuestion() {
    if (!this.sessionCards.length) {
      learnQuestion.textContent = 'No cards';
      return;
    }

    learnQuestion.textContent = this.sessionCards[this.sessionIndex]?.question || 'No cards';
    learnFeedback.textContent = '';
    learnAnswer.value = '';
  }

  /**
   * Submit answer
   */
  submitAnswer() {
    if (!this.sessionCards.length) return;

    const userAnswer = learnAnswer.value.trim().toLowerCase();
    const correctAnswer = this.sessionCards[this.sessionIndex].answer.toLowerCase();

    const currentCard = this.sessionCards[this.sessionIndex];
    const isCorrect = userAnswer === correctAnswer;

    learnFeedback.textContent = isCorrect
      ? '✅ Correct!'
      : `❌ ${currentCard.answer}`;

    if (currentCard) {
      updateCardStatsFromCard(currentCard, isCorrect);
    }

    // Disable input and move to next after delay
    learnAnswer.disabled = true;
    setTimeout(() => {
      this.sessionIndex = (this.sessionIndex + 1) % this.sessionCards.length;
      this.showQuestion();
      learnAnswer.disabled = false;
      learnAnswer.focus();
    }, 1500);
  }

  /**
   * Get progress
   */
  getProgress() {
    return {
      current: this.sessionIndex + 1,
      total: this.sessionCards.length
    };
  }

  /**
   * Reset
   */
  reset() {
    this.sessionCards = [];
    this.sessionIndex = 0;
  }
}

export default new LearnMode();
