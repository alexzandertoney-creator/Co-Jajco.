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

// Create tables
pool.query(`
DROP TABLE IF EXISTS users CASCADE
`, (err, res) => {
  if (err) {
    console.error('Error dropping table:', err);
  } else {
    console.log('Old users table dropped');
    
    // Now create the table with correct column names
    pool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      "nativeLang" TEXT,
      "learningLang" TEXT
    )
    `, (err, res) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('Users table ready with correct column names');
      }
    });
  }
});

module.exports = pool;
