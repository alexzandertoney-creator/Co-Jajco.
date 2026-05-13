const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.register = async (db, { email, password, nativeLang, learningLang }) => {
  return new Promise(async (resolve, reject) => {
    if (!email || !password || !nativeLang || !learningLang) {
      return reject(new Error("Missing fields"));
    }

    const hashed = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (email, password, nativeLang, learningLang)
       VALUES (?, ?, ?, ?)`,
      [email, hashed, nativeLang, learningLang],
      function (err) {
        if (err) return reject(err);

        const token = jwt.sign(
          { id: this.lastID },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        resolve({ token });
      }
    );
  });
};

exports.login = (db, email, password) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE email = ?',
      [email],
      async (err, user) => {
        if (err) return reject(err);
        if (!user) return reject(new Error('User not found'));

        const bcrypt = require('bcrypt');
        const jwt = require('jsonwebtoken');

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return reject(new Error('Invalid credentials'));

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

        resolve({ token });
      }
    );
  });
};