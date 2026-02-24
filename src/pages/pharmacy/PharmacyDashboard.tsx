import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadCard from '../../components/UploadCard';
import { useAuth } from '../../context/AuthContext';
import {
  Pill, FileText, DollarSign, Clock, CheckCircle,
  Search, User, LogOut as LogOutIcon, Package, AlertCircle, BarChart3
} from 'lucide-react';

export default function PharmacyDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'inventory' | 'billing'>('prescriptions');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Mock prescriptions data
  const prescriptions = [
    { id: 'RX001', patient: 'John Doe', medication: 'Lisinopril 10mg', qty: 30, doctor: 'Dr. Smith', status: 'Pending', date: '2026-02-22' },
    { id: 'RX002', patient: 'Jane Smith', medication: 'Metformin 500mg', qty: 60, doctor: 'Dr. Johnson', status: 'Dispensed', date: '2026-02-22' },
    { id: 'RX003', patient: 'Mike Brown', medication: 'Amoxicillin 500mg', qty: 21, doctor: 'Dr. Patel', status: 'Pending', date: '2026-02-22' },
    { id: 'RX004', patient: 'Sarah Davis', medication: 'Omeprazole 20mg', qty: 30, doctor: 'Dr. Smith', status: 'Ready', date: '2026-02-22' },
    { id: 'RX005', patient: 'Tom Wilson', medication: 'Atorvastatin 40mg', qty: 30, doctor: 'Dr. Johnson', status: 'Pending', date: '2026-02-22' },
  ];

  // Mock inventory
  const inventory = [
    { name: 'Lisinopril 10mg', stock: 250, min: 50, unit: 'tablets', category: 'Cardiovascular' },
    { name: 'Metformin 500mg', stock: 180, min: 100, unit: 'tablets', category: 'Diabetes' },
    { name: 'Amoxicillin 500mg', stock: 320, min: 80, unit: 'capsules', category: 'Antibiotic' },
    { name: 'Omeprazole 20mg', stock: 45, min: 60, unit: 'capsules', category: 'Gastrointestinal' },
    { name: 'Atorvastatin 40mg', stock: 150, min: 50, unit: 'tablets', category: 'Cardiovascular' },
    { name: 'Aspirin 81mg', stock: 500, min: 100, unit: 'tablets', category: 'Cardiovascular' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #ecfeff 100%)', fontFamily: '"Inter", system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{
        background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64,
        position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #0891b2, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill size={18} color="white" />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>UrbanCare </span>
            <span style={{ fontWeight: 400, color: '#22d3ee', fontSize: 16 }}>Pharmacy</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pill size={16} color="#0891b2" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{user?.name || 'Pharmacist'}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Pharmacist</div>
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
          background: 'linear-gradient(135deg, #0891b2, #06b6d4)', borderRadius: 16, padding: '28px 32px',
          color: 'white', marginBottom: 28, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Pharmacy Dashboard</h1>
          <p style={{ fontSize: 14, opacity: 0.85 }}>Manage prescriptions, inventory, and billing</p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Pending Rx', value: prescriptions.filter(p => p.status === 'Pending').length, color: '#d97706', icon: <Clock size={20} /> },
            { label: 'Dispensed Today', value: prescriptions.filter(p => p.status === 'Dispensed').length, color: '#16a34a', icon: <CheckCircle size={20} /> },
            { label: 'Low Stock Items', value: inventory.filter(i => i.stock < i.min).length, color: '#dc2626', icon: <AlertCircle size={20} /> },
            { label: 'Revenue Today', value: '$1,245', color: '#0891b2', icon: <DollarSign size={20} /> },
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
            { id: 'prescriptions' as const, label: 'Prescriptions', icon: <FileText size={15} /> },
            { id: 'inventory' as const, label: 'Inventory', icon: <Package size={15} /> },
            { id: 'billing' as const, label: 'Billing', icon: <DollarSign size={15} /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.id ? '#0891b2' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#64748b',
              transition: 'all 0.2s ease',
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Prescriptions */}
        {activeTab === 'prescriptions' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Rx ID', 'Patient', 'Medication', 'Qty', 'Doctor', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prescriptions.map(rx => (
                  <tr key={rx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 12px', fontSize: 13, fontWeight: 600, color: '#0891b2', fontFamily: 'monospace' }}>{rx.id}</td>
                    <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{rx.patient}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#475569' }}>{rx.medication}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#64748b' }}>{rx.qty}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#64748b' }}>{rx.doctor}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: rx.status === 'Dispensed' ? '#f0fdf4' : rx.status === 'Ready' ? '#ecfeff' : '#fffbeb',
                        color: rx.status === 'Dispensed' ? '#16a34a' : rx.status === 'Ready' ? '#0891b2' : '#d97706',
                      }}>{rx.status}</span>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                      {rx.status === 'Pending' && (
                        <button style={{
                          padding: '5px 14px', borderRadius: 6, background: '#0891b2', color: 'white',
                          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600
                        }}>Dispense</button>
                      )}
                      {rx.status === 'Ready' && (
                        <button style={{
                          padding: '5px 14px', borderRadius: 6, background: '#16a34a', color: 'white',
                          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600
                        }}>Confirm Pickup</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Inventory */}
        {activeTab === 'inventory' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Medication', 'Category', 'In Stock', 'Min Level', 'Unit', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: item.stock < item.min ? '#fef2f2' : 'transparent' }}>
                    <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{item.name}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#64748b' }}>{item.category}</td>
                    <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 700, color: item.stock < item.min ? '#dc2626' : '#1e293b' }}>{item.stock}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#94a3b8' }}>{item.min}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#64748b' }}>{item.unit}</td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: item.stock < item.min ? '#fef2f2' : '#f0fdf4',
                        color: item.stock < item.min ? '#dc2626' : '#16a34a',
                      }}>{item.stock < item.min ? '⚠ Low Stock' : '✓ In Stock'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Billing */}
        {activeTab === 'billing' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={18} color="#0891b2" /> Billing & Upload
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Upload pharmacy bills for patients. TxGemma AI will extract medication details.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div style={{ padding: '16px 20px', background: '#ecfeff', borderRadius: 12, border: '1px solid #cffafe' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0891b2', marginBottom: 4, textTransform: 'uppercase' as const }}>Daily Revenue</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>$1,245.00</div>
              </div>
              <div style={{ padding: '16px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' as const }}>Invoices</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>12 <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 400 }}>generated</span></div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Patient Profile ID</label>
              <input type="text" placeholder="e.g. PP-a1b2c3d4" style={{
                width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: 10,
                fontSize: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box' as const,
              }} />
            </div>
            <UploadCard type="pharmacy_bill" label="Pharmacy Bill" description="Upload medication purchase receipts or prescriptions filled (PDF)" />
          </div>
        )}
      </div>
    </div>
  );
}
