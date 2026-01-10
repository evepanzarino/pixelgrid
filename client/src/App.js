import React, { useState, useEffect } from 'react';
import Users from './Users';
import Items from './Items';
import PixelGrid from './pixelgrid.js';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('pixelgrid');

  useEffect(() => {
    // Prevent ALL scrolling - both wheel and touch
    const preventScroll = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    // Block all wheel, touch, and keyboard scroll events
    const options = { passive: false, capture: true };
    window.addEventListener('wheel', preventScroll, options);
    window.addEventListener('touchmove', preventScroll, options);
    document.addEventListener('scroll', preventScroll, options);
    
    // Prevent keyboard scroll (arrow keys, space, etc)
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'PageUp', 'PageDown'].includes(e.code) || e.code === 'Space') {
        e.preventDefault();
      }
    }, options);
    
    // Cleanup
    return () => {
      window.removeEventListener('wheel', preventScroll, options);
      window.removeEventListener('touchmove', preventScroll, options);
      document.removeEventListener('scroll', preventScroll, options);
    };
  }, []);

  return (
    <div className="App">
      {currentPage !== 'pixelgrid' && (
        <nav className="navbar">
          <h1 className="app-title">PixelGrid</h1>
          <div className="nav-buttons">
            <button
              onClick={() => setCurrentPage('pixelgrid')}
              className={currentPage === 'pixelgrid' ? 'active' : ''}
            >
              PixelGrid
            </button>
            <button
              onClick={() => setCurrentPage('users')}
              className={currentPage === 'users' ? 'active' : ''}
            >
              Users
            </button>
            <button
              onClick={() => setCurrentPage('items')}
              className={currentPage === 'items' ? 'active' : ''}
            >
              Items
            </button>
          </div>
        </nav>
      )}

      <main className="main-content">
        {currentPage === 'users' && <Users />}
        {currentPage === 'items' && <Items />}
        {currentPage === 'pixelgrid' && (
          <div style={{ margin: 0, padding: 0 }}>
            <PixelGrid />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
