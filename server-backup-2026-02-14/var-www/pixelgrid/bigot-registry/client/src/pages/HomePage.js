import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEOHead from '../components/SEOHead';

function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Hate Crime Registry',
    url: 'https://evepanzarino.com/hate-registry/',
    description: 'A searchable public registry documenting individuals who have engaged in bigoted behavior.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://evepanzarino.com/hate-registry/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <>
      <SEOHead
        title="Hate Crime Registry - Public Accountability Database"
        description="A searchable public registry documenting individuals who have engaged in bigoted behavior. Search by name, location, or category."
        canonical="/"
        structuredData={structuredData}
      />

      <div className="search-container" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#1a1a2e' }}>
          Hate Crime Registry
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
          A searchable public database for accountability. Look up individuals by name, location, or category.
        </p>
        
        <form onSubmit={handleSearch} className="search-form" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="search-input-group">
            <input
              type="text"
              className="search-input"
              placeholder="Enter a name to search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search by name"
            />
            <button type="submit" className="search-button">
              Search
            </button>
          </div>
        </form>
      </div>

      <section style={{ marginTop: '3rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>How It Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <div className="person-card" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>🔍 Search</h3>
            <p>Look up individuals by name, location, or category using our powerful search functionality.</p>
          </div>
          <div className="person-card" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>📋 Review</h3>
            <p>Access documented incidents with sources for each registry entry.</p>
          </div>
          <div className="person-card" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>📢 Share</h3>
            <p>Each profile has a unique, SEO-optimized URL for easy sharing and reference.</p>
          </div>
        </div>
      </section>
    </>
  );
}

export default HomePage;
