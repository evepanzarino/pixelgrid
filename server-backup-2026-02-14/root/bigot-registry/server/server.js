const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const slugify = require('slugify');
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'bigot-registry-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'bigot_registry',
  password: process.env.DB_PASSWORD || 'BigotRegistry2026!',
  database: process.env.DB_NAME || 'bigot_registry',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ============================================
// AUTH MIDDLEWARE
// ============================================

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
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = user;
    next();
  });
};

// Apply auth middleware to all routes
app.use(authenticateToken);

// Helper function to generate slug
function generateSlug(firstName, middleName, lastName) {
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
  return slugify(fullName, { lower: true, strict: true });
}

// ============================================
// AUTH ROUTES
// ============================================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if username exists
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email || null, passwordHash, 'user']
    );
    
    // Generate token
    const token = jwt.sign(
      { id: result.insertId, username, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: result.insertId, username, role: 'user' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const user = users[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
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
    const [users] = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
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

// ============================================
// ADMIN ROUTES
// ============================================

// Get pending people
app.get('/api/admin/pending/people', requireAdmin, async (req, res) => {
  try {
    const [people] = await pool.query(
      `SELECT p.*, u.username as submitted_by_username 
       FROM people p 
       LEFT JOIN users u ON p.submitted_by = u.id 
       WHERE p.status = 'pending' 
       ORDER BY p.created_at DESC`
    );
    res.json(people);
  } catch (error) {
    console.error('Error fetching pending people:', error);
    res.status(500).json({ error: 'Failed to fetch pending people' });
  }
});

// Get pending comments
app.get('/api/admin/pending/comments', requireAdmin, async (req, res) => {
  try {
    const [comments] = await pool.query(
      `SELECT c.*, p.first_name, p.last_name, p.slug as person_slug, u.username as submitted_by_username
       FROM comments c 
       JOIN people p ON c.person_id = p.id
       LEFT JOIN users u ON c.submitted_by = u.id 
       WHERE c.status = 'pending' 
       ORDER BY c.created_at DESC`
    );
    res.json(comments);
  } catch (error) {
    console.error('Error fetching pending comments:', error);
    res.status(500).json({ error: 'Failed to fetch pending comments' });
  }
});

// Approve/deny person
app.post('/api/admin/people/:id/review', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'deny'
    
    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use approve or deny.' });
    }
    
    const status = action === 'approve' ? 'approved' : 'denied';
    
    await pool.execute(
      'UPDATE people SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, req.user.id, id]
    );
    
    res.json({ message: `Person ${status} successfully` });
  } catch (error) {
    console.error('Error reviewing person:', error);
    res.status(500).json({ error: 'Failed to review person' });
  }
});

// Approve/deny comment
app.post('/api/admin/comments/:id/review', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    
    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use approve or deny.' });
    }
    
    const status = action === 'approve' ? 'approved' : 'denied';
    
    await pool.execute(
      'UPDATE comments SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, req.user.id, id]
    );
    
    res.json({ message: `Comment ${status} successfully` });
  } catch (error) {
    console.error('Error reviewing comment:', error);
    res.status(500).json({ error: 'Failed to review comment' });
  }
});

