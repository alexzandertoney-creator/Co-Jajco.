const jwt = require('jsonwebtoken');

const { getJWTSecret } = require('../config/jwt.js');

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: 'No token' });
  }

  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Invalid auth format' });
  }

  const token = header.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  let secret;
  try {
    secret = getJWTSecret();
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: 'The server is not configured correctly. Please try again later.' });
  }
  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT ERROR:", err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;