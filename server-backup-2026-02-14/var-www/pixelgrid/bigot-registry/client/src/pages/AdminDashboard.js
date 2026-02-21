import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPendingPeople, getPendingComments, approvePerson, denyPerson, approveComment, denyComment, adminDeletePerson, adminDeleteComment, getUsers, deleteUser, getAllPeople, getAllComments } from '../api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending-people');
  const [pendingPeople, setPendingPeople] = useState([]);
  const [pendingComments, setPendingComments] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [allComments, setAllComments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
    fetchAllData();
  }, [isAdmin, navigate]);

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const [pendingPeopleRes, pendingCommentsRes, usersRes, allPeopleRes, allCommentsRes] = await Promise.all([
        getPendingPeople(),
        getPendingComments(),
        getUsers(),
        getAllPeople(),
        getAllComments()
      ]);
      setPendingPeople(pendingPeopleRes.data || []);
      setPendingComments(pendingCommentsRes.data || []);
      setUsers(usersRes.data || []);
      setAllPeople(allPeopleRes.data || []);
      setAllComments(allCommentsRes.data || []);
    } catch (err) {
      setError('Failed to load data');
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

  const handleDeletePerson = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"? This will also delete all their hate records, comments, and photos.`)) {
      return;
    }
    setActionLoading(prev => ({ ...prev, [`delete-person-${id}`]: true }));
    try {
      await adminDeletePerson(id);
      setPendingPeople(prev => prev.filter(p => p.id !== id));
      setAllPeople(prev => prev.filter(p => p.id !== id));
      // Also remove comments associated with this person
      setAllComments(prev => prev.filter(c => c.person_id !== id));
      setPendingComments(prev => prev.filter(c => c.person_id !== id));
    } catch (err) {
      alert('Failed to delete person');
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-person-${id}`]: false }));
    }
  };

  const handleDeleteComment = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this comment?')) {
      return;
    }
    setActionLoading(prev => ({ ...prev, [`delete-comment-${id}`]: true }));
    try {
      await adminDeleteComment(id);
      setPendingComments(prev => prev.filter(c => c.id !== id));
      setAllComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert('Failed to delete comment');
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-comment-${id}`]: false }));
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${username}"?`)) {
      return;
    }
    setActionLoading(prev => ({ ...prev, [`delete-user-${id}`]: true }));
    try {
      await deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-user-${id}`]: false }));
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
          className={`tab-button ${activeTab === 'pending-people' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending-people')}
        >
          Pending People ({pendingPeople.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'pending-comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending-comments')}
        >
          Pending Comments ({pendingComments.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'all-people' ? 'active' : ''}`}
          onClick={() => setActiveTab('all-people')}
        >
          All People ({allPeople.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'all-comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('all-comments')}
        >
          All Comments ({allComments.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users ({users.length})
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'pending-people' && (
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
                    <button
                      className="delete-btn"
                      onClick={() => handleDeletePerson(person.id, `${person.first_name} ${person.last_name}`)}
                      disabled={actionLoading[`delete-person-${person.id}`]}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'pending-comments' && (
          <div className="pending-list">
            {pendingComments.length === 0 ? (
              <div className="empty-message">No pending comments</div>
            ) : (
              pendingComments.map(comment => (
                <div key={comment.id} className="pending-item">
                  <div className="pending-info">
                    <h3>Comment by {comment.author_name || 'Anonymous'}</h3>
                    <p className="pending-meta">
                      On: {comment.first_name && comment.last_name ? (
                        <Link to={`/person/${comment.person_slug}`}>{comment.first_name} {comment.last_name}</Link>
                      ) : `Person #${comment.person_id}`}
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
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={actionLoading[`delete-comment-${comment.id}`]}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'all-people' && (
          <div className="pending-list">
            {allPeople.length === 0 ? (
              <div className="empty-message">No people in registry</div>
            ) : (
              allPeople.map(person => (
                <div key={person.id} className="pending-item">
                  <div className="pending-info">
                    <h3>
                      <Link to={`/person/${person.slug}`}>{person.first_name} {person.last_name}</Link>
                      <span className={`status-badge status-${person.status}`}>{person.status}</span>
                    </h3>
                    <p className="pending-meta">
                      Added: {new Date(person.created_at).toLocaleDateString()}
                      {person.submitted_by_username ? ` by ${person.submitted_by_username}` : ' (anonymous)'}
                      <br />
                      {person.record_count} hate records • {person.comment_count} comments
                    </p>
                    {person.description && (
                      <p className="pending-description">{person.description.substring(0, 150)}{person.description.length > 150 ? '...' : ''}</p>
                    )}
                    {person.location && (
                      <p className="pending-location">📍 {person.location}</p>
                    )}
                  </div>
                  <div className="pending-actions">
                    <Link to={`/person/${person.slug}`} className="view-btn">
                      👁 View
                    </Link>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeletePerson(person.id, `${person.first_name} ${person.last_name}`)}
                      disabled={actionLoading[`delete-person-${person.id}`]}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'all-comments' && (
          <div className="pending-list">
            {allComments.length === 0 ? (
              <div className="empty-message">No comments</div>
            ) : (
              allComments.map(comment => (
                <div key={comment.id} className="pending-item">
                  <div className="pending-info">
                    <h3>
                      Comment by {comment.author_name || 'Anonymous'}
                      <span className={`status-badge status-${comment.status}`}>{comment.status}</span>
                    </h3>
                    <p className="pending-meta">
                      On: {comment.first_name && comment.last_name ? (
                        <Link to={`/person/${comment.person_slug}`}>{comment.first_name} {comment.last_name}</Link>
                      ) : `Person #${comment.person_id}`}
                      <br />
                      Posted: {new Date(comment.created_at).toLocaleDateString()}
                      {comment.submitted_by_username ? ` by ${comment.submitted_by_username}` : ''}
                    </p>
                    <p className="pending-content">{comment.content.substring(0, 200)}{comment.content.length > 200 ? '...' : ''}</p>
                    {comment.post_url && (
                      <p className="pending-link">
                        <a href={comment.post_url} target="_blank" rel="noopener noreferrer">
                          View referenced post →
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="pending-actions">
                    <Link to={`/person/${comment.person_slug}`} className="view-btn">
                      👁 View Person
                    </Link>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={actionLoading[`delete-comment-${comment.id}`]}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="pending-list">
            {users.length === 0 ? (
              <div className="empty-message">No users found</div>
            ) : (
              users.map(u => (
                <div key={u.id} className="pending-item">
                  <div className="pending-info">
                    <h3>{u.username} {u.role === 'admin' && <span className="admin-badge">Admin</span>}</h3>
                    <p className="pending-meta">
                      Email: {u.email || 'Not provided'}
                      <br />
                      Joined: {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="pending-actions">
                    {u.id !== user?.id && (
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        disabled={actionLoading[`delete-user-${u.id}`]}
                      >
                        🗑 Delete
                      </button>
                    )}
                    {u.id === user?.id && (
                      <span className="current-user-label">You</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <button className="refresh-btn" onClick={fetchAllData}>
        🔄 Refresh
      </button>
    </div>
  );
};

export default AdminDashboard;
