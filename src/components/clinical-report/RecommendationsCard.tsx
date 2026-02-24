import React from 'react';

interface Props {
  recommendations: string[];
}

export const RecommendationsCard: React.FC<Props> = ({ recommendations }) => {
  return (
    <div className="glass-card report-fade-in">
      <DotPattern />
      <div className="section-header">Recommendations</div>
      <ul className="recommendation-list">
        {recommendations.map((rec, i) => (
          <li key={i} className="recommendation-item">
            {rec}
          </li>
        ))}
      </ul>
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
