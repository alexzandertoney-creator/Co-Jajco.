# Architecture Diagram

## Module Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      index.html                             │
│                    (Entry point)                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                    imports (type="module")
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    js/main.js                               │
│           (Application Orchestrator & Init)                 │
└─────────────────────────────────────────────────────────────┘
         │         │        │         │         │        │
         ↓         ↓        ↓         ↓         ↓        ↓
    ┌────────┐ ┌────────┐ ┌─────┐ ┌──────┐ ┌──────┐ ┌──────┐
    │ data.js│ │ ui.js  │ │tts. │ │keyboa│ │ deck │ │modes/│
    │        │ │        │ │js   │ │rd.js │ │Edito │ │      │
    │·Load   │ │·DOM    │ │     │ │      │ │r.js  │ │·flash│
    │·Decks  │ │·Render │ │·Speak│ │·Keys │ │      │ │cards│
    │·User   │ │·Update │ │·Voice│ │·Cntx │ │·Edit │ │·learn│
    │·Cards  │ │·Popup  │ │·Mode │ │·List │ │·Bulk │ │·test │
    │·Save   │ │·Loading│ │     │ │      │ │·Del  │ │·match│
    └────────┘ └────────┘ └─────┘ └──────┘ └──────┘ └──────┘
        │           │       │        │
        └───────────┴───────┴────────┘
                    │
            (shared imports)
                    │
                    ↓
        ┌─────────────────────────┐
        │   constants.js          │
        │   (Enums, Config)       │
        │                         │
        │ · MODES                 │
        │ · langMap               │
        │ · SPEAK_MODES           │
        └─────────────────────────┘
                    ↑
                    │
        ┌─────────────────────────┐
        │   utils.js              │
        │   (Helper Functions)    │
        │                         │
        │ · shuffle()             │
        │ · validation()          │
        │ · buildMasterVocab()    │
        └─────────────────────────┘
```

## Data Flow

```
User Action (click/type/keyboard)
    │
    ↓
