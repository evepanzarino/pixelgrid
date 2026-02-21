const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const slugify = require('slugify');
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5001;

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

// Helper function to generate slug
function generateSlug(firstName, middleName, lastName) {
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
  return slugify(fullName, { lower: true, strict: true });
}

// ============================================
// PEOPLE ROUTES
// ============================================

// Get all people (with search)
app.get('/api/people', async (req, res) => {
  try {
    const { search } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    let query = `
      SELECT p.*, 
        (SELECT COUNT(*) FROM hate_records hr WHERE hr.person_id = p.id) as hate_record_count
      FROM people p
    `;
    const params = [];
    
    if (search) {
      query += ` WHERE MATCH(first_name, middle_name, last_name, description, family_members) AGAINST(? IN NATURAL LANGUAGE MODE)
                 OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.location LIKE ?`;
      params.push(search, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY p.last_name, p.first_name LIMIT ${limit} OFFSET ${offset}`;
    
    const [rows] = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM people';
    const countParams = [];
    if (search) {
      countQuery += ` WHERE MATCH(first_name, middle_name, last_name, description, family_members) AGAINST(? IN NATURAL LANGUAGE MODE)
                      OR first_name LIKE ? OR last_name LIKE ? OR location LIKE ?`;
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

// Get single person by slug
app.get('/api/people/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get person
    const [people] = await pool.execute(
      'SELECT * FROM people WHERE slug = ?',
      [slug]
    );
    
    if (people.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }
    
    const person = people[0];
    
    // Get hate records
    const [hateRecords] = await pool.execute(
      'SELECT * FROM hate_records WHERE person_id = ? ORDER BY incident_date DESC, created_at DESC',
      [person.id]
    );
    
    // Get social profiles
    const [socialProfiles] = await pool.execute(
      'SELECT * FROM social_profiles WHERE person_id = ?',
      [person.id]
    );
    
    // Get comments
    const [comments] = await pool.execute(
      'SELECT * FROM comments WHERE person_id = ? ORDER BY created_at DESC',
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

// Create new person
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
    
    // Validate required field
    if (!social_link) {
      return res.status(400).json({ error: 'Social link is required' });
    }
    
    if (!first_name && !last_name) {
      return res.status(400).json({ error: 'At least first name or last name is required' });
    }
    
    // Generate slug
    let slug = generateSlug(first_name, middle_name, last_name);
    
    // Check for duplicate slug and make unique if needed
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
    
    const [result] = await pool.execute(
      `INSERT INTO people (first_name, middle_name, last_name, slug, phone_number, location, family_members, description, profile_photo_url, social_link, markup_content)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name || '', middle_name || null, last_name || '', slug, phone_number || null, location || null, family_members || null, description || null, profile_photo_url || null, social_link, markup_content || null]
    );
    
    res.status(201).json({
      id: result.insertId,
      slug,
      message: 'Person created successfully'
    });
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// Update person
app.put('/api/people/:id', async (req, res) => {
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
    
    // Validate required field
    if (!social_link) {
      return res.status(400).json({ error: 'Social link is required' });
    }
    
    // Regenerate slug if name changed
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

// Delete person
app.delete('/api/people/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete related records first (cascade should handle this, but being explicit)
    await pool.execute('DELETE FROM hate_records WHERE person_id = ?', [id]);
    await pool.execute('DELETE FROM social_profiles WHERE person_id = ?', [id]);
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

// Get hate records for a person
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

// Create hate record
app.post('/api/people/:personId/hate-records', async (req, res) => {
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
    
    res.status(201).json({
      id: result.insertId,
      message: 'Hate record created successfully'
    });
  } catch (error) {
    console.error('Error creating hate record:', error);
    res.status(500).json({ error: 'Failed to create hate record' });
  }
});

// Update hate record
app.put('/api/hate-records/:id', async (req, res) => {
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

// Delete hate record
app.delete('/api/hate-records/:id', async (req, res) => {
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
// SOCIAL PROFILES ROUTES
// ============================================

// Get social profiles for a person
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

// Add social profile
app.post('/api/people/:personId/social-profiles', async (req, res) => {
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
    
    res.status(201).json({
      id: result.insertId,
      message: 'Social profile added successfully'
    });
  } catch (error) {
    console.error('Error adding social profile:', error);
    res.status(500).json({ error: 'Failed to add social profile' });
  }
});

// Delete social profile
app.delete('/api/social-profiles/:id', async (req, res) => {
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
// COMMENTS ROUTES
// ============================================

// Get comments for a person
app.get('/api/people/:personId/comments', async (req, res) => {
  try {
    const { personId } = req.params;
    
    const [comments] = await pool.execute(
      'SELECT * FROM comments WHERE person_id = ? ORDER BY created_at DESC',
      [personId]
    );
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create comment
app.post('/api/people/:personId/comments', async (req, res) => {
  try {
    const { personId } = req.params;
    const { author_name, content, post_url, media_urls } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    const [result] = await pool.execute(
      `INSERT INTO comments (person_id, author_name, content, post_url, media_urls)
       VALUES (?, ?, ?, ?, ?)`,
      [personId, author_name || 'Anonymous', content, post_url || null, media_urls || null]
    );
    
    res.status(201).json({
      id: result.insertId,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Delete comment
app.delete('/api/comments/:id', async (req, res) => {
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
// PHOTO UPLOAD ROUTE
// ============================================

// Upload photo and return URL
app.post('/api/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }
    
    const url = `/uploads/${req.file.filename}`;
    
    res.status(201).json({
      url,
      message: 'Photo uploaded successfully'
    });
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
    const [people] = await pool.execute('SELECT slug, updated_at FROM people');
    
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
// STATS/ADMIN ROUTES
// ============================================

app.get('/api/stats', async (req, res) => {
  try {
    const [[{ peopleCount }]] = await pool.execute('SELECT COUNT(*) as peopleCount FROM people');
    const [[{ recordCount }]] = await pool.execute('SELECT COUNT(*) as recordCount FROM hate_records');
    
    res.json({
      people: peopleCount,
      hateRecords: recordCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Health check
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
