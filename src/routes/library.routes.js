const express = require('express');
const libraryController = require('../controllers/library.controller.js');
const authMiddleware = require('../middleware/auth.middleware.js');

const router = express.Router();

// Public library endpoints
router.get('/public-decks', libraryController.listPublicDecks);
router.post('/public-decks', authMiddleware, libraryController.publishDeck);
router.get('/public-stories', libraryController.listPublicStories);
router.post('/public-stories', authMiddleware, libraryController.publishStory);

// User deck endpoints (private)
router.get('/decks', authMiddleware, libraryController.getUserDecks);
router.post('/decks', authMiddleware, libraryController.createUserDeck);
router.put('/decks/:deckId', authMiddleware, libraryController.updateUserDeck);
router.delete('/decks/:deckId', authMiddleware, libraryController.deleteUserDeck);

module.exports = router;
