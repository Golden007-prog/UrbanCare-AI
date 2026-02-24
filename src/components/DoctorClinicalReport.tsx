import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, FileText, Send, Edit3, Save, Download, Upload,
  CheckCircle, AlertTriangle, Loader2, X, Eye, PenTool,
  Clock, User, Activity, Stethoscope, ClipboardList, Pill, FlaskConical, BrainCircuit
} from 'lucide-react';
import { useStore, Patient } from '../store/useStore';
import { aiPost } from '../lib/aiClient';
import { useAuth } from '../context/AuthContext';

interface DoctorClinicalReportProps {
  patient: Patient;
  open: boolean;
  onClose: () => void;
}

interface ReportSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  editable: boolean;
}

const INITIAL_SECTIONS: ReportSection[] = [
  { id: 'subjective', title: 'Subjective', icon: <User size={16} />, content: '', editable: false },
  { id: 'objective', title: 'Objective', icon: <Activity size={16} />, content: '', editable: false },
  { id: 'assessment', title: 'Assessment', icon: <Stethoscope size={16} />, content: '', editable: false },
  { id: 'plan', title: 'Plan', icon: <ClipboardList size={16} />, content: '', editable: false },
  { id: 'medications', title: 'Medications', icon: <Pill size={16} />, content: '', editable: false },
  { id: 'labOrders', title: 'Lab Orders', icon: <FlaskConical size={16} />, content: '', editable: false },
  { id: 'doctorNotes', title: "Doctor's Notes", icon: <PenTool size={16} />, content: '', editable: false },
];

