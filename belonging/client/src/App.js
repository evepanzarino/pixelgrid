import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useParams, useNavigate } from 'react-router-dom';
import { login as apiLogin, register as apiRegister, getCurrentUser, getSkills, getLeaderboard, BASE_PATH } from './api';
import { io } from 'socket.io-client';
import { ReactComponent as BelongingLogo } from './belonging.svg';
import { ReactComponent as LogoBelonging } from './logo-belonging.svg';
import comingSoonImg from './images/coming-soon.png';
import nonbianaryImg from './images/nonbianary.png';
import transgirlImg from './images/transgirl.png';
import lesbianImg from './images/lesbian.png';

// ── Socket.io singleton ──────────────────────────────────────────────────────
let _socket = null;

function getSocket() {
  if (!_socket) {
    const token = localStorage.getItem('token');
    _socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io'
    });
  }
  return _socket;
}

function resetSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

// ── Simple event bus for triggering calls from any component ─────────────────
const callEventBus = {
  _listeners: [],
  emit(data) { this._listeners.forEach(l => l(data)); },
  on(l) { this._listeners.push(l); },
  off(l) { this._listeners = this._listeners.filter(x => x !== l); }
};

// ── URL detection utility ────────────────────────────────────────────────────
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
function detectUrls(text) {
  if (!text) return [];
  return [...new Set(text.match(URL_REGEX) || [])];
}

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Parse the tribe icon field into { img, flags }
// Supports: new JSON {img, flags}, old JSON flags-array, single path string, emoji
function parseTribeIcon(raw) {
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === 'object' && !Array.isArray(p)) return { img: p.img || null, flags: p.flags || [] };
    if (Array.isArray(p)) return { img: null, flags: p };
  } catch {}
  if (raw && raw.startsWith('flags/')) return { img: null, flags: [raw] };
  return { img: raw || null, flags: [] };
}

// Renders the main tribe icon image (square, from tribe-icons/ or /uploads/)
function TribeIcon({ icon, size = 48, style = {} }) {
  const { img } = parseTribeIcon(icon);
  const src = img
    ? (img.startsWith('/') ? img : `${BASE_PATH}/${img}`)
    : `${BASE_PATH}/tribe-icons/people.svg`;
  if (src.startsWith('data:') || (img && !img.includes('/'))) {
    // Emoji fallback
    return <span style={{ fontSize: size * 0.75, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, ...style }}>{img}</span>;
  }
  return <img src={src} alt="" style={{ width: size, height: size, objectFit: 'contain', borderRadius: 8, display: 'block', flexShrink: 0, ...style }} />;
}

// Renders the tribe flags as a small horizontal strip
function TribeFlagStrip({ icon, height = 14, maxShow = 4, style = {} }) {
  const { flags } = parseTribeIcon(icon);
  if (!flags.length) return null;
  const shown = flags.slice(0, maxShow);
  const extra = flags.length - shown.length;
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center', ...style }}>
      {shown.map((f, i) => (
        <img key={i} src={`${BASE_PATH}/${f}`} alt="" style={{ height, width: height * 1.5, objectFit: 'cover', borderRadius: 1, display: 'block' }} />
      ))}
      {extra > 0 && <span style={{ fontSize: height * 0.9, color: '#888', lineHeight: 1 }}>+{extra}</span>}
    </span>
  );
}

// All LGBTQIA+ pride flags — sorted from most widely recognised to most niche
const PRIDE_FLAGS = [
  // ── The big classics ──────────────────────────────────────────────────────
  {file:"rainbow-flag1.svg",label:"Rainbow Pride"},
  {file:"progress-pride-flag1.svg",label:"Progress Pride"},
  {file:"philadelphia-pride-flag.svg",label:"Philadelphia Pride"},
  {file:"gay-flag-baker.svg",label:"Gay (Baker / Original)"},
  // ── Core identities ───────────────────────────────────────────────────────
  {file:"transgender-flag.svg",label:"Transgender"},
  {file:"bisexual-flag.svg",label:"Bisexual"},
  {file:"lesbian-flag-5-stripe.svg",label:"Lesbian"},
  {file:"pansexual-flag.svg",label:"Pansexual"},
  {file:"asexual-flag.svg",label:"Asexual"},
  {file:"non-binary-flag.svg",label:"Non-Binary"},
  {file:"gay-men-pride-flag-2019.svg",label:"Gay Men"},
  {file:"genderqueer-flag.svg",label:"Genderqueer"},
  {file:"genderfluid-flag.svg",label:"Genderfluid"},
  {file:"intersex-flag.svg",label:"Intersex"},
  {file:"queer-flag.svg",label:"Queer"},
  {file:"aromantic-flag.svg",label:"Aromantic"},
  {file:"agender-flag.svg",label:"Agender"},
  {file:"polyamory-flag.svg",label:"Polyamory"},
  {file:"sapphic-flag.svg",label:"Sapphic"},
  {file:"two-spirit-flag.png",label:"Two-Spirit"},
  {file:"questioning-flag.svg",label:"Questioning"},
  // ── Well-known sub-identities ─────────────────────────────────────────────
  {file:"demisexual-flag.svg",label:"Demisexual"},
  {file:"demiromantic-flag.svg",label:"Demiromantic"},
  {file:"demiboy-flag.svg",label:"Demiboy"},
  {file:"demigirl-flag.svg",label:"Demigirl"},
  {file:"demigender-flag.svg",label:"Demigender"},
  {file:"aroace-flag.svg",label:"Aroace"},
  {file:"bigender-flag.svg",label:"Bigender"},
  {file:"omnisexual-flag.svg",label:"Omnisexual"},
  {file:"polysexual-flag.svg",label:"Polysexual"},
  {file:"achillean-flag.svg",label:"Achillean (MLM)"},
  {file:"community-lesbian-flag.svg",label:"Community Lesbian"},
  {file:"labrys-lesbian-flag.svg",label:"Labrys Lesbian"},
  {file:"lesbian-pride-double-venus1.svg",label:"Lesbian (Double Venus)"},
  {file:"lesbian-flags-7-stripes.png",label:"Lesbian (7-Stripe)"},
  {file:"butch-flag.svg",label:"Butch"},
  {file:"femme-flag.svg",label:"Femme"},
  {file:"twink-flag.svg",label:"Twink"},
  {file:"bear-flag.svg",label:"Bear"},
  {file:"transmasculine-flag.svg",label:"Transmasculine"},
  {file:"transfeminine2.svg",label:"Transfeminine"},
  {file:"transmasc-flag.png",label:"Transmasc"},
  {file:"androgynous-flag.svg",label:"Androgynous"},
  {file:"androgyne-pride-flag.png",label:"Androgyne"},
  {file:"pangender-flag.png",label:"Pangender"},
  {file:"multigender-flag.svg",label:"Multigender"},
  {file:"neutrois.svg",label:"Neutrois"},
  {file:"gender-neutral-flag.svg",label:"Gender Neutral"},
  {file:"unlabeled-flag.svg",label:"Unlabeled"},
  {file:"biromantic-flag-(by-pride-flags).png",label:"Biromantic"},
  {file:"panromantic-pride-flag.png",label:"Panromantic"},
  {file:"asexual-spectrum-flag.svg",label:"Asexual Spectrum"},
  {file:"aromantic-spectrum-flag.svg",label:"Aromantic Spectrum"},
  {file:"agender-spectrum-flag.png",label:"Agender Spectrum"},
  {file:"queerplatonic-attraction-flag.png",label:"Queerplatonic"},
  {file:"straight-ally-flag.png",label:"Straight Ally"},
  {file:"lgbti-flag.svg",label:"LGBTI"},
  {file:"cougar-lipstick-pink.png",label:"Lipstick Lesbian"},
  {file:"sex-worker-inclusive-progress-flag.svg",label:"Sex Worker Inclusive Progress"},
  // ── Ace / Aro spectrum ────────────────────────────────────────────────────
  {file:"gray-asexual-flag.svg",label:"Gray-Asexual"},
  {file:"gray-aromantic-flag.svg",label:"Gray-Aromantic"},
  {file:"aroace-flag-alt.svg",label:"Aroace (Alt)"},
  {file:"aroaceflux.png",label:"Aroaceflux"},
  {file:"aroflux-flag.svg",label:"Aroflux"},
  {file:"aceflux-flag.svg",label:"Aceflux"},
  {file:"alloace-flag.svg",label:"Alloace"},
  {file:"alloaro-flag.svg",label:"Alloaro"},
  {file:"oriented-aroace-flag.svg",label:"Oriented Aroace"},
  {file:"angled-aroace-flag.svg",label:"Angled Aroace"},
  {file:"apothisexual-flag.svg",label:"Apothisexual"},
  {file:"apothiromanticflag.png",label:"Apothiromantic"},
  {file:"aegosexual-flag.svg",label:"Aegosexual"},
  {file:"aegoromantic-flag.svg",label:"Aegoromantic"},
  {file:"cupiosexual-flag.svg",label:"Cupiosexual"},
  {file:"cupioromantic-flag.svg",label:"Cupioromantic"},
  {file:"fraysexual-flag.svg",label:"Fraysexual"},
  {file:"frayromantic-flag.svg",label:"Frayromantic"},
  {file:"abrosexual-flag.svg",label:"Abrosexual"},
  {file:"abroromantic-flag.png",label:"Abroromantic"},
  {file:"bicurious.png",label:"Bicurious"},
  // ── Gender diverse ────────────────────────────────────────────────────────
  {file:"agender-4-stripe-flag.svg",label:"Agender (4-Stripe)"},
  {file:"agenderflux-flag.png",label:"Agenderflux"},
  {file:"genderflux-flag.png",label:"Genderflux"},
  {file:"genderfuck-flag.svg",label:"Genderfuck"},
  {file:"genderfae-flag.svg",label:"Genderfae"},
  {file:"genderfaun-flag.svg",label:"Genderfaun"},
  {file:"genderflor-flag.svg",label:"Genderflor"},
  {file:"gender-creative.svg",label:"Gender Creative"},
  {file:"neurogender-flag.svg",label:"Neurogender"},
  {file:"maverique-flag.png",label:"Maverique"},
  {file:"intergender-flag.svg",label:"Intergender"},
  {file:"intergender-flag-2020.png",label:"Intergender (2020)"},
  {file:"polygender.webp",label:"Polygender"},
  {file:"trigender.jpg",label:"Trigender"},
  {file:"nonbinary-boy-flag.png",label:"Nonbinary Boy"},
  {file:"nonbinary-girl-flag.png",label:"Nonbinary Girl"},
  {file:"toric.png",label:"Toric"},
  {file:"trixic.png",label:"Trixic"},
  {file:"enbianflag.png",label:"Enbian"},
  {file:"demifluid.png",label:"Demifluid"},
  {file:"demiflux.jpg",label:"Demiflux"},
  {file:"diamoric-flag.svg",label:"Diamoric"},
  {file:"transmasculine-2.svg",label:"Transmasculine (Alt)"},
  {file:"transmasculine-flag-3.svg",label:"Transmasculine (Alt 2)"},
  {file:"transfeminine-flag2.png",label:"Transfeminine (Alt)"},
  {file:"androgyne-flag-2-.png",label:"Androgyne (Alt)"},
  {file:"androsexual-flag.svg",label:"Androsexual"},
  {file:"gynesexual.svg",label:"Gynesexual"},
  {file:"egogender-momma-mogai-sphinx.png",label:"Egogender"},
  {file:"graygender-flag-original-file.png",label:"Graygender"},
  // ── Romantic attractions ──────────────────────────────────────────────────
  {file:"omniromantic-flag.png",label:"Omniromantic"},
  {file:"polyromantic-flag.png",label:"Polyromantic"},
  {file:"biromantic-flag1.png",label:"Biromantic (Alt)"},
  {file:"ceteroromantic-flag.png",label:"Ceteroromantic"},
  {file:"androromanticflag.png",label:"Androromantic"},
  {file:"gyneromanticflag.png",label:"Gyneromantic"},
  {file:"grayromantic.png",label:"Grayromantic"},
  {file:"desinoromantic-flag.svg",label:"Desinoromantic"},
  // ── Historical / alt versions ─────────────────────────────────────────────
  {file:"gay-flag-seven-stripe.svg",label:"Gay (7-Stripe)"},
  {file:"gilbert-baker-lavender-flag.svg",label:"Gilbert Baker Lavender"},
  {file:"gilbert-baker-lavender.png",label:"Gilbert Baker Lavender (Alt)"},
  {file:"first-aromantic-flag.svg",label:"Aromantic (First)"},
  {file:"second-aromantic-flag.svg",label:"Aromantic (Second)"},
  {file:"achillean-flag-original.jpg",label:"Achillean (Original)"},
  {file:"original-sapphic-flag.png",label:"Sapphic (Original)"},
  {file:"lydia-sapphic-flag.svg",label:"Lydia Sapphic"},
  {file:"oldintersexflag.png",label:"Intersex (Old)"},
  {file:"oldintergender-flag.png",label:"Intergender (Old)"},
  {file:"oldaltintergender.png",label:"Intergender (Old Alt)"},
  {file:"cupioromantic-flag-original-file.png",label:"Cupioromantic (Original)"},
  {file:"cupiosexual.png",label:"Cupiosexual (Alt)"},
  {file:"ceterosexual.jpg",label:"Ceterosexual"},
  {file:"ceterosexual2.png",label:"Ceterosexual (Alt)"},
  {file:"fraysexual-flag.jpg",label:"Fraysexual (Alt)"},
  {file:"frayromantic-alt.png",label:"Frayromantic (Alt)"},
  {file:"fluid-flag-original.png",label:"Fluid (Original)"},
  {file:"desinoromantic-flag-original.png",label:"Desinoromantic (Original)"},
  {file:"the-butch-flag.png",label:"Butch (Alt)"},
  {file:"the-femme-flag.png",label:"Femme (Alt)"},
  {file:"alt-genderfluid-flag.png",label:"Genderfluid (Alt)"},
  {file:"alternative-pansexual-flag.svg",label:"Alternative Pansexual"},
  {file:"gendercreativeprideflag.png",label:"Gender Creative (Alt)"},
  {file:"gynesexualflag.png",label:"Gynesexual (Alt)"},
  {file:"transmasculine-flag.png",label:"Transmasculine (Alt 3)"},
  {file:"transmasculine.png",label:"Transmasculine (Alt 4)"},
  {file:"unlabeledprideflag.png",label:"Unlabeled (Alt)"},
  {file:"polyamory.png",label:"Polyamory (Alt)"},
  {file:"polyromantic.png",label:"Polyromantic (Alt)"},
  {file:"tricolor-polyamory-pride-flag.png",label:"Tricolor Polyamory"},
  // ── Niche / community-specific ────────────────────────────────────────────
  {file:"a-spec-flag.svg",label:"A-Spec"},
  {file:"a-spec-flag-aloe-vera.svg",label:"A-Spec (Aloe Vera)"},
  {file:"aplatonic-flag.svg",label:"Aplatonic"},
  {file:"aplatonic-flag.png",label:"Aplatonic (Alt)"},
  {file:"another-qpr-flag.jpg",label:"QPR"},
  {file:"multisexual-flag.png",label:"Multisexual"},
  {file:"monosexual.png",label:"Monosexual"},
  {file:"pomosexual.png",label:"Pomosexual"},
  {file:"novosexual-flag-alt.png",label:"Novosexual"},
  {file:"novo-original-hq.png",label:"Novo"},
  {file:"fluidflux-flag.svg",label:"Fluidflux"},
  {file:"fluidflux.png",label:"Fluidflux (Alt)"},
  {file:"chevron-queer-flag.svg",label:"Chevron Queer"},
  {file:"straight-queer.svg",label:"Straight Queer"},
  {file:"heteroqueer-gayer9000.jpg",label:"Heteroqueer"},
  {file:"queerhet-kaestral.png",label:"Queerhet"},
  {file:"hijra-flag-original-file.png",label:"Hijra"},
  {file:"waria.png",label:"Waria"},
  {file:"mogai-pride-flag.png",label:"MOGAI"},
  {file:"lgbti-flag.svg",label:"LGBTI"},
  {file:"transmedicalism.svg",label:"Transmedicalism"},
  {file:"transmedicalist-symbol.png",label:"Transmedicalist"},
  {file:"xenogender-flag.svg",label:"Xenogender"},
  {file:"xenogender-flag-alt.svg",label:"Xenogender (Alt)"},
  {file:"xenicflag2.webp",label:"Xenic"},
];

