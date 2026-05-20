// ============ STORY PROMPT SERVICE ============
// Handles prompt generation, story analysis, tokenization, and interactive token selection

/**
 * Generate AI prompt for story creation
 */
export function generateStoryPrompt({ level, length, topic, learningLang, nativeLang }) {
  return `
  You are a language learning assistant.

Target language: ${learningLang}
Native language: ${nativeLang}
Level: ${level}
Length: ${length}
Topic: ${topic}

Generate a story for a learner with the following profile:

REQUIREMENTS:
The story should:
- Match the learner's level (${level})
- Be natural and realistic (not robotic)
- Use mostly known vocabulary
- Introduce 15–30 new useful words or phrases based on the topic

New vocabulary:
- Must be relevant and practical
- Include verbs, nouns, and expressions
- Avoid rare or poetic words

Tokenization (VERY IMPORTANT):
- Multi-word expressions MUST stay grouped as ONE token
- Examples: "me doy cuenta", "a pesar de", "por supuesto"
- Do NOT split these into individual words

Interactive design:
- The story must be easy to click word-by-word
- Avoid punctuation attached to words

OUTPUT FORMAT (STRICT JSON):

{
  "story": "FULL STORY TEXT HERE",
  "tokens": [
    { "text": "token1", "translation": "..." },
    { "text": "token2", "translation": "..." }
  ]
}

RULES:
- DO NOT include explanations
- DO NOT include markdown
- ONLY return valid JSON
- Ensure tokens fully reconstruct the story when joined with spaces`;
}

/**
 * Generate AI prompt for tokenizing real-world text
 */
export function generateTextTokenizationPrompt({ rawText, level, learningLang, nativeLang, simplify = false }) {
  const simplifySection = simplify 
    ? `- Simplify to level ${level}`
    : '- Keep the original text as-is (no simplification)';

  return `You are a language learning assistant.

Convert the following real-world text into a learner-friendly version.

QUOTATION NORMALIZATION:
- Convert all "double quotes" and „smart quotes” into 'single quotes' only within the story text
- Never output double quotation marks in the final story

REQUIREMENTS:

${simplifySection}

- Keep original meaning

- Make it natural and conversational

- Extract useful vocabulary


TEXT:

"${rawText}"


Tokenization (VERY IMPORTANT):
- Multi-word expressions MUST stay grouped as ONE token
- Examples: "me doy cuenta", "a pesar de", "por supuesto"
- Do NOT split these into individual words
- Preserve all punctuation in tokens

OUTPUT FORMAT (STRICT JSON):

{
  "story": "FULL TEXT HERE (simplified if requested, or original if not)",
  "tokens": [
    { "text": "token1", "translation": "translation in ${nativeLang}" },
    { "text": "token2", "translation": "translation in ${nativeLang}" }
  ]
}

RULES:
- DO NOT include explanations
- DO NOT include markdown
- ONLY return valid JSON
- Ensure tokens fully reconstruct the story when joined with spaces
- Provide translations in ${nativeLang}`;
}

/**
 * Generate AI prompt for deck curation
 */
export function generateDeckCurationPrompt({ level, topic, cardCount, learningLang, nativeLang }) {
  return `You are a helpful AI assistant that creates flashcard decks for language learners.

Target language: ${learningLang}
Native language: ${nativeLang}
Level: ${level}
Topic: ${topic || 'everyday life'}
Card count: ${cardCount}

Create a JSON array of flashcards using this structure:
[
  { "question": "A word or short phrase in ${nativeLang}", "answer": "The translation in ${learningLang}" }
]

Requirements:
- Generate exactly ${cardCount} flashcards
- Use practical vocabulary appropriate for the learner's level
- Keep questions in ${nativeLang} and answers in ${learningLang}
- Do not include explanations, examples, or markdown
- Return valid JSON only
- Do not wrap the JSON in text or code fences
- Use only the fields question and answer for each card

If the topic is blank, choose practical everyday vocabulary.
`;
}

/**
 * Parse AI response JSON
 */
