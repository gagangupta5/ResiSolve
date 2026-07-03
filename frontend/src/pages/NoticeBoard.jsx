import React, { useState, useEffect } from 'react';
import { useAuth, useToast } from '../App';

export default function NoticeBoard() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [notices, setNotices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Notice Creation Modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/notices', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setNotices(data.data);
      } else {
        addToast(data.message || 'Failed to fetch notice board', 'error');
      }
    } catch (err) {
      addToast('Could not load notices from server', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      addToast('Please provide both a title and notice content', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ title, content, isImportant })
      });

      const data = await response.json();
      if (response.ok) {
        addToast(
          isImportant 
            ? 'Notice posted and email notifications broadcast to all residents!'
            : 'Notice posted successfully on the board', 
          'success'
        );
        setTitle('');
        setContent('');
        setIsImportant(false);
        setShowModal(false);
        fetchNotices();
      } else {
        addToast(data.message || 'Notice submission failed', 'error');
      }
    } catch (err) {
      addToast('Server connection failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/notices/${noticeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (response.ok) {
        addToast('Notice deleted successfully', 'success');
        fetchNotices();
      } else {
        addToast(data.message || 'Delete operation failed', 'error');
      }
    } catch (err) {
      addToast('Could not communicate with the server', 'error');
    }
  };

  // Filter notices locally by search keyword
  const filteredNotices = notices.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Society Notice Board</h1>
          <p style={{ color: 'var(--text-secondary)' }}>View official society announcements and updates</p>
        </div>
        
        {user.role === 'admin' && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Post Notice
          </button>
        )}
      </div>

      <div className="filters-bar" style={{ padding: '15px 20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexGrow: 1 }}>
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search notice titles or keywords..." 
            className="filter-input"
            style={{ flexGrow: 1, border: 'none', backgroundColor: 'transparent' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading notice board...</p>
      ) : filteredNotices.length === 0 ? (
        <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📢</div>
          <h4>No Notices Found</h4>
          <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>There are currently no announcements posted on the notice board.</p>
        </div>
      ) : (
        <div className="notices-container">
          {filteredNotices.map(n => (
            <div key={n._id} className={`notice-card ${n.isImportant ? 'pinned' : ''}`}>
              <div className="notice-card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '1.25rem', color: n.isImportant ? '#f59e0b' : 'white' }}>{n.title}</h3>
                    {n.isImportant && <span className="notice-pinned-tag">Important Pinned</span>}
                  </div>
                  <div className="notice-meta">
                    <span>Posted by: <strong>{n.postedBy?.name || 'Administrator'}</strong></span>
                    <span>•</span>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                
                {user.role === 'admin' && (
                  <button onClick={() => handleDeleteNotice(n._id)} className="logout-btn" title="Delete Notice">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                )}
              </div>
              
              <p style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>
                {n.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Post Notice Dialog */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Post Society Announcement</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            
            <form onSubmit={handlePostNotice}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="notice-title">Notice Title / Subject</label>
                  <input 
                    type="text" 
                    id="notice-title"
                    placeholder="e.g. Scheduled Lift Maintenance"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="notice-content">Announcement Details</label>
                  <textarea 
                    id="notice-content"
                    placeholder="Write detailed announcements description here..."
                    className="form-input"
                    style={{ height: '150px', resize: 'none' }}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                  <input 
                    type="checkbox" 
                    id="important"
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    checked={isImportant}
                    onChange={(e) => setIsImportant(e.target.checked)}
                  />
                  <label htmlFor="important" style={{ fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
                    Mark as Important & Pin to Top
                  </label>
                </div>
                {isImportant && (
                  <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '6px', marginLeft: '28px' }}>
                    ⚠️ This will broadcast email notifications immediately to all registered resident accounts.
                  </p>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Broadcasting...' : 'Post Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
