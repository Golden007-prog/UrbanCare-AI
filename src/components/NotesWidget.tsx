import React from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';
import { useStore } from '../store/useStore';
import { aiPost } from '../lib/aiClient';
import { parseSoapToReport } from '../utils/soapParser';
import { ClinicalReportLayout } from './clinical-report/ClinicalReportLayout';

// Map UI tab names to backend section names
const TAB_TO_SECTION: Record<string, string> = {
  soap: 'soap',
  hpi: 'hpi',
  assessment: 'assessment',
  plan: 'plan',
};

export const NotesWidget = () => {
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

      // Full SOAP — populate all four tabs
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

  // Parse SOAP into structured clinical report
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
      {/* Header */}
      <div className="p-4 flex justify-between items-center mb-2">
        <div className="flex items-center gap-2 text-indigo-900">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-sm">AI Clinical Report</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
            TxGemma
          </span>
          {hasNotes && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            >
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[var(--shadow-premium)]">
          <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 gap-3">
            <BrainCircuit className="w-12 h-12 opacity-20" />
            <p className="text-sm">Generate an AI-powered clinical report.</p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Clinical Report
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