export function parseStoryResponse(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.story || !Array.isArray(data.tokens)) {
      throw new Error('Invalid story format: missing story or tokens array');
    }
    
    return data;
  } catch (error) {
    console.error('Failed to parse story response:', error);
    return null;
  }
}

/**
 * Story tokenizer for interactive reading
 */
export class StoryTokenizer {
  constructor(story, tokens) {
    this.story = story;
    this.tokens = tokens; // Array of { text, translation }
    this.selectedTokens = []; // Tokens user has clicked
    this.tokenMap = new Map(); // For quick lookup
    
    this.buildTokenMap();
  }

  /**
   * Build map for quick token lookups
   */
  buildTokenMap() {
    const normalize = (s) => {
      if (!s) return '';
      // Normalize and remove diacritics for flexible matching
      return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    };

    this.tokens.forEach(token => {
      const keyNorm = normalize(token.text);
      const keyExact = (token.text || '').trim();

      // canonical by normalized form
      this.tokenMap.set(keyNorm, token);
      // also store exact original as fallback
      this.tokenMap.set(keyExact, token);
    });
    // Keep normalizer for later use
    this._normalizeKey = normalize;
  }

  /**
   * Get translation for a token
   */
  getTranslation(tokenText) {
    if (!tokenText) return null;
    const key = this._normalizeKey ? this._normalizeKey(tokenText) : tokenText.toLowerCase();
    let token = this.tokenMap.get(key);
    if (!token) {
      token = this.tokenMap.get(tokenText);
    }
    return token ? token.translation : null;
  }

  /**
   * Click a token to add to selected list
   */
  selectToken(tokenText) {
    if (!tokenText) return;
    const key = this._normalizeKey ? this._normalizeKey(tokenText) : tokenText.toLowerCase();
    let token = this.tokenMap.get(key) || this.tokenMap.get(tokenText);
    if (!token) return;

    const existing = this.selectedTokens.find(t => t.text === token.text);
    if (!existing) this.selectedTokens.push(token);
    return token;
  }

  /**
   * Remove token from selected list
   */
  deselectToken(tokenText) {
    if (!tokenText) return;
    const key = this._normalizeKey ? this._normalizeKey(tokenText) : tokenText.toLowerCase();
    let tokenToMatch = this.tokenMap.get(key) || this.tokenMap.get(tokenText);
    if (!tokenToMatch) return;

    this.selectedTokens = this.selectedTokens.filter(t => t.text !== tokenToMatch.text);
  }

  /**
   * Toggle token selection
   */
  toggleToken(tokenText) {
    if (!tokenText) return;
    const key = this._normalizeKey ? this._normalizeKey(tokenText) : tokenText.toLowerCase();
    let tokenToMatch = this.tokenMap.get(key) || this.tokenMap.get(tokenText);
    if (!tokenToMatch) return;

    const existing = this.selectedTokens.find(t => t.text === tokenToMatch.text);
    if (existing) this.deselectToken(tokenText);
    else this.selectToken(tokenText);
  }

  /**
   * Check if token is selected
   */
  isTokenSelected(tokenText) {
    if (!tokenText) return false;
    const key = this._normalizeKey ? this._normalizeKey(tokenText) : tokenText.toLowerCase();
    let tokenToMatch = this.tokenMap.get(key) || this.tokenMap.get(tokenText);
    if (!tokenToMatch) return false;
    return this.selectedTokens.some(t => t.text === tokenToMatch.text);
  }

  /**
   * Get all selected tokens
   */
  getSelectedTokens() {
    return [...this.selectedTokens];
  }

  /**
   * Clear all selected tokens
   */
  clearSelected() {
    this.selectedTokens = [];
  }

