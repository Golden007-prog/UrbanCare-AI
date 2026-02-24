import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { VitalCard } from '../components/VitalCard';
import { AIConsultPanel } from '../components/AIConsultPanel';
import { DetailedVitalModal } from '../components/DetailedVitalModal';
import { RiskPredictionPanel } from '../components/RiskPredictionPanel';
import { MultilingualExplanation } from '../components/MultilingualExplanation';
import { ReferralModal } from '../components/ReferralModal';
import { IntakeFormModal } from '../components/IntakeFormModal';
import { DocumentsTab } from '../components/DocumentsTab';
import { AdmissionBadge } from '../components/AdmissionBadge';
import { FamilyLinkModal } from '../components/FamilyLinkModal';
import { AgentDashboard } from '../components/AgentDashboard';
import { DoctorClinicalReport } from '../components/DoctorClinicalReport';
import { ClinicalReportCard } from '../components/ClinicalReportCard';
import { RightPanel } from '../components/RightPanel';
import { FloatingUploadModal } from '../components/FloatingUploadModal';
import { VoiceAssistantPanel } from '../components/VoiceAssistantPanel';
import { useStore, VitalSign } from '../store/useStore';
import {
  Activity, AlertTriangle, CheckCircle, Clock, User,
  FileText, UserPlus, Upload, Bed, LogOut, Link2, Radio, Server, Image as ImageIcon
} from 'lucide-react';
import clsx from 'clsx';
import '../styles/dashboardLayout.css';

