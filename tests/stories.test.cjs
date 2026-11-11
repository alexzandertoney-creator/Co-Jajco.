// Runs the real src/controllers/stories.controller.js against Postgres (PGlite),
// starting from the production users schema.
const Module = require('module');
const path = require('path');
const assert = require('assert/strict');

(async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite();
  await pg.exec(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    "nativeLang" TEXT, "learningLang" TEXT)`);
  await pg.exec(`INSERT INTO users (email, password) VALUES ('a@b.c','x'), ('d@e.f','y')`);

  // node-postgres returns rowCount; PGlite calls it affectedRows.
  const db = { query: async (t, p) => { const r = p ? await pg.query(t, p) : await pg.exec(t).then((x) => x.at(-1)); return { ...r, rowCount: r.affectedRows ?? r.rows?.length }; } };
  const orig = Module.prototype.require;
  Module.prototype.require = function (id) { return id === '../config/db.js' ? db : orig.apply(this, arguments); };
  const c = require(path.join(__dirname, '../src/controllers/stories.controller.js'));
  Module.prototype.require = orig;

  const call = (fn, { user = 1, body = {}, query = {}, params = {} } = {}) => new Promise((resolve) => {
    const res = { code: 200, status(x) { this.code = x; return this; }, json(b) { resolve({ code: this.code, body: b }); } };
    fn({ user: { id: user }, body, query, params }, res);
  });
  const story = (over = {}) => ({ title: 'Na targu', story: 'Ola kupuje chleb.', tokens: [{ text: 'Ola', translation: 'Ola' }, { text: 'kupuje', translation: 'buys' }, { bad: 1 }], learningLang: 'pl', nativeLang: 'en', ...over });

  // Empty list creates the table
  let r = await call(c.listStories, { query: { learningLang: 'pl', nativeLang: 'en' } });
  assert.equal(r.code, 200, JSON.stringify(r.body)); assert.deepEqual(r.body, []);

  // Save
  r = await call(c.saveStory, { body: story({ clientId: 'c1' }) });
  assert.equal(r.code, 201, JSON.stringify(r.body));
  assert.equal(r.body.title, 'Na targu'); assert.equal(r.body.tokens.length, 2); // malformed token dropped
  const firstId = r.body.id;
  // Same clientId again: not duplicated
  r = await call(c.saveStory, { body: story({ clientId: 'c1' }) }); assert.equal(r.code, 200); assert.equal(r.body.duplicate, true);
  // Validation
  r = await call(c.saveStory, { body: story({ story: '' }) }); assert.equal(r.code, 400);
  r = await call(c.saveStory, { body: story({ tokens: 'x' }) }); assert.equal(r.code, 400);

  // Other language + other user don't leak into the list
  await call(c.saveStory, { body: story({ clientId: 'c2', learningLang: 'es' }) });
  await call(c.saveStory, { user: 2, body: story({ clientId: 'c3', title: 'Not yours' }) });
  r = await call(c.listStories, { query: { learningLang: 'pl', nativeLang: 'en' } });
  assert.equal(r.body.length, 1); assert.equal(r.body[0].title, 'Na targu');

  // Import (migration): new + already-known clientIds, newest first in the list
  r = await call(c.importStories, { body: { stories: [
    story({ clientId: 'c1' }),
    story({ clientId: 'old-1', title: 'Old story', createdAt: '2026-01-01T10:00:00Z' }),
    story({ clientId: 'old-2', title: 'Broken', story: '' }),
  ] } });
  assert.equal(r.code, 200); assert.equal(r.body.imported, 1);
  r = await call(c.importStories, { body: { stories: [story({ clientId: 'old-1', title: 'Old story' })] } });
  assert.equal(r.body.imported, 0); // repeat is harmless
  r = await call(c.listStories, { query: { learningLang: 'pl', nativeLang: 'en' } });
  assert.deepEqual(r.body.map((s) => s.title), ['Na targu', 'Old story']);

  // Someone else can't delete your story
  await call(c.deleteStory, { user: 2, params: { storyId: String(firstId) } });
  r = await call(c.listStories, { query: { learningLang: 'pl', nativeLang: 'en' } }); assert.equal(r.body.length, 2);
  // You can
  await call(c.deleteStory, { params: { storyId: String(firstId) } });
  r = await call(c.listStories, { query: { learningLang: 'pl', nativeLang: 'en' } }); assert.equal(r.body.length, 1);

  // Clear all only touches this language pair
  r = await call(c.clearStories, { query: { learningLang: 'pl', nativeLang: 'en' } }); assert.equal(r.code, 200);
  r = await call(c.listStories, { query: { learningLang: 'pl', nativeLang: 'en' } }); assert.equal(r.body.length, 0);
  r = await call(c.listStories, { query: { learningLang: 'es', nativeLang: 'en' } }); assert.equal(r.body.length, 1);
  r = await call(c.clearStories, { query: {} }); assert.equal(r.code, 400);

  console.log('ALL STORY SQL CHECKS PASSED');
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
