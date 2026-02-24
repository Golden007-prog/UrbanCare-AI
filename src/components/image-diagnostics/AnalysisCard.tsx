import React from 'react';
import { motion } from 'motion/react';
import { Shield, ChevronRight, AlertTriangle, Brain } from 'lucide-react';

interface AnalysisResult {
  analysis: string;
  reasoning: string;
  findings: string[];
  confidence: 'low' | 'moderate' | 'high';
}

interface AnalysisCardProps {
  result: AnalysisResult;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({ result }) => {
  const confidenceClass = {
    low: 'confidence-badge--low',
    moderate: 'confidence-badge--moderate',
    high: 'confidence-badge--high',
  }[result.confidence];

  return (
    <motion.div
      className="analysis-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Confidence Badge */}
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className={`confidence-badge ${confidenceClass}`}>
          <Shield size={12} />
          {result.confidence.toUpperCase()}
        </span>
      </div>

      {/* AI Analysis */}
      <div className="analysis-section">
        <div className="analysis-section-title" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Brain size={12} /> AI Analysis
        </div>
        <div className="analysis-section-content">{result.analysis}</div>
      </div>

      {/* Reasoning */}
      {result.reasoning && (
        <div className="analysis-section">
          <div className="analysis-section-title">Reasoning</div>
          <div className="analysis-section-content" style={{ fontStyle: 'italic', color: '#64748b' }}>
            {result.reasoning}
          </div>
        </div>
      )}

      {/* Findings */}
      {result.findings && result.findings.length > 0 && (
        <div className="analysis-section">
          <div className="analysis-section-title">Key Findings</div>
          <div>
            {result.findings.map((f, i) => (
              <div key={i} className="analysis-finding-item">
                <ChevronRight size={14} style={{ color: '#6366f1', flexShrink: 0, marginTop: 1 }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export const AnalysisLoading: React.FC = () => (
  <div className="analysis-loading">
    <div className="analysis-loading-line" style={{ width: '80%' }} />
    <div className="analysis-loading-line" style={{ width: '100%' }} />
    <div className="analysis-loading-line" style={{ width: '65%' }} />
    <div className="analysis-loading-line" style={{ width: '90%' }} />
    <div className="analysis-loading-line" style={{ width: '45%' }} />
  </div>
);
