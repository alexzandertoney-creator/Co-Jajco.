// Runs the real auth service, library controller (card PATCH, reports) and dictionary
// search against Postgres (PGlite) on the production schema. Run: npm test
const Module = require('module');
const path = require('path');
const assert = require('assert/strict');
const ROOT = path.join(__dirname, '..');

(async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite();
  await pg.exec(`
    CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, "nativeLang" TEXT, "learningLang" TEXT);
    CREATE TABLE public_decks (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, name TEXT NOT NULL,
      "learning_lang" TEXT, "native_lang" TEXT, level TEXT, cards JSONB NOT NULL, author TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE user_decks (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL,
      "learning_lang" TEXT, "native_lang" TEXT, cards JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE public_stories (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, title TEXT, story TEXT NOT NULL,
      tokens JSONB NOT NULL, "learning_lang" TEXT, "native_lang" TEXT, level TEXT, author TEXT, created_at TIMESTAMPTZ DEFAULT NOW());`);
  const db = { query: async (t, p) => (p ? pg.query(t, p) : pg.exec(t).then((x) => x.at(-1))) };
  const orig = Module.prototype.require;
  Module.prototype.require = function (id) { return id === '../config/db.js' ? db : orig.apply(this, arguments); };
  const auth = require(path.join(ROOT, 'src/services/auth.service.js'));
  const lib = require(path.join(ROOT, 'src/controllers/library.controller.js'));
  const dict = require(path.join(ROOT, 'src/services/dictionary.service.js'));
  Module.prototype.require = orig;

  const call = (fn, req) => new Promise((resolve) => {
    const res = { code: 200, status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b }); } };
    fn({ query: {}, params: {}, body: {}, ...req }, res);
  });
  const rejects = async (p, status, re) => {
    try { await p; } catch (e) { assert.equal(e.status, status, e.message); if (re) assert.match(e.message, re); return; }
    assert.fail('expected rejection');
  };

  // ---- Register / login ----
  await auth.register({ email: 'Ola@Example.com', password: 'password1', nativeLang: 'en', learningLang: 'pl' });
  await rejects(auth.register({ email: 'ola@example.com', password: 'password1', nativeLang: 'en', learningLang: 'pl' }), 400, /already exists/);
  await rejects(auth.register({ email: 'bad', password: 'password1', nativeLang: 'en', learningLang: 'pl' }), 400, /valid email/);
  await rejects(auth.register({ email: 'x@y.z', password: 'short', nativeLang: 'en', learningLang: 'pl' }), 400, /8 characters/);
  assert.ok((await auth.login('OLA@example.com ', 'password1', '1.1.1.1')).token, 'case-insensitive login');

  // 8 failures per email -> 429, even with the right password; other emails unaffected
  for (let i = 0; i < 8; i++) await rejects(auth.login('ola@example.com', 'wrong', '2.2.2.2'), 400, /Invalid/);
  await rejects(auth.login('ola@example.com', 'password1', '3.3.3.3'), 429);
  await pg.query(`UPDATE login_attempts SET at = now() - interval '16 minutes'`);
  assert.ok((await auth.login('ola@example.com', 'password1', '3.3.3.3')).token, 'limit expires after 15 min');
  assert.equal((await pg.query(`SELECT count(*)::int n FROM login_attempts WHERE email='ola@example.com'`)).rows[0].n, 0, 'success clears attempts');
  // 30 failures per IP across emails -> 429
  for (let i = 0; i < 30; i++) await rejects(auth.login(`u${i}@x.y`, 'wrong', '9.9.9.9'), 400);
  await rejects(auth.login('ola@example.com', 'password1', '9.9.9.9'), 429);

  // ---- Change password ----
  await rejects(auth.changePassword(1, 'nope', 'newpassword'), 400, /current password/);
  await rejects(auth.changePassword(1, 'password1', 'short'), 400, /8 characters/);
  await auth.changePassword(1, 'password1', 'newpassword');
  assert.ok((await auth.login('ola@example.com', 'newpassword', '4.4.4.4')).token);
  await rejects(auth.login('ola@example.com', 'password1', '4.4.4.4'), 400);

  // ---- Card progress PATCH ----
  const cards = [{ question: 'egg', answer: 'jajko' }, { question: 'bread', answer: 'chleb', note: 'n' }, { question: 'egg', answer: 'jajo' }];
  await pg.query(`INSERT INTO user_decks (user_id, name, cards) VALUES (1, 'D', $1)`, [JSON.stringify(cards)]);
  const srs = { reps: 1, interval: 1, ease: 2.5, due: '2026-11-12' };
  let r = await call(lib.updateCardProgress, { user: { id: 1 }, params: { deckId: '1' },
    body: { match: { question: 'bread', answer: 'chleb' }, set: { srs, stats: { right: 1 }, question: 'HACK' } } });
  assert.equal(r.code, 200, JSON.stringify(r.body));
  let saved = (await pg.query('SELECT cards FROM user_decks WHERE id=1')).rows[0].cards;
  assert.deepEqual(saved.map((c) => c.answer), ['jajko', 'chleb', 'jajo'], 'order kept');
  assert.deepEqual(saved[1], { question: 'bread', answer: 'chleb', note: 'n', srs, stats: { right: 1 } }, 'only progress fields merged');
  assert.equal(saved[0].srs, undefined);
  r = await call(lib.updateCardProgress, { user: { id: 2 }, params: { deckId: '1' }, body: { match: { question: 'bread', answer: 'chleb' }, set: { srs } } });
  assert.equal(r.code, 404, 'other users cannot write');
  r = await call(lib.updateCardProgress, { user: { id: 1 }, params: { deckId: '1' }, body: { match: { question: 'bread', answer: 'chleb' }, set: { name: 'x' } } });
  assert.equal(r.code, 400);

  // ---- Reports: 3 different people hide an item; repeats from one person don't count ----
  await auth.register({ email: 'b@x.yz', password: 'password1', nativeLang: 'en', learningLang: 'pl' });
  await auth.register({ email: 'c@x.yz', password: 'password1', nativeLang: 'en', learningLang: 'pl' });
  await auth.register({ email: 'd@x.yz', password: 'password1', nativeLang: 'en', learningLang: 'pl' });
  const uid = async (e) => (await pg.query('SELECT id FROM users WHERE email=$1', [e])).rows[0].id;
  await pg.query(`INSERT INTO public_decks (user_id, name, cards, author) VALUES (1, 'Mine', '[]', 'ola'), ($1, 'Other', '[]', 'b')`, [await uid('b@x.yz')]);
  const listed = async () => (await call(lib.listPublicDecks, {})).body.map((d) => d.name).sort();
  assert.deepEqual(await listed(), ['Mine', 'Other']);
  for (const e of ['b@x.yz', 'b@x.yz', 'c@x.yz']) assert.equal((await call(lib.reportContent, { user: { id: await uid(e) }, body: { kind: 'deck', id: 2 } })).code, 200);
  assert.deepEqual(await listed(), ['Mine', 'Other'], 'two people is not enough');
  await call(lib.reportContent, { user: { id: await uid('d@x.yz') }, body: { kind: 'deck', id: 2, reason: 'spam' } });
  assert.deepEqual(await listed(), ['Mine'], 'hidden after three people');
  assert.equal((await call(lib.reportContent, { user: { id: 1 }, body: { kind: 'user', id: 1 } })).code, 400);
  r = await call(lib.listPublicDecks, { query: { limit: 'abc' } });
  assert.equal(r.code, 200, 'bad limit does not crash');

  // ---- Delete account: private data gone, public content anonymised ----
  await pg.query(`INSERT INTO public_stories (user_id, story, tokens, author) VALUES (1, 's', '[]', 'ola')`);
  await rejects(auth.deleteAccount(1, 'wrong'), 400, /incorrect/);
  await auth.deleteAccount(1, 'newpassword');
  assert.equal((await pg.query('SELECT count(*)::int n FROM users WHERE id=1')).rows[0].n, 0);
  assert.equal((await pg.query('SELECT count(*)::int n FROM user_decks')).rows[0].n, 0, 'decks cascade');
  const pub = (await pg.query(`SELECT user_id, author FROM public_decks WHERE name='Mine'`)).rows[0];
  assert.deepEqual(pub, { user_id: null, author: 'Former member' });
  assert.equal((await pg.query(`SELECT author FROM public_stories`)).rows[0].author, 'Former member');
  await rejects(auth.login('ola@example.com', 'newpassword', '5.5.5.5'), 400);

  // ---- Dictionary search, both directions + en:pl seed ----
  let s = await dict.search('pl', 'en', 'jajk');
  assert.equal(s[0].word, 'jajko', JSON.stringify(s.slice(0, 3)));
  s = await dict.search('pl', 'en', 'egg');
  assert.ok(s.some((x) => x.word === 'jajko'), 'search by meaning');
  assert.deepEqual(await dict.search('pl', 'en', 'j'), [], 'too short');
  assert.ok(Array.isArray(await dict.search('pl', 'en', '%_\\')), 'wildcards escaped');
  s = await dict.search('en', 'pl', 'house');
  assert.equal(s[0].word, 'house'); assert.match(s[0].translation, /dom/);
  const en = await dict.lookup('en', 'pl', ['houses', 'walked']);
  assert.ok(en.houses && en.walked, JSON.stringify(en));

  console.log('ALL ACCOUNT / LIBRARY / SEARCH CHECKS PASSED');
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
