const db = require('../config/db.js');

// Community moderation for the public Library: any signed-in user can report a deck
// or story; once REPORT_LIMIT different people have reported it, it is hidden from
// listings (the data stays, so the owner/admin can review and restore it).
const REPORT_LIMIT = 3;

let ready = null;
function ensureReportsTable() {
  ready ??= db.query(`SELECT to_regclass('public.content_reports') AS t`)
    .then((r) => r.rows[0].t ? null : db.query(`
      CREATE TABLE IF NOT EXISTS content_reports (
        id SERIAL PRIMARY KEY,
        kind TEXT NOT NULL CHECK (kind IN ('deck', 'story')),
        item_id INTEGER NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (kind, item_id, user_id)
      );
    `))
    .catch((err) => { ready = null; throw err; });
  return ready;
}

/** SQL condition hiding items reported by REPORT_LIMIT or more people. */
const notHidden = (kind, table) =>
  `(SELECT count(*) FROM content_reports r WHERE r.kind = '${kind}' AND r.item_id = ${table}.id) < ${REPORT_LIMIT}`;

async function report(kind, itemId, userId, reason) {
  await ensureReportsTable();
  await db.query(
    `INSERT INTO content_reports (kind, item_id, user_id, reason) VALUES ($1, $2, $3, $4)
     ON CONFLICT (kind, item_id, user_id) DO NOTHING`,
    [kind, itemId, userId, reason ? String(reason).slice(0, 300) : null]
  );
}

module.exports = { ensureReportsTable, notHidden, report };