// ── Saved-accounts helpers (module-level so Navbar + HomePage can share) ──
const getSavedAccounts = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('belonging_saved_accounts') || '[]');
    return parsed.map(a => typeof a === 'string' ? { username: a, token: null, profile_picture: null } : a);
  } catch { return []; }
};
const upsertSavedAccount = (username, token, profile_picture) => {
  try {
    const accounts = getSavedAccounts().filter(a => a.username !== username);
    accounts.unshift({ username, token: token || null, profile_picture: profile_picture || null });
    localStorage.setItem('belonging_saved_accounts', JSON.stringify(accounts.slice(0, 8)));
  } catch {}
};

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
    upsertSavedAccount(res.data.user.username, res.data.token, res.data.user.profile_picture);
    return res.data;
  };

  const register = async (userData) => {
    const res = await apiRegister(userData);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    upsertSavedAccount(res.data.user.username, res.data.token, res.data.user.profile_picture);
    return res.data;
  };

  const loginWithToken = async (token) => {
    localStorage.setItem('token', token);
    try {
      const res = await getCurrentUser();
      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      upsertSavedAccount(res.data.username, token, res.data.profile_picture);
      return res.data;
    } catch {
      localStorage.removeItem('token');
      throw new Error('Session expired');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    resetSocket();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  );
};

