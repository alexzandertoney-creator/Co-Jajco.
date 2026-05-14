require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const authRoutes = require('./src/routes/auth.routes');

// Enable CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? undefined : '*',
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
const path = require('path');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

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