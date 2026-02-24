import React, { useState } from 'react';
import UploadCard from '../../components/UploadCard';
import { useAuth } from '../../context/AuthContext';
import {
  FlaskConical, FileText, Clock, CheckCircle, AlertTriangle,
  Upload, Search, User, LogOut as LogOutIcon, Shield, BarChart3
} from 'lucide-react';

export default function LabDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'upload'>('pending');

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Mock lab data
  const pendingTests = [
    { id: 'T001', patient: 'John Doe', test: 'Complete Blood Count', doctor: 'Dr. Smith', priority: 'Urgent', received: '2026-02-22 08:30' },
    { id: 'T002', patient: 'Jane Smith', test: 'Lipid Panel', doctor: 'Dr. Johnson', priority: 'Normal', received: '2026-02-22 09:15' },
    { id: 'T003', patient: 'Mike Brown', test: 'HbA1c', doctor: 'Dr. Patel', priority: 'Normal', received: '2026-02-22 09:45' },
    { id: 'T004', patient: 'Sarah Davis', test: 'Thyroid Function', doctor: 'Dr. Smith', priority: 'Urgent', received: '2026-02-22 10:00' },
    { id: 'T005', patient: 'Tom Wilson', test: 'Blood Culture', doctor: 'Dr. Johnson', priority: 'Critical', received: '2026-02-22 07:20' },
  ];

  const completedTests = [
    { id: 'T098', patient: 'Alice Green', test: 'Liver Function', doctor: 'Dr. Patel', result: 'Normal', completed: '2026-02-21 16:30' },
    { id: 'T097', patient: 'Bob Lee', test: 'Urinalysis', doctor: 'Dr. Smith', result: 'Abnormal', completed: '2026-02-21 15:00' },
    { id: 'T096', patient: 'Carol White', test: 'Electrolytes', doctor: 'Dr. Johnson', result: 'Normal', completed: '2026-02-21 14:20' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f0f0ff 100%)', fontFamily: '"Inter", system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{
        background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64,
        position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlaskConical size={18} color="white" />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>UrbanCare </span>
            <span style={{ fontWeight: 400, color: '#a78bfa', fontSize: 16 }}>Lab Portal</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FlaskConical size={16} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{user?.name || 'Lab User'}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Laboratory</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid #e2e8f0',
            borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, color: '#64748b'
          }}>
            <LogOutIcon size={14} /> Logout
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: 16, padding: '28px 32px',
          color: 'white', marginBottom: 28, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Laboratory Dashboard</h1>
          <p style={{ fontSize: 14, opacity: 0.85 }}>Manage test samples, upload results, and track lab orders</p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Pending Tests', value: pendingTests.length, color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: <Clock size={20} /> },
            { label: 'Completed Today', value: completedTests.length, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: <CheckCircle size={20} /> },
            { label: 'Critical Priority', value: pendingTests.filter(t => t.priority === 'Critical').length, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <AlertTriangle size={20} /> },
            { label: 'Avg Turnaround', value: '4.2h', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', icon: <BarChart3 size={20} /> },
          ].map((kpi, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: 14, padding: '20px 18px', border: '1px solid #e2e8f0',
              borderTop: `3px solid ${kpi.color}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{kpi.label}</span>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{kpi.value}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'white', borderRadius: 12, padding: 4, border: '1px solid #e2e8f0' }}>
          {[
            { id: 'pending' as const, label: 'Pending Tests', icon: <Clock size={15} /> },
            { id: 'completed' as const, label: 'Completed Results', icon: <CheckCircle size={15} /> },
            { id: 'upload' as const, label: 'Upload Results', icon: <Upload size={15} /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.id ? '#7c3aed' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#64748b',
              transition: 'all 0.2s ease',
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Pending Tests Table */}
        {activeTab === 'pending' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Test ID', 'Patient', 'Test', 'Ordering Dr.', 'Priority', 'Received', 'Action'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingTests.map(test => (
                  <tr key={test.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 12px', fontSize: 13, fontWeight: 600, color: '#7c3aed', fontFamily: 'monospace' }}>{test.id}</td>
                    <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{test.patient}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#475569' }}>{test.test}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#64748b' }}>{test.doctor}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: test.priority === 'Critical' ? '#fef2f2' : test.priority === 'Urgent' ? '#fffbeb' : '#f0f9ff',
                        color: test.priority === 'Critical' ? '#dc2626' : test.priority === 'Urgent' ? '#d97706' : '#0284c7',
                        border: `1px solid ${test.priority === 'Critical' ? '#fecaca' : test.priority === 'Urgent' ? '#fde68a' : '#bae6fd'}`,
                      }}>{test.priority}</span>
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{test.received}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <button style={{
                        padding: '5px 14px', borderRadius: 6, background: '#7c3aed', color: 'white',
                        border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600
                      }}>Enter Result</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Completed Results */}
        {activeTab === 'completed' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Test ID', 'Patient', 'Test', 'Result', 'Completed', 'Action'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {completedTests.map(test => (
                  <tr key={test.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 12px', fontSize: 13, fontWeight: 600, color: '#7c3aed', fontFamily: 'monospace' }}>{test.id}</td>
                    <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{test.patient}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#475569' }}>{test.test}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: test.result === 'Normal' ? '#f0fdf4' : '#fef2f2',
                        color: test.result === 'Normal' ? '#16a34a' : '#dc2626',
                      }}>{test.result}</span>
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{test.completed}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <button style={{
                        padding: '5px 14px', borderRadius: 6, background: 'white', color: '#7c3aed',
                        border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 12, fontWeight: 600
                      }}>View PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Upload Results */}
        {activeTab === 'upload' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={18} color="#7c3aed" /> Upload Lab Results
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Upload test results for a patient. TxGemma AI will automatically analyze the report.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Patient Profile ID</label>
              <input type="text" placeholder="e.g. PP-a1b2c3d4" style={{
                width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: 10,
                fontSize: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box' as const,
              }} />
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <UploadCard type="lab_report" label="Lab Test Report" description="Upload CBC, lipid panel, metabolic, or other lab results (PDF)" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
