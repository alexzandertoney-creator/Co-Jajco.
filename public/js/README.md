# Script.js Refactoring - Module Documentation

## Overview
The original `script.js` has been refactored into a clean, modular architecture with clear separation of concerns. This improves maintainability, testability, and scalability.

## Directory Structure

```
public/
├── js/
│   ├── constants.js          # Global constants and configurations
│   ├── utils.js              # Utility functions
│   ├── data.js               # Data management & localStorage
│   ├── ui.js                 # DOM references & UI utilities
│   ├── tts.js                # Text-to-speech functionality
│   ├── keyboard.js           # Keyboard shortcuts
│   ├── deckEditor.js         # Deck editing features
│   ├── main.js               # Application entry point & init
│   └── modes/
│       ├── flashcards.js     # Flashcard mode logic
│       ├── learn.js          # Learn mode logic
│       ├── test.js           # Test mode logic
│       └── match.js          # Match game logic
├── index.html                # Updated to import js/main.js
└── script.js                 # DEPRECATED - kept for reference
```

## Module Details

### constants.js
**Purpose**: Centralized configuration and constants

**Exports**:
- `langMap` - Language code to voice mapping
- `LANGUAGES` - Available language options
- `LANGUAGE_LEVELS` - Language proficiency levels
- `MODES` - Study mode constants
- `KEYBOARD_CONTEXTS` - Keyboard context states
- `SPEAK_MODES` - Text-to-speech modes
- `MATCH_GAME` - Match game configuration

### utils.js
**Purpose**: Reusable utility functions

**Key Functions**:
- `shuffleArray(array)` - Fisher-Yates shuffle
- `buildMasterVocab(decks, lang1, lang2)` - Build vocabulary from decks
- `getTokenTranslation(map, word)` - Safe translation lookup
- Validation functions for decks and cards

### data.js
**Purpose**: Centralized data management and persistence

**State Variables**:
- `decks` - All user decks
- `filteredDecks` - Decks for current language pair
- `currentUser` - Current logged-in user

**Key Functions**:
- `loadUser()` - Authenticate and load user
- `saveDecks()` - Persist to localStorage
- `updateFilteredDecks()` - Filter decks by language
- `createDeck(name, lang1, lang2)` - Create new deck
- `deleteDeck(id)` - Delete deck
- `addCardToDeck(deckId, q, a)` - Add card
- `deleteCardFromDeck(deckId, index)` - Delete card
- `updateCardStats(deckId, index, correct)` - Update stats

### ui.js
**Purpose**: DOM element references and UI utilities

**DOM Collections**:
- Main controls (deck select, language select, logout)
- Flashcard elements (card, buttons, speakers)
- Mode-specific containers (learn, test, match, editor)
- Story analyzer elements

**Key Functions**:
- `renderMode(mode)` - Show/hide containers
- `updateDeckSelect(decks)` - Populate deck dropdown
- `updateStudyControls(isStudyMode)` - Toggle study mode styles
- `showLoading(element, show)` - Loading state indicator
- `showPopup(message)` - Toast notification

### tts.js
**Purpose**: Text-to-speech management

**Key Functions**:
- `speakText(text, langCode)` - Speak text in language
- `stopSpeaking()` - Cancel speech
- `autoSpeakCard(card, ...)` - Auto-speak based on settings
- `setSpeakMode(mode)` - Set TTS mode
- `initTTS()` - Initialize voice system

**Speak Modes**:
- `OFF` - No auto-speech
- `LEARNING` - Only learning language
- `NATIVE` - Only native language
- `BOTH` - Both languages

### keyboard.js
**Purpose**: Keyboard shortcut handling

**Keyboard Shortcuts**:
- `c` - Mark correct
- `i` - Mark incorrect
- `ArrowRight` - Next card
- `ArrowLeft` - Previous card
- `Space` - Flip card / Swap sides

### modes/flashcards.js
**FlashcardsMode Class**:

**Key Methods**:
- `startSession(deck, shuffle)` - Initialize session
- `showCard(deck, lang)` - Display current card
- `nextCard()` / `prevCard()` - Navigate
- `toggleFlip()` / `swapSides()` - Card interactions
- `startStudyMode()` / `endStudyMode()` - Toggle study
- `markCorrect()` / `markIncorrect()` - Study tracking
- `getCurrentCard()` - Get active card
- `speakVisible(card, lang)` - Speak current side

**Modes**:
- Classic mode - Browse all cards
- Study mode - Mastery-based review
- Shuffle mode - Randomized order

### modes/learn.js
**LearnMode Class**:

