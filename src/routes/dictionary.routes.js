const express = require('express');
const dictionaryController = require('../controllers/dictionary.controller.js');
const authMiddleware = require('../middleware/auth.middleware.js');

const router = express.Router();

// Shared, anonymous community dictionary (see services/dictionary.service.js)
router.post('/lookup', authMiddleware, dictionaryController.lookup);
router.get('/suggest', authMiddleware, dictionaryController.suggest);
router.post('/contribute', authMiddleware, dictionaryController.contribute);
router.get('/search', authMiddleware, dictionaryController.search);

module.exports = router;
