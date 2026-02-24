import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../store/useStore';
import { VitalCard } from '../../components/VitalCard';
import { DocumentsTab } from '../../components/DocumentsTab';
import { DetailedVitalModal } from '../../components/DetailedVitalModal';
import { MultilingualExplanation } from '../../components/MultilingualExplanation';
import PatientOnboarding from '../../components/PatientOnboarding';
import UploadCard from '../../components/UploadCard';
import type { VitalSign } from '../../store/useStore';
import {
  Heart, Thermometer, Wind, Droplets, FileText, Calendar,
  Pill, Upload, User, Clock, Activity, LogOut as LogOutIcon, Shield,
  Building2, BedDouble, Brain, AlertTriangle, CheckCircle
} from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';

interface PatientProfile {
  id: string;
  hospital_id: string;
  hospital_name?: string;
  bed_id?: string;
  bed_number?: string;
  ward?: string;
  age?: number;
  gender?: string;
  condition?: string;
  onboarded: boolean;
}

interface AISummary {
  medications: string[];
  diagnoses: string[];
  risks: string[];
  summaries: { source: string; text: string; file: string; date: string }[];
}

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { patients } = useStore();
  const patient = patients[0]; // Patient sees their own data
  const [selectedVital, setSelectedVital] = useState<{ vital: VitalSign; theme: any } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'prescriptions' | 'appointments'>('overview');

  // Patient intake state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/patient/profile`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.onboarded) {
        setProfile(data.data);
        fetchAISummary();
      } else {
        // Not onboarded yet — show modal
        setShowOnboarding(true);
      }
    } catch {
      // Backend not available — skip onboarding check
    } finally {
      setProfileLoading(false);
    }
  }

  async function fetchAISummary() {
    try {
      const res = await fetch(`${API_URL}/api/patient/ai-summary`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data) setAiSummary(data.data);
    } catch {}
  }

  function handleOnboardingComplete() {
    setShowOnboarding(false);
    fetchProfile();
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Mock prescriptions for patient view
  const prescriptions = [
    { id: 1, name: 'Lisinopril 10mg', frequency: 'Once daily', doctor: 'Dr. Smith', status: 'Active', refills: 3 },
    { id: 2, name: 'Metformin 500mg', frequency: 'Twice daily', doctor: 'Dr. Smith', status: 'Active', refills: 5 },
    { id: 3, name: 'Aspirin 81mg', frequency: 'Once daily', doctor: 'Dr. Johnson', status: 'Active', refills: 6 },
  ];

  // Mock appointments
  const appointments = [
    { id: 1, doctor: 'Dr. Smith', specialty: 'Cardiology', date: '2026-02-25', time: '10:00 AM', type: 'Follow-up', status: 'Confirmed' },
    { id: 2, doctor: 'Dr. Johnson', specialty: 'General Medicine', date: '2026-03-05', time: '2:30 PM', type: 'Check-up', status: 'Pending' },
    { id: 3, doctor: 'Dr. Patel', specialty: 'Endocrinology', date: '2026-03-15', time: '11:00 AM', type: 'Lab Review', status: 'Confirmed' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)', fontFamily: '"Inter", system-ui, sans-serif' }}>
      {/* Onboarding Modal */}
      <PatientOnboarding
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />

      {/* Header */}
      <header style={{
        background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64,
        position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="white" />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>UrbanCare </span>
            <span style={{ fontWeight: 400, color: '#818cf8', fontSize: 16 }}>Patient Portal</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={16} color="#4f46e5" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{user?.name || 'Patient'}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Patient</div>
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

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Welcome Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 16, padding: '28px 32px',
          color: 'white', marginBottom: 28, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: -20, right: 80, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Welcome back, {user?.name || patient?.name || 'Patient'}</h1>
          <p style={{ fontSize: 14, opacity: 0.85 }}>Your health dashboard — track vitals, view reports, and manage appointments</p>

          {/* Hospital & Bed Info */}
          {profile && (
            <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
              {profile.hospital_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: 0.9 }}>
                  <Building2 size={14} /> {profile.hospital_name}
                </div>
              )}
              {profile.bed_number && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: 0.9 }}>
                  <BedDouble size={14} /> Bed {profile.bed_number} • {profile.ward || 'General'}
                </div>
              )}
              {profile.condition && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, opacity: 0.9 }}>
                  <Activity size={14} /> {profile.condition}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'white', borderRadius: 12, padding: 4, border: '1px solid #e2e8f0' }}>
          {[
            { id: 'overview' as const, label: 'My Vitals', icon: <Heart size={15} /> },
            { id: 'reports' as const, label: 'Reports & Documents', icon: <FileText size={15} /> },
            { id: 'prescriptions' as const, label: 'Prescriptions', icon: <Pill size={15} /> },
            { id: 'appointments' as const, label: 'Appointments', icon: <Calendar size={15} /> },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === tab.id ? '#4f46e5' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#64748b',
              transition: 'all 0.2s ease',
            }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB: My Vitals ═══ */}
        {activeTab === 'overview' && patient && (
          <div>
            {/* Patient Info Bar */}
            <div style={{
              background: 'white', borderRadius: 14, padding: '20px 24px', marginBottom: 24,
              border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
                <User size={15} /> {profile?.age || patient.age} Years, {profile?.gender || patient.gender}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
                <Activity size={15} /> {profile?.condition || patient.condition}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
                <Clock size={15} /> Last updated: {patient.lastUpdated}
              </div>
              <div style={{
                marginLeft: 'auto', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: patient.riskLevel === 'Critical' ? '#fef2f2' : patient.riskLevel === 'Warning' ? '#fffbeb' : '#f0fdf4',
                color: patient.riskLevel === 'Critical' ? '#dc2626' : patient.riskLevel === 'Warning' ? '#d97706' : '#16a34a',
                border: `1px solid ${patient.riskLevel === 'Critical' ? '#fecaca' : patient.riskLevel === 'Warning' ? '#fde68a' : '#bbf7d0'}`,
              }}>
                {patient.riskLevel || 'Stable'}
              </div>
            </div>

            {/* Vitals Grid */}
            {patient.admissionStatus === 'admitted' && patient.monitoringEnabled ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 28 }}>
                <VitalCard vital={patient.vitals.heartRate} theme="rose" onClick={() => setSelectedVital({ vital: patient.vitals.heartRate, theme: 'rose' })} />
                <VitalCard vital={patient.vitals.spO2} theme="sky" onClick={() => setSelectedVital({ vital: patient.vitals.spO2, theme: 'sky' })} />
                <VitalCard vital={patient.vitals.temperature} theme="amber" onClick={() => setSelectedVital({ vital: patient.vitals.temperature, theme: 'amber' })} />
                <VitalCard vital={patient.vitals.respiration} theme="emerald" onClick={() => setSelectedVital({ vital: patient.vitals.respiration, theme: 'emerald' })} />
              </div>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '32px 24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14,
                textAlign: 'center', marginBottom: 28,
              }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Activity size={24} color="#94a3b8" />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#334155', margin: 0 }}>Patient not admitted yet</p>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>Vitals monitoring will start after admission</p>
              </div>
            )}

            {/* AI Health Summary */}
            {aiSummary && (aiSummary.diagnoses.length > 0 || aiSummary.medications.length > 0 || aiSummary.risks.length > 0) && (
              <div style={{
                background: 'linear-gradient(135deg, #faf5ff, #eef2ff)', borderRadius: 14,
                padding: 24, border: '1px solid #e0e7ff', marginBottom: 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Brain size={18} color="#7c3aed" />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>AI Health Summary</h3>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: '#7c3aed', color: 'white', marginLeft: 'auto' }}>
                    TxGemma
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  {aiSummary.diagnoses.length > 0 && (
                    <div style={{ background: 'white', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#4f46e5', marginBottom: 6, textTransform: 'uppercase' as const }}>
                        <Activity size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Diagnosis
                      </div>
                      {[...new Set(aiSummary.diagnoses)].map((d, i) => (
                        <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}>• {d}</div>
                      ))}
                    </div>
                  )}
                  {aiSummary.medications.length > 0 && (
                    <div style={{ background: 'white', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#0891b2', marginBottom: 6, textTransform: 'uppercase' as const }}>
                        <Pill size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Medications
                      </div>
                      {[...new Set(aiSummary.medications)].map((m, i) => (
                        <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}>• {m}</div>
                      ))}
                    </div>
                  )}
                  {aiSummary.risks.length > 0 && (
                    <div style={{ background: 'white', borderRadius: 10, padding: '12px 14px', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', marginBottom: 6, textTransform: 'uppercase' as const }}>
                        <AlertTriangle size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Risk Alerts
                      </div>
                      {[...new Set(aiSummary.risks)].map((r, i) => (
                        <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}>⚠️ {r}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Read-only Clinical Report */}
            <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="#4f46e5" /> Doctor's Clinical Report
              </h3>
              <MultilingualExplanation patient={patient} />
            </div>
          </div>
        )}

        {/* ═══ TAB: Reports & Documents ═══ */}
        {activeTab === 'reports' && patient && (
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
              background: 'white', borderRadius: 14, padding: '16px 24px', border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <FileText size={18} color="#4f46e5" /> My Documents
              </h3>
            </div>

            {/* Upload Cards */}
            <div style={{
              background: 'white', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0', marginBottom: 20,
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Upload size={16} color="#4f46e5" /> Upload Medical Documents
              </h4>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                Drag and drop or click to upload. TxGemma AI will analyze your documents automatically.
              </p>
              <div style={{ display: 'grid', gap: 12 }}>
                <UploadCard
                  type="doctor_report"
                  label="Doctor Report"
                  description="Previous diagnosis or consultation report (PDF)"
                  patientProfileId={profile?.id}
                  onUploadComplete={() => fetchAISummary()}
                />
                <UploadCard
                  type="pharmacy_bill"
                  label="Pharmacy Bill"
                  description="Medication purchase receipts (PDF)"
                  patientProfileId={profile?.id}
                  onUploadComplete={() => fetchAISummary()}
                />
                <UploadCard
                  type="lab_report"
                  label="Lab Report"
                  description="Blood work, tests, or lab results (PDF)"
                  patientProfileId={profile?.id}
                  onUploadComplete={() => fetchAISummary()}
                />
              </div>
            </div>

            <DocumentsTab patientId={patient.id} />
          </div>
        )}

        {/* ═══ TAB: Prescriptions ═══ */}
        {activeTab === 'prescriptions' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pill size={18} color="#7c3aed" /> Active Prescriptions
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {['Medication', 'Frequency', 'Prescribed By', 'Refills', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prescriptions.map(rx => (
                  <tr key={rx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 12px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{rx.name}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#64748b' }}>{rx.frequency}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#64748b' }}>{rx.doctor}</td>
                    <td style={{ padding: '14px 12px', fontSize: 13, color: '#64748b' }}>{rx.refills} remaining</td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>{rx.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ TAB: Appointments ═══ */}
        {activeTab === 'appointments' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="#0891b2" /> Upcoming Appointments
            </h3>
            <div style={{ display: 'grid', gap: 16 }}>
              {appointments.map(appt => (
                <div key={appt.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px',
                  borderRadius: 12, border: '1px solid #e2e8f0', background: '#fafbff', transition: 'all 0.2s ease'
                }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{appt.doctor}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{appt.specialty} — {appt.type}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5', marginBottom: 4 }}>{appt.date}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{appt.time}</div>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: appt.status === 'Confirmed' ? '#f0fdf4' : '#fffbeb',
                    color: appt.status === 'Confirmed' ? '#16a34a' : '#d97706',
                    border: `1px solid ${appt.status === 'Confirmed' ? '#bbf7d0' : '#fde68a'}`,
                  }}>{appt.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vital Detail Modal */}
      <DetailedVitalModal
        isOpen={!!selectedVital}
        onClose={() => setSelectedVital(null)}
        vital={selectedVital?.vital || null}
        theme={selectedVital?.theme || 'rose'}
      />
    </div>
  );
}
