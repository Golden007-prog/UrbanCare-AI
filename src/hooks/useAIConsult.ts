import { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { aiPost } from '../lib/aiClient';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  structured?: boolean;
  action?: string;
  timestamp: string;
}

export type ActionKey =
  | 'generate-soap'
  | 'explain-vitals'
  | 'risk-reasoning'
  | 'suggest-medication'
  | 'translate-for-patient'
  | 'discharge-summary'
  | 'follow-up-plan';

export interface PatientContext {
  patientId: string;
  name: string;
  age: number;
  gender: string;
  condition: string;
  riskLevel: string;
  vitals: {
    heartRate: number;
    spo2: number;
    temperature: number;
    respiration: number;
    bloodPressure: string;
  };
  activeAlerts: string;
  notesSummary: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

// ──────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────

export function useAIConsult() {
  const { selectedPatientId, patients, alerts, aiConsultMode } = useStore();
  const patient = patients.find((p) => p.id === selectedPatientId);
  const patientAlerts = alerts.filter((a) => a.patientId === patient?.id);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I\'m your **UrbanCare AI Copilot**. I have full context on the selected patient. Ask me anything — clinical reasoning, vitals interpretation, medication guidance, or use the quick actions below. 🩺',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageCode>('en');
  const previousPatientId = useRef<string | null>(selectedPatientId);

  // Reset chat when patient changes
  useEffect(() => {
    if (selectedPatientId !== previousPatientId.current) {
      previousPatientId.current = selectedPatientId;
      const newPatient = patients.find((p) => p.id === selectedPatientId);
      setMessages([
        {
          role: 'assistant',
          content: newPatient
            ? `Patient switched to **${newPatient.name}** (${newPatient.age}y, ${newPatient.gender}). I now have their full clinical context. How can I help?`
            : 'No patient selected. Please select a patient from the sidebar to get started.',
          timestamp: new Date().toISOString(),
        },
      ]);
      setError(null);
    }
  }, [selectedPatientId, patients]);

  // Build patient context from Zustand store
  const buildPatientContext = useCallback((): PatientContext | undefined => {
    if (!patient) return undefined;

    return {
      patientId: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      condition: patient.condition,
      riskLevel: patient.riskLevel,
      vitals: {
        heartRate: patient.vitals.heartRate.value,
        spo2: patient.vitals.spO2.value,
        temperature: patient.vitals.temperature.value,
        respiration: patient.vitals.respiration.value,
        bloodPressure: `${patient.vitals.bloodPressure.sys}/${patient.vitals.bloodPressure.dia} mmHg`,
      },
      activeAlerts:
        patientAlerts.length > 0
          ? patientAlerts.map((a) => `${a.alertType}: ${a.message}`).join('\n')
          : '',
      notesSummary: [patient.notes.soap, patient.notes.assessment, patient.notes.plan]
        .filter(Boolean)
        .join(' | ') || '',
    };
  }, [patient, patientAlerts]);

  // Send a message to the copilot
  const sendMessage = useCallback(
    async (text: string, action?: ActionKey) => {
      if (!text.trim() && !action) return;

      const userMsg: ChatMessage = {
        role: 'user',
        content: action
          ? `🔧 *${action.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}*${text.trim() ? `: ${text}` : ''}`
          : text,
        action: action || undefined,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      try {
        // Build history (last 20 messages, excluding the new one)
        const history = messages.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const result = await aiPost<{
          role: string;
          content: string;
          structured?: boolean;
          language?: string;
          action?: string;
          timestamp: string;
        }>('/api/ai-consult', {
          message: text,
          history,
          patientContext: buildPatientContext(),
          language,
          action: action || undefined,
          mode: aiConsultMode,
        }, false);

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: result.data.content,
          structured: result.data.structured,
          action: result.data.action || undefined,
          timestamp: result.data.timestamp,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to get response. Is the backend running?';
        setError(errorMessage);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ **Error:** ${errorMessage}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, language, buildPatientContext, aiConsultMode]
  );

  // Execute a quick action
  const executeAction = useCallback(
    (actionKey: ActionKey) => {
      sendMessage('', actionKey);
    },
    [sendMessage]
  );

  return {
    messages,
    isLoading,
    error,
    language,
    setLanguage,
    sendMessage,
    executeAction,
    patient,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
