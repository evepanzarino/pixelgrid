import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Header() {
  const { user, isAdmin, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-content">
        <h1>
          <Link to="/">Hate Crime Registry</Link>
        </h1>
        <nav className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/add">Add Person</NavLink>
          {isAdmin() && <NavLink to="/admin">Admin</NavLink>}
          {isAuthenticated ? (
            <>
              <span className="user-greeting">Hi, {user.username}</span>
              <button onClick={handleLogout} className="nav-logout">Logout</button>
            </>
          ) : (
            <NavLink to="/login">Login</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
