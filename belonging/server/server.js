require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');

// io is declared here so routes can reference it after Socket.io is initialized at startup
let io;

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'belonging_jwt_secret_key_2026';

// Ensure uploads directory exists - use shared volume
const uploadsDir = '/app/uploads';
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

// Message attachment upload — all file types, enforces per-user limit in the route handler
const messageUpload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10GB hard cap
  fileFilter: (req, file, cb) => {
    cb(null, true); // All file types allowed
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Auth middleware - apply globally so all routes can use req.user
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      req.user = null;
      return next();
    }
    // Fresh DB lookup to get real-time ban/mute status
    try {
      const [rows] = await pool.query(
        'SELECT is_banned, is_muted, upload_limit_mb FROM users WHERE id = ?',
        [decoded.id]
      );
      req.user = rows.length > 0
        ? { ...decoded, is_banned: !!rows[0].is_banned, is_muted: !!rows[0].is_muted, upload_limit_mb: rows[0].upload_limit_mb }
        : decoded;
    } catch {
      req.user = decoded;
    }
    next();
  });
};

app.use(authenticateToken);

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

// Auth middleware - requireAuth and requireAdmin
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

const requireNotBanned = (req, res, next) => {
  if (req.user?.is_banned) return res.status(403).json({ error: 'Your account is restricted.', code: 'BANNED' });
  next();
};

const requireNotMuted = (req, res, next) => {
  if (req.user?.is_muted) return res.status(403).json({ error: 'Your account is muted.', code: 'MUTED' });
  next();
};

// Handles that can grant/revoke member status (in addition to admins)
const PERMITTED_HANDLES = ['eve', 'evepanzarino', 'belonging'];

const canGrantMembership = (user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return PERMITTED_HANDLES.includes(user.username) || PERMITTED_HANDLES.includes(user.handle);
};

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
      'SELECT id, username, email, first_name, last_name, role, profile_picture, discord_id, discord_username, discord_avatar, is_member, is_banned, is_muted, upload_limit_mb, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    // Add Discord avatar URL if available
    if (user.discord_id && user.discord_avatar) {
      user.discord_avatar_url = `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png`;
    }

    res.json(user);
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
// DISCORD INTEGRATION ROUTES
// ============================================

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://belonging.lgbt/api/auth/discord/callback';
const DISCORD_BOT_URL = process.env.DISCORD_BOT_URL || 'http://discord-bot:5005';
const BOT_TOKEN_SECRET = process.env.BOT_TOKEN_SECRET || 'belonging_bot_internal_secret';

