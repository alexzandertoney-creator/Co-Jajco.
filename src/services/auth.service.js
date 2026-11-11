const db = require('../config/db.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { getJWTSecret } = require('../config/jwt.js');

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

// ---------- Login attempt limits ----------
// Failed logins are recorded per email and per IP in the database, so the limit
// holds across serverless instances. Too many failures -> a 15 minute pause.
const MAX_PER_EMAIL = 8;
const MAX_PER_IP = 30;
let attemptsReady = null;
function ensureAttemptsTable() {
  attemptsReady ??= db.query(`SELECT to_regclass('public.login_attempts') AS t`)
    .then((r) => r.rows[0].t ? null : db.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        ip TEXT,
        at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS login_attempts_email ON login_attempts (email, at);
      CREATE INDEX IF NOT EXISTS login_attempts_ip ON login_attempts (ip, at);
    `))
    .catch((err) => { attemptsReady = null; throw err; });
  return attemptsReady;
}

async function checkLoginAllowed(email, ip) {
  await ensureAttemptsTable();
  const r = await db.query(
    `SELECT count(*) FILTER (WHERE email = $1)::int AS by_email,
            count(*) FILTER (WHERE ip = $2)::int AS by_ip
       FROM login_attempts WHERE at > now() - interval '15 minutes' AND (email = $1 OR ip = $2)`,
    [email, ip]
  );
  const { by_email, by_ip } = r.rows[0];
  if (by_email >= MAX_PER_EMAIL || by_ip >= MAX_PER_IP) {
    throw fail('Too many attempts. Wait 15 minutes and try again.', 429);
  }
}

async function recordFailedLogin(email, ip) {
  await db.query('INSERT INTO login_attempts (email, ip) VALUES ($1, $2)', [email, ip]);
  // Keep the table small: old attempts are useless.
  if (Math.random() < 0.05) await db.query(`DELETE FROM login_attempts WHERE at < now() - interval '1 day'`);
}

const register = async ({ email, password, nativeLang, learningLang }) => {
  if (!email || !password || !nativeLang || !learningLang) {
    throw fail('Fill in every field.');
  }
  email = String(email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Enter a valid email address.');
  if (String(password).length < 8) throw fail('Use a password with at least 8 characters.');

  const taken = await db.query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
  if (taken.rows.length) throw fail('An account with this email already exists. Try logging in.');

  const hashed = await bcrypt.hash(password, 10);

  let result;
  try {
    result = await db.query(
      `INSERT INTO users (email, password, "nativeLang", "learningLang")
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [email, hashed, nativeLang, learningLang]
    );
  } catch (err) {
    // 23505 = unique_violation: don't leak the raw Postgres message to the browser.
    if (err.code === '23505') throw fail('An account with this email already exists. Try logging in.');
    throw err;
  }

  const token = jwt.sign(
    { id: result.rows[0].id },
    getJWTSecret(),
    { expiresIn: "7d" }
  );

  return { token };
};

const login = async (email, password, ip = 'unknown') => {
  const key = String(email || '').trim().toLowerCase();
  if (!key || !password) throw fail('Enter your email and password.');
  await checkLoginAllowed(key, ip);

  const result = await db.query('SELECT * FROM users WHERE lower(email) = $1', [key]);
  const user = result.rows[0];
  // One message for both cases so the login form can't be used to discover accounts.
  const valid = user ? await bcrypt.compare(password, user.password) : false;
  if (!valid) {
    await recordFailedLogin(key, ip);
    throw fail('Invalid email or password');
  }
  await db.query('DELETE FROM login_attempts WHERE email = $1', [key]);

  const token = jwt.sign({ id: user.id }, getJWTSecret(), { expiresIn: '7d' });
  return { token };
};

// Change password (requires the current one).
const changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) throw fail('Fill in both passwords.');
  if (String(newPassword).length < 8) throw fail('Use a new password with at least 8 characters.');
  const r = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
  if (!r.rows[0] || !(await bcrypt.compare(currentPassword, r.rows[0].password))) throw fail('Your current password is incorrect.');
  await db.query('UPDATE users SET password = $1 WHERE id = $2', [await bcrypt.hash(newPassword, 10), userId]);
};

// Delete the account and everything private to it. Things the user published stay
// in the public Library but are anonymised (author name removed).
const deleteAccount = async (userId, password) => {
  const r = await db.query('SELECT password FROM users WHERE id = $1', [userId]);
  if (!r.rows[0] || !(await bcrypt.compare(password || '', r.rows[0].password))) throw fail('That password is incorrect.');
  await db.query(`UPDATE public_decks SET author = 'Former member' WHERE user_id = $1`, [userId]).catch(() => {});
  await db.query(`UPDATE public_stories SET author = 'Former member' WHERE user_id = $1`, [userId]).catch(() => {});
  // user_decks and user_stories are removed by ON DELETE CASCADE.
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
};

module.exports = { register, login, changePassword, deleteAccount };