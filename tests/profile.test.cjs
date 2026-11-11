// Runs the real src/routes/auth.routes.js handlers against a real Postgres (PGlite),
// with express/auth stubbed out, starting from the production users schema.
const Module = require('module');
const path = require('path');
const assert = require('assert/strict');

const ROUTES = path.join(__dirname, '../src/routes/auth.routes.js');

(async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite();
  // Exact production schema from src/config/db.js
  await pg.exec(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    "nativeLang" TEXT, "learningLang" TEXT)`);
  await pg.query(`INSERT INTO users (email, password, "nativeLang", "learningLang") VALUES ('a@b.c','x','en','pl')`);

  const handlers = {};
  const stubs = {
    express: { Router: () => {
      const r = {};
      for (const m of ['get', 'post', 'put', 'delete']) r[m] = (p, ...fns) => { handlers[`${m.toUpperCase()} ${p}`] = fns.at(-1); };
      return r;
    } },
    '../controllers/auth.controller.js': {},
    '../middleware/auth.middleware.js': (q, s, n) => n(),
    '../config/db.js': { query: (text, params) => pg.query(text, params) },
  };
  const origRequire = Module.prototype.require;
  Module.prototype.require = function (id) { return id in stubs ? stubs[id] : origRequire.apply(this, arguments); };
  require(path.resolve(ROUTES));
  Module.prototype.require = origRequire;

  const call = (key, body = {}) => new Promise((resolve) => {
    const res = { code: 200, status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b }); } };
    handlers[key]({ user: { id: 1 }, body }, res);
  });

  // Existing endpoints keep working on the old schema
  let r = await call('GET /me');
  assert.equal(r.code, 200); assert.equal(r.body.learningLang, 'pl');

  // Profile: columns get added lazily, defaults apply
  r = await call('GET /me/profile');
  assert.equal(r.code, 200, JSON.stringify(r.body));
  assert.equal(r.body.dailyGoal, 20); assert.deepEqual(r.body.activity, {});

  // Second call (columns already exist) must also work
  r = await call('GET /me/profile'); assert.equal(r.code, 200);

  // Update
  r = await call('PUT /me/profile', { displayName: ' Majd ', dailyGoal: 30, nativeLang: 'en' });
  assert.equal(r.code, 200, JSON.stringify(r.body)); assert.equal(r.body.displayName, 'Majd'); assert.equal(r.body.dailyGoal, 30);
  r = await call('PUT /me/profile', { dailyGoal: 999 }); assert.equal(r.code, 400);
  r = await call('PUT /me/profile', { nativeLang: 'xx' }); assert.equal(r.code, 400);
  r = await call('PUT /me/profile', {}); assert.equal(r.code, 200); assert.equal(r.body.displayName, 'Majd'); // partial update keeps fields

  // Activity: increments per day
  r = await call('POST /me/activity', { date: '2026-11-11', count: 3 });
  assert.equal(r.code, 200, JSON.stringify(r.body)); assert.equal(r.body.activity['2026-11-11'], 3);
  r = await call('POST /me/activity', { date: '2026-11-11', count: 2 });
  assert.equal(r.body.activity['2026-11-11'], 5);
  r = await call('POST /me/activity', { date: '2026-11-12', count: 1 });
  assert.deepEqual(r.body.activity, { '2026-11-11': 5, '2026-11-12': 1 });
  r = await call('POST /me/activity', { date: 'nope', count: 1 }); assert.equal(r.code, 400);
  r = await call('POST /me/activity', { date: '2026-11-12', count: 0 }); assert.equal(r.code, 400);

  // Language endpoint still fine after the new columns exist
  r = await call('PUT /me/language', { learningLang: 'es' }); assert.equal(r.code, 200);
  r = await call('GET /me'); assert.equal(r.body.learningLang, 'es');

  // Duplicate email raises 23505 (used for the friendly register message)
  try { await pg.query(`INSERT INTO users (email, password) VALUES ('a@b.c','y')`); assert.fail('no error'); }
  catch (e) { assert.equal(e.code, '23505'); }

  console.log('ALL SQL CHECKS PASSED');
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
