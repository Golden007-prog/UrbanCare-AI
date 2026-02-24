import React from 'react';
import { Bed, LogOut, UserCheck } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  status: 'not_admitted' | 'admitted' | 'discharged';
  variant?: 'badge' | 'inline';
}

const STATUS_CONFIG = {
  not_admitted: { label: 'Private', icon: UserCheck, color: 'bg-slate-100 text-slate-600 border-slate-200' },
  admitted: { label: 'Admitted', icon: Bed, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  discharged: { label: 'Discharged', icon: LogOut, color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const AdmissionBadge: React.FC<Props> = ({ status, variant = 'badge' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_admitted;
  const Icon = config.icon;

  if (variant === 'inline') {
    return (
      <span className={clsx('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border', config.color)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border', config.color)}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};
