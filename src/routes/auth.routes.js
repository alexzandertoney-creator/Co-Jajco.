const express = require('express');
const authController = require('../controllers/auth.controller.js');
const authMiddleware = require('../middleware/auth.middleware.js');
const db = require('../config/db.js');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, "nativeLang", "learningLang" FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

router.put('/me/language', authMiddleware, async (req, res) => {
  try {
    const { learningLang } = req.body;
    
    if (!learningLang) {
      return res.status(400).json({ error: 'learningLang is required' });
    }

    const result = await db.query(
      'UPDATE users SET "learningLang" = $1 WHERE id = $2 RETURNING id',
      [learningLang, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Language updated successfully' });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;