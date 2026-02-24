import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, X, Send, Mic, MicOff, MessageSquare,
  Radio, StopCircle, Volume2, Sparkles,
} from 'lucide-react';
import { Select, Tooltip } from 'antd';
import { ChatMessage } from './chat/ChatMessage';
import { QuickActionChips } from './chat/QuickActionChips';
import { useAIConsult } from '../hooks/useAIConsult';
import { useStore, AIConsultMode } from '../store/useStore';
import '../styles/copilot.css';

/**
 * AIConsultPanel — Multilingual AI Clinical Copilot
 *
 * Features:
 * - Voice Consultation Mode (continuous listening + auto-send)
 * - Quick mic tap (single phrase capture)
 * - Live transcript preview during recording
 * - Animated waveform visualization
 * - Patient context injection
 * - Multilingual support
 * - Quick action chips
 * - Structured clinical output cards
 */
export function AIConsultPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [isConsultMode, setIsConsultMode] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const consultModeRef = useRef(false); // non-reactive ref for callbacks

  const {
    messages,
    isLoading,
    language,
    setLanguage,
    sendMessage,
    executeAction,
    patient,
    supportedLanguages,
  } = useAIConsult();

  const { aiConsultMode, setAiConsultMode } = useStore();

  const AI_MODE_OPTIONS = [
    { value: 'clinical-copilot', label: '🩺 Clinical Copilot' },
    { value: 'senior-consultant', label: '👨‍⚕️ Senior Consultant' },
    { value: 'risk-escalation', label: '🚨 Risk Escalation' },
    { value: 'discharge-review', label: '📋 Discharge Review' },
  ];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  // Keep consultModeRef in sync
  useEffect(() => {
    consultModeRef.current = isConsultMode;
  }, [isConsultMode]);

  // Send handler
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage(text);
    setInput('');
  }, [input, isLoading, sendMessage]);

  // ─── Speech Recognition Setup ──────────────────────────

  const speechLangMap: Record<string, string> = {
    en: 'en-US',
    hi: 'hi-IN',
    bn: 'bn-IN',
    ta: 'ta-IN',
    es: 'es-ES',
    ar: 'ar-SA',
  };

  const getSpeechRecognition = () => {
    // @ts-ignore
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  };

  // ─── Quick Mic (single phrase → fills input) ──────────

  const toggleQuickMic = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setMicError('Speech recognition not supported. Use Chrome or Edge.');
      setTimeout(() => setMicError(null), 3000);
      return;
    }

    // If already recording, stop
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setLiveTranscript('');
      return;
    }

    setMicError(null);
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = speechLangMap[language] || 'en-US';
    recognition.interimResults = true;  // Show live transcript
    recognition.continuous = false;     // Single phrase
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setInput((prev) => (prev ? prev + ' ' + final : final));
        setLiveTranscript('');
      } else {
        setLiveTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      if (event.error === 'not-allowed') {
        setMicError('Microphone access denied. Please allow mic permission.');
      } else if (event.error === 'no-speech') {
        setMicError('No speech detected. Try again.');
      } else {
        setMicError(`Voice error: ${event.error}`);
      }
      setIsRecording(false);
      setLiveTranscript('');
      setTimeout(() => setMicError(null), 3000);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setLiveTranscript('');
    };

    try {
      recognition.start();
      setIsRecording(true);
    } catch (err) {
      setMicError('Failed to start mic. Try again.');
      setTimeout(() => setMicError(null), 3000);
    }
  }, [isRecording, language]);

  // ─── Voice Consultation Mode (continuous → auto-send) ─

  const startConsultMode = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setMicError('Speech recognition not supported. Use Chrome or Edge.');
      setTimeout(() => setMicError(null), 3000);
      return;
    }

    setMicError(null);
    setIsConsultMode(true);
    consultModeRef.current = true;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = speechLangMap[language] || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;  // Keep listening
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        // Auto-send each complete phrase to the AI
        setLiveTranscript('');
        sendMessage(finalTranscript.trim());
      } else {
        setLiveTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Consult mode error:', event.error);
      if (event.error === 'not-allowed') {
        setMicError('Microphone access denied.');
        setIsConsultMode(false);
        consultModeRef.current = false;
      }
      // For other errors (no-speech, network), let it restart
    };

    recognition.onend = () => {
      // Auto-restart if still in consult mode
      if (consultModeRef.current) {
        try {
          setTimeout(() => {
            if (consultModeRef.current && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 300);
        } catch {}
      } else {
        setIsRecording(false);
        setLiveTranscript('');
      }
    };

    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      setMicError('Failed to start consultation mode.');
      setIsConsultMode(false);
      consultModeRef.current = false;
    }
  }, [language, sendMessage]);

  const stopConsultMode = useCallback(() => {
    setIsConsultMode(false);
    consultModeRef.current = false;
    setIsRecording(false);
    setLiveTranscript('');
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  // ─── Render ──────────────────────────────────────────

  return (
    <>
      {/* Floating open button */}
      {!isOpen && (
        <button
          className="copilot-open-btn"
          onClick={() => setIsOpen(true)}
          title="Open AI Copilot"
        >
          <Sparkles style={{ width: 22, height: 22 }} />
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="copilot-panel">
          {/* Header */}
          <div className="copilot-header">
            <div className="copilot-header-avatar">
              <Bot style={{ width: 20, height: 20, color: 'white' }} />
            </div>
            <div className="copilot-header-info">
              <div className="copilot-header-title">UrbanCare AI Copilot</div>
              <div className="copilot-header-badge">
                <span className={`copilot-header-badge-dot ${patient ? '' : 'inactive'}`} />
                {isConsultMode
                  ? '🎙️ Voice Consultation Active'
                  : patient
                    ? `${patient.name} — Context Active`
                    : 'No Patient Selected'}
              </div>
            </div>
            <div className="copilot-header-actions">
              <Select
                className="copilot-lang-select"
                value={aiConsultMode}
                onChange={(v) => setAiConsultMode(v as AIConsultMode)}
                size="small"
                style={{ width: 140 }}
                popupMatchSelectWidth={false}
                options={AI_MODE_OPTIONS}
              />
              <Select
                className="copilot-lang-select"
                value={language}
                onChange={(v) => setLanguage(v as any)}
                size="small"
                style={{ width: 90 }}
                popupMatchSelectWidth={false}
                options={supportedLanguages.map((l) => ({
                  value: l.code,
                  label: `${l.flag} ${l.label}`,
                }))}
              />
              <button className="copilot-header-close" onClick={() => {
                if (isConsultMode) stopConsultMode();
                setIsOpen(false);
              }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {/* Voice Consultation Banner */}
          {isConsultMode && (
            <div className="copilot-consult-banner">
              <div className="copilot-consult-wave">
                <span /><span /><span /><span /><span />
              </div>
              <div className="copilot-consult-info">
                <span className="copilot-consult-label">Voice Consultation Active</span>
                <span className="copilot-consult-hint">Speak naturally — AI responds after each sentence</span>
              </div>
              <button className="copilot-consult-stop" onClick={stopConsultMode}>
                <StopCircle style={{ width: 16, height: 16 }} />
                Stop
              </button>
            </div>
          )}

          {/* Live Transcript Preview */}
          {liveTranscript && (
            <div className="copilot-live-transcript">
              <Mic style={{ width: 12, height: 12, color: '#ef4444', flexShrink: 0 }} />
              <span>{liveTranscript}</span>
            </div>
          )}

          {/* Mic Error Toast */}
          {micError && (
            <div className="copilot-mic-error">
              ⚠️ {micError}
            </div>
          )}

          {/* Chat Body */}
          <div className="copilot-body">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} />
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="copilot-typing">
                <div className="copilot-msg-avatar assistant">
                  <Bot style={{ width: 14, height: 14, color: '#6366f1' }} />
                </div>
                <div className="copilot-typing-dots">
                  <span className="copilot-typing-dot" />
                  <span className="copilot-typing-dot" />
                  <span className="copilot-typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer */}
          <div className="copilot-footer">
            {/* Voice Consultation Toggle */}
            <div className="copilot-voice-row">
              {!isConsultMode ? (
                <Tooltip title="Start Voice Consultation — speak naturally, AI auto-responds">
                  <button
                    className="copilot-consult-start-btn"
                    onClick={startConsultMode}
                    disabled={isLoading || !patient}
                  >
                    <Radio style={{ width: 14, height: 14 }} />
                    Voice Consultation
                  </button>
                </Tooltip>
              ) : (
                <button className="copilot-consult-active-btn" onClick={stopConsultMode}>
                  <div className="copilot-consult-active-pulse" />
                  Listening... Tap to stop
                </button>
              )}
            </div>

            {/* Text Input Row */}
            <div className="copilot-input-row">
              <input
                ref={inputRef}
                type="text"
                className="copilot-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={
                  isConsultMode
                    ? 'Voice mode active — or type here...'
                    : patient
                      ? `Ask about ${patient.name}...`
                      : 'Select a patient first...'
                }
                disabled={isLoading}
              />

              {/* Quick mic button */}
              <Tooltip title={isRecording ? 'Stop recording' : 'Hold to speak a phrase'}>
                <button
                  className={`copilot-mic-btn ${isRecording && !isConsultMode ? 'recording' : ''}`}
                  onClick={toggleQuickMic}
                  disabled={isLoading || isConsultMode}
                >
                  {isRecording && !isConsultMode ? (
                    <MicOff style={{ width: 16, height: 16 }} />
                  ) : (
                    <Mic style={{ width: 16, height: 16 }} />
                  )}
                </button>
              </Tooltip>

              {/* Send button */}
              <button
                className="copilot-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                title="Send message"
              >
                <Send style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Quick action chips */}
            <QuickActionChips onAction={executeAction} disabled={isLoading || !patient} />
          </div>
        </div>
      )}
    </>
  );
}
