import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useParams } from 'react-router-dom';
import { login as apiLogin, register as apiRegister, getCurrentUser, BASE_PATH } from './api';
import { ReactComponent as BelongingLogo } from './belonging.svg';
import { ReactComponent as LogoBelonging } from './logo-belonging.svg';

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await getCurrentUser();
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      return res.data;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getCurrentUser()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const res = await apiLogin(credentials);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const register = async (userData) => {
    const res = await apiRegister(userData);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Navbar Component
const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to={`${BASE_PATH}/`} className="navbar-logo-link" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0px' }}>
        <LogoBelonging className="logo-belonging" />
        <BelongingLogo className="belonging-logo" />
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Link to={`${BASE_PATH}/feed`}>Feed</Link>
        <Link to={`${BASE_PATH}/users`}>Users</Link>
        <Link to={`${BASE_PATH}/search`}>Search</Link>
        {user ? (
          <>
            <span style={{ color: '#333' }}>
              {user.username === user.email ? (
                <Link to={`${BASE_PATH}/complete-profile`} style={{ color: '#e67e22' }}>Choose a username</Link>
              ) : (
                `@${user.username}`
              )}
            </span>
            <button onClick={logout} className="btn btn-secondary">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to={`${BASE_PATH}/login`}>Login</Link>
            <Link to={`${BASE_PATH}/register`}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

// Home Page
const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="container">
      <div className="home-content">
        <h2>Welcome to Belonging</h2>
        <p>A community where everyone belongs.</p>
        {user ? (
          <div className="user-info">
            <h3>Your Profile</h3>
            {user.profile_picture && (
              <img 
                src={user.profile_picture} 
                alt="Profile" 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  objectFit: 'cover',
                  marginBottom: '15px'
                }} 
              />
            )}
            <p><strong>Username:</strong> {user.username === user.email || !user.username ? (
              <Link to={`${BASE_PATH}/complete-profile`}>Choose a username</Link>
            ) : (
              `@${user.username}`
            )}</p>
            <p><strong>Email:</strong> {user.email ? user.email : (
              <Link to={`${BASE_PATH}/complete-profile`}>Add an email</Link>
            )}</p>
            <p><strong>Member since:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
            <Link to={`${BASE_PATH}/edit-profile`} className="btn btn-secondary" style={{ marginTop: '15px' }}>
              Edit Profile
            </Link>
          </div>
        ) : (
          <div>
            <p>Join our community today!</p>
            <Link to={`${BASE_PATH}/register`} className="btn btn-primary">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

// Login Page
const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card">
        <h2>Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username / Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="auth-links">
          <p>Don't have an account? <Link to={`${BASE_PATH}/register`}>Register</Link></p>
        </div>
      </div>
    </div>
  );
};

// Register Page
const RegisterPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const { register, user } = useAuth();

  if (user && !justRegistered) {
    return <Navigate to="/" replace />;
  }

  if (justRegistered) {
    return <Navigate to={`${BASE_PATH}/complete-profile`} replace />;
  }

  const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!identifier.trim()) {
      setError('Please enter an email or username');
      return;
    }

    setLoading(true);

    try {
      const isEmailInput = isEmail(identifier);
      await register({ 
        username: isEmailInput ? identifier : identifier.toLowerCase().replace(/[^a-z0-9_]/g, ''), 
        email: isEmailInput ? identifier : null, 
        password
      });
      setJustRegistered(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card">
        <h2>Register</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email or Username</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="email@example.com or username"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ paddingRight: '50px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  color: '#666',
                  fontSize: '14px'
                }}
              >
                {showPassword ? '🙈 Hide' : '👁️ Show'}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div className="auth-links">
          <p>Already have an account? <Link to={`${BASE_PATH}/login`}>Login</Link></p>
        </div>
      </div>
    </div>
  );
};

