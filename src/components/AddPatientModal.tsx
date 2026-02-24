import React, { useState } from 'react';
import { X, Heart, Thermometer, Wind, Droplets } from 'lucide-react';
import { useStore, Patient } from '../store/useStore';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose }) => {
  const { addPatient } = useStore();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    condition: '',
    riskLevel: 'Stable',
    notes: ''
  });
  const [isAdmitted, setIsAdmitted] = useState(false);
  const [vitalsData, setVitalsData] = useState({
    heartRate: '75',
    spo2: '98',
    temperature: '98.6',
    respiration: '16'
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const hr = isAdmitted ? parseInt(vitalsData.heartRate) || 75 : 75;
    const sp = isAdmitted ? parseInt(vitalsData.spo2) || 98 : 98;
    const temp = isAdmitted ? parseFloat(vitalsData.temperature) || 98.6 : 98.6;
    const resp = isAdmitted ? parseInt(vitalsData.respiration) || 16 : 16;
    
    const newPatient: Patient = {
      id: `P${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      name: formData.name,
      age: parseInt(formData.age) || 0,
      gender: formData.gender as any,
      condition: formData.condition || 'General Checkup',
      riskLevel: formData.riskLevel as any,
      lastUpdated: 'Just now',
      hospitalId: undefined,
      patientType: isAdmitted ? 'admitted' : 'private',
      admissionStatus: isAdmitted ? 'admitted' : 'not_admitted',
      monitoringEnabled: isAdmitted,
      vitals: {
        heartRate: { name: 'Heart Rate', value: hr, unit: 'BPM', trend: 0, status: 'stable', history: [] },
        bloodPressure: { sys: 120, dia: 80, status: 'stable', trend: 0 },
        spO2: { name: 'SpO2', value: sp, unit: '%', trend: 0, status: 'stable', history: [] },
        temperature: { name: 'Temperature', value: temp, unit: '°F', trend: 0, status: 'stable', history: [] },
        respiration: { name: 'Respiration', value: resp, unit: '/min', trend: 0, status: 'stable', history: [] },
      },
      notes: { soap: '', hpi: '', assessment: '', plan: '' }
    };

    addPatient(newPatient);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-semibold text-lg text-slate-900">Add Patient</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name</label>
            <input
              required
              type="text"
              placeholder="e.g., John Smith"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
              <input
                required
                type="number"
                placeholder="e.g., 45"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
              >
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Risk Level</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={formData.riskLevel}
              onChange={e => setFormData({...formData, riskLevel: e.target.value})}
            >
              <option>Stable</option>
              <option>Warning</option>
              <option>Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Primary Condition</label>
            <input
              type="text"
              placeholder="e.g., Hypertension"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={formData.condition}
              onChange={e => setFormData({...formData, condition: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Initial Notes (optional)</label>
            <textarea
              placeholder="Brief clinical notes..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 h-24 resize-none"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          {/* ── Admit Patient Toggle ── */}
          <div
            className="flex items-center justify-between p-4 rounded-xl border transition-all duration-200"
            style={{
              background: isAdmitted
                ? 'linear-gradient(135deg, #f0fdf4, #ecfdf5)'
                : '#f8fafc',
              borderColor: isAdmitted ? '#86efac' : '#e2e8f0',
            }}
          >
            <div>
              <span className="text-sm font-semibold text-slate-800">Admit patient now</span>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmitted ? 'Patient will be admitted with live vitals monitoring' : 'Patient will be registered as private (OPD)'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isAdmitted}
              onClick={() => setIsAdmitted(!isAdmitted)}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              style={{
                backgroundColor: isAdmitted ? '#4f46e5' : '#cbd5e1',
              }}
            >
              <span
                className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out"
                style={{
                  transform: isAdmitted ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>

          {/* ── Vitals Inputs (only when admitted) ── */}
          {isAdmitted && (
            <div
              className="space-y-3 p-4 rounded-xl border border-indigo-100"
              style={{ background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)' }}
            >
              <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5" /> Initial Vitals
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-500" /> Heart Rate (BPM)
                  </label>
                  <input
                    type="number"
                    placeholder="75"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    value={vitalsData.heartRate}
                    onChange={e => setVitalsData({...vitalsData, heartRate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-sky-500" /> SpO2 (%)
                  </label>
                  <input
                    type="number"
                    placeholder="98"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    value={vitalsData.spo2}
                    onChange={e => setVitalsData({...vitalsData, spo2: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-amber-500" /> Temperature (°F)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="98.6"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    value={vitalsData.temperature}
                    onChange={e => setVitalsData({...vitalsData, temperature: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Wind className="w-3 h-3 text-emerald-500" /> Respiration (/min)
                  </label>
                  <input
                    type="number"
                    placeholder="16"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    value={vitalsData.respiration}
                    onChange={e => setVitalsData({...vitalsData, respiration: e.target.value})}
                  />
                </div>
              </div>
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
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200"
            >
              {isAdmitted ? 'Admit & Save' : 'Save Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
