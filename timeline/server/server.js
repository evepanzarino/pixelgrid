const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const SITE_URL = process.env.SITE_URL || 'https://evepanzarino.com';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

// Ensure directories exist
const imagesDir = path.join(__dirname, 'images');
const thumbnailsDir = path.join(__dirname, 'thumbnails');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'timeline-mysql',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'timeline_password',
  database: process.env.DB_NAME || 'timeline_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Seed admin user on startup
async function seedAdminUser() {
  try {
    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', ['evepanzarino']);
    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash('TrueLove25320664!', 10);
      await pool.execute(
        'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)',
        ['evepanzarino', hashedPassword, true]
      );
      console.log('Admin user created successfully');
    } else {
      // Update password if needed
      const hashedPassword = await bcrypt.hash('TrueLove25320664!', 10);
      await pool.execute(
        'UPDATE users SET password = ?, is_admin = ? WHERE username = ?',
        [hashedPassword, true, 'evepanzarino']
      );
      console.log('Admin user updated');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}

// Initialize admin user after a short delay to ensure DB is ready
setTimeout(seedAdminUser, 5000);

// Ensure slug column exists (migration for existing databases)
async function ensureSlugColumn() {
  try {
    await pool.execute("SELECT slug FROM timeline_entries LIMIT 1");
  } catch (e) {
    await pool.execute("ALTER TABLE timeline_entries ADD COLUMN slug VARCHAR(255) AFTER title");
    await pool.execute("CREATE UNIQUE INDEX idx_slug ON timeline_entries (slug)");
    console.log('Added slug column to timeline_entries');
    // Generate slugs for existing entries
    const [entries] = await pool.execute('SELECT id, date, title FROM timeline_entries');
    for (const entry of entries) {
      const slug = generateSlug(entry.title, entry.date);
      await pool.execute('UPDATE timeline_entries SET slug = ? WHERE id = ?', [slug, entry.id]);
    }
  }
}
setTimeout(ensureSlugColumn, 6000);

// Slug generation
function generateSlug(title, date) {
  if (!title) {
    const d = new Date(date);
    return 'entry-' + d.getTime();
  }
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// Format date as YYYY-MM-DD
function formatDateSlug(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Server-side rendered entry page with full SEO meta tags
function renderEntryPage(entry) {
  const dateStr = formatDateSlug(entry.date);
  const entryUrl = `${SITE_URL}/timeline/${dateStr}/${entry.slug}`;
  const imageUrl = `${SITE_URL}/timeline/images/${entry.image_path}`;
  const thumbnailUrl = `${SITE_URL}/timeline/thumbnails/${entry.thumbnail_path}`;
  const title = entry.title || `Timeline - ${new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  const description = entry.description || `${title} - From Eve Panzarino's life timeline.`;
  const publishDate = new Date(entry.created_at).toISOString();
  const modifiedDate = new Date(entry.updated_at || entry.created_at).toISOString();
  const entryDate = new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': title,
    'description': description,
    'image': imageUrl,
    'datePublished': publishDate,
    'dateModified': modifiedDate,
    'author': {
      '@type': 'Person',
      'name': 'Eve Panzarino',
      'url': SITE_URL
    },
    'publisher': {
      '@type': 'Person',
      'name': 'Eve Panzarino',
      'url': SITE_URL
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': entryUrl
    },
    'url': entryUrl
  };

  const htmlContent = entry.html_content || `<p>${entry.description || ''}</p>`;

  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  
  <!-- Primary Meta Tags -->
  <title>${title} | Eve Panzarino Timeline</title>
  <meta name="title" content="${title} | Eve Panzarino Timeline">
  <meta name="description" content="${description}">
  <meta name="author" content="Eve Panzarino">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="${entryUrl}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${entryUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Eve Panzarino Timeline">
  <meta property="og:locale" content="en_US">
  <meta property="article:published_time" content="${publishDate}">
  <meta property="article:modified_time" content="${modifiedDate}">
  <meta property="article:author" content="Eve Panzarino">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${entryUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background: #0a0a0a; color: #e0e0e0; line-height: 1.6; }
    .entry-page { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .entry-nav { margin-bottom: 30px; }
    .entry-nav a { color: #8b5cf6; text-decoration: none; font-size: 14px; }
    .entry-nav a:hover { text-decoration: underline; }
    .entry-image { width: 100%; max-height: 600px; object-fit: contain; border-radius: 12px; margin-bottom: 24px; background: #1a1a1a; }
    .entry-date { color: #8b5cf6; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .entry-title { font-size: 2em; font-weight: 700; margin-bottom: 16px; color: #fff; }
    .entry-description { font-size: 1.1em; color: #b0b0b0; margin-bottom: 24px; }
    .entry-content { font-size: 1em; color: #d0d0d0; }
    .entry-content img { max-width: 100%; border-radius: 8px; }
    .entry-content a { color: #8b5cf6; }
    .entry-share { margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; }
    .entry-share h3 { font-size: 14px; color: #888; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .share-links { display: flex; gap: 12px; flex-wrap: wrap; }
    .share-links a { padding: 8px 16px; background: #1a1a1a; color: #e0e0e0; text-decoration: none; border-radius: 6px; font-size: 14px; transition: background 0.2s; }
    .share-links a:hover { background: #2a2a2a; }
    @media (max-width: 600px) { .entry-title { font-size: 1.5em; } .entry-page { padding: 20px 16px; } }
  </style>
</head>
<body>
  <div class="entry-page">
    <nav class="entry-nav">
      <a href="/timeline/">← Back to Timeline</a>
    </nav>
    
    <article>
      <img 
        src="/timeline/images/${entry.image_path}" 
        alt="${title}"
        class="entry-image"
        loading="eager"
      >
      
      <p class="entry-date">${entryDate}</p>
      ${entry.title ? `<h1 class="entry-title">${entry.title}</h1>` : ''}
      ${entry.description ? `<p class="entry-description">${entry.description}</p>` : ''}
      
      <div class="entry-content">
        ${htmlContent}
      </div>
      
      <div class="entry-share">
        <h3>Share</h3>
        <div class="share-links">
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(entryUrl)}" target="_blank" rel="noopener">Twitter / X</a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(entryUrl)}" target="_blank" rel="noopener">Facebook</a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(entryUrl)}" target="_blank" rel="noopener">LinkedIn</a>
          <a href="https://pinterest.com/pin/create/button/?url=${encodeURIComponent(entryUrl)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(title)}" target="_blank" rel="noopener">Pinterest</a>
          <a href="mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(entryUrl)}" target="_blank" rel="noopener">Email</a>
        </div>
      </div>
    </article>
  </div>
</body>
</html>`;
}

// SSR Entry Page Route - /YYYY-MM-DD/slug
app.get('/entry/:date/:slug', async (req, res) => {
  try {
    const { date, slug } = req.params;
    const [entries] = await pool.execute(
      'SELECT * FROM timeline_entries WHERE slug = ? AND DATE_FORMAT(date, "%Y-%m-%d") = ?',
      [slug, date]
    );
    
    if (entries.length === 0) {
      // Try just by slug
      const [bySlug] = await pool.execute(
        'SELECT * FROM timeline_entries WHERE slug = ?',
        [slug]
      );
      if (bySlug.length === 0) {
        return res.status(404).send('<html><body><h1>Entry Not Found</h1><a href="/timeline/">Back to Timeline</a></body></html>');
      }
      // Redirect to correct date URL
      const correctDate = formatDateSlug(bySlug[0].date);
      return res.redirect(301, `/timeline/${correctDate}/${slug}`);
    }
    
    res.send(renderEntryPage(entries[0]));
  } catch (error) {
    console.error('Error rendering entry:', error);
    res.status(500).send('Server error');
  }
});

// Sitemap.xml
app.get('/sitemap.xml', async (req, res) => {
  try {
    const [entries] = await pool.execute(
      'SELECT slug, date, updated_at FROM timeline_entries ORDER BY date DESC'
    );
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE_URL}/timeline/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`;
    
    for (const entry of entries) {
      const dateStr = formatDateSlug(entry.date);
      const lastmod = new Date(entry.updated_at).toISOString().split('T')[0];
      xml += `
  <url>
    <loc>${SITE_URL}/timeline/${dateStr}/${entry.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }
    
    xml += '\n</urlset>';
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/timeline/sitemap.xml`);
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
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

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'timeline_secret_key_2026';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Routes

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        isAdmin: user.is_admin 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Get all timeline entries (public)
app.get('/api/timeline', async (req, res) => {
  try {
    const [entries] = await pool.execute(
      'SELECT id, image_path, thumbnail_path, date, title, slug, description, html_content, created_at FROM timeline_entries ORDER BY date ASC'
    );
    res.json(entries);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single timeline entry
app.get('/api/timeline/:id', async (req, res) => {
  try {
    const [entries] = await pool.execute(
      'SELECT * FROM timeline_entries WHERE id = ?',
      [req.params.id]
    );
    
    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    res.json(entries[0]);
  } catch (error) {
    console.error('Error fetching entry:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload new timeline entry (admin only)
app.post('/api/timeline', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    
    const { date, title, description, html_content } = req.body;
    const imagePath = req.file.filename;
    
    // Create thumbnail
    const thumbnailFilename = 'thumb_' + imagePath;
    await sharp(req.file.path)
      .resize(300, 300, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toFile(path.join(thumbnailsDir, thumbnailFilename));
    
    // Generate slug
    const slug = generateSlug(title, date);
    
    const [result] = await pool.execute(
      'INSERT INTO timeline_entries (image_path, thumbnail_path, date, title, slug, description, html_content) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [imagePath, thumbnailFilename, date, title || null, slug, description || null, html_content || null]
    );
    
    res.status(201).json({ 
      id: result.insertId,
      image_path: imagePath,
      thumbnail_path: thumbnailFilename,
      date,
      title,
      slug,
      description,
      html_content
    });
  } catch (error) {
    console.error('Error uploading:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update timeline entry (admin only)
app.put('/api/timeline/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date, title, description, html_content } = req.body;
    const slug = generateSlug(title, date);
    
    await pool.execute(
      'UPDATE timeline_entries SET date = ?, title = ?, slug = ?, description = ?, html_content = ? WHERE id = ?',
      [date, title, slug, description, html_content, req.params.id]
    );
    
    res.json({ message: 'Entry updated', slug });
  } catch (error) {
    console.error('Error updating:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete timeline entry (admin only)
app.delete('/api/timeline/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [entries] = await pool.execute(
      'SELECT image_path, thumbnail_path FROM timeline_entries WHERE id = ?',
      [req.params.id]
    );
    
    if (entries.length > 0) {
      // Delete image files
      const imagePath = path.join(imagesDir, entries[0].image_path);
      const thumbnailPath = path.join(thumbnailsDir, entries[0].thumbnail_path);
      
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
    }
    
    await pool.execute('DELETE FROM timeline_entries WHERE id = ?', [req.params.id]);
    
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error('Error deleting:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Timeline server running on port ${PORT}`);
});
