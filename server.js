require('dotenv').config();
const express = require('express');
const app = express();

const authRoutes = require('./src/routes/auth.routes');

app.use(express.json());

app.use('/api/auth', authRoutes);
const path = require('path');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));