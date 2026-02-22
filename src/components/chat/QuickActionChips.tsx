import React from 'react';
import {
  FileText,
  Activity,
  Brain,
  Pill,
  Languages,
  ClipboardCheck,
  CalendarCheck,
} from 'lucide-react';
import type { ActionKey } from '../../hooks/useAIConsult';

interface QuickActionChipsProps {
  onAction: (actionKey: ActionKey) => void;
  disabled?: boolean;
}

const ACTIONS: { key: ActionKey; label: string; icon: React.ReactNode }[] = [
  { key: 'generate-soap', label: 'SOAP Note', icon: <FileText style={{ width: 12, height: 12 }} /> },
  { key: 'explain-vitals', label: 'Explain Vitals', icon: <Activity style={{ width: 12, height: 12 }} /> },
  { key: 'risk-reasoning', label: 'Risk Analysis', icon: <Brain style={{ width: 12, height: 12 }} /> },
  { key: 'suggest-medication', label: 'Medication', icon: <Pill style={{ width: 12, height: 12 }} /> },
  { key: 'translate-for-patient', label: 'Patient Language', icon: <Languages style={{ width: 12, height: 12 }} /> },
  { key: 'discharge-summary', label: 'Discharge', icon: <ClipboardCheck style={{ width: 12, height: 12 }} /> },
  { key: 'follow-up-plan', label: 'Follow-up', icon: <CalendarCheck style={{ width: 12, height: 12 }} /> },
];

export function QuickActionChips({ onAction, disabled }: QuickActionChipsProps) {
  return (
    <div className="copilot-chips">
      {ACTIONS.map((action) => (
        <button
          key={action.key}
          className="copilot-chip"
          onClick={() => onAction(action.key)}
          disabled={disabled}
          title={action.key.replace(/-/g, ' ')}
        >
          <span className="copilot-chip-icon">{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  );
}
