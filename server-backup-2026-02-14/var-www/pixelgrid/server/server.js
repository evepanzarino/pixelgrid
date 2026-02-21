const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();
const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define build path
const buildPath = path.resolve(__dirname, '../client/build');
console.log('Serving static files from:', buildPath);

// Routes - API routes must come before static files
app.use('/api/users', require('./routes/users'));
app.use('/api/items', require('./routes/items'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Serve static files from React build at /pixelgrid
app.use('/pixelgrid', express.static(buildPath));

// Serve React app for pixelgrid routes (SPA fallback)
app.get('/pixelgrid/*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Root redirect to /pixelgrid
app.get('/', (req, res) => {
  res.redirect('/pixelgrid');
});

const PORT = process.env.SERVER_PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
