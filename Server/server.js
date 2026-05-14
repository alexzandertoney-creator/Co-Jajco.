import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from '../src/routes/auth.routes.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Enable CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? undefined : '*',
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);

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
export default app;