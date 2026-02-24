import React, { useState, useEffect } from 'react';
import {
  FileText, Download, AlertTriangle, Pill, Brain,
  Activity, Loader2, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';

interface DoctorPatientViewProps {
  patientProfileId: string;
  patientName?: string;
}

interface PatientDocument {
  id: string;
  type: string;
  file_url: string;
  original_name: string;
  status: string;
  ai_summary: any;
  created_at: string;
}

export default function DoctorPatientView({ patientProfileId, patientName }: DoctorPatientViewProps) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [patientProfileId]);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/patient/documents-for/${patientProfileId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setDocuments(data.data);
    } catch (err) {
      console.error('Failed to fetch patient documents:', err);
    } finally {
      setLoading(false);
    }
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case 'doctor_report': return { label: 'Doctor Report', color: '#4f46e5', bg: '#eef2ff' };
      case 'pharmacy_bill': return { label: 'Pharmacy Bill', color: '#0891b2', bg: '#ecfeff' };
      case 'lab_report': return { label: 'Lab Report', color: '#d97706', bg: '#fffbeb' };
      default: return { label: type, color: '#64748b', bg: '#f1f5f9' };
    }
  }

  // Aggregate AI summaries
  const allMedications: string[] = [];
  const allDiagnoses: string[] = [];
  const allRisks: string[] = [];
  let combinedSummary = '';

  documents.forEach((doc) => {
    if (doc.ai_summary) {
      const ai = typeof doc.ai_summary === 'string' ? JSON.parse(doc.ai_summary) : doc.ai_summary;
      if (ai.medications) allMedications.push(...ai.medications);
      if (ai.diagnosis) allDiagnoses.push(ai.diagnosis);
      if (ai.risks) allRisks.push(...ai.risks);
      if (ai.summary && !combinedSummary) combinedSummary = ai.summary;
    }
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: '#94a3b8' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
        Loading patient documents...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* AI Summary Card */}
      {(combinedSummary || allDiagnoses.length > 0 || allMedications.length > 0) && (
        <div style={{
          background: 'linear-gradient(135deg, #faf5ff, #eef2ff)', borderRadius: 16,
          padding: 24, border: '1px solid #e0e7ff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Brain size={20} color="#7c3aed" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              TxGemma AI Summary
            </h3>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
              background: '#7c3aed', color: 'white', marginLeft: 'auto',
            }}>
              AI-GENERATED
            </span>
          </div>

          {combinedSummary && (
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 16 }}>
              {combinedSummary}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {/* Diagnoses */}
            {allDiagnoses.length > 0 && (
              <div style={{
                background: 'white', borderRadius: 12, padding: '14px 16px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Activity size={14} color="#4f46e5" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#4f46e5', textTransform: 'uppercase' as const }}>Diagnosis</span>
                </div>
                {[...new Set(allDiagnoses)].map((d, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>• {d}</div>
                ))}
              </div>
            )}

            {/* Medications */}
            {allMedications.length > 0 && (
              <div style={{
                background: 'white', borderRadius: 12, padding: '14px 16px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Pill size={14} color="#0891b2" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0891b2', textTransform: 'uppercase' as const }}>Medications</span>
                </div>
                {[...new Set(allMedications)].map((m, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>• {m}</div>
                ))}
              </div>
            )}

            {/* Risks */}
            {allRisks.length > 0 && (
              <div style={{
                background: 'white', borderRadius: 12, padding: '14px 16px',
                border: '1px solid #fecaca',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <AlertTriangle size={14} color="#dc2626" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' as const }}>Risk Alerts</span>
                </div>
                {[...new Set(allRisks)].map((r, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>⚠️ {r}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents List */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="#4f46e5" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              Patient Documents ({documents.length})
            </h3>
          </div>
          <button onClick={fetchDocuments} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
            border: '1px solid #e2e8f0', borderRadius: 8, background: 'white',
            cursor: 'pointer', fontSize: 12, color: '#64748b',
          }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {documents.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 14,
            background: '#f8fafc', borderRadius: 12, border: '1px dashed #d1d5db',
          }}>
            <FileText size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div>No documents uploaded yet</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {documents.map((doc) => {
              const typeInfo = getTypeLabel(doc.type);
              const isExpanded = expandedDoc === doc.id;
              const ai = doc.ai_summary ? (typeof doc.ai_summary === 'string' ? JSON.parse(doc.ai_summary) : doc.ai_summary) : null;

              return (
                <div key={doc.id} style={{
                  border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}>
                  <div
                    onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                      cursor: 'pointer', background: isExpanded ? '#f8fafc' : 'white',
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', background: typeInfo.bg,
                    }}>
                      <FileText size={16} color={typeInfo.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {doc.original_name}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>
                        {new Date(doc.created_at).toLocaleDateString()} • {typeInfo.label}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      background: doc.status === 'complete' ? '#f0fdf4' : doc.status === 'processing' ? '#eef2ff' : '#fef2f2',
                      color: doc.status === 'complete' ? '#16a34a' : doc.status === 'processing' ? '#4f46e5' : '#dc2626',
                    }}>
                      {doc.status === 'complete' ? '✓ Analyzed' : doc.status === 'processing' ? '⏳ Processing' : '✗ Error'}
                    </span>
                    <a href={`${API_URL}${doc.file_url}`} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ padding: 4, color: '#64748b' }}>
                      <Download size={16} />
                    </a>
                    {isExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                  </div>

                  {/* Expanded AI details */}
                  {isExpanded && ai && (
                    <div style={{ padding: '0 16px 16px', background: '#f8fafc' }}>
                      <div style={{
                        padding: '12px 16px', background: 'white', borderRadius: 10,
                        border: '1px solid #e2e8f0', fontSize: 13,
                      }}>
                        {ai.summary && <div style={{ marginBottom: 8 }}><strong>Summary:</strong> {ai.summary}</div>}
                        {ai.diagnosis && <div style={{ marginBottom: 8 }}><strong>Diagnosis:</strong> {ai.diagnosis}</div>}
                        {ai.medications?.length > 0 && (
                          <div style={{ marginBottom: 8 }}><strong>Medications:</strong> {ai.medications.join(', ')}</div>
                        )}
                        {ai.risks?.length > 0 && (
                          <div style={{ marginBottom: 8 }}><strong>Risks:</strong> {ai.risks.join(', ')}</div>
                        )}
                        {ai.recommendations && <div><strong>Recommendations:</strong> {ai.recommendations}</div>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
