import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPendingPeople, getPendingComments, approvePerson, denyPerson, approveComment, denyComment } from '../api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('people');
  const [pendingPeople, setPendingPeople] = useState([]);
  const [pendingComments, setPendingComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
    fetchPendingItems();
  }, [isAdmin, navigate]);

  const fetchPendingItems = async () => {
    setLoading(true);
    setError('');
    try {
      const [peopleRes, commentsRes] = await Promise.all([
        getPendingPeople(),
        getPendingComments()
      ]);
      setPendingPeople(peopleRes.data || []);
      setPendingComments(commentsRes.data || []);
    } catch (err) {
      setError('Failed to load pending items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePerson = async (id) => {
    setActionLoading(prev => ({ ...prev, [`person-${id}`]: true }));
    try {
      await approvePerson(id);
      setPendingPeople(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to approve person');
    } finally {
      setActionLoading(prev => ({ ...prev, [`person-${id}`]: false }));
    }
  };

  const handleDenyPerson = async (id) => {
    setActionLoading(prev => ({ ...prev, [`person-${id}`]: true }));
    try {
      await denyPerson(id);
      setPendingPeople(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to deny person');
    } finally {
      setActionLoading(prev => ({ ...prev, [`person-${id}`]: false }));
    }
  };

  const handleApproveComment = async (id) => {
    setActionLoading(prev => ({ ...prev, [`comment-${id}`]: true }));
    try {
      await approveComment(id);
      setPendingComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert('Failed to approve comment');
    } finally {
      setActionLoading(prev => ({ ...prev, [`comment-${id}`]: false }));
    }
  };

  const handleDenyComment = async (id) => {
    setActionLoading(prev => ({ ...prev, [`comment-${id}`]: true }));
    try {
      await denyComment(id);
      setPendingComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert('Failed to deny comment');
    } finally {
      setActionLoading(prev => ({ ...prev, [`comment-${id}`]: false }));
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user?.username}. Manage pending submissions below.</p>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'people' ? 'active' : ''}`}
          onClick={() => setActiveTab('people')}
        >
          Pending People ({pendingPeople.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          Pending Comments ({pendingComments.length})
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'people' && (
          <div className="pending-list">
            {pendingPeople.length === 0 ? (
              <div className="empty-message">No pending people submissions</div>
            ) : (
              pendingPeople.map(person => (
                <div key={person.id} className="pending-item">
                  <div className="pending-info">
                    <h3>{person.first_name} {person.last_name}</h3>
                    <p className="pending-meta">
                      Submitted: {new Date(person.created_at).toLocaleDateString()}
                      {person.submitted_by_username ? ` by ${person.submitted_by_username}` : ' (anonymous)'}
                    </p>
                    {person.description && (
                      <p className="pending-description">{person.description}</p>
                    )}
                    {person.location && (
                      <p className="pending-location">📍 {person.location}</p>
                    )}
                  </div>
                  <div className="pending-actions">
                    <button
                      className="approve-btn"
                      onClick={() => handleApprovePerson(person.id)}
                      disabled={actionLoading[`person-${person.id}`]}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="deny-btn"
                      onClick={() => handleDenyPerson(person.id)}
                      disabled={actionLoading[`person-${person.id}`]}
                    >
                      ✕ Deny
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="pending-list">
            {pendingComments.length === 0 ? (
              <div className="empty-message">No pending comments</div>
            ) : (
              pendingComments.map(comment => (
                <div key={comment.id} className="pending-item">
                  <div className="pending-info">
                    <h3>Comment by {comment.author_name || 'Anonymous'}</h3>
                    <p className="pending-meta">
                      On: {comment.first_name && comment.last_name ? `${comment.first_name} ${comment.last_name}` : `Person #${comment.person_id}`}
                      <br />
                      Posted: {new Date(comment.created_at).toLocaleDateString()}
                      {comment.submitted_by_username ? ` by ${comment.submitted_by_username}` : ''}
                    </p>
                    <p className="pending-content">{comment.content}</p>
                    {comment.post_url && (
                      <p className="pending-link">
                        <a href={comment.post_url} target="_blank" rel="noopener noreferrer">
                          View referenced post →
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="pending-actions">
                    <button
                      className="approve-btn"
                      onClick={() => handleApproveComment(comment.id)}
                      disabled={actionLoading[`comment-${comment.id}`]}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="deny-btn"
                      onClick={() => handleDenyComment(comment.id)}
                      disabled={actionLoading[`comment-${comment.id}`]}
                    >
                      ✕ Deny
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <button className="refresh-btn" onClick={fetchPendingItems}>
        🔄 Refresh
      </button>
    </div>
  );
};

export default AdminDashboard;
