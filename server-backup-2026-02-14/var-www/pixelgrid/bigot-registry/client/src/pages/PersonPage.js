import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPerson, createComment, adminDeletePerson, adminDeleteComment } from '../api';
import { useAuth } from '../context/AuthContext';
import SEOHead from '../components/SEOHead';
import ReactMarkdown from 'react-markdown';

function PersonPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState({});
  
  // Comment form state
  const [commentForm, setCommentForm] = useState({
    author_name: '',
    content: '',
    post_url: '',
    media_urls: ''
  });
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [commentSuccess, setCommentSuccess] = useState(null);

  const fetchPerson = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getPerson(slug);
      setPerson(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Person not found.');
      } else {
        setError('Failed to load person details. Please try again.');
      }
      console.error('Fetch person error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerson();
  }, [slug]);

  const handleCommentChange = (e) => {
    const { name, value } = e.target;
    setCommentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setCommentError(null);
    setCommentSuccess(null);
    
    if (!commentForm.content.trim()) {
      setCommentError('Comment content is required');
      return;
    }
    
    setCommentLoading(true);
    
    try {
      await createComment(person.id, commentForm);
      setCommentSuccess('Comment added successfully!');
      setCommentForm({
        author_name: '',
        content: '',
        post_url: '',
        media_urls: ''
      });
      // Refresh person data to show new comment
      await fetchPerson();
    } catch (err) {
      setCommentError(err.response?.data?.error || 'Failed to add comment. Please try again.');
      console.error('Create comment error:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeletePerson = async () => {
    const fullName = [person.first_name, person.middle_name, person.last_name]
      .filter(Boolean)
      .join(' ') || 'this person';
    
    if (!window.confirm(`Are you sure you want to permanently delete "${fullName}"? This will also delete all their hate records, comments, and photos.`)) {
      return;
    }
    
    setDeleteLoading(prev => ({ ...prev, person: true }));
    try {
      await adminDeletePerson(person.id);
      navigate('/search', { replace: true });
    } catch (err) {
      alert('Failed to delete person');
      console.error('Delete person error:', err);
    } finally {
      setDeleteLoading(prev => ({ ...prev, person: false }));
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to permanently delete this comment?')) {
      return;
    }
    
    setDeleteLoading(prev => ({ ...prev, [`comment-${commentId}`]: true }));
    try {
      await adminDeleteComment(commentId);
      // Remove comment from local state
      setPerson(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId)
      }));
    } catch (err) {
      alert('Failed to delete comment');
      console.error('Delete comment error:', err);
    } finally {
      setDeleteLoading(prev => ({ ...prev, [`comment-${commentId}`]: false }));
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <SEOHead title="Not Found - Hate Crime Registry" />
        <div className="error-message">{error}</div>
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/search">Return to search</Link>
        </p>
      </>
    );
  }

  if (!person) return null;

  const fullName = [person.first_name, person.middle_name, person.last_name]
    .filter(Boolean)
    .join(' ') || 'Unknown';

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Parse media URLs (comma-separated or one per line)
  const parseMediaUrls = (mediaUrlsString) => {
    if (!mediaUrlsString) return [];
    return mediaUrlsString
      .split(/[,\n]/)
      .map(url => url.trim())
      .filter(url => url.length > 0);
  };

  // Check if URL is an image
  const isImageUrl = (url) => {
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url) || 
           url.includes('imgur.com') || 
           url.includes('i.redd.it');
  };

  // Check if URL is a video
  const isVideoUrl = (url) => {
    return /\.(mp4|webm|mov|avi)$/i.test(url) ||
           url.includes('youtube.com') ||
           url.includes('youtu.be') ||
           url.includes('vimeo.com');
  };

  return (
    <>
      <SEOHead
        title={`${fullName} - Hate Crime Registry`}
        description={person.description || `Profile for ${fullName} in the Hate Crime Registry`}
        canonical={`https://evepanzarino.com/hate-registry/person/${person.slug}`}
        type="profile"
      />

      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/search">Search</Link>
        <span>/</span>
        <span aria-current="page">{fullName}</span>
      </nav>

      <article className="person-detail" itemScope itemType="https://schema.org/Person">
        <header className="person-header">
          <div className="person-header-content">
            {/* Profile Photo */}
            {person.profile_photo_url && (
              <div className="profile-photo">
                <a 
                  href={person.social_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  title="View social profile"
                >
                  <img 
                    src={person.profile_photo_url} 
                    alt={fullName}
                    itemProp="image"
                  />
                </a>
              </div>
            )}
            
            <div className="person-info">
              <h1 className="person-name">
                <a 
                  href={person.social_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  itemProp="name"
                >
                  {fullName}
                </a>
              </h1>

              <div className="person-info-grid">
                {person.location && (
                  <div className="info-item">
                    <span className="info-label">📍 Location</span>
                    <span className="info-value" itemProp="address">{person.location}</span>
                  </div>
                )}

                {person.job && (
                  <div className="info-item">
                    <span className="info-label">💼 Occupation</span>
                    <span className="info-value" itemProp="jobTitle">{person.job}</span>
                  </div>
                )}

                {person.phone_number && (
                  <div className="info-item">
                    <span className="info-label">📞 Phone</span>
                    <span className="info-value" itemProp="telephone">
                      <a href={`tel:${person.phone_number}`}>{person.phone_number}</a>
                    </span>
                  </div>
                )}

                <div className="info-item">
                  <span className="info-label">🔗 Social</span>
                  <span className="info-value">
                    <a href={person.social_link} target="_blank" rel="noopener noreferrer" itemProp="url">
                      View Profile
                    </a>
                  </span>
                </div>

                <div className="info-item">
                  <span className="info-label">📅 Added</span>
                  <span className="info-value">{formatDate(person.created_at)}</span>
                </div>

                {person.updated_at !== person.created_at && (
                  <div className="info-item">
                    <span className="info-label">✏️ Updated</span>
                    <span className="info-value">{formatDate(person.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Admin Actions */}
        {isAdmin() && (
          <div className="admin-actions-bar">
            <span className="admin-label">🔐 Admin Actions:</span>
            <button
              className="admin-delete-btn"
              onClick={handleDeletePerson}
              disabled={deleteLoading.person}
            >
              {deleteLoading.person ? 'Deleting...' : '🗑 Delete This Person'}
            </button>
          </div>
        )}

        {/* Description */}
        {person.description && (
          <section className="person-section">
            <h2 className="section-title">Summary</h2>
            <p className="person-description" itemProp="description">
              {person.description}
            </p>
          </section>
        )}

        {/* Family Members */}
        {person.family_members && (
          <section className="person-section">
            <h2 className="section-title">👨‍👩‍👧‍👦 Family Members</h2>
            <div className="family-members">
              {person.family_members}
            </div>
          </section>
        )}

        {/* Additional Social Profiles */}
        {person.socialProfiles && person.socialProfiles.length > 0 && (
          <section className="person-section">
            <h2 className="section-title">🌐 Social Media Profiles</h2>
            <ul className="social-profiles-list">
              {person.socialProfiles.map((profile, index) => (
                <li key={profile.id || index}>
                  <a href={profile.url} target="_blank" rel="noopener noreferrer">
                    <strong>{profile.platform || 'Link'}</strong>
                    {profile.username && ` (@${profile.username})`}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Page Content (Markdown) */}
        {person.markup_content && (
          <section className="person-section page-content">
            <h2 className="section-title">📝 Full Details</h2>
            <div className="markdown-content">
              <ReactMarkdown>{person.markup_content}</ReactMarkdown>
            </div>
          </section>
        )}

        {/* Hate Records - Blog Post Style */}
        {person.hateRecords && person.hateRecords.length > 0 && (
          <section className="person-section hate-records">
            <h2 className="section-title">📋 Documented Hate Records</h2>
            <div className="hate-records-list">
              {person.hateRecords.map((record, index) => (
                <article key={record.id || index} className="hate-record-post">
                  <header className="hate-record-header">
                    <h3 className="hate-record-title">{record.title || 'Incident Report'}</h3>
                    {record.incident_date && (
                      <time className="hate-record-date" dateTime={record.incident_date}>
                        {formatDate(record.incident_date)}
                      </time>
                    )}
                  </header>
                  <div className="hate-record-content">
                    <ReactMarkdown>{record.content}</ReactMarkdown>
                  </div>
                  {record.source_url && (
                    <div className="hate-record-source">
                      <a href={record.source_url} target="_blank" rel="noopener noreferrer">
                        🔗 View Source
                      </a>
                    </div>
                  )}
                  <footer className="hate-record-footer">
                    {record.updated_at && record.updated_at !== record.created_at && (
                      <small className="hate-record-updated">
                        Last updated: {formatDate(record.updated_at)}
                      </small>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Comments Section */}
        <section className="person-section comments-section">
          <h2 className="section-title">💬 Comments</h2>
          
          {/* Comment Form */}
          <div className="comment-form-container">
            <h3>Add a Comment</h3>
            
            {commentError && <div className="error-message">{commentError}</div>}
            {commentSuccess && <div className="success-message">{commentSuccess}</div>}
            
            <form onSubmit={handleCommentSubmit} className="comment-form">
              <div className="form-group">
                <label htmlFor="author_name">Your Name (optional)</label>
                <input
                  type="text"
                  id="author_name"
                  name="author_name"
                  value={commentForm.author_name}
                  onChange={handleCommentChange}
                  placeholder="Anonymous"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="content">Comment <span className="required">*</span></label>
                <textarea
                  id="content"
                  name="content"
                  value={commentForm.content}
                  onChange={handleCommentChange}
                  placeholder="Share your thoughts, experiences, or additional information about this person..."
                  rows={4}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="post_url">Link to Post/Evidence (optional)</label>
                <input
                  type="url"
                  id="post_url"
                  name="post_url"
                  value={commentForm.post_url}
                  onChange={handleCommentChange}
                  placeholder="https://facebook.com/... or https://twitter.com/..."
                />
                <small>URL of the social media post they commented on or link to evidence</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="media_urls">Screenshots/Media URLs (optional)</label>
                <textarea
                  id="media_urls"
                  name="media_urls"
                  value={commentForm.media_urls}
                  onChange={handleCommentChange}
                  placeholder="https://imgur.com/screenshot1.jpg&#10;https://example.com/video.mp4"
                  rows={3}
                />
                <small>Enter image or video URLs, one per line. Supports direct image links and video URLs.</small>
              </div>
              
              <button 
                type="submit" 
                className="btn-primary"
                disabled={commentLoading}
              >
                {commentLoading ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          </div>

          {/* Display Comments */}
          <div className="comments-list">
            {person.comments && person.comments.length > 0 ? (
              person.comments.map((comment, index) => (
                <div key={comment.id || index} className="comment-card">
                  <div className="comment-header">
                    <span className="comment-author">{comment.author_name || 'Anonymous'}</span>
                    <time className="comment-date">{formatDateTime(comment.created_at)}</time>
                  </div>
                  
                  <div className="comment-content">
                    <p>{comment.content}</p>
                  </div>
                  
                  {comment.post_url && (
                    <div className="comment-post-link">
                      <a href={comment.post_url} target="_blank" rel="noopener noreferrer">
                        🔗 View Original Post
                      </a>
                    </div>
                  )}
                  
                  {comment.media_urls && (
                    <div className="comment-media">
                      {parseMediaUrls(comment.media_urls).map((url, mediaIndex) => (
                        <div key={mediaIndex} className="media-item">
                          {isImageUrl(url) ? (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt={`Evidence ${mediaIndex + 1}`} />
                            </a>
                          ) : isVideoUrl(url) ? (
                            url.includes('youtube.com') || url.includes('youtu.be') ? (
                              <a href={url} target="_blank" rel="noopener noreferrer" className="video-link">
                                🎬 View Video on YouTube
                              </a>
                            ) : (
                              <video controls>
                                <source src={url} />
                                Your browser does not support video playback.
                              </video>
                            )
                          ) : (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              📎 View Attachment
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Admin Delete Comment */}
                  {isAdmin() && (
                    <div className="comment-admin-actions">
                      <button
                        className="admin-delete-comment-btn"
                        onClick={() => handleDeleteComment(comment.id)}
                        disabled={deleteLoading[`comment-${comment.id}`]}
                      >
                        {deleteLoading[`comment-${comment.id}`] ? 'Deleting...' : '🗑 Delete Comment'}
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="no-comments">No comments yet. Be the first to share information!</p>
            )}
          </div>
        </section>
      </article>
    </>
  );
}

export default PersonPage;
