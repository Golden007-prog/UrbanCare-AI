import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { VitalCard } from '../components/VitalCard';
import { NotesWidget } from '../components/NotesWidget';
import { AIConsultPanel } from '../components/AIConsultPanel';
import { DetailedVitalModal } from '../components/DetailedVitalModal';
import { ImageDiagnosticsWidget } from '../components/ImageDiagnosticsWidget';
import { RiskPredictionPanel } from '../components/RiskPredictionPanel';
import { MultilingualExplanation } from '../components/MultilingualExplanation';
import { ReferralModal } from '../components/ReferralModal';
import { IntakeFormModal } from '../components/IntakeFormModal';
import { useStore, VitalSign } from '../store/useStore';
import { Activity, AlertTriangle, CheckCircle, Clock, User, FileText, UserPlus, Upload } from 'lucide-react';
import clsx from 'clsx';

export default function Dashboard() {
  const { selectedPatientId, patients, alerts, importToast } = useStore();
  const patient = patients.find((p) => p.id === selectedPatientId);
  const patientAlerts = alerts.filter((a) => a.patientId === patient?.id);
  const [selectedVital, setSelectedVital] = useState<{ vital: VitalSign, theme: any } | null>(null);
  const [referralOpen, setReferralOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);

  if (!patient) return <div className="flex items-center justify-center h-screen text-slate-500">Loading patient data...</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col ml-80 h-screen">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-8">
          {/* Import toast */}
          {importToast && (
            <div className="mb-4 max-w-7xl mx-auto">
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-300">
                <Upload className="w-4 h-4" />
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
              className="max-w-7xl mx-auto space-y-8 pb-20"
            >
              
              {/* Patient Header */}
              <div className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{patient.name}</h1>
                    <span className="px-3 py-1 bg-white text-slate-600 rounded-full text-xs font-mono font-medium border border-slate-200 shadow-sm">
                      ID: {patient.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-slate-500">
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {patient.age} Years, {patient.gender}
                    </span>
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      {patient.condition}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Last updated: {patient.lastUpdated}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setIntakeOpen(true)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm hover:shadow-[var(--shadow-premium-hover)] transition-all flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Intake Form
                  </button>
                  <button
                    onClick={() => setReferralOpen(true)}
                    className="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 shadow-sm hover:shadow-[var(--shadow-premium-hover)] transition-all flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Generate Referral
                  </button>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:-translate-y-0.5">
                    Edit Patient
                  </button>
                </div>
              </div>

              {/* Vitals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <VitalCard 
                  vital={patient.vitals.heartRate} 
                  theme="rose" 
                  onClick={() => setSelectedVital({ vital: patient.vitals.heartRate, theme: 'rose' })}
                />
                <VitalCard 
                  vital={patient.vitals.spO2} 
                  theme="sky" 
                  onClick={() => setSelectedVital({ vital: patient.vitals.spO2, theme: 'sky' })}
                />
                <VitalCard 
                  vital={patient.vitals.temperature} 
                  theme="amber" 
                  onClick={() => setSelectedVital({ vital: patient.vitals.temperature, theme: 'amber' })}
                />
                <VitalCard 
                  vital={patient.vitals.respiration} 
                  theme="emerald" 
                  onClick={() => setSelectedVital({ vital: patient.vitals.respiration, theme: 'emerald' })}
                />
              </div>

              {/* Main Content 12-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Context Rail (Left, 4 cols): Alerts, Risk Prediction & Image Diagnostics */}
                <aside className="lg:col-span-4 space-y-8 sticky top-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[var(--shadow-premium)] transition-all">
                    <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      Active Alerts
                    </h3>
                    
                    {/* CSV-imported alerts */}
                    {patientAlerts.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {patientAlerts.slice(0, 5).map((alert, i) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                            key={i} className={clsx(
                            'p-3.5 rounded-xl flex items-start gap-3 text-sm relative overflow-hidden',
                            alert.alertType.toLowerCase().includes('critical') ? 'bg-red-50/80 border border-red-100/50' :
                            alert.alertType.toLowerCase().includes('warning') ? 'bg-amber-50/80 border border-amber-100/50' :
                            'bg-blue-50/80 border border-blue-100/50',
                          )}>
                            <div className={clsx("absolute top-0 left-0 w-1 h-full", 
                              alert.alertType.toLowerCase().includes('critical') ? 'bg-red-500' :
                              alert.alertType.toLowerCase().includes('warning') ? 'bg-amber-500' : 'bg-blue-500'
                            )} />
                            <AlertTriangle className={clsx('w-4 h-4 mt-0.5 shrink-0',
                              alert.alertType.toLowerCase().includes('critical') ? 'text-red-600' :
                              alert.alertType.toLowerCase().includes('warning') ? 'text-amber-600' : 'text-blue-600',
                            )} />
                            <div>
                              <h4 className="font-medium text-slate-900 text-xs">{alert.alertType}</h4>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
                              <p className="text-[10px] text-slate-400 mt-1.5 font-mono">{new Date(alert.timestamp).toLocaleString()}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {patient.riskLevel === 'Critical' ? (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-900 text-sm">Critical Vitals Detected</h4>
                          <p className="text-xs text-red-700 mt-1">
                            Heart rate and blood pressure exceeding safety thresholds. Immediate attention required.
                          </p>
                        </div>
                      </div>
                    ) : patient.riskLevel === 'Warning' ? (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-900 text-sm">Abnormal Trends</h4>
                          <p className="text-xs text-amber-700 mt-1">
                            Respiration rate showing upward trend over last 4 hours.
                          </p>
                        </div>
                      </div>
                    ) : patientAlerts.length === 0 ? (
                      <div className="h-40 flex flex-col items-center justify-center text-emerald-600/60 bg-emerald-50/30 rounded-xl border border-emerald-100/50">
                        <CheckCircle className="w-10 h-10 text-emerald-400 mb-3 drop-shadow-sm" />
                        <p className="text-sm font-medium">No active alerts</p>
                        <p className="text-xs text-emerald-600/70 mt-1">Patient AI monitoring active</p>
                      </div>
                    ) : null}
                  </div>

                  {/* Risk Prediction Panel */}
                  <RiskPredictionPanel patient={patient} />

                  <ImageDiagnosticsWidget />
                </aside>

                {/* Primary Workspace (Right, 8 cols): AI Notes + Multilingual */}
                <div className="lg:col-span-8 space-y-8 min-h-[500px]">
                  <NotesWidget />
                  <MultilingualExplanation patient={patient} />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      <AIConsultPanel />
      
      <DetailedVitalModal 
        isOpen={!!selectedVital} 
        onClose={() => setSelectedVital(null)} 
        vital={selectedVital?.vital || null}
        theme={selectedVital?.theme || 'rose'}
      />

      {/* Modals */}
      <ReferralModal open={referralOpen} onClose={() => setReferralOpen(false)} patient={patient} />
      <IntakeFormModal open={intakeOpen} onClose={() => setIntakeOpen(false)} />
    </div>
  );
}
