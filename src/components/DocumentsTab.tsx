import React, { useState, useRef, useCallback } from 'react';
import {
  FileText, Upload, Image, FlaskConical, Receipt, FolderOpen, Scan, Brain,
  ChevronDown, ChevronRight, CheckCircle, AlertCircle, Loader2, X, Eye, File,
} from 'lucide-react';
import { useStore, PatientDocument } from '../store/useStore';
import clsx from 'clsx';

// ── Type Config ────────────────────────────────────────────

const DOC_TYPE_CONFIG: Record<PatientDocument['type'], { label: string; icon: React.ReactNode; color: string; section: string }> = {
  xray: { label: 'X-Ray', icon: <Image className="w-4 h-4" />, color: 'bg-blue-50 text-blue-700 border-blue-200', section: 'imaging' },
  mri: { label: 'MRI', icon: <Scan className="w-4 h-4" />, color: 'bg-rose-50 text-rose-700 border-rose-200', section: 'imaging' },
  ct: { label: 'CT Scan', icon: <Brain className="w-4 h-4" />, color: 'bg-indigo-50 text-indigo-700 border-indigo-200', section: 'imaging' },
  lab_report: { label: 'Lab Report', icon: <FlaskConical className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', section: 'lab' },
  pharmacy_bill: { label: 'Pharmacy Bill', icon: <Receipt className="w-4 h-4" />, color: 'bg-amber-50 text-amber-700 border-amber-200', section: 'pharmacy' },
  previous_doctor_report: { label: 'Previous Report', icon: <FolderOpen className="w-4 h-4" />, color: 'bg-purple-50 text-purple-700 border-purple-200', section: 'other' },
};

const SECTION_LABELS: Record<string, string> = {
  lab: 'Lab Reports',
  pharmacy: 'Pharmacy Bills',
  imaging: 'Imaging',
  other: 'Other Reports',
};

const SECTION_ORDER = ['lab', 'pharmacy', 'imaging', 'other'];

const ACCEPTED_EXTENSIONS = '.pdf,.xml,.jpg,.jpeg,.png';
const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-5 h-5 text-red-500" />,
  xml: <File className="w-5 h-5 text-teal-500" />,
  jpg: <Image className="w-5 h-5 text-blue-500" />,
  jpeg: <Image className="w-5 h-5 text-blue-500" />,
  png: <Image className="w-5 h-5 text-blue-500" />,
};

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';

// ── Helpers ────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() || '';
}

// ── Component ──────────────────────────────────────────────

interface Props {
  patientId: string;
}

