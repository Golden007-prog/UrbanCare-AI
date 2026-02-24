import React from 'react';
import { Sparkles, BrainCircuit, FileText, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../store/useStore';
import { aiPost } from '../lib/aiClient';
import { parseSoapToReport } from '../utils/soapParser';
import { ClinicalReportLayout } from './clinical-report/ClinicalReportLayout';

/**
 * ClinicalReportCard — Center-focus clinical report container.
 * Shows a CTA when empty, structured SOAP report when generated.
 */
export const ClinicalReportCard = () => {
  const { selectedPatientId, patients, updatePatientNotes, settings } = useStore();
  const patient = patients.find((p) => p.id === selectedPatientId);
  const [isGenerating, setIsGenerating] = React.useState(false);

  if (!patient) return null;

  const hasNotes = patient.notes.soap || patient.notes.assessment || patient.notes.plan;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await aiPost('/api/generate-soap', {
        patientName: patient.name,
        age: patient.age,
        gender: patient.gender,
        condition: patient.condition,
        vitals: {
          heartRate: patient.vitals.heartRate.value,
          spO2: patient.vitals.spO2.value,
          temperature: patient.vitals.temperature.value,
          respiration: patient.vitals.respiration.value,
          bloodPressure: {
            sys: patient.vitals.bloodPressure.sys,
            dia: patient.vitals.bloodPressure.dia,
          },
        },
        risk: patient.riskLevel,
        history: patient.notes.hpi || '',
        notes: patient.notes.soap || '',
      }, settings.offlineMode);

      const soapData = result.data;
      updatePatientNotes(patient.id, {
        soap: `## SUBJECTIVE\n${soapData.subjective}\n\n## OBJECTIVE\n${soapData.objective}\n\n## ASSESSMENT\n${soapData.assessment}\n\n## PLAN\n${soapData.plan}`,
        hpi: soapData.subjective,
        assessment: soapData.assessment,
        plan: soapData.plan,
      });
    } catch (error) {
      console.error('Error generating notes:', error);
      updatePatientNotes(patient.id, {
        soap: 'Failed to generate notes. Ensure the backend server is running on port 5000.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const report = hasNotes
    ? parseSoapToReport(patient.notes, {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        condition: patient.condition,
        riskLevel: patient.riskLevel,
      })
    : null;

  return (
    <div className="flex flex-col overflow-hidden transition-all">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-200">
            <Sparkles size={14} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">AI Clinical Report</h3>
            <p className="text-[10px] text-slate-400">Powered by TxGemma</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasNotes && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Zap size={11} />
              {isGenerating ? 'Generating...' : 'Regenerate'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {report ? (
        <ClinicalReportLayout
          report={report}
          patientAge={patient.age}
          patientGender={patient.gender}
        />
      ) : (
        /* ── Empty State: Generate CTA ── */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
        >
          <div className="py-16 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center mb-5 border border-indigo-100/50">
              <BrainCircuit className="w-8 h-8 text-indigo-300" />
            </div>
            <h4 className="text-base font-bold text-slate-800 mb-1.5">Generate Clinical Report</h4>
            <p className="text-sm text-slate-400 max-w-xs mb-6 leading-relaxed">
              AI-powered SOAP notes, risk assessment, and treatment recommendations based on patient data.
            </p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/50 hover:-translate-y-0.5"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Clinical Report
                </>
              )}
            </button>
            <div className="flex items-center gap-4 mt-6 text-[10px] text-slate-300">
              <span className="flex items-center gap-1"><FileText size={10} /> SOAP Notes</span>
              <span>•</span>
              <span>Risk Prediction</span>
              <span>•</span>
              <span>Recommendations</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
