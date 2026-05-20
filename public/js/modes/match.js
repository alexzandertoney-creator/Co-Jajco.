// ============ MATCH GAME MODE ============

import { MATCH_GAME } from '../constants.js';
import { shuffleArray } from '../utils.js';
import { matchGrid, matchTimerEl, matchFeedback } from '../ui.js';
import { updateCardStatsFromCard } from '../data.js';

export class MatchMode {
  constructor() {
    this.cards = [];
    this.selected = [];
    this.timer = MATCH_GAME.INITIAL_TIME;
    this.interval = null;
  }

  /**
   * Start match game
   */
  start(deck) {
    this.reset();
    matchGrid.innerHTML = '';
    matchFeedback.textContent = '';
    this.selected = [];

    if (!deck?.cards.length) return;

    // Pick random cards
    const shuffled = [...deck.cards].sort(() => Math.random() - 0.5);
    const selectedCards = shuffled.slice(0, MATCH_GAME.CARDS_COUNT);

    // Create question + answer entries
    this.cards = [];
    selectedCards.forEach(c => {
      this.cards.push({ text: c.question, pair: c.answer, matched: false, sourceCard: c });
      this.cards.push({ text: c.answer, pair: c.question, matched: false, sourceCard: c });
    });

    // Shuffle
    this.cards = shuffleArray(this.cards);

    // Create buttons
    this.cards.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.textContent = c.text;
      btn.className = 'match-card';
      btn.dataset.index = i;
      btn.addEventListener('click', () => this.selectCard(i, btn));
      matchGrid.appendChild(btn);
    });

    this.timer = MATCH_GAME.INITIAL_TIME;
    matchTimerEl.textContent = this.timer;
    this.startTimer();
  }

  /**
   * Select a card
   */
  selectCard(index, btn) {
    if (btn.classList.contains('matched')) return;

    btn.classList.add('selected');
    this.selected.push({ card: this.cards[index], btn });

    if (this.selected.length === 2) {
      this.checkMatch();
    }
  }

  /**
   * Check if two selected cards match
   */
  checkMatch() {
    const [first, second] = this.selected;

    if (first.card.pair === second.card.text && second.card.pair === first.card.text) {
      // Match!
      first.btn.classList.add('matched');
      second.btn.classList.add('matched');
      matchFeedback.textContent = '✅ Match!';

      const sourceCard = first.card.sourceCard || second.card.sourceCard;
      if (sourceCard) {
        updateCardStatsFromCard(sourceCard, true);
      }

      this.selected = [];
      this.checkWin();
    } else {
      // No match
      matchFeedback.textContent = '❌ No match';

      const firstSource = first.card.sourceCard;
      const secondSource = second.card.sourceCard;
      if (firstSource) {
        updateCardStatsFromCard(firstSource, false);
      }
      if (secondSource && secondSource !== firstSource) {
        updateCardStatsFromCard(secondSource, false);
      }

      setTimeout(() => {
        first.btn.classList.remove('selected');
        second.btn.classList.remove('selected');
        this.selected = [];
      }, 1000);
    }
  }

  /**
   * Check if all matched
   */
  checkWin() {
    const allMatched = this.cards.every((_, i) => {
      return matchGrid.children[i]?.classList.contains('matched');
    });

    if (allMatched) {
      clearInterval(this.interval);
      matchFeedback.textContent = `🎉 You won! Time left: ${this.timer}s`;
    }
  }

  /**
   * Start timer
   */
  startTimer() {
    this.interval = setInterval(() => {
      this.timer--;
      matchTimerEl.textContent = this.timer;

      if (this.timer <= 0) {
        clearInterval(this.interval);
        matchFeedback.textContent = '⏱ Time\'s up!';
        document.querySelectorAll('.match-card').forEach(b => b.disabled = true);
      }
    }, MATCH_GAME.UPDATE_INTERVAL);
  }

  /**
   * Reset
   */
  reset() {
    clearInterval(this.interval);
    this.cards = [];
    this.selected = [];
    this.timer = MATCH_GAME.INITIAL_TIME;
  }
}

export default new MatchMode();
