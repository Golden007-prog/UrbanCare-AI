import React from 'react';
import { motion } from 'motion/react';
import { Shield, Bone, AlertTriangle, CheckCircle, Activity, ArrowRight } from 'lucide-react';

export interface FractureAnalysisResult {
  image_type: string;
  region_focus: string;
  findings: string;
  fracture_detected: boolean;
  fracture_type: string;
  fracture_location: string;
  displacement: string;
  joint_involvement: boolean | string;
  confidence: number;
  clinical_recommendation: string;
  mock?: boolean;
}

interface FractureAnalysisCardProps {
  result: FractureAnalysisResult;
}

// Normalize confidence: handle both 0-1 and 0-100 scales
const normalizeConf = (c: number) => (c > 1 ? c / 100 : c);
const confColor = (c: number) => {
  const n = normalizeConf(c);
  return n >= 0.8 ? '#10b981' : n >= 0.5 ? '#f59e0b' : '#ef4444';
};

const displacementColor: Record<string, string> = {
  none: '#10b981',
  mild: '#f59e0b',
  moderate: '#f97316',
  severe: '#ef4444',
};

export const FractureAnalysisCard: React.FC<FractureAnalysisCardProps> = ({ result }) => {
  const isFracture = result.fracture_detected;
  const conf = normalizeConf(result.confidence);
  const jointInv = typeof result.joint_involvement === 'boolean' ? result.joint_involvement : result.joint_involvement === 'Yes';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: isFracture ? 'linear-gradient(135deg, #fef2f2, #fff1f2)' : 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
        borderRadius: 12,
        border: `1px solid ${isFracture ? '#fecaca' : '#bbf7d0'}`,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Status Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isFracture ? (
            <AlertTriangle size={18} style={{ color: '#dc2626' }} />
          ) : (
            <CheckCircle size={18} style={{ color: '#16a34a' }} />
          )}
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: isFracture ? '#dc2626' : '#16a34a',
          }}>
            {isFracture ? '⚠️ Fracture Detected' : '✅ No Fracture Detected'}
          </span>
        </div>
        {result.mock && (
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            color: '#94a3b8',
            background: '#f1f5f9',
            padding: '2px 6px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>Mock</span>
        )}
      </div>

      {/* Info Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        marginBottom: 14,
      }}>
        <InfoCell label="Type" value={result.fracture_type} />
        <InfoCell label="Location" value={result.fracture_location} />
        <InfoCell
          label="Displacement"
          value={result.displacement}
          valueColor={displacementColor[result.displacement] || '#64748b'}
        />
        <InfoCell
          label="Joint Involvement"
          value={jointInv ? 'Yes' : 'No'}
          valueColor={jointInv ? '#f97316' : '#10b981'}
        />
      </div>

      {/* Confidence Bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Shield size={12} /> Confidence
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: confColor(conf) }}>
            {(conf * 100).toFixed(0)}%
          </span>
        </div>
        <div style={{
          height: 6,
          borderRadius: 3,
          background: '#e2e8f0',
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${conf * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: 3,
              background: `linear-gradient(90deg, ${confColor(conf)}, ${confColor(conf)}cc)`,
            }}
          />
        </div>
      </div>

      {/* Findings */}
      <div style={{
        background: 'rgba(255,255,255,0.7)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        border: '1px solid rgba(0,0,0,0.05)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Bone size={12} style={{ color: '#6366f1' }} />
          Radiology Findings
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: '#475569' }}>
          {result.findings}
        </div>
      </div>

      {/* Clinical Recommendation */}
      <div style={{
        background: isFracture ? 'rgba(220, 38, 38, 0.06)' : 'rgba(22, 163, 74, 0.06)',
        borderRadius: 8,
        padding: 12,
        border: `1px solid ${isFracture ? 'rgba(220,38,38,0.12)' : 'rgba(22,163,74,0.12)'}`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Activity size={12} style={{ color: isFracture ? '#dc2626' : '#16a34a' }} />
          Clinical Recommendation
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: '#475569' }}>
          {result.clinical_recommendation}
        </div>
      </div>

      {/* Metadata */}
      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <MetaBadge label={result.image_type.replace(/_/g, ' ')} />
        <MetaBadge label={result.region_focus.replace(/_/g, ' ')} />
      </div>
    </motion.div>
  );
};

const InfoCell: React.FC<{ label: string; value: string; valueColor?: string }> = ({ label, value, valueColor }) => (
  <div style={{
    background: 'rgba(255,255,255,0.7)',
    borderRadius: 6,
    padding: '8px 10px',
    border: '1px solid rgba(0,0,0,0.04)',
  }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}
    </div>
    <div style={{ fontSize: 12, fontWeight: 600, color: valueColor || '#334155', textTransform: 'capitalize' }}>
      {value || '—'}
    </div>
  </div>
);

const MetaBadge: React.FC<{ label: string }> = ({ label }) => (
  <span style={{
    fontSize: 10,
    fontWeight: 600,
    color: '#6366f1',
    background: '#eef2ff',
    padding: '2px 8px',
    borderRadius: 4,
    textTransform: 'capitalize',
  }}>
    {label}
  </span>
);
