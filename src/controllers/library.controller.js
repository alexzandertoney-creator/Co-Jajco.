const db = require('../config/db.js');

const getAuthorName = async (userId) => {
  try {
    const result = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (!result.rows.length) return 'Anonymous';
    const email = result.rows[0].email || '';
    return email.split('@')[0] || 'Anonymous';
  } catch (err) {
    console.error('Failed to resolve author name:', err);
    return 'Anonymous';
  }
};

const listPublicDecks = async (req, res) => {
  try {
    const { learningLang, nativeLang, level, limit = 50 } = req.query;
    const where = [];
    const values = [];
    let idx = 1;

    if (learningLang) {
      where.push(`"learning_lang" = $${idx++}`);
      values.push(learningLang);
    }
    if (nativeLang) {
      where.push(`"native_lang" = $${idx++}`);
      values.push(nativeLang);
    }
    if (level) {
      where.push(`level = $${idx++}`);
      values.push(level);
    }

    const query = `SELECT id, name, "learning_lang" AS "learningLang", "native_lang" AS "nativeLang", level, cards, author, created_at FROM public_decks${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT $${idx}`;
    values.push(Number(limit));

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing public decks:', err);
    res.status(500).json({ error: 'Unable to load public decks' });
  }
};

const publishDeck = async (req, res) => {
  try {
    const { name, learningLang, nativeLang, level, cards } = req.body;

    if (!name || !learningLang || !nativeLang || !cards || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'Missing required deck fields' });
    }

    const author = await getAuthorName(req.user.id);
    const result = await db.query(
      `INSERT INTO public_decks (user_id, name, "learning_lang", "native_lang", level, cards, author)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, "learning_lang" AS "learningLang", "native_lang" AS "nativeLang", level, cards, author, created_at`,
      [req.user.id, name, learningLang, nativeLang, level || 'Unspecified', JSON.stringify(cards), author]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error publishing deck:', err);
    res.status(500).json({ error: 'Unable to publish deck' });
  }
};

const listPublicStories = async (req, res) => {
  try {
    const { learningLang, nativeLang, level, limit = 50 } = req.query;
    const where = [];
    const values = [];
    let idx = 1;

    if (learningLang) {
      where.push(`"learning_lang" = $${idx++}`);
      values.push(learningLang);
    }
    if (nativeLang) {
      where.push(`"native_lang" = $${idx++}`);
      values.push(nativeLang);
    }
    if (level) {
      where.push(`level = $${idx++}`);
      values.push(level);
    }

    const query = `SELECT id, title, story, tokens, "learning_lang" AS "learningLang", "native_lang" AS "nativeLang", level, author, created_at FROM public_stories${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT $${idx}`;
    values.push(Number(limit));

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing public stories:', err);
    res.status(500).json({ error: 'Unable to load public stories' });
  }
};

const publishStory = async (req, res) => {
  try {
    const { title, story, tokens, learningLang, nativeLang, level } = req.body;

    if (!story || !tokens || !Array.isArray(tokens) || !learningLang || !nativeLang) {
      return res.status(400).json({ error: 'Missing required story fields' });
    }

    const author = await getAuthorName(req.user.id);
    const result = await db.query(
      `INSERT INTO public_stories (user_id, title, story, tokens, "learning_lang", "native_lang", level, author)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, story, tokens, "learning_lang" AS "learningLang", "native_lang" AS "nativeLang", level, author, created_at`,
      [req.user.id, title || 'Published Story', story, JSON.stringify(tokens), learningLang, nativeLang, level || 'Unspecified', author]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error publishing story:', err);
    res.status(500).json({ error: 'Unable to publish story' });
  }
};

module.exports = {
  listPublicDecks,
  publishDeck,
  listPublicStories,
  publishStory
};
