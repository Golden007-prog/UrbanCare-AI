import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, AlertCircle, CheckCircle, Loader2, AlertTriangle, Shield, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { aiPost } from '../lib/aiClient';

interface AnalysisResult {
  differential: string[];
  reasoning: string;
  redFlags: string[];
  confidence: 'low' | 'moderate' | 'high';
  model: string;
  imageType: string;
  mock: boolean;
}

export const ImageDiagnosticsWidget = () => {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageType, setImageType] = useState('chest-xray');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { selectedPatientId, patients, settings } = useStore();
  const patient = patients.find((p) => p.id === selectedPatientId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Build patient context from currently selected patient
      const patientContext = patient
        ? {
            symptoms: patient.condition || '',
            condition: patient.condition || '',
            age: patient.age,
            gender: patient.gender,
            vitals: {
              heartRate: patient.vitals?.heartRate?.value,
              spO2: patient.vitals?.spO2?.value,
              temperature: patient.vitals?.temperature?.value,
              respiration: patient.vitals?.respiration?.value,
            },
          }
        : {};

      const result = await aiPost('/api/analyze-image', {
        imageBase64: image,
        imageType,
        patientContext,
      }, settings.offlineMode);

      setAnalysis(result.data);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to connect to AI backend. Is the server running?');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const confidenceColor = {
    low: 'text-red-600 bg-red-50 border-red-200',
    moderate: 'text-amber-600 bg-amber-50 border-amber-200',
    high: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[var(--shadow-premium)] transition-all">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-indigo-500" />
        Image Diagnostics
      </h3>

      {!image ? (
        <div>
          {/* Image type selector */}
          <div className="flex gap-1.5 mb-3">
            {[
              { key: 'chest-xray', label: 'X-Ray' },
              { key: 'ct-scan', label: 'CT' },
              { key: 'skin-lesion', label: 'Skin' },
              { key: 'ecg', label: 'ECG' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setImageType(t.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  imageType === t.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-inner transition-all cursor-pointer h-44 group"
          >
            <Upload className="w-8 h-8 mb-3 text-slate-300 group-hover:text-indigo-400 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-slate-600">Upload {imageType.replace('-', ' ')}</p>
            <p className="text-xs text-slate-400 mt-1">Click to browse files</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative rounded-xl overflow-hidden border border-slate-200 h-44 bg-black">
            <img src={image} alt="Uploaded scan" className="w-full h-full object-contain" />
            <button
              onClick={() => { setImage(null); setAnalysis(null); setError(null); }}
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
            {/* Image type badge */}
            <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded-md uppercase tracking-wide">
              {imageType}
            </span>
          </div>

          {/* Analyze button */}
          {!analysis && !error && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing with MedGemma...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Run AI Analysis
                </>
              )}
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <p className="font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Analysis Error
              </p>
              <p className="text-xs mt-1">{error}</p>
              <button
                onClick={handleAnalyze}
                className="mt-2 text-xs text-red-600 underline hover:text-red-800"
              >
                Retry
              </button>
            </div>
          )}

          {/* Structured results */}
          {analysis && (
            <div className="space-y-3">
              {/* Confidence badge */}
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${confidenceColor[analysis.confidence]}`}>
                  <Shield className="w-3 h-3 inline mr-1" />
                  {analysis.confidence.toUpperCase()} confidence
                </span>
                {analysis.mock && (
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    Mock — MedGemma pending
                  </span>
                )}
              </div>

              {/* Differential Diagnosis */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Differential Diagnosis
                </h4>
                <ul className="space-y-1">
                  {analysis.differential.map((dx, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-slate-700 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      {dx}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Reasoning */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  AI Reasoning
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                  {analysis.reasoning}
                </p>
              </div>

              {/* Red Flags */}
              {analysis.redFlags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1.5">
                    ⚠ Red Flags
                  </h4>
                  <ul className="space-y-1">
                    {analysis.redFlags.map((flag, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-red-700 px-2.5 py-1.5 bg-red-50 rounded-lg border border-red-100"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Re-upload */}
              <button
                onClick={() => { setImage(null); setAnalysis(null); setError(null); }}
                className="w-full py-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
              >
                Upload another image
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