Event Listener (main.js)
    │
    ├─→ Get state from data.js
    │
    ├─→ Call appropriate mode (modes/*.js)
    │
    ├─→ Update UI (ui.js)
    │
    ├─→ Save to storage (data.js)
    │
    └─→ Optional: Speak (tts.js)
```

## Class Hierarchy

```
Each Mode is a Singleton Class:

┌──────────────────────────┐
│  FlashcardsMode          │
├──────────────────────────┤
│ Properties               │
│ · currentCardIndex       │
│ · sessionCards[]         │
│ · studyMode             │
│ · frontIsQuestion       │
├──────────────────────────┤
│ Methods                  │
│ · showCard()            │
│ · nextCard()            │
│ · swapSides()           │
│ · markCorrect()         │
│ · startStudyMode()      │
└──────────────────────────┘

┌──────────────────────────┐
│   LearnMode              │
├──────────────────────────┤
│ · startSession()        │
│ · submitAnswer()        │
│ · getProgress()         │
└──────────────────────────┘

┌──────────────────────────┐
│   TestMode               │
├──────────────────────────┤
│ · showQuestion()        │
│ · checkAnswer()         │
│ · updateScore()         │
└──────────────────────────┘

┌──────────────────────────┐
│   MatchMode              │
├──────────────────────────┤
│ · selectCard()          │
│ · checkMatch()          │
│ · checkWin()            │
│ · startTimer()          │
└──────────────────────────┘

┌──────────────────────────┐
│  DeckEditor              │
├──────────────────────────┤
│ · addCard()             │
│ · deleteCard()          │
│ · editCard()            │
│ · bulkTranslate()       │
│ · deleteDeck()          │
│ · export/importDeck()   │
└──────────────────────────┘
```

## File Size Comparison

```
Before (1 file):          After (13 files):

script.js                 constants.js      ~50 lines
├ 1500+ lines            utils.js          ~100 lines
├ data mgmt               data.js           ~200 lines
├ flashcards             ui.js             ~150 lines
├ learn mode             tts.js            ~120 lines
├ test mode              keyboard.js       ~70 lines
├ match game             deckEditor.js     ~180 lines
├ deck editor            main.js           ~400 lines
├ story analyzer         
├ keyboard               modes/
├ tts                    ├ flashcards.js   ~200 lines
├ utilities              ├ learn.js        ~80 lines
└ constants              ├ test.js         ~100 lines
                         └ match.js        ~150 lines
                         
Total: ~1500 lines       Total: ~1700 lines*
                         (*includes documentation)
```

## Import Dependencies

```
main.js imports:
├─ data.js (state management)
├─ ui.js (DOM references)
├─ keyboard.js (event handling)
├─ tts.js (speech)
├─ modes/flashcards.js
├─ modes/learn.js
├─ modes/test.js
├─ modes/match.js
├─ deckEditor.js
└─ constants.js

Each mode imports:
├─ utils.js (helpers)
├─ tts.js (speech)
├─ constants.js (config)
└─ ui.js (DOM)

data.js imports:
└─ utils.js

deckEditor.js imports:
├─ ui.js
├─ data.js
└─ utils.js

tts.js imports:
└─ constants.js

keyboard.js imports:
└─ constants.js

No circular dependencies ✓
```

## Event Flow Example: Clicking "Next Card"

```
User clicks "Next ➡" button
        │
        ↓
UI.nextBtn addEventListener (main.js)
        │
        ├─ Get current deck
        │       │
        │       ↓ 
        │ DataManager.getDeck(currentDeckIndex)
        │
        ├─ Call flashcard mode
        │       │
        │       ↓
        │ flashcardsMode.nextCard(deck)
        │       ├─ currentCardIndex++
        │       └─ resetCardToFront()
        │
        ├─ Show updated card
        │       │
        │       ↓
        │ flashcardsMode.showCard(deck, userLang)
        │       ├─ Update questionEl
        │       ├─ Update answerEl
        │       └─ Optional: autoSpeakCard()
        │
        └─ Done (DOM updated, no save needed)
```

## State Management Architecture

```
Global State (in data.js):
┌─────────────────────────────┐
│ decks[]                     │
│ (localStorage source truth) │
└────────────────┬────────────┘
                 │ filtered by user
                 ↓
┌─────────────────────────────┐
│ filteredDecks[]             │
│ (current language pair)     │
└─────────────────────────────┘

Mode State (local to mode):
┌─────────────────────────────┐
│ flashcardsMode.currentIndex │
│ flashcardsMode.sessionCards │
│ flashcardsMode.studyMode   │
└─────────────────────────────┘

UI State (cached DOM refs):
┌─────────────────────────────┐
│ ui.card                     │
│ ui.questionEl               │
│ ui.answerEl                 │
│ ... (40+ DOM elements)      │
└─────────────────────────────┘

Sync Flow:
  User Action
      │
      ├─→ Update UI State (DOM)
      │
      ├─→ Update Mode State (in-memory)
      │
      └─→ Save Global State (localStorage)
```

## Testing Module In Isolation

```javascript
// Test utils
import { shuffleArray } from './utils.js';
const shuffled = shuffleArray([1,2,3]);
console.assert(shuffled.length === 3);

// Test data manager
import * as DataManager from './data.js';
const deck = DataManager.createDeck('Test', 'es', 'en');
console.assert(deck.id !== undefined);

// Test flashcards mode
import flashcardsMode from './modes/flashcards.js';
flashcardsMode.startSession(testDeck);
console.assert(flashcardsMode.sessionIndex === 0);

// Test keyboard context
import { setKeyboardContext, getKeyboardContext } from './keyboard.js';
setKeyboardContext('flashcards');
console.assert(getKeyboardContext() === 'flashcards');
```

---

This modular architecture enables:
- ✓ Independent testing
- ✓ Easy debugging
- ✓ Clear responsibilities
- ✓ Simple refactoring
- ✓ Team collaboration