  /**
   * Create a new deck from selected tokens (card format)
   */
  createDeckFromSelected(deckName) {
    const cards = this.selectedTokens.map(token => ({
      question: token.text,
      answer: token.translation,
      stats: { correct: 0, incorrect: 0 }
    }));

    return {
      id: `deck-${Date.now()}`,
      name: deckName,
      cards: cards,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Get all tokens with their selection status
   */
  getAllTokensWithStatus() {
    return this.tokens.map(token => ({
      ...token,
      isSelected: this.isTokenSelected(token.text)
    }));
  }
}

/**
 * Render interactive story with support for multi-word tokens
 */
export function renderInteractiveStory(containerSelector, tokenizer, onTokenClick) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.innerHTML = '';
  const storyEl = document.createElement('div');
  storyEl.className = 'interactive-story';
  storyEl.style.lineHeight = '1.8';
  storyEl.style.fontSize = '18px';

  // Sort tokens by length (longest first) to match multi-word tokens before single words
  const sortedTokens = [...tokenizer.tokens].sort((a, b) => 
    b.text.length - a.text.length
  );

  let remaining = tokenizer.story;
  let position = 0;

  while (position < remaining.length) {
    let matched = false;

    // Try to match tokens starting at current position
    for (const token of sortedTokens) {
      const tokenText = token.text || '';

      // Work with the raw remaining substring to preserve original characters for rendering
      const storySubRaw = remaining.substring(position);
      const leadingSpace = /^\s*/.exec(storySubRaw)[0];
      const afterSpaceRaw = storySubRaw.substring(leadingSpace.length);

      // Normalizer (diacritic-insensitive) from tokenizer if available
      const normalizeKey = tokenizer._normalizeKey || (s => (s || '').toLowerCase());
      const tokenNorm = normalizeKey(tokenText);

      // Try to find the minimal original length that matches the normalized token
      let matchLen = 0;
      for (let len = 1; len <= afterSpaceRaw.length; len++) {
        const slice = afterSpaceRaw.slice(0, len);
        const normSlice = normalizeKey(slice);
        if (normSlice.length >= tokenNorm.length) {
          if (normSlice.startsWith(tokenNorm)) {
            matchLen = len;
          }
          break;
        }
      }

      if (matchLen > 0) {
        // Found a match! Add the space first if any
        if (leadingSpace) {
          const spaceSpan = document.createElement('span');
          spaceSpan.textContent = leadingSpace;
          storyEl.appendChild(spaceSpan);
          position += leadingSpace.length;
        }

        // Compute trailing punctuation after the matched slice
        const matchedOriginal = remaining.substring(position, position + matchLen);
        const textAfterToken = remaining.substring(position + matchLen);
        const trailingPunct = /^[.,!?;:\u2014\-]*/.exec(textAfterToken)[0];

        // Create clickable token span using the actual story substring for display
        const span = document.createElement('span');
        span.textContent = matchedOriginal;
        span.className = 'story-token';

        // Add data-translation attribute (use tokenizer's canonical token for lookup)
        const translation = tokenizer.getTranslation(tokenText);
        span.dataset.translation = translation || 'No translation available';

        // Apply known/unknown styling based on canonical token
        if (tokenizer.isTokenSelected(tokenText)) {
          span.classList.add('story-unknown');
        } else {
          span.classList.add('story-known');
        }

        span.addEventListener('click', () => {
          tokenizer.toggleToken(tokenText);
          span.classList.toggle('story-unknown');
          span.classList.toggle('story-known');

          if (onTokenClick) {
            onTokenClick(tokenText, tokenizer.getTranslation(tokenText));
          }
        });

        storyEl.appendChild(span);
        position += matchLen;

        // Add trailing punctuation
        if (trailingPunct) {
          const punctEl = document.createElement('span');
          punctEl.textContent = trailingPunct;
          storyEl.appendChild(punctEl);
          position += trailingPunct.length;
        }

        matched = true;
        break;
      }
    }

    // If no token matched, consume one character
    if (!matched) {
      const char = remaining[position];
      const span = document.createElement('span');
      span.textContent = char;
      storyEl.appendChild(span);
      position++;
    }
  }

  container.appendChild(storyEl);
}

/**
 * Render selected tokens list
 */
export function renderSelectedTokens(containerSelector, tokenizer, onChange) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const selected = tokenizer.getSelectedTokens();
  container.innerHTML = '';

