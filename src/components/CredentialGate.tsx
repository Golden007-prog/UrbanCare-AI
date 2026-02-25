import React, { useState } from 'react';
import { Shield, Key, Sparkles, ExternalLink, ChevronRight, CheckCircle2, AlertTriangle, Loader2, Lock } from 'lucide-react';
import { useCredentials } from '../context/CredentialContext';
import './CredentialGate.css';

// ──────────────────────────────────────────────────────────
// CredentialGate — Startup Onboarding Page
// ──────────────────────────────────────────────────────────
// Shown when user is authenticated but hasn't provided
// API credentials yet. Step-by-step guided experience.

interface Step {
  number: number;
  title: string;
  description: string;
  link?: { url: string; label: string };
  inputKey?: 'hfToken' | 'geminiKey';
  inputPlaceholder?: string;
  inputHint?: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    title: 'Get a HuggingFace Token',
    description: 'UrbanCare AI uses MedGemma and TxGemma models hosted on HuggingFace for medical image analysis, clinical notes, and diagnostics.',
    link: {
      url: 'https://huggingface.co/settings/tokens',
      label: 'Create token on HuggingFace →',
    },
    inputKey: 'hfToken',
    inputPlaceholder: 'hf_xxxxxxxxxxxxxxxxxxxx',
    inputHint: 'Paste your HuggingFace access token (starts with hf_)',
  },
  {
    number: 2,
    title: 'Get a Gemini API Key',
    description: 'The AI Clinical Copilot, SOAP note generator, and chat assistant are powered by Google Gemini. A free API key from Google AI Studio is all you need.',
    link: {
      url: 'https://aistudio.google.com/apikey',
      label: 'Get API key from Google AI Studio →',
    },
    inputKey: 'geminiKey',
    inputPlaceholder: 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx',
    inputHint: 'Paste your Gemini API key (starts with AIza)',
  },
  {
    number: 3,
    title: 'Launch UrbanCare AI',
    description: 'Your credentials will be securely stored in the backend session — never saved in the browser permanently, never exposed in the frontend code. They are cleared when you log out.',
  },
];

export default function CredentialGate() {
  const { setCredentials } = useCredentials();
  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState({ hfToken: '', geminiKey: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValues, setShowValues] = useState({ hfToken: false, geminiKey: false });

  const canProceedStep = (stepIndex: number) => {
    const step = STEPS[stepIndex];
    if (!step.inputKey) return true;
    return values[step.inputKey].trim().length > 6;
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeStep < STEPS.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!values.hfToken.trim() || !values.geminiKey.trim()) {
      setError('Both credentials are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await setCredentials(values.hfToken.trim(), values.geminiKey.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to store credentials. Is the backend running?');
      setSubmitting(false);
    }
  };

  return (
    <div className="cg-backdrop">
      <div className="cg-container">
        {/* ── Header ── */}
        <div className="cg-header">
          <div className="cg-logo-row">
            <div className="cg-logo-icon">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="cg-title">UrbanCare AI</h1>
              <p className="cg-subtitle">Secure Credential Setup</p>
            </div>
          </div>
          <p className="cg-intro">
            Welcome! Before you can use AI-powered clinical features, please provide your API credentials.
            This is a <strong>one-time setup per session</strong> — your keys are never stored permanently.
          </p>
        </div>

        {/* ── Security Badge ── */}
        <div className="cg-security-badge">
          <Lock size={14} />
          <span>End-to-end secure — keys are stored in encrypted backend memory only</span>
        </div>

        {/* ── Steps ── */}
        <div className="cg-steps">
          {STEPS.map((step, idx) => {
            const isActive = idx === activeStep;
            const isCompleted = idx < activeStep || (step.inputKey && values[step.inputKey].trim().length > 6);
            const isLast = idx === STEPS.length - 1;

            return (
              <div
                key={step.number}
                className={`cg-step ${isActive ? 'cg-step--active' : ''} ${isCompleted && !isActive ? 'cg-step--completed' : ''}`}
                onClick={() => idx <= activeStep && setActiveStep(idx)}
              >
                {/* Step number indicator */}
                <div className="cg-step-indicator">
                  <div className={`cg-step-circle ${isActive ? 'cg-step-circle--active' : ''} ${isCompleted && !isActive ? 'cg-step-circle--done' : ''}`}>
                    {isCompleted && !isActive ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>
                  {!isLast && <div className={`cg-step-line ${isCompleted ? 'cg-step-line--done' : ''}`} />}
                </div>

                {/* Step content */}
                <div className="cg-step-body">
                  <h3 className="cg-step-title">{step.title}</h3>

                  {isActive && (
                    <div className="cg-step-content">
                      <p className="cg-step-desc">{step.description}</p>

                      {step.link && (
                        <a
                          href={step.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cg-link"
                        >
                          <ExternalLink size={14} />
                          {step.link.label}
                        </a>
                      )}

                      {step.inputKey && (
                        <div className="cg-input-group">
                          <label className="cg-input-label">
                            <Key size={14} />
                            {step.inputHint}
                          </label>
                          <div className="cg-input-wrapper">
                            <input
                              type={showValues[step.inputKey] ? 'text' : 'password'}
                              value={values[step.inputKey]}
                              onChange={(e) =>
                                setValues({ ...values, [step.inputKey!]: e.target.value })
                              }
                              placeholder={step.inputPlaceholder}
                              className="cg-input"
                              autoComplete="off"
                              spellCheck={false}
                            />
                            <button
                              type="button"
                              className="cg-toggle-vis"
                              onClick={() =>
                                setShowValues({ ...showValues, [step.inputKey!]: !showValues[step.inputKey!] })
                              }
                            >
                              {showValues[step.inputKey] ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Next / Submit button */}
                      {!isLast ? (
                        <button
                          className="cg-btn cg-btn--next"
                          onClick={handleNext}
                          disabled={!canProceedStep(idx)}
                        >
                          Continue
                          <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button
                          className="cg-btn cg-btn--launch"
                          onClick={handleSubmit}
                          disabled={submitting || !values.hfToken.trim() || !values.geminiKey.trim()}
                        >
                          {submitting ? (
                            <>
                              <Loader2 size={16} className="cg-spin" />
                              Connecting…
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} />
                              Launch UrbanCare AI
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="cg-error">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="cg-footer">
          <p>
            <strong>Why do I need to provide keys?</strong> UrbanCare AI is a{' '}
            <em>GitHub Pages</em> static deployment — no server-side secrets can be pre-loaded.
            Your credentials are forwarded to the secure backend, used only for this session,
            and never written to disk or exposed in the frontend.
          </p>
        </div>
      </div>
    </div>
  );
}
