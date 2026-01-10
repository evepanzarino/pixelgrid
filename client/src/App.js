import React, { useState, useEffect } from 'react';
import Users from './Users';
import Items from './Items';
import PixelGrid from './pixelgrid.js';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('pixelgrid');

  useEffect(() => {
    // Prevent scrolling on document/body, but allow it on the grid
    const preventScroll = (e) => {
      // Check if the event target or its parent is the grid - if so, allow it
      if (e.target.closest('[data-is-grid="true"]')) {
        return; // Allow events on the grid
      }
      e.preventDefault();
      e.stopPropagation();
    };
    
    // Block all wheel and touch scroll events (except on grid)
    const options = { passive: false, capture: false };
    document.addEventListener('wheel', preventScroll, options);
    document.addEventListener('touchmove', preventScroll, options);
    
    // Prevent keyboard scroll (arrow keys, space, etc)
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'PageUp', 'PageDown'].includes(e.code) || e.code === 'Space') {
        e.preventDefault();
      }
    }, options);
    
    // Cleanup
    return () => {
      document.removeEventListener('wheel', preventScroll, options);
      document.removeEventListener('touchmove', preventScroll, options);
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
