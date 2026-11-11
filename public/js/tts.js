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
export function speakText(text, langCode = 'en', rate = 0.9) {
  if (!window.speechSynthesis || !text) return;
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const lang = langMap[langCode] || 'en-US';
  const voice = pickVoice(langCode);
  if (voice) utterance.voice = voice;
  utterance.lang = lang;
  utterance.rate = rate;

  speechSynthesis.speak(utterance);
}

/** Best installed voice for a language code (exact locale first, then same language). */
export function pickVoice(langCode) {
  if (!window.speechSynthesis) return null;
  const lang = langMap[langCode] || 'en-US';
  const voices = speechSynthesis.getVoices();
  return voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.split('-')[0])) || null;
}

export const speechLang = (langCode) => langMap[langCode] || 'en-US';

/**
 * Stop speaking
 */
export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}

/**
 * Auto-speak card based on settings
 */
export function autoSpeakCard(cardData, frontIsQuestion, isFrontLearning, isFlipped, learningLang, nativeLang = 'en') {
  if (speakMode === SPEAK_MODES.OFF) return;

  const frontText = frontIsQuestion ? cardData.question : cardData.answer;
  const backText = frontIsQuestion ? cardData.answer : cardData.question;
  const visibleText = isFlipped ? backText : frontText;
  // Is the side currently facing the user written in the language being learned?
  const visibleIsLearning = isFlipped ? !isFrontLearning : isFrontLearning;
  const voiceLang = visibleIsLearning ? learningLang : nativeLang;

  if (speakMode === SPEAK_MODES.LEARNING && !visibleIsLearning) return;
  if (speakMode === SPEAK_MODES.NATIVE && visibleIsLearning) return;
  speakText(visibleText, voiceLang);
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

  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  speakNext();
}

/**
 * Initialize TTS - load voices
 */
export function initTTS() {
  if (!window.speechSynthesis) return;
  // Touching getVoices() makes Chrome start loading them before the first card is spoken.
  speechSynthesis.getVoices();
}

// True if the browser has a voice for this language (voices can load late, so ask at use time).
export function hasVoiceFor(langCode) {
  if (!window.speechSynthesis) return false;
  const base = (langMap[langCode] || langCode || '').split('-')[0].toLowerCase();
  return speechSynthesis.getVoices().some(v => v.lang.toLowerCase().startsWith(base));
}
