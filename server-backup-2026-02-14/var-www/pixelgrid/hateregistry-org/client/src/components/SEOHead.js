import React from 'react';
import { Helmet } from 'react-helmet-async';

function SEOHead({ 
  title, 
  description, 
  canonical, 
  type = 'website',
  structuredData = null,
  openGraph = null 
}) {
  const baseUrl = 'https://hateregistry.org';
  const fullCanonical = canonical ? `${baseUrl}${canonical}` : baseUrl;
  const fullTitle = title ? `${title}` : 'Hate Crime Registry - Public Accountability Database';
  const metaDescription = description || 'A searchable public registry documenting individuals who have engaged in bigoted behavior.';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={fullCanonical} />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:site_name" content="Hate Crime Registry" />
      
      {openGraph?.profile && (
        <>
          <meta property="profile:first_name" content={openGraph.profile.firstName} />
          <meta property="profile:last_name" content={openGraph.profile.lastName} />
        </>
      )}
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}

export default SEOHead;
