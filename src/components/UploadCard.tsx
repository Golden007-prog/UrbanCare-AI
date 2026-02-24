import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, Loader2, AlertCircle, X } from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';

interface UploadCardProps {
  type: 'doctor_report' | 'pharmacy_bill' | 'lab_report';
  label: string;
  description: string;
  patientProfileId?: string;
  onUploadComplete?: (doc: any) => void;
}

export default function UploadCard({ type, label, description, patientProfileId, onUploadComplete }: UploadCardProps) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setFileName(file.name);
    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      if (patientProfileId) formData.append('patient_profile_id', patientProfileId);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 200);

      const res = await fetch(`${API_URL}/api/patient/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Upload failed');

      setStatus('processing');

      // Poll for AI analysis completion
      const docId = data.data.id;
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await fetch(`${API_URL}/api/patient/upload/status/${docId}`, { credentials: 'include' });
          const statusData = await statusRes.json();

          if (statusData.success && statusData.data.status === 'complete') {
            clearInterval(pollInterval);
            setAiSummary(statusData.data.ai_summary);
            setStatus('complete');
            onUploadComplete?.(statusData.data);
          } else if (statusData.data?.status === 'error' || attempts > 30) {
            clearInterval(pollInterval);
            setStatus('complete'); // Show as complete even if AI failed
            onUploadComplete?.(statusData.data);
          }
        } catch {
          if (attempts > 30) {
            clearInterval(pollInterval);
            setStatus('complete');
          }
        }
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Upload failed');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function handleClick() {
    if (status === 'idle' || status === 'error') {
      fileInputRef.current?.click();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  function reset() {
    setStatus('idle');
    setProgress(0);
    setFileName('');
    setAiSummary(null);
    setErrorMsg('');
  }

  const borderColor = dragOver ? '#4f46e5' : status === 'complete' ? '#10b981' : status === 'error' ? '#ef4444' : '#d1d5db';
  const bgColor = dragOver ? '#eef2ff' : status === 'complete' ? '#f0fdf4' : status === 'error' ? '#fef2f2' : '#fafbfc';

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        border: `2px dashed ${borderColor}`, borderRadius: 14, padding: '18px 20px',
        background: bgColor, cursor: status === 'idle' || status === 'error' ? 'pointer' : 'default',
        transition: 'all 0.3s ease', position: 'relative',
      }}
    >
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} style={{ display: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: status === 'complete' ? '#dcfce7' : status === 'error' ? '#fee2e2' : status === 'uploading' || status === 'processing' ? '#e0e7ff' : '#f1f5f9',
          transition: 'all 0.3s ease',
        }}>
          {status === 'uploading' || status === 'processing' ? (
            <Loader2 size={20} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
          ) : status === 'complete' ? (
            <CheckCircle size={20} color="#16a34a" />
          ) : status === 'error' ? (
            <AlertCircle size={20} color="#ef4444" />
          ) : (
            <Upload size={20} color="#94a3b8" />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{label}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {status === 'idle' ? description :
             status === 'uploading' ? `Uploading ${fileName}...` :
             status === 'processing' ? 'TxGemma AI is analyzing...' :
             status === 'error' ? errorMsg :
             fileName}
          </div>
        </div>

        {status === 'idle' && (
          <span style={{ fontSize: 12, color: '#6366f1', padding: '5px 12px', border: '1px solid #c7d2fe', borderRadius: 8, background: 'white', fontWeight: 500 }}>
            Browse
          </span>
        )}

        {status === 'complete' && (
          <button onClick={(e) => { e.stopPropagation(); reset(); }} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          }}>
            <X size={16} color="#94a3b8" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {(status === 'uploading' || status === 'processing') && (
        <div style={{ marginTop: 12, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2, transition: 'width 0.3s ease',
            background: status === 'processing' ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #4f46e5, #6366f1)',
            width: status === 'processing' ? '100%' : `${progress}%`,
            animation: status === 'processing' ? 'pulse 2s ease-in-out infinite' : 'none',
          }} />
        </div>
      )}

      {/* AI Summary Preview */}
      {status === 'complete' && aiSummary && (
        <div style={{
          marginTop: 12, padding: '10px 14px', background: 'white', borderRadius: 10,
          border: '1px solid #d1fae5', fontSize: 12, color: '#374151',
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontWeight: 600, color: '#059669', marginBottom: 4, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
            🧠 AI Analysis
          </div>
          {aiSummary.summary && <div style={{ marginBottom: 4 }}>{aiSummary.summary}</div>}
          {aiSummary.diagnosis && <div><strong>Diagnosis:</strong> {aiSummary.diagnosis}</div>}
          {aiSummary.medications?.length > 0 && (
            <div><strong>Medications:</strong> {aiSummary.medications.join(', ')}</div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
