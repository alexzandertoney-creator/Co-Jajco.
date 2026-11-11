// ============ LEARN MODE ============
// Type-the-answer practice in rounds, with forgiving grading and a results screen.

import { shuffleArray, gradeAnswer } from '../utils.js';
import { learnQuestion, learnAnswer, learnFeedback, renderResults } from '../ui.js';
import { updateCardStatsFromCard } from '../data.js';

// Letters that are awkward to type on an English keyboard, per learning language.
const SPECIAL_LETTERS = {
  pl: ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'],
  es: ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'],
  fr: ['à', 'â', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'ù', 'û', 'œ'],
  de: ['ä', 'ö', 'ü', 'ß'],
  it: ['à', 'è', 'é', 'ì', 'ò', 'ù'],
};

const $ = (id) => document.getElementById(id);

export class LearnMode {
  constructor() {
    this.deck = null;
    this.queue = [];
    this.index = 0;
    this.right = 0;
    this.missed = [];
    this.awaitingNext = false;
    this.advanceTimer = null;
  }

  get direction() {
    return $('learnDirection')?.value === 'word' ? 'word' : 'meaning';
  }

  // Cards are stored question = word being learned, answer = meaning.
  promptOf(card) { return this.direction === 'word' ? card.answer : card.question; }
  answerOf(card) { return this.direction === 'word' ? card.question : card.answer; }

  startSession(deck, shouldShuffle = false, cards = null) {
    clearTimeout(this.advanceTimer);
    this.deck = deck;
    const source = cards || deck?.cards || [];
    this.queue = shouldShuffle ? shuffleArray([...source]) : [...source];
    this.index = 0;
    this.right = 0;
    this.missed = [];
    this.awaitingNext = false;

    $('learnResults').hidden = true;
    $('learnPanel').hidden = false;
    this.renderAccentBar();
    this.showQuestion();
  }

  showQuestion() {
    const card = this.queue[this.index];
    if (!card) return;
    this.awaitingNext = false;
    $('learnPromptLabel').textContent = this.direction === 'word' ? 'Type the word' : 'Type the meaning';
    learnQuestion.textContent = this.promptOf(card);
    learnFeedback.textContent = '';
    learnFeedback.className = '';
    learnAnswer.value = '';
    learnAnswer.disabled = false;
    $('submitLearn').textContent = 'Check';
    $('learnSkip').hidden = false;
    this.updateProgress();
    learnAnswer.focus({ preventScroll: true });
  }

  updateProgress() {
    const total = this.queue.length;
    $('learnProgress').textContent = total ? `${Math.min(this.index + 1, total)} of ${total}` : '';
    $('learnBar').style.width = total ? `${(this.index / total) * 100}%` : '0';
  }

  // Called on form submit: grades the answer, or moves on if the answer is already shown.
  submitAnswer() {
    if (this.awaitingNext) return this.next();
    const card = this.queue[this.index];
    if (!card) return;
    if (!learnAnswer.value.trim()) {
      learnFeedback.className = 'incorrect';
      learnFeedback.textContent = 'Type an answer, or press “I don’t know”.';
      return;
    }
    const { result, expected } = gradeAnswer(learnAnswer.value, this.answerOf(card));
    this.record(card, result !== 'wrong');

    if (result === 'correct') {
      this.showFeedback('correct', 'Correct!');
      this.advanceTimer = setTimeout(() => this.next(), 900);
    } else if (result === 'almost') {
      this.showFeedback('almost', `Almost: it’s spelled “${expected}”`);
    } else {
      this.showFeedback('incorrect', `The answer is “${this.answerOf(card)}”`);
    }
  }

  skip() {
    if (this.awaitingNext) return this.next();
    const card = this.queue[this.index];
    if (!card) return;
    this.record(card, false);
    this.showFeedback('incorrect', `The answer is “${this.answerOf(card)}”`);
  }

  record(card, ok) {
    if (ok) this.right++;
    else this.missed.push(card);
    updateCardStatsFromCard(card, ok);
  }

  showFeedback(kind, text) {
    this.awaitingNext = true;
    learnFeedback.className = kind;
    learnFeedback.textContent = text;
    learnAnswer.disabled = true;
    $('learnSkip').hidden = true;
    $('submitLearn').textContent = 'Continue';
    $('submitLearn').focus({ preventScroll: true });
  }

  next() {
    clearTimeout(this.advanceTimer);
    this.index++;
    if (this.index >= this.queue.length) return this.finish();
    this.showQuestion();
  }

  finish() {
    this.updateProgress();
    $('learnBar').style.width = '100%';
    $('learnPanel').hidden = true;
    const actions = [{ label: 'Practice again', onClick: () => this.startSession(this.deck, true) }];
    if (this.missed.length) {
      const missed = [...this.missed];
      actions.unshift({ label: `Practice the ${missed.length} you missed`, onClick: () => this.startSession(this.deck, true, missed) });
      actions[1].ghost = true;
    }
    renderResults($('learnResults'), { correct: this.right, total: this.queue.length, actions });
  }

  renderAccentBar() {
    const bar = $('accentBar');
    const letters = SPECIAL_LETTERS[this.deck?.learningLang];
    // Only useful when typing in the language being learned.
    bar.hidden = !letters || this.direction !== 'word';
    bar.replaceChildren();
    (letters || []).forEach((ch) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'key';
      b.textContent = ch;
      b.setAttribute('aria-label', `Insert ${ch}`);
      // mousedown keeps focus (and the caret) in the input
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => {
        if (learnAnswer.disabled) return;
        learnAnswer.setRangeText(ch, learnAnswer.selectionStart, learnAnswer.selectionEnd, 'end');
        learnAnswer.focus();
      });
      bar.appendChild(b);
    });
  }

  reset() {
    clearTimeout(this.advanceTimer);
    this.queue = [];
    this.index = 0;
  }
}

export default new LearnMode();
