import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { X, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { VitalSign } from '../store/useStore';
import clsx from 'clsx';

interface DetailedVitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  vital: VitalSign | null;
  theme: 'rose' | 'sky' | 'amber' | 'emerald' | 'indigo';
}

const themes = {
  rose: { stroke: '#e11d48', fill: '#ffe4e6', text: 'text-rose-600' },
  sky: { stroke: '#0284c7', fill: '#e0f2fe', text: 'text-sky-600' },
  amber: { stroke: '#d97706', fill: '#fef3c7', text: 'text-amber-600' },
  emerald: { stroke: '#059669', fill: '#d1fae5', text: 'text-emerald-600' },
  indigo: { stroke: '#4f46e5', fill: '#e0e7ff', text: 'text-indigo-600' },
};

export const DetailedVitalModal: React.FC<DetailedVitalModalProps> = ({ isOpen, onClose, vital, theme }) => {
  if (!isOpen || !vital) return null;

  const t = themes[theme];
  const isPositive = vital.trend > 0;
  const isNeutral = vital.trend === 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={clsx("p-2 rounded-lg bg-slate-100", t.text)}>
              {/* Icon placeholder if needed */}
            </div>
            <div>
              <h2 className="font-semibold text-xl text-slate-900">{vital.name}</h2>
              <p className="text-sm text-slate-500">Last 24 Hours</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          <div className="flex items-end gap-4 mb-8">
            <div>
              <span className="text-5xl font-bold text-slate-900 tracking-tight">{vital.value}</span>
              <span className="text-lg font-medium text-slate-500 ml-2">{vital.unit}</span>
            </div>
            <div className={clsx(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium mb-2",
              isPositive ? "bg-red-50 text-red-600" : isNeutral ? "bg-slate-50 text-slate-600" : "bg-emerald-50 text-emerald-600"
            )}>
              {isPositive ? <ArrowUp className="w-4 h-4" /> : isNeutral ? <Minus className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              <span>{Math.abs(vital.trend)}% vs baseline</span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={vital.history}>
                <defs>
                  <linearGradient id={`detail-color-${vital.name}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={t.stroke} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={t.stroke} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={t.stroke} 
                  fillOpacity={1} 
                  fill={`url(#detail-color-${vital.name})`} 
                  strokeWidth={3}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
           <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors">
              Export CSV
           </button>
           <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors">
              Print Report
           </button>
        </div>
      </div>
    </div>
  );
};
