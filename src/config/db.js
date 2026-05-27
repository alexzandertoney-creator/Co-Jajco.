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

    console.log('Users table ready');
  } catch (err) {
    console.error('Error creating table:', err);
  }
};

// optional
if (!process.env.VERCEL) {
  initializeSchema();
}

module.exports = pool;
