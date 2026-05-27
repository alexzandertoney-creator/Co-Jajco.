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
});


// Initialize schema on startup
const initializeSchema = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        "nativeLang" TEXT,
        "learningLang" TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public_decks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        "learning_lang" TEXT,
        "native_lang" TEXT,
        level TEXT,
        cards JSONB NOT NULL,
        author TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public_stories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title TEXT,
        story TEXT NOT NULL,
        tokens JSONB NOT NULL,
        "learning_lang" TEXT,
        "native_lang" TEXT,
        level TEXT,
        author TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log('Users and public library tables ready');
  } catch (err) {
    console.error('Error creating table:', err);
  }
};

// Initialize schema on startup in all environments
initializeSchema();

module.exports = pool;