  if (selected.length === 0) {
    container.innerHTML = '<p style="color: #999;">Click tokens to add them here</p>';
    return;
  }

  const list = document.createElement('div');
  list.className = 'selected-tokens';
  list.style.display = 'grid';
  list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
  list.style.gap = '10px';

  selected.forEach((token, index) => {
    const card = document.createElement('div');
    card.style.border = '1px solid #ddd';
    card.style.padding = '10px';
    card.style.borderRadius = '4px';
    card.style.backgroundColor = '#f9f9f9';

    const text = document.createElement('strong');
    text.textContent = token.text;
    
    const translation = document.createElement('div');
    translation.textContent = token.translation;
    translation.style.fontSize = '12px';
    translation.style.color = '#666';
    translation.style.marginTop = '5px';

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.style.float = 'right';
    removeBtn.style.background = 'none';
    removeBtn.style.border = 'none';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.color = '#cc0000';
    removeBtn.style.fontSize = '16px';

    removeBtn.addEventListener('click', () => {
      tokenizer.deselectToken(token.text);
      renderSelectedTokens(containerSelector, tokenizer, onChange);
      if (onChange) onChange();
    });

    card.appendChild(removeBtn);
    card.appendChild(text);
    card.appendChild(translation);
    list.appendChild(card);
  });

  container.appendChild(list);
}

/**
 * Export selected tokens to create new deck
 */
export function createDeckFromTokens(tokenizer, deckName) {
  if (tokenizer.selectedTokens.length === 0) {
    return null;
  }

  return tokenizer.createDeckFromSelected(deckName);
}

/**
 * Story Text-to-Speech Player
 * Handles playback of story with pause/resume and token navigation
 */
export class StoryTTSPlayer {
  constructor(tokenizer, learningLang = 'en') {
    this.tokenizer = tokenizer;
    this.learningLang = learningLang;
    this.currentTokenIndex = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.utteranceQueue = [];
    this.onTokenChange = null; // Callback when token changes
    this.langMap = {
      en: 'en-US',
      fr: 'fr-FR',
      es: 'es-ES',
      pl: 'pl-PL',
      de: 'de-DE',
      it: 'it-IT',
      ja: 'ja-JP',
      zh: 'zh-CN'
    };
  }

  /**
   * Speak a single token
   */
  speakToken(tokenIndex) {
    if (tokenIndex < 0 || tokenIndex >= this.tokenizer.tokens.length) return;

    const token = this.tokenizer.tokens[tokenIndex];
    this.currentTokenIndex = tokenIndex;

    // Stop any current speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(token.text);
    const lang = this.langMap[this.learningLang] || 'en-US';

    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
      speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.onvoiceschanged = null;
        this.speakToken(tokenIndex);
      };
      return;
    }

    utterance.lang = lang;
    utterance.rate = 0.85;

    utterance.onend = () => {
      if (this.onTokenChange) {
        this.onTokenChange(tokenIndex);
      }
    };

    speechSynthesis.speak(utterance);
  }

  /**
   * Play entire story with pauses between tokens
   */
  playStory() {
    if (this.isPlaying && !this.isPaused) return;

    // Resume from current position if paused
    const startIndex = this.isPaused ? this.currentTokenIndex : 0;
    this.isPlaying = true;
    this.isPaused = false;

    const playNext = (index) => {
      if (index >= this.tokenizer.tokens.length) {
        this.isPlaying = false;
        this.currentTokenIndex = 0;
        if (this.onTokenChange) {
          this.onTokenChange(-1); // Signal playback ended
        }
        return;
      }

      if (!this.isPlaying) return; // Stop if interrupted

      const token = this.tokenizer.tokens[index];
      this.currentTokenIndex = index;

      const utterance = new SpeechSynthesisUtterance(token.text);
      const lang = this.langMap[this.learningLang] || 'en-US';

      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) {
        speechSynthesis.onvoiceschanged = () => {
          speechSynthesis.onvoiceschanged = null;
          playNext(index);
        };
        return;
      }

      utterance.lang = lang;
      utterance.rate = 0.85;

      utterance.onend = () => {
        if (this.isPlaying) {
          if (this.onTokenChange) {
            this.onTokenChange(index);
          }
          // Pause between tokens
          setTimeout(() => playNext(index + 1), 300);
        }
      };

      speechSynthesis.speak(utterance);
    };

    playNext(startIndex);
  }

  /**
   * Pause story playback
   */
  pauseStory() {
    this.isPaused = true;
    speechSynthesis.pause();
  }

  /**
   * Resume story playback
   */
  resumeStory() {
    if (this.isPaused) {
      this.isPaused = false;
      speechSynthesis.resume();
    }
  }

  /**
   * Stop story playback completely
   */
  stopStory() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentTokenIndex = 0;
    speechSynthesis.cancel();

    if (this.onTokenChange) {
      this.onTokenChange(-1);
    }
  }

  /**
   * Go to previous token
   */
  previousToken() {
    if (this.currentTokenIndex > 0) {
      this.speakToken(this.currentTokenIndex - 1);
    }
  }

  /**
   * Go to next token
   */
  nextToken() {
    if (this.currentTokenIndex < this.tokenizer.tokens.length - 1) {
      this.speakToken(this.currentTokenIndex + 1);
    }
  }

  /**
   * Get current token
   */
  getCurrentToken() {
    return this.tokenizer.tokens[this.currentTokenIndex] || null;
  }

  /**
   * Check if playing
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * Check if paused
   */
  getIsPaused() {
    return this.isPaused;
  }
}

