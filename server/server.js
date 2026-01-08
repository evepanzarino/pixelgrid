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

// Serve static files from React build
app.use('/pixelgrid', express.static(path.join(__dirname, '../client/build')));

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/items', require('./routes/items'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Serve React app for all other routes under /pixelgrid
app.get('/pixelgrid/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.SERVER_PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
