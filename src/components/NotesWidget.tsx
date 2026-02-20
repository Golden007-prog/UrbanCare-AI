import React from 'react';
import { Sparkles, FileText, Activity, BrainCircuit } from 'lucide-react';
import { useStore } from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import clsx from 'clsx';

export const NotesWidget = () => {
  const { selectedPatientId, patients, updatePatientNotes } = useStore();
  const patient = patients.find((p) => p.id === selectedPatientId);
  const [activeTab, setActiveTab] = React.useState<'soap' | 'hpi' | 'assessment' | 'plan'>('soap');
  const [isGenerating, setIsGenerating] = React.useState(false);

  if (!patient) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        Generate a clinical SOAP note for a patient with the following data:
        Name: ${patient.name}
        Age: ${patient.age}
        Gender: ${patient.gender}
        Condition: ${patient.condition}
        Vitals:
        - HR: ${patient.vitals.heartRate.value}
        - BP: ${patient.vitals.bloodPressure.sys}/${patient.vitals.bloodPressure.dia}
        - SpO2: ${patient.vitals.spO2.value}
        - Temp: ${patient.vitals.temperature.value}
        - Resp: ${patient.vitals.respiration.value}
        
        Format the response as a structured SOAP note.
        Return ONLY the content for the ${activeTab.toUpperCase()} section.
        Keep it concise and professional.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-latest",
        contents: prompt,
      });

      const text = response.text;
      updatePatientNotes(patient.id, { [activeTab]: text });
    } catch (error) {
      console.error("Error generating notes:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-2 text-indigo-900">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-sm">AI-Assisted Notes</h3>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-medium px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
            Gemini 2.5 Flash
          </span>
        </div>
      </div>

      <div className="flex border-b border-slate-100 px-4 pt-2 gap-6">
        {['soap', 'hpi', 'assessment', 'plan'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={clsx(
              "pb-3 text-xs font-medium uppercase tracking-wider transition-all border-b-2",
              activeTab === tab
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-slate-50/30">
        {patient.notes[activeTab] ? (
          <div className="prose prose-sm prose-slate max-w-none">
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
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
            >
              Regenerate
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
              Save to Record
            </button>
         </div>
      )}
    </div>
  );
};
