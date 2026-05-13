// ============ KEYBOARD SHORTCUTS ============

import { KEYBOARD_CONTEXTS } from './constants.js';

let keyboardContext = KEYBOARD_CONTEXTS.DISABLED;

/**
 * Set keyboard context
 */
export function setKeyboardContext(context) {
  keyboardContext = context;
}

/**
 * Get keyboard context
 */
export function getKeyboardContext() {
  return keyboardContext;
}

/**
 * Handle flashcards keyboard shortcuts
 */
export function handleFlashcardsKeys(e, callbacks) {
  const { correctBtn, incorrectBtn, nextBtn, prevBtn, toggleFlip } = callbacks;

  if (e.key === 'c') correctBtn?.click();
  if (e.key === 'i') incorrectBtn?.click();

  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      nextBtn?.click();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      prevBtn?.click();
      break;
    case ' ':
      e.preventDefault();
      toggleFlip?.();
      break;
  }
}

/**
 * Handle review keyboard shortcuts
 */
export function handleReviewKeys(e, callbacks) {
  const { correctBtn, incorrectBtn, nextBtn, prevBtn, toggleFlip } = callbacks;

  if (e.key === 'c') correctBtn?.click();
  if (e.key === 'i') incorrectBtn?.click();

  switch (e.key) {
    case 'ArrowRight':
      e.preventDefault();
      nextBtn?.click();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      prevBtn?.click();
      break;
    case ' ':
      e.preventDefault();
      toggleFlip?.();
      break;
  }
}



/**
 * Setup keyboard event listener
 */
export function setupKeyboardListener(onFlashcardsCallback, onReviewCallback) {
  document.addEventListener('keydown', (e) => {
    switch (keyboardContext) {
      case KEYBOARD_CONTEXTS.FLASHCARDS:
        onFlashcardsCallback?.(e);
        break;
      case KEYBOARD_CONTEXTS.REVIEW:
        onReviewCallback?.(e);
        break;
      case KEYBOARD_CONTEXTS.DISABLED:
      default:
        break;
    }
  });
}
