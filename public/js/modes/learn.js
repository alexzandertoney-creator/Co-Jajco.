// ============ LEARN MODE ============
// Type-the-answer practice in rounds, with forgiving grading and a results screen.

import { shuffleArray, gradeAnswer } from '../utils.js';
import { learnQuestion, learnAnswer, learnFeedback, renderResults } from '../ui.js';
import { updateCardStatsFromCard } from '../data.js';
import { speakText, hasVoiceFor } from '../tts.js';
import { showGrammar } from '../grammar.js';

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

  // 'meaning': see the word, type its meaning
  // 'word':    see the meaning, type the word
  // 'listen':  hear the word, type it (spelling + listening practice)
  get direction() {
    const v = $('learnDirection')?.value;
    return v === 'word' || v === 'listen' ? v : 'meaning';
  }

  // Cards store question = meaning, answer = word being learned.
  promptOf(card) { return this.direction === 'word' ? card.question : card.answer; }
  answerOf(card) { return this.direction === 'meaning' ? card.question : card.answer; }

  speak(card, rate = 0.85) {
    speakText(card.answer, this.deck?.learningLang, rate);
  }

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
    const listening = this.direction === 'listen';
    $('learnPromptLabel').textContent = listening ? 'Type what you hear' : this.direction === 'word' ? 'Type the word' : 'Type the meaning';
    if (listening) this.renderListenControls(card);
    else learnQuestion.textContent = this.promptOf(card);
    learnFeedback.textContent = '';
    learnFeedback.className = '';
    $('learnGrammar').hidden = true;
    $('learnGrammar').replaceChildren();
    learnAnswer.value = '';
    learnAnswer.disabled = false;
    $('submitLearn').textContent = 'Check';
    $('learnSkip').hidden = false;
    this.updateProgress();
    learnAnswer.focus({ preventScroll: true });
    if (listening) this.speak(card);
  }

  // In listening mode the prompt is a play button instead of text.
  renderListenControls(card) {
    learnQuestion.replaceChildren();
    if (!hasVoiceFor(this.deck?.learningLang) && window.speechSynthesis?.getVoices().length) {
      learnQuestion.textContent = 'Your browser has no voice for this language. Add one in your system’s speech settings, or pick another practice type.';
      learnQuestion.classList.add('listen-missing');
      return;
    }
    learnQuestion.classList.remove('listen-missing');
    const row = document.createElement('span');
    row.className = 'listen-row';
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'listen-play';
    play.setAttribute('aria-label', 'Play the word again');
    play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
    play.addEventListener('click', () => { this.speak(card); learnAnswer.focus(); });
    const slow = document.createElement('button');
    slow.type = 'button';
    slow.className = 'ghost small';
    slow.textContent = 'Slower';
    slow.addEventListener('click', () => { this.speak(card, 0.55); learnAnswer.focus(); });
    row.append(play, slow);
    learnQuestion.appendChild(row);
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
    const card = this.queue[this.index];
    learnFeedback.className = kind;
    learnFeedback.textContent = text;
    if (this.direction === 'listen' && card) {
      // Reveal the meaning once the word has been heard and typed.
      learnFeedback.append(document.createElement('br'), document.createTextNode(`${card.answer} = ${card.question}`));
    }
    if (card?.note) {
      const note = document.createElement('span');
      note.className = 'card-note';
      note.textContent = card.note;
      learnFeedback.append(document.createElement('br'), note);
    }
    // A miss is the moment to learn the word's grammar (correct answers move on by themselves).
    if (kind !== 'correct' && card) showGrammar($('learnGrammar'), card.answer, { lang: this.deck?.learningLang, fallback: card.question });
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
    bar.hidden = !letters || this.direction === 'meaning';
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
