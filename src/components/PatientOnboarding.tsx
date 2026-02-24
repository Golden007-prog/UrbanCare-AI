import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2, User, Heart, Upload, CheckCircle, ChevronRight,
  ChevronLeft, FileText, Loader2, X, Stethoscope
} from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';

interface Hospital {
  id: string;
  name: string;
  address?: string;
  contact_email?: string;
}

interface PatientOnboardingProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function PatientOnboarding({ open, onClose, onComplete }: PatientOnboardingProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, 'idle' | 'uploading' | 'done' | 'error'>>({});

  // Form state
  const [hospitalId, setHospitalId] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [condition, setCondition] = useState('');
  const [files, setFiles] = useState<{ file: File; type: string }[]>([]);

  useEffect(() => {
    if (open) {
      fetchHospitals();
    }
  }, [open]);

  const DEFAULT_HOSPITALS: Hospital[] = [
    { id: 'H001', name: 'UrbanCare Medical Center', address: 'Metro Healthcare Campus' },
    { id: 'H002', name: 'City General Hospital', address: 'Downtown Medical District' },
    { id: 'H003', name: 'Green Valley Clinic', address: 'Suburban Health Park' },
  ];

  async function fetchHospitals() {
    try {
      const res = await fetch(`${API_URL}/api/patient/hospitals`, { credentials: 'include' });
      if (!res.ok) {
        setHospitals(DEFAULT_HOSPITALS);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setHospitals(data.data);
      } else {
        setHospitals(DEFAULT_HOSPITALS);
      }
    } catch (err) {
      // Network error or server unreachable — use defaults
      setHospitals(DEFAULT_HOSPITALS);
    }
  }

  function handleFileAdd(file: File, type: string) {
    setFiles((prev) => [...prev.filter((f) => f.type !== type), { file, type }]);
  }

  function handleFileDrop(e: React.DragEvent, type: string) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileAdd(file, type);
  }

  async function handleSubmit() {
    if (!hospitalId) return;
    setSubmitting(true);

    try {
      // Step 1: Onboard
      const onboardRes = await fetch(`${API_URL}/api/patient/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hospital_id: hospitalId, age: age || null, gender: gender || null, condition }),
      });
      const onboardData = await onboardRes.json();

      if (!onboardData.success) {
        throw new Error(onboardData.error || 'Onboarding failed');
      }

      // Step 2: Upload files
      for (const { file, type } of files) {
        setUploadingFiles((prev) => ({ ...prev, [type]: 'uploading' }));
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', type);

          await fetch(`${API_URL}/api/patient/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          setUploadingFiles((prev) => ({ ...prev, [type]: 'done' }));
        } catch {
          setUploadingFiles((prev) => ({ ...prev, [type]: 'error' }));
        }
      }

      // Move to completion step
      setStep(3);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      console.error('Onboarding error:', err);
      alert(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const steps = [
    { label: 'Hospital', icon: <Building2 size={16} /> },
    { label: 'Medical Info', icon: <Heart size={16} /> },
    { label: 'Documents', icon: <Upload size={16} /> },
    { label: 'Complete', icon: <CheckCircle size={16} /> },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 560, background: 'white', borderRadius: 20,
        boxShadow: '0 25px 50px rgba(0,0,0,0.15)', overflow: 'hidden',
        animation: 'slideUp 0.3s ease-out',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '24px 28px',
          color: 'white', position: 'relative',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)',
            border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="white" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Stethoscope size={22} />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Complete Medical Intake</h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
            Set up your health profile to get AI-powered insights
          </p>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', padding: '16px 28px', gap: 4, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
              borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: step === i ? '#4f46e5' : step > i ? '#10b981' : '#f1f5f9',
              color: step === i ? 'white' : step > i ? 'white' : '#94a3b8',
              transition: 'all 0.3s ease',
            }}>
              {step > i ? <CheckCircle size={14} /> : s.icon}
              <span style={{ display: i < 2 || step === i ? 'block' : 'none' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px', minHeight: 300 }}>

          {/* ═══ STEP 0: Hospital Selection ═══ */}
          {step === 0 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Select Your Hospital</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Choose the hospital where you'll receive care</p>
              <div style={{ display: 'grid', gap: 10 }}>
                {hospitals.map((h) => (
                  <label key={h.id} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                    border: `2px solid ${hospitalId === h.id ? '#4f46e5' : '#e2e8f0'}`,
                    borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s ease',
                    background: hospitalId === h.id ? '#eef2ff' : 'white',
                  }}>
                    <input type="radio" name="hospital" value={h.id} checked={hospitalId === h.id}
                      onChange={() => setHospitalId(h.id)} style={{ display: 'none' }} />
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: hospitalId === h.id ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#f1f5f9',
                    }}>
                      <Building2 size={20} color={hospitalId === h.id ? 'white' : '#94a3b8'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{h.name}</div>
                      {h.address && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{h.address}</div>}
                    </div>
                    {hospitalId === h.id && <CheckCircle size={20} color="#4f46e5" />}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ═══ STEP 1: Medical Info ═══ */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Medical Information</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Help us understand your health background</p>
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Age</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 45" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Gender</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} style={inputStyle}>
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Primary Condition / Reason for Visit</label>
                  <textarea value={condition} onChange={(e) => setCondition(e.target.value)}
                    placeholder="e.g. Hypertension, Diabetes Type 2, Annual check-up..."
                    rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Document Upload ═══ */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Upload Documents</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Upload your previous medical records (optional)</p>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { type: 'doctor_report', label: 'Doctor Report', desc: 'Previous diagnosis or consultation report' },
                  { type: 'pharmacy_bill', label: 'Pharmacy Bill', desc: 'Medication purchase receipts' },
                  { type: 'lab_report', label: 'Lab Report', desc: 'Blood work, tests, or lab results' },
                ].map(({ type, label, desc }) => {
                  const uploadedFile = files.find((f) => f.type === type);
                  const status = uploadingFiles[type] || 'idle';
                  return (
                    <div key={type}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleFileDrop(e, type)}
                      style={{
                        border: `2px dashed ${uploadedFile ? '#10b981' : '#d1d5db'}`,
                        borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                        background: uploadedFile ? '#f0fdf4' : '#fafbfc',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.jpg,.jpeg,.png';
                        input.onchange = (e: any) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileAdd(file, type);
                        };
                        input.click();
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: uploadedFile ? '#dcfce7' : '#f1f5f9',
                        }}>
                          {status === 'uploading' ? (
                            <Loader2 size={18} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
                          ) : uploadedFile ? (
                            <CheckCircle size={18} color="#16a34a" />
                          ) : (
                            <FileText size={18} color="#94a3b8" />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{label}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>
                            {uploadedFile ? uploadedFile.file.name : desc}
                          </div>
                        </div>
                        {!uploadedFile && (
                          <span style={{ fontSize: 11, color: '#94a3b8', padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                            Browse
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 12, textAlign: 'center' }}>
                Accepted: PDF, JPG, PNG (max 20MB). Your files are processed by TxGemma AI.
              </p>
            </div>
          )}

          {/* ═══ STEP 3: Complete ═══ */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
              }}>
                <CheckCircle size={36} color="white" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>You're All Set!</h3>
              <p style={{ fontSize: 14, color: '#64748b', maxWidth: 300, margin: '0 auto' }}>
                Your medical profile is ready. AI clinical analysis is processing your documents.
              </p>
            </div>
          )}
        </div>

        {/* Footer / Navigation */}
        {step < 3 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '16px 28px',
            borderTop: '1px solid #e2e8f0', background: '#f8fafc',
          }}>
            {step > 0 ? (
              <button onClick={() => setStep((s) => s - 1)} style={backBtnStyle}>
                <ChevronLeft size={16} /> Back
              </button>
            ) : <div />}

            {step < 2 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 && !hospitalId}
                style={{
                  ...nextBtnStyle,
                  opacity: step === 0 && !hospitalId ? 0.5 : 1,
                  cursor: step === 0 && !hospitalId ? 'not-allowed' : 'pointer',
                }}
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} style={submitBtnStyle}>
                {submitting ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                ) : (
                  <><CheckCircle size={16} /> Complete Intake</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: 10,
  fontSize: 14, color: '#1e293b', outline: 'none', background: 'white',
  transition: 'border-color 0.2s', boxSizing: 'border-box' as const,
};

const nextBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
  background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white',
  border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
};

const backBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
  background: 'white', color: '#64748b', border: '1px solid #e2e8f0',
  borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer',
};

const submitBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px',
  background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white',
  border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer',
};
