import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ResidentDashboard from './pages/ResidentDashboard';
import NoticeBoard from './pages/NoticeBoard';
import SettingsPage from './pages/Settings';

// Toast Context Setup
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

// Auth Context Setup
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [toasts, setToasts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on start
  useEffect(() => {
    const storedUser = localStorage.getItem('resisolve_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem('resisolve_user');
      }
    }
    setLoading(false);
  }, []);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem('resisolve_user', JSON.stringify(userData));
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('resisolve_user');
    addToast('Logged out successfully', 'info');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0b0f19',
        color: '#f9fafb',
        fontFamily: 'sans-serif'
      }}>
        <h2>Loading ResiSolve...</h2>
      </div>
    );
  }

  // Helper component for Private/Protected routes
  const ProtectedRoute = ({ children }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return (
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    );
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      <AuthContext.Provider value={{ user, loginUser, logoutUser }}>
        <Router>
          <Routes>
            {/* Public Auth routes */}
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

            {/* Dashboard Redirect Handler based on Role */}
            <Route path="/" element={
              <ProtectedRoute>
                {user?.role === 'admin' ? <AdminDashboard /> : <ResidentDashboard />}
              </ProtectedRoute>
            } />

            {/* Common Protected routes */}
            <Route path="/notices" element={
              <ProtectedRoute>
                <NoticeBoard />
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />

            {/* Fallback routing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>

        {/* Global Toast Container */}
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              <span>{toast.message}</span>
              <button className="toast-close" onClick={() => removeToast(toast.id)}>×</button>
            </div>
          ))}
        </div>
      </AuthContext.Provider>
    </ToastContext.Provider>
  );
}
