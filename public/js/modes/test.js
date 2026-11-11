// ============ TEST MODE ============
// Multiple-choice rounds of up to 10 questions, no repeats, with a results screen.

import { shuffleArray } from '../utils.js';
import { testQuestion, testOptions, testFeedback, testScore, renderResults } from '../ui.js';
import { updateCardStatsFromCard } from '../data.js';

const ROUND_SIZE = 10;
const $ = (id) => document.getElementById(id);

export class TestMode {
  constructor() {
    this.deck = null;
    this.queue = [];
    this.index = 0;
    this.score = 0;
    this.answered = false;
    this.nextTimer = null;

    // 1–4 picks an option while Test is on screen.
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || this.answered) return;
      if (e.target.closest?.('input, textarea, select') || document.querySelector('dialog[open]')) return;
      if ($('testContainer')?.style.display !== 'flex' || $('testPanel').hidden) return;
      const btn = testOptions.children[Number(e.key) - 1];
      if (btn) btn.click();
    });
  }

  start(deck) {
    clearTimeout(this.nextTimer);
    this.deck = deck;
    this.queue = shuffleArray([...(deck?.cards || [])]).slice(0, ROUND_SIZE);
    this.index = 0;
    this.score = 0;
    $('testResults').hidden = true;
    $('testPanel').hidden = false;
    this.showQuestion();
  }

  showQuestion() {
    const card = this.queue[this.index];
    if (!card) return;
    this.answered = false;

    // Distinct answer texts only: duplicates used to make this loop forever.
    const others = shuffleArray([...new Set(this.deck.cards.map((c) => c.answer))].filter((a) => a !== card.answer));
    const options = shuffleArray([card.answer, ...others.slice(0, 3)]);

    testQuestion.textContent = card.question;
    testFeedback.textContent = '';
    testFeedback.className = '';
    testOptions.replaceChildren();
    options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'test-option';
      btn.dataset.key = i + 1;
      btn.textContent = opt;
      btn.addEventListener('click', () => this.checkAnswer(opt, card, btn));
      testOptions.appendChild(btn);
    });
    this.updateProgress();
  }

  checkAnswer(selected, card, btn) {
    if (this.answered) return;
    this.answered = true;
    const isCorrect = selected === card.answer;

    testOptions.querySelectorAll('button').forEach((b) => {
      b.disabled = true;
      if (b.textContent === card.answer) b.classList.add('correct');
    });
    if (!isCorrect) btn.classList.add('incorrect');

    testFeedback.className = isCorrect ? 'correct' : 'incorrect';
    testFeedback.textContent = isCorrect ? 'Correct!' : `It’s “${card.answer}”`;
    if (isCorrect) this.score++;
    updateCardStatsFromCard(card, isCorrect);
    this.updateProgress();

    this.nextTimer = setTimeout(() => this.next(), isCorrect ? 900 : 1800);
  }

  next() {
    this.index++;
    if (this.index >= this.queue.length) return this.finish();
    this.showQuestion();
  }

  updateProgress() {
    const total = this.queue.length;
    const done = this.index + (this.answered ? 1 : 0);
    $('testProgress').textContent = total ? `Question ${Math.min(this.index + 1, total)} of ${total}` : '';
    testScore.textContent = `${this.score} correct`;
    $('testBar').style.width = total ? `${(done / total) * 100}%` : '0';
  }

  finish() {
    $('testPanel').hidden = true;
    renderResults($('testResults'), {
      correct: this.score,
      total: this.queue.length,
      actions: [{ label: 'New round', onClick: () => this.start(this.deck) }],
    });
  }

  reset() {
    clearTimeout(this.nextTimer);
    this.score = 0;
  }
}

export default new TestMode();
