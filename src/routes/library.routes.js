const express = require('express');
const libraryController = require('../controllers/library.controller.js');
const authMiddleware = require('../middleware/auth.middleware.js');

const router = express.Router();

router.get('/public-decks', libraryController.listPublicDecks);
router.post('/public-decks', authMiddleware, libraryController.publishDeck);
router.get('/public-stories', libraryController.listPublicStories);
router.post('/public-stories', authMiddleware, libraryController.publishStory);

module.exports = router;
