const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
    process.env.JWT_SECRET,
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

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

  return { token };
};

module.exports = { register, login };