/**
 * Render TTS controls for story
 */
export function renderStoryTTSControls(containerSelector, ttsPlayer) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const controlsEl = document.createElement('div');
  controlsEl.className = 'story-tts-controls';
  controlsEl.style.display = 'flex';
  controlsEl.style.gap = '10px';
  controlsEl.style.padding = '15px';
  controlsEl.style.backgroundColor = '#f0f0f0';
  controlsEl.style.borderRadius = '4px';
  controlsEl.style.alignItems = 'center';
  controlsEl.style.flexWrap = 'wrap';
  controlsEl.style.marginBottom = '20px';

  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '⏮ Previous';
  prevBtn.style.padding = '8px 12px';
  prevBtn.style.cursor = 'pointer';
  prevBtn.style.border = '1px solid #ccc';
  prevBtn.style.borderRadius = '4px';
  prevBtn.style.backgroundColor = '#fff';
  prevBtn.addEventListener('click', () => {
    ttsPlayer.previousToken();
    updateCurrentTokenDisplay();
  });

  // Play button
  const playBtn = document.createElement('button');
  playBtn.textContent = '▶ Play Story';
  playBtn.style.padding = '8px 12px';
  playBtn.style.cursor = 'pointer';
  playBtn.style.border = '1px solid #0066cc';
  playBtn.style.borderRadius = '4px';
  playBtn.style.backgroundColor = '#0066cc';
  playBtn.style.color = 'white';
  playBtn.style.fontWeight = 'bold';

  const updatePlayBtn = () => {
    if (ttsPlayer.getIsPlaying()) {
      if (ttsPlayer.getIsPaused()) {
        playBtn.textContent = '▶ Resume';
        playBtn.style.backgroundColor = '#00cc00';
        playBtn.style.borderColor = '#00cc00';
      } else {
        playBtn.textContent = '⏸ Pause';
        playBtn.style.backgroundColor = '#ff9900';
        playBtn.style.borderColor = '#ff9900';
      }
    } else {
      playBtn.textContent = '▶ Play Story';
      playBtn.style.backgroundColor = '#0066cc';
      playBtn.style.borderColor = '#0066cc';
    }
  };

  playBtn.addEventListener('click', () => {
    if (ttsPlayer.getIsPlaying()) {
      if (ttsPlayer.getIsPaused()) {
        ttsPlayer.resumeStory();
      } else {
        ttsPlayer.pauseStory();
      }
    } else {
      ttsPlayer.playStory();
    }
    updatePlayBtn();
  });

  // Stop button
  const stopBtn = document.createElement('button');
  stopBtn.textContent = '⏹ Stop';
  stopBtn.style.padding = '8px 12px';
  stopBtn.style.cursor = 'pointer';
  stopBtn.style.border = '1px solid #ccc';
  stopBtn.style.borderRadius = '4px';
  stopBtn.style.backgroundColor = '#fff';
  stopBtn.addEventListener('click', () => {
    ttsPlayer.stopStory();
    updatePlayBtn();
    updateCurrentTokenDisplay();
  });

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next ⏭';
  nextBtn.style.padding = '8px 12px';
  nextBtn.style.cursor = 'pointer';
  nextBtn.style.border = '1px solid #ccc';
  nextBtn.style.borderRadius = '4px';
  nextBtn.style.backgroundColor = '#fff';
  nextBtn.addEventListener('click', () => {
    ttsPlayer.nextToken();
    updateCurrentTokenDisplay();
  });

  // Current token display
  const tokenDisplayEl = document.createElement('div');
  tokenDisplayEl.className = 'current-token-display';
  tokenDisplayEl.style.flex = '1';
  tokenDisplayEl.style.padding = '10px';
  tokenDisplayEl.style.backgroundColor = '#e6f2ff';
  tokenDisplayEl.style.borderRadius = '4px';
  tokenDisplayEl.style.minWidth = '200px';

  const updateCurrentTokenDisplay = () => {
    const token = ttsPlayer.getCurrentToken();
    if (token) {
      tokenDisplayEl.innerHTML = `
        <div style="font-weight: bold; color: #0066cc;">${token.text}</div>
        <div style="font-size: 12px; color: #666;">${token.translation}</div>
      `;
    } else {
      tokenDisplayEl.innerHTML = '<div style="color: #999;">Click Play or use arrows</div>';
    }
  };

  // Keyboard shortcuts hint
  const hintEl = document.createElement('div');
  hintEl.style.width = '100%';
  hintEl.style.fontSize = '12px';
  hintEl.style.color = '#666';
  hintEl.style.marginTop = '10px';
  hintEl.innerHTML = '💡 <strong>Keyboard:</strong> ← Previous | → Next | Space = Play/Pause';

  // Add to container
  controlsEl.appendChild(prevBtn);
  controlsEl.appendChild(playBtn);
  controlsEl.appendChild(stopBtn);
  controlsEl.appendChild(nextBtn);
  controlsEl.appendChild(tokenDisplayEl);
  controlsEl.appendChild(hintEl);

  // Set up token change callback
  ttsPlayer.onTokenChange = (tokenIndex) => {
    updateCurrentTokenDisplay();
    updatePlayBtn();
  };

  updateCurrentTokenDisplay();

  container.insertBefore(controlsEl, container.firstChild);

  return { playBtn, updatePlayBtn, updateCurrentTokenDisplay };
}

/**
 * Attach keyboard shortcuts for story TTS
 */
export function attachStoryTTSKeyboardShortcuts(ttsPlayer, updatePlayBtnCallback) {
  document.addEventListener('keydown', (e) => {
    // Only handle when not typing in input/textarea
    if (e.target.matches('input, textarea')) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        ttsPlayer.previousToken();
        break;
      case 'ArrowRight':
        e.preventDefault();
        ttsPlayer.nextToken();
        break;
      case ' ':
        e.preventDefault();
        if (ttsPlayer.getIsPlaying()) {
          if (ttsPlayer.getIsPaused()) {
            ttsPlayer.resumeStory();
          } else {
            ttsPlayer.pauseStory();
          }
        } else {
          ttsPlayer.playStory();
        }
        if (updatePlayBtnCallback) {
          updatePlayBtnCallback();
        }
        break;
    }
  });
}

export default {
  generateStoryPrompt,
  generateTextTokenizationPrompt,
  parseStoryResponse,
  StoryTokenizer,
  renderInteractiveStory,
  renderSelectedTokens,
  createDeckFromTokens,
  StoryTTSPlayer,
  renderStoryTTSControls,
  attachStoryTTSKeyboardShortcuts
};
