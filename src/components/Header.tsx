import React, { useState } from 'react';
import { Search, Lock, ShieldCheck, Wifi, Bell, Settings } from 'lucide-react';
import { DoctorProfileCard } from './DoctorProfileCard';
import { HospitalSwitcher } from './HospitalSwitcher';
import { SettingsDropdown } from './SettingsDropdown';
import { AuditLogPanel } from './AuditLogPanel';
import { useStore } from '../store/useStore';

export const Header = () => {
  const [auditOpen, setAuditOpen] = useState(false);
  const { settings } = useStore();

  return (
    <>
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 sticky top-0 z-40 transition-colors">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients, notes, alerts... (Ctrl+K)"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 bg-white border border-slate-200 rounded shadow-sm">
                Ctrl
              </kbd>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 bg-white border border-slate-200 rounded shadow-sm">
                K
              </kbd>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Hospital Switcher */}
          <HospitalSwitcher />

          {/* Status indicators */}
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <Lock className="w-3 h-3" />
              <span>Secure</span>
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1.5 text-indigo-600">
              <ShieldCheck className="w-3 h-3" />
              <span>HIPAA</span>
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div className={`flex items-center gap-1.5 ${settings.offlineMode ? 'text-amber-500' : 'text-emerald-600'}`}>
              <Wifi className="w-3 h-3" />
              <span>{settings.offlineMode ? 'Offline' : 'Online'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            {/* Settings Gear */}
            <SettingsDropdown onOpenAuditLog={() => setAuditOpen(true)}>
              <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </SettingsDropdown>

            {/* Notifications Bell */}
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            
            {/* Doctor Profile */}
            <DoctorProfileCard onOpenAuditLog={() => setAuditOpen(true)} />
          </div>
        </div>
      </header>

      <AuditLogPanel open={auditOpen} onClose={() => setAuditOpen(false)} />
    </>
  );
};
