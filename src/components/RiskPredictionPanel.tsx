import React from 'react';
import { Typography, Tooltip, Tag } from 'antd';
import { AlertTriangle, TrendingUp, TrendingDown, Clock, Sparkles } from 'lucide-react';
import { Patient } from '../store/useStore';
import { motion } from 'motion/react';

const { Text } = Typography;

interface RiskPredictionPanelProps {
  patient: Patient;
}

function analyzeVitalTrend(history: { time: string; value: number }[], thresholdHigh: number): {
  slope: number;
  hoursToRisk: number | null;
  direction: 'rising' | 'falling' | 'stable';
} {
  if (!history || history.length < 4) {
    return { slope: 0, hoursToRisk: null, direction: 'stable' };
  }

  // Simple linear regression on last 12 data points
  const recent = history.slice(-12);
  const n = recent.length;
  const xMean = (n - 1) / 2;
  const yMean = recent.reduce((acc, p) => acc + p.value, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (recent[i].value - yMean);
    denominator += (i - xMean) ** 2;
  }
  const slope = denominator !== 0 ? numerator / denominator : 0;

  const direction: 'rising' | 'falling' | 'stable' =
    slope > 0.1 ? 'rising' : slope < -0.1 ? 'falling' : 'stable';

  // Estimate hours to reach threshold
  const currentValue = recent[recent.length - 1].value;
  let hoursToRisk: number | null = null;

  if (slope > 0.1 && currentValue < thresholdHigh) {
    hoursToRisk = Math.round((thresholdHigh - currentValue) / slope);
  }

  return { slope, hoursToRisk, direction };
}

export function RiskPredictionPanel({ patient }: RiskPredictionPanelProps) {
  const hrAnalysis = analyzeVitalTrend(patient.vitals.heartRate.history, 100);
  const tempAnalysis = analyzeVitalTrend(patient.vitals.temperature.history, 100.4);
  const rrAnalysis = analyzeVitalTrend(patient.vitals.respiration.history, 24);
  const spo2Analysis = analyzeVitalTrend(patient.vitals.spO2.history, 100); // inverted: risk is LOW spo2

  // Overall risk calculation
  const riskFactors: string[] = [];
  let minHours: number | null = null;

  if (hrAnalysis.direction === 'rising') {
    riskFactors.push('Heart rate trending up');
    if (hrAnalysis.hoursToRisk && (!minHours || hrAnalysis.hoursToRisk < minHours)) {
      minHours = hrAnalysis.hoursToRisk;
    }
  }
  if (tempAnalysis.direction === 'rising') {
    riskFactors.push('Temperature trending up');
    if (tempAnalysis.hoursToRisk && (!minHours || tempAnalysis.hoursToRisk < minHours)) {
      minHours = tempAnalysis.hoursToRisk;
    }
  }
  if (rrAnalysis.direction === 'rising') {
    riskFactors.push('Respiration rate trending up');
    if (rrAnalysis.hoursToRisk && (!minHours || rrAnalysis.hoursToRisk < minHours)) {
      minHours = rrAnalysis.hoursToRisk;
    }
  }
  if (spo2Analysis.direction === 'falling') {
    riskFactors.push('SpO2 declining');
  }

  const overallRisk =
    patient.riskLevel === 'Critical'
      ? 'critical'
      : riskFactors.length >= 2
      ? 'high'
      : riskFactors.length === 1
      ? 'moderate'
      : 'low';

  const riskColors = {
    low: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', bar: '#22c55e' },
    moderate: { bg: '#fffbeb', border: '#fde68a', text: '#a16207', bar: '#f59e0b' },
    high: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', bar: '#f97316' },
    critical: { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', bar: '#ef4444' },
  };

  const colors = riskColors[overallRisk];

  return (
    <div
      className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[var(--shadow-premium)] transition-all relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
      
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-indigo-500" />
        AI Risk Insight
        <Tag
          color={overallRisk === 'low' ? 'success' : overallRisk === 'moderate' ? 'warning' : 'error'}
          style={{ marginLeft: 'auto', borderRadius: 6, fontWeight: 600, border: 'none' }}
        >
          {overallRisk.toUpperCase()}
        </Tag>
      </h3>

      {/* Risk progress bar (Animated) */}
      <div style={{ marginBottom: 16 }}>
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Confidence / Probability</span>
          <span className="text-xs font-mono font-bold text-slate-700">
            {overallRisk === 'low' ? '20%' : overallRisk === 'moderate' ? '50%' : overallRisk === 'high' ? '75%' : '95%'}
          </span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: '#f1f5f9',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: overallRisk === 'low' ? '20%' : overallRisk === 'moderate' ? '50%' : overallRisk === 'high' ? '75%' : '95%' }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              height: '100%',
              borderRadius: 3,
              background: `linear-gradient(90deg, #6366F1, ${colors.bar})`,
            }}
          />
        </div>
      </div>

      {/* Prediction message */}
      <div
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Clock className="w-4 h-4" style={{ color: colors.text }} />
          <Text strong style={{ fontSize: 13, color: colors.text }}>
            {overallRisk === 'low'
              ? 'Patient vitals are stable'
              : minHours
              ? `Risk may increase in ~${minHours} hours`
              : 'Elevated risk based on current trends'}
          </Text>
        </div>
        <Text style={{ fontSize: 12, color: colors.text, opacity: 0.8 }}>
          {riskFactors.length > 0
            ? riskFactors.join('. ') + '.'
            : 'All monitored vital signs within normal parameters.'}
        </Text>
      </div>

      {/* Individual vital trends */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Heart Rate', analysis: hrAnalysis, value: `${patient.vitals.heartRate.value} BPM` },
          { label: 'Temperature', analysis: tempAnalysis, value: `${patient.vitals.temperature.value}°F` },
          { label: 'Respiration', analysis: rrAnalysis, value: `${patient.vitals.respiration.value}/min` },
          { label: 'SpO2', analysis: spo2Analysis, value: `${patient.vitals.spO2.value}%` },
        ].map(({ label, analysis, value }) => (
          <Tooltip key={label} title={`Slope: ${analysis.slope.toFixed(3)} per hour`}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: 8,
                background: '#f8fafc',
                fontSize: 12,
              }}
            >
              <Text style={{ fontSize: 12, color: '#64748b' }}>{label}</Text>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: 500 }}>{value}</Text>
                {analysis.direction === 'rising' ? (
                  <TrendingUp className="w-3 h-3 text-red-500" />
                ) : analysis.direction === 'falling' ? (
                  <TrendingDown className="w-3 h-3 text-blue-500" />
                ) : (
                  <span style={{ width: 12, height: 2, background: '#94a3b8', borderRadius: 1, display: 'inline-block' }} />
                )}
              </span>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
