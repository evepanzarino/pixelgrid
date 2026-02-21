import React from 'react';
import { Link } from 'react-router-dom';

function PersonCard({ person }) {
  const { first_name, last_name, slug, city, state, category, summary } = person;
  const fullName = `${first_name} ${last_name}`;
  const location = [city, state].filter(Boolean).join(', ');

  return (
    <article className="person-card" itemScope itemType="https://schema.org/Person">
      <h3>
        <Link to={`/person/${slug}`} itemProp="name">{fullName}</Link>
      </h3>
      <div className="person-meta">
        {location && (
          <span itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
            📍 <span itemProp="addressLocality">{city}</span>
            {city && state && ', '}
            <span itemProp="addressRegion">{state}</span>
          </span>
        )}
        {category && (
          <span className="category-badge">{category}</span>
        )}
      </div>
      {summary && (
        <p className="person-summary" itemProp="description">{summary}</p>
      )}
    </article>
  );
}

export default PersonCard;
