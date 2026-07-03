import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useToast } from '../App';

export default function ResidentDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Form States
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Plumbing');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const fileInputRef = useRef(null);

  const fetchMyComplaints = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/complaints', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setComplaints(data.data);
      } else {
        addToast(data.message || 'Failed to fetch your complaints', 'error');
      }
    } catch (err) {
      addToast('Could not load complaints from server', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyComplaints();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      addToast('Only image files (JPEG, PNG, WebP) are allowed', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size cannot exceed 5MB', 'warning');
      return;
    }

    setPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (e) => {
    e.stopPropagation();
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!title || !description) {
      addToast('Please fill in both title and description', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('description', description);
      if (photo) {
        formData.append('photo', photo);
      }

      const response = await fetch('http://localhost:5000/api/complaints', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        addToast('Complaint submitted successfully!', 'success');
        setTitle('');
        setCategory('Plumbing');
        setDescription('');
        setPhoto(null);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchMyComplaints();
      } else {
        addToast(data.message || 'Submission failed', 'error');
      }
    } catch (err) {
      addToast('Could not reach the server', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenComplaint = async (complaintId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/complaints/${complaintId}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSelectedComplaint(data.data);
      } else {
        addToast(data.message || 'Failed to fetch details', 'error');
      }
    } catch (err) {
      addToast('Server connection failed', 'error');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem' }}>Resident Portal</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Log complaints and track status updates for Flat {user.flatNo}</p>
      </div>

      <div className="dashboard-panels" style={{ gridTemplateColumns: '1.2fr 1.8fr' }}>
        {/* Submission Panel */}
        <div className="panel">
          <h3 style={{ marginBottom: '20px' }}>Log New Maintenance Request</h3>
          <form onSubmit={handleSubmitComplaint}>
            <div className="form-group">
              <label className="form-label" htmlFor="title">Issue Summary / Title</label>
              <input
                type="text"
                id="title"
                placeholder="e.g. Kitchen sink faucet leaking"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="category">Category</label>
              <select
                id="category"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                style={{ appearance: 'auto' }}
              >
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Carpentry">Carpentry</option>
                <option value="Security">Security</option>
                <option value="Cleanliness">Cleanliness</option>
                <option value="Elevator">Elevator</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="desc">Full Description</label>
              <textarea
                id="desc"
                placeholder="Explain the issue in detail, including flat location, urgencies, or timings..."
                className="form-input"
                style={{ height: '100px', resize: 'none' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Attach Photo (Optional)</label>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
              />
              <div className="drag-drop-area" onClick={() => fileInputRef.current.click()}>
                {photoPreview ? (
                  <div className="preview-container">
                    <img src={photoPreview} alt="Upload preview" className="preview-image" />
                    <button type="button" className="remove-preview-btn" onClick={handleRemovePhoto}>×</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📷</div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Click to upload file</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>PNG, JPEG, WEBP up to 5MB</p>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Submitting request...' : 'Log Complaint'}
            </button>
          </form>
        </div>

        {/* Complaints History Panel */}
        <div className="panel">
          <h3 style={{ marginBottom: '20px' }}>My Complaint Tracker</h3>

          {loading ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Retrieving your records...</p>
          ) : complaints.length === 0 ? (
            <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📋</div>
              <h4>No Complaints Registered Yet</h4>
              <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>Fill in the form on the left to report society maintenance issues.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '680px', overflowY: 'auto', paddingRight: '5px' }}>
              {complaints.map(c => (
                <div 
                  key={c._id} 
                  className="stat-card progress" 
                  style={{ cursor: 'pointer', padding: '18px 24px' }}
                  onClick={() => handleOpenComplaint(c._id)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="badge badge-medium" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>{c.category}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 style={{ fontSize: '1.05rem', margin: '4px 0' }}>{c.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.description}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span className={`badge badge-${c.status.replace(' ', '').toLowerCase()}`}>{c.status}</span>
                    {c.overdue && <span className="badge badge-overdue" style={{ fontSize: '0.7rem' }}>Overdue</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Timeline Modal */}
      {selectedComplaint && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>Track Complaint Progress</h3>
              <button onClick={() => setSelectedComplaint(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="badge badge-medium">{selectedComplaint.category}</span>
                    <span className={`badge badge-${selectedComplaint.status.replace(' ', '').toLowerCase()}`}>{selectedComplaint.status}</span>
                    {selectedComplaint.overdue && <span className="badge badge-overdue">Overdue</span>}
                  </div>
                  <h4 style={{ color: 'var(--primary)', marginBottom: '8px' }}>{selectedComplaint.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedComplaint.description}</p>
                </div>

                <div>
                  {selectedComplaint.photoUrl ? (
                    <div style={{ cursor: 'zoom-in' }} onClick={() => setLightboxImage(`http://localhost:5000/${selectedComplaint.photoUrl}`)}>
                      <img 
                        src={`http://localhost:5000/${selectedComplaint.photoUrl}`} 
                        alt={selectedComplaint.title}
                        style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', display: 'block', marginTop: '2px' }}>🔍 Expand Image</span>
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '130px', backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      No Photo Attached
                    </div>
                  )}
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-color)', margin: '20px 0' }} />

              <h4 style={{ marginBottom: '15px' }}>Timeline & Audit Trail</h4>
              <div className="timeline">
                {selectedComplaint.statusHistory?.map((h, i) => (
                  <div key={i} className="timeline-item">
                    <div className={`timeline-dot ${h.status.replace(' ', '').toLowerCase()}`}></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span style={{ fontWeight: '600' }}>{h.status}</span>
                        <span>{new Date(h.changedAt).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem' }}>{h.note}</p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Updated by: {h.changedBy?.name} ({h.changedBy?.role})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedComplaint(null)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="modal-overlay" onClick={() => setLightboxImage(null)} style={{ zIndex: 1100 }}>
          <div className="lightbox-content">
            <img src={lightboxImage} alt="Expanded preview" className="lightbox-image" />
          </div>
        </div>
      )}
    </div>
  );
}
