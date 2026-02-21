import React, { useState, useEffect } from 'react';
import Users from './Users';
import Items from './Items';
import PixelGrid from './pixelgrid.js';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('pixelgrid');

  useEffect(() => {
    // Prevent scrolling but allow drawing on the grid
    const preventScroll = (e) => {
      // Allow touch events on the grid for drawing
      if (e.target.closest('[data-pixel-grid="true"]')) {
        // Only prevent default to stop scrolling, don't stop propagation
        e.preventDefault();
        return;
      }
      e.preventDefault();
    };
    
    const options = { passive: false };
    document.addEventListener('wheel', preventScroll, options);
    document.addEventListener('touchmove', preventScroll, options);
    
    // Prevent keyboard scroll
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'PageUp', 'PageDown'].includes(e.code) || e.code === 'Space') {
        e.preventDefault();
      }
    });
    
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
