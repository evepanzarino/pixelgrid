import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPerson } from '../api';
import SEOHead from '../components/SEOHead';

function AddPersonPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone_number: '',
    location: '',
    family_members: '',
    description: '',
    profile_photo_url: '',
    social_link: '',
    markup_content: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!formData.social_link) {
      setError('Social link is required');
      return;
    }
    
    if (!formData.first_name && !formData.last_name) {
      setError('At least first name or last name is required');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await createPerson(formData);
      setSuccess('Person added successfully!');
      
      // Redirect to the new person's page
      setTimeout(() => {
        navigate(`/person/${response.data.slug}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add person. Please try again.');
      console.error('Create person error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead 
        title="Add Person - Bigot Registry"
        description="Add a new entry to the Bigot Registry"
      />

      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <span aria-current="page">Add Person</span>
      </nav>

      <div className="add-person-page">
        <h1>Add New Person</h1>
        
        <p className="required-note">
          <span className="required">*</span> indicates required field
        </p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="add-person-form">
          <div className="form-section">
            <h2>Basic Information</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">First Name</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="First name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="middle_name">Middle Name</label>
                <input
                  type="text"
                  id="middle_name"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleChange}
                  placeholder="Middle name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="last_name">Last Name</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="social_link">
                Social Link <span className="required">*</span>
              </label>
              <input
                type="url"
                id="social_link"
                name="social_link"
                value={formData.social_link}
                onChange={handleChange}
                placeholder="https://facebook.com/... or https://instagram.com/... or https://twitter.com/..."
                required
              />
              <small>Primary social media profile URL - Facebook, Instagram, Twitter/X, TikTok, etc. (required)</small>
            </div>

            <div className="form-group">
              <label htmlFor="profile_photo_url">Profile Photo URL</label>
              <input
                type="url"
                id="profile_photo_url"
                name="profile_photo_url"
                value={formData.profile_photo_url}
                onChange={handleChange}
                placeholder="https://example.com/photo.jpg"
              />
              <small>Direct link to profile photo</small>
            </div>
          </div>

          <div className="form-section">
            <h2>Contact Information</h2>
            
            <div className="form-group">
              <label htmlFor="phone_number">Phone Number</label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="City, State, Country"
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Additional Details</h2>
            
            <div className="form-group">
              <label htmlFor="family_members">Family Members</label>
              <textarea
                id="family_members"
                name="family_members"
                value={formData.family_members}
                onChange={handleChange}
                placeholder="List known family members, relationships..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the person and their hateful behavior..."
                rows={5}
              />
            </div>

            <div className="form-group">
              <label htmlFor="markup_content">
                Page Content
                <span className="markup-help"> (Supports Markdown)</span>
              </label>
              <textarea
                id="markup_content"
                name="markup_content"
                value={formData.markup_content}
                onChange={handleChange}
                placeholder="# About This Person&#10;&#10;Write detailed content here using Markdown formatting...&#10;&#10;## Section Title&#10;&#10;- Bullet point&#10;- Another point&#10;&#10;**Bold text** and *italic text*"
                rows={15}
              />
              <small>
                Use Markdown for formatting: # Heading, **bold**, *italic*, - bullet points, [link](url)
              </small>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Person'}
            </button>
            <Link to="/" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </>
  );
}

export default AddPersonPage;