export const DocumentsTab: React.FC<Props> = ({ patientId }) => {
  const { documents, addDocument, updateDocument } = useStore();
  const [selectedType, setSelectedType] = useState<PatientDocument['type']>('lab_report');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // ── File upload state ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewingDataId, setViewingDataId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patientDocs = documents.filter((d) => d.patientID === patientId);

  // Group documents by section
  const grouped: Record<string, PatientDocument[]> = { lab: [], pharmacy: [], imaging: [], other: [] };
  patientDocs.forEach((doc) => {
    const section = DOC_TYPE_CONFIG[doc.type]?.section || 'other';
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(doc);
  });

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Drag & Drop handlers ──

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = getFileExt(file.name);
      if (['pdf', 'xml', 'jpg', 'jpeg', 'png'].includes(ext)) {
        setSelectedFile(file);
        setUploadStatus('idle');
        setUploadError('');
      } else {
        setUploadError(`File type .${ext} not supported. Use PDF, XML, JPG, or PNG.`);
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('idle');
      setUploadError('');
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Upload handler ──

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('patientID', patientId);
    formData.append('documentType', selectedType);
    formData.append('title', title.trim() || selectedFile.name);
    formData.append('notes', notes.trim());

    try {
      // Simulated progress (XHR for real progress would require XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 15, 90));
      }, 200);

      const response = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const doc = result.data;

      // Add to store
      addDocument({
        id: doc.id,
        patientID: doc.patientID,
        hospitalID: doc.hospitalID,
        type: doc.type,
        fileURL: doc.fileURL || '',
        filePath: doc.filePath,
        originalName: doc.originalName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        uploadedByUserID: doc.uploadedByUserID,
        uploaderRole: doc.uploaderRole,
        title: doc.title,
        notes: doc.notes,
        status: doc.status || 'processing',
        extractedData: doc.extractedData,
        createdAt: doc.createdAt,
      });

      setUploadStatus('processing');

      // Poll for completion
      pollDocumentStatus(doc.id);

      // Reset form after a brief delay
      setTimeout(() => {
        setTitle('');
        setNotes('');
        clearFile();
        setShowUpload(false);
        setUploadStatus('idle');
      }, 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setUploadStatus('error');
      setUploadError(errorMessage);
    }
  };

  // ── Poll for AI processing status ──

  const pollDocumentStatus = async (docId: string) => {
    let attempts = 0;
    const maxAttempts = 30;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${API_BASE}/api/documents/status/${docId}`, { credentials: 'include' });
        if (res.ok) {
          const { data } = await res.json();
          if (data.status === 'complete' || data.status === 'error') {
            updateDocument(docId, {
              status: data.status,
              extractedData: data.extractedData,
            });
            clearInterval(interval);
          }
        }
      } catch {
        // Silently retry
      }
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 2000);
  };

  // ── Status Badge ──

  const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
    switch (status) {
      case 'uploading':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
            <Loader2 className="w-3 h-3 animate-spin" /> Uploading
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> AI Processing
          </span>
        );
      case 'complete':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Complete
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
            <AlertCircle className="w-3 h-3" /> Error
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[var(--shadow-premium)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          Documents
        </h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload
        </button>
      </div>

      {/* ── Upload Form ── */}
      {showUpload && (
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          {/* Title */}
          <input
            type="text"
            placeholder="Document title (optional)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />

          {/* Document Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as PatientDocument['type'])}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
          >
            {Object.entries(DOC_TYPE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          {/* ── Drag & Drop Zone ── */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'relative flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200',
              isDragOver
                ? 'border-indigo-400 bg-indigo-50/80 scale-[1.01]'
                : selectedFile
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <>
                <div className="flex items-center gap-3">
                  {FILE_TYPE_ICONS[getFileExt(selectedFile.name)] || <File className="w-5 h-5 text-slate-400" />}
                  <div>
                    <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{formatBytes(selectedFile.size)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="p-1 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={clsx(
                  'p-3 rounded-full transition-colors',
                  isDragOver ? 'bg-indigo-100' : 'bg-slate-100'
                )}>
                  <Upload className={clsx('w-6 h-6', isDragOver ? 'text-indigo-500' : 'text-slate-400')} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">
                    {isDragOver ? 'Drop file here' : 'Drag & drop or click to browse'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">PDF, XML, JPG, PNG — up to 20 MB</p>
                </div>
              </>
            )}
          </div>

          {/* Upload Progress */}
          {uploadStatus === 'uploading' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {uploadStatus === 'processing' && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
              <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
              <span className="text-xs font-medium text-amber-700">AI agents are analyzing your document...</span>
            </div>
          )}

          {/* Success */}
          {uploadStatus === 'complete' && (
            <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">Upload complete! Document added.</span>
            </div>
          )}

          {/* Error */}
          {uploadError && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-red-700">{uploadError}</span>
            </div>
          )}

          {/* Notes */}
          <textarea
            placeholder="Notes (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploadStatus === 'uploading' || uploadStatus === 'processing'}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                !selectedFile || uploadStatus === 'uploading' || uploadStatus === 'processing'
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
              )}
            >
              {uploadStatus === 'uploading' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : uploadStatus === 'processing' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload Document</>
              )}
            </button>
            <button
              onClick={() => { setShowUpload(false); clearFile(); }}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Categorized Document Sections ── */}
      {patientDocs.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <FileText className="w-8 h-8 mb-2 text-slate-300" />
          <p className="text-sm">No documents uploaded</p>
        </div>
      ) : (
        <div className="space-y-4">
          {SECTION_ORDER.map((sectionKey) => {
            const sectionDocs = grouped[sectionKey] || [];
            if (sectionDocs.length === 0) return null;
            const isCollapsed = collapsedSections[sectionKey];

            return (
              <div key={sectionKey}>
                {/* Section header */}
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="flex items-center gap-2 w-full text-left mb-2 group"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {SECTION_LABELS[sectionKey]}
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    {sectionDocs.length}
                  </span>
                </button>

                {/* Section documents */}
                {!isCollapsed && (
                  <div className="space-y-2 pl-6">
                    {sectionDocs.map((doc) => {
                      const config = DOC_TYPE_CONFIG[doc.type];
                      const ext = doc.fileType || doc.originalName?.split('.').pop()?.toLowerCase() || '';
                      const fileIcon = FILE_TYPE_ICONS[ext];
                      const isViewingData = viewingDataId === doc.id;

                      return (
                        <div key={doc.id} className="space-y-0">
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-slate-200 transition-all">
                            {/* File type icon */}
                            <div className={clsx('p-2 rounded-lg border', config.color)}>
                              {fileIcon || config.icon}
                            </div>

                            {/* Document info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {doc.title || doc.originalName || doc.fileURL || 'Untitled'}
                              </p>
                              {doc.notes && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">{doc.notes}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border', config.color)}>
                                  {config.label}
                                </span>
                                {doc.fileSize && (
                                  <span className="text-[10px] text-slate-400">{formatBytes(doc.fileSize)}</span>
                                )}
                                <StatusBadge status={doc.status} />
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(doc.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {/* View data button */}
                            {doc.extractedData && doc.status === 'complete' && (
                              <button
                                onClick={() => setViewingDataId(isViewingData ? null : doc.id)}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                {isViewingData ? 'Hide' : 'View Data'}
                              </button>
                            )}
                          </div>

                          {/* Extracted data panel */}
                          {isViewingData && doc.extractedData && (
                            <div className="ml-12 mt-1 mb-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 animate-in slide-in-from-top-1">
                              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">
                                AI Extracted Data
                              </p>
                              {(doc.extractedData as Record<string, unknown>).category && (
                                <div className="mb-2">
                                  <span className="text-xs text-slate-600">Category: </span>
                                  <span className="text-xs font-semibold text-indigo-700">
                                    {String((doc.extractedData as Record<string, unknown>).category).replace(/_/g, ' ')}
                                  </span>
                                </div>
                              )}
                              {Array.isArray((doc.extractedData as Record<string, unknown>).labs) && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-slate-500 border-b border-indigo-200">
                                        <th className="text-left py-1 pr-3">Test</th>
                                        <th className="text-left py-1 pr-3">Value</th>
                                        <th className="text-left py-1 pr-3">Unit</th>
                                        <th className="text-left py-1 pr-3">Range</th>
                                        <th className="text-left py-1">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {((doc.extractedData as Record<string, unknown>).labs as Array<Record<string, string>>).map((lab, i) => (
                                        <tr key={i} className="border-b border-indigo-100/50">
                                          <td className="py-1 pr-3 font-medium text-slate-700">{lab.test}</td>
                                          <td className="py-1 pr-3 text-slate-800">{lab.value}</td>
                                          <td className="py-1 pr-3 text-slate-500">{lab.unit}</td>
                                          <td className="py-1 pr-3 text-slate-500">{lab.referenceRange}</td>
                                          <td className="py-1">
                                            <span className={clsx(
                                              'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                                              lab.status === 'normal' ? 'bg-emerald-100 text-emerald-700' :
                                              lab.status === 'high' ? 'bg-red-100 text-red-700' :
                                              lab.status === 'low' ? 'bg-amber-100 text-amber-700' :
                                              lab.status === 'critical' ? 'bg-red-200 text-red-800' :
                                              'bg-slate-100 text-slate-600'
                                            )}>
                                              {lab.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {!(doc.extractedData as Record<string, unknown>).labs && (
                                <div className="space-y-2">
                                  {(doc.extractedData as Record<string, unknown>).summary && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Summary</p>
                                      <p className="text-xs text-slate-700 leading-relaxed">{String((doc.extractedData as Record<string, unknown>).summary)}</p>
                                    </div>
                                  )}
                                  {Array.isArray((doc.extractedData as Record<string, unknown>).keyFindings) && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Key Findings</p>
                                      <ul className="space-y-0.5">
                                        {((doc.extractedData as Record<string, unknown>).keyFindings as string[]).map((f, i) => (
                                          <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                            <span className="text-emerald-500 mt-0.5">•</span>{f}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {Array.isArray((doc.extractedData as Record<string, unknown>).recommendations) && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Recommendations</p>
                                      <ul className="space-y-0.5">
                                        {((doc.extractedData as Record<string, unknown>).recommendations as string[]).map((r, i) => (
                                          <li key={i} className="text-xs text-slate-700 flex items-start gap-1.5">
                                            <span className="text-indigo-500 mt-0.5">→</span>{r}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {(doc.extractedData as Record<string, unknown>).classificationConfidence && (
                                    <div className="flex items-center gap-2 pt-1">
                                      <span className="text-[10px] text-slate-500">AI Confidence:</span>
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${Math.round(Number((doc.extractedData as Record<string, unknown>).classificationConfidence) * 100)}%` }}
                                          />
                                        </div>
                                        <span className="text-[10px] font-semibold text-indigo-600">
                                          {Math.round(Number((doc.extractedData as Record<string, unknown>).classificationConfidence) * 100)}%
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {!(doc.extractedData as Record<string, unknown>).summary &&
                                   !(doc.extractedData as Record<string, unknown>).keyFindings &&
                                   !(doc.extractedData as Record<string, unknown>).recommendations && (
                                    <p className="text-xs text-slate-500 italic">Document classified successfully. Lab data extraction was not available for this document type.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
