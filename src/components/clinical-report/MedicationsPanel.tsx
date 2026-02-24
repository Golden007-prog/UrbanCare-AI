import React from 'react';
import type { MedicationItem } from '../../utils/soapParser';

interface Props {
  medications: MedicationItem[];
}

export const MedicationsPanel: React.FC<Props> = ({ medications }) => {
  return (
    <div className="glass-card medications-card report-fade-in">
      <div className="section-header">Medications</div>
      <div>
        {medications.map((med, i) => (
          <div key={i} className="medication-row">
            <div>
              <div className="medication-name">{med.name}</div>
            </div>
            <div className="medication-dosage">
              {[med.dosage, med.frequency, med.duration]
                .filter(Boolean)
                .join(' • ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
