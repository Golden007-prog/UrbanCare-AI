import React, { useState } from 'react';
import { Search, Plus, Upload } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AddPatientModal } from './AddPatientModal';
import { CsvImportModal } from './CsvImportModal';
import clsx from 'clsx';

export const Sidebar = () => {
  const { patients, selectedPatientId, selectPatient } = useStore();
  const [filter, setFilter] = React.useState<'All' | 'Critical' | 'Warning' | 'Stable'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const filteredPatients = patients.filter((p) => {
    if (filter === 'All') return true;
    return p.riskLevel === filter;
  });

  return (
    <>
      <div className="w-80 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 z-10">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">U</span>
            </div>
            <span className="font-bold text-xl text-slate-800">UrbanCare AI</span>
          </div>

          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
            {['All', 'Critical', 'Warning', 'Stable'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  filter === f
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => selectPatient(patient.id)}
              className={clsx(
                'p-3 rounded-xl cursor-pointer border transition-all',
                selectedPatientId === patient.id
                  ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                  : 'bg-white border-transparent hover:bg-slate-50'
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-slate-900">{patient.name}</span>
                <span
                  className={clsx(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
                    patient.riskLevel === 'Critical'
                      ? 'bg-red-100 text-red-700'
                      : patient.riskLevel === 'Warning'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  )}
                >
                  {patient.riskLevel}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <span className="font-mono text-slate-400">{patient.id}</span>
                <span>•</span>
                <span>{patient.age}{patient.gender === 'Male' ? 'M' : 'F'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Updated {patient.lastUpdated}</span>
                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-medium">
                  Synthetic Monitoring
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            Add Patient
          </button>
          <button 
            onClick={() => setIsCsvModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
        </div>
      </div>
      
      <AddPatientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <CsvImportModal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} />
    </>
  );
};
