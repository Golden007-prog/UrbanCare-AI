import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

/** Returns the correct dashboard path for a given role */
export function getDashboardPath(role: string): string {
  switch (role) {
    case 'doctor':          return '/doctor/dashboard';
    case 'patient':         return '/patient/dashboard';
    case 'laboratory':
    case 'lab':             return '/lab/dashboard';
    case 'pharmacist':      return '/pharmacy/dashboard';
    case 'super_admin':     return '/admin/dashboard';
    case 'hospital_admin':  return '/hospital-admin/dashboard';
    default:                return '/login';
  }
}

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoBack = () => {
    if (user) {
      navigate(getDashboardPath(user.role), { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #fef2f2 0%, #f8fafc 40%, #fee2e2 100%)',
      fontFamily: '"Inter", system-ui, sans-serif', padding: '40px 16px',
    }}>
      <div style={{
        maxWidth: 440, width: '100%', background: 'white', borderRadius: 20,
        padding: '48px 36px', textAlign: 'center' as const,
        boxShadow: '0 4px 40px rgba(0,0,0,0.06)', border: '1px solid #fecaca',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px',
          background: 'linear-gradient(135deg, #ef4444, #f87171)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldAlert size={32} color="white" />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
          Access Denied
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 28, lineHeight: 1.6 }}>
          You don't have permission to access this page.
          {user && (
            <span style={{ display: 'block', marginTop: 8, fontSize: 13, color: '#94a3b8' }}>
              Logged in as <strong style={{ color: '#4f46e5' }}>{user.name}</strong> ({user.role})
            </span>
          )}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          <button onClick={handleGoBack} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 10, background: '#4f46e5', color: 'white',
            border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}>
            <ArrowLeft size={16} /> Go to My Dashboard
          </button>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 10, background: 'white', color: '#64748b',
            border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 14, fontWeight: 500,
          }}>
            <LogIn size={16} /> Sign in with a different account
          </button>
        </div>
      </div>
    </div>
  );
}