**Key Methods**:
- `startSession(deck, shuffle)` - Begin learning
- `showQuestion()` - Display question
- `submitAnswer()` - Check typed answer
- `getProgress()` - Track progress
- `reset()` - Clear state

### modes/test.js
**TestMode Class**:

**Key Methods**:
- `start(deck)` - Begin test
- `showQuestion(deck)` - Display multiple choice
- `checkAnswer(selected, correct, btn)` - Validate answer
- `updateScore()` - Update score display

### modes/match.js
**MatchMode Class**:

**Key Methods**:
- `start(deck)` - Initialize match game
- `selectCard(index, btn)` - Handle card click
- `checkMatch()` - Validate match
- `checkWin()` - Determine victory
- `startTimer()` - Begin countdown

**Constants**:
- 10 random cards per game
- 60 second timer
- 2 card selection required

### deckEditor.js
**DeckEditor Class**:

**Key Methods**:
- `render(decks, index)` - Display deck editor UI
- `addCard(deckIndex, q, a)` - Add card to deck
- `deleteCard(deckId, index)` - Remove card
- `editCard(deck, index)` - Modify card
- `bulkTranslate(words, deckIndex, langs)` - Batch add
- `deleteDeck(deckId)` - Remove entire deck
- `exportDeck(deck)` - Download as JSON
- `importDeck(file, langs)` - Upload from JSON

### main.js
**Purpose**: Application initialization and event coordination

**Key Functions**:
- `initializeApp()` - Start the app
- `setupEventListeners()` - Wire up all events
- `switchMode(mode)` - Change study mode
- `loadUserPreferences()` - Restore settings

**Entry Point**:
```javascript
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
```

## Usage Examples

### Getting Current Deck
```javascript
import * as DataManager from './data.js';
import { getDeck } from './data.js';

const currentDeck = DataManager.getDeck(currentDeckIndex);
```

### Adding a Card
```javascript
import * as DataManager from './data.js';

DataManager.addCardToDeck(deckId, 'question', 'answer');
DataManager.saveDecks();
```

### Speaking Text
```javascript
import { speakText } from './tts.js';

speakText('Hello world', 'en-US');
```

### Flashcard Navigation
```javascript
import flashcardsMode from './modes/flashcards.js';

flashcardsMode.nextCard(deck);
flashcardsMode.showCard(deck, userLang);
```

### Switching Modes
```javascript
import { switchMode } from './main.js';
import { MODES } from './constants.js';

switchMode(MODES.LEARN);
```

## Migration Notes

### From Original script.js
- Event listeners moved to `main.js`
- Global state moved to `data.js`
- DOM selectors consolidated in `ui.js`
- Mode logic extracted to `modes/` folder
- Constants centralized in `constants.js`
- TTS logic isolated in `tts.js`

### Story Analyzer
The story analyzer logic from the original `script.js` should be extracted into `storyAnalyzer.js` following the same pattern. Currently it's still referenced in the original code.

## Best Practices

### When Adding Features
1. Create new file in appropriate folder
2. Export only public APIs
3. Use consistent naming (e.g., `ClassName`, `functionName()`)
4. Import only what you need
5. Keep files under 300 lines

### When Fixing Bugs
1. Identify which module(s) are affected
2. Check related `__Tests` folder if it exists
3. Update both the module and tests
4. Update this documentation

### When Refactoring
1. Maintain public API signatures
2. Add migration notes to documentation
3. Keep deprecated code available temporarily
4. Update imports in dependent modules

## Testing

To test modules in isolation:

```javascript
// Test utils
import { shuffleArray, buildMasterVocab } from './utils.js';
console.log(shuffleArray([1,2,3])); // Verify randomization

// Test data manager
import * as DataManager from './data.js';
await DataManager.loadUser(); // Check auth
console.log(DataManager.filteredDecks); // Verify filtering

// Test modes
import flashcardsMode from './modes/flashcards.js';
flashcardsMode.startSession(testDeck);
console.log(flashcardsMode.currentCardIndex); // Verify state
```

## Performance Notes

- Modular structure allows tree-shaking in production builds
- Each module loads independently, reducing initial bundle size
- Classes (FlashcardsMode, etc.) are instantiated once globally
- Event listeners consolidated in main.js to reduce duplication

## Future Improvements

- [ ] Migrate story analyzer to separate module
- [ ] Add comprehensive error handling
- [ ] Implement API integration layer
- [ ] Add unit tests for each module
- [ ] Create build pipeline (webpack/esbuild)
- [ ] Implement state management library
- [ ] Add TypeScript for type safety
- [ ] Create component library (Web Components)
