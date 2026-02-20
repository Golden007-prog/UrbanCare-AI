import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useStore, Patient } from '../store/useStore';
import Papa from 'papaparse';
import clsx from 'clsx';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const { addPatients } = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please upload a valid CSV file.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
    }
  };

  const generateRandomVitals = () => {
    const generateHistory = (base: number, variance: number) => {
      return Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        value: base + (Math.random() * variance * 2 - variance),
      }));
    };

    return {
      heartRate: {
        name: 'Heart Rate',
        value: Math.floor(60 + Math.random() * 40),
        unit: 'BPM',
        trend: Number((Math.random() * 5 - 2.5).toFixed(1)),
        status: 'stable' as const,
        history: generateHistory(80, 5),
      },
      bloodPressure: {
        sys: Math.floor(110 + Math.random() * 30),
        dia: Math.floor(70 + Math.random() * 20),
        status: 'stable' as const,
        trend: Number((Math.random() * 5 - 2.5).toFixed(1)),
      },
      spO2: {
        name: 'SpO2',
        value: Math.floor(95 + Math.random() * 5),
        unit: '%',
        trend: Number((Math.random() * 2 - 1).toFixed(1)),
        status: 'stable' as const,
        history: generateHistory(97, 2),
      },
      temperature: {
        name: 'Temperature',
        value: Number((97 + Math.random() * 2).toFixed(1)),
        unit: '°F',
        trend: Number((Math.random() * 1 - 0.5).toFixed(1)),
        status: 'stable' as const,
        history: generateHistory(98.6, 0.5),
      },
      respiration: {
        name: 'Respiration',
        value: Math.floor(12 + Math.random() * 8),
        unit: '/min',
        trend: Number((Math.random() * 2 - 1).toFixed(1)),
        status: 'stable' as const,
        history: generateHistory(16, 4),
      },
    };
  };

  const handleImport = () => {
    if (!file) return;

    setIsParsing(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const newPatients: Patient[] = results.data
            .filter((row: any) => row.Name || row.name) // Basic validation
            .map((row: any) => ({
              id: `P${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
              name: row.Name || row.name || 'Unknown',
              age: parseInt(row.Age || row.age) || 0,
              gender: (row.Gender || row.gender || 'Other') as any,
              condition: row.Condition || row.condition || 'General Checkup',
              riskLevel: (row.RiskLevel || row.riskLevel || 'Stable') as any,
              lastUpdated: 'Just now',
              vitals: generateRandomVitals(),
              notes: {
                soap: '',
                hpi: '',
                assessment: '',
                plan: '',
              },
            }));

          if (newPatients.length === 0) {
            setError('No valid patient data found in CSV.');
          } else {
            addPatients(newPatients);
            setSuccess(`Successfully imported ${newPatients.length} patients.`);
            setTimeout(() => {
              onClose();
              setFile(null);
              setSuccess(null);
            }, 1500);
          }
        } catch (err) {
          console.error(err);
          setError('Error parsing CSV data. Please check the format.');
        } finally {
          setIsParsing(false);
        }
      },
      error: (err) => {
        console.error(err);
        setError('Failed to parse CSV file.');
        setIsParsing(false);
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-semibold text-lg text-slate-900">Import Patients via CSV</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer h-48"
            >
              <Upload className="w-8 h-8 mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Click to upload CSV</p>
              <p className="text-xs text-slate-400 mt-1">Headers: Name, Age, Gender, Condition, RiskLevel</p>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button 
                onClick={() => setFile(null)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || isParsing || !!success}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Patients'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
