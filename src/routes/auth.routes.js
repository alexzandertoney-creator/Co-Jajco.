const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);

const authMiddleware = require('../middleware/auth.middleware');
const db = require('../config/db');

router.get('/me', authMiddleware, (req, res) => {
  db.get(
    'SELECT id, email, nativeLang, learningLang FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (!user) return res.status(404).json({ error: 'User not found' });

      res.json(user);
    }
  );
});

router.put('/me/language', authMiddleware, (req, res) => {
  const { learningLang } = req.body;
  
  if (!learningLang) {
    return res.status(400).json({ error: 'learningLang is required' });
  }

  db.run(
    'UPDATE users SET learningLang = ? WHERE id = ?',
    [learningLang, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'Language updated successfully' });
    }
  );
});

module.exports = router;