export function DoctorClinicalReport({ patient, open, onClose }: DoctorClinicalReportProps) {
  const { user } = useAuth();
  const { settings, updatePatientNotes } = useStore();
  const [sections, setSections] = useState<ReportSection[]>(INITIAL_SECTIONS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [status, setStatus] = useState<'idle' | 'generated' | 'saved' | 'uploaded'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState<{ role: string; text: string }[]>([]);
  const [isConsulting, setIsConsulting] = useState(false);

  const hasContent = sections.some(s => s.content.trim() !== '');

  // ─── Generate full report via AI ───
  const handleGenerateReport = useCallback(async () => {
    setIsGenerating(true);
    setStatus('idle');
    try {
      const result = await aiPost('/api/generate-soap', {
        patientName: patient.name,
        age: patient.age,
        gender: patient.gender,
        condition: patient.condition,
        vitals: {
          heartRate: patient.vitals.heartRate.value,
          spO2: patient.vitals.spO2.value,
          temperature: patient.vitals.temperature.value,
          respiration: patient.vitals.respiration.value,
          bloodPressure: {
            sys: patient.vitals.bloodPressure.sys,
            dia: patient.vitals.bloodPressure.dia,
          },
        },
        risk: patient.riskLevel,
        history: patient.notes.hpi || '',
        notes: patient.notes.soap || '',
      }, settings.offlineMode);

      const data = result.data;
      setSections(prev => prev.map(s => {
        switch (s.id) {
          case 'subjective': return { ...s, content: data.subjective || 'No subjective data available.' };
          case 'objective': return { ...s, content: data.objective || 'No objective findings.' };
          case 'assessment': return { ...s, content: data.assessment || 'No assessment generated.' };
          case 'plan': return { ...s, content: data.plan || 'No plan generated.' };
          case 'medications': return { ...s, content: data.medications || 'Continue current medications as prescribed.' };
          case 'labOrders': return { ...s, content: data.labOrders || 'No lab orders at this time.' };
          case 'doctorNotes': return { ...s, content: '' };
          default: return s;
        }
      }));
      setStatus('generated');
    } catch (err) {
      console.error('Report generation failed:', err);
      setSections(prev => prev.map(s =>
        s.id === 'subjective' ? { ...s, content: '⚠ Failed to generate report. Please ensure the backend server is running.' } : s
      ));
    } finally {
      setIsGenerating(false);
    }
  }, [patient, settings.offlineMode]);

  // ─── AI Consultation for individual section refinement ───
  const handleAiConsult = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    const userMsg = aiPrompt.trim();
    setAiChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiPrompt('');
    setIsConsulting(true);
    try {
      const result = await aiPost('/api/ai-consult', {
        message: userMsg,
        patientContext: {
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          condition: patient.condition,
          vitals: patient.vitals,
          riskLevel: patient.riskLevel,
        },
        reportSections: sections.reduce((acc, s) => ({ ...acc, [s.id]: s.content }), {}),
      }, settings.offlineMode);

      const aiReply = result.data?.reply || result.data?.response || 'I can help refine the clinical report. Please be specific about which section needs changes.';
      setAiChatHistory(prev => [...prev, { role: 'ai', text: aiReply }]);
    } catch {
      setAiChatHistory(prev => [...prev, { role: 'ai', text: 'AI consultation unavailable. You can still edit sections manually.' }]);
    } finally {
      setIsConsulting(false);
    }
  }, [aiPrompt, patient, sections, settings.offlineMode]);

  // ─── Edit section content ───
  const handleSectionChange = (id: string, content: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, content } : s));
    if (status === 'saved' || status === 'uploaded') setStatus('generated');
  };

  // ─── Save report → Zustand store ───
  const handleSaveReport = () => {
    const fullSOAP = sections
      .filter(s => s.content.trim())
      .map(s => `## ${s.title.toUpperCase()}\n${s.content}`)
      .join('\n\n');

    updatePatientNotes(patient.id, {
      soap: fullSOAP,
      hpi: sections.find(s => s.id === 'subjective')?.content || '',
      assessment: sections.find(s => s.id === 'assessment')?.content || '',
      plan: sections.find(s => s.id === 'plan')?.content || '',
    });
    setStatus('saved');
  };

  // ─── Upload/Publish for patient ───
  const handleUploadForPatient = () => {
    handleSaveReport();
    setStatus('uploaded');
  };

  // ─── Download as text ───
  const handleDownload = () => {
    const now = new Date().toISOString().slice(0, 10);
    const header = `CLINICAL REPORT\n${'═'.repeat(40)}\nPatient: ${patient.name}\nAge: ${patient.age} | Gender: ${patient.gender}\nCondition: ${patient.condition}\nDate: ${now}\nDoctor: ${user?.name || 'Dr.'}\n${'═'.repeat(40)}\n\n`;
    const body = sections
      .filter(s => s.content.trim())
      .map(s => `${s.title.toUpperCase()}\n${'-'.repeat(30)}\n${s.content}`)
      .join('\n\n');

    const blob = new Blob([header + body], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Clinical_Report_${patient.name.replace(/\s+/g, '_')}_${now}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          style={{
            width: '100%', maxWidth: 1100, maxHeight: '90vh',
            background: 'white', borderRadius: 20,
            boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column' as const,
            overflow: 'hidden',
          }}
        >
          {/* ════ HEADER ════ */}
          <div style={{
            padding: '20px 28px', borderBottom: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(135deg, #fafbff 0%, #f0f0ff 100%)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileText size={20} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  Doctor's Clinical Report
                </h2>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {patient.name} · {patient.age}y {patient.gender} · {patient.condition}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {status === 'generated' && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#dbeafe', color: '#2563eb' }}>
                  ✦ AI Generated
                </span>
              )}
              {status === 'saved' && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#dcfce7', color: '#16a34a' }}>
                  ✓ Saved
                </span>
              )}
              {status === 'uploaded' && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                  ✓ Published to Patient
                </span>
              )}
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0',
                background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} color="#64748b" />
              </button>
            </div>
          </div>

          {/* ════ BODY ════ */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* ─── LEFT: Report Editor (65%) ─── */}
            <div style={{ flex: '0 0 65%', overflow: 'auto', padding: '24px 28px', borderRight: '1px solid #f1f5f9' }}>

              {/* Generate Button */}
              {!hasContent && !isGenerating && (
                <div style={{
                  display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                  padding: '60px 20px', textAlign: 'center' as const,
                }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%', marginBottom: 20,
                    background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <BrainCircuit size={32} color="#6366f1" style={{ opacity: 0.7 }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                    Generate Clinical Report with AI
                  </h3>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, maxWidth: 400, lineHeight: 1.6 }}>
                    AI will analyze the patient's vitals, risk profile, and medical history to generate a comprehensive clinical report. You can then edit and refine each section.
                  </p>
                  <button onClick={handleGenerateReport} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10,
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white',
                    border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                  }}>
                    <Sparkles size={16} /> Generate Report via AI
                  </button>
                </div>
              )}

              {/* Loading */}
              {isGenerating && (
                <div style={{
                  display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                  padding: '80px 20px', gap: 16,
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Loader2 size={24} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#4f46e5' }}>Consulting AI and generating report...</p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>Analyzing vitals, risk profile, and patient history</p>
                </div>
              )}

              {/* Report Sections */}
              {hasContent && !isGenerating && (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                  {/* Toolbar */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0',
                  }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={handleGenerateReport} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6,
                        background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 12, color: '#64748b',
                      }}>
                        <Sparkles size={13} /> Regenerate
                      </button>
                      <button onClick={() => setShowPreview(!showPreview)} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6,
                        background: showPreview ? '#4f46e5' : 'white', border: '1px solid #e2e8f0',
                        cursor: 'pointer', fontSize: 12, color: showPreview ? 'white' : '#64748b',
                      }}>
                        <Eye size={13} /> {showPreview ? 'Editing' : 'Preview'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={handleDownload} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6,
                        background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 12, color: '#64748b',
                      }}>
                        <Download size={13} /> Download
                      </button>
                      <button onClick={handleSaveReport} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 6,
                        background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      }}>
                        <Save size={13} /> Save
                      </button>
                      <button onClick={handleUploadForPatient} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 6,
                        background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white',
                        border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      }}>
                        <Upload size={13} /> Publish to Patient
                      </button>
                    </div>
                  </div>

                  {/* Doctor + Date */}
                  <div style={{
                    padding: '12px 16px', background: '#fafbff', borderRadius: 10, border: '1px solid #e8e8ff',
                    display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569',
                  }}>
                    <span><strong>Doctor:</strong> {user?.name || 'Dr.'}</span>
                    <span><strong>Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>

                  {/* Section Cards */}
                  {sections.filter(s => s.content.trim() || s.id === 'doctorNotes').map((section) => (
                    <div key={section.id} style={{
                      background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
                      overflow: 'hidden', transition: 'box-shadow 0.2s ease',
                      boxShadow: editingId === section.id ? '0 0 0 2px #818cf8' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}>
                      {/* Section Header */}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: '#6366f1' }}>{section.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{section.title}</span>
                        </div>
                        {!showPreview && (
                          <button
                            onClick={() => setEditingId(editingId === section.id ? null : section.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6,
                              background: editingId === section.id ? '#4f46e5' : 'transparent',
                              color: editingId === section.id ? 'white' : '#64748b',
                              border: editingId === section.id ? 'none' : '1px solid #e2e8f0',
                              cursor: 'pointer', fontSize: 11, fontWeight: 600,
                            }}
                          >
                            <Edit3 size={11} /> {editingId === section.id ? 'Done' : 'Edit'}
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ padding: 16 }}>
                        {editingId === section.id && !showPreview ? (
                          <textarea
                            value={section.content}
                            onChange={(e) => handleSectionChange(section.id, e.target.value)}
                            style={{
                              width: '100%', minHeight: 120, padding: 12, borderRadius: 8,
                              border: '1px solid #c7d2fe', background: '#fafbff', fontSize: 13,
                              lineHeight: 1.7, fontFamily: '"Inter", system-ui, sans-serif',
                              color: '#334155', resize: 'vertical' as const, outline: 'none',
                            }}
                            placeholder={`Add ${section.title.toLowerCase()} here...`}
                          />
                        ) : (
                          <div style={{
                            fontSize: 13, lineHeight: 1.8, color: '#475569',
                            whiteSpace: 'pre-wrap' as const,
                          }}>
                            {section.content || (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                Click "Edit" to add {section.title.toLowerCase()}...
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── RIGHT: AI Consultation (35%) ─── */}
            <div style={{
              flex: '0 0 35%', display: 'flex', flexDirection: 'column' as const,
              background: '#fafbff',
            }}>
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Sparkles size={16} color="#6366f1" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>AI Consultation</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#e0e7ff', color: '#4f46e5' }}>
                  TxGemma
                </span>
              </div>

              {/* Chat Messages */}
              <div style={{
                flex: 1, overflow: 'auto', padding: '16px 20px',
                display: 'flex', flexDirection: 'column' as const, gap: 12,
              }}>
                {/* Welcome message */}
                {aiChatHistory.length === 0 && (
                  <div style={{ textAlign: 'center' as const, padding: '30px 16px' }}>
                    <BrainCircuit size={36} color="#c7d2fe" style={{ marginBottom: 12 }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                      AI Clinical Assistant
                    </p>
                    <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
                      Ask me to refine any section, suggest differential diagnoses, recommend lab orders, or adjust the treatment plan.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                      {[
                        'Suggest differential diagnoses for this patient',
                        'What labs should I order next?',
                        'Refine the assessment section',
                        'Add medication interactions check',
                      ].map((suggestion, i) => (
                        <button key={i} onClick={() => { setAiPrompt(suggestion); }}
                          style={{
                            padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                            background: 'white', cursor: 'pointer', fontSize: 12, color: '#475569',
                            textAlign: 'left' as const, transition: 'all 0.15s ease',
                          }}
                        >
                          💡 {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {aiChatHistory.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: '85%', padding: '10px 14px', borderRadius: 12,
                      fontSize: 13, lineHeight: 1.6,
                      background: msg.role === 'user' ? '#4f46e5' : 'white',
                      color: msg.role === 'user' ? 'white' : '#334155',
                      border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                      whiteSpace: 'pre-wrap' as const,
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isConsulting && (
                  <div style={{ display: 'flex', gap: 4, padding: '10px 14px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', animation: 'pulse 1s ease-in-out infinite' }} />
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', animation: 'pulse 1s ease-in-out infinite 0.2s' }} />
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', animation: 'pulse 1s ease-in-out infinite 0.4s' }} />
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', background: 'white' }}>
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'flex-end',
                }}>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiConsult(); } }}
                    placeholder="Ask AI to refine the report..."
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 10,
                      border: '1px solid #e2e8f0', fontSize: 13, resize: 'none' as const,
                      minHeight: 42, maxHeight: 90, outline: 'none', lineHeight: 1.5,
                      fontFamily: '"Inter", system-ui, sans-serif',
                    }}
                    rows={1}
                  />
                  <button
                    onClick={handleAiConsult}
                    disabled={!aiPrompt.trim() || isConsulting}
                    style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: aiPrompt.trim() ? '#4f46e5' : '#e2e8f0',
                      border: 'none', cursor: aiPrompt.trim() ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Send size={16} color={aiPrompt.trim() ? 'white' : '#9ca3af'} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
