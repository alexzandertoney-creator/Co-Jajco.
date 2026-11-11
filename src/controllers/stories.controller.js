const db = require('../config/db.js');
const dictionary = require('../services/dictionary.service.js');

// Private, per-user story archive ("Past stories"), so it follows the account
// across devices instead of living in one browser's localStorage.
//
// The table is created lazily: on Vercel the schema init in db.js never runs.
// to_regclass() is checked first so existing installs never run DDL again.
let tableReady = null;
function ensureStoriesTable() {
  tableReady ??= db.query(`SELECT to_regclass('public.user_stories') AS t`)
    .then((r) => r.rows[0].t ? null : db.query(`
      CREATE TABLE IF NOT EXISTS user_stories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_id TEXT,
        title TEXT NOT NULL,
        learning_lang TEXT NOT NULL,
        native_lang TEXT NOT NULL,
        story TEXT NOT NULL,
        tokens JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, client_id)
      );
      CREATE INDEX IF NOT EXISTS user_stories_by_lang
        ON user_stories (user_id, learning_lang, native_lang, created_at DESC);
    `))
    .catch((err) => { tableReady = null; throw err; });
  return tableReady;
}

const FIELDS = `id, title, story, tokens, learning_lang AS "learningLang", native_lang AS "nativeLang", created_at AS "createdAt"`;
const MAX_STORY_CHARS = 60000; // ~10k words: far beyond any generated story
const MAX_TOKENS = 5000;

// Returns a clean story row or an error string.
function validate(s) {
  if (!s || typeof s !== 'object') return 'Invalid story.';
  const title = String(s.title || '').trim().slice(0, 120);
  const story = typeof s.story === 'string' ? s.story : '';
  const tokens = Array.isArray(s.tokens) ? s.tokens : null;
  if (!story.trim() || !tokens) return 'A story needs its text and word list.';
  if (story.length > MAX_STORY_CHARS || tokens.length > MAX_TOKENS) return 'This story is too long to save.';
  if (!s.learningLang || !s.nativeLang) return 'Missing language.';
  const cleanTokens = tokens
    .filter((t) => t && typeof t.text === 'string' && t.text.trim())
    .map((t) => ({ text: t.text, translation: typeof t.translation === 'string' ? t.translation : '' }));
  const createdAt = s.createdAt && !Number.isNaN(Date.parse(s.createdAt)) ? new Date(s.createdAt) : new Date();
  return {
    clientId: s.clientId ? String(s.clientId).slice(0, 80) : null,
    title: title || story.trim().slice(0, 60),
    learningLang: String(s.learningLang).slice(0, 8),
    nativeLang: String(s.nativeLang).slice(0, 8),
    story,
    tokens: cleanTokens,
    createdAt,
  };
}

async function insert(userId, s) {
  const result = await db.query(
    `INSERT INTO user_stories (user_id, client_id, title, learning_lang, native_lang, story, tokens, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, client_id) DO NOTHING
     RETURNING ${FIELDS}`,
    [userId, s.clientId, s.title, s.learningLang, s.nativeLang, s.story, JSON.stringify(s.tokens), s.createdAt]
  );
  return result.rows[0] || null;
}

const listStories = async (req, res) => {
  try {
    await ensureStoriesTable();
    const { learningLang, nativeLang } = req.query;
    const result = await db.query(
      `SELECT ${FIELDS} FROM user_stories
        WHERE user_id = $1 AND ($2::text IS NULL OR learning_lang = $2) AND ($3::text IS NULL OR native_lang = $3)
        ORDER BY created_at DESC LIMIT 200`,
      [req.user.id, learningLang || null, nativeLang || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing stories:', err);
    res.status(500).json({ error: 'Could not load your stories' });
  }
};

const saveStory = async (req, res) => {
  try {
    await ensureStoriesTable();
    const s = validate(req.body);
    if (typeof s === 'string') return res.status(400).json({ error: s });
    const row = await insert(req.user.id, s);
    // New stories also grow the shared dictionary (word + translation only, anonymous).
    if (row) {
      dictionary.contribute(s.learningLang, s.nativeLang, s.tokens.map((t) => ({ word: t.text, translation: t.translation })))
        .catch((err) => console.error('Dictionary contribution failed:', err));
    }
    // A repeat of an already-saved client_id is not an error: return 200 with no new row.
    res.status(row ? 201 : 200).json(row || { duplicate: true });
  } catch (err) {
    console.error('Error saving story:', err);
    res.status(500).json({ error: 'Could not save the story' });
  }
};

// One-time upload of stories that were saved in this browser before stories
// were linked to accounts. Safe to repeat: client_id prevents duplicates.
const importStories = async (req, res) => {
  try {
    await ensureStoriesTable();
    const list = Array.isArray(req.body?.stories) ? req.body.stories.slice(0, 100) : null;
    if (!list) return res.status(400).json({ error: 'Expected a list of stories.' });
    let imported = 0;
    for (const raw of list) {
      const s = validate(raw);
      if (typeof s === 'string') continue;
      if (await insert(req.user.id, s)) imported++;
    }
    res.json({ imported });
  } catch (err) {
    console.error('Error importing stories:', err);
    res.status(500).json({ error: 'Could not import your stories' });
  }
};

const deleteStory = async (req, res) => {
  try {
    await ensureStoriesTable();
    await db.query('DELETE FROM user_stories WHERE id = $1 AND user_id = $2', [Number(req.params.storyId), req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting story:', err);
    res.status(500).json({ error: 'Could not delete the story' });
  }
};

// Replace a saved story's word list (used when the learner fills in missing translations).
const updateStoryTokens = async (req, res) => {
  try {
    await ensureStoriesTable();
    const tokens = Array.isArray(req.body?.tokens) ? req.body.tokens : null;
    if (!tokens || tokens.length > MAX_TOKENS) return res.status(400).json({ error: 'Invalid word list.' });
    const clean = tokens
      .filter((t) => t && typeof t.text === 'string' && t.text.trim())
      .map((t) => ({ text: t.text, translation: typeof t.translation === 'string' ? t.translation.slice(0, 160) : '' }));
    const result = await db.query(
      `UPDATE user_stories SET tokens = $1 WHERE id = $2 AND user_id = $3 RETURNING ${FIELDS}`,
      [JSON.stringify(clean), Number(req.params.storyId), req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Story not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating story:', err);
    res.status(500).json({ error: 'Could not update the story' });
  }
};

// "Clear all" for one language pair only.
const clearStories = async (req, res) => {
  try {
    await ensureStoriesTable();
    const { learningLang, nativeLang } = req.query;
    if (!learningLang || !nativeLang) return res.status(400).json({ error: 'Missing language.' });
    const result = await db.query(
      'DELETE FROM user_stories WHERE user_id = $1 AND learning_lang = $2 AND native_lang = $3',
      [req.user.id, learningLang, nativeLang]
    );
    res.json({ deleted: result.rowCount });
  } catch (err) {
    console.error('Error clearing stories:', err);
    res.status(500).json({ error: 'Could not clear your stories' });
  }
};

module.exports = { listStories, saveStory, importStories, deleteStory, clearStories, updateStoryTokens };
