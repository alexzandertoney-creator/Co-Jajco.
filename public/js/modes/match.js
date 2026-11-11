// ============ MATCH GAME MODE ============
// Pair each word with its meaning before the clock runs out.

import { MATCH_GAME } from '../constants.js';
import { shuffleArray } from '../utils.js';
import { matchGrid, matchTimerEl, matchFeedback } from '../ui.js';
import { recordPractice } from '../data.js';

const $ = (id) => document.getElementById(id);

export class MatchMode {
  constructor() {
    this.deck = null;
    this.tiles = [];
    this.selected = [];
    this.pairsLeft = 0;
    this.timer = MATCH_GAME.INITIAL_TIME;
    this.interval = null;
    this.clearTimer = null;
    $('matchRestart')?.addEventListener('click', () => this.start(this.deck));
  }

  start(deck) {
    this.reset();
    this.deck = deck;
    matchGrid.replaceChildren();
    matchFeedback.textContent = '';
    if (!deck?.cards.length) return;

    const picked = shuffleArray([...deck.cards]).slice(0, MATCH_GAME.CARDS_COUNT);
    // Tiles remember which card they came from, so identical texts on different
    // cards can't be "matched" by accident.
    this.tiles = shuffleArray(picked.flatMap((card) => [
      { card, text: card.question, side: 'q' },
      { card, text: card.answer, side: 'a' },
    ]));
    this.pairsLeft = picked.length;

    this.tiles.forEach((tile) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'match-card';
      btn.textContent = tile.text;
      btn.addEventListener('click', () => this.select(tile, btn));
      tile.btn = btn;
      matchGrid.appendChild(btn);
    });

    this.updatePairs();
    matchTimerEl.textContent = this.timer;
    this.interval = setInterval(() => this.tick(), MATCH_GAME.UPDATE_INTERVAL);
  }

  select(tile, btn) {
    if (btn.disabled || btn.classList.contains('selected') || this.selected.length >= 2) return;
    btn.classList.add('selected');
    this.selected.push(tile);
    if (this.selected.length === 2) this.check();
  }

  check() {
    const [a, b] = this.selected;
    if (a.card === b.card && a.side !== b.side) {
      [a, b].forEach((t) => { t.btn.classList.remove('selected'); t.btn.classList.add('matched'); t.btn.disabled = true; });
      this.selected = [];
      this.pairsLeft--;
      matchFeedback.textContent = 'Match!';
      // A match is a game, not a recall test: it counts toward the daily goal but doesn't move the card's review date.
      recordPractice();
      this.updatePairs();
      if (this.pairsLeft === 0) this.finish(true);
    } else {
      // A wrong guess doesn't say which word you didn't know, so it isn't recorded as a miss.
      matchFeedback.textContent = 'Not a pair, try again';
      [a, b].forEach((t) => t.btn.classList.add('wrong'));
      this.clearTimer = setTimeout(() => {
        [a, b].forEach((t) => t.btn.classList.remove('selected', 'wrong'));
        this.selected = [];
      }, 700);
    }
  }

  tick() {
    this.timer--;
    matchTimerEl.textContent = this.timer;
    if (this.timer <= 0) this.finish(false);
  }

  finish(won) {
    clearInterval(this.interval);
    if (won) {
      matchFeedback.textContent = `All matched with ${this.timer}s to spare!`;
    } else {
      matchFeedback.textContent = `Time’s up. ${this.tiles.length / 2 - this.pairsLeft} of ${this.tiles.length / 2} pairs matched.`;
      this.tiles.forEach((t) => { t.btn.disabled = true; });
    }
    $('matchRestart').textContent = 'Play again';
  }

  updatePairs() {
    $('matchPairs').textContent = `${this.pairsLeft} pair${this.pairsLeft === 1 ? '' : 's'} left`;
  }

  reset() {
    clearInterval(this.interval);
    clearTimeout(this.clearTimer);
    this.tiles = [];
    this.selected = [];
    this.timer = MATCH_GAME.INITIAL_TIME;
    if ($('matchRestart')) $('matchRestart').textContent = 'New game';
  }
}

export default new MatchMode();
