import React, { useState } from 'react';
import { X } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newPatient: Patient = {
      id: `P${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      name: formData.name,
      age: parseInt(formData.age) || 0,
      gender: formData.gender as any,
      condition: formData.condition || 'General Checkup',
      riskLevel: formData.riskLevel as any,
      lastUpdated: 'Just now',
      vitals: {
        heartRate: { name: 'Heart Rate', value: 75, unit: 'BPM', trend: 0, status: 'stable', history: [] },
        bloodPressure: { sys: 120, dia: 80, status: 'stable', trend: 0 },
        spO2: { name: 'SpO2', value: 98, unit: '%', trend: 0, status: 'stable', history: [] },
        temperature: { name: 'Temperature', value: 98.6, unit: '°F', trend: 0, status: 'stable', history: [] },
        respiration: { name: 'Respiration', value: 16, unit: '/min', trend: 0, status: 'stable', history: [] },
      },
      notes: { soap: '', hpi: '', assessment: '', plan: '' }
    };

    addPatient(newPatient);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
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
              Save Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