// Helper function to notify Discord bot of new posts/comments
const notifyDiscordBot = async (endpoint, data) => {
  try {
    const response = await fetch(`${DISCORD_BOT_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-token': BOT_TOKEN_SECRET
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      console.error(`Discord bot notification failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to notify Discord bot:', error);
  }
};

// Helper function to notify Discord bot of deletions
const notifyDiscordBotDelete = async (endpoint) => {
  try {
    const response = await fetch(`${DISCORD_BOT_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'x-bot-token': BOT_TOKEN_SECRET
      }
    });

    if (!response.ok) {
      console.error(`Discord bot deletion notification failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to notify Discord bot of deletion:', error);
  }
};

// Discord OAuth - Redirect to Discord authorization
app.get('/api/auth/discord', requireAuth, async (req, res) => {
  try {
    const state = jwt.sign({ userId: req.user.id }, JWT_SECRET, { expiresIn: '10m' });
    const scope = 'identify';

    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/api/auth/discord/callback`;

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;

    console.log('Initiating Discord Auth with Dynamic URL:', discordAuthUrl);
    console.log('Using Redirect URI:', redirectUri);
    res.json({ url: discordAuthUrl });
  } catch (error) {
    console.error('Discord auth error:', error);
    res.status(500).json({ error: 'Failed to initiate Discord auth' });
  }
});

// Discord OAuth - Callback handler
app.get('/api/auth/discord/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect('/settings?error=discord_auth_failed');
    }

    // Verify state token
    let decoded;
    try {
      decoded = jwt.verify(state, JWT_SECRET);
    } catch (err) {
      return res.redirect('/settings?error=invalid_state');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      console.error('Discord token exchange failed:', await tokenResponse.text());
      return res.redirect('/settings?error=discord_token_failed');
    }

    const tokenData = await tokenResponse.json();

    // Get Discord user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('Discord user fetch failed:', await userResponse.text());
      return res.redirect('/settings?error=discord_user_failed');
    }

    const discordUser = await userResponse.json();

    // Check if Discord ID is already linked to another account
    const [existingLink] = await pool.execute(
      'SELECT id, username FROM users WHERE discord_id = ? AND id != ?',
      [discordUser.id, decoded.userId]
    );

    if (existingLink.length > 0) {
      return res.redirect('/settings?error=discord_already_linked');
    }

    // Link Discord account to user
    await pool.execute(
      'UPDATE users SET discord_id = ?, discord_username = ?, discord_avatar = ? WHERE id = ?',
      [discordUser.id, discordUser.username, discordUser.avatar, decoded.userId]
    );

    // Remove from discord_users table if they were a discord-only user
    await pool.execute(
      'DELETE FROM discord_users WHERE discord_id = ?',
      [discordUser.id]
    );

    console.log(`Linked Discord account ${discordUser.username} to user ${decoded.userId}`);

    res.redirect('/settings?success=discord_linked');
  } catch (error) {
    console.error('Discord callback error:', error);
    res.redirect('/settings?error=discord_callback_failed');
  }
});

// Unlink Discord account
app.delete('/api/auth/discord', requireAuth, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE users SET discord_id = NULL, discord_username = NULL, discord_avatar = NULL WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: 'Discord account unlinked' });
  } catch (error) {
    console.error('Discord unlink error:', error);
    res.status(500).json({ error: 'Failed to unlink Discord account' });
  }
});

// Get Discord connection status
app.get('/api/auth/discord/status', requireAuth, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT discord_id, discord_username, discord_avatar FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    res.json({
      connected: !!user.discord_id,
      discord_username: user.discord_username,
      discord_avatar: user.discord_avatar ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png` : null
    });
  } catch (error) {
    console.error('Discord status error:', error);
    res.status(500).json({ error: 'Failed to get Discord status' });
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
app.post('/api/posts', requireAuth, requireNotBanned, requireNotMuted, async (req, res) => {
  try {
    const { tagline, content, customCss, tribeIds } = req.body;

    if (!tagline || !tagline.trim()) {
      return res.status(400).json({ error: 'Post tagline/title is required' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Post content is required' });
    }

    const [result] = await pool.execute(
      'INSERT INTO posts (user_id, tagline, content, custom_css) VALUES (?, ?, ?, ?)',
      [req.user.id, tagline, content, customCss || null]
    );

    const postId = result.insertId;

    // Handle tribe tagging
    if (tribeIds && Array.isArray(tribeIds)) {
      for (const tribeId of tribeIds) {
        await pool.execute(
          'INSERT IGNORE INTO post_tribes (post_id, tribe_id) VALUES (?, ?)',
          [postId, tribeId]
        );
      }
    }

    // Award XP for posting
    const xpResult = await addSkillXp(req.user.id, 'posting', SKILLS.posting.xpPerAction, 'Created a post');

    // Notify Discord bot to sync this post
    notifyDiscordBot('/api/sync/post', { postId });

    res.status(201).json({
      id: postId,
      message: 'Post created successfully',
      xpGained: xpResult
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
    const currentUserId = req.user ? req.user.id : null;

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
      `SELECT p.*, u.username, u.first_name, u.last_name, u.profile_picture,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
        (SELECT COUNT(*) FROM post_dislikes WHERE post_id = p.id) as dislike_count,
        (SELECT COUNT(*) FROM post_favorites WHERE post_id = p.id) as favorite_count,
        (SELECT COUNT(*) FROM post_reposts WHERE post_id = p.id) as repost_count
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = ? 
       ORDER BY p.created_at DESC`,
      [userId]
    );

    // Enrich with user interaction status
    if (currentUserId) {
      for (let post of posts) {
        const [liked] = await pool.execute('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?', [currentUserId, post.id]);
        const [disliked] = await pool.execute('SELECT 1 FROM post_dislikes WHERE user_id = ? AND post_id = ?', [currentUserId, post.id]);
        const [favorited] = await pool.execute('SELECT 1 FROM post_favorites WHERE user_id = ? AND post_id = ?', [currentUserId, post.id]);
        const [reposted] = await pool.execute('SELECT 1 FROM post_reposts WHERE user_id = ? AND post_id = ?', [currentUserId, post.id]);
        post.user_liked = liked.length > 0;
        post.user_disliked = disliked.length > 0;
        post.user_favorited = favorited.length > 0;
        post.user_reposted = reposted.length > 0;
      }
    }

    res.json(posts);
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get single post
app.get('/api/posts/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;
    const [posts] = await pool.execute(
      `SELECT p.*, u.username, u.email, u.first_name, u.last_name, u.profile_picture,
        dps.discord_thread_id,
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
       (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
       (SELECT COUNT(*) FROM post_dislikes WHERE post_id = p.id) as dislike_count,
       (SELECT COUNT(*) FROM post_favorites WHERE post_id = p.id) as favorite_count,
       (SELECT COUNT(*) FROM post_reposts WHERE post_id = p.id) as repost_count
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       LEFT JOIN discord_post_sync dps ON p.id = dps.post_id
       WHERE p.id = ?`,
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = posts[0];
    if (currentUserId) {
      const [liked] = await pool.execute('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?', [currentUserId, postId]);
      const [disliked] = await pool.execute('SELECT 1 FROM post_dislikes WHERE user_id = ? AND post_id = ?', [currentUserId, postId]);
      const [favorited] = await pool.execute('SELECT 1 FROM post_favorites WHERE user_id = ? AND post_id = ?', [currentUserId, postId]);
      const [reposted] = await pool.execute('SELECT 1 FROM post_reposts WHERE user_id = ? AND post_id = ?', [currentUserId, postId]);
      post.user_liked = liked.length > 0;
      post.user_disliked = disliked.length > 0;
      post.user_favorited = favorited.length > 0;
      post.user_reposted = reposted.length > 0;
    }

    res.json(post);
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
    const postId = req.params.id;

    // Check if post belongs to user
    const [posts] = await pool.execute(
      'SELECT user_id FROM posts WHERE id = ?',
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (posts[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // Notify Discord bot to delete the synced message
    notifyDiscordBotDelete(`/api/sync/post/${postId}`);

    await pool.execute('DELETE FROM posts WHERE id = ?', [postId]);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Get all posts (feed)
app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { tab } = req.query;
    const userId = req.user ? req.user.id : null;

    let query;
    let params = [];

    if (tab === 'personal' && userId) {
      // Personal feed: posts/reposts from followed users OR tribes user is a member of
      query = `
        SELECT * FROM (
          (SELECT DISTINCT p.*, u.username, u.first_name, u.last_name, u.profile_picture,
            dps.discord_thread_id,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
            (SELECT COUNT(*) FROM post_dislikes WHERE post_id = p.id) as dislike_count,
            (SELECT COUNT(*) FROM post_favorites WHERE post_id = p.id) as favorite_count,
            (SELECT COUNT(*) FROM post_reposts WHERE post_id = p.id) as repost_count,
            NULL as reposter_username,
            p.created_at as feed_date
          FROM posts p
          JOIN users u ON p.user_id = u.id
          LEFT JOIN discord_post_sync dps ON p.id = dps.post_id
          LEFT JOIN follows f ON p.user_id = f.following_id AND f.follower_id = ?
          LEFT JOIN post_tribes pt ON p.id = pt.post_id
          LEFT JOIN tribe_members tm ON pt.tribe_id = tm.tribe_id AND tm.user_id = ?
          WHERE f.follower_id IS NOT NULL OR tm.user_id IS NOT NULL OR p.user_id = ?)
          
          UNION ALL
          
          (SELECT p.*, u.username, u.first_name, u.last_name, u.profile_picture,
            dps.discord_thread_id,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
            (SELECT COUNT(*) FROM post_dislikes WHERE post_id = p.id) as dislike_count,
            (SELECT COUNT(*) FROM post_favorites WHERE post_id = p.id) as favorite_count,
            (SELECT COUNT(*) FROM post_reposts WHERE post_id = p.id) as repost_count,
            ru.username as reposter_username,
            pr.created_at as feed_date
          FROM post_reposts pr
          JOIN posts p ON pr.post_id = p.id
          JOIN users u ON p.user_id = u.id
          LEFT JOIN discord_post_sync dps ON p.id = dps.post_id
          JOIN users ru ON pr.user_id = ru.id
          JOIN follows f ON pr.user_id = f.following_id AND f.follower_id = ?
          WHERE f.follower_id IS NOT NULL OR pr.user_id = ?)
        ) as combined_feed
        ORDER BY feed_date DESC
        LIMIT 50
      `;
      params = [userId, userId, userId, userId, userId];
    } else if (tab === 'updates') {
      // Updates feed: posts from the 'belonging' account only
      query = `
        SELECT p.*, u.username, u.first_name, u.last_name, u.profile_picture,
          dps.discord_thread_id,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
          (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
          (SELECT COUNT(*) FROM post_dislikes WHERE post_id = p.id) as dislike_count,
          (SELECT COUNT(*) FROM post_favorites WHERE post_id = p.id) as favorite_count,
          (SELECT COUNT(*) FROM post_reposts WHERE post_id = p.id) as repost_count,
          NULL as reposter_username,
          p.created_at as feed_date
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN discord_post_sync dps ON p.id = dps.post_id
        WHERE p.user_id = (SELECT id FROM users WHERE username = 'belonging' LIMIT 1)
        ORDER BY p.created_at DESC
        LIMIT 50
      `;
    } else {
      // Global feed: all posts and reposts
      query = `
        SELECT * FROM (
          (SELECT p.*, u.username, u.first_name, u.last_name, u.profile_picture,
            dps.discord_thread_id,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
            (SELECT COUNT(*) FROM post_dislikes WHERE post_id = p.id) as dislike_count,
            (SELECT COUNT(*) FROM post_favorites WHERE post_id = p.id) as favorite_count,
            (SELECT COUNT(*) FROM post_reposts WHERE post_id = p.id) as repost_count,
            NULL as reposter_username,
            p.created_at as feed_date
          FROM posts p 
          JOIN users u ON p.user_id = u.id 
          LEFT JOIN discord_post_sync dps ON p.id = dps.post_id)
          
          UNION ALL
          
          (SELECT p.*, u.username, u.first_name, u.last_name, u.profile_picture,
            dps.discord_thread_id,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
            (SELECT COUNT(*) FROM post_dislikes WHERE post_id = p.id) as dislike_count,
            (SELECT COUNT(*) FROM post_favorites WHERE post_id = p.id) as favorite_count,
            (SELECT COUNT(*) FROM post_reposts WHERE post_id = p.id) as repost_count,
            ru.username as reposter_username,
            pr.created_at as feed_date
          FROM post_reposts pr
          JOIN posts p ON pr.post_id = p.id
          JOIN users u ON p.user_id = u.id
          JOIN users ru ON pr.user_id = ru.id
          LEFT JOIN discord_post_sync dps ON p.id = dps.post_id)
        ) as combined_feed
        ORDER BY feed_date DESC 
        LIMIT 50
      `;
    }

    const [posts] = await pool.query(query, params);

    // Enrich posts with their tribe tags and interaction status
    for (let post of posts) {
      const [tribes] = await pool.execute(`
        SELECT t.id, t.name, t.tag, t.color, t.icon
        FROM tribes t
        JOIN post_tribes pt ON t.id = pt.tribe_id
        WHERE pt.post_id = ?
      `, [post.id]);
      post.tribes = tribes;

      // Add user interaction status
      if (userId) {
        const [liked] = await pool.execute('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, post.id]);
        const [disliked] = await pool.execute('SELECT 1 FROM post_dislikes WHERE user_id = ? AND post_id = ?', [userId, post.id]);
        const [favorited] = await pool.execute('SELECT 1 FROM post_favorites WHERE user_id = ? AND post_id = ?', [userId, post.id]);
        const [reposted] = await pool.execute('SELECT 1 FROM post_reposts WHERE user_id = ? AND post_id = ?', [userId, post.id]);
        post.user_liked = liked.length > 0;
        post.user_disliked = disliked.length > 0;
        post.user_favorited = favorited.length > 0;
        post.user_reposted = reposted.length > 0;
      }
    }

    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// ============================================
// POST INTERACTION ROUTES (Like, Favorite, Repost)
// ============================================

// Toggle like
app.post('/api/posts/:id/like', requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const [existing] = await pool.execute(
      'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    if (existing.length > 0) {
      await pool.execute('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      const [count] = await pool.execute('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?', [postId]);
      return res.json({ liked: false, like_count: count[0].count });
    } else {
      await pool.execute('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);

      // Award XP for liking (Actor)
      await addSkillXp(userId, 'liking', SKILLS.liking.xpPerAction, `Liked post #${postId}`);

      // Award XP to author if not self-like (Author - Good XP)
      const [posts] = await pool.execute('SELECT user_id FROM posts WHERE id = ?', [postId]);
      if (posts.length > 0 && posts[0].user_id !== userId) {
        await addSkillXp(posts[0].user_id, 'being_liked', SKILLS.being_liked.xpPerAction, `Post #${postId} was liked`);
        await createNotification(posts[0].user_id, userId, 'like', postId);
      }

      // If user disliked the post, remove the dislike
      const [disliked] = await pool.execute('SELECT id FROM post_dislikes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      if (disliked.length > 0) {
        await pool.execute('DELETE FROM post_dislikes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      }

      const [count] = await pool.execute('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?', [postId]);
      const [dislikeCount] = await pool.execute('SELECT COUNT(*) as count FROM post_dislikes WHERE post_id = ?', [postId]);

      return res.json({
        liked: true,
        like_count: count[0].count,
        disliked: false,
        dislike_count: dislikeCount[0].count
      });
    }
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Toggle dislike
app.post('/api/posts/:id/dislike', requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    // Check if user already disliked
    const [existing] = await pool.execute(
      'SELECT id FROM post_dislikes WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    if (existing.length > 0) {
      // Remove dislike
      await pool.execute('DELETE FROM post_dislikes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      const [count] = await pool.execute('SELECT COUNT(*) as count FROM post_dislikes WHERE post_id = ?', [postId]);
      return res.json({ disliked: false, dislike_count: count[0].count });
    } else {
      // Add dislike
      await pool.execute('INSERT INTO post_dislikes (user_id, post_id) VALUES (?, ?)', [userId, postId]);

      // Award XP for disliking (Actor)
      // Note: "disliking" skill key maps to "Dislike" name in SKILLS
      await addSkillXp(userId, 'disliking', SKILLS.disliking.xpPerAction, `Disliked post #${postId}`);

      // Award XP to author if not self-dislike (Author - Evil XP)
      // Note: "being_disliked" skill key maps to "Evil" name in SKILLS
      const [posts] = await pool.execute('SELECT user_id FROM posts WHERE id = ?', [postId]);
      if (posts.length > 0 && posts[0].user_id !== userId) {
        await addSkillXp(posts[0].user_id, 'being_disliked', SKILLS.being_disliked.xpPerAction, `Post #${postId} was disliked`);
      }

      // If user liked the post, remove the like
      const [liked] = await pool.execute('SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      if (liked.length > 0) {
        await pool.execute('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      }

      const [count] = await pool.execute('SELECT COUNT(*) as count FROM post_dislikes WHERE post_id = ?', [postId]);

      // Get updated like count too since we might have removed a like
      const [likeCount] = await pool.execute('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?', [postId]);

      return res.json({
        disliked: true,
        dislike_count: count[0].count,
        liked: false,
        like_count: likeCount[0].count
      });
    }
  } catch (error) {
    console.error('Dislike error:', error);
    res.status(500).json({ error: 'Failed to toggle dislike' });
  }
});

// Toggle favorite
app.post('/api/posts/:id/favorite', requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const [existing] = await pool.execute(
      'SELECT id FROM post_favorites WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    if (existing.length > 0) {
      await pool.execute('DELETE FROM post_favorites WHERE user_id = ? AND post_id = ?', [userId, postId]);
      const [count] = await pool.execute('SELECT COUNT(*) as count FROM post_favorites WHERE post_id = ?', [postId]);
      return res.json({ favorited: false, favorite_count: count[0].count });
    } else {
      await pool.execute('INSERT INTO post_favorites (user_id, post_id) VALUES (?, ?)', [userId, postId]);

      // Award XP to author if not self-favorite
      const [posts] = await pool.execute('SELECT user_id FROM posts WHERE id = ?', [postId]);
      if (posts.length > 0 && posts[0].user_id !== userId) {
        await addSkillXp(posts[0].user_id, 'being_favorited', SKILLS.being_favorited.xpPerAction, `Post #${postId} was favorited`);
        await createNotification(posts[0].user_id, userId, 'favorite', postId);
      }

      const [count] = await pool.execute('SELECT COUNT(*) as count FROM post_favorites WHERE post_id = ?', [postId]);
      return res.json({ favorited: true, favorite_count: count[0].count });
    }
  } catch (error) {
    console.error('Favorite error:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

// Toggle repost
app.post('/api/posts/:id/repost', requireAuth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const [existing] = await pool.execute(
      'SELECT id FROM post_reposts WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    if (existing.length > 0) {
      await pool.execute('DELETE FROM post_reposts WHERE user_id = ? AND post_id = ?', [userId, postId]);
      const [count] = await pool.execute('SELECT COUNT(*) as count FROM post_reposts WHERE post_id = ?', [postId]);
      return res.json({ reposted: false, repost_count: count[0].count });
    } else {
      await pool.execute('INSERT INTO post_reposts (user_id, post_id) VALUES (?, ?)', [userId, postId]);

      // Award XP to author if not self-repost
      const [posts] = await pool.execute('SELECT user_id FROM posts WHERE id = ?', [postId]);
      if (posts.length > 0 && posts[0].user_id !== userId) {
        await addSkillXp(posts[0].user_id, 'being_reposted', SKILLS.being_reposted.xpPerAction, `Post #${postId} was reposted`);
        await createNotification(posts[0].user_id, userId, 'repost', postId);
      }

      const [count] = await pool.execute('SELECT COUNT(*) as count FROM post_reposts WHERE post_id = ?', [postId]);
      return res.json({ reposted: true, repost_count: count[0].count });
    }
  } catch (error) {
    console.error('Repost error:', error);
    res.status(500).json({ error: 'Failed to toggle repost' });
  }
});

// ============================================
// NOTIFICATION ROUTES
// ============================================

// Get notifications for current user
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const [notifications] = await pool.execute(
      `SELECT n.*, u.username as actor_username, u.profile_picture as actor_profile_picture 
       FROM notifications n 
       JOIN users u ON n.actor_id = u.id 
       WHERE n.user_id = ? 
       ORDER BY n.created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    res.json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread notification count
app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        COUNT(*) as totalCount,
        SUM(CASE WHEN type = 'level_up' THEN 1 ELSE 0 END) as levelUpCount
       FROM notifications 
       WHERE user_id = ? AND is_read = FALSE`,
      [req.user.id]
    );
    const count = parseInt(rows[0].totalCount) || 0;
    const levelUpCount = parseInt(rows[0].levelUpCount) || 0;
    console.log(`Unread counts for user ${req.user.id}: total=${count}, levelUp=${levelUpCount}`);
    res.json({ count, levelUpCount });
  } catch (error) {
    console.error('Fetch unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark all notifications as read
app.post('/api/notifications/read', requireAuth, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Mark a specific notification as read
app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Mark specific read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ============================================
// COMMENT ROUTES
// ============================================

// Create a comment
app.post('/api/posts/:postId/comments', requireAuth, requireNotBanned, requireNotMuted, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if post exists
    const [posts] = await pool.execute('SELECT id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // If replying to a comment, verify it exists and belongs to this post
    if (parentCommentId) {
      const [parentComments] = await pool.execute(
        'SELECT id FROM comments WHERE id = ? AND post_id = ?',
        [parentCommentId, postId]
      );
      if (parentComments.length === 0) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const [result] = await pool.execute(
      'INSERT INTO comments (post_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?)',
      [postId, req.user.id, content, parentCommentId || null]
    );

    // Award XP for commenting
    const xpResult = await addSkillXp(req.user.id, 'commenting', SKILLS.commenting.xpPerAction, 'Posted a comment');

    // Create notification for post author
    const [postData] = await pool.execute('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (postData.length > 0 && postData[0].user_id !== req.user.id) {
      await createNotification(postData[0].user_id, req.user.id, 'comment', postId, result.insertId);
    }

    // Get the created comment with user info
    const [comments] = await pool.execute(
      `SELECT c.*, u.username, u.profile_picture 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [result.insertId]
    );

    // Notify Discord bot to sync this comment
    notifyDiscordBot('/api/sync/comment', { commentId: result.insertId, postId: parseInt(postId) });

    res.status(201).json({
      comment: comments[0],
      xpGained: xpResult
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Get comments for a post
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;

    const [comments] = await pool.execute(
      `SELECT c.*, u.username, u.profile_picture 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      [postId]
    );

    // Build nested structure
    const commentMap = {};
    const rootComments = [];

    comments.forEach(comment => {
      commentMap[comment.id] = { ...comment, replies: [] };
    });

    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        if (commentMap[comment.parent_comment_id]) {
          commentMap[comment.parent_comment_id].replies.push(commentMap[comment.id]);
        }
      } else {
        rootComments.push(commentMap[comment.id]);
      }
    });

    res.json(rootComments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Delete a comment
app.delete('/api/comments/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if comment belongs to user
    const [comments] = await pool.execute(
      'SELECT user_id FROM comments WHERE id = ?',
      [id]
    );

    if (comments.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comments[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await pool.execute('DELETE FROM comments WHERE id = ?', [id]);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ============================================
// MESSAGING ROUTES
// ============================================

// Get all conversations for current user
app.get('/api/messages/conversations', requireAuth, async (req, res) => {
  try {
    const [conversations] = await pool.execute(`
      SELECT 
        c.id,
        c.updated_at,
        cp.last_read_at,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01') AND m.sender_id != ?) as unread_count
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = ?
      ORDER BY c.updated_at DESC
    `, [req.user.id, req.user.id]);

    // Get other participants for each conversation
    for (let conv of conversations) {
      const [participants] = await pool.execute(`
        SELECT u.id, u.username, u.profile_picture
        FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.conversation_id = ? AND cp.user_id != ?
      `, [conv.id, req.user.id]);
      conv.participants = participants;
    }

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get or create a conversation with a user
app.post('/api/messages/conversations', requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId || userId === req.user.id) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if conversation already exists between these two users
    const [existing] = await pool.execute(`
      SELECT c.id FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
      WHERE (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
    `, [req.user.id, userId]);

    if (existing.length > 0) {
      return res.json({ conversationId: existing[0].id, existing: true });
    }

    // Create new conversation
    const [result] = await pool.execute('INSERT INTO conversations () VALUES ()');
    const conversationId = result.insertId;

    // Add participants
    await pool.execute(
      'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)',
      [conversationId, req.user.id, conversationId, userId]
    );

    res.status(201).json({ conversationId, existing: false });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages in a conversation
app.get('/api/messages/conversations/:conversationId', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verify user is participant
    const [participant] = await pool.execute(
      'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, req.user.id]
    );

    if (participant.length === 0) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    // Get messages
    const [messages] = await pool.execute(`
      SELECT m.*, u.username, u.profile_picture
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
    `, [conversationId]);

    // Attach file attachments to each message
    for (const msg of messages) {
      const [attachments] = await pool.execute(
        'SELECT id, file_url, file_name, file_size, file_type, thumbnail_url FROM message_attachments WHERE message_id = ?',
        [msg.id]
      );
      msg.attachments = attachments;
    }

    // Update last_read_at
    await pool.execute(
      'UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
      [conversationId, req.user.id]
    );

    // Get other participants
    const [participants] = await pool.execute(`
      SELECT u.id, u.username, u.profile_picture
      FROM conversation_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ? AND cp.user_id != ?
    `, [conversationId, req.user.id]);

    res.json({ messages, participants });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
app.post('/api/messages/conversations/:conversationId', requireAuth, requireNotBanned, requireNotMuted, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, attachment_ids } = req.body;

    if ((!content || !content.trim()) && (!attachment_ids || !attachment_ids.length)) {
      return res.status(400).json({ error: 'Message must have content or attachments' });
    }

    // Verify user is participant
    const [participant] = await pool.execute(
      'SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?',
      [conversationId, req.user.id]
    );

    if (participant.length === 0) {
      return res.status(403).json({ error: 'Not authorized to send messages in this conversation' });
    }

    // Insert message
    const [result] = await pool.execute(
      'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
      [conversationId, req.user.id, content || '']
    );

    const messageId = result.insertId;

    // Link any pre-uploaded attachments to this message
    if (attachment_ids && attachment_ids.length > 0) {
      for (const attachId of attachment_ids) {
        await pool.execute(
          'UPDATE message_attachments SET message_id = ? WHERE id = ? AND message_id IS NULL',
          [messageId, attachId]
        );
      }
    }

    // Update conversation timestamp
    await pool.execute('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [conversationId]);

    // Award XP for messaging
    const xpResult = await addSkillXp(req.user.id, 'messaging', SKILLS.messaging.xpPerAction, 'Sent a message');

    // Get the created message with attachments
    const [messages] = await pool.execute(`
      SELECT m.*, u.username, u.profile_picture
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `, [messageId]);

    const [attachments] = await pool.execute(
      'SELECT id, file_url, file_name, file_size, file_type, thumbnail_url FROM message_attachments WHERE message_id = ?',
      [messageId]
    );
    messages[0].attachments = attachments;

    // Emit real-time event to conversation room via Socket.io
    if (io) {
      io.to(`conv-${conversationId}`).emit('new-message', messages[0]);
    }

    res.status(201).json({ message: messages[0], xpGained: xpResult });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get unread message count
app.get('/api/messages/unread', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.execute(`
      SELECT COUNT(*) as count FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id AND cp.user_id = ?
      WHERE m.sender_id != ? AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')
    `, [req.user.id, req.user.id]);

    res.json({ unread: result[0].count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// ============================================
// MEMBER MANAGEMENT ROUTES
// ============================================

// PUT /api/users/:id/member - grant or revoke member status
app.put('/api/users/:id/member', requireAuth, async (req, res) => {
  try {
    if (!canGrantMembership(req.user)) {
      return res.status(403).json({ error: 'Not authorized to grant membership' });
    }

    const targetId = parseInt(req.params.id);
    const { is_member } = req.body;

    const [users] = await pool.execute('SELECT id, username FROM users WHERE id = ?', [targetId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.execute(
      'UPDATE users SET is_member = ?, member_granted_at = ?, member_granted_by = ? WHERE id = ?',
      [is_member ? 1 : 0, is_member ? new Date() : null, is_member ? req.user.id : null, targetId]
    );

    res.json({ message: `Membership ${is_member ? 'granted' : 'revoked'} successfully`, is_member });
  } catch (error) {
    console.error('Member update error:', error);
    res.status(500).json({ error: 'Failed to update membership' });
  }
});

// ============================================
// MESSAGE FILE UPLOAD
// ============================================

// POST /api/messages/upload - upload attachment for a message
app.post('/api/messages/upload', requireAuth, requireNotBanned, messageUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Enforce per-user file size limit (custom > member 10GB > non-member 100MB)
    const [memberRows] = await pool.execute('SELECT is_member, upload_limit_mb FROM users WHERE id = ?', [req.user.id]);
    const isMember = memberRows.length > 0 && memberRows[0].is_member;
    const customMb = memberRows.length > 0 ? memberRows[0].upload_limit_mb : null;
    const limitBytes = customMb
      ? customMb * 1024 * 1024
      : isMember ? 10 * 1024 * 1024 * 1024 : 100 * 1024 * 1024;
    const limitLabel = customMb ? `${customMb}MB` : isMember ? '10GB' : '100MB';

    if (req.file.size > limitBytes) {
      fs.unlinkSync(req.file.path);
      return res.status(413).json({
        error: `File too large. Your upload limit is ${limitLabel}.`
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const imageTypes = /image\/(jpeg|jpg|png|gif|webp)/;
    const thumbnailUrl = imageTypes.test(req.file.mimetype) ? fileUrl : null;

    const [result] = await pool.execute(
      'INSERT INTO message_attachments (message_id, file_url, file_name, file_size, file_type, thumbnail_url) VALUES (NULL, ?, ?, ?, ?, ?)',
      [fileUrl, req.file.originalname, req.file.size, req.file.mimetype, thumbnailUrl]
    );

    res.json({
      attachmentId: result.insertId,
      file_url: fileUrl,
      file_name: req.file.originalname,
      file_size: req.file.size,
      file_type: req.file.mimetype,
      thumbnail_url: thumbnailUrl
    });
  } catch (error) {
    console.error('Message upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// ============================================
// EMBED PREVIEW
// ============================================

// GET /api/embed/preview?url=... - fetch Open Graph metadata for link previews
app.get('/api/embed/preview', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP/HTTPS URLs allowed' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BelongingBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(422).json({ error: 'Could not fetch URL' });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const og = (prop) =>
      $(`meta[property="og:${prop}"]`).attr('content') ||
      $(`meta[name="og:${prop}"]`).attr('content') || null;
    const metaName = (name) => $(`meta[name="${name}"]`).attr('content') || null;

    const embed = {
      url,
      title: og('title') || $('title').text() || null,
      description: og('description') || metaName('description') || null,
      image: og('image') || null,
      site_name: og('site_name') || parsedUrl.hostname,
      type: og('type') || 'website'
    };

    res.set('Cache-Control', 'public, max-age=3600');
    res.json(embed);
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(408).json({ error: 'URL fetch timed out' });
    }
    console.error('Embed preview error:', error);
    res.status(500).json({ error: 'Failed to fetch embed preview' });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

// Get all users (admin)
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, handle, email, role, profile_picture, is_member, is_banned, banned_at, is_muted, muted_at, upload_limit_mb, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Ban / unban a user
app.put('/api/admin/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_banned } = req.body;
    if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Cannot ban yourself' });
    await pool.execute(
      'UPDATE users SET is_banned = ?, banned_at = ?, banned_by = ? WHERE id = ?',
      [is_banned, is_banned ? new Date() : null, is_banned ? req.user.id : null, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Ban error:', error);
    res.status(500).json({ error: 'Failed to update ban status' });
  }
});

// Mute / unmute a user
app.put('/api/admin/users/:id/mute', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_muted } = req.body;
    if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Cannot mute yourself' });
    await pool.execute(
      'UPDATE users SET is_muted = ?, muted_at = ?, muted_by = ? WHERE id = ?',
      [is_muted, is_muted ? new Date() : null, is_muted ? req.user.id : null, id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Mute error:', error);
    res.status(500).json({ error: 'Failed to update mute status' });
  }
});

// Set per-user upload limit
app.put('/api/admin/users/:id/upload-limit', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { upload_limit_mb } = req.body; // null = tier default
    await pool.execute('UPDATE users SET upload_limit_mb = ? WHERE id = ?', [upload_limit_mb || null, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Upload limit error:', error);
    res.status(500).json({ error: 'Failed to update upload limit' });
  }
});

// Change user role
app.put('/api/admin/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });
    // Protect the eve handle from demotion
    const [rows] = await pool.execute('SELECT handle, username FROM users WHERE id = ?', [id]);
    if (rows.length > 0 && (rows[0].handle === 'eve' || rows[0].username === 'eve') && role !== 'admin') {
      return res.status(403).json({ error: 'Cannot demote the @eve account' });
    }
    await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Role change error:', error);
    res.status(500).json({ error: 'Failed to update role' });
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
app.post('/api/upload', authenticateToken, requireAuth, requireNotBanned, upload.single('image'), (req, res) => {
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

// ============================================
// SKILLS ROUTES (RuneScape-style leveling)
// ============================================

// XP table based on RuneScape formula: XP = floor(L + 300 * 2^(L/7)) / 4
// This creates the cumulative XP needed for each level
const getXpForLevel = (level) => {
  if (level <= 1) return 0;
  let totalXp = 0;
  for (let l = 1; l < level; l++) {
    totalXp += Math.floor(l + 300 * Math.pow(2, l / 7)) / 4;
  }
  return Math.floor(totalXp);
};

const getLevelFromXp = (xp) => {
  let level = 1;
  while (getXpForLevel(level + 1) <= xp && level < 99) {
    level++;
  }
  return level;
};

const getXpToNextLevel = (xp) => {
  const currentLevel = getLevelFromXp(xp);
  if (currentLevel >= 99) return 0;
  return getXpForLevel(currentLevel + 1) - xp;
};

const getXpProgress = (xp) => {
  const currentLevel = getLevelFromXp(xp);
  if (currentLevel >= 99) return 100;
  const xpForCurrentLevel = getXpForLevel(currentLevel);
  const xpForNextLevel = getXpForLevel(currentLevel + 1);
  const xpInLevel = xp - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  return Math.floor((xpInLevel / xpNeededForLevel) * 100);
};

// Skill definitions with XP rewards
const SKILLS = {
  posting: { name: 'Post', xpPerAction: 50 },
  messaging: { name: 'Message', xpPerAction: 25 },
  commenting: { name: 'Comment', xpPerAction: 35 },
  being_liked: { name: 'Good', xpPerAction: 10 },
  liking: { name: 'Like', xpPerAction: 5 },
  disliking: { name: 'Dislike', xpPerAction: 5 },
  being_disliked: { name: 'Evil', xpPerAction: 10 },
  being_favorited: { name: 'Favorite', xpPerAction: 15 },
  being_reposted: { name: 'Repost', xpPerAction: 25 }
};

// Helper function to add XP to a skill
const addSkillXp = async (userId, skillName, xpAmount, reason = null) => {
  try {
    // Get current XP before adding
    const [oldSkills] = await pool.execute(
      'SELECT xp FROM user_skills WHERE user_id = ? AND skill_name = ?',
      [userId, skillName]
    );
    const oldXp = oldSkills.length > 0 ? oldSkills[0].xp : 0;
    const oldLevel = getLevelFromXp(oldXp);

    // Ensure the skill exists for the user
    await pool.execute(
      `INSERT INTO user_skills (user_id, skill_name, xp) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE xp = xp + ?`,
      [userId, skillName, xpAmount, xpAmount]
    );

    // Log XP gain
    await pool.execute(
      'INSERT INTO xp_history (user_id, skill_name, xp_gained, reason) VALUES (?, ?, ?, ?)',
      [userId, skillName, xpAmount, reason]
    );

    // Get updated skill info
    const [skills] = await pool.execute(
      'SELECT * FROM user_skills WHERE user_id = ? AND skill_name = ?',
      [userId, skillName]
    );

    if (skills.length > 0) {
      const skill = skills[0];
      const newLevel = getLevelFromXp(skill.xp);

      // Check for level up
      if (newLevel > oldLevel && oldLevel > 0) {
        await createLevelUpNotification(userId, skillName, newLevel);
      }

      return {
        skillName,
        xp: skill.xp,
        level: newLevel,
        xpToNextLevel: getXpToNextLevel(skill.xp),
        progress: getXpProgress(skill.xp),
        leveledUp: newLevel > oldLevel
      };
    }
    return null;
  } catch (error) {
    console.error('Error adding skill XP:', error);
    return null;
  }
};

// Helper function to create a notification
const createNotification = async (userId, actorId, type, postId = null, commentId = null) => {
  if (userId === actorId) return; // Don't notify self
  try {
    await pool.execute(
      'INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id) VALUES (?, ?, ?, ?, ?)',
      [userId, actorId, type, postId, commentId]
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

const createLevelUpNotification = async (userId, skillName, newLevel) => {
  try {
    // For level ups, actor_id can be the user themselves or a system ID (let's use user themselves for simplicity in join)
    await pool.execute(
      'INSERT INTO notifications (user_id, actor_id, type, skill_name, new_level) VALUES (?, ?, ?, ?, ?)',
      [userId, userId, 'level_up', skillName, newLevel]
    );
  } catch (error) {
    console.error('Error creating level up notification:', error);
  }
};

// Get all skills for a user
// Get recent XP history for live drops (placed before parameterized route to avoid shadowing)
app.get('/api/skills/recent-xp', requireAuth, async (req, res) => {
  try {
    // Fetch XP gained in the last 15 seconds
    const [history] = await pool.query(
      'SELECT skill_name, xp_gained, created_at FROM xp_history WHERE user_id = ? AND created_at > NOW() - INTERVAL 15 SECOND ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(Array.isArray(history) ? history : []);
  } catch (error) {
    console.error('Error fetching recent XP:', error);
    res.status(500).json({ error: 'Failed to fetch recent XP' });
  }
});

app.get('/api/skills/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || (req.user ? req.user.id : null);

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Get all skills for the user
    const [skills] = await pool.execute(
      'SELECT * FROM user_skills WHERE user_id = ?',
      [userId]
    );

    // Build skills response with all possible skills
    const skillsResponse = {};
    let totalLevel = 0;
    let totalXp = 0;

    for (const [key, skillDef] of Object.entries(SKILLS)) {
      const userSkill = skills.find(s => s.skill_name === key);
      const xp = userSkill ? userSkill.xp : 0;
      const level = getLevelFromXp(xp);

      skillsResponse[key] = {
        name: skillDef.name,
        xp,
        level,
        xpToNextLevel: getXpToNextLevel(xp),
        progress: getXpProgress(xp)
      };

      totalLevel += level;
      totalXp += xp;
    }

    res.json({
      skills: skillsResponse,
      totalLevel,
      totalXp
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Get XP history for a user
app.get('/api/skills/history/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || (req.user ? req.user.id : null);

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const [history] = await pool.execute(
      'SELECT * FROM xp_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    res.json(history);
  } catch (error) {
    console.error('Error fetching XP history:', error);
    res.status(500).json({ error: 'Failed to fetch XP history' });
  }
});

// Get leaderboard
app.get('/api/skills/leaderboard/:skillName?', async (req, res) => {
  try {
    const { skillName } = req.params;

    let query;
    let params = [];

    if (skillName && SKILLS[skillName]) {
      // Leaderboard for specific skill
      query = `
        SELECT us.user_id, us.skill_name, us.xp, u.username, u.profile_picture
        FROM user_skills us
        JOIN users u ON us.user_id = u.id
        WHERE us.skill_name = ?
        ORDER BY us.xp DESC
        LIMIT 100
      `;
      params = [skillName];
    } else {
      // Total level leaderboard
      query = `
        SELECT us.user_id, SUM(us.xp) as total_xp, u.username, u.profile_picture
        FROM user_skills us
        JOIN users u ON us.user_id = u.id
        GROUP BY us.user_id
        ORDER BY total_xp DESC
        LIMIT 100
      `;
    }

    const [leaderboard] = await pool.execute(query, params);

    // Add level info
    const result = leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry.user_id,
      username: entry.username,
      profilePicture: entry.profile_picture,
      xp: entry.xp || entry.total_xp,
      level: getLevelFromXp(entry.xp || entry.total_xp)
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ========== TRIBES ROUTES ==========

// Create a new tribe
app.post('/api/tribes', requireAuth, async (req, res) => {
  try {
    const { name, tag, description, color, icon } = req.body;

    if (!name || !tag) {
      return res.status(400).json({ error: 'Name and tag are required' });
    }

    // Validate tag format (alphanumeric, lowercase, no spaces)
    const cleanTag = tag.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanTag.length < 2 || cleanTag.length > 20) {
      return res.status(400).json({ error: 'Tag must be 2-20 alphanumeric characters' });
    }

    // Check if tag already exists
    const [existing] = await pool.execute('SELECT id FROM tribes WHERE tag = ?', [cleanTag]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This tag is already taken' });
    }

    // Create tribe
    const [result] = await pool.execute(
      'INSERT INTO tribes (name, tag, description, color, icon, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, cleanTag, description || null, color || '#667eea', icon || '🏳️‍🌈', req.user.id]
    );

    // Add owner as member with owner role
    await pool.execute(
      'INSERT INTO tribe_members (tribe_id, user_id, role) VALUES (?, ?, ?)',
      [result.insertId, req.user.id, 'owner']
    );

    res.status(201).json({
      message: 'Tribe created successfully',
      tribe: { id: result.insertId, name, tag: cleanTag }
    });
  } catch (error) {
    console.error('Create tribe error:', error);
    res.status(500).json({ error: 'Failed to create tribe' });
  }
});

// Get all tribes (public listing)
app.get('/api/tribes', async (req, res) => {
  try {
    const [tribes] = await pool.execute(`
      SELECT t.*, u.username as owner_username,
        (SELECT COUNT(*) FROM tribe_members WHERE tribe_id = t.id) as member_count
      FROM tribes t
      JOIN users u ON t.owner_id = u.id
      WHERE t.is_public = TRUE
      ORDER BY member_count DESC, t.created_at DESC
    `);
    res.json(tribes);
  } catch (error) {
    console.error('Get tribes error:', error);
    res.status(500).json({ error: 'Failed to fetch tribes' });
  }
});

// Search tribes (for autocomplete)
app.get('/api/tribes/search/autocomplete', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.json([]);
    }

    const [tribes] = await pool.execute(`
      SELECT id, name, tag, icon, color
      FROM tribes
      WHERE name LIKE ? OR tag LIKE ?
      LIMIT 10
    `, [`%${q}%`, `%${q}%`]);

    res.json(tribes);
  } catch (error) {
    console.error('Tribe search error:', error);
    res.status(500).json({ error: 'Failed to search tribes' });
  }
});

// Get single tribe by tag
app.get('/api/tribes/:tag', async (req, res) => {
  try {
    const [tribes] = await pool.execute(`
      SELECT t.*, u.username as owner_username, u.profile_picture as owner_profile_picture,
        (SELECT COUNT(*) FROM tribe_members WHERE tribe_id = t.id) as member_count
      FROM tribes t
      JOIN users u ON t.owner_id = u.id
      WHERE t.tag = ?
    `, [req.params.tag]);

    if (tribes.length === 0) {
      return res.status(404).json({ error: 'Tribe not found' });
    }

    res.json(tribes[0]);
  } catch (error) {
    console.error('Get tribe error:', error);
    res.status(500).json({ error: 'Failed to fetch tribe' });
  }
});

// Edit a tribe (owner only)
app.put('/api/tribes/:tag', requireAuth, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Get tribe and verify ownership
    const [tribes] = await pool.execute('SELECT id, owner_id FROM tribes WHERE tag = ?', [req.params.tag]);
    if (tribes.length === 0) {
      return res.status(404).json({ error: 'Tribe not found' });
    }

    if (tribes[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the tribe owner can edit this tribe' });
    }

    // Update tribe
    await pool.execute(
      'UPDATE tribes SET name = ?, description = ?, color = ?, icon = ? WHERE id = ?',
      [name, description || null, color || '#667eea', icon || '🏳️‍🌈', tribes[0].id]
    );

    res.json({ message: 'Tribe updated successfully' });
  } catch (error) {
    console.error('Edit tribe error:', error);
    res.status(500).json({ error: 'Failed to update tribe' });
  }
});

// Get tribe members
app.get('/api/tribes/:tag/members', async (req, res) => {
  try {
    const [members] = await pool.execute(`
      SELECT tm.*, u.username, u.first_name, u.last_name, u.profile_picture
      FROM tribe_members tm
      JOIN tribes t ON tm.tribe_id = t.id
      JOIN users u ON tm.user_id = u.id
      WHERE t.tag = ?
      ORDER BY 
        CASE tm.role 
          WHEN 'owner' THEN 1 
          WHEN 'admin' THEN 2 
          WHEN 'moderator' THEN 3 
          ELSE 4 
        END,
        tm.joined_at ASC
    `, [req.params.tag]);

    res.json(members);
  } catch (error) {
    console.error('Get tribe members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Join a tribe
app.post('/api/tribes/:tag/join', requireAuth, async (req, res) => {
  try {
    // Get tribe
    const [tribes] = await pool.execute('SELECT id, is_public FROM tribes WHERE tag = ?', [req.params.tag]);
    if (tribes.length === 0) {
      return res.status(404).json({ error: 'Tribe not found' });
    }

    const tribe = tribes[0];

    // Check if already a member
    const [existing] = await pool.execute(
      'SELECT id FROM tribe_members WHERE tribe_id = ? AND user_id = ?',
      [tribe.id, req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'You are already a member of this tribe' });
    }

    // Join tribe
    await pool.execute(
      'INSERT INTO tribe_members (tribe_id, user_id, role) VALUES (?, ?, ?)',
      [tribe.id, req.user.id, 'member']
    );

    res.json({ message: 'Successfully joined the tribe!' });
  } catch (error) {
    console.error('Join tribe error:', error);
    res.status(500).json({ error: 'Failed to join tribe' });
  }
});

// Leave a tribe
app.post('/api/tribes/:tag/leave', requireAuth, async (req, res) => {
  try {
    const [tribes] = await pool.execute('SELECT id, owner_id FROM tribes WHERE tag = ?', [req.params.tag]);
    if (tribes.length === 0) {
      return res.status(404).json({ error: 'Tribe not found' });
    }

    const tribe = tribes[0];

    // Owner cannot leave
    if (tribe.owner_id === req.user.id) {
      return res.status(400).json({ error: 'Owners cannot leave their tribe. Transfer ownership first or delete the tribe.' });
    }

    await pool.execute(
      'DELETE FROM tribe_members WHERE tribe_id = ? AND user_id = ?',
      [tribe.id, req.user.id]
    );

    res.json({ message: 'Successfully left the tribe' });
  } catch (error) {
    console.error('Leave tribe error:', error);
    res.status(500).json({ error: 'Failed to leave tribe' });
  }
});

// Toggle show tribe on profile
app.put('/api/tribes/:tag/visibility', requireAuth, async (req, res) => {
  try {
    const { showOnProfile } = req.body;
    const [tribes] = await pool.execute('SELECT id FROM tribes WHERE tag = ?', [req.params.tag]);

    if (tribes.length === 0) {
      return res.status(404).json({ error: 'Tribe not found' });
    }

    await pool.execute(
      'UPDATE tribe_members SET show_on_profile = ? WHERE tribe_id = ? AND user_id = ?',
      [showOnProfile, tribes[0].id, req.user.id]
    );

    res.json({ message: 'Visibility updated' });
  } catch (error) {
    console.error('Update visibility error:', error);
    res.status(500).json({ error: 'Failed to update visibility' });
  }
});

// Get tribes for a user (shown on profile)
app.get('/api/users/:identifier/tribes', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Find user
    let userQuery = 'SELECT id FROM users WHERE ';
    if (isNaN(identifier)) {
      userQuery += 'username = ?';
    } else {
      userQuery += 'id = ?';
    }

    const [users] = await pool.execute(userQuery, [identifier]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [tribes] = await pool.execute(`
      SELECT t.id, t.name, t.tag, t.color, t.icon, tm.role
      FROM tribe_members tm
      JOIN tribes t ON tm.tribe_id = t.id
      WHERE tm.user_id = ? AND tm.show_on_profile = TRUE
      ORDER BY 
        CASE tm.role 
          WHEN 'owner' THEN 1 
          WHEN 'admin' THEN 2 
          WHEN 'moderator' THEN 3 
          ELSE 4 
        END,
        tm.joined_at ASC
    `, [users[0].id]);

    res.json(tribes);
  } catch (error) {
    console.error('Get user tribes error:', error);
    res.status(500).json({ error: 'Failed to fetch user tribes' });
  }
});

// Get current user's tribes (all, not just visible)
app.get('/api/my-tribes', requireAuth, async (req, res) => {
  try {
    const [tribes] = await pool.execute(`
      SELECT t.*, tm.role, tm.show_on_profile,
        (SELECT COUNT(*) FROM tribe_members WHERE tribe_id = t.id) as member_count
      FROM tribe_members tm
      JOIN tribes t ON tm.tribe_id = t.id
      WHERE tm.user_id = ?
      ORDER BY tm.joined_at DESC
    `, [req.user.id]);

    res.json(tribes);
  } catch (error) {
    console.error('Get my tribes error:', error);
    res.status(500).json({ error: 'Failed to fetch tribes' });
  }
});

// Get tribe posts/announcements
app.get('/api/tribes/:tag/posts', async (req, res) => {
  try {
    const [tribes] = await pool.execute('SELECT id FROM tribes WHERE tag = ?', [req.params.tag]);
    if (tribes.length === 0) {
      return res.status(404).json({ error: 'Tribe not found' });
    }

    const [posts] = await pool.execute(`
      SELECT tp.*, u.username, u.first_name, u.last_name, u.profile_picture,
        tm.role as poster_role
      FROM tribe_posts tp
      JOIN users u ON tp.user_id = u.id
      JOIN tribe_members tm ON tm.user_id = tp.user_id AND tm.tribe_id = tp.tribe_id
      WHERE tp.tribe_id = ?
      ORDER BY tp.is_announcement DESC, tp.created_at DESC
    `, [tribes[0].id]);

    res.json(posts);
  } catch (error) {
    console.error('Get tribe posts error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create tribe post
app.post('/api/tribes/:tag/posts', requireAuth, requireNotBanned, requireNotMuted, async (req, res) => {
  try {
    const { content, isAnnouncement } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const [tribes] = await pool.execute('SELECT id FROM tribes WHERE tag = ?', [req.params.tag]);
    if (tribes.length === 0) {
      return res.status(404).json({ error: 'Tribe not found' });
    }

    // Check if user is a member
    const [membership] = await pool.execute(
      'SELECT role FROM tribe_members WHERE tribe_id = ? AND user_id = ?',
      [tribes[0].id, req.user.id]
    );

    if (membership.length === 0) {
      return res.status(403).json({ error: 'You must be a member to post' });
    }

    // Only admins/mods/owners can make announcements
    const canAnnounce = ['owner', 'admin', 'moderator'].includes(membership[0].role);

    const [result] = await pool.execute(
      'INSERT INTO tribe_posts (tribe_id, user_id, content, is_announcement) VALUES (?, ?, ?, ?)',
      [tribes[0].id, req.user.id, content, isAnnouncement && canAnnounce ? true : false]
    );

    res.status(201).json({
      message: 'Post created',
      postId: result.insertId
    });
  } catch (error) {
    console.error('Create tribe post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Delete tribe post
app.delete('/api/tribes/:tag/posts/:postId', requireAuth, async (req, res) => {
  try {
    const [tribes] = await pool.execute('SELECT id FROM tribes WHERE tag = ?', [req.params.tag]);
    if (tribes.length === 0) {
      return res.status(404).json({ error: 'Tribe not found' });
    }

    // Check if user can delete (post owner or tribe mod/admin/owner)
    const [posts] = await pool.execute('SELECT user_id FROM tribe_posts WHERE id = ?', [req.params.postId]);
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const [membership] = await pool.execute(
      'SELECT role FROM tribe_members WHERE tribe_id = ? AND user_id = ?',
      [tribes[0].id, req.user.id]
    );

    const canDelete = posts[0].user_id === req.user.id ||
      (membership.length > 0 && ['owner', 'admin', 'moderator'].includes(membership[0].role));

    if (!canDelete) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    await pool.execute('DELETE FROM tribe_posts WHERE id = ?', [req.params.postId]);

    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete tribe post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ========== SOCIAL ROUTES (Follow System) ==========

// Follow a user
app.post('/api/users/:id/follow', requireAuth, async (req, res) => {
  try {
    const followingId = req.params.id;
    const followerId = req.user.id;

    if (parseInt(followingId) === followerId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check if user exists
    const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [followingId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.execute(
      'INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)',
      [followerId, followingId]
    );

    // Trigger notification
    await createNotification(followingId, followerId, 'follow');

    res.json({ message: 'Successfully followed user' });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a user
app.delete('/api/users/:id/follow', requireAuth, async (req, res) => {
  try {
    const followingId = req.params.id;
    const followerId = req.user.id;

    await pool.execute(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    res.json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get follow status
app.get('/api/users/:id/follow-status', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ following: false });
    }

    const followingId = req.params.id;
    const followerId = req.user.id;

    const [follows] = await pool.execute(
      'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    res.json({ following: follows.length > 0 });
  } catch (error) {
    console.error('Follow status error:', error);
    res.status(500).json({ error: 'Failed to fetch follow status' });
  }
});

// Get follow counts
app.get('/api/users/:id/follow-counts', async (req, res) => {
  try {
    const userId = req.params.id;

    const [following] = await pool.execute(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
      [userId]
    );

    const [followers] = await pool.execute(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
      [userId]
    );

    res.json({
      followingCount: following[0].count,
      followersCount: followers[0].count
    });
  } catch (error) {
    console.error('Follow counts error:', error);
    res.status(500).json({ error: 'Failed to fetch follow counts' });
  }
});

// ============================================
// SOCKET.IO + SERVER STARTUP
// ============================================

const httpServer = http.createServer(app);

io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Map userId → socketId for WebRTC signaling
const userSockets = new Map();

io.on('connection', (socket) => {
  // Authenticate socket using JWT from handshake
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      userSockets.set(decoded.id, socket.id);
    } catch (e) {
      // Invalid token — socket is connected but not authenticated (read-only)
    }
  }

  // Join a conversation room for real-time message delivery
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conv-${conversationId}`);
  });

  // Typing indicators
  socket.on('typing-start', ({ conversationId }) => {
    socket.to(`conv-${conversationId}`).emit('typing-start', { userId: socket.userId });
  });

  socket.on('typing-stop', ({ conversationId }) => {
    socket.to(`conv-${conversationId}`).emit('typing-stop', { userId: socket.userId });
  });

  // WebRTC signaling — relay events to the target user's socket
  ['call-offer', 'call-answer', 'ice-candidate', 'call-end', 'call-decline', 'call-ringing'].forEach((evt) => {
    socket.on(evt, ({ targetUserId, ...data }) => {
      const targetSocketId = userSockets.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit(evt, { fromUserId: socket.userId, ...data });
      }
    });
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
    }
  });
});

httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`Belonging API server running on port ${PORT} (0.0.0.0)`);
  await initializeAdmin();
});
