// Runs the real src/services/dictionary.service.js against Postgres (PGlite) with the real seed files.
const Module = require('module');
const path = require('path');
const assert = require('assert/strict');
process.env.DICT_SEED_BUDGET_MS ||= '600000'; // load the whole seed in one go here

(async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = new PGlite();
  const db = { query: async (t, p) => (p ? pg.query(t, p) : pg.exec(t).then((x) => x.at(-1))) };
  const orig = Module.prototype.require;
  Module.prototype.require = function (id) { return id === '../config/db.js' ? db : orig.apply(this, arguments); };
  const dict = require(path.join(__dirname, '../src/services/dictionary.service.js'));
  Module.prototype.require = orig;

  // First lookup creates tables and seeds Polish
  let t0 = Date.now();
  let r = await dict.lookup('pl', 'en', ['Jajko', 'kota,', 'kupuje', 'xyzzy']);
  const seedMs = Date.now() - t0;
  assert.equal(r.jajko.translation, 'egg');
  assert.equal(r.kota.lemma, 'kot');
  assert.equal(r.kupuje.lemma, 'kupować');
  assert.equal(r.xyzzy, undefined);
  const count = (await pg.query(`SELECT count(*)::int AS n FROM dictionary_entries WHERE learning_lang='pl'`)).rows[0].n;
  assert.ok(count > 140000, `seeded ${count}`);

  // Inflected forms not in the seed are found through their base form
  r = await dict.lookup('pl', 'en', ['dialektami', 'słowackim', 'leksykę', 'Polsce']);
  assert.equal(r.dialektami.translation, 'dialect'); assert.equal(r.dialektami.lemma, 'dialekt');
  assert.equal(r.słowackim.translation, 'Slovak');
  assert.equal(r.leksykę.lemma, 'leksyka');
  assert.equal(r.polsce.translation, 'Poland');
  assert.deepEqual(dict.baseForms('en', 'houses'), [], 'ending rules are Polish only');

  // Seeding is not repeated
  t0 = Date.now();
  await dict.lookup('pl', 'en', ['jajko']);
  const secondMs = Date.now() - t0;

  // Contributions: anonymous, repeated pairs rank higher than the seed gloss
  assert.equal(await dict.contribute('pl', 'en', [{ word: 'Kota', translation: 'cat (accusative)' }]), 1);
  await dict.contribute('pl', 'en', [{ word: 'kota', translation: 'cat (accusative)' }]);
  r = await dict.lookup('pl', 'en', ['kota']);
  assert.equal(r.kota.translation, 'cat (accusative)');
  // Junk is ignored
  assert.equal(await dict.contribute('pl', 'en', [{ word: 'spam', translation: 'http://x.com' }, { word: '123', translation: '456' }, { word: '', translation: 'x' }]), 0);
  // New word becomes available to everyone
  await dict.contribute('pl', 'en', [{ word: 'Bigfoot', translation: 'Bigfoot' }]);
  r = await dict.lookup('pl', 'en', ['bigfoot']); assert.equal(r.bigfoot.translation, 'Bigfoot');
  // No user data stored
  const cols = (await pg.query(`SELECT column_name FROM information_schema.columns WHERE table_name='dictionary_entries'`)).rows.map((x) => x.column_name);
  assert.ok(!cols.some((c) => /user/.test(c)), cols.join(','));

  // Other languages seed independently
  r = await dict.lookup('es', 'en', ['huevo', 'casa']); assert.ok(r.huevo && r.casa);
  r = await dict.lookup('fr', 'en', ['pomme']); assert.ok(r.pomme);
  r = await dict.lookup('it', 'en', ['mela']); assert.ok(r.mela);
  // Unknown pair: no seed, no crash
  r = await dict.lookup('jp', 'en', ['x']); assert.deepEqual(r, {});

  console.log(`ALL DICTIONARY CHECKS PASSED (pl seed: ${count} rows in ${seedMs} ms, next lookup ${secondMs} ms)`);
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
