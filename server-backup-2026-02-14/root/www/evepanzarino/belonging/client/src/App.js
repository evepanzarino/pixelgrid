import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useParams, useNavigate } from 'react-router-dom';
import { login as apiLogin, register as apiRegister, getCurrentUser, getSkills, getLeaderboard, BASE_PATH } from './api';
import { ReactComponent as BelongingLogo } from './belonging.svg';
import { ReactComponent as LogoBelonging } from './logo-belonging.svg';
import comingSoonImg from './images/coming-soon.png';
import nonbianaryImg from './images/nonbianary.png';
import transgirlImg from './images/transgirl.png';
import lesbianImg from './images/lesbian.png';

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
      <Link to={`${BASE_PATH}/feed`} className="navbar-logo-link" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0px' }}>
        <LogoBelonging className="logo-belonging" />
        <BelongingLogo className="belonging-logo" />
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Link to={`${BASE_PATH}/feed`}>Feed</Link>
        <Link to={`${BASE_PATH}/users`}>Users</Link>
        <Link to={`${BASE_PATH}/tribes`}>Tribes</Link>
        <Link to={`${BASE_PATH}/search`}>Search</Link>
        <Link to={`${BASE_PATH}/skills`}>Skills</Link>
        {user ? (
          <>
            <Link to={`${BASE_PATH}/messages`}>Messages</Link>
            <span style={{ color: '#333' }}>
              {user.username === user.email ? (
                <Link to={`${BASE_PATH}/complete-profile`} style={{ color: '#e67e22' }}>Choose a username</Link>
              ) : (
                <Link to={`${BASE_PATH}/${user.username}`} style={{ color: '#333', textDecoration: 'none', fontWeight: '500' }}>
                  @{user.username}
                </Link>
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
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ username, password });
      // Clear form after successful login
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
      await register({
        username: isEmail ? username : username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
        email: isEmail ? username : null,
        password
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="container">
        <div className="home-content">
          <h2>Welcome to</h2>
          <img src="/images/belonging.svg" alt="belonging.lgbt" className="belonging-logo-image" />
          <p>
            Connect with friends & queer people around the world<br /><br />
            Find Your Tribe!<br />
            Safespace!<br />
            Create Community!<br />
            Unite in Solidarity!
          </p>
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
        </div>
      </div>
    );
  }

  return (
    <div className="homepage-split">
      <div className="homepage-left">
        {/* Safespace Section */}
        <div className="homepage-section">

          {/* Coming Soon Section */}
          <div className="homepage-section coming-soon-section">
            <img src={comingSoonImg} alt="Coming Soon" className="coming-soon-header" />
            <div className="character-grid">
              <img src={nonbianaryImg} alt="Nonbinary character" className="character-img" />
              <img src={transgirlImg} alt="Trans girl character" className="character-img" />
              <img src={lesbianImg} alt="Lesbian character" className="character-img" />
            </div>
          </div>





          <h2 className="section-title">Safespace</h2>
          <p className="section-desc">Connect with friends & queer people around the world</p>
        </div>

        {/* Find Your Tribe */}
        <div className="homepage-section">
          <h3 className="section-subtitle">Find Your Tribe!</h3>
        </div>

        {/* Create Community */}
        <div className="homepage-section">
          <h3 className="section-subtitle">Create Community!</h3>
        </div>

        {/* Unite in Solidarity */}
        <div className="homepage-section">
          <h3 className="section-subtitle">Unite in Solidarity!</h3>
        </div>



        {/* Marketplace Section */}
        <div className="homepage-section marketplace-section">
          <h2 className="section-title">Marketplace</h2>
          <p className="section-desc">A closed queer market to support LGBTQIA+ Communities, Businesses, & Creatives.</p>
          <div className="marketplace-search">
            <input type="text" placeholder="Search" className="search-input" />
          </div>
        </div>
      </div>

      <div className="homepage-login">
        <div className="login-tabs">
          <button
            className={`login-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setError(''); }}
          >
            Login
          </button>
          <button
            className={`login-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); setError(''); }}
          >
            Register
          </button>
        </div>
        <div className="login-form-container">
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={activeTab === 'register' ? 6 : undefined}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? (activeTab === 'login' ? 'Signing in...' : 'Registering...') : (activeTab === 'login' ? 'Sign in' : 'Register')}
            </button>
            <Link to={`${BASE_PATH}/tribes/create`} className="create-tribe-link">Create a Tribe!</Link>
          </form>
        </div>
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
  const [discordStatus, setDiscordStatus] = useState({ connected: false, discord_username: null, discord_avatar: null });
  const [discordLoading, setDiscordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setUsername(user.username && !user.username.includes('@') ? user.username : '');
      setEmail(user.email || '');
      setProfilePicture(user.profile_picture || '');

      // Check Discord connection status
      fetchDiscordStatus();
    }
  }, [user]);

  const fetchDiscordStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/auth/discord/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDiscordStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch Discord status:', err);
    }
  };

  const handleDiscordConnect = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in first');
        return;
      }

      // Make a request to get the Discord auth URL
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/auth/discord`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      console.error('Discord connect error:', error);
      alert('Failed to connect Discord');
    }
  };

  const handleDiscordDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Discord account?')) return;

    setDiscordLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/auth/discord`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setDiscordStatus({ connected: false, discord_username: null, discord_avatar: null });
        setMessage('Discord account disconnected');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to disconnect Discord');
      }
    } catch (err) {
      setError('Failed to disconnect Discord');
    } finally {
      setDiscordLoading(false);
    }
  };

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
          <button style={tabStyle(activeTab === 'discord')} onClick={() => setActiveTab('discord')}>
            Discord
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

        {activeTab === 'discord' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ marginBottom: '20px' }}>
              <svg style={{ width: '64px', height: '64px', marginBottom: '15px' }} viewBox="0 0 127.14 96.36" fill={discordStatus.connected ? '#5865F2' : '#888'}>
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
              </svg>
              <h3 style={{ marginBottom: '10px', color: discordStatus.connected ? '#5865F2' : 'inherit' }}>
                {discordStatus.connected ? 'Discord Connected' : 'Connect Discord'}
              </h3>
            </div>

            {discordStatus.connected ? (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '20px',
                  padding: '15px',
                  background: '#f5f5f5',
                  borderRadius: '10px'
                }}>
                  {discordStatus.discord_avatar ? (
                    <img
                      src={`https://cdn.discordapp.com/avatars/${discordStatus.discord_id}/${discordStatus.discord_avatar}.png?size=64`}
                      alt="Discord Avatar"
                      style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                    />
                  ) : (
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#5865F2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {(discordStatus.discord_username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', color: '#333' }}>{discordStatus.discord_username}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>Connected</div>
                  </div>
                </div>
                <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                  Your posts will sync to the belonging.lgbt Discord server, and your Discord messages (with the "connected" role) will appear on the website.
                </p>
                <button
                  onClick={handleDiscordDisconnect}
                  disabled={discordLoading}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {discordLoading ? 'Disconnecting...' : 'Disconnect Discord'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                  Connect your Discord account to sync your posts with the belonging.lgbt Discord server. Your posts will appear in Discord, and your Discord messages will appear on the website!
                </p>
                <button
                  onClick={handleDiscordConnect}
                  style={{
                    background: '#5865F2',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 127.14 96.36" fill="white">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                  </svg>
                  Connect Discord
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Post Editor Component (WordPress-like with visual and code editor)
const PostEditor = ({ onPostCreated, editPost, onCancel }) => {
  const [tagline, setTagline] = useState(editPost?.tagline || '');
  const [content, setContent] = useState(editPost?.content || '');
  const [customCss, setCustomCss] = useState(editPost?.custom_css || '');
  const [editorMode, setEditorMode] = useState('visual'); // 'visual', 'html', 'css'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedTribes, setSelectedTribes] = useState([]);
  const [tribeQuery, setTribeQuery] = useState('');
  const [tribeResults, setTribeResults] = useState([]);
  const [showTribeDropdown, setShowTribeDropdown] = useState(false);
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

  // Handle tribe search
  useEffect(() => {
    const searchTribes = async () => {
      if (tribeQuery.length < 1) {
        setTribeResults([]);
        setShowTribeDropdown(false);
        return;
      }

      try {
        const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/tribes/search/autocomplete?q=${tribeQuery}`);
        if (response.ok) {
          const data = await response.json();
          setTribeResults(data);
          setShowTribeDropdown(data.length > 0);
        }
      } catch (err) {
        console.error('Tribe search failed:', err);
      }
    };

    const timeoutId = setTimeout(searchTribes, 300);
    return () => clearTimeout(timeoutId);
  }, [tribeQuery]);

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Detect if user is typing a tribe tag (e.g. #tribe)
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newContent.substring(0, cursorPosition);
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');

    if (lastHashIndex !== -1 && !textBeforeCursor.substring(lastHashIndex).includes(' ')) {
      const query = textBeforeCursor.substring(lastHashIndex + 1);
      setTribeQuery(query);
    } else {
      setTribeQuery('');
      setShowTribeDropdown(false);
    }
  };

  const addTribe = (tribe) => {
    if (!selectedTribes.find(t => t.id === tribe.id)) {
      setSelectedTribes([...selectedTribes, tribe]);
    }

    // Remove the #tag from content
    const textarea = document.getElementById('post-content-editor');
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');

    const newContent = content.substring(0, lastHashIndex) + content.substring(cursorPosition);
    setContent(newContent);
    setTribeQuery('');
    setShowTribeDropdown(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lastHashIndex, lastHashIndex);
    }, 0);
  };

  const removeTribe = (tribeId) => {
    setSelectedTribes(selectedTribes.filter(t => t.id !== tribeId));
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
    if (!tagline.trim()) {
      setError('Post tagline/title is required');
      return;
    }
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
        body: JSON.stringify({
          tagline,
          content,
          customCss,
          tribeIds: selectedTribes.map(t => t.id)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save post');
      }

      setTagline('');
      setContent('');
      setCustomCss('');
      setSelectedTribes([]);
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
          <button type="button" style={tabStyle(editorMode === 'visual')} onClick={() => setEditorMode('visual')}>
            Visual
          </button>
          <button type="button" style={tabStyle(editorMode === 'html')} onClick={() => setEditorMode('html')}>
            HTML
          </button>
          <button type="button" style={tabStyle(editorMode === 'css')} onClick={() => setEditorMode('css')}>
            CSS
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Selected Tribes Tags */}
        {selectedTribes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
            {selectedTribes.map(tribe => (
              <div
                key={tribe.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: tribe.color || '#667eea',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '15px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                <span>{tribe.icon} {tribe.name}</span>
                <button
                  type="button"
                  onClick={() => removeTribe(tribe.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0 2px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tagline Input - Post Title */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
            Post Title / Tagline <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="What's on your mind? (Tag tribes with #)"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '5px',
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
            required
          />
        </div>

        {/* Tribe Autocomplete Dropdown */}
        {showTribeDropdown && (
          <div style={{
            position: 'absolute',
            zIndex: 1000,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '5px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            width: '300px',
            marginTop: '-10px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {tribeResults.map(tribe => (
              <div
                key={tribe.id}
                onClick={() => addTribe(tribe)}
                style={{
                  padding: '10px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                className="tribe-suggestion"
              >
                <span>{tribe.icon}</span>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{tribe.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>#{tribe.tag}</div>
                </div>
              </div>
            ))}
          </div>
        )}

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
              onChange={handleContentChange}
              placeholder={editorMode === 'visual'
                ? "Write your post... Tag tribes with #!"
                : "HTML Mode: <p>Your HTML content</p>"}
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
              required
            />

            {/* Image Upload */}
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
                  background: '#f8f9fa'
                }}
              >
                {uploading ? '...' : '+'}
              </label>
              <span style={{ marginLeft: '10px', fontSize: '13px', color: '#666' }}>
                {uploading ? 'Uploading...' : 'Add image'}
              </span>
            </div>
          </>
        )}

        {/* CSS Editor */}
        {editorMode === 'css' && (
          <div>
            <textarea
              value={customCss}
              onChange={(e) => setCustomCss(e.target.value)}
              placeholder="/* Custom CSS */"
              style={{
                width: '100%',
                minHeight: '300px',
                padding: '15px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontFamily: 'monospace',
                fontSize: '14px',
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
              cursor: 'pointer'
            }}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div style={{ marginTop: '15px' }}>
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
            disabled={loading || !tagline.trim() || !content.trim()}
            style={{ flex: 1 }}
          >
            {loading ? 'Saving...' : (editPost ? 'Update Post' : 'Publish Post')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// Post Display Component
const PostCard = ({ post, onEdit, onDelete, isOwner }) => {
  const { user: currentUser } = useAuth();
  const [showComments, setShowComments] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const replyInputRef = useRef(null);
  const profileUrl = post.username !== post.email ? `/${post.username}` : `/${post.user_id}`;


  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/${post.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Auto-fetch comments on component mount
  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const handleToggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });

      if (response.ok) {
        const data = await response.json();
        setComments([...comments, data.comment]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitReply = async (e, parentCommentId) => {
    e.preventDefault();
    if (!replyText.trim() || submittingReply) return;

    setSubmittingReply(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: replyText, parentCommentId })
      });

      if (response.ok) {
        const data = await response.json();
        // Update comments to include the new reply
        const updatedComments = comments.map(c => {
          if (c.id === parentCommentId) {
            return { ...c, replies: [...(c.replies || []), data.comment] };
          }
          return c;
        });
        setComments(updatedComments);
        setReplyText('');
        setReplyingToCommentId(null);
      }
    } catch (err) {
      console.error('Failed to submit reply:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

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

      {/* Tribe Tags */}
      {post.tribes && post.tribes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px', marginTop: '5px' }}>
          {post.tribes.map(tribe => (
            <Link
              key={tribe.id}
              to={`${BASE_PATH}/tribe/${tribe.tag}`}
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: tribe.color ? `${tribe.color}15` : '#667eea15',
                color: tribe.color || '#667eea',
                textDecoration: 'none',
                fontWeight: '600',
                border: `1px solid ${tribe.color || '#667eea'}30`
              }}
            >
              #{tribe.tag}
            </Link>
          ))}
        </div>
      )}

      {/* Post Tagline */}
      {post.tagline && (
        <h3 style={{ margin: '15px 0 10px 0', fontSize: '18px', color: '#333' }}>
          {post.tagline}
        </h3>
      )}

      {/* Post Content with Custom CSS */}
      <div className="post-content-wrapper">
        {post.custom_css && <style>{`.post-${post.id} { } ${post.custom_css}`}</style>}
        <div
          className={`post-${post.id}`}
          dangerouslySetInnerHTML={{ __html: post.content }}
          style={{ lineHeight: '1.6' }}
        />
      </div>


      {/* Post Actions */}
      <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <button
          onClick={handleToggleComments}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#667eea',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          💬 {post.comment_count || 0} Comments {showComments ? '▲' : '▼'}
        </button>
        <button
          onClick={() => {
            const postUrl = `${window.location.origin}${BASE_PATH}/post/${post.id}`;
            if (navigator.share) {
              navigator.share({
                title: `Post by @${post.username}`,
                text: post.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...',
                url: postUrl
              }).catch(() => { });
            } else {
              navigator.clipboard.writeText(postUrl);
              alert('Link copied to clipboard!');
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#667eea',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          🔗 Share
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div style={{ marginTop: '15px' }}>
          {loadingComments ? (
            <p style={{ color: '#888', fontSize: '14px' }}>Loading comments...</p>
          ) : (
            <>
              {/* Nested Comment Renderer */}
              {(() => {
                const renderComments = (commentsList, level = 0) => (
                  <div style={{ marginBottom: '15px' }}>
                    {commentsList.length > 0 ? (
                      commentsList.map(comment => (
                        <div key={comment.id}>
                          <div className="comment-item" style={{
                            padding: '12px',
                            background: '#f8f9fa',
                            borderRadius: '8px',
                            marginBottom: '10px',
                            marginLeft: `${level * 20}px`,
                            borderLeft: level > 0 ? '3px solid #667eea' : 'none'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <Link
                                to={`/${comment.username}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  textDecoration: 'none',
                                  color: 'inherit'
                                }}
                              >
                                {comment.profile_picture ? (
                                  <img
                                    src={comment.profile_picture}
                                    alt=""
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}>
                                    {comment.username[0].toUpperCase()}
                                  </div>
                                )}
                                <span style={{ fontWeight: '500', fontSize: '14px' }}>@{comment.username}</span>
                              </Link>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#667eea',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  ↳ Reply
                                </button>
                                {currentUser && (currentUser.id === comment.user_id || currentUser.role === 'admin') && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#dc3545',
                                      cursor: 'pointer',
                                      fontSize: '12px'
                                    }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                            <p style={{ margin: '8px 0 5px 0', fontSize: '14px', color: '#333' }}>{comment.content}</p>
                            <p style={{ margin: '0', fontSize: '11px', color: '#888' }}>
                              {new Date(comment.created_at).toLocaleString()}
                            </p>

                            {/* Reply Form */}
                            {replyingToCommentId === comment.id && currentUser && (
                              <form onSubmit={(e) => handleSubmitReply(e, comment.id)} style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                                <input
                                  type="text"
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write a reply..."
                                  style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: '15px',
                                    fontSize: '13px'
                                  }}
                                />
                                <button
                                  type="submit"
                                  disabled={submittingReply}
                                  style={{
                                    padding: '8px 16px',
                                    background: '#667eea',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '15px',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                  }}
                                >
                                  {submittingReply ? '...' : 'Reply'}
                                </button>
                              </form>
                            )}
                          </div>

                          {/* Render nested replies */}
                          {comment.replies && comment.replies.length > 0 && renderComments(comment.replies, level + 1)}
                        </div>
                      ))
                    ) : (
                      level === 0 && <p style={{ color: '#888', fontSize: '14px' }}>No comments yet. Be the first!</p>
                    )}
                  </div>
                );
                return renderComments(comments);
              })()}

              {/* Add Root Comment Form */}
              {currentUser && !replyingToCommentId ? (
                <form onSubmit={handleSubmitComment} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    style={{
                      flex: 1,
                      padding: '10px 15px',
                      border: '1px solid #ddd',
                      borderRadius: '20px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    style={{
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: submittingComment ? 'not-allowed' : 'pointer',
                      opacity: submittingComment || !newComment.trim() ? 0.6 : 1
                    }}
                  >
                    {submittingComment ? '...' : 'Post'}
                  </button>
                </form>
              ) : !currentUser ? (
                <p style={{ color: '#888', fontSize: '14px' }}>
                  <Link to={`${BASE_PATH}/login`} style={{ color: '#667eea' }}>Log in</Link> to comment
                </p>
              ) : null}
            </>
          )}
        </div>
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
  const [editingPost, setEditingPost] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followingCount: 0, followersCount: 0 });
  const navigate = React.useCallback(() => { }, []);

  const startConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/messages/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: profile.id })
      });

      if (response.ok) {
        window.location.href = `${BASE_PATH}/messages`;
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

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
    const fetchProfileData = async () => {
      try {
        const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/users/${identifier}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error('User not found');
          throw new Error('Failed to load profile');
        }
        const data = await response.json();
        setProfile(data);
        fetchPosts(data.id);
        fetchFollowStatus(data.id);
        fetchFollowCounts(data.id);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchFollowStatus = async (userId) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/users/${userId}/follow-status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setFollowing(data.following);
        }
      } catch (err) {
        console.error('Failed to fetch follow status:', err);
      }
    };

    const fetchFollowCounts = async (userId) => {
      try {
        const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/users/${userId}/follow-counts`);
        if (response.ok) {
          const data = await response.json();
          setFollowCounts(data);
        }
      } catch (err) {
        console.error('Failed to fetch follow counts:', err);
      }
    };

    fetchProfileData();
  }, [identifier]);

  const handleFollow = async () => {
    if (!currentUser) {
      window.location.href = `${BASE_PATH}/login`;
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/users/${profile.id}/follow`, {
        method: following ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setFollowing(!following);
        setFollowCounts(prev => ({
          ...prev,
          followersCount: prev.followersCount + (following ? -1 : 1)
        }));
      }
    } catch (err) {
      console.error('Follow toggle failed:', err);
    }
  };

  const handlePostCreated = () => {
    setEditingPost(null);
    setShowEditor(false);
    if (profile) fetchPosts(profile.id);
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <p style={{ color: '#666', margin: '0 0 10px', fontSize: '18px' }}>@{profile.username}</p>
        )}

        {/* Follow Counts */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '15px 0' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{followCounts.followersCount || 0}</div>
            <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Followers</div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{followCounts.followingCount || 0}</div>
            <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Following</div>
          </div>
        </div>

        {/* Tribe Tags */}
        <TribeTags userId={profile.id} username={profile.username !== profile.email ? profile.username : null} />

        <p style={{ color: '#888', fontSize: '14px', marginTop: '15px' }}>
          Member since {new Date(profile.created_at).toLocaleDateString()}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
          {isOwner ? (
            <Link to={`${BASE_PATH}/edit-profile`} className="btn btn-secondary">
              Edit Profile
            </Link>
          ) : (
            <>
              {currentUser && (
                <button
                  onClick={handleFollow}
                  className={`btn ${following ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {following ? '✓ Following' : '+ Follow'}
                </button>
              )}
              {currentUser && (
                <button onClick={startConversation} className="btn btn-secondary">
                  💬 Message
                </button>
              )}
            </>
          )}
        </div>
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
  const [activeTab, setActiveTab] = useState('global'); // 'global' or 'personal'
  const [editingPost, setEditingPost] = useState(null);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts?tab=${activeTab}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
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
  }, [activeTab]);

  const handlePostCreated = () => {
    setEditingPost(null);
    fetchPosts();
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

      {/* Post Editor */}
      {currentUser && (
        <div style={{ marginTop: '20px' }}>
          <PostEditor
            onPostCreated={handlePostCreated}
            editPost={editingPost}
            onCancel={() => { setEditingPost(null); }}
          />
        </div>
      )}

      {/* Feed Tabs */}
      {currentUser && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '30px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <button
            onClick={() => setActiveTab('global')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'global' ? '#667eea' : 'transparent',
              color: activeTab === 'global' ? 'white' : '#666',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: activeTab === 'global' ? 'bold' : 'normal'
            }}
          >
            Global Feed
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'personal' ? '#667eea' : 'transparent',
              color: activeTab === 'personal' ? 'white' : '#666',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: activeTab === 'personal' ? 'bold' : 'normal'
            }}
          >
            Personal Feed
          </button>
        </div>
      )}

      {/* Posts */}
      <div style={{ marginTop: '20px' }}>
        {posts.length > 0 ? (
          posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              isOwner={currentUser && (currentUser.id === post.user_id || currentUser.role === 'admin')}
              onEdit={handleEditPost}
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

// Skills Page (RuneScape-style)
const SkillsPage = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user) {
          const skillsRes = await getSkills(user.id);
          setSkills(skillsRes.data);
        }
        const leaderboardRes = await getLeaderboard(selectedSkill);
        setLeaderboard(leaderboardRes.data);
      } catch (error) {
        console.error('Error fetching skills:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, selectedSkill]);

  const skillColors = {
    posting: '#e74c3c',
    messaging: '#3498db',
    commenting: '#2ecc71'
  };

  const skillIcons = {
    posting: '📝',
    messaging: '💬',
    commenting: '💭'
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '50px' }}>
          <p>Loading skills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="skills-page">
      <div className="skills-container">
        <h2 className="skills-title">Skills</h2>

        {user && skills ? (
          <div className="skills-panel">
            <div className="total-level">
              <span className="total-label">Total Level</span>
              <span className="total-value">{skills.totalLevel}</span>
              <span className="total-xp">{skills.totalXp.toLocaleString()} XP</span>
            </div>

            <div className="skills-grid">
              {Object.entries(skills.skills).map(([key, skill]) => (
                <div
                  key={key}
                  className={`skill-card ${selectedSkill === key ? 'selected' : ''}`}
                  onClick={() => setSelectedSkill(selectedSkill === key ? null : key)}
                  style={{ '--skill-color': skillColors[key] }}
                >
                  <div className="skill-icon">{skillIcons[key]}</div>
                  <div className="skill-info">
                    <div className="skill-name">{skill.name}</div>
                    <div className="skill-level">Level {skill.level}</div>
                  </div>
                  <div className="skill-xp-bar">
                    <div
                      className="skill-xp-fill"
                      style={{ width: `${skill.progress}%` }}
                    />
                  </div>
                  <div className="skill-xp-text">
                    {skill.xp.toLocaleString()} XP
                    {skill.level < 99 && (
                      <span className="xp-to-next"> ({skill.xpToNextLevel.toLocaleString()} to next)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="skills-panel">
            <p style={{ textAlign: 'center', color: '#888' }}>
              <Link to={`${BASE_PATH}/login`}>Log in</Link> to track your skills!
            </p>
          </div>
        )}

        <div className="leaderboard-panel">
          <h3 className="leaderboard-title">
            {selectedSkill ? `${skills?.skills[selectedSkill]?.name || selectedSkill} Leaderboard` : 'Total Level Leaderboard'}
          </h3>
          <div className="leaderboard-tabs">
            <button
              className={`lb-tab ${!selectedSkill ? 'active' : ''}`}
              onClick={() => setSelectedSkill(null)}
            >
              Total
            </button>
            <button
              className={`lb-tab ${selectedSkill === 'posting' ? 'active' : ''}`}
              onClick={() => setSelectedSkill('posting')}
            >
              📝 Posting
            </button>
            <button
              className={`lb-tab ${selectedSkill === 'messaging' ? 'active' : ''}`}
              onClick={() => setSelectedSkill('messaging')}
            >
              💬 Messaging
            </button>
            <button
              className={`lb-tab ${selectedSkill === 'commenting' ? 'active' : ''}`}
              onClick={() => setSelectedSkill('commenting')}
            >
              💭 Commenting
            </button>
          </div>
          <div className="leaderboard-list">
            {leaderboard.length > 0 ? (
              leaderboard.map((entry) => (
                <div key={entry.userId} className={`lb-entry ${user && entry.userId === user.id ? 'current-user' : ''}`}>
                  <span className={`lb-rank rank-${entry.rank}`}>#{entry.rank}</span>
                  <Link to={`${BASE_PATH}/${entry.username}`} className="lb-user">
                    {entry.profilePicture && (
                      <img src={entry.profilePicture} alt="" className="lb-avatar" />
                    )}
                    <span className="lb-username">@{entry.username}</span>
                  </Link>
                  <span className="lb-level">Lv. {entry.level}</span>
                  <span className="lb-xp">{entry.xp.toLocaleString()} XP</span>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                No entries yet. Start posting to earn XP!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Single Post Page
const SinglePostPage = () => {
  const { postId } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const fetchPost = async () => {
    try {
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/${postId}`);
      if (!response.ok) {
        throw new Error('Post not found');
      }
      const data = await response.json();
      setPost(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const handlePostCreated = () => {
    setShowEditor(false);
    setEditingPost(null);
    fetchPost();
  };

  const handleEditPost = (postToEdit) => {
    setEditingPost(postToEdit);
    setShowEditor(true);
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        window.location.href = `${BASE_PATH}/feed`;
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '40px', textAlign: 'center' }}>
        <p>Loading post...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container" style={{ paddingTop: '40px', textAlign: 'center' }}>
        <h2>Post not found</h2>
        <Link to={`${BASE_PATH}/feed`} className="btn btn-primary" style={{ marginTop: '20px' }}>
          Back to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '40px', maxWidth: '700px' }}>
      <Link to={`${BASE_PATH}/feed`} style={{ color: '#667eea', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Feed
      </Link>
      {showEditor && (
        <div style={{ marginBottom: '20px' }}>
          <PostEditor
            onPostCreated={handlePostCreated}
            editPost={editingPost}
            onCancel={() => { setShowEditor(false); setEditingPost(null); }}
          />
        </div>
      )}
      <PostCard
        post={post}
        isOwner={user && (user.id === post.user_id || user.role === 'admin')}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
      />
    </div>
  );
};

// Tribes List Page
const TribesPage = () => {
  const { user } = useAuth();
  const [tribes, setTribes] = useState([]);
  const [myTribes, setMyTribes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('discover');

  useEffect(() => {
    const fetchTribes = async () => {
      try {
        const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/tribes`);
        const data = await response.json();
        setTribes(data);

        if (user) {
          const token = localStorage.getItem('token');
          const myRes = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/my-tribes`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const myData = await myRes.json();
          setMyTribes(myData);
        }
      } catch (err) {
        console.error('Failed to fetch tribes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTribes();
  }, [user]);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '40px', textAlign: 'center' }}>
        <p>Loading tribes...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>🏳️‍🌈 Tribes</h1>
        {user && (
          <Link to={`${BASE_PATH}/tribes/create`} className="btn btn-primary">
            + Create a Tribe
          </Link>
        )}
      </div>

      {user && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('discover')}
            className={activeTab === 'discover' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('my-tribes')}
            className={activeTab === 'my-tribes' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            My Tribes ({myTribes.length})
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {(activeTab === 'discover' ? tribes : myTribes).map(tribe => (
          <Link
            key={tribe.id}
            to={`${BASE_PATH}/tribe/${tribe.tag}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="card tribe-card" style={{
              padding: '20px',
              borderLeft: `4px solid ${tribe.color || '#667eea'}`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span style={{ fontSize: '32px' }}>{tribe.icon || '🏳️‍🌈'}</span>
                <div>
                  <h3 style={{ margin: 0 }}>{tribe.name}</h3>
                  <span className="tribe-tag" style={{
                    background: tribe.color,
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '12px'
                  }}>
                    #{tribe.tag}
                  </span>
                </div>
              </div>
              <p style={{ color: '#666', fontSize: '14px', margin: '10px 0' }}>
                {tribe.description || 'No description'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#888' }}>
                <span>👥 {tribe.member_count} members</span>
                {activeTab === 'my-tribes' && (
                  <span style={{
                    background: tribe.role === 'owner' ? '#f39c12' : tribe.role === 'admin' ? '#e74c3c' : '#3498db',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    textTransform: 'capitalize'
                  }}>
                    {tribe.role}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {(activeTab === 'discover' ? tribes : myTribes).length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          {activeTab === 'discover'
            ? 'No tribes yet. Be the first to create one!'
            : 'You haven\'t joined any tribes yet.'}
        </div>
      )}
    </div>
  );
};

// Create Tribe Page
const CreateTribePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#667eea');
  const [icon, setIcon] = useState('🏳️‍🌈');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const icons = ['🏳️‍🌈', '🏳️‍⚧️', '🌈', '✨', '💜', '💖', '🦋', '🌸', '🔥', '⭐', '🌙', '🌻', '🎭', '🎨', '🎮', '📚', '🎵', '💬', '🤝', '🦄'];

  if (!user) {
    return <Navigate to={`${BASE_PATH}/login`} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/tribes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, tag, description, color, icon })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tribe');
      }

      navigate(`${BASE_PATH}/tribe/${data.tribe.tag}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '40px', maxWidth: '600px' }}>
      <h1>Create a Tribe</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Tribes are communities where you can share content, make announcements, and connect with like-minded people.
      </p>

      {error && <div className="error" style={{ marginBottom: '20px' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Tribe Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Trans Gamers United"
            required
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label>Tag *</label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666'
            }}>#</span>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
              placeholder="transgamers"
              required
              maxLength={20}
              style={{ paddingLeft: '28px' }}
            />
          </div>
          <small style={{ color: '#888' }}>2-20 characters, letters and numbers only. This will be your tribe's unique identifier.</small>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this tribe about?"
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="form-group">
          <label>Icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {icons.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                style={{
                  fontSize: '24px',
                  padding: '8px',
                  background: icon === emoji ? color : '#f0f0f0',
                  border: icon === emoji ? `2px solid ${color}` : '2px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Color</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '60px', height: '40px', border: 'none', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', gap: '5px' }}>
              {['#667eea', '#e91e63', '#00bcd4', '#4caf50', '#ff9800', '#9c27b0', '#f44336'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '30px',
                    height: '30px',
                    background: c,
                    border: color === c ? '3px solid #333' : 'none',
                    borderRadius: '50%',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '20px', marginBottom: '20px', borderLeft: `4px solid ${color}` }}>
          <p style={{ margin: '0 0 10px', color: '#666', fontSize: '14px' }}>Preview:</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>{icon}</span>
            <div>
              <h3 style={{ margin: 0 }}>{name || 'Tribe Name'}</h3>
              <span style={{
                background: color,
                color: 'white',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '12px'
              }}>
                #{tag || 'tag'}
              </span>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Creating...' : 'Create Tribe'}
        </button>
      </form>
    </div>
  );
};

// Single Tribe Page
const TribePage = () => {
  const { tag } = useParams();
  const { user } = useAuth();
  const [tribe, setTribe] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPost, setNewPost] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  const fetchTribeData = async () => {
    try {
      const [tribeRes, membersRes, postsRes] = await Promise.all([
        fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/tribes/${tag}`),
        fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/tribes/${tag}/members`),
        fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/tribes/${tag}/posts`)
      ]);

      if (!tribeRes.ok) {
        throw new Error('Tribe not found');
      }

      const tribeData = await tribeRes.json();
      const membersData = await membersRes.json();
      const postsData = await postsRes.json();

      setTribe(tribeData);
      setMembers(membersData);
      setPosts(postsData);

      if (user) {
        const userMembership = membersData.find(m => m.user_id === user.id);
        setMembership(userMembership || null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTribeData();
  }, [tag, user]);

  const handleJoin = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/tribes/${tag}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchTribeData();
      } else {
        const data = await response.json();
        alert(data.error);
      }
    } catch (err) {
      console.error('Failed to join:', err);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this tribe?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/tribes/${tag}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMembership(null);
        fetchTribeData();
      } else {
        const data = await response.json();
        alert(data.error);
      }
    } catch (err) {
      console.error('Failed to leave:', err);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setPosting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/tribes/${tag}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newPost, isAnnouncement })
      });

      if (response.ok) {
        setNewPost('');
        setIsAnnouncement(false);
        fetchTribeData();
      }
    } catch (err) {
      console.error('Failed to post:', err);
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/tribes/${tag}/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchTribeData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '40px', textAlign: 'center' }}>
        <p>Loading tribe...</p>
      </div>
    );
  }

  if (error || !tribe) {
    return (
      <div className="container" style={{ paddingTop: '40px', textAlign: 'center' }}>
        <h2>Tribe not found</h2>
        <Link to={`${BASE_PATH}/tribes`} className="btn btn-primary" style={{ marginTop: '20px' }}>
          Browse Tribes
        </Link>
      </div>
    );
  }

  const canPost = membership !== null;
  const canAnnounce = membership && ['owner', 'admin', 'moderator'].includes(membership.role);

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      {/* Tribe Header */}
      <div className="card" style={{
        padding: '30px',
        marginBottom: '30px',
        borderTop: `4px solid ${tribe.color}`,
        background: `linear-gradient(135deg, ${tribe.color}11 0%, transparent 100%)`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '64px' }}>{tribe.icon || '🏳️‍🌈'}</span>
            <div>
              <h1 style={{ margin: '0 0 5px' }}>{tribe.name}</h1>
              <span className="tribe-tag" style={{
                background: tribe.color,
                color: 'white',
                padding: '4px 12px',
                borderRadius: '15px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                #{tribe.tag}
              </span>
              <p style={{ margin: '10px 0 0', color: '#666' }}>{tribe.description}</p>
              <p style={{ margin: '10px 0 0', fontSize: '14px', color: '#888' }}>
                👥 {tribe.member_count} members · Created by @{tribe.owner_username}
              </p>
            </div>
          </div>

          <div>
            {user && !membership && (
              <button onClick={handleJoin} className="btn btn-primary">
                Join Tribe
              </button>
            )}
            {membership && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{
                  background: membership.role === 'owner' ? '#f39c12' : membership.role === 'admin' ? '#e74c3c' : '#3498db',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '15px',
                  fontSize: '12px',
                  textTransform: 'capitalize'
                }}>
                  {membership.role}
                </span>
                {membership.role !== 'owner' && (
                  <button onClick={handleLeave} className="btn btn-secondary">
                    Leave
                  </button>
                )}
              </div>
            )}
            {!user && (
              <Link to={`${BASE_PATH}/login`} className="btn btn-primary">
                Log in to Join
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('posts')}
          className={activeTab === 'posts' ? 'btn btn-primary' : 'btn btn-secondary'}
        >
          📝 Posts
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={activeTab === 'members' ? 'btn btn-primary' : 'btn btn-secondary'}
        >
          👥 Members ({members.length})
        </button>
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div>
          {/* New Post Form */}
          {canPost && (
            <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
              <form onSubmit={handlePost}>
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share something with the tribe..."
                  rows={3}
                  style={{ width: '100%', marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {canAnnounce && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isAnnouncement}
                        onChange={(e) => setIsAnnouncement(e.target.checked)}
                      />
                      📢 Post as announcement
                    </label>
                  )}
                  {!canAnnounce && <div />}
                  <button type="submit" className="btn btn-primary" disabled={posting || !newPost.trim()}>
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Posts List */}
          {posts.length > 0 ? (
            posts.map(post => (
              <div key={post.id} className="card" style={{
                padding: '20px',
                marginBottom: '15px',
                borderLeft: post.is_announcement ? `4px solid ${tribe.color}` : 'none',
                background: post.is_announcement ? `${tribe.color}08` : 'white'
              }}>
                {post.is_announcement && (
                  <div style={{
                    color: tribe.color,
                    fontWeight: '600',
                    fontSize: '12px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    📢 ANNOUNCEMENT
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Link to={`/${post.username}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}>
                    {post.profile_picture ? (
                      <img src={post.profile_picture} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${tribe.color} 0%, #764ba2 100%)`,
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
                      <span style={{ fontWeight: '500' }}>
                        {post.first_name && post.last_name ? `${post.first_name} ${post.last_name}` : `@${post.username}`}
                      </span>
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        background: post.poster_role === 'owner' ? '#f39c12' : post.poster_role === 'admin' ? '#e74c3c' : post.poster_role === 'moderator' ? '#9b59b6' : '#3498db',
                        color: 'white',
                        textTransform: 'capitalize'
                      }}>
                        {post.poster_role}
                      </span>
                      <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
                        {new Date(post.created_at).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                  {user && (user.id === post.user_id || canAnnounce) && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      style={{ background: 'transparent', border: 'none', color: '#dc3545', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <p style={{ marginTop: '15px', lineHeight: '1.6' }}>{post.content}</p>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No posts yet. {canPost ? 'Be the first to share something!' : 'Join the tribe to start posting!'}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
          {members.map(member => (
            <Link key={member.id} to={`/${member.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {member.profile_picture ? (
                  <img src={member.profile_picture} alt="" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${tribe.color} 0%, #764ba2 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {(member.first_name || member.username)[0].toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: '500' }}>
                    {member.first_name && member.last_name ? `${member.first_name} ${member.last_name}` : `@${member.username}`}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#888' }}>@{member.username}</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      background: member.role === 'owner' ? '#f39c12' : member.role === 'admin' ? '#e74c3c' : member.role === 'moderator' ? '#9b59b6' : '#3498db',
                      color: 'white',
                      textTransform: 'capitalize'
                    }}>
                      {member.role}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// Tribe Tag Component (for profile display)
const TribeTags = ({ userId, username }) => {
  const [tribes, setTribes] = useState([]);

  useEffect(() => {
    const fetchTribes = async () => {
      try {
        const identifier = username || userId;
        const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/users/${identifier}/tribes`);
        if (response.ok) {
          const data = await response.json();
          setTribes(data);
        }
      } catch (err) {
        console.error('Failed to fetch tribes:', err);
      }
    };
    fetchTribes();
  }, [userId, username]);

  if (tribes.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
      {tribes.map(tribe => (
        <Link
          key={tribe.id}
          to={`${BASE_PATH}/tribe/${tribe.tag}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            background: tribe.color,
            color: 'white',
            borderRadius: '12px',
            fontSize: '12px',
            textDecoration: 'none',
            transition: 'opacity 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          <span>{tribe.icon || '🏳️‍🌈'}</span>
          <span>#{tribe.tag}</span>
          {tribe.role === 'owner' && <span>👑</span>}
        </Link>
      ))}
    </div>
  );
};

// Messages Page
const MessagesPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = React.useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/messages/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setParticipants(data.participants);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      // Poll for new messages every 3 seconds
      const interval = setInterval(() => fetchMessages(selectedConversation), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !selectedConversation) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/messages/conversations/${selectedConversation}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.message]);
        setNewMessage('');
        fetchConversations(); // Update conversation list
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '50px' }}>
          <p>Please <Link to={`${BASE_PATH}/login`}>log in</Link> to view messages.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '50px' }}>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      {/* Conversations List */}
      <div className="conversations-list">
        <h3 className="conversations-header">Messages</h3>
        {conversations.length > 0 ? (
          conversations.map(conv => (
            <div
              key={conv.id}
              className={`conversation-item ${selectedConversation === conv.id ? 'selected' : ''}`}
              onClick={() => setSelectedConversation(conv.id)}
            >
              <div className="conv-avatar">
                {conv.participants[0]?.profile_picture ? (
                  <img src={conv.participants[0].profile_picture} alt="" />
                ) : (
                  <div className="conv-avatar-placeholder">
                    {conv.participants[0]?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                {conv.unread_count > 0 && (
                  <span className="unread-badge">{conv.unread_count}</span>
                )}
              </div>
              <div className="conv-info">
                <span className="conv-username">
                  {conv.participants.map(p => `@${p.username}`).join(', ')}
                </span>
                <span className="conv-preview">
                  {conv.last_message ? (conv.last_message.length > 30 ? conv.last_message.substring(0, 30) + '...' : conv.last_message) : 'No messages yet'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="no-conversations">No conversations yet. Message someone from their profile!</p>
        )}
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {selectedConversation ? (
          <>
            <div className="chat-header">
              {participants.map(p => (
                <Link key={p.id} to={`${BASE_PATH}/${p.username}`} className="chat-participant">
                  {p.profile_picture ? (
                    <img src={p.profile_picture} alt="" className="chat-avatar" />
                  ) : (
                    <div className="chat-avatar-placeholder">{p.username[0].toUpperCase()}</div>
                  )}
                  <span>@{p.username}</span>
                </Link>
              ))}
            </div>

            <div className="messages-container">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}
                >
                  {msg.sender_id !== user.id && (
                    <div className="message-avatar">
                      {msg.profile_picture ? (
                        <img src={msg.profile_picture} alt="" />
                      ) : (
                        <div className="avatar-placeholder">{msg.username[0].toUpperCase()}</div>
                      )}
                    </div>
                  )}
                  <div className="message-content">
                    <p>{msg.content}</p>
                    <span className="message-time">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="message-input-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="message-input"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="send-button"
              >
                {sending ? '...' : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
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
          <Route path="/post/:postId" element={<SinglePostPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/tribes" element={<TribesPage />} />
          <Route path="/tribes/create" element={<CreateTribePage />} />
          <Route path="/tribe/:tag" element={<TribePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/:identifier" element={<UserProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
