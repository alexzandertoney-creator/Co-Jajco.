// Runs the real notes controller against Postgres (PGlite) on the production users schema.
const Module = require('module');
const path = require('path');
const assert = require('assert/strict');

(async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite();
  await pg.exec(`CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, "nativeLang" TEXT, "learningLang" TEXT);
    INSERT INTO users (email, password) VALUES ('a@b.c','x'), ('d@e.f','x');`);
  const db = { query: async (t, p) => (p ? pg.query(t, p) : pg.exec(t).then((x) => x.at(-1))) };
  const orig = Module.prototype.require;
  Module.prototype.require = function (id) { return id === '../config/db.js' ? db : orig.apply(this, arguments); };
  const c = require(path.join(__dirname, '../src/controllers/notes.controller.js'));
  Module.prototype.require = orig;
  const call = (fn, req) => new Promise((resolve) => {
    const res = { code: 200, status(x) { this.code = x; return this; }, json(b) { resolve({ code: this.code, body: b }); } };
    fn({ query: {}, params: {}, body: {}, user: { id: 1 }, ...req }, res);
  });

  // Create, list (newest first, per language), update, check, delete
  let r = await call(c.createNote, { body: { learningLang: 'pl', title: 'Weekend', body: 'W sobotę idę do kino.' } });
  assert.equal(r.code, 201, JSON.stringify(r.body));
  const id = r.body.id;
  await call(c.createNote, { body: { learningLang: 'es', body: 'Hola' } });
  r = await call(c.listNotes, { query: { learningLang: 'pl' } });
  assert.deepEqual(r.body.map((n) => n.title), ['Weekend']);

  const check = { corrected: 'W sobotę idę do kina.', mistakes: [{ wrong: 'do kino', right: 'do kina', why: 'do + dopełniacz' }] };
  r = await call(c.updateNote, { params: { noteId: String(id) }, body: { body: 'W sobotę idę do kina.', check } });
  assert.equal(r.code, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.check, check);
  assert.equal(r.body.title, 'Weekend', 'untouched fields kept');
  r = await call(c.updateNote, { params: { noteId: String(id) }, body: { check: null } });
  assert.equal(r.body.check, null);

  // Other users can't see, change or delete it; bad input is rejected
  r = await call(c.listNotes, { user: { id: 2 }, query: { learningLang: 'pl' } });
  assert.deepEqual(r.body, []);
  r = await call(c.updateNote, { user: { id: 2 }, params: { noteId: String(id) }, body: { body: 'hack' } });
  assert.equal(r.code, 404);
  r = await call(c.deleteNote, { user: { id: 2 }, params: { noteId: String(id) } });
  assert.equal(r.code, 404);
  assert.equal((await call(c.updateNote, { params: { noteId: 'abc' }, body: { body: 'x' } })).code, 404);
  assert.equal((await call(c.updateNote, { params: { noteId: String(id) }, body: {} })).code, 400);
  assert.equal((await call(c.updateNote, { params: { noteId: String(id) }, body: { body: 'x'.repeat(20001) } })).code, 400);
  assert.equal((await call(c.updateNote, { params: { noteId: String(id) }, body: { check: [1] } })).code, 400);
  assert.equal((await call(c.createNote, { body: { body: 'no language' } })).code, 400);
  // SQL in a field is stored as text
  r = await call(c.updateNote, { params: { noteId: String(id) }, body: { title: "x'); DROP TABLE user_notes; --" } });
  assert.equal(r.body.title, "x'); DROP TABLE user_notes; --");

  r = await call(c.deleteNote, { params: { noteId: String(id) } });
  assert.equal(r.code, 200);
  // Deleting the account removes its notes
  await pg.query('DELETE FROM users WHERE id = 1');
  assert.equal((await pg.query('SELECT count(*)::int n FROM user_notes')).rows[0].n, 0);

  console.log('ALL NOTES CHECKS PASSED');
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
