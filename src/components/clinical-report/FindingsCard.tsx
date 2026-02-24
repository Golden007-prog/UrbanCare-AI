import React from 'react';
import type { FindingsData } from '../../utils/soapParser';

interface Props {
  findings: FindingsData;
}

export const FindingsCard: React.FC<Props> = ({ findings }) => {
  return (
    <div className="glass-card report-fade-in">
      <DotPattern />
      <div className="section-header">Main Findings</div>
      <p className="findings-text">{findings.summary}</p>

      {findings.vitalFindings.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {findings.vitalFindings.map((finding, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                }}
              >
                {finding}
              </span>
            ))}
          </div>
        </div>
      )}

      {findings.examFindings.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {findings.examFindings.slice(0, 6).map((finding, i) => (
            <p
              key={i}
              style={{
                fontSize: 13.5,
                color: '#475569',
                lineHeight: 1.7,
                margin: '4px 0',
                paddingLeft: 12,
                borderLeft: '2px solid #e2e8f0',
              }}
            >
              {finding.replace(/\*\*/g, '')}
            </p>
          ))}
        </div>
      )}
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
