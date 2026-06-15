require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('../src/routes/auth.routes.js');
const libraryRoutes = require('../src/routes/library.routes.js');

const app = express();

// Enable CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? undefined : '*',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/library', libraryRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

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