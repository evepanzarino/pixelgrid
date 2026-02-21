import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getPeople } from '../api';
import SEOHead from '../components/SEOHead';

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const performSearch = useCallback(async (searchQuery, newOffset = 0) => {
    setLoading(true);
    setError(null);

    try {
      const response = await getPeople({
        search: searchQuery,
        limit,
        offset: newOffset
      });
      
      setResults(response.data.people || []);
      setTotal(response.data.total || 0);
      setOffset(newOffset);

      // Update URL params
      const newParams = new URLSearchParams();
      if (searchQuery) newParams.set('q', searchQuery);
      if (newOffset > 0) newParams.set('offset', newOffset);
      setSearchParams(newParams);
    } catch (err) {
      setError('Failed to fetch results. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  // Initial search from URL params
  useEffect(() => {
    const q = searchParams.get('q');
    const initialOffset = parseInt(searchParams.get('offset')) || 0;

    if (q) {
      setQuery(q);
      performSearch(q, initialOffset);
    } else {
      // Load all people on initial page load
      performSearch('', initialOffset);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e) => {
    e.preventDefault();
    performSearch(query, 0);
  };

  const handlePageChange = (newOffset) => {
    performSearch(query, newOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const formatLocation = (person) => {
    return person.location || '';
  };

  const getFullName = (person) => {
    return [person.first_name, person.middle_name, person.last_name]
      .filter(Boolean)
      .join(' ') || 'Unknown';
  };

  return (
    <>
      <SEOHead
        title="Search - Bigot Registry"
        description="Search the Bigot Registry database by name or location."
        canonical="/search"
      />

      <div className="search-container">
        <h2 className="search-title">Search the Registry</h2>
        <form className="search-form" onSubmit={handleSubmit}>
          <div className="search-input-group">
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, location, or description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search query"
            />
            <button type="submit" className="search-button">
              Search
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {!loading && !error && results.length > 0 && (
        <>
          <div className="results-header">
            <span className="results-count">
              {total} result{total !== 1 ? 's' : ''} found
            </span>
          </div>
          <div className="results-container">
            {results.map(person => (
              <div key={person.id} className="person-card">
                <div className="person-card-content">
                  {person.profile_photo_url && (
                    <div className="person-card-photo">
                      <img src={person.profile_photo_url} alt={getFullName(person)} />
                    </div>
                  )}
                  <div className="person-card-info">
                    <h3>
                      <Link to={`/person/${person.slug}`}>
                        {getFullName(person)}
                      </Link>
                    </h3>
                    <div className="person-meta">
                      {formatLocation(person) && (
                        <span>📍 {formatLocation(person)}</span>
                      )}
                      {person.hate_record_count > 0 && (
                        <span>📋 {person.hate_record_count} record{person.hate_record_count !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {person.description && (
                      <p className="person-summary">
                        {person.description.length > 200 
                          ? person.description.substring(0, 200) + '...' 
                          : person.description}
                      </p>
                    )}
                    <div className="person-card-actions">
                      <a 
                        href={person.social_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="social-link-btn"
                      >
                        View Social Profile →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => handlePageChange((currentPage - 2) * limit)}
              >
                Previous
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => handlePageChange((pageNum - 1) * limit)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage * limit)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="no-results">
          <p>No results found. {query ? 'Try adjusting your search criteria.' : 'Be the first to add someone!'}</p>
          <Link to="/add" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Add Person
          </Link>
        </div>
      )}
    </>
  );
}

export default SearchPage;
