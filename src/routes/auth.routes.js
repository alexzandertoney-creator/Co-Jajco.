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

// ---------- Profile & activity ----------
// Extra profile columns are added lazily: on Vercel the schema init in db.js
// never runs, so these routes make sure their columns exist before first use.
// /me and login don't touch them, so they keep working even if this fails.
let profileColumnsReady = null;
function ensureProfileColumns() {
  profileColumnsReady ??= db.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS "displayName" TEXT,
      ADD COLUMN IF NOT EXISTS "dailyGoal" INTEGER DEFAULT 20,
      ADD COLUMN IF NOT EXISTS "activity" JSONB DEFAULT '{}'::jsonb
  `).catch((err) => { profileColumnsReady = null; throw err; });
  return profileColumnsReady;
}

const PROFILE_FIELDS = 'id, email, "nativeLang", "learningLang", "displayName", "dailyGoal", "activity"';
const LANG_CODES = ['en', 'pl', 'es', 'fr', 'de', 'it', 'jp'];
const isDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

router.get('/me/profile', authMiddleware, async (req, res) => {
  try {
    await ensureProfileColumns();
    const result = await db.query(`SELECT ${PROFILE_FIELDS} FROM users WHERE id = $1`, [req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];
    res.json({ ...user, dailyGoal: user.dailyGoal || 20, activity: user.activity || {} });
  } catch (err) {
    console.error('Profile load error:', err);
    res.status(500).json({ error: 'Could not load profile' });
  }
});

router.put('/me/profile', authMiddleware, async (req, res) => {
  try {
    await ensureProfileColumns();
    const { displayName, dailyGoal, nativeLang } = req.body;
    if (displayName !== undefined && (typeof displayName !== 'string' || displayName.length > 40)) {
      return res.status(400).json({ error: 'Display name must be 40 characters or fewer.' });
    }
    if (dailyGoal !== undefined && !(Number.isInteger(dailyGoal) && dailyGoal >= 5 && dailyGoal <= 200)) {
      return res.status(400).json({ error: 'Daily goal must be between 5 and 200.' });
    }
    if (nativeLang !== undefined && !LANG_CODES.includes(nativeLang)) {
      return res.status(400).json({ error: 'Unsupported language.' });
    }
    const result = await db.query(
      `UPDATE users SET
         "displayName" = COALESCE($1, "displayName"),
         "dailyGoal"   = COALESCE($2, "dailyGoal"),
         "nativeLang"  = COALESCE($3, "nativeLang")
       WHERE id = $4 RETURNING ${PROFILE_FIELDS}`,
      [displayName === undefined ? null : displayName.trim(), dailyGoal ?? null, nativeLang ?? null, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Could not save profile' });
  }
});

// Adds answered-card counts to a day ({ date: 'YYYY-MM-DD' in the user's timezone, count }).
// Streaks, the daily goal and the activity heatmap are computed from this map.
// ponytail: one JSONB map per user, ~365 small entries a year; move to a table if it ever matters.
router.post('/me/activity', authMiddleware, async (req, res) => {
  try {
    await ensureProfileColumns();
    const { date, count } = req.body;
    if (!isDate(date) || !(Number.isInteger(count) && count > 0 && count <= 1000)) {
      return res.status(400).json({ error: 'Invalid activity' });
    }
    const result = await db.query(
      `UPDATE users
         SET "activity" = jsonb_set(COALESCE("activity", '{}'::jsonb), ARRAY[$1::text],
               to_jsonb(COALESCE((COALESCE("activity", '{}'::jsonb)->>$1)::int, 0) + $2))
       WHERE id = $3 RETURNING "activity"`,
      [date, count, req.user.id]
    );
    res.json({ activity: result.rows[0]?.activity || {} });
  } catch (err) {
    console.error('Activity update error:', err);
    res.status(500).json({ error: 'Could not save activity' });
  }
});

module.exports = router;