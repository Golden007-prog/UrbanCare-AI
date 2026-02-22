import React from 'react';
import { motion } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';
import clsx from 'clsx';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { VitalSign } from '../store/useStore';

interface VitalCardProps {
  vital: VitalSign;
  theme: 'rose' | 'sky' | 'amber' | 'emerald' | 'indigo';
  onClick?: () => void;
}

const themes = {
  rose: {
    bg: 'bg-rose-500',
    text: 'text-rose-600',
    light: 'bg-rose-50',
    stroke: '#e11d48', // rose-600
  },
  sky: {
    bg: 'bg-sky-500',
    text: 'text-sky-600',
    light: 'bg-sky-50',
    stroke: '#0284c7', // sky-600
  },
  amber: {
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    light: 'bg-amber-50',
    stroke: '#d97706', // amber-600
  },
  emerald: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    light: 'bg-emerald-50',
    stroke: '#059669', // emerald-600
  },
  indigo: {
    bg: 'bg-indigo-500',
    text: 'text-indigo-600',
    light: 'bg-indigo-50',
    stroke: '#4f46e5', // indigo-600
  },
};

export const VitalCard: React.FC<VitalCardProps> = ({ vital, theme, onClick }) => {
  const isPositive = vital.trend > 0;
  const isNeutral = vital.trend === 0;
  const t = themes[theme];

  return (
    <motion.div 
      onClick={onClick}
      whileHover={{ y: -4, boxShadow: "var(--shadow-premium-hover)" }}
      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[var(--shadow-premium)] transition-colors relative overflow-hidden group cursor-pointer"
    >
      <div className={clsx("absolute top-0 left-0 w-1 h-full bg-gradient-to-b", t.bg, "opacity-80")} />
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
            <span className={clsx("w-2 h-2 rounded-full", t.bg, "opacity-50")} />
            {vital.name}
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {vital.value}
            </span>
            <span className="text-sm font-medium text-slate-400">{vital.unit}</span>
          </div>
        </div>
        
        <div className={clsx(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm",
          isPositive ? "bg-red-50/80 text-red-600 border border-red-100" : isNeutral ? "bg-slate-50/80 text-slate-600 border border-slate-100" : "bg-emerald-50/80 text-emerald-600 border border-emerald-100"
        )}>
          {isPositive ? <ArrowUp className="w-3 h-3" /> : isNeutral ? <Minus className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          <span>{Math.abs(vital.trend)}%</span>
        </div>
      </div>

      <div className="h-16 w-full opacity-60 group-hover:opacity-100 transition-opacity duration-300">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={vital.history}>
            <defs>
              <linearGradient id={`color-${vital.name}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={t.stroke} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={t.stroke} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={t.stroke} 
              fillOpacity={1} 
              fill={`url(#color-${vital.name})`} 
              strokeWidth={2}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex justify-between items-center text-xs text-slate-400">
        <span>Baseline: {vital.history[0]?.value.toFixed(0)}</span>
        <span className="font-medium text-slate-500">Normal Range</span>
      </div>
    </motion.div>
  );
};