// Get admin stats
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [[{ pendingPeople }]] = await pool.query("SELECT COUNT(*) as pendingPeople FROM people WHERE status = 'pending'");
    const [[{ pendingComments }]] = await pool.query("SELECT COUNT(*) as pendingComments FROM comments WHERE status = 'pending'");
    const [[{ totalPeople }]] = await pool.query("SELECT COUNT(*) as totalPeople FROM people WHERE status = 'approved'");
    const [[{ totalComments }]] = await pool.query("SELECT COUNT(*) as totalComments FROM comments WHERE status = 'approved'");
    const [[{ totalUsers }]] = await pool.query("SELECT COUNT(*) as totalUsers FROM users");
    
    res.json({
      pendingPeople,
      pendingComments,
      totalPeople,
      totalComments,
      totalUsers
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================
// PEOPLE ROUTES
// ============================================

// Get all people (only approved, with search)
app.get('/api/people', async (req, res) => {
  try {
    const { search } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    let query = `
      SELECT p.*, 
        (SELECT COUNT(*) FROM hate_records hr WHERE hr.person_id = p.id) as hate_record_count
      FROM people p
      WHERE p.status = 'approved'
    `;
    const params = [];
    
    if (search) {
      query += ` AND (MATCH(first_name, middle_name, last_name, description, family_members) AGAINST(? IN NATURAL LANGUAGE MODE)
                 OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.location LIKE ?)`;
      params.push(search, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY p.last_name, p.first_name LIMIT ${limit} OFFSET ${offset}`;
    
    const [rows] = await pool.query(query, params);
    
    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM people WHERE status = 'approved'";
    const countParams = [];
    if (search) {
      countQuery += ` AND (MATCH(first_name, middle_name, last_name, description, family_members) AGAINST(? IN NATURAL LANGUAGE MODE)
                      OR first_name LIKE ? OR last_name LIKE ? OR location LIKE ?)`;
      countParams.push(search, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const [[{ total }]] = await pool.query(countQuery, countParams);
    
    res.json({
      people: rows,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ error: 'Failed to fetch people' });
  }
});

// Get single person by slug (only approved)
app.get('/api/people/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [people] = await pool.execute(
      "SELECT * FROM people WHERE slug = ? AND status = 'approved'",
      [slug]
    );
    
    if (people.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    
    const person = people[0];
    
    const [hateRecords] = await pool.execute(
      'SELECT * FROM hate_records WHERE person_id = ? ORDER BY incident_date DESC, created_at DESC',
      [person.id]
    );
    
    const [socialProfiles] = await pool.execute(
      'SELECT * FROM social_profiles WHERE person_id = ?',
      [person.id]
    );
    
    // Only get approved comments
    const [comments] = await pool.execute(
      "SELECT * FROM comments WHERE person_id = ? AND status = 'approved' ORDER BY created_at DESC",
      [person.id]
    );
    
    res.json({
      ...person,
      hateRecords,
      socialProfiles,
      comments
    });
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ error: 'Failed to fetch person' });
  }
});

// Create new person (pending approval if submitted via web)
app.post('/api/people', async (req, res) => {
  try {
    const {
      first_name,
      middle_name,
      last_name,
      phone_number,
      location,
      family_members,
      description,
      profile_photo_url,
      social_link,
      markup_content
    } = req.body;
    
    if (!social_link) {
      return res.status(400).json({ error: 'Social link is required' });
    }
    
    if (!first_name && !last_name) {
      return res.status(400).json({ error: 'At least first name or last name is required' });
    }
    
    let slug = generateSlug(first_name, middle_name, last_name);
    
    const [existing] = await pool.execute(
      'SELECT slug FROM people WHERE slug LIKE ?',
      [`${slug}%`]
    );
    
    if (existing.length > 0) {
      const existingSlugs = existing.map(p => p.slug);
      let counter = 1;
      let newSlug = slug;
      while (existingSlugs.includes(newSlug)) {
        newSlug = `${slug}-${counter}`;
        counter++;
      }
      slug = newSlug;
    }
    
    // If user is admin, auto-approve. Otherwise, pending
    const status = req.user && req.user.role === 'admin' ? 'approved' : 'pending';
    const submittedBy = req.user ? req.user.id : null;
    
    const [result] = await pool.execute(
      `INSERT INTO people (first_name, middle_name, last_name, slug, phone_number, location, family_members, description, profile_photo_url, social_link, markup_content, status, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name || '', middle_name || null, last_name || '', slug, phone_number || null, location || null, family_members || null, description || null, profile_photo_url || null, social_link, markup_content || null, status, submittedBy]
    );
    
    res.status(201).json({
      id: result.insertId,
      slug,
      status,
      message: status === 'pending' ? 'Person submitted for review' : 'Person created successfully'
    });
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// Update person (admin only)
app.put('/api/people/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      middle_name,
      last_name,
      phone_number,
      location,
      family_members,
      description,
      profile_photo_url,
      social_link,
      markup_content
    } = req.body;
    
    if (!social_link) {
      return res.status(400).json({ error: 'Social link is required' });
    }
    
    const slug = generateSlug(first_name, middle_name, last_name);
    
    await pool.execute(
      `UPDATE people SET 
        first_name = ?, middle_name = ?, last_name = ?, slug = ?,
        phone_number = ?, location = ?, family_members = ?, 
        description = ?, profile_photo_url = ?,
        social_link = ?, markup_content = ?
       WHERE id = ?`,
      [first_name || '', middle_name || null, last_name || '', slug, phone_number || null, location || null, family_members || null, description || null, profile_photo_url || null, social_link, markup_content || null, id]
    );
    
    res.json({ message: 'Person updated successfully', slug });
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// Delete person (admin only)
app.delete('/api/people/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute('DELETE FROM hate_records WHERE person_id = ?', [id]);
    await pool.execute('DELETE FROM social_profiles WHERE person_id = ?', [id]);
    await pool.execute('DELETE FROM comments WHERE person_id = ?', [id]);
    await pool.execute('DELETE FROM people WHERE id = ?', [id]);
    
    res.json({ message: 'Person deleted successfully' });
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ error: 'Failed to delete person' });
  }
});

// ============================================
// HATE RECORDS ROUTES
// ============================================

app.get('/api/people/:personId/hate-records', async (req, res) => {
  try {
    const { personId } = req.params;
    const [records] = await pool.execute(
      'SELECT * FROM hate_records WHERE person_id = ? ORDER BY incident_date DESC, created_at DESC',
      [personId]
    );
    res.json(records);
  } catch (error) {
    console.error('Error fetching hate records:', error);
    res.status(500).json({ error: 'Failed to fetch hate records' });
  }
});

app.post('/api/people/:personId/hate-records', requireAdmin, async (req, res) => {
  try {
    const { personId } = req.params;
    const { title, content, incident_date, source_url, media_urls } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const [result] = await pool.execute(
      `INSERT INTO hate_records (person_id, title, content, incident_date, source_url, media_urls)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [personId, title || null, content, incident_date || null, source_url || null, media_urls || null]
    );
    
    res.status(201).json({ id: result.insertId, message: 'Hate record created successfully' });
  } catch (error) {
    console.error('Error creating hate record:', error);
    res.status(500).json({ error: 'Failed to create hate record' });
  }
});

app.put('/api/hate-records/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, incident_date, source_url, media_urls } = req.body;
    
    await pool.execute(
      `UPDATE hate_records SET title = ?, content = ?, incident_date = ?, source_url = ?, media_urls = ?
       WHERE id = ?`,
      [title, content, incident_date, source_url, media_urls, id]
    );
    
    res.json({ message: 'Hate record updated successfully' });
  } catch (error) {
    console.error('Error updating hate record:', error);
    res.status(500).json({ error: 'Failed to update hate record' });
  }
});

app.delete('/api/hate-records/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM hate_records WHERE id = ?', [id]);
    res.json({ message: 'Hate record deleted successfully' });
  } catch (error) {
    console.error('Error deleting hate record:', error);
    res.status(500).json({ error: 'Failed to delete hate record' });
  }
});

// ============================================
// COMMENTS ROUTES
// ============================================

app.get('/api/people/:personId/comments', async (req, res) => {
  try {
    const { personId } = req.params;
    const [comments] = await pool.execute(
      "SELECT * FROM comments WHERE person_id = ? AND status = 'approved' ORDER BY created_at DESC",
      [personId]
    );
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/people/:personId/comments', async (req, res) => {
  try {
    const { personId } = req.params;
    const { author_name, content, post_url, media_urls } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    // If user is admin, auto-approve. Otherwise, pending
    const status = req.user && req.user.role === 'admin' ? 'approved' : 'pending';
    const submittedBy = req.user ? req.user.id : null;
    
    const [result] = await pool.execute(
      `INSERT INTO comments (person_id, author_name, content, post_url, media_urls, status, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [personId, author_name || 'Anonymous', content, post_url || null, media_urls || null, status, submittedBy]
    );
    
    res.status(201).json({
      id: result.insertId,
      status,
      message: status === 'pending' ? 'Comment submitted for review' : 'Comment added successfully'
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

app.delete('/api/comments/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM comments WHERE id = ?', [id]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ============================================
// SOCIAL PROFILES ROUTES
// ============================================

app.get('/api/people/:personId/social-profiles', async (req, res) => {
  try {
    const { personId } = req.params;
    const [profiles] = await pool.execute(
      'SELECT * FROM social_profiles WHERE person_id = ?',
      [personId]
    );
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching social profiles:', error);
    res.status(500).json({ error: 'Failed to fetch social profiles' });
  }
});

app.post('/api/people/:personId/social-profiles', requireAdmin, async (req, res) => {
  try {
    const { personId } = req.params;
    const { platform, url, username } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const [result] = await pool.execute(
      `INSERT INTO social_profiles (person_id, platform, url, username)
       VALUES (?, ?, ?, ?)`,
      [personId, platform || null, url, username || null]
    );
    
    res.status(201).json({ id: result.insertId, message: 'Social profile added successfully' });
  } catch (error) {
    console.error('Error adding social profile:', error);
    res.status(500).json({ error: 'Failed to add social profile' });
  }
});

app.delete('/api/social-profiles/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM social_profiles WHERE id = ?', [id]);
    res.json({ message: 'Social profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting social profile:', error);
    res.status(500).json({ error: 'Failed to delete social profile' });
  }
});

// ============================================
// PHOTO UPLOAD ROUTE
// ============================================

app.post('/api/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({ url, message: 'Photo uploaded successfully' });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// ============================================
// SITEMAP
// ============================================

app.get('/sitemap.xml', async (req, res) => {
  try {
    const [people] = await pool.execute("SELECT slug, updated_at FROM people WHERE status = 'approved'");
    
    const links = [
      { url: '/bigot-registry/', changefreq: 'daily', priority: 1.0 }
    ];
    
    people.forEach(person => {
      links.push({
        url: `/bigot-registry/person/${person.slug}`,
        lastmod: person.updated_at ? new Date(person.updated_at).toISOString() : undefined,
        changefreq: 'weekly',
        priority: 0.8
      });
    });
    
    const stream = new SitemapStream({ hostname: 'https://evepanzarino.com' });
    const xmlString = await streamToPromise(Readable.from(links).pipe(stream)).then(data => data.toString());
    
    res.header('Content-Type', 'application/xml');
    res.send(xmlString);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// ============================================
// STATS/HEALTH ROUTES
// ============================================

app.get('/api/stats', async (req, res) => {
  try {
    const [[{ peopleCount }]] = await pool.execute("SELECT COUNT(*) as peopleCount FROM people WHERE status = 'approved'");
    const [[{ recordCount }]] = await pool.execute('SELECT COUNT(*) as recordCount FROM hate_records');
    
    res.json({ people: peopleCount, hateRecords: recordCount });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Bigot Registry API server running on port ${PORT}`);
});
