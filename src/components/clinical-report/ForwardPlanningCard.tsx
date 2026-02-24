import React from 'react';
import type { ForwardPlanData } from '../../utils/soapParser';

interface Props {
  plan: ForwardPlanData;
}

export const ForwardPlanningCard: React.FC<Props> = ({ plan }) => {
  return (
    <div className="glass-card forward-card report-fade-in">
      <div className="section-header">Forward Planning</div>
      <div className="forward-timeframe">{plan.timeframe}</div>
      {plan.instructions.length > 0 && (
        <ul className="recommendation-list" style={{ marginTop: 4 }}>
          {plan.instructions.slice(0, 4).map((item, i) => (
            <li key={i} className="recommendation-item" style={{ fontSize: 13 }}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
