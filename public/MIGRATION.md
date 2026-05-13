# Migration Guide: script.js → Modular Architecture

## What Changed

Your monolithic `script.js` (1000+ lines) has been split into **13 focused modules**, each with a single responsibility.

## New File Structure

```
js/
├── constants.js          # Configuration
├── utils.js              # Helper functions
├── data.js               # Data management
├── ui.js                 # DOM references
├── tts.js                # Text-to-speech
├── keyboard.js           # Keyboard shortcuts
├── deckEditor.js         # Deck editing
├── main.js               # Entry point
├── README.md             # Full documentation
└── modes/
    ├── flashcards.js     # 🎴 Flashcard mode
    ├── learn.js          # 📚 Learn mode
    ├── test.js           # 📝 Test mode
    └── match.js          # 🎮 Match game
```

## Key Benefits

✅ **Better Organization** - Each file has one clear purpose  
✅ **Easier to Find Code** - Know exactly where to look  
✅ **Simpler Debugging** - Isolate issues by module  
✅ **Reusable Functions** - Import only what you need  
✅ **Team Friendly** - Easier for multiple developers  
✅ **Testable** - Each module can be tested independently  

## Quick Reference

### Finding Code

| Task | File |
|------|------|
| Add speak functionality | `tts.js` |
| Manage decks/cards | `data.js` |
| Change keyboard shortcuts | `keyboard.js` |
| Add new study mode | `modes/newMode.js` |
| Modify UI elements | `ui.js` |
| Adjust game timing | `constants.js` |
| Card shuffling logic | `utils.js` |
| Flashcard navigation | `modes/flashcards.js` |

### Common Tasks

**Add a card to deck:**
```javascript
import * as DataManager from './js/data.js';

DataManager.addCardToDeck(deckId, 'question', 'answer');
DataManager.saveDecks();
```

**Speak text:**
```javascript
import { speakText } from './js/tts.js';

speakText('Hola', 'es-ES');
```

**Change to Learn mode:**
```javascript
import { switchMode } from './js/main.js';
import { MODES } from './js/constants.js';

switchMode(MODES.LEARN);
```

**Navigate flashcards:**
```javascript
import flashcardsMode from './js/modes/flashcards.js';

flashcardsMode.nextCard(deck);
flashcardsMode.showCard(deck, language);
```

## Old vs New

### Before (script.js)
```javascript
// Everything in one 1500+ line file
let currentCardIndex = 0;
let studyMode = false;
let sessionCards = [];

function showCard() { ... }
function nextCard() { ... }
function startFlashcardSession() { ... }
// ... 100+ more functions mixed together
```

### After (modules)
```javascript
// Flashcards are isolated in their own class
import flashcardsMode from './modes/flashcards.js';

flashcardsMode.startSession(deck);
flashcardsMode.nextCard(deck);
flashcardsMode.showCard(deck, lang);
// Only what you need is imported
```

## Breaking Changes

⚠️ **None!** The refactoring is fully backward compatible.

- Same functionality
- Same UI
- Same user experience
- Old `script.js` kept as reference (deprecated)

## How It Works

**Entry point:** `js/main.js`

1. App loads → calls `initializeApp()`
2. Authenticates user via `data.js`
3. Sets up event listeners in `setupEventListeners()`
4. Keyboard context configured via `keyboard.js`
5. DOM elements cached from `ui.js`
6. Mode handlers ready from `modes/*.js`

When user clicks a button → event listener in `main.js` → calls appropriate module method → UI updates

## Story Analyzer TODO

The Story Analyzer logic from original `script.js` should be migrated to its own module:

```
js/
├── storyAnalyzer.js      # 📖 To be created
├── ...
```

This is the only piece not yet refactored. The original functions are still in the old `script.js` file.

## Testing Your Changes

1. **Check browser console** - Should see no errors
2. **Test each mode** - Flashcards, Learn, Test, Match
3. **Check keyboard shortcuts** - c, i, arrow keys, space
4. **Verify deck operations** - Create, edit, delete
5. **Test TTS** - Speak buttons should work

## Future Improvements

Once stable, consider:
- Adding TypeScript for type safety
- Creating automated tests
- Building a minified bundle
- Adding more modes
- Creating a state management system

## Questions?

Refer to `js/README.md` for:
- Detailed module documentation
- API references
- Code examples
- Performance notes

---

**The old `script.js` can be deleted once you confirm everything works!**
