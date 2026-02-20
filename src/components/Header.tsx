import React from 'react';
import { Search, Lock, ShieldCheck, Wifi, Bell, Settings, User } from 'lucide-react';

export const Header = () => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
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

      <div className="flex items-center gap-6">
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
          <div className="flex items-center gap-1.5 text-emerald-600">
            <Wifi className="w-3 h-3" />
            <span>Online</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm ring-2 ring-indigo-100">
              DR
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-900">Dr. User</p>
              <p className="text-xs text-slate-500">Cardiology</p>
            </div>
          </div>
          
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
