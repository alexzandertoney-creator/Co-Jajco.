require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('../src/routes/auth.routes.js');
const libraryRoutes = require('../src/routes/library.routes.js');
const dictionaryRoutes = require('../src/routes/dictionary.routes.js');

const app = express();

// Enable CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? undefined : '*',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/dictionary', dictionaryRoutes);

// Clean page URLs (/stories, /review…) -> the page that renders them. Keep in step with
// vercel.json "routes" and MODE_PATHS in public/js/main.js.
const PUBLIC = path.join(__dirname, '../public');
const PAGES = {
  '/study': 'index.html', '/study/learn': 'index.html', '/study/test': 'index.html', '/study/match': 'index.html',
  '/decks': 'index.html', '/stories': 'index.html', '/grammar': 'index.html', '/library': 'index.html', '/profile': 'index.html',
  '/review': 'smartReview.html', '/library/starter': 'recommended.html', '/login': 'login.html', '/register': 'register.html',
};
for (const [route, file] of Object.entries(PAGES)) app.get([route, `${route}/`], (req, res) => res.sendFile(path.join(PUBLIC, file)));

// Serve static files
app.use(express.static(PUBLIC));

// Health check endpoint for Vercel
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

// Only listen if not on Vercel (for local development)
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export for Vercel serverless functions
module.exports = app;