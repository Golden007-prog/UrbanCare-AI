import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { VitalCard } from './components/VitalCard';
import { NotesWidget } from './components/NotesWidget';
import { ChatAssistant } from './components/ChatAssistant';
import { DetailedVitalModal } from './components/DetailedVitalModal';
import { ImageDiagnosticsWidget } from './components/ImageDiagnosticsWidget';
import { useStore, VitalSign } from './store/useStore';
import { Activity, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';

function App() {
  const { selectedPatientId, patients } = useStore();
  const patient = patients.find((p) => p.id === selectedPatientId);
  const [selectedVital, setSelectedVital] = useState<{ vital: VitalSign, theme: any } | null>(null);

  if (!patient) return <div className="flex items-center justify-center h-screen text-slate-500">Loading patient data...</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col ml-80 h-screen">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8 pb-20">
            
            {/* Patient Header */}
            <div className="flex justify-between items-end">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{patient.name}</h1>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono font-medium border border-slate-200">
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
                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors">
                  View History
                </button>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors">
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

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Alerts & Status */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Active Alerts
                  </h3>
                  
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
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                      <CheckCircle className="w-12 h-12 text-emerald-100 mb-3" />
                      <p className="text-sm">No active alerts</p>
                      <p className="text-xs text-slate-400 mt-1">Patient is stable</p>
                    </div>
                  )}
                </div>

                <ImageDiagnosticsWidget />
              </div>

              {/* Middle Column: AI Notes */}
              <div className="lg:col-span-2 min-h-[500px]">
                <NotesWidget />
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <ChatAssistant />
      
      <DetailedVitalModal 
        isOpen={!!selectedVital} 
        onClose={() => setSelectedVital(null)} 
        vital={selectedVital?.vital || null}
        theme={selectedVital?.theme || 'rose'}
      />
    </div>
  );
}

export default App;
