const db = require('../config/db.js');

// Private notebook: free writing and notes per user and language, plus the last
// "check with AI" result for each note (pasted back from ChatGPT / Claude by the user).
// Created lazily like user_stories: on Vercel the schema init in db.js never runs.
let tableReady = null;
function ensureNotesTable() {
  tableReady ??= db.query(`SELECT to_regclass('public.user_notes') AS t`)
    .then((r) => r.rows[0].t ? null : db.query(`
      CREATE TABLE IF NOT EXISTS user_notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        learning_lang TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        "check" JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS user_notes_by_user ON user_notes (user_id, learning_lang, updated_at DESC);
    `))
    .catch((err) => { tableReady = null; throw err; });
  return tableReady;
}

const FIELDS = `id, title, body, "check", learning_lang AS "learningLang", created_at AS "createdAt", updated_at AS "updatedAt"`;
const MAX_BODY = 20000;
const MAX_TITLE = 120;
const MAX_CHECK = 60000; // characters of JSON

// Picks the editable fields from a request body; returns { fields } or { error }.
function clean(body = {}) {
  const fields = {};
  if ('title' in body) fields.title = String(body.title ?? '').trim().slice(0, MAX_TITLE);
  if ('body' in body) {
    if (typeof body.body !== 'string') return { error: 'Invalid note.' };
    if (body.body.length > MAX_BODY) return { error: 'This note is too long (20,000 characters max).' };
    fields.body = body.body;
  }
  if ('check' in body) {
    if (body.check !== null && (typeof body.check !== 'object' || Array.isArray(body.check))) return { error: 'Invalid check.' };
    const json = body.check === null ? null : JSON.stringify(body.check);
    if (json && json.length > MAX_CHECK) return { error: 'This check is too long to save.' };
    fields.check = json;
  }
  return { fields };
}

const listNotes = async (req, res) => {
  try {
    await ensureNotesTable();
    const lang = String(req.query.learningLang || '').slice(0, 8);
    const r = await db.query(
      `SELECT ${FIELDS} FROM user_notes WHERE user_id = $1 AND ($2 = '' OR learning_lang = $2) ORDER BY updated_at DESC LIMIT 500`,
      [req.user.id, lang]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Error listing notes:', err);
    res.status(500).json({ error: 'Could not load your notes' });
  }
};

const createNote = async (req, res) => {
  try {
    await ensureNotesTable();
    const { fields, error } = clean(req.body);
    if (error) return res.status(400).json({ error });
    const lang = String(req.body?.learningLang || '').slice(0, 8);
    if (!lang) return res.status(400).json({ error: 'Missing language.' });
    const r = await db.query(
      `INSERT INTO user_notes (user_id, learning_lang, title, body) VALUES ($1, $2, $3, $4) RETURNING ${FIELDS}`,
      [req.user.id, lang, fields.title ?? '', fields.body ?? '']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Could not create the note' });
  }
};

const badId = (id) => !/^\d{1,9}$/.test(String(id));

const updateNote = async (req, res) => {
  if (badId(req.params.noteId)) return res.status(404).json({ error: 'Note not found' });
  try {
    await ensureNotesTable();
    const { fields, error } = clean(req.body);
    if (error) return res.status(400).json({ error });
    const keys = Object.keys(fields);
    if (!keys.length) return res.status(400).json({ error: 'Nothing to update.' });
    // Column names come from the fixed list in clean(), never from the request.
    const sets = keys.map((k, i) => (k === 'check' ? `"check" = $${i + 3}::jsonb` : `${k} = $${i + 3}`));
    const r = await db.query(
      `UPDATE user_notes SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING ${FIELDS}`,
      [req.params.noteId, req.user.id, ...keys.map((k) => fields[k])]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Note not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ error: 'Could not save the note' });
  }
};

const deleteNote = async (req, res) => {
  if (badId(req.params.noteId)) return res.status(404).json({ error: 'Note not found' });
  try {
    await ensureNotesTable();
    const r = await db.query('DELETE FROM user_notes WHERE id = $1 AND user_id = $2', [req.params.noteId, req.user.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Note not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Could not delete the note' });
  }
};

module.exports = { listNotes, createNote, updateNote, deleteNote };
