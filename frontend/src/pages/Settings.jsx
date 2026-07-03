import React, { useState, useEffect } from 'react';
import { useAuth, useToast } from '../App';

export default function Settings() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [thresholdDays, setThresholdDays] = useState(5);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    if (user.role !== 'admin') return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/settings', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setThresholdDays(data.data.overdueThresholdDays);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ overdueThresholdDays: Number(thresholdDays) })
      });

      const data = await response.json();
      if (response.ok) {
        addToast(`Overdue threshold updated to ${thresholdDays} days.`, 'success');
      } else {
        addToast(data.message || 'Failed to save settings', 'error');
      }
    } catch (err) {
      addToast('Could not save to server', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem' }}>Account & Config Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your personal details and system configurations</p>
      </div>

      <div className="dashboard-panels">
        {/* Personal Profile Panel */}
        <div className="panel">
          <h3 style={{ marginBottom: '20px' }}>Personal Profile Info</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="sidebar-user-avatar" style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h4 style={{ fontSize: '1.2rem' }}>{user.name}</h4>
                <span className="badge badge-progress" style={{ textTransform: 'capitalize', marginTop: '4px' }}>{user.role}</span>
              </div>
            </div>

            <hr style={{ borderColor: 'var(--border-color)' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', fontSize: '0.95rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>EMAIL ADDRESS</span>
                <strong>{user.email}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>FLAT / APARTMENT NUMBER</span>
                <strong>{user.flatNo}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>PHONE NUMBER</span>
                <strong>{user.phone}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Threshold Panel */}
        {user.role === 'admin' && (
          <div className="panel">
            <h3 style={{ marginBottom: '20px' }}>System Configurations</h3>
            
            {loading ? (
              <p style={{ color: 'var(--text-secondary)' }}>Loading settings details...</p>
            ) : (
              <form onSubmit={handleSaveSettings}>
                <div className="form-group" style={{ marginBottom: '25px' }}>
                  <label className="form-label">
                    Overdue Complaint Threshold: <strong style={{ color: 'var(--warning)', fontSize: '1.1rem' }}>{thresholdDays} days</strong>
                  </label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: '1.4' }}>
                    Define the duration (in days) that complaints can remain open before they are dynamically flagged as "Overdue" and prioritized at the top of the queue.
                  </p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>1 Day</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="30" 
                      style={{ flexGrow: 1, height: '6px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      value={thresholdDays}
                      onChange={(e) => setThresholdDays(e.target.value)}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>30 Days</span>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
                  {saving ? 'Updating...' : 'Save Configuration'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
