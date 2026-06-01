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

// ============ USER DECK MANAGEMENT ============

/**
 * Get all decks for the current user
 */
const getUserDecks = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, "learning_lang" AS "learningLang", "native_lang" AS "nativeLang", cards, created_at, updated_at 
       FROM user_decks 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [req.user.id]
    );

    // Parse cards from JSONB
    const decks = result.rows.map(deck => ({
      ...deck,
      cards: Array.isArray(deck.cards) ? deck.cards : JSON.parse(deck.cards || '[]')
    }));

    res.json(decks);
  } catch (err) {
    console.error('Error fetching user decks:', err);
    res.status(500).json({ error: 'Unable to load decks' });
  }
};

/**
 * Create a new deck for the current user
 */
const createUserDeck = async (req, res) => {
  try {
    const { name, learningLang, nativeLang, cards = [] } = req.body;

    if (!name || !learningLang || !nativeLang) {
      return res.status(400).json({ error: 'Missing required fields: name, learningLang, nativeLang' });
    }

    const result = await db.query(
      `INSERT INTO user_decks (user_id, name, "learning_lang", "native_lang", cards)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, "learning_lang" AS "learningLang", "native_lang" AS "nativeLang", cards, created_at, updated_at`,
      [req.user.id, name, learningLang, nativeLang, JSON.stringify(cards)]
    );

    const deck = result.rows[0];
    res.json({
      ...deck,
      cards: Array.isArray(deck.cards) ? deck.cards : JSON.parse(deck.cards || '[]')
    });
  } catch (err) {
    console.error('Error creating deck:', err);
    res.status(500).json({ error: 'Unable to create deck' });
  }
};

/**
 * Update a user's deck
 */
const updateUserDeck = async (req, res) => {
  try {
    const { deckId } = req.params;
    const { name, cards } = req.body;

    if (!deckId) {
      return res.status(400).json({ error: 'Deck ID is required' });
    }

    // Verify ownership
    const deckCheck = await db.query(
      'SELECT user_id FROM user_decks WHERE id = $1',
      [deckId]
    );

    if (!deckCheck.rows.length) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    if (deckCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await db.query(
      `UPDATE user_decks 
       SET name = COALESCE($1, name), 
           cards = COALESCE($2, cards),
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING id, name, "learning_lang" AS "learningLang", "native_lang" AS "nativeLang", cards, created_at, updated_at`,
      [name || null, cards ? JSON.stringify(cards) : null, deckId, req.user.id]
    );

    const deck = result.rows[0];
    res.json({
      ...deck,
      cards: Array.isArray(deck.cards) ? deck.cards : JSON.parse(deck.cards || '[]')
    });
  } catch (err) {
    console.error('Error updating deck:', err);
    res.status(500).json({ error: 'Unable to update deck' });
  }
};

/**
 * Delete a user's deck
 */
const deleteUserDeck = async (req, res) => {
  try {
    const { deckId } = req.params;

    if (!deckId) {
      return res.status(400).json({ error: 'Deck ID is required' });
    }

    // Verify ownership
    const deckCheck = await db.query(
      'SELECT user_id FROM user_decks WHERE id = $1',
      [deckId]
    );

    if (!deckCheck.rows.length) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    if (deckCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.query(
      'DELETE FROM user_decks WHERE id = $1 AND user_id = $2',
      [deckId, req.user.id]
    );

    res.json({ message: 'Deck deleted successfully' });
  } catch (err) {
    console.error('Error deleting deck:', err);
    res.status(500).json({ error: 'Unable to delete deck' });
  }
};

module.exports = {
  listPublicDecks,
  publishDeck,
  listPublicStories,
  publishStory,
  getUserDecks,
  createUserDeck,
  updateUserDeck,
  deleteUserDeck
};
