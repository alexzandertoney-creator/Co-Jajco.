const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL DB');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize database schema
const initializeSchema = async () => {
  try {
    // Create table if it doesn't exist (don't drop to avoid data loss)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        "nativeLang" TEXT,
        "learningLang" TEXT
      )
    `);
    console.log('Users table ready');
  } catch (err) {
    console.error('Error creating table:', err);
  }
};

// Initialize schema on startup
initializeSchema();

module.exports = pool;