// Notifications Component
const Notifications = ({ unreadCount, setUnreadCount, levelUpCount, setLevelUpCount }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/notifications/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUnreadCount(0);
      setLevelUpCount(0);
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
      markAsRead();
    }
    setIsOpen(!isOpen);
  };

  const getNotificationText = (notif) => {
    switch (notif.type) {
      case 'like': return 'liked your post';
      case 'favorite': return 'favorited your post';
      case 'comment': return 'commented on your post';
      case 'repost': return 'reposted your post';
      case 'follow': return 'followed you';
      case 'level_up': return <span>reached <strong>Level {notif.new_level}</strong> in <strong>{notif.skill_name}</strong>!</span>;
      default: return 'interacted with you';
    }
  };

  return (
    <div className="notifications-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={toggleDropdown}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', position: 'relative', padding: '5px' }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0',
            right: '0',
            background: '#e0245e',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 'bold',
            border: '2px solid white',
            minWidth: '18px',
            textAlign: 'center'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown" style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          width: '300px',
          maxHeight: '400px',
          backgroundColor: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '12px',
          zIndex: 1000,
          overflowY: 'auto',
          marginTop: '10px',
          border: '1px solid #eee'
        }}>
          <div style={{ padding: '15px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
            Notifications
          </div>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No notifications yet</div>
          ) : (
            notifications.map(notif => (
              <Link
                key={notif.id}
                to={`${BASE_PATH}/feed`} // In a real app we'd jump to the post, but for now just feed
                style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={() => setIsOpen(false)}
              >
                <div style={{
                  padding: '12px 15px',
                  borderBottom: '1px solid #f9f9f9',
                  display: 'flex',
                  gap: '12px',
                  backgroundColor: notif.is_read ? 'white' : '#f0f7ff',
                  transition: 'background-color 0.2s',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '20px' }}>
                    {notif.type === 'like' && '❤️'}
                    {notif.type === 'favorite' && '⭐'}
                    {notif.type === 'comment' && '💬'}
                    {notif.type === 'repost' && '🔄'}
                    {notif.type === 'follow' && '👥'}
                    {notif.type === 'level_up' && '🎊'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      <strong style={{ color: '#333' }}>@{notif.actor_username}</strong> {getNotificationText(notif)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(notif.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// LevelUpBanner Component
const LevelUpBanner = ({ notification, onClear }) => {
  if (!notification) return null;

  const handleClose = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/notifications/${notification.id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      onClear();
    } catch (err) {
      console.error('Error clearing level-up banner:', err);
    }
  };

  return (
    <div className="levelup-banner">
      <div className="levelup-banner-content">
        <span className="levelup-banner-emoji">🎊</span>
        <div className="levelup-banner-text">
          <strong>CONGRATULATIONS!</strong>
          <span>You reached <strong>Level {notification.new_level}</strong> in <strong>{notification.skill_name}</strong>!</span>
        </div>
        <button className="levelup-banner-close" onClick={handleClose}>×</button>
      </div>
    </div>
  );
};

// Inline search for second navbar row
const NavbarSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], posts: [] });
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults({ users: [], posts: [] }); setOpen(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const [uRes, pRes] = await Promise.all([
          fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/users/search?q=${encodeURIComponent(query)}`),
          fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/search?q=${encodeURIComponent(query)}`),
        ]);
        const users = uRes.ok ? await uRes.json() : [];
        const posts = pRes.ok ? await pRes.json() : [];
        setResults({ users: users.slice(0, 5), posts: posts.slice(0, 5) });
        setOpen(true);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const go = (path) => { setQuery(''); setOpen(false); navigate(path); };

  return (
    <div className="navbar-search-wrap" ref={ref}>
      <input
        className="navbar-search-input"
        placeholder="Search users & posts…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.users.length + results.posts.length > 0 && setOpen(true)}
      />
      <button className="navbar-search-btn" onClick={() => query.length >= 2 && setOpen(true)} tabIndex={-1}>
        {searching ? '…' : '🔍'}
      </button>
      {open && (results.users.length > 0 || results.posts.length > 0) && (
        <div className="navbar-search-dropdown">
          {results.users.length > 0 && (
            <>
              <p className="navbar-search-section">People</p>
              {results.users.map(u => (
                <div key={u.id} className="navbar-search-result" onClick={() => go(`${BASE_PATH}/${u.username}`)}>
                  {u.profile_picture
                    ? <img src={u.profile_picture} alt="" className="navbar-search-avatar" />
                    : <div className="navbar-search-avatar-placeholder" />}
                  <span className="navbar-search-name">@{u.username}</span>
                </div>
              ))}
            </>
          )}
          {results.posts.length > 0 && (
            <>
              <p className="navbar-search-section">Posts</p>
              {results.posts.map(p => (
                <div key={p.id} className="navbar-search-result" onClick={() => go(`${BASE_PATH}/post/${p.id}`)}>
                  <div className="navbar-search-post-icon">📝</div>
                  <div className="navbar-search-post-info">
                    <span className="navbar-search-name">{p.tagline || '(untitled)'}</span>
                    <span className="navbar-search-sub">@{p.username}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Switch Accounts dropdown (shown in Navbar)
const SwitchAccountsMenu = ({ currentUser, logout, login, loginWithToken }) => {
  const [open, setOpen] = useState(false);
  const [switchUser, setSwitchUser] = useState('');
  const [switchPass, setSwitchPass] = useState('');
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const ref = React.useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const accounts = getSavedAccounts().filter(a => a.username !== currentUser?.username);

  const handleAccountClick = async (account) => {
    if (!account.token) { setSwitchUser(account.username); setSwitchPass(''); return; }
    setSwitchLoading(true); setSwitchError('');
    try { await loginWithToken(account.token); setOpen(false); }
    catch { setSwitchUser(account.username); setSwitchPass(''); setSwitchError('Session expired — please sign in again.'); }
    finally { setSwitchLoading(false); }
  };

  const handleSwitchLogin = async (e) => {
    e.preventDefault();
    setSwitchLoading(true); setSwitchError('');
    try {
      await login({ username: switchUser, password: switchPass });
      setSwitchUser(''); setSwitchPass(''); setOpen(false);
    } catch (err) {
      setSwitchError(err.response?.data?.error || 'Login failed');
    } finally { setSwitchLoading(false); }
  };

  return (
    <div className="switch-accounts-wrap" ref={ref}>
      <button className="switch-accounts-icon-btn" onClick={() => setOpen(o => !o)} title="Switch Accounts">
        ⇄
      </button>
      {open && (
        <div className="switch-accounts-dropdown">
          {accounts.length > 0 && (
            <>
              <p className="switch-accounts-label">Saved accounts</p>
              {accounts.map((a, i) => (
                <button key={i} className="switch-account-row" onClick={() => handleAccountClick(a)} disabled={switchLoading}>
                  {a.profile_picture
                    ? <img src={a.profile_picture} alt="" className="switch-account-avatar" />
                    : <div className="switch-account-avatar-placeholder" />}
                  <span className="switch-account-username">@{a.username}</span>
                  {a.token && <span className="switch-account-hint">tap to switch</span>}
                </button>
              ))}
              <div className="switch-accounts-divider" />
            </>
          )}
          <p className="switch-accounts-label">Add account</p>
          {switchError && <p className="switch-accounts-error">{switchError}</p>}
          <form onSubmit={handleSwitchLogin} className="switch-accounts-form">
            <input className="switch-accounts-input" placeholder="Username" value={switchUser} onChange={e => setSwitchUser(e.target.value)} autoComplete="username" />
            <input className="switch-accounts-input" type="password" placeholder="Password" value={switchPass} onChange={e => setSwitchPass(e.target.value)} autoComplete="current-password" />
            <button type="submit" className="btn switch-accounts-submit" disabled={switchLoading || !switchUser || !switchPass}>
              {switchLoading ? '…' : 'Sign in'}
            </button>
          </form>
          <div className="switch-accounts-divider" />
          <button className="switch-accounts-logout" onClick={() => { logout(); setOpen(false); }}>Log out @{currentUser?.username}</button>
        </div>
      )}
    </div>
  );
};

// Navbar Component
const Navbar = ({ onLevelUpUpdate }) => {
  const { user, logout, login, loginWithToken } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [levelUpCount, setLevelUpCount] = useState(0);

  const fetchUnreadMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/messages/unread`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadMessages(data.unread);
      }
    } catch (err) {
      console.error('Error fetching unread messages:', err);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const count = Number(data.count) || 0;
        const luCount = Number(data.levelUpCount) || 0;
        console.log('Fetched unread notifications:', { count, luCount });
        setUnreadCount(count);

        if (luCount > levelUpCount) {
          // New level up detected!
          fetchLatestLevelUp();
        }
        setLevelUpCount(luCount);
      }
    } catch (err) {
      console.error('Error fetching unread notifications:', err);
    }
  };

  const fetchLatestLevelUp = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const unreadLevelUps = data.filter(n => n.type === 'level_up' && !n.is_read);
        if (unreadLevelUps.length > 0) {
          onLevelUpUpdate(unreadLevelUps[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching latest level up:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadMessages();
      fetchUnreadNotifications();
      const interval = setInterval(() => {
        fetchUnreadMessages();
        fetchUnreadNotifications();
      }, 10000); // Check more frequently (every 10s)
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <nav className="navbar">
      {/* Row 1: Logo · · · Bell · Avatar·@username · Switch Accounts */}
      <div className="navbar-top">
        <Link to={`${BASE_PATH}/feed`} className="navbar-logo-link">
          <LogoBelonging className="logo-belonging" />
          <BelongingLogo className="belonging-logo" />
        </Link>
        <div style={{ flex: 1 }} />
        {user ? (
          <div className="navbar-top-user">
            <Notifications
              unreadCount={unreadCount}
              setUnreadCount={setUnreadCount}
              levelUpCount={levelUpCount}
              setLevelUpCount={setLevelUpCount}
            />
            {user.username === user.email ? (
              <Link to={`${BASE_PATH}/complete-profile`} style={{ color: '#e67e22', fontSize: '0.85rem' }}>Choose a username</Link>
            ) : (
              <Link to={`${BASE_PATH}/${user.username}`} className="navbar-user-link">
                {user.profile_picture
                  ? <img src={user.profile_picture} alt="" className="navbar-user-avatar" />
                  : <div className="navbar-user-avatar-placeholder" />}
                @{user.username}
              </Link>
            )}
            <SwitchAccountsMenu currentUser={user} logout={logout} login={login} loginWithToken={loginWithToken} />
          </div>
        ) : (
          <div className="navbar-top-user">
            <Link to={`${BASE_PATH}/login`}>Login</Link>
            <Link to={`${BASE_PATH}/register`}>Register</Link>
          </div>
        )}
      </div>

      {/* Desktop nav links row (hidden on mobile) */}
      <div className="navbar-links">
        <Link to={`${BASE_PATH}/feed`}>Feed</Link>
        <Link to={`${BASE_PATH}/trends`}>Trends</Link>
        <Link to={`${BASE_PATH}/users`}>Users</Link>
        <Link to={`${BASE_PATH}/tribes`}>Tribes</Link>
        <Link to={`${BASE_PATH}/search`}>Search</Link>
        <Link to={`${BASE_PATH}/skills`} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          Skills{levelUpCount > 0 && <span className="navbar-badge">{levelUpCount}</span>}
        </Link>
        <Link to={`${BASE_PATH}/messages`} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          Messages{unreadMessages > 0 && <span className="navbar-badge">{unreadMessages}</span>}
        </Link>
      </div>

      {/* Row 2: Feed · Tribes · Search fills remaining width */}
      <div className="navbar-row2">
        <Link to={`${BASE_PATH}/feed`} className="navbar-row2-link">Feed</Link>
        <Link to={`${BASE_PATH}/tribes`} className="navbar-row2-link">Tribes</Link>
        <NavbarSearch />
      </div>
    </nav>
  );
};

// Home Page
const HomePage = () => {
  const navigate = useNavigate();
  const { user, login, register, loginWithToken } = useAuth();

  // Saved accounts: [{ username, token }]
  const getSavedAccounts = () => {
    try {
      const saved = localStorage.getItem('belonging_saved_accounts');
      const parsed = saved ? JSON.parse(saved) : [];
      // Support old format (plain strings) by migrating them
      return parsed.map(a => typeof a === 'string' ? { username: a, token: null } : a);
    } catch {
      return [];
    }
  };

  const savedAccounts = getSavedAccounts();
  const hasAccounts = savedAccounts.length > 0;

  const [activeTab, setActiveTab] = useState(hasAccounts ? 'login' : 'register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const saveAccount = (username, token) => {
    try {
      const accounts = getSavedAccounts().filter(a => a.username !== username);
      accounts.unshift({ username, token });
      localStorage.setItem('belonging_saved_accounts', JSON.stringify(accounts.slice(0, 5)));
    } catch (err) {
      console.error('Failed to save account:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login({ username, password });
      saveAccount(username, result.token);
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
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
      const result = await register({
        username: isEmail ? username : username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
        email: isEmail ? username : null,
        password
      });
      saveAccount(username, result.token);
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setLoading(false);
    }
  };

  const handleAccountClick = async (account) => {
    if (account.token) {
      setLoading(true);
      setError('');
      try {
        await loginWithToken(account.token);
        window.location.reload();
        return; // Auto-login succeeded
      } catch {
        // Token expired — fall through to password form
      } finally {
        setLoading(false);
      }
    }
    setUsername(account.username);
    setActiveTab('login');
    setPassword('');
  };

  if (user) {
    return (
      <div className="container">
        <div className="home-content">
          <h2>Welcome to</h2>
          <BelongingLogo className="belonging-logo-image" />
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
      {/* Login/Register Section */}
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

          {/* Show saved accounts if logging in and accounts exist */}
          {activeTab === 'login' && hasAccounts && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#fff', marginBottom: '10px', display: 'block', fontSize: '0.9rem' }}>
                Previously logged in accounts:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {savedAccounts.map((account, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAccountClick(account)}
                    style={{
                      padding: '10px 15px',
                      background: username === account.username ? '#667eea' : '#2a2a2a',
                      border: '1px solid #444',
                      borderRadius: '5px',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                    onMouseEnter={(e) => {
                      if (username !== account.username) e.currentTarget.style.background = '#333';
                    }}
                    onMouseLeave={(e) => {
                      if (username !== account.username) e.currentTarget.style.background = '#2a2a2a';
                    }}
                  >
                    <span style={{ flex: 1 }}>{account.username}</span>
                    {account.token && <span style={{ fontSize: '0.75rem', color: '#aaa' }}>Tap to sign in</span>}
                  </button>
                ))}
              </div>
              <div style={{ margin: '15px 0', textAlign: 'center', color: '#666' }}>or</div>
            </div>
          )}

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

      {/* Content */}
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
                      src={discordStatus.discord_avatar.startsWith('http')
                        ? discordStatus.discord_avatar
                        : `https://cdn.discordapp.com/avatars/${discordStatus.discord_id}/${discordStatus.discord_avatar}.png?size=64`}
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
const WORLD_LOCATIONS = [
  // Countries
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda',
  'Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium',
  'Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana',
  'Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
  'Cambodia','Cameroon','Canada','Cape Verde','Central African Republic',
  'Chad','Chile','China','Colombia','Comoros','Costa Rica',
  "Côte d'Ivoire",'Croatia','Cuba','Cyprus','Czech Republic',
  'Denmark','Djibouti','Dominica','Dominican Republic',
  'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia',
  'Fiji','Finland','France',
  'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada',
  'Guatemala','Guinea','Guinea-Bissau','Guyana',
  'Haiti','Honduras','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
  'Jamaica','Japan','Jordan',
  'Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan',
  'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg',
  'Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands',
  'Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
  'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway',
  'Oman',
  'Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal',
  'Qatar',
  'Romania','Russia','Rwanda',
  'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines',
  'Samoa','San Marino','Saudi Arabia','Senegal','Serbia','Seychelles',
  'Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands',
  'Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
  'Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu',
  'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan',
  'Vanuatu','Vatican City','Venezuela','Vietnam',
  'Yemen','Zambia','Zimbabwe',
  // North America — Cities
  'New York, USA','Los Angeles, USA','Chicago, USA','Houston, USA','Phoenix, USA',
  'Philadelphia, USA','San Antonio, USA','San Diego, USA','Dallas, USA',
  'San Jose, USA','Austin, USA','Seattle, USA','Denver, USA','Boston, USA',
  'Portland, USA','Miami, USA','Atlanta, USA','Minneapolis, USA','Las Vegas, USA',
  'San Francisco, USA','Nashville, USA','Detroit, USA','Louisville, USA',
  'Baltimore, USA','Milwaukee, USA','Sacramento, USA','Pittsburgh, USA',
  'Cincinnati, USA','Cleveland, USA','Kansas City, USA','Tampa, USA',
  'Orlando, USA','St. Louis, USA','New Orleans, USA','Indianapolis, USA',
  'Columbus, USA','Charlotte, USA','Raleigh, USA','Omaha, USA','Honolulu, USA',
  'Anchorage, USA','Albuquerque, USA','Tucson, USA','Fresno, USA',
  'Salt Lake City, USA','Richmond, USA','Baton Rouge, USA','Memphis, USA',
  'Toronto, Canada','Montreal, Canada','Vancouver, Canada','Calgary, Canada',
  'Ottawa, Canada','Edmonton, Canada','Quebec City, Canada','Winnipeg, Canada','Halifax, Canada',
  'Mexico City, Mexico','Guadalajara, Mexico','Monterrey, Mexico','Tijuana, Mexico',
  'Havana, Cuba','San José, Costa Rica','Guatemala City, Guatemala',
  'Panama City, Panama','Managua, Nicaragua','Tegucigalpa, Honduras','San Salvador, El Salvador',
  // South America — Cities
  'São Paulo, Brazil','Rio de Janeiro, Brazil','Brasília, Brazil','Salvador, Brazil',
  'Fortaleza, Brazil','Manaus, Brazil','Curitiba, Brazil','Recife, Brazil',
  'Buenos Aires, Argentina','Córdoba, Argentina','Rosario, Argentina',
  'Bogotá, Colombia','Medellín, Colombia','Cali, Colombia',
  'Lima, Peru','Santiago, Chile','Caracas, Venezuela','Quito, Ecuador',
  'Guayaquil, Ecuador','La Paz, Bolivia','Asunción, Paraguay','Montevideo, Uruguay',
  // Europe — Cities
  'London, UK','Manchester, UK','Birmingham, UK','Glasgow, UK','Liverpool, UK',
  'Leeds, UK','Bristol, UK','Edinburgh, UK','Sheffield, UK','Cardiff, UK','Belfast, UK',
  'Paris, France','Lyon, France','Marseille, France','Toulouse, France','Bordeaux, France','Nice, France','Strasbourg, France','Nantes, France',
  'Berlin, Germany','Hamburg, Germany','Munich, Germany','Cologne, Germany',
  'Frankfurt, Germany','Stuttgart, Germany','Düsseldorf, Germany','Leipzig, Germany',
  'Madrid, Spain','Barcelona, Spain','Valencia, Spain','Seville, Spain','Zaragoza, Spain','Bilbao, Spain','Málaga, Spain',
  'Rome, Italy','Milan, Italy','Naples, Italy','Turin, Italy','Florence, Italy','Venice, Italy','Bologna, Italy',
  'Amsterdam, Netherlands','Rotterdam, Netherlands','The Hague, Netherlands',
  'Brussels, Belgium','Antwerp, Belgium','Ghent, Belgium',
  'Vienna, Austria','Graz, Austria',
  'Zurich, Switzerland','Geneva, Switzerland','Basel, Switzerland','Bern, Switzerland',
  'Stockholm, Sweden','Gothenburg, Sweden','Malmö, Sweden',
  'Oslo, Norway','Bergen, Norway',
  'Copenhagen, Denmark','Aarhus, Denmark',
  'Helsinki, Finland','Reykjavik, Iceland',
  'Warsaw, Poland','Kraków, Poland','Gdańsk, Poland','Wrocław, Poland',
  'Prague, Czech Republic','Brno, Czech Republic',
  'Budapest, Hungary','Bucharest, Romania','Sofia, Bulgaria',
  'Athens, Greece','Thessaloniki, Greece',
  'Lisbon, Portugal','Porto, Portugal',
  'Dublin, Ireland','Cork, Ireland',
  'Belgrade, Serbia','Zagreb, Croatia','Split, Croatia',
  'Sarajevo, Bosnia and Herzegovina','Skopje, North Macedonia','Tirana, Albania','Podgorica, Montenegro',
  'Riga, Latvia','Vilnius, Lithuania','Tallinn, Estonia',
  'Chisinau, Moldova','Kyiv, Ukraine','Kharkiv, Ukraine','Odesa, Ukraine',
  'Moscow, Russia','St. Petersburg, Russia','Novosibirsk, Russia','Yekaterinburg, Russia',
  'Istanbul, Turkey','Ankara, Turkey','Izmir, Turkey',
  'Ljubljana, Slovenia','Luxembourg City, Luxembourg','Valletta, Malta','Nicosia, Cyprus',
  // Middle East — Cities
  'Dubai, UAE','Abu Dhabi, UAE','Doha, Qatar','Riyadh, Saudi Arabia','Jeddah, Saudi Arabia',
  'Kuwait City, Kuwait','Manama, Bahrain','Muscat, Oman',
  'Beirut, Lebanon','Tel Aviv, Israel','Jerusalem, Israel','Haifa, Israel',
  'Amman, Jordan','Damascus, Syria','Baghdad, Iraq','Tehran, Iran',
  'Kabul, Afghanistan',"Sana'a, Yemen",
  // Asia — Cities
  'Tokyo, Japan','Osaka, Japan','Kyoto, Japan','Sapporo, Japan','Fukuoka, Japan','Yokohama, Japan','Nagoya, Japan','Kobe, Japan',
  'Beijing, China','Shanghai, China','Guangzhou, China','Shenzhen, China',
  'Chengdu, China','Chongqing, China',"Xi'an, China",'Hangzhou, China','Wuhan, China','Nanjing, China','Tianjin, China',
  'Hong Kong','Taipei, Taiwan','Macau',
  'Seoul, South Korea','Busan, South Korea','Incheon, South Korea','Daegu, South Korea',
  'Pyongyang, North Korea',
  'Singapore',
  'Kuala Lumpur, Malaysia','George Town, Malaysia','Johor Bahru, Malaysia',
  'Bangkok, Thailand','Chiang Mai, Thailand',
  'Jakarta, Indonesia','Surabaya, Indonesia','Bandung, Indonesia','Bali, Indonesia',
  'Manila, Philippines','Cebu, Philippines','Quezon City, Philippines',
  'Hanoi, Vietnam','Ho Chi Minh City, Vietnam','Da Nang, Vietnam',
  'Phnom Penh, Cambodia','Siem Reap, Cambodia',
  'Yangon, Myanmar','Naypyidaw, Myanmar','Vientiane, Laos',
  'Colombo, Sri Lanka','Kathmandu, Nepal','Dhaka, Bangladesh','Chittagong, Bangladesh',
  'Karachi, Pakistan','Lahore, Pakistan','Islamabad, Pakistan','Rawalpindi, Pakistan',
  'Mumbai, India','Delhi, India','Bangalore, India','Kolkata, India',
  'Chennai, India','Hyderabad, India','Ahmedabad, India','Pune, India',
  'Jaipur, India','Surat, India','Lucknow, India','Kochi, India',
  'Ulaanbaatar, Mongolia','Almaty, Kazakhstan','Nur-Sultan, Kazakhstan',
  'Tashkent, Uzbekistan','Bishkek, Kyrgyzstan','Dushanbe, Tajikistan','Ashgabat, Turkmenistan',
  'Baku, Azerbaijan','Tbilisi, Georgia','Yerevan, Armenia',
  // Africa — Cities
  'Cairo, Egypt','Alexandria, Egypt',
  'Lagos, Nigeria','Abuja, Nigeria','Kano, Nigeria',
  'Nairobi, Kenya','Mombasa, Kenya',
  'Johannesburg, South Africa','Cape Town, South Africa','Durban, South Africa','Pretoria, South Africa',
  'Addis Ababa, Ethiopia','Dar es Salaam, Tanzania',
  'Casablanca, Morocco','Rabat, Morocco','Tunis, Tunisia','Algiers, Algeria','Oran, Algeria',
  'Accra, Ghana','Kumasi, Ghana',
  "Abidjan, Côte d'Ivoire",'Kampala, Uganda','Lusaka, Zambia',
  'Harare, Zimbabwe','Bulawayo, Zimbabwe','Dakar, Senegal',
  'Kinshasa, DR Congo','Luanda, Angola','Khartoum, Sudan','Mogadishu, Somalia',
  'Antananarivo, Madagascar','Maputo, Mozambique',
  'Douala, Cameroon','Yaoundé, Cameroon','Bamako, Mali','Ouagadougou, Burkina Faso',
  'Conakry, Guinea','Freetown, Sierra Leone','Monrovia, Liberia',
  'Lomé, Togo','Cotonou, Benin','Niamey, Niger','Ndjamena, Chad',
  'Brazzaville, Congo','Libreville, Gabon','Malabo, Equatorial Guinea',
  'Banjul, Gambia','Bissau, Guinea-Bissau','Praia, Cape Verde',
  'Djibouti City, Djibouti','Asmara, Eritrea','Juba, South Sudan',
  'Kigali, Rwanda','Bujumbura, Burundi','Lilongwe, Malawi','Windhoek, Namibia',
  'Gaborone, Botswana','Mbabane, Eswatini','Maseru, Lesotho',
  // Oceania — Cities
  'Sydney, Australia','Melbourne, Australia','Brisbane, Australia',
  'Perth, Australia','Adelaide, Australia','Canberra, Australia',
  'Gold Coast, Australia','Darwin, Australia','Hobart, Australia',
  'Auckland, New Zealand','Wellington, New Zealand','Christchurch, New Zealand',
  'Suva, Fiji','Port Moresby, Papua New Guinea','Honiara, Solomon Islands',
  'Port Vila, Vanuatu',"Nuku'alofa, Tonga",'Apia, Samoa',
  'Majuro, Marshall Islands','Palikir, Micronesia','Koror, Palau',
  'South Tarawa, Kiribati','Yaren, Nauru',
];

const COMPOSER_VIBES = [
  { emoji: '😊', label: 'happy' }, { emoji: '😢', label: 'sad' },
  { emoji: '😡', label: 'angry' }, { emoji: '😍', label: 'loving' },
  { emoji: '😂', label: 'laughing' }, { emoji: '🤔', label: 'thinking' },
  { emoji: '😴', label: 'tired' }, { emoji: '🥳', label: 'celebrating' },
  { emoji: '💪', label: 'motivated' }, { emoji: '😌', label: 'peaceful' },
  { emoji: '🔥', label: 'fired up' }, { emoji: '🌸', label: 'grateful' },
  { emoji: '😰', label: 'anxious' }, { emoji: '🤗', label: 'excited' },
];
const COMPOSER_STICKERS = ['❤️','🏳️‍🌈','🏳️‍⚧️','✨','🌟','💜','🔥','👀','🎉','💅','🌙','🌺','💫','🦋','🌈','🍀','🫶','😭','💀','🤌','🎭','🌸','🫧','🫠','🪷','🦄','🐾','🌻'];

const PostEditor = ({ onPostCreated, editPost, onCancel }) => {
  const { user: currentUser } = useAuth();
  const [draft, setDraft] = useState(() => {
    if (editPost) return (editPost.tagline || '') + (editPost.content ? '\n' + editPost.content : '');
    return '';
  });
  const [customCss] = useState(editPost?.custom_css || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedTribes, setSelectedTribes] = useState([]);
  const [allTribes, setAllTribes] = useState([]);
  const [tribeSearch, setTribeSearch] = useState('');
  const [showTribesDropdown, setShowTribesDropdown] = useState(false);
  const [location, setLocation] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);
  const [vibe, setVibe] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [showStickers, setShowStickers] = useState(false);
  const fileInputRef = React.useRef(null);
  const bodyRef = React.useRef(null);
  const titleRef = React.useRef(null);

  // Split draft: line 1 = tagline, rest = body
  const getDraftParts = () => {
    const lines = draft.split('\n');
    return { tagline: lines[0].trim(), body: lines.slice(1).join('\n').trim() };
  };

  // Build HTML content from body (new posts only)
  const buildContent = () => {
    const { body } = getDraftParts();
    if (editPost) return body;
    let html = body
      .replace(/\*\*(.*?)\*\*/g, '<h1>$1</h1>')
      .split('\n').join('<br/>');
    if (location.trim()) html += `<p class="post-location">📍 ${location}</p>`;
    if (vibe) html += `<p class="post-vibe">${vibe}</p>`;
    return html;
  };

  // Insert text at cursor in body textarea (body is draft after first '\n')
  const insertIntoBody = (text) => {
    const ta = bodyRef.current;
    const titlePart = draft.split('\n')[0];
    if (!ta) { setDraft(prev => prev + text); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const bodyVal = draft.split('\n').slice(1).join('\n');
    const newBody = bodyVal.substring(0, start) + text + bodyVal.substring(end);
    setDraft(titlePart + '\n' + newBody);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

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
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!response.ok) throw new Error('Failed to upload image');
      const data = await response.json();
      const imageUrl = `${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}${data.url}`;
      setUploadedImages([...uploadedImages, imageUrl]);
      insertIntoBody(`<img src="${imageUrl}" alt="Uploaded image" style="max-width:100%;" />`);
    } catch (err) {
      setError('Failed to upload image: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Fetch all tribes on mount (sorted by popularity)
  useEffect(() => {
    fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/tribes`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setAllTribes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const addTribe = (tribe) => {
    if (!selectedTribes.find(t => t.id === tribe.id)) setSelectedTribes(prev => [...prev, tribe]);
    setTribeSearch('');
    // Keep dropdown open so user can keep adding tribes
  };

  const removeTribe = (tribeId) => setSelectedTribes(selectedTribes.filter(t => t.id !== tribeId));

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    const { tagline, body } = getDraftParts();
    if (!tagline) { setError('Title is required'); return; }
    if (!body) { setError('Content is required'); return; }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const url = editPost
        ? `${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/${editPost.id}`
        : `${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts`;
      const response = await fetch(url, {
        method: editPost ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          tagline,
          content: buildContent(),
          customCss,
          tribeIds: selectedTribes.map(t => t.id)
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save post');
      }

      setDraft('');
      setSelectedTribes([]);
      setLocation('');
      setVibe('');
      setPrivacy('public');
      if (onPostCreated) onPostCreated();
      if (onCancel) onCancel();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const { tagline: draftTagline, body: draftBody } = getDraftParts();
  const canPost = draftTagline && draftBody && !currentUser?.is_banned && !currentUser?.is_muted;

  const filteredTribes = allTribes.filter(t =>
    !selectedTribes.find(s => s.id === t.id) &&
    (tribeSearch === '' || t.name.toLowerCase().includes(tribeSearch.toLowerCase()) ||
      (t.tag && t.tag.toLowerCase().includes(tribeSearch.toLowerCase())))
  );

  const filteredLocations = location.length >= 2
    ? WORLD_LOCATIONS.filter(l => l.toLowerCase().includes(location.toLowerCase())).slice(0, 20)
    : [];

  return (
    <div className="post-composer">
      {error && <div className="composer-error">{error}</div>}

      {/* Header: Write a post! + vibe */}
      <div className="composer-topbar">
        <span className="composer-heading">Write a post!</span>
        <div style={{ flex: 1 }} />
        <select className="composer-vibe-select" value={vibe} onChange={e => setVibe(e.target.value)}>
          <option value="">vibe…</option>
          {COMPOSER_VIBES.map(v => (
            <option key={v.emoji} value={`${v.emoji} ${v.label}`}>{v.emoji} {v.label}</option>
          ))}
        </select>
      </div>

      {/* Avatar + split title/body inputs */}
      <div className="composer-input-row">
        <div className="composer-avatar-wrap">
          {currentUser?.profile_picture
            ? <img src={currentUser.profile_picture} alt="" className="composer-avatar" />
            : <div className="composer-avatar-placeholder" />}
        </div>
        <div className="composer-fields">
          <input
            ref={titleRef}
            className="composer-title-input"
            placeholder="Title…"
            value={draft.split('\n')[0]}
            onChange={e => setDraft(e.target.value + '\n' + draft.split('\n').slice(1).join('\n'))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); bodyRef.current?.focus(); } }}
          />
          <textarea
            ref={bodyRef}
            className="composer-draft"
            placeholder="What's on your mind?"
            value={draft.split('\n').slice(1).join('\n')}
            onChange={e => setDraft(draft.split('\n')[0] + '\n' + e.target.value)}
            rows={3}
            onClick={() => { if (!draft.split('\n')[0]) titleRef.current?.focus(); }}
          />
        </div>
      </div>

      {/* Action row: upload | sticker | → post */}
      <div className="composer-actions">
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*,video/*" style={{ display: 'none' }} />
        <button type="button" className="composer-btn" title="Stickers" onClick={() => setShowStickers(s => !s)}>
          🫧
        </button>
        <button type="button" className="composer-btn" title="Upload" onClick={() => fileInputRef.current?.click()}>
          {uploading ? '⌛' : '📎'}
        </button>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="composer-btn composer-post-btn"
          onClick={handleSubmit}
          disabled={!canPost || loading}
          title="Post"
        >
          {loading ? '⌛' : '→'}
        </button>
      </div>

      {/* Sticker panel */}
      {showStickers && (
        <div className="composer-sticker-panel">
          {COMPOSER_STICKERS.map(s => (
            <button key={s} type="button" className="sticker-btn" onClick={() => { insertIntoBody(s); setShowStickers(false); }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Metadata row: tribes | location */}
      <div className="composer-meta">
        {/* Tribe searchable dropdown */}
        <div className="composer-tribes-wrap">
          <span className="composer-meta-icon">#</span>
          <input
            className="composer-meta-input"
            placeholder="tribe"
            value={tribeSearch}
            onChange={e => { setTribeSearch(e.target.value); setShowTribesDropdown(true); }}
            onFocus={() => setShowTribesDropdown(true)}
            onBlur={() => setTimeout(() => setShowTribesDropdown(false), 150)}
          />
          {showTribesDropdown && filteredTribes.length > 0 && (
            <div className="composer-tribe-dropdown">
              {filteredTribes.map(tribe => (
                <div key={tribe.id} className="composer-tribe-option" onMouseDown={() => addTribe(tribe)}>
                  <TribeIcon icon={tribe.icon} size={18} />
                  <span>{tribe.name}</span>
                  {tribe.member_count > 0 && <span className="composer-tribe-count">{tribe.member_count}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Location searchable dropdown */}
        <div className="composer-location-wrap">
          <span className="composer-meta-icon">📍</span>
          <input
            className="composer-meta-input"
            placeholder="location"
            value={location}
            onChange={e => { setLocation(e.target.value); setLocationOpen(true); }}
            onFocus={() => setLocationOpen(true)}
            onBlur={() => setTimeout(() => setLocationOpen(false), 150)}
          />
          {locationOpen && filteredLocations.length > 0 && (
            <div className="composer-location-dropdown">
              {filteredLocations.map(loc => (
                <div key={loc} className="composer-location-option" onMouseDown={() => { setLocation(loc); setLocationOpen(false); }}>
                  {loc}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Privacy row — full width with label */}
      <div className="composer-privacy-row">
        <label className="composer-privacy-label">Privacy</label>
        <select className="composer-privacy-select" value={privacy} onChange={e => setPrivacy(e.target.value)}>
          <option value="public">🌍 public</option>
          <option value="mutuals">👥 mutuals</option>
          <option value="private">🔒 private</option>
        </select>
      </div>

      {/* Selected tribe chips */}
      {selectedTribes.length > 0 && (
        <div className="composer-selected-tribes">
          {selectedTribes.map(tribe => (
            <span key={tribe.id} className="composer-tribe-chip" style={{ background: tribe.color || '#667eea' }}>
              <TribeIcon icon={tribe.icon} size={12} />
              {tribe.name}
              <button type="button" onClick={() => removeTribe(tribe.id)}>×</button>
            </span>
          ))}
        </div>
      )}

      {onCancel && (
        <div className="composer-footer">
          <button type="button" className="composer-cancel" onClick={onCancel}>Cancel</button>
        </div>
      )}
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

  // Extract location/vibe from content HTML, leave clean content for rendering
  const [cleanContent, postLocation, postVibe] = React.useMemo(() => {
    const div = document.createElement('div');
    div.innerHTML = post.content || '';
    const locEl = div.querySelector('.post-location');
    const vibeEl = div.querySelector('.post-vibe');
    const loc = locEl ? locEl.textContent.trim() : '';
    const vib = vibeEl ? vibeEl.textContent.trim() : '';
    if (locEl) locEl.remove();
    if (vibeEl) vibeEl.remove();
    return [div.innerHTML, loc, vib];
  }, [post.content]);

  // Interaction state
  const [liked, setLiked] = useState(!!post.user_liked);
  const [favorited, setFavorited] = useState(!!post.user_favorited);
  const [reposted, setReposted] = useState(!!post.user_reposted);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [favoriteCount, setFavoriteCount] = useState(post.favorite_count || 0);
  const [repostCount, setRepostCount] = useState(post.repost_count || 0);

  const handleToggleLike = async () => {
    if (!currentUser) return;
    // Optimistic update
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
        setLikeCount(data.like_count);
      }
    } catch (err) {
      // Revert on error
      setLiked(liked);
      setLikeCount(post.like_count || 0);
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentUser) return;
    setFavorited(!favorited);
    setFavoriteCount(prev => favorited ? prev - 1 : prev + 1);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/${post.id}/favorite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFavorited(data.favorited);
        setFavoriteCount(data.favorite_count);
      }
    } catch (err) {
      setFavorited(favorited);
      setFavoriteCount(post.favorite_count || 0);
    }
  };

  const handleToggleRepost = async () => {
    if (!currentUser) return;
    setReposted(!reposted);
    setRepostCount(prev => reposted ? prev - 1 : prev + 1);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/posts/${post.id}/repost`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReposted(data.reposted);
        setRepostCount(data.repost_count);
      }
    } catch (err) {
      setReposted(reposted);
      setRepostCount(post.repost_count || 0);
    }
  };



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
      } else {
        const data = await response.json().catch(() => ({}));
        if (data.code === 'BANNED') alert('Your account is restricted. You cannot post.');
        else if (data.code === 'MUTED') alert('Your account is muted. You cannot post.');
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
    <div className="card" style={{ marginBottom: '20px', overflow: 'hidden', padding: 0 }}>
      {post.reposter_username && (
        <div style={{ padding: '8px 15px', background: '#f8f9fa', borderBottom: '1px solid #eee', fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '14px' }}>🔄</span>
          <span>Reposted by <strong>@{post.reposter_username}</strong></span>
        </div>
      )}
      <div style={{ padding: '20px' }}>
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

        {/* Tribe Tags + location + vibe */}
        {(post.tribes?.length > 0 || postLocation || postVibe) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px', marginTop: '5px', alignItems: 'center' }}>
            {post.tribes?.map(tribe => (
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
            {postLocation && (
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#f0f4ff', color: '#555', fontWeight: '500' }}>
                {postLocation}
              </span>
            )}
            {postVibe && (
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#fff8f0', color: '#b06000', fontWeight: '500' }}>
                {postVibe}
              </span>
            )}
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
            dangerouslySetInnerHTML={{ __html: cleanContent }}
            style={{ lineHeight: '1.6' }}
          />
        </div>


        {/* Post Actions */}
        <div className="post-actions">
          <button
            onClick={handleToggleLike}
            title={liked ? "Unlike" : "Like"}
            className={`interaction-btn ${liked ? 'liked' : ''}`}
          >
            {liked ? '❤️' : '🤍'} {likeCount || 0}
          </button>

          <button
            onClick={handleToggleRepost}
            title={reposted ? "Undo Repost" : "Repost"}
            className={`interaction-btn ${reposted ? 'reposted' : ''}`}
          >
            {reposted ? '🔄' : '🔃'} {repostCount || 0}
          </button>

          <button
            onClick={handleToggleFavorite}
            title={favorited ? "Unfavorite" : "Favorite"}
            className={`interaction-btn ${favorited ? 'favorited' : ''}`}
          >
            {favorited ? '⭐' : '☆'} {favoriteCount || 0}
          </button>

          <button
            onClick={handleToggleComments}
            className="interaction-btn"
            style={{ color: '#667eea' }}
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
            className="interaction-btn"
            style={{ color: '#667eea' }}
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
                      onChange={(e) => { if (!currentUser?.is_banned && !currentUser?.is_muted) setNewComment(e.target.value); }}
                      placeholder={currentUser?.is_banned ? 'Your account is restricted.' : currentUser?.is_muted ? 'You are muted.' : 'Write a comment...'}
                      disabled={currentUser?.is_banned || currentUser?.is_muted}
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
                      disabled={submittingComment || !newComment.trim() || currentUser?.is_banned || currentUser?.is_muted}
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
  const canManageMembership = currentUser && (
    currentUser.role === 'admin' ||
    ['eve', 'evepanzarino', 'belonging'].includes(currentUser.username) ||
    ['eve', 'evepanzarino', 'belonging'].includes(currentUser.handle)
  );

  const handleToggleMembership = async () => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = !profile.is_member;
      const res = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/users/${profile.id}/member`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_member: newStatus })
      });
      if (res.ok) {
        setProfile(prev => ({ ...prev, is_member: newStatus }));
      }
    } catch (e) {
      console.error('Toggle membership error:', e);
    }
  };

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

        {profile.is_member && (
          <span style={{
            display: 'inline-block', background: 'linear-gradient(135deg,#667eea,#764ba2)',
            color: 'white', fontSize: '12px', fontWeight: 600, borderRadius: '20px',
            padding: '3px 12px', marginBottom: '8px'
          }}>⭐ Member</span>
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
              {canManageMembership && !isOwner && (
                <button
                  onClick={handleToggleMembership}
                  style={{
                    background: profile.is_member ? '#ef4444' : '#22c55e',
                    color: 'white', border: 'none', borderRadius: 6,
                    padding: '8px 16px', cursor: 'pointer', fontWeight: 600
                  }}
                >
                  {profile.is_member ? 'Revoke Member' : 'Grant Member'}
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
          <div className="profile-posts-grid">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                isOwner={isOwner}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
              />
            ))}
          </div>
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
      {/* Feed Tabs — above composer */}
      <div className="feed-tabs-row">
        <button className={`feed-tab${activeTab === 'global' ? ' active' : ''}`} onClick={() => setActiveTab('global')}>Global</button>
        {currentUser && (
          <button className={`feed-tab${activeTab === 'personal' ? ' active' : ''}`} onClick={() => setActiveTab('personal')}>Mutuals</button>
        )}
        <button className={`feed-tab${activeTab === 'updates' ? ' active' : ''}`} onClick={() => setActiveTab('updates')}>Updates</button>
        {currentUser && (
          <button className="feed-tab feed-tab-plus" onClick={() => { setActiveTab('global'); setTimeout(() => document.querySelector('.composer-draft')?.focus(), 100); }} title="Write a post">+</button>
        )}
      </div>

      {/* Post Editor */}
      {currentUser && (activeTab !== 'updates' || currentUser.username === 'belonging') && (
        <div style={{ marginTop: '16px' }}>
          <PostEditor
            onPostCreated={handlePostCreated}
            editPost={editingPost}
            onCancel={() => { setEditingPost(null); }}
          />
        </div>
      )}

      {/* Posts grid */}
      <div className="feed-grid">
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
            {activeTab === 'updates' ? 'No updates yet.' : 'No posts yet. Be the first to post!'}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', position: 'relative' }}>
                <TribeIcon icon={tribe.icon} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0 }}>{tribe.name}</h3>
                    <TribeFlagStrip icon={tribe.icon} height={14} style={{ marginLeft: 8, flexShrink: 0 }} />
                  </div>
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
const DEFAULT_TRIBE_ICONS = [
  'people', 'heart', 'star', 'chat', 'game', 'book',
  'music', 'art', 'globe', 'flower', 'shield', 'home',
  'flame', 'crown', 'sparkle', 'rainbow', 'moon', 'butterfly',
];

const CreateTribePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#667eea');
  const [selectedIcon, setSelectedIcon] = useState('tribe-icons/people.svg');
  const [iconUploading, setIconUploading] = useState(false);
  const [selectedFlags, setSelectedFlags] = useState([]);
  const [flagSearch, setFlagSearch] = useState('');
  const [showFlagDropdown, setShowFlagDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredFlags = PRIDE_FLAGS.filter(f =>
    f.label.toLowerCase().includes(flagSearch.toLowerCase())
  );

  const toggleFlag = (file) => {
    const val = `flags/${file}`;
    setSelectedFlags(prev =>
      prev.includes(val) ? prev.filter(f => f !== val) : [...prev, val]
    );
  };

  const handleIconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIconUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSelectedIcon(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setIconUploading(false);
    }
  };

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
        body: JSON.stringify({ name, tag, description, color, icon: JSON.stringify({ img: selectedIcon, flags: selectedFlags }) })
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            {DEFAULT_TRIBE_ICONS.map(iconName => {
              const val = `tribe-icons/${iconName}.svg`;
              const selected = selectedIcon === val;
              return (
                <button
                  key={iconName}
                  type="button"
                  title={iconName}
                  onClick={() => setSelectedIcon(val)}
                  style={{
                    width: 52, height: 52, padding: 4, border: '2px solid',
                    borderColor: selected ? color : '#ddd',
                    borderRadius: 10, cursor: 'pointer',
                    background: selected ? `${color}18` : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <img src={`${BASE_PATH}/${val}`} alt={iconName} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                </button>
              );
            })}
            {/* Custom uploaded icon shown if not a default */}
            {selectedIcon && !selectedIcon.startsWith('tribe-icons/') && (
              <div style={{
                width: 52, height: 52, padding: 4, border: `2px solid ${color}`,
                borderRadius: 10, background: `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src={selectedIcon.startsWith('/') ? selectedIcon : `${BASE_PATH}/${selectedIcon}`} alt="custom" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4 }} />
              </div>
            )}
          </div>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            cursor: iconUploading ? 'wait' : 'pointer',
            background: '#f5f5f5', border: '1px solid #ddd',
            borderRadius: 8, padding: '6px 14px', fontSize: 13,
          }}>
            {iconUploading ? 'Uploading...' : '⬆ Upload custom icon'}
            <input type="file" accept="image/*" onChange={handleIconUpload} style={{ display: 'none' }} disabled={iconUploading} />
          </label>
          <small style={{ color: '#888', display: 'block', marginTop: 4 }}>Pick a default icon or upload your own image.</small>
        </div>

        <div className="form-group">
          <label>Flags</label>

          {/* Selected flags chips */}
          {selectedFlags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {selectedFlags.map(val => {
                const file = val.replace('flags/', '');
                const meta = PRIDE_FLAGS.find(f => f.file === file);
                return (
                  <span key={val} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: color, color: 'white',
                    borderRadius: '20px', padding: '3px 8px 3px 4px',
                    fontSize: '12px', fontWeight: 500,
                  }}>
                    <img src={`${BASE_PATH}/${val}`} alt="" style={{ width: 24, height: 16, objectFit: 'cover', borderRadius: 2 }} />
                    {meta ? meta.label : file}
                    <button
                      type="button"
                      onClick={() => toggleFlag(file)}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0 0 0 2px', fontSize: '14px', lineHeight: 1 }}
                    >×</button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Search input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={flagSearch}
              onChange={e => { setFlagSearch(e.target.value); setShowFlagDropdown(true); }}
              onFocus={() => setShowFlagDropdown(true)}
              onBlur={() => setTimeout(() => setShowFlagDropdown(false), 150)}
              placeholder="Search flags (e.g. Bisexual, Trans, Non-Binary...)"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />

            {/* Dropdown */}
            {showFlagDropdown && filteredFlags.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'white', border: '1px solid #ddd', borderRadius: '6px',
                maxHeight: '280px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                {filteredFlags.map(({ file, label }) => {
                  const val = `flags/${file}`;
                  const selected = selectedFlags.includes(val);
                  return (
                    <button
                      key={file}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); toggleFlag(file); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        width: '100%', padding: '8px 12px', border: 'none',
                        background: selected ? `${color}18` : 'white',
                        cursor: 'pointer', textAlign: 'left',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <img src={`${BASE_PATH}/${val}`} alt={label} style={{ width: 36, height: 24, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '14px' }}>{label}</span>
                      {selected && <span style={{ color, fontWeight: 'bold', fontSize: '16px' }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <small style={{ color: '#888' }}>Select as many flags as you'd like to represent your tribe.</small>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
            <TribeIcon icon={JSON.stringify({ img: selectedIcon, flags: selectedFlags })} size={48} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>{name || 'Tribe Name'}</h3>
                <TribeFlagStrip icon={JSON.stringify({ img: selectedIcon, flags: selectedFlags })} height={14} style={{ marginLeft: 8, flexShrink: 0 }} />
              </div>
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
            <TribeIcon icon={tribe.icon} size={64} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: '0 0 5px' }}>{tribe.name}</h1>
                <TribeFlagStrip icon={tribe.icon} height={18} style={{ marginBottom: 5 }} />
              </div>
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
          <TribeIcon icon={tribe.icon} size={20} />
          <span>#{tribe.tag}</span>
          {tribe.role === 'owner' && <span>👑</span>}
        </Link>
      ))}
    </div>
  );
};

// ── MessageAttachment ────────────────────────────────────────────────────────
const MessageAttachment = ({ att }) => {
  const { file_url, file_name, file_type, file_size } = att;
  const src = file_url.startsWith('http') ? file_url : `${window.location.origin}${file_url}`;
  if (file_type && file_type.startsWith('image/')) {
    return (
      <img
        src={src}
        alt={file_name}
        className="msg-attachment-img"
        onClick={() => window.open(src, '_blank')}
      />
    );
  }
  if (file_type && file_type.startsWith('video/')) {
    return <video src={src} controls className="msg-attachment-video" />;
  }
  if (file_type && file_type.startsWith('audio/')) {
    return <audio src={src} controls className="msg-attachment-audio" />;
  }
  const sizeMb = file_size ? (file_size / (1024 * 1024)).toFixed(1) : '?';
  return (
    <a href={src} download={file_name} target="_blank" rel="noreferrer" className="msg-attachment-file">
      <span>📎</span>
      <div>
        <div className="msg-attachment-filename">{file_name}</div>
        <div className="msg-attachment-size">{sizeMb} MB</div>
      </div>
    </a>
  );
};

// ── MessageGallery ────────────────────────────────────────────────────────────
const MessageGallery = ({ attachments, layout }) => {
  const images = attachments.filter(a => a.file_type && a.file_type.startsWith('image/'));
  const others = attachments.filter(a => !a.file_type || !a.file_type.startsWith('image/'));
  const galleryClass = images.length <= 1 ? 'msg-gallery msg-gallery-single' : `msg-gallery msg-gallery-${layout || 'auto'}`;
  return (
    <>
      {images.length > 0 && (
        <div className={galleryClass}>
          {images.map(att => {
            const src = att.file_url.startsWith('http') ? att.file_url : `${window.location.origin}${att.file_url}`;
            return (
              <img
                key={att.id}
                src={src}
                alt={att.file_name}
                className="msg-gallery-img"
                onClick={() => window.open(src, '_blank')}
              />
            );
          })}
        </div>
      )}
      {others.map(att => <MessageAttachment key={att.id} att={att} />)}
    </>
  );
};

// ── LinkEmbed ────────────────────────────────────────────────────────────────
const LinkEmbed = ({ url }) => {
  const [embed, setEmbed] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const apiBase = `${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}`;
    fetch(`${apiBase}/api/embed/preview?url=${encodeURIComponent(url)}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setEmbed(data); })
      .catch(() => {});
    return () => controller.abort();
  }, [url]);

  // YouTube embed
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
  if (ytMatch) {
    return (
      <div className="link-embed-video">
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          width="360" height="202" frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen title="YouTube"
        />
      </div>
    );
  }

  // Vimeo embed
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return (
      <div className="link-embed-video">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          width="360" height="202" frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen title="Vimeo"
        />
      </div>
    );
  }

  if (!embed) return null;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="link-embed-card">
      {embed.image && <img src={embed.image} alt="" className="link-embed-image" />}
      <div className="link-embed-body">
        {embed.site_name && <div className="link-embed-site">{embed.site_name}</div>}
        {embed.title && <div className="link-embed-title">{embed.title}</div>}
        {embed.description && <div className="link-embed-desc">{embed.description.slice(0, 120)}{embed.description.length > 120 ? '…' : ''}</div>}
      </div>
    </a>
  );
};

// ── Sticker system ───────────────────────────────────────────────────────────
// Stickers are defined as named shortcodes mapped to image paths in /stickers/
const STICKERS = [
  { name: 'heart', label: '❤️ heart', shortcode: ':heart:', emoji: '❤️' },
  { name: 'sparkles', label: '✨ sparkles', shortcode: ':sparkles:', emoji: '✨' },
  { name: 'rainbow', label: '🌈 rainbow', shortcode: ':rainbow:', emoji: '🌈' },
  { name: 'trans', label: '⚧ trans', shortcode: ':trans:', emoji: '⚧️' },
  { name: 'pride', label: '🏳️‍🌈 pride', shortcode: ':pride:', emoji: '🏳️‍🌈' },
  { name: 'hug', label: '🤗 hug', shortcode: ':hug:', emoji: '🤗' },
  { name: 'celebrate', label: '🎉 celebrate', shortcode: ':celebrate:', emoji: '🎉' },
  { name: 'wave', label: '👋 wave', shortcode: ':wave:', emoji: '👋' },
];

const SHORTCODE_REGEX = /:(\w+):/g;

function renderMessageWithStickers(text) {
  if (!text) return null;
  const parts = [];
  let lastIndex = 0;
  let match;
  SHORTCODE_REGEX.lastIndex = 0;
  while ((match = SHORTCODE_REGEX.exec(text)) !== null) {
    const sticker = STICKERS.find(s => s.name === match[1]);
    if (sticker) {
      if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
      parts.push(
        <span key={match.index} className="sticker-inline" title={sticker.shortcode}>
          {sticker.emoji}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
}

const StickerPicker = ({ onSelect, onClose }) => (
  <div className="sticker-picker">
    <div className="sticker-picker-header">
      <span>Stickers</span>
      <button onClick={onClose} className="sticker-picker-close">×</button>
    </div>
    <div className="sticker-picker-grid">
      {STICKERS.map(s => (
        <button
          key={s.name}
          className="sticker-pick-btn"
          title={s.shortcode}
          onClick={() => { onSelect(s.shortcode); onClose(); }}
        >
          <span className="sticker-pick-emoji">{s.emoji}</span>
          <span className="sticker-pick-label">{s.name}</span>
        </button>
      ))}
    </div>
  </div>
);

// ── WebRTC CallManager ───────────────────────────────────────────────────────
const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const callBtnStyle = (bg) => ({
  background: bg, color: 'white', border: 'none', borderRadius: 50,
  padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minWidth: 80
});

const CallManager = () => {
  const { user } = useAuth();
  const [callState, setCallState] = useState(null); // null | 'incoming' | 'outgoing' | 'connected'
  const [callType, setCallType] = useState('audio');
  const [remoteUser, setRemoteUser] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const endCall = useCallback((notifyRemote = true) => {
    if (notifyRemote && remoteUser) {
      getSocket().emit('call-end', { targetUserId: remoteUser.id });
    }
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setCallState(null);
    setRemoteUser(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
  }, [remoteUser]);

  const initPeer = useCallback((targetUser) => {
    const peer = new RTCPeerConnection(STUN_SERVERS);
    peer.onicecandidate = (e) => {
      if (e.candidate && targetUser) {
        getSocket().emit('ice-candidate', { targetUserId: targetUser.id, candidate: e.candidate });
      }
    };
    peer.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0];
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
    };
    peerRef.current = peer;
    return peer;
  }, []);

  useEffect(() => {
    if (!user) return;
    const sock = getSocket();

    const onCallOffer = ({ fromUserId, offer, callType: ct }) => {
      pendingOfferRef.current = offer;
      setRemoteUser({ id: fromUserId });
      setCallType(ct || 'audio');
      setCallState('incoming');
    };
    const onCallAnswer = async ({ answer }) => {
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pendingCandidatesRef.current) {
          try { await peerRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch(e) {}
        }
        pendingCandidatesRef.current = [];
        setCallState('connected');
      }
    };
    const onIceCandidate = async ({ candidate }) => {
      if (!candidate) return;
      if (peerRef.current?.remoteDescription) {
        try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch(e) {}
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    };
    const onCallEnd = () => endCall(false);
    const onCallDecline = () => { setCallState(null); setRemoteUser(null); };

    sock.on('call-offer', onCallOffer);
    sock.on('call-answer', onCallAnswer);
    sock.on('ice-candidate', onIceCandidate);
    sock.on('call-end', onCallEnd);
    sock.on('call-decline', onCallDecline);

    // Listen to event bus for outgoing calls
    const handleBusEvent = async ({ targetUser, type }) => {
      setRemoteUser(targetUser);
      setCallType(type || 'audio');
      setCallState('outgoing');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' }).catch(() => null);
      if (!stream) { setCallState(null); return; }
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const peer = initPeer(targetUser);
      stream.getTracks().forEach(t => peer.addTrack(t, stream));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      getSocket().emit('call-offer', { targetUserId: targetUser.id, offer, callType: type });
    };

    callEventBus.on(handleBusEvent);

    return () => {
      sock.off('call-offer', onCallOffer);
      sock.off('call-answer', onCallAnswer);
      sock.off('ice-candidate', onIceCandidate);
      sock.off('call-end', onCallEnd);
      sock.off('call-decline', onCallDecline);
      callEventBus.off(handleBusEvent);
    };
  }, [user, endCall, initPeer]);

  const acceptCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' }).catch(() => null);
    if (!stream) return;
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const peer = initPeer(remoteUser);
    stream.getTracks().forEach(t => peer.addTrack(t, stream));
    await peer.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
    for (const c of pendingCandidatesRef.current) {
      try { await peer.addIceCandidate(new RTCIceCandidate(c)); } catch(e) {}
    }
    pendingCandidatesRef.current = [];
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    getSocket().emit('call-answer', { targetUserId: remoteUser.id, answer });
    setCallState('connected');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(m => !m);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsCameraOff(c => !c);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (peerRef.current) {
          const sender = peerRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }
        screenTrack.onended = () => toggleScreenShare();
        setIsScreenSharing(true);
      } catch (e) { console.error('Screenshare error:', e); }
    } else {
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (peerRef.current && camTrack) {
        const sender = peerRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(camTrack);
      }
      setIsScreenSharing(false);
    }
  };

  if (!callState) return null;

  return (
    <div className="call-overlay">
      {/* Hidden audio element — always present so remote audio plays even before video mounts */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      {/* Remote video — full-screen background when connected */}
      {callState === 'connected' && (
        <video
          ref={(el) => { remoteVideoRef.current = el; if (el && remoteStreamRef.current) el.srcObject = remoteStreamRef.current; }}
          autoPlay playsInline className="call-remote-video"
        />
      )}
      {/* Local video — picture-in-picture */}
      {(callState === 'connected' || callState === 'outgoing') && callType === 'video' && (
        <video
          ref={(el) => { localVideoRef.current = el; if (el && localStreamRef.current) el.srcObject = localStreamRef.current; }}
          autoPlay playsInline muted className="call-local-video"
        />
      )}

      <div className="call-info">
        <div className="call-icon">{callType === 'video' ? '📹' : '📞'}</div>
        <h2 className="call-name">{remoteUser?.username ? `@${remoteUser.username}` : 'Connecting...'}</h2>
        <p className="call-status">
          {callState === 'incoming' ? 'Incoming call…'
            : callState === 'outgoing' ? 'Calling…'
            : callType === 'video' ? 'Video call' : 'Audio call'}
        </p>
        {callState === 'outgoing' && (
          <p className="call-note">Note: Calls use peer-to-peer connection. May not work on all networks.</p>
        )}
      </div>

      <div className="call-controls">
        {callState === 'incoming' ? (
          <>
            <button onClick={acceptCall} style={callBtnStyle('#22c55e')}>Accept</button>
            <button
              onClick={() => { getSocket().emit('call-decline', { targetUserId: remoteUser?.id }); endCall(false); }}
              style={callBtnStyle('#ef4444')}
            >Decline</button>
          </>
        ) : (
          <>
            <button onClick={toggleMute} style={callBtnStyle(isMuted ? '#ef4444' : '#374151')}>
              {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
            </button>
            {callType === 'video' && (
              <>
                <button onClick={toggleCamera} style={callBtnStyle(isCameraOff ? '#ef4444' : '#374151')}>
                  {isCameraOff ? '📷 On' : '📷 Off'}
                </button>
                <button onClick={toggleScreenShare} style={callBtnStyle(isScreenSharing ? '#8b5cf6' : '#374151')}>
                  {isScreenSharing ? '⬛ Stop Share' : '🖥️ Share'}
                </button>
              </>
            )}
            <button onClick={() => endCall(true)} style={callBtnStyle('#ef4444')}>📵 End</button>
          </>
        )}
      </div>
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
  const [attachments, setAttachments] = useState([]); // pre-uploaded attachments
  const [galleryLayout, setGalleryLayout] = useState('auto');
  const [uploading, setUploading] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const messagesEndRef = React.useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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

        // Smart scroll: only scroll to bottom if already near the bottom
        const container = messagesEndRef.current?.parentElement;
        const isNearBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight < 100) : true;

        setMessages(data.messages);
        setParticipants(data.participants);
        if (isNearBottom) {
          setTimeout(scrollToBottom, 100);
        }
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
    if (!selectedConversation) return;

    fetchMessages(selectedConversation);

    const sock = getSocket();
    sock.emit('join-conversation', selectedConversation);

    const handleNewMessage = (msg) => {
      if (msg.conversation_id === selectedConversation) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        fetchConversations();
      }
    };
    const handleTypingStart = ({ userId }) => {
      if (userId !== user?.id) setOtherUserTyping(true);
    };
    const handleTypingStop = ({ userId }) => {
      if (userId !== user?.id) setOtherUserTyping(false);
    };

    sock.on('new-message', handleNewMessage);
    sock.on('typing-start', handleTypingStart);
    sock.on('typing-stop', handleTypingStop);

    return () => {
      sock.off('new-message', handleNewMessage);
      sock.off('typing-start', handleTypingStart);
      sock.off('typing-stop', handleTypingStop);
    };
  }, [selectedConversation, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/messages/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!response.ok) {
        const err = await response.json();
        alert(err.error || 'Upload failed');
        return;
      }
      const data = await response.json();
      setAttachments(prev => [...prev, data]);
    } catch (error) {
      console.error('File upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0) || sending || !selectedConversation) return;

    setSending(true);
    // Stop typing indicator
    clearTimeout(typingTimeoutRef.current);
    getSocket().emit('typing-stop', { conversationId: selectedConversation });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/messages/conversations/${selectedConversation}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newMessage,
          attachment_ids: attachments.map(a => a.attachmentId),
          gallery_layout: attachments.filter(a => a.file_type && a.file_type.startsWith('image/')).length > 1 ? galleryLayout : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Server also emits via Socket.io; add locally to avoid duplicate via de-dupe in socket handler
        setMessages(prev => prev.find(m => m.id === data.message.id) ? prev : [...prev, data.message]);
        setNewMessage('');
        setAttachments([]);
        setGalleryLayout('auto');
        fetchConversations();
      } else {
        const data = await response.json().catch(() => ({}));
        if (data.code === 'BANNED') alert('Your account is restricted. You cannot send messages.');
        else if (data.code === 'MUTED') alert('Your account is muted. You cannot send messages.');
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
              {participants.length > 0 && (
                <div className="chat-call-buttons">
                  <button
                    title="Audio call"
                    className="call-icon-btn"
                    onClick={() => callEventBus.emit({ targetUser: participants[0], type: 'audio' })}
                  >📞</button>
                  <button
                    title="Video call"
                    className="call-icon-btn"
                    onClick={() => callEventBus.emit({ targetUser: participants[0], type: 'video' })}
                  >📹</button>
                </div>
              )}
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
                    {msg.content && <p>{renderMessageWithStickers(msg.content)}</p>}
                    {(msg.attachments || []).length > 0 && (
                      <MessageGallery attachments={msg.attachments} layout={msg.gallery_layout} />
                    )}
                    {msg.content && detectUrls(msg.content).map(url => (
                      <LinkEmbed key={url} url={url} />
                    ))}
                    <span className="message-time">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {otherUserTyping && (
                <div className="typing-indicator">
                  <span className="typing-dots"><span/><span/><span/></span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview strip */}
            {attachments.length > 0 && (
              <div className="attachment-preview-strip">
                {attachments.filter(a => a.file_type && a.file_type.startsWith('image/')).length > 1 && (
                  <div className="gallery-layout-picker">
                    <span className="gallery-layout-label">Layout:</span>
                    {[
                      { value: 'auto', label: 'Auto' },
                      { value: '2col', label: '2 col' },
                      { value: '3col', label: '3 col' },
                      { value: '4col', label: '4 col' },
                      { value: '2row', label: '2 row' },
                      { value: '3row', label: '3 row' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`gallery-layout-btn${galleryLayout === opt.value ? ' active' : ''}`}
                        onClick={() => setGalleryLayout(opt.value)}
                      >{opt.label}</button>
                    ))}
                  </div>
                )}
                {attachments.map((att, i) => (
                  <div key={i} className="attachment-preview-item">
                    {att.file_type && att.file_type.startsWith('image/') ? (
                      <img src={att.file_url} alt={att.file_name} />
                    ) : (
                      <div className="attachment-preview-file">
                        <span>📎</span>
                        <span className="attachment-preview-name">{att.file_name}</span>
                      </div>
                    )}
                    <button
                      className="attachment-remove-btn"
                      onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            {showStickerPicker && (
              <StickerPicker
                onSelect={(shortcode) => setNewMessage(prev => prev + shortcode)}
                onClose={() => setShowStickerPicker(false)}
              />
            )}
            <form onSubmit={handleSendMessage} className="message-input-form">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="attach-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Attach file"
              >{uploading ? '⏳' : '📎'}</button>
              <button
                type="button"
                className="attach-btn"
                onClick={() => setShowStickerPicker(prev => !prev)}
                title="Stickers"
              >🎨</button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  if (user?.is_banned || user?.is_muted) return;
                  setNewMessage(e.target.value);
                  const sock = getSocket();
                  sock.emit('typing-start', { conversationId: selectedConversation });
                  clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => {
                    sock.emit('typing-stop', { conversationId: selectedConversation });
                  }, 2000);
                }}
                placeholder={user?.is_banned ? 'Your account is restricted.' : user?.is_muted ? 'You are muted — you cannot send messages.' : 'Type a message...'}
                disabled={user?.is_banned || user?.is_muted}
                className="message-input"
              />
              <button
                type="submit"
                disabled={sending || user?.is_banned || user?.is_muted || (!newMessage.trim() && attachments.length === 0)}
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
const XpDrops = () => {
  const { user } = useAuth();
  const [drops, setDrops] = useState([]);
  const displayedIds = useRef(new Set());

  const fetchRecentXp = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/skills/recent-xp`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const now = new Date();
        const newDrops = (Array.isArray(data) ? data : []).filter(item => {
          const key = `${item.skill_name}-${item.xp_gained}-${item.created_at}`;
          if (!displayedIds.current.has(key)) {
            displayedIds.current.add(key);
            return true;
          }
          return false;
        }).map(item => ({
          ...item,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: now
        }));

        if (newDrops.length > 0) {
          setDrops(prev => [...prev, ...newDrops]);
          // Auto remove after 4 seconds
          setTimeout(() => {
            setDrops(prev => prev.filter(d => !newDrops.find(nd => nd.id === d.id)));
          }, 4000);
        }
      }
    } catch (err) {
      console.error('Error fetching recent XP:', err);
    }
  };

  useEffect(() => {
    if (user) {
      const interval = setInterval(fetchRecentXp, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none'
    }}>
      {drops.map(drop => (
        <div key={drop.id} style={{
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '30px',
          fontSize: '14px',
          fontWeight: 'bold',
          animation: 'xpDropFadeIn 0.3s ease-out, xpDropFadeOut 0.5s ease-in 3.5s forwards',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ color: '#ffd700' }}>+{drop.xp_gained}</span>
          <span>{drop.skill_name} XP</span>
          <span style={{ fontSize: '18px' }}>✨</span>
        </div>
      ))}
      <style>{`
        @keyframes xpDropFadeIn {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes xpDropFadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-30px); }
        }
      `}</style>
    </div>
  );
};

// ============================================
// TRENDS PAGE
// ============================================
const TrendsPage = () => {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_PATH}/api/trends?days=${days}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);

  const maxScore = data?.words?.[0]?.score || 1;
  const wordSize = score => (1 + (score / maxScore) * 2).toFixed(2);

  return (
    <div className="trends-page">
      <div className="trends-header">
        <h1>🔥 Trending</h1>
        <div className="trends-period-btns">
          {[[1,'24h'],[7,'7d'],[30,'30d']].map(([d, label]) => (
            <button key={d} className={`btn${days === d ? ' active' : ''}`} onClick={() => setDays(d)}>{label}</button>
          ))}
        </div>
      </div>

      {loading && <p className="trends-loading">Loading trends…</p>}

      {!loading && data && (
        <>
          <section className="trends-section">
            <h2 className="trends-section-title">Trending Words</h2>
            <div className="trends-word-cloud">
              {data.words.length === 0
                ? <p style={{ color: '#888' }}>Not enough posts yet.</p>
                : data.words.map(({ word, score, count }) => (
                    <span key={word} className="trend-word"
                      style={{ fontSize: `${wordSize(score)}rem` }}
                      title={`${count} post${count !== 1 ? 's' : ''} · score ${score}`}>
                      {word}
                    </span>
                  ))
              }
            </div>
          </section>

          <section className="trends-section">
            <h2 className="trends-section-title">Hot Posts</h2>
            {data.posts.length === 0
              ? <p style={{ color: '#888' }}>No posts in this period.</p>
              : (
                <div className="trend-leaderboard">
                  {data.posts.slice(0, 3).map((post, i) => {
                    const medals = ['🥇','🥈','🥉'];
                    const eng = (post.like_count|0) + (post.comment_count|0)*2 + (post.repost_count|0)*3 + (post.favorite_count|0)*2;
                    return (
                      <Link key={post.id} to={`${BASE_PATH}/post/${post.id}`} className={`trend-lb-card trend-lb-rank-${i+1}`}>
                        <div className="trend-lb-medal">{medals[i]}</div>
                        <div className="trend-lb-meta">
                          {post.profile_picture
                            ? <img src={post.profile_picture} alt="" className="trend-avatar" />
                            : <div className="trend-avatar-placeholder" />}
                          <span className="trend-post-user">@{post.username}</span>
                        </div>
                        {post.tagline && <p className="trend-lb-tagline">{post.tagline}</p>}
                        <p className="trend-lb-content">{(post.content || '').replace(/<[^>]*>/g, ' ').trim()}</p>
                        <div className="trend-lb-score">
                          <span className="trend-lb-score-num">{eng}</span>
                          <span className="trend-lb-score-label">pts</span>
                        </div>
                        <div className="trend-post-stats">
                          <span>❤️ {post.like_count}</span>
                          <span>💬 {post.comment_count}</span>
                          <span>🔁 {post.repost_count}</span>
                          <span>⭐ {post.favorite_count}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )
            }
            {data.posts.length > 3 && (
              <div className="trend-ranked-list">
                {data.posts.slice(3).map((post, i) => {
                  const rank = i + 4;
                  const eng = (post.like_count|0) + (post.comment_count|0)*2 + (post.repost_count|0)*3 + (post.favorite_count|0)*2;
                  return (
                    <Link key={post.id} to={`${BASE_PATH}/post/${post.id}`} className="trend-ranked-row">
                      <span className="trend-ranked-num">#{rank}</span>
                      {post.profile_picture
                        ? <img src={post.profile_picture} alt="" className="trend-avatar" />
                        : <div className="trend-avatar-placeholder" />}
                      <div className="trend-ranked-text">
                        <span className="trend-ranked-user">@{post.username}</span>
                        {post.tagline && <span className="trend-ranked-tagline">{post.tagline}</span>}
                      </div>
                      <span className="trend-ranked-score">{eng} pts</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

// ============================================
// MOBILE BOTTOM NAVIGATION
// ============================================
const MobileNav = () => {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <nav className="mobile-nav">
      <Link to={`${BASE_PATH}/feed`} className="mobile-nav-btn">
        <span className="mobile-nav-icon">🏠</span>
        <span className="mobile-nav-label">Feed</span>
      </Link>
      <Link to={`${BASE_PATH}/trends`} className="mobile-nav-btn">
        <span className="mobile-nav-icon">🔥</span>
        <span className="mobile-nav-label">Trends</span>
      </Link>
      <Link to={`${BASE_PATH}/skills`} className="mobile-nav-btn">
        <span className="mobile-nav-icon"><img src={`${process.env.PUBLIC_URL}/images/skills.svg`} alt="Skills" className="mobile-nav-svg" /></span>
        <span className="mobile-nav-label">Skills</span>
      </Link>
      <Link to={`${BASE_PATH}/tribes`} className="mobile-nav-btn">
        <span className="mobile-nav-icon">🏘</span>
        <span className="mobile-nav-label">Tribes</span>
      </Link>
      <Link to={`${BASE_PATH}/messages`} className="mobile-nav-btn">
        <span className="mobile-nav-icon">✉</span>
        <span className="mobile-nav-label">Messages</span>
      </Link>
      <Link to={`${BASE_PATH}/${user.username}`} className="mobile-nav-btn">
        <span className="mobile-nav-icon">👤</span>
        <span className="mobile-nav-label">Profile</span>
      </Link>
    </nav>
  );
};

// ============================================
// RESTRICTED BANNER (shown when user is banned)
// ============================================
const RestrictedBanner = () => {
  const { user } = useAuth();
  if (!user?.is_banned) return null;
  return (
    <div className="account-restricted-banner">
      ⚠ Your account is currently restricted. You can browse content but cannot post or interact.
    </div>
  );
};

// ============================================
// ADMIN PAGE
// ============================================
const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    fetchUsers();
  }, [user, authLoading]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const adminAction = async (userId, action, body) => {
    setSaving(s => ({ ...s, [`${userId}-${action}`]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${window.location.origin}${BASE_PATH === '' ? '' : BASE_PATH}/api/admin/users/${userId}/${action}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Action failed');
      }
    } catch (e) { alert('Request failed'); }
    setSaving(s => ({ ...s, [`${userId}-${action}`]: false }));
  };

  const filtered = users.filter(u =>
    !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <input
        className="admin-search"
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {loading ? <p>Loading...</p> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Member</th>
              <th>Banned</th>
              <th>Muted</th>
              <th>Upload Limit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <AdminUserRow key={u.id} u={u} currentUser={user} adminAction={adminAction} saving={saving} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const AdminUserRow = ({ u, currentUser, adminAction, saving }) => {
  const [limitInput, setLimitInput] = useState(u.upload_limit_mb != null ? String(u.upload_limit_mb) : '');
  const isSelf = u.id === currentUser.id;

  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {u.profile_picture && <img src={u.profile_picture} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />}
          <span>@{u.username}</span>
        </div>
      </td>
      <td>
        <select
          value={u.role}
          disabled={isSelf || (u.handle === 'eve' || u.username === 'eve')}
          onChange={e => adminAction(u.id, 'role', { role: e.target.value })}
          className="admin-role-select"
        >
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td><span style={{ color: u.is_member ? '#27ae60' : '#999' }}>{u.is_member ? 'Yes' : 'No'}</span></td>
      <td><span style={{ color: u.is_banned ? '#e74c3c' : '#999' }}>{u.is_banned ? 'Yes' : 'No'}</span></td>
      <td><span style={{ color: u.is_muted ? '#e67e22' : '#999' }}>{u.is_muted ? 'Yes' : 'No'}</span></td>
      <td>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <input
            type="number"
            min="1"
            placeholder="MB (blank=default)"
            value={limitInput}
            onChange={e => setLimitInput(e.target.value)}
            className="admin-limit-input"
          />
          <button
            className="admin-btn-save"
            disabled={saving[`${u.id}-upload-limit`]}
            onClick={() => adminAction(u.id, 'upload-limit', { upload_limit_mb: limitInput ? parseInt(limitInput) : null })}
          >
            {saving[`${u.id}-upload-limit`] ? '...' : 'Save'}
          </button>
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {!isSelf && (
            <>
              <button
                className={u.is_banned ? 'admin-btn-unban' : 'admin-btn-ban'}
                disabled={saving[`${u.id}-ban`]}
                onClick={() => adminAction(u.id, 'ban', { is_banned: !u.is_banned })}
              >
                {saving[`${u.id}-ban`] ? '...' : u.is_banned ? 'Unban' : 'Ban'}
              </button>
              <button
                className={u.is_muted ? 'admin-btn-unmute' : 'admin-btn-mute'}
                disabled={saving[`${u.id}-mute`]}
                onClick={() => adminAction(u.id, 'mute', { is_muted: !u.is_muted })}
              >
                {saving[`${u.id}-mute`] ? '...' : u.is_muted ? 'Unmute' : 'Mute'}
              </button>
            </>
          )}
          {isSelf && <span style={{ color: '#aaa', fontSize: '12px' }}>You</span>}
        </div>
      </td>
    </tr>
  );
};

function App() {
  const [latestLevelUp, setLatestLevelUp] = useState(null);

  return (
    <Router basename={BASE_PATH}>
      <AuthProvider>
        <Navbar onLevelUpUpdate={setLatestLevelUp} />
        <LevelUpBanner
          notification={latestLevelUp}
          onClear={() => setLatestLevelUp(null)}
        />
        <XpDrops />
        <CallManager />
        <MobileNav />
        <RestrictedBanner />
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
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/:identifier" element={<UserProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
