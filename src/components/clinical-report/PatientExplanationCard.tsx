import React from 'react';

interface Props {
  explanation: string;
}

export const PatientExplanationCard: React.FC<Props> = ({ explanation }) => {
  return (
    <div className="glass-card explanation-card report-fade-in">
      <DotPattern />
      <div className="section-header">Patient Explanation</div>
      <p className="explanation-text">{explanation}</p>
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
