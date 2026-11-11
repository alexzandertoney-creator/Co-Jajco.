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
  const { nextBtn, prevBtn, toggleFlip } = callbacks;


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
  const { nextBtn, prevBtn, toggleFlip } = callbacks;


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
    // Never hijack typing, browser shortcuts (Ctrl+C used to mark a card correct),
    // open dialogs, or keys pressed outside the Study section.
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (document.querySelector('dialog[open]')) return;
    if (document.body.dataset.group && document.body.dataset.group !== 'study') return;
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
