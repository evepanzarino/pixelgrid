import React from 'react';
import { Link, NavLink } from 'react-router-dom';

function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <h1>
          <Link to="/">Bigot Registry</Link>
        </h1>
        <nav className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/add">Add Person</NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Header;
