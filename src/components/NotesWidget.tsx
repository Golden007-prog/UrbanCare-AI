import React from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';
import { useStore } from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import { aiPost } from '../lib/aiClient';
import clsx from 'clsx';

// Map UI tab names to backend section names
const TAB_TO_SECTION: Record<string, string> = {
  soap: 'soap',
  hpi: 'hpi',
  assessment: 'assessment',
  plan: 'plan',
};

// EHR-style inline CSS for markdown rendering
const ehrStyles = `
  .ehr-note h2 {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #334155;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 0.4rem;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }
  .ehr-note h2:first-child {
    margin-top: 0;
  }
  .ehr-note h3 {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: #475569;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  .ehr-note p {
    font-size: 0.82rem;
    line-height: 1.6;
    color: #334155;
    margin-bottom: 0.5rem;
  }
  .ehr-note ul {
    list-style: none;
    padding-left: 0;
    margin: 0.25rem 0;
  }
  .ehr-note ul ul {
    padding-left: 1rem;
  }
  .ehr-note li {
    font-size: 0.82rem;
    line-height: 1.7;
    color: #334155;
    position: relative;
    padding-left: 0.75rem;
  }
  .ehr-note li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55em;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #94a3b8;
  }
  .ehr-note ul ul li::before {
    background: #cbd5e1;
    width: 3px;
    height: 3px;
  }
  .ehr-note strong {
    font-weight: 600;
    color: #1e293b;
  }
  .ehr-note table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5rem 0 1rem;
    font-size: 0.78rem;
  }
  .ehr-note thead th {
    background: #f1f5f9;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.7rem;
    color: #475569;
    padding: 0.5rem 0.75rem;
    text-align: left;
    border-bottom: 2px solid #e2e8f0;
  }
  .ehr-note tbody td {
    padding: 0.45rem 0.75rem;
    color: #334155;
    border-bottom: 1px solid #f1f5f9;
  }
  .ehr-note tbody tr:hover {
    background: #f8fafc;
  }
  .ehr-note hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 1rem 0;
  }
  .ehr-note blockquote {
    border-left: 3px solid #cbd5e1;
    padding-left: 0.75rem;
    margin: 0.5rem 0;
    color: #475569;
    font-style: italic;
    font-size: 0.8rem;
  }
`;

export const NotesWidget = () => {
  const { selectedPatientId, patients, updatePatientNotes, settings } = useStore();
  const patient = patients.find((p) => p.id === selectedPatientId);
  const [activeTab, setActiveTab] = React.useState<'soap' | 'hpi' | 'assessment' | 'plan'>('soap');
  const [isGenerating, setIsGenerating] = React.useState(false);

  if (!patient) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const section = TAB_TO_SECTION[activeTab];

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
        section: section === 'soap' ? undefined : section,
      }, settings.offlineMode);

      const soapData = result.data;

      if (section === 'soap') {
        // Full SOAP — populate all four tabs
        updatePatientNotes(patient.id, {
          soap: `## SUBJECTIVE\n${soapData.subjective}\n\n## OBJECTIVE\n${soapData.objective}\n\n## ASSESSMENT\n${soapData.assessment}\n\n## PLAN\n${soapData.plan}`,
          hpi: soapData.subjective,
          assessment: soapData.assessment,
          plan: soapData.plan,
        });
      } else {
        // Single section
        updatePatientNotes(patient.id, {
          [activeTab]: soapData.content || soapData[activeTab] || 'No content generated.',
        });
      }
    } catch (error) {
      console.error('Error generating notes:', error);
      updatePatientNotes(patient.id, {
        [activeTab]: 'Failed to generate notes. Ensure the backend server is running on port 5000.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[var(--shadow-premium)] flex flex-col h-full overflow-hidden transition-all">
      <style>{ehrStyles}</style>
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-2 text-indigo-900">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-sm">AI-Assisted Notes</h3>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-medium px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
            TxGemma
          </span>
        </div>
      </div>

      <div className="flex px-4 pt-4 gap-2 mb-2 bg-slate-50/30">
        {['soap', 'hpi', 'assessment', 'plan'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={clsx(
              "px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all",
              activeTab === tab
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-white">
        {patient.notes[activeTab] ? (
          <div className="ehr-note max-w-none">
            <ReactMarkdown>{patient.notes[activeTab]}</ReactMarkdown>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
            <BrainCircuit className="w-12 h-12 opacity-20" />
            <p className="text-sm">Select a section and generate AI notes.</p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate {activeTab.toUpperCase()}
                </>
              )}
            </button>
          </div>
        )}
      </div>
      
      {patient.notes[activeTab] && (
         <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Regenerate'}
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
              Save to Record
            </button>
         </div>
      )}
    </div>
  );
};
