import React, { useState, useRef, useCallback } from 'react';
import {
  X, Upload, FileText, AlertCircle, CheckCircle, Loader2,
  Table, Shield, ArrowRight, ChevronDown, RefreshCw,
} from 'lucide-react';
import { useStore, Patient } from '../store/useStore';
import Papa from 'papaparse';
import clsx from 'clsx';
import {
  detectCsvType, validateSchema, detectPreset, mapColumns,
  parsePatientsCSV, parseVitalsCSV, parseAlertsCSV, buildVitalsObject,
  detectPHI, COLUMN_PRESETS,
  type CsvFileType, type PHIWarning, type ValidationResult,
} from '../services/csvImporter';

// ── Types ─────────────────────────────────────────────────

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportTab = 'patients' | 'vitals' | 'alerts';

interface ParsedFile {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  detectedType: CsvFileType;
  validation: ValidationResult;
  phiWarnings: PHIWarning[];
  suggestedPreset: string | null;
}

// ── Component ─────────────────────────────────────────────

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const { addPatients, addAlerts, updatePatientVitals, patients, setImportToast, addAuditEntry } = useStore();

  const [activeTab, setActiveTab] = useState<ImportTab>('patients');
  const [files, setFiles] = useState<Record<ImportTab, ParsedFile | null>>({
    patients: null, vitals: null, alerts: null,
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('none');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFile = files[activeTab];

  // ── Reset on close ──
  const handleClose = useCallback(() => {
    setFiles({ patients: null, vitals: null, alerts: null });
    setActiveTab('patients');
    setError(null);
    setSuccess(null);
    setSelectedPreset('none');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  // ── File selection & parsing ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setError('Please upload a valid CSV file.');
      return;
    }

    setIsParsing(true);
    setError(null);
    setSuccess(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const headers = results.meta.fields || [];
          const rows = results.data as Record<string, string>[];
          const detectedType = detectCsvType(headers);
          const validation = detectedType !== 'unknown'
            ? validateSchema(headers, detectedType)
            : { valid: false, missing: [], extra: [] };
          const phiWarnings = detectPHI(rows);
          const suggestedPreset = detectPreset(headers);

          const parsed: ParsedFile = {
            fileName: selectedFile.name,
            headers,
            rows,
            detectedType,
            validation,
            phiWarnings,
            suggestedPreset,
          };

          // Auto-place on the correct tab
          if (detectedType === 'patients' || detectedType === 'vitals' || detectedType === 'alerts') {
            setFiles((prev) => ({ ...prev, [detectedType]: parsed }));
            setActiveTab(detectedType);
          } else {
            // Unknown — put it on current tab
            setFiles((prev) => ({ ...prev, [activeTab]: parsed }));
          }

          if (suggestedPreset) {
            setSelectedPreset(suggestedPreset);
          }
        } catch {
          setError('Error analysing the CSV file.');
        } finally {
          setIsParsing(false);
        }
      },
      error: () => {
        setError('Failed to parse CSV file.');
        setIsParsing(false);
      },
    });

    // Reset input so re-uploading same file works
    e.target.value = '';
  };

  // ── Apply mapping preset ──
  const applyMapping = () => {
    if (!currentFile || selectedPreset === 'none') return;
    const mapping = COLUMN_PRESETS[selectedPreset];
    if (!mapping) return;

    const mappedRows = mapColumns(currentFile.rows, mapping);
    const mappedHeaders = Object.keys(mappedRows[0] || {});
    const detectedType = detectCsvType(mappedHeaders);
    const validation = detectedType !== 'unknown'
      ? validateSchema(mappedHeaders, detectedType)
      : { valid: false, missing: [], extra: [] };

    const updated: ParsedFile = {
      ...currentFile,
      headers: mappedHeaders,
      rows: mappedRows,
      detectedType,
      validation,
      suggestedPreset: selectedPreset,
    };

    setFiles((prev) => ({ ...prev, [activeTab]: updated }));
    if (detectedType !== 'unknown' && detectedType !== activeTab) {
      setFiles((prev) => ({ ...prev, [detectedType]: updated, [activeTab]: null }));
      setActiveTab(detectedType);
    }
  };

  // ── Import ──
  const handleImport = () => {
    setIsParsing(true);
    setError(null);

    try {
      const imported: string[] = [];

      // Import patients
      const pf = files.patients;
      if (pf && pf.validation.valid) {
        const newPatients = parsePatientsCSV(pf.rows);
        if (newPatients.length > 0) {
          addPatients(newPatients);
          imported.push(`${newPatients.length} patients`);

          // If no vitals file, synthetic vitals are already generated inside parsePatientsCSV
        }
      }

      // Import vitals
      const vf = files.vitals;
      if (vf && vf.validation.valid) {
        const grouped = parseVitalsCSV(vf.rows);
        let vitalsCount = 0;
        for (const [pid, rows] of Object.entries(grouped)) {
          const vitals = buildVitalsObject(rows);
          updatePatientVitals(pid, vitals);
          vitalsCount += rows.length;
        }
        if (vitalsCount > 0) {
          imported.push(`${vitalsCount} vital readings`);
        }
      }

      // Import alerts
      const af = files.alerts;
      if (af && af.validation.valid) {
        const alerts = parseAlertsCSV(af.rows);
        if (alerts.length > 0) {
          addAlerts(alerts);
          imported.push(`${alerts.length} alerts`);
        }
      }

      if (imported.length === 0) {
        setError('No valid data found to import. Please check the file headers.');
      } else {
        const msg = `Successfully imported ${imported.join(', ')}`;
        setSuccess(msg);
        setImportToast(msg);
        addAuditEntry('CSV Import', msg);
        setTimeout(() => {
          handleClose();
          setImportToast(null);
        }, 2000);
      }
    } catch {
      setError('Error importing CSV data. Please check the format.');
    } finally {
      setIsParsing(false);
    }
  };

  // ── Can we import? ──
  const canImport = Object.values(files).some((f) => f && f.validation.valid);

  // ── Tab badges ──
  const tabBadge = (tab: ImportTab) => {
    const f = files[tab];
    if (!f) return null;
    if (f.validation.valid) return <CheckCircle className="w-3 h-3 text-emerald-500" />;
    return <AlertCircle className="w-3 h-3 text-amber-500" />;
  };

  // ── Render ──
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 className="font-semibold text-lg text-slate-900">Import Healthcare CSV</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 shrink-0">
          {(['patients', 'vitals', 'alerts'] as ImportTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex-1 px-4 py-2.5 text-sm font-medium capitalize flex items-center justify-center gap-1.5 transition-colors',
                activeTab === tab
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {tab} {tab === 'alerts' && <span className="text-[10px] text-slate-400">(optional)</span>}
              {tabBadge(tab)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* Upload zone */}
          {!currentFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer"
            >
              <Upload className="w-8 h-8 mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                Click to upload <span className="capitalize">{activeTab}</span> CSV
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'patients' && 'Expected: PatientID, Name, Age, Gender, PrimaryCondition, RiskLevel'}
                {activeTab === 'vitals' && 'Expected: PatientID, Timestamp, HeartRate, SystolicBP, DiastolicBP, RespRate, SpO2, Temperature'}
                {activeTab === 'alerts' && 'Expected: PatientID, Timestamp, AlertType, Message'}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">Supports eICU, Zenodo, COVID dataset column names</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <>
              {/* File info */}
              <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 truncate max-w-[250px]">{currentFile.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {currentFile.rows.length} rows · Detected: <span className="font-medium capitalize text-indigo-600">{currentFile.detectedType}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFiles((prev) => ({ ...prev, [activeTab]: null }));
                    setError(null);
                  }}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Validation status */}
              {currentFile.validation.valid ? (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Schema validation passed — {currentFile.headers.length} columns matched
                </div>
              ) : currentFile.validation.missing.length > 0 ? (
                <div className="p-3 bg-amber-50 text-amber-800 text-sm rounded-lg space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4" />
                    Missing required columns
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentFile.validation.missing.map((col) => (
                      <span key={col} className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-xs font-mono">{col}</span>
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 mt-1">Try applying a column mapping preset below.</p>
                </div>
              ) : null}

              {/* PHI Warnings */}
              {currentFile.phiWarnings.length > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 text-orange-800 text-sm rounded-lg space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Shield className="w-4 h-4" />
                    Privacy Warning — Possible PHI Detected
                  </div>
                  <ul className="text-xs space-y-0.5 mt-1">
                    {currentFile.phiWarnings.slice(0, 4).map((w, i) => (
                      <li key={i}>
                        <span className="font-mono text-orange-900">{w.column}</span>: {w.reason}
                        <span className="text-orange-500 ml-1">(e.g. "{w.sampleValue}")</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-orange-500 mt-1">Consider anonymising data before importing into a shared system.</p>
                </div>
              )}

              {/* Column Mapping */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <button
                    onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex items-center justify-between hover:bg-slate-50"
                  >
                    <span>
                      {selectedPreset === 'none' ? 'Column mapping preset…' : `Preset: ${selectedPreset}`}
                      {currentFile.suggestedPreset && selectedPreset === 'none' && (
                        <span className="text-indigo-500 ml-1">(suggested: {currentFile.suggestedPreset})</span>
                      )}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                  {showPresetDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1">
                      <button
                        onClick={() => { setSelectedPreset('none'); setShowPresetDropdown(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-600"
                      >
                        No mapping (use original headers)
                      </button>
                      {Object.keys(COLUMN_PRESETS).map((name) => (
                        <button
                          key={name}
                          onClick={() => { setSelectedPreset(name); setShowPresetDropdown(false); }}
                          className={clsx(
                            'w-full text-left px-3 py-2 text-sm hover:bg-slate-50',
                            name === currentFile.suggestedPreset ? 'text-indigo-600 font-medium' : 'text-slate-600',
                          )}
                        >
                          {name}
                          {name === currentFile.suggestedPreset && <span className="text-xs text-indigo-400 ml-1">(detected)</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={applyMapping}
                  disabled={selectedPreset === 'none'}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Apply
                </button>
              </div>

              {/* Preview table */}
              {currentFile.rows.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Table className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500">
                      Preview (first {Math.min(5, currentFile.rows.length)} of {currentFile.rows.length} rows)
                    </span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50">
                          {currentFile.headers.slice(0, 8).map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap border-b border-slate-100">{h}</th>
                          ))}
                          {currentFile.headers.length > 8 && (
                            <th className="px-3 py-2 text-left font-medium text-slate-400 border-b border-slate-100">
                              +{currentFile.headers.length - 8} more
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {currentFile.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                            {currentFile.headers.slice(0, 8).map((h) => (
                              <td key={h} className="px-3 py-1.5 text-slate-700 whitespace-nowrap max-w-[120px] truncate">{row[h] ?? ''}</td>
                            ))}
                            {currentFile.headers.length > 8 && <td className="px-3 py-1.5 text-slate-400">…</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Global messages */}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!canImport || isParsing || !!success}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isParsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                Import Data
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
