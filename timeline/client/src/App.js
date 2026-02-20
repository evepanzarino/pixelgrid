import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import api from './api';

// Lazy loading hook
const useLazyLoad = (callback) => {
  const observer = useRef();
  
  const ref = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        callback();
      }
    }, { rootMargin: '200px' });
    if (node) observer.current.observe(node);
  }, [callback]);
  
  return ref;
};

// Image component with lazy loading
const LazyImage = ({ src, alt, className, placeholder }) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {inView ? (
        <img
          src={src}
          alt={alt}
          className={`timeline-image ${loaded ? 'loaded' : ''}`}
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
        />
      ) : (
        <div className="timeline-image-placeholder">Loading...</div>
      )}
    </div>
  );
};

// Header Component
const Header = ({ user, onLogin, onLogout }) => {
  const navigate = useNavigate();
  
  return (
    <header>
      <nav>
        <div className="topbar">
          <div className="topbar-item">
            <a href="tel:561-767-6146">561-767-6146</a>
          </div>
          <div className="topbar-item">
            <a href="https://evepanzarino.com" className="logo-title-link">
              <div className="logo-title">
                <img src="https://evepanzarino.com/images/pixelgrid-white.svg" alt="Logo" className="logo" />
                <img src="https://evepanzarino.com/images/EveTitle.svg" alt="Title" className="title" />
              </div>
            </a>
          </div>
          <div className="topbar-item topbar-right">
            {user ? (
              <>
                {user.isAdmin && (
                  <button className="admin-btn" onClick={() => navigate('/admin')}>
                    Admin
                  </button>
                )}
                <button className="logout-btn" onClick={onLogout}>
                  Logout
                </button>
              </>
            ) : (
              <a href="https://evepanzarino.com/portfolio">Portfolio</a>
            )}
          </div>
        </div>
        <div className="social-nav">
          <a href="/blog/">Blog</a>
          <a href="https://youtube.com/@evepanzarino"><i className="fab fa-youtube"></i></a>
          <a href="https://instagram.com/evepanzarino/"><i className="fab fa-instagram"></i></a>
          <a href="https://facebook.com/eveldapanzarino"><i className="fab fa-facebook"></i></a>
          <a className="bluesky" href="https://bsky.app/profile/evepanzarino.bsky.social"><img src="https://evepanzarino.com/images/bluesky-logo.svg" alt="Bluesky" /></a>
          <a href="https://github.com/evepanzarino"><i className="fab fa-github"></i></a>
          <a href="https://linkedin.com/in/evepanzarino"><i className="fab fa-linkedin"></i></a>
          <a href="/dev-blog/">Dev Blog</a>
        </div>
      </nav>
    </header>
  );
};
<h1>My Life Timeline</h1>
// Login Modal
const LoginModal = ({ onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/login', { username, password });
      localStorage.setItem('timeline_token', response.data.token);
      onSuccess(response.data.user);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="login-modal" onClick={e => e.stopPropagation()}>
        <h2>Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Login Page (full page for /admin when not logged in)
const LoginPage = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/login', { username, password });
      localStorage.setItem('timeline_token', response.data.token);
      onSuccess(response.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-modal">
        <h2>Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <button className="back-link" onClick={() => navigate('/')}>
          ← Back to Timeline
        </button>
      </div>
    </div>
  );
};

// Entry Detail Modal
const EntryModal = ({ entry, onClose, staticBase }) => {
  if (!entry) return null;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <img
          src={`${staticBase}/images/${entry.image_path}`}
          alt={entry.title || 'Timeline entry'}
          className="modal-image"
        />
        <div className="modal-info">
          <p className="modal-date">{formatDate(entry.date)}</p>
          {entry.title && <h2 className="modal-title">{entry.title}</h2>}
          {entry.description && (
            <p className="modal-description">{entry.description}</p>
          )}
          {entry.html_content && (
            <div 
              className="modal-html-content"
              dangerouslySetInnerHTML={{ __html: entry.html_content }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Timeline Component
const Timeline = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const staticBase = process.env.NODE_ENV === 'production'
    ? '/timeline'
    : 'http://localhost:5007';

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await api.get('/timeline');
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEntryUrl = (entry) => {
    const d = new Date(entry.date);
    const dateStr = d.toISOString().split('T')[0];
    return `/timeline/${dateStr}/${entry.slug}`;
  };

  if (loading) {
    return <div className="loading">Loading timeline...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <h3>No entries yet</h3>
        <p>The timeline is empty. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <h1 className="timeline-heading">My Life Timeline</h1>
      <div className="timeline timeline-horizontal">
        {entries.map((entry, index) => (
          <div key={entry.id} className="timeline-entry">
            <div className="timeline-dot" />
            <a href={getEntryUrl(entry)} className="timeline-card-link">
              <div className="timeline-card">
                <LazyImage
                  src={`${staticBase}/thumbnails/${entry.thumbnail_path}`}
                  alt={entry.title || 'Timeline entry'}
                  className="timeline-image-container"
                />
                <div className="timeline-info">
                  <p className="timeline-date">{formatDate(entry.date)}</p>
                  {entry.title && <h3 className="timeline-title">{entry.title}</h3>}
                  {entry.description && (
                    <p className="timeline-description">
                      {entry.description.substring(0, 100)}
                      {entry.description.length > 100 ? '...' : ''}
                    </p>
                  )}
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

// Admin Panel
const AdminPanel = ({ user }) => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    date: '',
    title: '',
    description: '',
    html_content: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const apiBase = process.env.NODE_ENV === 'production' 
    ? '/timeline/api' 
    : 'http://localhost:5007/api';

  const staticBase = process.env.NODE_ENV === 'production'
    ? '/timeline'
    : 'http://localhost:5007';

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    fetchEntries();
  }, [user, navigate]);

  const fetchEntries = async () => {
    try {
      const response = await api.get('/timeline');
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select an image' });
      return;
    }

    if (!formData.date) {
      setMessage({ type: 'error', text: 'Please select a date' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    const data = new FormData();
    data.append('image', selectedFile);
    data.append('date', formData.date);
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('html_content', formData.html_content);

    try {
      await api.post('/timeline', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setMessage({ type: 'success', text: 'Entry added successfully!' });
      setFormData({ date: '', title: '', description: '', html_content: '' });
      setSelectedFile(null);
      setPreview(null);
      fetchEntries();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await api.delete(`/timeline/${id}`);
      setMessage({ type: 'success', text: 'Entry deleted' });
      setEditingEntry(null);
      fetchEntries();
    } catch (error) {
      setMessage({ type: 'error', text: 'Delete failed' });
    }
  };

  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', title: '', description: '', html_content: '' });

  const startEdit = (entry) => {
    setEditingEntry(entry.id);
    setEditForm({
      date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : '',
      title: entry.title || '',
      description: entry.description || '',
      html_content: entry.html_content || ''
    });
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setEditForm({ date: '', title: '', description: '', html_content: '' });
  };

  const handleUpdate = async (id) => {
    try {
      await api.put(`/timeline/${id}`, editForm);
      setMessage({ type: 'success', text: 'Entry updated!' });
      setEditingEntry(null);
      fetchEntries();
    } catch (error) {
      setMessage({ type: 'error', text: 'Update failed' });
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user?.isAdmin) return null;

  return (
    <div className="admin-panel">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Back to Timeline
      </button>
      
      <h2>Admin Panel</h2>

      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="upload-form">
        <h3>Add New Entry</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Image *</label>
            <div className="file-input-wrapper">
              <div className="file-input-label">
                {preview ? (
                  <img src={preview} alt="Preview" className="file-preview" />
                ) : (
                  <span>Click or drag to upload image</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Optional title"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>

          <div className="form-group">
            <label>HTML Content (for detail page)</label>
            <textarea
              value={formData.html_content}
              onChange={e => setFormData({ ...formData, html_content: e.target.value })}
              placeholder="Optional HTML content for the entry's detail view"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Add Entry'}
          </button>
        </form>
      </div>

      <div className="admin-entries">
        <h3>Existing Entries ({entries.length})</h3>
        {loading ? (
          <p>Loading...</p>
        ) : entries.length === 0 ? (
          <p>No entries yet</p>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="admin-entry">
              <img
                src={`${staticBase}/thumbnails/${entry.thumbnail_path}`}
                alt={entry.title || 'Entry'}
              />
              {editingEntry === entry.id ? (
                <div className="admin-entry-edit">
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>HTML Content</label>
                    <textarea
                      value={editForm.html_content}
                      onChange={e => setEditForm({ ...editForm, html_content: e.target.value })}
                      rows={6}
                    />
                  </div>
                  <div className="admin-entry-actions">
                    <button className="save-btn" onClick={() => handleUpdate(entry.id)}>Save</button>
                    <button className="cancel-btn" onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="admin-entry-info">
                    <p className="admin-entry-date">{formatDate(entry.date)}</p>
                    <p className="admin-entry-title">{entry.title || '(No title)'}</p>
                    {entry.slug && (
                      <p className="admin-entry-slug">
                        <a href={`/timeline/${new Date(entry.date).toISOString().split('T')[0]}/${entry.slug}`} target="_blank" rel="noopener noreferrer">
                          View page →
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="admin-entry-actions">
                    <button className="edit-btn" onClick={() => startEdit(entry)}>Edit</button>
                    <button className="delete-btn" onClick={() => handleDelete(entry.id)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Main App
function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('timeline_token');
    if (token) {
      try {
        const response = await api.get('/me');
        setUser(response.data.user);
      } catch (error) {
        localStorage.removeItem('timeline_token');
      }
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('timeline_token');
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <Header 
        user={user} 
        onLogin={() => setShowLogin(true)} 
        onLogout={handleLogout} 
      />

      <Routes>
        <Route path="/" element={<Timeline />} />
        <Route path="/admin" element={user?.isAdmin ? <AdminPanel user={user} /> : <LoginPage onSuccess={(u) => setUser(u)} />} />
      </Routes>
    </div>
  );
}

export default App;
