// ============ TEST MODE ============

import { testQuestion, testOptions, testFeedback, testScore } from '../ui.js';
import { updateCardStatsFromCard } from '../data.js';

export class TestMode {
  constructor() {
    this.score = 0;
    this.currentDeck = null;
    this.currentCard = null;
  }

  /**
   * Start test
   */
  start(deck) {
    if (!deck?.cards.length) return;

    this.currentDeck = deck;
    this.score = 0;
    this.updateScore();
    this.showQuestion(deck);
  }

  /**
   * Show test question with multiple choice
   */
  showQuestion(deck = this.currentDeck) {
    if (!deck?.cards.length) return;

    const correct = deck.cards[Math.floor(Math.random() * deck.cards.length)];
    this.currentCard = correct;
    const options = [correct.answer];

    while (options.length < Math.min(4, deck.cards.length)) {
      const rand = deck.cards[Math.floor(Math.random() * deck.cards.length)].answer;
      if (!options.includes(rand)) {
        options.push(rand);
      }
    }

    options.sort(() => Math.random() - 0.5);
    testQuestion.textContent = correct.question;
    testOptions.innerHTML = '';
    testFeedback.textContent = '';

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.classList.add('test-option');
      btn.addEventListener('click', () => this.checkAnswer(opt, correct.answer, btn));
      testOptions.appendChild(btn);
    });
  }

  /**
   * Check answer
   */
  checkAnswer(selected, correct, btn) {
    const isCorrect = selected === correct;

    btn.classList.add(isCorrect ? 'correct' : 'incorrect');
    testFeedback.textContent = isCorrect ? '✅ Correct!' : `❌ Wrong! Answer: ${correct}`;

    if (this.currentCard) {
      updateCardStatsFromCard(this.currentCard, isCorrect);
    }

    if (isCorrect) {
      this.score++;
      this.updateScore();
    }

    // Disable all buttons
    document.querySelectorAll('.test-option').forEach(b => b.disabled = true);

    // Show next question after delay
    setTimeout(() => {
      this.showQuestion();
    }, 1500);
  }

  /**
   * Update score display
   */
  updateScore() {
    testScore.textContent = `Score: ${this.score}`;
  }

  /**
   * Reset
   */
  reset() {
    this.score = 0;
  }
}

export default new TestMode();
