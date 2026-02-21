import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import PersonPage from './pages/PersonPage';
import AddPersonPage from './pages/AddPersonPage';

function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/person/:slug" element={<PersonPage />} />
          <Route path="/add" element={<AddPersonPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
