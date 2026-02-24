import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Mic, MicOff, X, History, Send, Volume2, Square,
  Brain, Loader2, AudioLines, Sparkles,
} from 'lucide-react';
import { aiPost } from '../lib/aiClient';
import { speakText, stopSpeech } from '../lib/speech';
import { useStore } from '../store/useStore';
import { VoiceChatHistory } from './VoiceChatHistory';
import '../styles/voiceAssistant.css';

// ── Types ─────────────────────────────────────────────────

type PipelineState = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking';

interface ClinicalReasoning {
  summary: string;
  differential: string[];
  recommended_action: string;
  risk_level: string;
  confidence: number;
  source: string;
  mock?: boolean;
}

interface VoiceMessage {
  id: string;
  role: 'doctor' | 'assistant';
  text: string;
  reasoning?: ClinicalReasoning;
  timestamp: string;
  processingTimeMs?: number;
}

// ── Component ─────────────────────────────────────────────

export function VoiceAssistantPanel() {
  const { selectedPatientId, patients, alerts, settings } = useStore();
  const patient = patients.find(p => p.id === selectedPatientId);
  const patientAlerts = alerts.filter(a => a.patientId === patient?.id);

  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pipelineState, setPipelineState] = useState<PipelineState>('idle');
  const [messages, setMessages] = useState<VoiceMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Voice Clinical Copilot ready. Click the microphone and speak your question — I\'ll analyze it with full patient context using TxGemma.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const previousPatientId = useRef<string | null>(selectedPatientId);

  // Stop speech when closing panel
  const handleClose = () => {
    stopSpeech();
    setPipelineState('idle');
    setIsOpen(false);
  };

  // Reset when patient changes
  useEffect(() => {
    if (selectedPatientId !== previousPatientId.current) {
      previousPatientId.current = selectedPatientId;
      const p = patients.find(x => x.id === selectedPatientId);
      setMessages([{
        id: `switch-${Date.now()}`,
        role: 'assistant',
        text: p
          ? `Switched to **${p.name}** (${p.age}y, ${p.gender}). Patient context loaded. Ask me anything.`
          : 'No patient selected.',
        timestamp: new Date().toISOString(),
      }]);
      setError(null);
    }
  }, [selectedPatientId, patients]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pipelineState]);

  // Build patient context for the backend
  const buildContext = useCallback(() => {
    if (!patient) return {};
    return {
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
      activeAlerts: patientAlerts.map(a => `${a.alertType}: ${a.message}`).join('; '),
      notesSummary: [patient.notes.soap, patient.notes.assessment, patient.notes.plan]
        .filter(Boolean).join(' | '),
    };
  }, [patient, patientAlerts]);

  // ── Voice Recording ─────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });

        setPipelineState('transcribing');

        try {
          const buffer = await blob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          await processAudioMessage(base64, mediaRecorder.mimeType);
        } catch (err: any) {
          console.error('Voice pipeline error:', err);
          setError(err.message || 'Voice processing failed');
          setPipelineState('idle');
        }
      };

      mediaRecorder.start();
      setPipelineState('recording');
    } catch (err: any) {
      console.error('Mic access error:', err);
      setError('Microphone access denied. Please allow microphone access and try again.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleMicClick = () => {
    if (pipelineState === 'recording') {
      stopRecording();
    } else if (pipelineState === 'idle') {
      startRecording();
    }
  };

  // ── Process Audio ───────────────────────────────────────

  const processAudioMessage = async (audioBase64: string, mimeType: string) => {
    if (!patient) {
      setError('No patient selected');
      setPipelineState('idle');
      return;
    }

    setPipelineState('thinking');

    try {
      const result = await aiPost<{
        transcript: string;
        clinicalReasoning: ClinicalReasoning | null;
        spokenReply: string;
        source: string;
        processingTimeMs: number;
      }>('/api/voice/message', {
        audioBase64,
        patientId: patient.id,
        mimeType,
        patientContext: buildContext(),
      }, settings.offlineMode);

      const data = result.data;

      // Add doctor message
      if (data.transcript) {
        setMessages(prev => [...prev, {
          id: `doc-${Date.now()}`,
          role: 'doctor',
          text: data.transcript,
          timestamp: new Date().toISOString(),
        }]);
      }

      // Add assistant response
      setPipelineState('speaking');
      setMessages(prev => [...prev, {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        text: data.spokenReply,
        reasoning: data.clinicalReasoning || undefined,
        timestamp: new Date().toISOString(),
        processingTimeMs: data.processingTimeMs,
      }]);

      // TTS via Web Speech API
      if (data.spokenReply) {
        speakText(data.spokenReply, () => setPipelineState('idle'));
      } else {
        setTimeout(() => setPipelineState('idle'), 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Voice pipeline failed');
      setPipelineState('idle');
    }
  };

  // ── Process Text ────────────────────────────────────────

  const handleTextSubmit = async () => {
    if (!textInput.trim() || !patient) return;

    const msg = textInput.trim();
    setTextInput('');
    setError(null);

    setMessages(prev => [...prev, {
      id: `doc-txt-${Date.now()}`,
      role: 'doctor',
      text: msg,
      timestamp: new Date().toISOString(),
    }]);

    setPipelineState('thinking');

    try {
      const result = await aiPost<{
        transcript: string;
        clinicalReasoning: ClinicalReasoning | null;
        spokenReply: string;
        source: string;
        processingTimeMs: number;
      }>('/api/voice/message', {
        message: msg,
        patientId: patient.id,
        patientContext: buildContext(),
      }, settings.offlineMode);

      const data = result.data;

      setPipelineState('speaking');
      setMessages(prev => [...prev, {
        id: `asst-txt-${Date.now()}`,
        role: 'assistant',
        text: data.spokenReply,
        reasoning: data.clinicalReasoning || undefined,
        timestamp: new Date().toISOString(),
        processingTimeMs: data.processingTimeMs,
      }]);

      // TTS
      if (data.spokenReply) {
        speakText(data.spokenReply, () => setPipelineState('idle'));
      } else {
        setTimeout(() => setPipelineState('idle'), 500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process message');
      setPipelineState('idle');
    }
  };

  // ── Status Labels ───────────────────────────────────────

  const statusLabel: Record<PipelineState, string> = {
    idle: patient ? `Context: ${patient.name}` : 'No patient selected',
    recording: 'Listening... speak now',
    transcribing: 'Transcribing audio...',
    thinking: 'Analyzing with TxGemma...',
    speaking: 'Speaking response...',
  };

  const micLabel: Record<PipelineState, string> = {
    idle: 'Tap to speak',
    recording: 'Tap to stop',
    transcribing: 'Processing...',
    thinking: 'Analyzing...',
    speaking: 'Playing...',
  };

  // ── Render ──────────────────────────────────────────────

  if (!isOpen) {
    return (
      <button className="voice-open-btn" onClick={() => setIsOpen(true)} title="Voice Clinical Copilot">
        <AudioLines size={24} />
      </button>
    );
  }

  return (
    <div className="voice-panel">
      {/* Header */}
      <div className="voice-header">
        <div className="voice-header-icon">
          <Brain size={20} />
        </div>
        <div className="voice-header-info">
          <div className="voice-header-title">Voice Clinical Copilot</div>
          <div className="voice-header-subtitle">
            TxGemma + Gemini • {patient?.name || 'No patient'}
          </div>
        </div>
        <div className="voice-header-actions">
          <button
            className={`voice-header-btn ${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
            title="Chat history"
          >
            <History size={16} />
          </button>
          <button className="voice-header-btn" onClick={handleClose} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className={`voice-status-bar ${pipelineState}`}>
        <span className="voice-status-dot" />
        <span style={{ fontWeight: 500 }}>{statusLabel[pipelineState]}</span>
        {pipelineState !== 'idle' && (
          <Loader2 size={14} style={{ marginLeft: 'auto', animation: 'spin 1s linear infinite' }} />
        )}
      </div>

      {/* Chat History Overlay */}
      {showHistory && patient && (
        <VoiceChatHistory
          patientId={patient.id}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Chat Body */}
      <div className="voice-body">
        {messages.map((msg) => (
          <div key={msg.id} className={`voice-msg ${msg.role}`}>
            <div className={`voice-msg-avatar ${msg.role}`}>
              {msg.role === 'doctor' ? '🩺' : '🤖'}
            </div>
            <div className="voice-msg-content">
              <div className={`voice-msg-bubble ${msg.role}`}>
                {msg.text}
              </div>

              {/* Clinical Reasoning Card */}
              {msg.reasoning && !msg.reasoning.mock && (
                <div className="voice-reasoning-card">
                  <div className="voice-reasoning-header">
                    <Sparkles size={12} />
                    Clinical Reasoning
                    {msg.reasoning.source && (
                      <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 'auto' }}>
                        via {msg.reasoning.source}
                      </span>
                    )}
                  </div>

                  {msg.reasoning.summary && (
                    <div className="voice-reasoning-section">
                      <div className="voice-reasoning-label">Summary</div>
                      <div className="voice-reasoning-text">{msg.reasoning.summary}</div>
                    </div>
                  )}

                  {msg.reasoning.differential && msg.reasoning.differential.length > 0 && (
                    <div className="voice-reasoning-section">
                      <div className="voice-reasoning-label">Differential</div>
                      <ul className="voice-reasoning-list">
                        {msg.reasoning.differential.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {msg.reasoning.recommended_action && (
                    <div className="voice-reasoning-section">
                      <div className="voice-reasoning-label">Recommended Action</div>
                      <div className="voice-reasoning-text">{msg.reasoning.recommended_action}</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                    {msg.reasoning.risk_level && (
                      <span className={`voice-risk-badge ${msg.reasoning.risk_level}`}>
                        Risk: {msg.reasoning.risk_level}
                      </span>
                    )}
                    {msg.reasoning.confidence > 0 && (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>
                        Confidence: {(msg.reasoning.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {msg.processingTimeMs && (
                      <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>
                        {(msg.processingTimeMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Replay button for assistant messages */}
              {msg.role === 'assistant' && msg.id !== 'welcome' && (
                <button
                  onClick={() => speakText(msg.text)}
                  style={{
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10,
                    color: '#8b5cf6',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: 4,
                  }}
                >
                  <Volume2 size={11} /> Replay
                </button>
              )}

              <span className="voice-msg-time">
                {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}

        {/* Thinking Indicator */}
        {(pipelineState === 'transcribing' || pipelineState === 'thinking') && (
          <div className="voice-thinking">
            <div className="voice-msg-avatar assistant">🤖</div>
            <div className="voice-thinking-dots">
              <div className="voice-thinking-dot" />
              <div className="voice-thinking-dot" />
              <div className="voice-thinking-dot" />
              <span style={{ fontSize: 11, color: '#8b5cf6', marginLeft: 6 }}>
                {pipelineState === 'transcribing' ? 'Transcribing...' : 'Analyzing with TxGemma...'}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '8px 12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            fontSize: 12,
            color: '#dc2626',
          }}>
            ⚠️ {error}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Footer — Mic + Text Input */}
      <div className="voice-footer">
        {/* Waveform during recording */}
        {pipelineState === 'recording' && (
          <div className="voice-waveform recording">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="voice-waveform-bar" />
            ))}
          </div>
        )}

        {/* Mic Button */}
        <button
          className={`voice-mic-main ${pipelineState}`}
          onClick={handleMicClick}
          disabled={!patient || (pipelineState !== 'idle' && pipelineState !== 'recording')}
        >
          {pipelineState === 'recording' ? (
            <MicOff size={28} />
          ) : pipelineState === 'transcribing' || pipelineState === 'thinking' ? (
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
          ) : pipelineState === 'speaking' ? (
            <div onClick={(e) => {
              e.stopPropagation();
              stopSpeech();
              setPipelineState('idle');
            }}>
              <Square size={24} fill="currentColor" />
            </div>
          ) : (
            <Mic size={28} />
          )}
        </button>
        <span className="voice-mic-label">
          {pipelineState === 'speaking' ? 'Tap to stop' : micLabel[pipelineState]}
        </span>

        {/* Text input fallback */}
        <div className="voice-input-row">
          <input
            className="voice-text-input"
            placeholder={patient ? 'Or type your question...' : 'Select a patient first'}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextSubmit();
              }
            }}
            disabled={!patient || pipelineState !== 'idle'}
          />
          <button
            className="voice-send-btn"
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || !patient || pipelineState !== 'idle'}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
