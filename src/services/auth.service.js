const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Get JWT secret with fallback for development
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET not set in environment variables. Using default for development only.');
  }
  return secret;
};

const register = async ({ email, password, nativeLang, learningLang }) => {
  if (!email || !password || !nativeLang || !learningLang) {
    throw new Error("Missing fields");
  }

  const hashed = await bcrypt.hash(password, 10);

  const result = await db.query(
    `INSERT INTO users (email, password, "nativeLang", "learningLang")
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [email, hashed, nativeLang, learningLang]
  );

  const token = jwt.sign(
    { id: result.rows[0].id },
    getJWTSecret(),
    { expiresIn: "7d" }
  );

  return { token };
};

const login = async (email, password) => {
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  const user = result.rows[0];
  if (!user) throw new Error('User not found');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Invalid credentials');

  const token = jwt.sign(
    { id: user.id },
    getJWTSecret(),
    { expiresIn: "7d" }
  );

  return { token };
};

module.exports = { register, login };