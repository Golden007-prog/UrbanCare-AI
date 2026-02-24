import React from 'react';
import type { DiagnosisData } from '../../utils/soapParser';

interface Props {
  diagnosis: DiagnosisData;
  patientAge: number;
  patientGender: string;
  date: string;
  source?: string;
}

export const DiagnosisCard: React.FC<Props> = ({
  diagnosis,
  patientAge,
  patientGender,
  date,
  source = 'AI Generated',
}) => {
  return (
    <div className="glass-card diagnosis-card report-fade-in">
      <DotPattern />
      <div className="patient-info-bar">
        <div className="patient-info-item">
          <span className="patient-info-label">Patient Info</span>
          <span className="patient-info-value">{patientAge} / {patientGender}</span>
        </div>
        <div className="patient-info-item">
          <span className="patient-info-label">Date</span>
          <span className="patient-info-value">{date}</span>
        </div>
        <div className="patient-info-item">
          <span className="patient-info-label">Source</span>
          <span className="patient-info-value">{source}</span>
        </div>
      </div>
      <div className="section-header">Primary Diagnosis</div>
      <h1 className="diagnosis-title">{diagnosis.title}</h1>
    </div>
  );
};

const DotPattern = () => (
  <div className="dot-pattern">
    {Array.from({ length: 15 }).map((_, i) => (
      <span key={i} />
    ))}
  </div>
);
