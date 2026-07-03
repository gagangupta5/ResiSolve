import React, { useState, useEffect } from 'react';
import { useAuth, useToast } from '../App';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({
    status: { Open: 0, 'In Progress': 0, Resolved: 0 },
    category: { Plumbing: 0, Electrical: 0, Carpentry: 0, Security: 0, Cleanliness: 0, Elevator: 0, Other: 0 },
    overdue: 0
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // Update Modal States
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateNote, setUpdateNote] = useState('');
  const [updatePriority, setUpdatePriority] = useState('');
  const [updating, setUpdating] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/complaints/stats', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`http://localhost:5000/api/complaints?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setComplaints(data.data);
      } else {
        addToast(data.message || 'Failed to fetch complaints', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Could not load complaints', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchComplaints();
  }, [search, category, status, priority, startDate, endDate]);

  const handleExport = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/complaints/export', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ResiSolve-Report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      addToast('CSV report downloaded successfully', 'success');
    } catch (err) {
      addToast('Export failed', 'error');
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
        setUpdateStatus(data.data.status);
        setUpdatePriority(data.data.priority);
        setUpdateNote('');
      } else {
        addToast(data.message || 'Could not fetch complaint details', 'error');
      }
    } catch (err) {
      addToast('Server connection failed', 'error');
    }
  };

  const handleUpdateStatusAndPriority = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      let isSuccess = true;

      // Update status if it changed and complaint is not already Resolved
      if (updateStatus !== selectedComplaint.status && selectedComplaint.status !== 'Resolved') {
        const res = await fetch(`http://localhost:5000/api/complaints/${selectedComplaint._id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({ status: updateStatus, note: updateNote })
        });
        const d = await res.json();
        if (!res.ok) {
          addToast(d.message || 'Status update failed', 'error');
          isSuccess = false;
        }
      }

      // Update priority if it changed
      if (updatePriority !== selectedComplaint.priority && isSuccess) {
        const res = await fetch(`http://localhost:5000/api/complaints/${selectedComplaint._id}/priority`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({ priority: updatePriority })
        });
        const d = await res.json();
        if (!res.ok) {
          addToast(d.message || 'Priority update failed', 'error');
          isSuccess = false;
        }
      }

      if (isSuccess) {
        addToast('Complaint record updated successfully', 'success');
        setSelectedComplaint(null);
        fetchStats();
        fetchComplaints();
      }
    } catch (err) {
      addToast('Failed to write updates', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const totalCount = stats.status.Open + stats.status['In Progress'] + stats.status.Resolved;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '2rem' }}>Society Overview</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, administrator {user.name}</p>
        </div>
        <button onClick={handleExport} className="btn btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card all">
          <div>
            <div className="stat-value">{totalCount}</div>
            <div className="stat-label">Total Logs</div>
          </div>
          <div className="stat-icon">📄</div>
        </div>
        <div className="stat-card open">
          <div>
            <div className="stat-value">{stats.status.Open}</div>
            <div className="stat-label">Open</div>
          </div>
          <div className="stat-icon">🔔</div>
        </div>
        <div className="stat-card progress">
          <div>
            <div className="stat-value">{stats.status['In Progress']}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-icon">⚙️</div>
        </div>
        <div className="stat-card resolved">
          <div>
            <div className="stat-value">{stats.status.Resolved}</div>
            <div className="stat-label">Resolved</div>
          </div>
          <div className="stat-icon">✅</div>
        </div>
        <div className="stat-card overdue">
          <div>
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-label">Overdue</div>
          </div>
          <div className="stat-icon">⚠️</div>
        </div>
      </div>

      <div className="dashboard-panels">
        {/* Advanced Filters and List */}
        <div className="panel" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '20px' }}>Active System Operations</h3>

          <div className="filters-bar">
            <div className="filter-item" style={{ flexGrow: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Search Resident / Flat / Email</label>
              <input
                type="text"
                placeholder="Search keywords..."
                className="filter-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-item">
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Category</label>
              <select className="filter-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All Categories</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Carpentry">Carpentry</option>
                <option value="Security">Security</option>
                <option value="Cleanliness">Cleanliness</option>
                <option value="Elevator">Elevator</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="filter-item">
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status</label>
              <select className="filter-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div className="filter-item">
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Priority</label>
              <select className="filter-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="filter-item">
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Start Date</label>
              <input type="date" className="filter-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="filter-item">
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>End Date</label>
              <input type="date" className="filter-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Retrieving records...</p>
          ) : complaints.length === 0 ? (
            <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No complaints found matching selection criteria.</p>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Flat / Name</th>
                    <th>Category</th>
                    <th>Summary</th>
                    <th>Date Raised</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c._id} onClick={() => handleOpenComplaint(c._id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{c.resident?.flatNo || 'N/A'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.resident?.name || 'Unknown'}</div>
                      </td>
                      <td>{c.category}</td>
                      <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '500' }}>{c.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.description}</div>
                      </td>
                      <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge badge-${c.priority.toLowerCase()}`}>{c.priority}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge badge-${c.status.replace(' ', '').toLowerCase()}`}>{c.status}</span>
                          {c.overdue && <span className="badge badge-overdue">Overdue</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedComplaint && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>Complaint Detail Dashboard</h3>
              <button onClick={() => setSelectedComplaint(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            
            <form onSubmit={handleUpdateStatusAndPriority}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <h4 style={{ color: 'var(--primary)', marginBottom: '8px' }}>{selectedComplaint.title}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>{selectedComplaint.description}</p>
                    
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div><strong>Category:</strong> {selectedComplaint.category}</div>
                      <div><strong>Resident Flat:</strong> {selectedComplaint.resident?.flatNo} ({selectedComplaint.resident?.name})</div>
                      <div><strong>Phone:</strong> {selectedComplaint.resident?.phone}</div>
                      <div><strong>Email:</strong> {selectedComplaint.resident?.email}</div>
                      <div><strong>Registered On:</strong> {new Date(selectedComplaint.createdAt).toLocaleString()}</div>
                    </div>
                  </div>

                  <div>
                    {selectedComplaint.photoUrl ? (
                      <div style={{ cursor: 'zoom-in' }} onClick={() => setLightboxImage(`http://localhost:5000/${selectedComplaint.photoUrl}`)}>
                        <img 
                          src={`http://localhost:5000/${selectedComplaint.photoUrl}`} 
                          alt={selectedComplaint.title}
                          style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', display: 'block', marginTop: '4px' }}>🔍 Click to zoom</span>
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '150px', backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        No Photo Attached
                      </div>
                    )}
                  </div>
                </div>

                <hr style={{ borderColor: 'var(--border-color)', margin: '20px 0' }} />

                {selectedComplaint.status === 'Resolved' ? (
                  <div style={{ padding: '15px', backgroundColor: 'var(--success-glow)', border: '1px solid var(--success)', borderRadius: 'var(--border-radius-md)', marginBottom: '20px' }}>
                    <h5 style={{ color: 'var(--success)', marginBottom: '4px' }}>Complaint Resolved</h5>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>This complaint is closed. Resolved tickets cannot be updated.</p>
                  </div>
                ) : (
                  <div className="form-row" style={{ marginBottom: '15px' }}>
                    <div className="form-group">
                      <label className="form-label">Set Priority</label>
                      <select className="form-input" value={updatePriority} onChange={(e) => setUpdatePriority(e.target.value)}>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Change Status</label>
                      <select className="form-input" value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                )}

                {updateStatus !== selectedComplaint.status && selectedComplaint.status !== 'Resolved' && (
                  <div className="form-group">
                    <label className="form-label">Optional Resolution/Status Update Note</label>
                    <textarea 
                      className="form-input" 
                      style={{ height: '70px', resize: 'none' }}
                      placeholder="Add a progress message or resolution details..."
                      value={updateNote}
                      onChange={(e) => setUpdateNote(e.target.value)}
                    />
                  </div>
                )}

                <h4 style={{ marginBottom: '10px' }}>Lifecycle Progress History</h4>
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
                <button type="button" onClick={() => setSelectedComplaint(null)} className="btn btn-secondary">Close</button>
                {selectedComplaint.status !== 'Resolved' && (
                  <button type="submit" disabled={updating} className="btn btn-primary">
                    {updating ? 'Saving...' : 'Save Updates'}
                  </button>
                )}
              </div>
            </form>
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
