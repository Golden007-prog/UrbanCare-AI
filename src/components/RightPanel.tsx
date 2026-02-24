import React from 'react';
import { Upload, Image as ImageIcon, Activity, TrendingUp, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { RiskPredictionPanel } from './RiskPredictionPanel';
import { ScanPreviewCard } from './ScanPreviewCard';
import { Patient } from '../store/useStore';

interface RightPanelProps {
  patient: Patient;
  onUploadClick: () => void;
  uploadedImage: string | null;
  scanType: string;
  onPreviewClick: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  patient,
  onUploadClick,
  uploadedImage,
  scanType,
  onPreviewClick,
}) => {
  return (
    <aside className="right-panel-container">
      {/* ── Upload Scan CTA ── */}
      {!uploadedImage ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={onUploadClick}
          className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer group hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-200 group-hover:shadow-indigo-300 transition-shadow">
              <ImageIcon size={16} className="text-white" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 leading-tight">Upload Scan</h4>
              <p className="text-[10px] text-slate-400">AI-powered analysis</p>
            </div>
          </div>
          <div className="border border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center group-hover:border-indigo-300 group-hover:bg-indigo-50/30 transition-all">
            <Upload size={20} className="text-slate-300 mb-2 group-hover:text-indigo-400 transition-colors" />
            <p className="text-xs text-slate-400 group-hover:text-indigo-500 transition-colors font-medium">
              X-Ray, CT, MRI, Ultrasound
            </p>
          </div>
        </motion.div>
      ) : (
        /* ── Uploaded Scan Preview ── */
        <ScanPreviewCard
          imageDataUrl={uploadedImage}
          scanType={scanType}
          onClick={onPreviewClick}
        />
      )}

      {/* ── Quick Stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-slate-200 p-4"
      >
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Patient Overview</h4>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Activity size={12} className="text-rose-400" />
              <span>Heart Rate</span>
            </div>
            <span className="text-xs font-bold text-slate-800">{patient.vitals.heartRate.value} {patient.vitals.heartRate.unit}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <TrendingUp size={12} className="text-sky-400" />
              <span>SpO₂</span>
            </div>
            <span className="text-xs font-bold text-slate-800">{patient.vitals.spO2.value}{patient.vitals.spO2.unit}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Shield size={12} className={
                patient.riskLevel === 'Critical' ? 'text-red-500' :
                patient.riskLevel === 'Warning' ? 'text-amber-500' :
                'text-emerald-500'
              } />
              <span>Risk Level</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
              patient.riskLevel === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100' :
              patient.riskLevel === 'Warning' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
              'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              {patient.riskLevel}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Risk Prediction ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <RiskPredictionPanel patient={patient} />
      </motion.div>
    </aside>
  );
};
