// ============ TEXT-TO-SPEECH ============

import { langMap, SPEAK_MODES } from './constants.js';

let speakMode = SPEAK_MODES.OFF;

/**
 * Set speak mode
 */
export function setSpeakMode(mode) {
  speakMode = mode;
}

/**
 * Get current speak mode
 */
export function getSpeakMode() {
  return speakMode;
}

/**
 * Speak text in target language
 */
export function speakText(text, langCode = 'en') {
  speechSynthesis.cancel();

  if (!window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(text);
  const lang = langMap[langCode] || 'en-US';

  const voices = speechSynthesis.getVoices();

  let voice = voices.find(v => v.lang === lang);

  // Fallback to partial match
  if (!voice) {
    const baseLang = lang.split('-')[0];
    voice = voices.find(v => v.lang.startsWith(baseLang));
  }

  if (voice) {
    utterance.voice = voice;
  } else {
    console.warn('No voice found for:', lang);
  }

  utterance.lang = lang;
  utterance.rate = 0.9;

  speechSynthesis.speak(utterance);
}

/**
 * Stop speaking
 */
export function stopSpeaking() {
  speechSynthesis.cancel();
}

/**
 * Auto-speak card based on settings
 */
export function autoSpeakCard(cardData, frontIsQuestion, isFrontLearning, isFlipped, learningLang) {
  if (speakMode === SPEAK_MODES.OFF) return;

  const frontText = frontIsQuestion ? cardData.question : cardData.answer;
  const backText = frontIsQuestion ? cardData.answer : cardData.question;

  const visibleText = isFlipped ? backText : frontText;

  if (speakMode === SPEAK_MODES.NATIVE) {
    // Only speak the learning language side if visible
    if ((isFlipped && !isFrontLearning) || (!isFlipped && isFrontLearning)) {
      speakText(visibleText, learningLang);
    }
  } else if (speakMode === SPEAK_MODES.LEARNING) {
    // Only speak learning language
    if ((isFlipped && isFrontLearning) || (!isFlipped && !isFrontLearning)) {
      speakText(visibleText, learningLang);
    }
  } else if (speakMode === SPEAK_MODES.BOTH) {
    // Always speak visible text
    speakText(visibleText, learningLang);
  }
}

/**
 * Speak text by sentences
 */
export function speakTextBySentences(text, langCode = 'en') {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  let i = 0;

  function speakNext() {
    if (i < sentences.length) {
      const utterance = new SpeechSynthesisUtterance(sentences[i]);
      utterance.lang = langMap[langCode] || 'en-US';
      utterance.rate = 0.9;

      utterance.onend = () => {
        i++;
        setTimeout(speakNext, 500); // Pause between sentences
      };

      speechSynthesis.speak(utterance);
    }
  }

  speechSynthesis.cancel();
  speakNext();
}

/**
 * Initialize TTS - load voices
 */
export function initTTS() {
  speechSynthesis.onvoiceschanged = () => {
    console.log('Voices loaded:', speechSynthesis.getVoices());
  };
}
