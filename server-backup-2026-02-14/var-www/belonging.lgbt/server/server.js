const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'belonging_jwt_secret_key_2026';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'evepanzarino',
  password: process.env.DB_PASSWORD || 'TrueLove25320664!',
  database: process.env.DB_NAME || 'belonging',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize admin user with hashed password
async function initializeAdmin() {
  try {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      ['evepanzarino']
    );
    
    if (users.length > 0 && !users[0].password_hash) {
      const hash = await bcrypt.hash('TrueLove25320664!', 10);
      await pool.execute(
        'UPDATE users SET password_hash = ? WHERE username = ?',
        [hash, 'evepanzarino']
      );
      console.log('Admin user password initialized');
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Apply auth middleware to all routes
app.use(authenticateToken);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Belonging API is running' });
});

// ============================================
// AUTH ROUTES
// ============================================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    if (!username && !email) {
      return res.status(400).json({ error: 'Email or username is required' });
    }
    
    const finalUsername = username || email;
    const finalEmail = email || null;
    
    // Check if user exists
    let existing;
    if (finalEmail) {
      [existing] = await pool.execute(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [finalUsername, finalEmail]
      );
    } else {
      [existing] = await pool.execute(
        'SELECT id FROM users WHERE username = ?',
        [finalUsername]
      );
    }
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
      [finalUsername, finalEmail, passwordHash, firstName || null, lastName || null]
    );
    
    // Generate token
    const token = jwt.sign(
      { id: result.insertId, username: finalUsername, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      token,
      user: { id: result.insertId, username: finalUsername, email: finalEmail, firstName, lastName, role: 'user' }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }
    
    // Find user by username OR email
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, first_name, last_name, role, profile_picture, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update profile (first/last name, handle becomes username, email, profile picture)
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, handle, email, profilePicture } = req.body;
    
    // Check if handle/username is already taken (if provided)
    if (handle) {
      const [existing] = await pool.execute(
        'SELECT id FROM users WHERE (handle = ? OR username = ?) AND id != ?',
        [handle, handle, req.user.id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'This handle is already taken' });
      }
    }
    
    // Check if email is already taken (if provided)
    if (email) {
      const [existingEmail] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.user.id]
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({ error: 'This email is already taken' });
      }
    }
    
    // Build dynamic update query
    let updateFields = [];
    let updateValues = [];
    
    if (firstName !== undefined) {
      updateFields.push('first_name = ?');
      updateValues.push(firstName || null);
    }
    if (lastName !== undefined) {
      updateFields.push('last_name = ?');
      updateValues.push(lastName || null);
    }
    if (handle) {
      updateFields.push('handle = ?', 'username = ?');
      updateValues.push(handle, handle);
    }
    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (profilePicture !== undefined) {
      updateFields.push('profile_picture = ?');
      updateValues.push(profilePicture || null);
    }
    
    if (updateFields.length > 0) {
      updateValues.push(req.user.id);
      await pool.execute(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
app.put('/api/auth/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    // Get current user's password hash
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password and update
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.user.id]
    );
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================
// PUBLIC USER ROUTES
// ============================================

// Get all users (public)
app.get('/api/users', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, first_name, last_name, profile_picture, created_at FROM users WHERE role != "admin" ORDER BY created_at DESC LIMIT 100'
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Search users
app.get('/api/users/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json([]);
    }
    
    const searchTerm = `%${q}%`;
    const [users] = await pool.execute(
      `SELECT id, username, email, first_name, last_name, created_at 
       FROM users 
       WHERE (username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)
       AND role != 'admin'
       ORDER BY created_at DESC 
       LIMIT 50`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get single user profile by username or id
app.get('/api/users/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by username first, then by id
    let users;
    if (isNaN(identifier)) {
      // It's a username
      [users] = await pool.execute(
        'SELECT id, username, email, first_name, last_name, profile_picture, created_at FROM users WHERE username = ?',
        [identifier]
      );
    } else {
      // It's an id
      [users] = await pool.execute(
        'SELECT id, username, email, first_name, last_name, profile_picture, created_at FROM users WHERE id = ?',
        [identifier]
      );
    }
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ============================================
// POST ROUTES
// ============================================

// Create a post
app.post('/api/posts', requireAuth, async (req, res) => {
  try {
    const { content, customCss } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content is required' });
    }
    
    const [result] = await pool.execute(
      'INSERT INTO posts (user_id, content, custom_css) VALUES (?, ?, ?)',
      [req.user.id, content, customCss || null]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Post created successfully' 
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get posts by user ID or username
app.get('/api/posts/user/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    let userId;
    if (isNaN(identifier)) {
      // It's a username, get user ID first
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE username = ?',
        [identifier]
      );
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      userId = users[0].id;
    } else {
      userId = identifier;
    }
    
    const [posts] = await pool.execute(
      `SELECT p.*, u.username, u.first_name, u.last_name, u.profile_picture 
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = ? 
       ORDER BY p.created_at DESC`,
      [userId]
    );
    
    res.json(posts);
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get single post
app.get('/api/posts/:id', async (req, res) => {
  try {
    const [posts] = await pool.execute(
      `SELECT p.*, u.username, u.first_name, u.last_name, u.profile_picture 
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = ?`,
      [req.params.id]
    );
    
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(posts[0]);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Update a post
app.put('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const { content, customCss } = req.body;
    
    // Check if post belongs to user
    const [posts] = await pool.execute(
      'SELECT user_id FROM posts WHERE id = ?',
      [req.params.id]
    );
    
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (posts[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }
    
    await pool.execute(
      'UPDATE posts SET content = ?, custom_css = ? WHERE id = ?',
      [content, customCss || null, req.params.id]
    );
    
    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete a post
app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    // Check if post belongs to user
    const [posts] = await pool.execute(
      'SELECT user_id FROM posts WHERE id = ?',
      [req.params.id]
    );
    
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (posts[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }
    
    await pool.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Get all posts (feed)
app.get('/api/posts', async (req, res) => {
  try {
    const [posts] = await pool.query(
      `SELECT p.*, u.username, u.first_name, u.last_name, u.profile_picture 
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       ORDER BY p.created_at DESC 
       LIMIT 50`
    );
    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

// Get all users (admin)
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Delete user (admin)
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Don't allow deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================
// API ROUTES (Add your app-specific routes here)
// ============================================

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Image upload endpoint
app.post('/api/upload', authenticateToken, requireAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Return the URL to the uploaded image
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl, filename: req.file.filename });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Example: Get stats
app.get('/api/stats', async (req, res) => {
  try {
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    
    res.json({
      users: userCount[0].count
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Belonging API server running on port ${PORT}`);
  await initializeAdmin();
});
