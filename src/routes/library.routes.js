const express = require('express');
const libraryController = require('../controllers/library.controller.js');
const storiesController = require('../controllers/stories.controller.js');
const notesController = require('../controllers/notes.controller.js');
const authMiddleware = require('../middleware/auth.middleware.js');

const router = express.Router();

// Public library endpoints
router.get('/public-decks', libraryController.listPublicDecks);
router.post('/public-decks', authMiddleware, libraryController.publishDeck);
router.get('/public-stories', libraryController.listPublicStories);
router.post('/public-stories', authMiddleware, libraryController.publishStory);
router.post('/report', authMiddleware, libraryController.reportContent);

// User deck endpoints (private)
router.get('/decks', authMiddleware, libraryController.getUserDecks);
router.post('/decks', authMiddleware, libraryController.createUserDeck);
router.put('/decks/:deckId', authMiddleware, libraryController.updateUserDeck);
router.patch('/decks/:deckId/card', authMiddleware, libraryController.updateCardProgress);
router.delete('/decks/:deckId', authMiddleware, libraryController.deleteUserDeck);

// User story archive endpoints (private, "Past stories")
router.get('/stories', authMiddleware, storiesController.listStories);
router.post('/stories', authMiddleware, storiesController.saveStory);
router.post('/stories/import', authMiddleware, storiesController.importStories);
router.delete('/stories', authMiddleware, storiesController.clearStories);
router.put('/stories/:storyId', authMiddleware, storiesController.updateStoryTokens);
router.delete('/stories/:storyId', authMiddleware, storiesController.deleteStory);

// Notebook (private notes and writing)
router.get('/notes', authMiddleware, notesController.listNotes);
router.post('/notes', authMiddleware, notesController.createNote);
router.put('/notes/:noteId', authMiddleware, notesController.updateNote);
router.delete('/notes/:noteId', authMiddleware, notesController.deleteNote);

module.exports = router;