export default function Dashboard() {
  const { selectedPatientId, patients, alerts, importToast, admitPatient, dischargePatient } = useStore();
  const patient = patients.find((p) => p.id === selectedPatientId);
  const patientAlerts = alerts.filter((a) => a.patientId === patient?.id);
  const [selectedVital, setSelectedVital] = useState<{ vital: VitalSign, theme: any } | null>(null);
  const [referralOpen, setReferralOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [familyLinkOpen, setFamilyLinkOpen] = useState(false);
  const [clinicalReportOpen, setClinicalReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'clinical' | 'agents'>('clinical');

  // Floating upload state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedScanType, setUploadedScanType] = useState('X-Ray');

  if (!patient) return <div className="flex items-center justify-center h-screen text-slate-500">Loading patient data...</div>;

  return (
    <div className="dashboard-layout font-sans text-slate-900">
      <Sidebar />

      <div className="dashboard-main-area">
        {/* ═══ Main Scrollable Column ═══ */}
        <div className="dashboard-main-column">
          <Header />

          {/* Import toast */}
          {importToast && (
            <div className="mb-3">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <Upload className="w-3.5 h-3.5" />
                {importToast}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5 pb-10"
            >
              {/* ── Patient Header (compact) ── */}
              <div className="flex justify-between items-end gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate">{patient.name}</h1>
                    <span className="px-2 py-0.5 bg-white text-slate-500 rounded-full text-[10px] font-mono font-medium border border-slate-200 shadow-sm shrink-0">
                      {patient.id}
                    </span>
                    <AdmissionBadge status={patient.admissionStatus} />
                    {patient.admissionStatus === 'admitted' && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse shrink-0">
                        <Radio className="w-2.5 h-2.5" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {patient.age}Y, {patient.gender}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      {patient.condition}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {patient.lastUpdated}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  {patient.admissionStatus !== 'admitted' ? (
                    <button onClick={() => admitPatient(patient.id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1.5">
                      <Bed className="w-3.5 h-3.5" /> Admit
                    </button>
                  ) : (
                    <button onClick={() => dischargePatient(patient.id)} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 shadow-sm transition-all flex items-center gap-1.5">
                      <LogOut className="w-3.5 h-3.5" /> Discharge
                    </button>
                  )}
                  <button onClick={() => setFamilyLinkOpen(true)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" /> Family Link
                  </button>
                  <button onClick={() => setIntakeOpen(true)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" /> Intake
                  </button>
                  <button onClick={() => setClinicalReportOpen(true)} className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg text-xs font-medium hover:from-indigo-700 hover:to-violet-700 shadow-sm shadow-indigo-200 transition-all flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Doctor Report
                  </button>
                  <button onClick={() => setReferralOpen(true)} className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-50 shadow-sm transition-all flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Referral
                  </button>
                </div>
              </div>

              {/* ── Vitals Grid ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <VitalCard vital={patient.vitals.heartRate} theme="rose" onClick={() => setSelectedVital({ vital: patient.vitals.heartRate, theme: 'rose' })} />
                <VitalCard vital={patient.vitals.spO2} theme="sky" onClick={() => setSelectedVital({ vital: patient.vitals.spO2, theme: 'sky' })} />
                <VitalCard vital={patient.vitals.temperature} theme="amber" onClick={() => setSelectedVital({ vital: patient.vitals.temperature, theme: 'amber' })} />
                <VitalCard vital={patient.vitals.respiration} theme="emerald" onClick={() => setSelectedVital({ vital: patient.vitals.respiration, theme: 'emerald' })} />
              </div>

              {/* ── Alerts Row (compact inline) ── */}
              {(patientAlerts.length > 0 || patient.riskLevel !== 'Stable') && (
                <div className="alerts-compact-row">
                  {patientAlerts.slice(0, 4).map((alert, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={clsx(
                        'alert-compact-item',
                        alert.alertType.toLowerCase().includes('critical') ? 'alert-compact-item--critical' :
                        alert.alertType.toLowerCase().includes('warning') ? 'alert-compact-item--warning' :
                        'alert-compact-item--info'
                      )}
                    >
                      <AlertTriangle className={clsx('w-3.5 h-3.5 mt-0.5 shrink-0',
                        alert.alertType.toLowerCase().includes('critical') ? 'text-red-600' :
                        alert.alertType.toLowerCase().includes('warning') ? 'text-amber-600' : 'text-blue-600'
                      )} />
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-800 text-[11px] truncate">{alert.alertType}</h4>
                        <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">{alert.message}</p>
                      </div>
                    </motion.div>
                  ))}
                  {patientAlerts.length === 0 && patient.riskLevel === 'Critical' && (
                    <div className="alert-compact-item alert-compact-item--critical">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-semibold text-red-900 text-[11px]">Critical Vitals</h4>
                        <p className="text-[10px] text-red-700 mt-0.5">Heart rate and blood pressure exceeding safety thresholds.</p>
                      </div>
                    </div>
                  )}
                  {patientAlerts.length === 0 && patient.riskLevel === 'Warning' && (
                    <div className="alert-compact-item alert-compact-item--warning">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="font-semibold text-amber-900 text-[11px]">Abnormal Trends</h4>
                        <p className="text-[10px] text-amber-700 mt-0.5">Respiration rate showing upward trend over last 4 hours.</p>
                      </div>
                    </div>
                  )}
                  {patientAlerts.length === 0 && patient.riskLevel === 'Stable' && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50/50 border border-emerald-100/50 rounded-xl text-xs text-emerald-600">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="font-medium">No active alerts — AI monitoring active</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── View Tabs ── */}
              <div className="flex items-center gap-1 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('clinical')}
                  className={clsx(
                    "px-3.5 py-2 text-xs font-semibold transition-colors border-b-2",
                    activeTab === 'clinical'
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                  )}
                >
                  Clinical Report
                </button>
                <button
                  onClick={() => setActiveTab('agents')}
                  className={clsx(
                    "px-3.5 py-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5",
                    activeTab === 'agents'
                      ? "border-emerald-500 text-emerald-600"
                      : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                  )}
                >
                  <Server className="w-3.5 h-3.5" />
                  30-Agent Architecture
                </button>
              </div>

              {activeTab === 'agents' ? (
                <AgentDashboard />
              ) : (
                <div className="space-y-5">
                  {/* ══ PRIMARY: Clinical Report (Center Focus) ══ */}
                  <ClinicalReportCard />

                  {/* ── Multilingual Explanation ── */}
                  <MultilingualExplanation patient={patient} />

                  {/* ── Documents ── */}
                  <DocumentsTab patientId={patient.id} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ═══ Right Compact Panel ═══ */}
        <RightPanel
          patient={patient}
          onUploadClick={() => setUploadModalOpen(true)}
          uploadedImage={uploadedImage}
          scanType={uploadedScanType}
          onPreviewClick={() => setUploadModalOpen(true)}
        />
      </div>

      {/* ═══ Floating Upload Button (tablet/mobile fallback) ═══ */}
      <button
        className="floating-upload-btn"
        onClick={() => setUploadModalOpen(true)}
        title="Upload Scan"
      >
        <ImageIcon size={22} />
      </button>

      {/* ═══ Overlays & Modals ═══ */}
      <AIConsultPanel />
      <VoiceAssistantPanel />

      <FloatingUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        patient={patient}
        initialImage={uploadedImage}
        onImageUploaded={(dataUrl, scanType) => {
          setUploadedImage(dataUrl);
          setUploadedScanType(scanType);
        }}
      />

      <DetailedVitalModal
        isOpen={!!selectedVital}
        onClose={() => setSelectedVital(null)}
        vital={selectedVital?.vital || null}
        theme={selectedVital?.theme || 'rose'}
      />

      <ReferralModal open={referralOpen} onClose={() => setReferralOpen(false)} patient={patient} />
      <IntakeFormModal open={intakeOpen} onClose={() => setIntakeOpen(false)} />
      <FamilyLinkModal open={familyLinkOpen} onClose={() => setFamilyLinkOpen(false)} patientId={patient.id} patientName={patient.name} />
      <DoctorClinicalReport open={clinicalReportOpen} onClose={() => setClinicalReportOpen(false)} patient={patient} />
    </div>
  );
}