// Complete Profile Page (shown after registration)
const CompleteProfilePage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState('form'); // 'form' or 'confirmation'
  const [savedHandle, setSavedHandle] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Store the email on mount (before user object might change)
  useEffect(() => {
    if (user) {
      setUserEmail(user.email || user.username);
    }
  }, []);

  if (!user) {
    return <Navigate to={`${BASE_PATH}/login`} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Only require handle if user registered with email (username contains @)
    const needsHandle = user.username && user.username.includes('@');
    if (needsHandle && !handle.trim()) {
      setError('Please enter a handle');
      return;
    }
    
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '/' ? '' : BASE_PATH}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          firstName, 
          lastName, 
          handle: handle || undefined, 
          email: email || undefined 
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      // Refresh user data from server
      await refreshUser();
      
      // Use the handle they entered, or their username if they registered with a username (not email)
      const displayHandle = handle || (user.username && !user.username.includes('@') ? user.username : '');
      setSavedHandle(displayHandle);
      setStep('confirmation');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // If skipping, go straight to home
    window.location.href = BASE_PATH === '/' ? '/' : BASE_PATH;
  };

  // Confirmation screen after profile is saved
  if (step === 'confirmation') {
    return (
      <div className="auth-container">
        <div className="card">
          <h2>Account Created! 🎉</h2>
          <p style={{ textAlign: 'center', marginBottom: '25px', color: '#666' }}>
            Your account is ready to use
          </p>
          <div style={{ 
            background: '#f8f9fa', 
            borderRadius: '8px', 
            padding: '20px', 
            marginBottom: '20px'
          }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Username</label>
              <p style={{ margin: '5px 0 0', fontSize: '18px', fontWeight: '500' }}>@{savedHandle}</p>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Email</label>
              <p style={{ margin: '5px 0 0', fontSize: '18px', fontWeight: '500' }}>{email || userEmail || 'Not set'}</p>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            {(email || userEmail) ? 'You can sign in with either your username or email' : 'You can sign in with your username'}
          </p>
          <Link to="/" className="btn btn-primary" style={{ width: '100%', display: 'block', textAlign: 'center' }}>
            Get Started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="card">
        <h2>Welcome! 🎉</h2>
        <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
          Tell us a bit about yourself
        </p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your first name"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Your last name"
              />
            </div>
          </div>
          {user.username && user.username.includes('@') && (
            <div className="form-group">
              <label>Custom Handle</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#666',
                  fontSize: '16px'
                }}>@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                  placeholder="yourhandle"
                  style={{ paddingLeft: '28px' }}
                />
              </div>
            </div>
          )}
          {!user.email && (
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </form>
        <button 
          onClick={handleSkip}
          style={{
            width: '100%',
            marginTop: '10px',
            padding: '12px 20px',
            background: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

// Edit Profile Page
const EditProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setUsername(user.username && !user.username.includes('@') ? user.username : '');
      setEmail(user.email || '');
      setProfilePicture(user.profile_picture || '');
    }
  }, [user]);

  if (!user) {
    return <Navigate to={`${BASE_PATH}/login`} replace />;
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          handle: username || undefined,
          email: email || undefined,
          profilePicture: profilePicture || undefined
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      await refreshUser();
      setMessage('Profile updated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change password');
      }

      setMessage('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setError('Image must be less than 100MB');
      return;
    }

    // Upload to server instead of base64
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      const imageUrl = `${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}${data.url}`;
      setProfilePicture(imageUrl);
    } catch (err) {
      setError('Failed to upload image: ' + err.message);
    }
  };

  const tabStyle = (isActive) => ({
    padding: '10px 20px',
    border: 'none',
    background: isActive ? '#667eea' : 'transparent',
    color: isActive ? 'white' : '#666',
    cursor: 'pointer',
    borderRadius: '5px 5px 0 0',
    fontWeight: isActive ? '600' : '400'
  });

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2>Edit Profile</h2>
        
        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '1px solid #eee' }}>
          <button style={tabStyle(activeTab === 'profile')} onClick={() => setActiveTab('profile')}>
            Profile
          </button>
          <button style={tabStyle(activeTab === 'password')} onClick={() => setActiveTab('password')}>
            Password
          </button>
        </div>

        {message && <div style={{ padding: '10px', background: '#d4edda', color: '#155724', borderRadius: '5px', marginBottom: '15px' }}>{message}</div>}
        {error && <div className="error-message">{error}</div>}

        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} noValidate>
            {/* Profile Picture */}
            <div className="form-group" style={{ textAlign: 'center' }}>
              <label>Profile Picture</label>
              <div style={{ marginTop: '10px' }}>
                {profilePicture ? (
                  <img 
                    src={profilePicture} 
                    alt="Profile" 
                    style={{ 
                      width: '120px', 
                      height: '120px', 
                      borderRadius: '50%', 
                      objectFit: 'cover',
                      border: '3px solid #667eea'
                    }} 
                  />
                ) : (
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    fontSize: '48px',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {(firstName || username || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ marginTop: '10px' }}
                id="profile-picture-input"
              />
              {profilePicture && (
                <button 
                  type="button" 
                  onClick={() => setProfilePicture('')}
                  style={{ marginTop: '5px', background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer' }}
                >
                  Remove Photo
                </button>
              )}
            </div>

            {/* Name Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Your first name"
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Your last name"
                />
              </div>
            </div>

            {/* Username */}
            <div className="form-group">
              <label>Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#666',
                  fontSize: '16px'
                }}>@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                  placeholder="yourhandle"
                  style={{ paddingLeft: '28px' }}
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label>Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// Post Editor Component (WordPress-like with visual and code editor)
const PostEditor = ({ onPostCreated, editPost, onCancel }) => {
  const [content, setContent] = useState(editPost?.content || '');
  const [customCss, setCustomCss] = useState(editPost?.custom_css || '');
  const [editorMode, setEditorMode] = useState('visual'); // 'visual', 'html', 'css'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      const imageUrl = `${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}${data.url}`;
      setUploadedImages([...uploadedImages, imageUrl]);
      
      // Insert image tag into content
      const imgTag = `<img src="${imageUrl}" alt="Uploaded image" style="max-width: 100%;" />`;
      setContent(prev => prev + '\n' + imgTag);
    } catch (err) {
      setError('Failed to upload image: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Toolbar actions for visual editor
  const insertFormatting = (before, after = '') => {
    const textarea = document.getElementById('post-content-editor');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newContent);
    
    // Refocus and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const toolbarButtons = [
    { label: 'B', title: 'Bold', action: () => insertFormatting('<strong>', '</strong>') },
    { label: 'I', title: 'Italic', action: () => insertFormatting('<em>', '</em>') },
    { label: 'U', title: 'Underline', action: () => insertFormatting('<u>', '</u>') },
    { label: 'S', title: 'Strikethrough', action: () => insertFormatting('<s>', '</s>') },
    { label: 'H1', title: 'Heading 1', action: () => insertFormatting('<h1>', '</h1>') },
    { label: 'H2', title: 'Heading 2', action: () => insertFormatting('<h2>', '</h2>') },
    { label: 'H3', title: 'Heading 3', action: () => insertFormatting('<h3>', '</h3>') },
    { label: '¶', title: 'Paragraph', action: () => insertFormatting('<p>', '</p>') },
    { label: '•', title: 'Bullet List', action: () => insertFormatting('<ul>\n  <li>', '</li>\n</ul>') },
    { label: '1.', title: 'Numbered List', action: () => insertFormatting('<ol>\n  <li>', '</li>\n</ol>') },
    { label: '""', title: 'Blockquote', action: () => insertFormatting('<blockquote>', '</blockquote>') },
    { label: '<>', title: 'Code', action: () => insertFormatting('<code>', '</code>') },
    { label: '🔗', title: 'Link', action: () => insertFormatting('<a href="URL">', '</a>') },
    { label: '🖼', title: 'Image', action: () => insertFormatting('<img src="URL" alt="', '" />') },
    { label: '📹', title: 'Video Embed', action: () => insertFormatting('<iframe src="', '" width="560" height="315" frameborder="0" allowfullscreen></iframe>') },
    { label: '—', title: 'Horizontal Rule', action: () => insertFormatting('<hr />', '') },
    { label: '↵', title: 'Line Break', action: () => insertFormatting('<br />', '') },
    { label: '📦', title: 'Div Container', action: () => insertFormatting('<div class="custom-block">\n', '\n</div>') },
    { label: '🎨', title: 'Span with Style', action: () => insertFormatting('<span style="color: #667eea;">', '</span>') },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Post content is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const url = editPost 
        ? `${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/${editPost.id}`
        : `${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts`;
      
      const response = await fetch(url, {
        method: editPost ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, customCss })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save post');
      }

      setContent('');
      setCustomCss('');
      if (onPostCreated) onPostCreated();
      if (onCancel) onCancel();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (isActive) => ({
    padding: '8px 16px',
    border: 'none',
    background: isActive ? '#667eea' : '#f0f0f0',
    color: isActive ? 'white' : '#333',
    cursor: 'pointer',
    borderRadius: '5px 5px 0 0',
    fontWeight: isActive ? '600' : '400',
    fontSize: '13px'
  });

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>{editPost ? 'Edit Post' : 'Create a Post'}</h3>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button style={tabStyle(editorMode === 'visual')} onClick={() => setEditorMode('visual')}>
            Visual
          </button>
          <button style={tabStyle(editorMode === 'html')} onClick={() => setEditorMode('html')}>
            HTML
          </button>
          <button style={tabStyle(editorMode === 'css')} onClick={() => setEditorMode('css')}>
            CSS
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Visual/HTML Editor */}
        {(editorMode === 'visual' || editorMode === 'html') && (
          <>
            {editorMode === 'visual' && (
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '5px', 
                padding: '10px', 
                background: '#f8f9fa', 
                borderRadius: '5px 5px 0 0',
                border: '1px solid #ddd',
                borderBottom: 'none'
              }}>
                {toolbarButtons.map((btn, i) => (
                  <button
                    key={i}
                    type="button"
                    title={btn.title}
                    onClick={btn.action}
                    style={{
                      padding: '5px 10px',
                      border: '1px solid #ddd',
                      background: 'white',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      minWidth: '32px'
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
            <textarea
              id="post-content-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={editorMode === 'visual' 
                ? "Write your post... Use the toolbar above or type HTML directly!" 
                : "<!DOCTYPE html>\n<html>\n<body>\n  <!-- Your HTML content here -->\n</body>\n</html>"}
              style={{
                width: '100%',
                minHeight: '300px',
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: editorMode === 'html' ? '5px' : '0 0 5px 5px',
                fontFamily: editorMode === 'html' ? 'monospace' : 'inherit',
                fontSize: '14px',
                lineHeight: '1.6',
                resize: 'vertical'
              }}
            />

            {/* Image Upload Box */}
            <div style={{ marginTop: '15px' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
                id="post-image-upload"
              />
              <label 
                htmlFor="post-image-upload"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px',
                  height: '80px',
                  border: '2px dashed #ddd',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: '#f8f9fa',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.background = '#f0f0ff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#ddd';
                  e.currentTarget.style.background = '#f8f9fa';
                }}
              >
                {uploading ? (
                  <span style={{ fontSize: '14px', color: '#666' }}>...</span>
                ) : (
                  <span style={{ 
                    fontSize: '32px', 
                    color: '#999',
                    lineHeight: 1
                  }}>+</span>
                )}
              </label>
              <span style={{ marginLeft: '10px', fontSize: '13px', color: '#666' }}>
                {uploading ? 'Uploading...' : 'Add image'}
              </span>
              
              {/* Show uploaded images thumbnails */}
              {uploadedImages.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '10px', 
                  marginTop: '10px' 
                }}>
                  {uploadedImages.map((img, i) => (
                    <img 
                      key={i} 
                      src={img} 
                      alt={`Uploaded ${i + 1}`}
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '5px',
                        border: '1px solid #ddd'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* CSS Editor */}
        {editorMode === 'css' && (
          <div>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
              Add custom CSS to style your post. Use class names like <code>.custom-block</code> or target elements directly.
            </p>
            <textarea
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
              placeholder={`/* Custom CSS for your post */
.custom-block {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  border-radius: 10px;
  color: white;
}

h1, h2, h3 {
  color: #667eea;
}

blockquote {
  border-left: 4px solid #667eea;
  padding-left: 20px;
  font-style: italic;
}`}
              style={{
                width: '100%',
                minHeight: '300px',
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.6',
                resize: 'vertical',
                background: '#1e1e1e',
                color: '#d4d4d4'
              }}
            />
          </div>
        )}

        {/* Preview Toggle */}
        <div style={{ marginTop: '15px' }}>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            style={{
              padding: '8px 16px',
              background: showPreview ? '#667eea' : 'transparent',
              border: '1px solid #667eea',
              color: showPreview ? 'white' : '#667eea',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div style={{ marginTop: '15px' }}>
            <h4 style={{ marginBottom: '10px' }}>Preview:</h4>
            <div style={{ 
              border: '1px solid #ddd', 
              borderRadius: '5px', 
              padding: '20px',
              background: 'white'
            }}>
              {customCss && <style>{customCss}</style>}
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? 'Saving...' : (editPost ? 'Update Post' : 'Publish Post')}
          </button>
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

// Post Display Component
const PostCard = ({ post, onEdit, onDelete, isOwner }) => {
  const [showFullPost, setShowFullPost] = useState(false);
  const profileUrl = post.username !== post.email ? `/${post.username}` : `/${post.user_id}`;
  
  // Truncate content for preview
  const isLongPost = post.content.length > 500;
  const displayContent = showFullPost || !isLongPost ? post.content : post.content.substring(0, 500) + '...';

  return (
    <div className="card" style={{ marginBottom: '20px', overflow: 'hidden' }}>
      {/* Post Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
        <Link to={profileUrl} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
          {post.profile_picture ? (
            <img 
              src={post.profile_picture} 
              alt="Profile"
              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              {(post.first_name || post.username || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p style={{ margin: 0, fontWeight: '500' }}>
              {post.first_name && post.last_name ? `${post.first_name} ${post.last_name}` : post.username}
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
              @{post.username} · {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </Link>
        
        {isOwner && (
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              onClick={() => onEdit(post)}
              style={{
                padding: '5px 10px',
                background: 'transparent',
                border: '1px solid #667eea',
                color: '#667eea',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(post.id)}
              style={{
                padding: '5px 10px',
                background: 'transparent',
                border: '1px solid #dc3545',
                color: '#dc3545',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Post Content with Custom CSS */}
      <div className="post-content-wrapper">
        {post.custom_css && <style>{`.post-${post.id} { } ${post.custom_css}`}</style>}
        <div 
          className={`post-${post.id}`}
          dangerouslySetInnerHTML={{ __html: displayContent }} 
          style={{ lineHeight: '1.6' }}
        />
      </div>

      {/* Read More / Less */}
      {isLongPost && (
        <button
          onClick={() => setShowFullPost(!showFullPost)}
          style={{
            marginTop: '15px',
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            color: '#667eea',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {showFullPost ? 'Show Less' : 'Read More'}
        </button>
      )}
    </div>
  );
};

// User Card Component (reusable)
const UserCard = ({ user }) => {
  const profileUrl = user.username !== user.email ? `/${user.username}` : `/${user.id}`;
  
  return (
    <Link to={profileUrl} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card" style={{ padding: '15px', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
           onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
           onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {user.profile_picture ? (
            <img 
              src={user.profile_picture} 
              alt="Profile"
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '20px'
            }}>
              {(user.first_name || user.username || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p style={{ margin: 0, fontWeight: '500' }}>
              {user.first_name && user.last_name 
                ? `${user.first_name} ${user.last_name}` 
                : user.username !== user.email ? user.username : 'Anonymous'}
            </p>
            {user.username !== user.email && (
              <p style={{ margin: '5px 0 0', color: '#666', fontSize: '14px' }}>@{user.username}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

// User Profile Page
const UserProfilePage = () => {
  const { identifier } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const fetchPosts = async (userId) => {
    try {
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/users/${identifier}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error('User not found');
          throw new Error('Failed to load profile');
        }
        const data = await response.json();
        setProfile(data);
        fetchPosts(data.id);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [identifier]);

  const handlePostCreated = () => {
    setShowEditor(false);
    setEditingPost(null);
    if (profile) fetchPosts(profile.id);
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setShowEditor(true);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setPosts(posts.filter(p => p.id !== postId));
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  if (loading) return <div className="container"><p>Loading profile...</p></div>;
  if (error) return <div className="container"><div className="error-message">{error}</div></div>;
  if (!profile) return <div className="container"><p>User not found</p></div>;

  const displayName = profile.first_name && profile.last_name 
    ? `${profile.first_name} ${profile.last_name}` 
    : profile.username !== profile.email ? profile.username : 'Anonymous';

  const isOwner = currentUser && currentUser.id === profile.id;

  return (
    <div className="container">
      {/* Profile Header */}
      <div className="card" style={{ padding: '30px', textAlign: 'center', marginBottom: '20px' }}>
        {profile.profile_picture ? (
          <img 
            src={profile.profile_picture} 
            alt="Profile"
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              objectFit: 'cover',
              margin: '0 auto 20px',
              display: 'block'
            }}
          />
        ) : (
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '40px',
            margin: '0 auto 20px'
          }}>
            {(profile.first_name || profile.username || '?')[0].toUpperCase()}
          </div>
        )}
        
        <h2 style={{ margin: '0 0 5px' }}>{displayName}</h2>
        
        {profile.username !== profile.email && (
          <p style={{ color: '#666', margin: '0 0 20px', fontSize: '18px' }}>@{profile.username}</p>
        )}
        
        <p style={{ color: '#888', fontSize: '14px' }}>
          Member since {new Date(profile.created_at).toLocaleDateString()}
        </p>

        {isOwner && (
          <Link to={`${BASE_PATH}/edit-profile`} className="btn btn-secondary" style={{ marginTop: '15px' }}>
            Edit Profile
          </Link>
        )}
      </div>

      {/* Create Post Button (for owner) */}
      {isOwner && !showEditor && (
        <button
          onClick={() => setShowEditor(true)}
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: '20px' }}
        >
          + Create New Post
        </button>
      )}

      {/* Post Editor */}
      {showEditor && (
        <PostEditor 
          onPostCreated={handlePostCreated}
          editPost={editingPost}
          onCancel={() => { setShowEditor(false); setEditingPost(null); }}
        />
      )}

      {/* Posts Section */}
      <div>
        <h3 style={{ marginBottom: '15px' }}>
          {isOwner ? 'Your Posts' : `Posts by ${displayName}`}
          <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal', marginLeft: '10px' }}>
            ({posts.length})
          </span>
        </h3>
        
        {posts.length > 0 ? (
          posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post}
              isOwner={isOwner}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
            />
          ))
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            {isOwner ? 'You haven\'t posted anything yet. Create your first post!' : 'No posts yet.'}
          </div>
        )}
      </div>
    </div>
  );
};

// Feed Page (all posts)
const FeedPage = () => {
  const { user: currentUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePostCreated = () => {
    setShowEditor(false);
    fetchPosts();
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setPosts(posts.filter(p => p.id !== postId));
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  if (loading) return <div className="container"><p>Loading feed...</p></div>;
  if (error) return <div className="container"><div className="error-message">{error}</div></div>;

  return (
    <div className="container">
      <h2>Feed</h2>
      
      {/* Create Post Button */}
      {currentUser && !showEditor && (
        <button
          onClick={() => setShowEditor(true)}
          className="btn btn-primary"
          style={{ width: '100%', margin: '20px 0' }}
        >
          + Create New Post
        </button>
      )}

      {/* Post Editor */}
      {showEditor && (
        <div style={{ marginTop: '20px' }}>
          <PostEditor 
            onPostCreated={handlePostCreated}
            onCancel={() => setShowEditor(false)}
          />
        </div>
      )}

      {/* Posts */}
      <div style={{ marginTop: '20px' }}>
        {posts.length > 0 ? (
          posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post}
              isOwner={currentUser && currentUser.id === post.user_id}
              onEdit={() => {}}
              onDelete={handleDeletePost}
            />
          ))
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No posts yet. Be the first to post!
          </div>
        )}
      </div>
    </div>
  );
};

// Users Page
const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <div className="container"><p>Loading users...</p></div>;
  if (error) return <div className="container"><p className="error-message">{error}</p></div>;

  return (
    <div className="container">
      <h2>Users</h2>
      <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
        {users.map(user => (
          <UserCard key={user.id} user={user} />
        ))}
        {users.length === 0 && <p>No users found.</p>}
      </div>
    </div>
  );
};

// Search Page
const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setSearched(true);
    
    try {
      const response = await fetch(`${window.location.origin}${BASE_PATH === '/' ? '' : BASE_PATH}/api/users/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Search Users</h2>
      <form onSubmit={handleSearch} style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username..."
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>
      
      {searched && (
        <div style={{ marginTop: '20px' }}>
          {results.length > 0 ? (
            <div style={{ display: 'grid', gap: '15px' }}>
              {results.map(user => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          ) : (
            <p>No users found matching "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
};

// App Component
function App() {
  return (
    <Router basename={BASE_PATH}>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/edit-profile" element={<EditProfilePage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/:identifier" element={<UserProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
