import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Send, X, Scan, Bone, RefreshCw, Volume2, Square } from 'lucide-react';
import { SelectionRect } from './SelectionCanvas';
import { AnalysisCard, AnalysisLoading } from './AnalysisCard';
import { FractureAnalysisCard, FractureAnalysisResult } from './FractureAnalysisCard';
import { useStore } from '../../store/useStore';
import { speakText, stopSpeech } from '../../lib/speech';

// ── Node.js Express endpoint ────────────────────────────────────────
const PIPELINE_URL = 'http://localhost:5001/api/xray/full-pipeline';

// ── Utility: convert a data-URL to a Blob for FormData ──────
function dataURLtoBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Crops the image to the given selection rect (in canvas px coords)
 * using an offscreen <canvas>. Returns a Blob.
 */
function cropImageToBlob(
  imageDataUrl: string,
  sel: SelectionRect,
  canvasWidth: number,
  canvasHeight: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Map canvas‐space selection to the natural image dimensions
      const scaleX = img.naturalWidth / canvasWidth;
      const scaleY = img.naturalHeight / canvasHeight;

      const sx = Math.max(0, sel.x * scaleX);
      const sy = Math.max(0, sel.y * scaleY);
      const sw = Math.min(img.naturalWidth - sx, sel.width * scaleX);
      const sh = Math.min(img.naturalHeight - sy, sel.height * scaleY);

      const offscreen = document.createElement('canvas');
      offscreen.width = sw;
      offscreen.height = sh;
      const ctx = offscreen.getContext('2d')!;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      offscreen.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Crop failed'))),
        'image/png',
      );
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = imageDataUrl;
  });
}

interface AnalysisResult {
  analysis: string;
  reasoning: string;
  findings: string[];
  confidence: 'low' | 'moderate' | 'high';
}

type ResultType = { kind: 'generic'; data: AnalysisResult } | { kind: 'fracture'; data: FractureAnalysisResult };

interface AIRegionPanelProps {
  selection: SelectionRect | null;
  imageDataUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
  onClearSelection: () => void;
  scanType?: string;
}

export const AIRegionPanel: React.FC<AIRegionPanelProps> = ({
  selection,
  imageDataUrl,
  canvasWidth,
  canvasHeight,
  onClearSelection,
  scanType = 'xray',
}) => {
  const [question, setQuestion] = useState(
    'Act as a clinical radiologist. Describe the radiological findings in this X-ray image.',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Analyzing X-ray...');
  const [result, setResult] = useState<ResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── Derived: has a meaningful region been selected? ──
  const hasSelection = !!(selection && selection.width > 5 && selection.height > 5);
  const mode: 'region' | 'full' = hasSelection ? 'region' : 'full';

  const { selectedPatientId, patients } = useStore();
  const patient = patients.find((p) => p.id === selectedPatientId);

  // Stop speech if unmounted
  useEffect(() => {
    return () => stopSpeech();
  }, []);

  // ── Build the image blob to send ──────────────────────
  const getImageBlob = useCallback(async (): Promise<Blob> => {
    if (!imageDataUrl) throw new Error('No image loaded');

    if (hasSelection && selection) {
      // Crop the selected region
      return cropImageToBlob(imageDataUrl, selection, canvasWidth, canvasHeight);
    }
    // Full image
    return dataURLtoBlob(imageDataUrl);
  }, [imageDataUrl, hasSelection, selection, canvasWidth, canvasHeight]);

  // ── Core handler ──────────────────────────────────────
  const handleAnalyzeImage = async (promptOverride?: string, useVoice?: boolean) => {
    if (!imageDataUrl) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    stopSpeech();
    setIsSpeaking(false);

    try {
      // 1. Build the prompt
      let prompt = promptOverride || question.trim();
      if (!prompt) {
        prompt = hasSelection
          ? 'Analyze the selected region of this X-ray.'
          : 'Analyze the entire X-ray.';
      }

      // 2. Get the image blob (cropped or full)
      const imageBlob = await getImageBlob();

      // 3. Build FormData
      const formData = new FormData();
      formData.append('image', imageBlob, 'xray.png');
      formData.append('voiceQuestion', prompt);
      formData.append('mode', mode);

      if (hasSelection && selection) {
        formData.append('region_box', JSON.stringify({
          x: selection.x,
          y: selection.y,
          w: selection.width,
          h: selection.height,
        }));
      }

      if (patient) {
        formData.append('patientContext', JSON.stringify(patient));
      }

      // 4. Progressive loading states
      setLoadingText(
        hasSelection ? 'Analyzing selected region...' : 'Analyzing full image...',
      );
      const loadingInterval = setInterval(() => {
        setLoadingText((prev) =>
          prev.includes('region') || prev.includes('full image')
            ? 'Processing via MedGemma...'
            : 'Synthesizing with TxGemma...',
        );
      }, 3000);

      // 5. POST
      let response: Response;
      try {
        response = await fetch(PIPELINE_URL, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
      } finally {
        clearInterval(loadingInterval);
        setLoadingText('Finalizing...');
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || errBody?.detail || `Server error (${response.status})`);
      }

      const json = await response.json();

      if (!json.success || !json.analysis) {
        throw new Error(json.error || 'Analysis pipeline returned an invalid response.');
      }

      // 6. Map response to UI
      const analysis = json.analysis;

      const regionLabel = hasSelection
        ? `region_x${Math.round(selection!.x)}_y${Math.round(selection!.y)}`
        : 'full_image';

      // Extract best fracture data from raw MedGemma findings
      let bestFractureData: any = null;
      if (json.raw_findings) {
        const cropWithFracture = json.raw_findings.find(
          (r: any) => r.success && r.findings?.fracture_detected,
        );
        if (cropWithFracture) {
          bestFractureData = cropWithFracture.findings;
        } else if (json.raw_findings.length > 0 && json.raw_findings[0].success) {
          bestFractureData = json.raw_findings[0].findings;
        }
      }

      const isFracturePrompt = prompt.toLowerCase().includes('fracture');

      if (isFracturePrompt || bestFractureData?.fracture_detected) {
        const mapped: FractureAnalysisResult = {
          fracture_detected: bestFractureData?.fracture_detected || false,
          fracture_type: bestFractureData?.fracture_type || 'none',
          fracture_location: bestFractureData?.fracture_location || '—',
          displacement: bestFractureData?.displacement || 'none',
          joint_involvement: bestFractureData?.joint_involvement || false,
          confidence: analysis.confidence || bestFractureData?.confidence || 0,
          findings: analysis.summary || bestFractureData?.findings || '—',
          clinical_recommendation: analysis.recommended_action || bestFractureData?.clinical_recommendation || '—',
          image_type: scanType.replace(/-/g, '_'),
          region_focus: regionLabel,
          mock: analysis.mock || false,
        };
        setResult({ kind: 'fracture', data: mapped });
      } else {
        const mapped: AnalysisResult = {
          analysis: analysis.summary,
          reasoning: analysis.differential ? `Differential: ${analysis.differential.join(', ')}` : '',
          findings: analysis.recommended_action ? [analysis.recommended_action] : [],
          confidence: analysis.risk_level === 'high' || analysis.risk_level === 'critical' ? 'high' : 'moderate',
        };
        setResult({ kind: 'generic', data: mapped });
      }

      if (useVoice && analysis.summary) {
        setIsSpeaking(true);
        speakText(analysis.summary, () => setIsSpeaking(false));
      }
    } catch (err: any) {
      console.error('X-ray analysis error:', err);
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot reach the AI server at localhost:5001. Is the backend running?'
          : err.message || 'Analysis failed. Please retry.',
      );
    } finally {
      setIsLoading(false);
      setLoadingText('Analyzing X-ray...');
    }
  };

  /** Triggered by the Send button */
  const handleSend = () => handleAnalyzeImage();

  /** Fracture Analysis — auto-detects region vs full */
  const handleFractureAnalysis = () =>
    handleAnalyzeImage(
      hasSelection
        ? 'Analyze the selected region of this X-ray for fractures, dislocations, and abnormalities. Provide structured findings.'
        : 'Analyze this entire X-ray for fractures, dislocations, and abnormalities. Provide structured findings including fracture type, location, displacement, and clinical recommendations.',
      false,
    );

  /** Explain with Voice — auto-detects region vs full */
  const handleVoiceExplanation = () =>
    handleAnalyzeImage(
      hasSelection
        ? 'Analyze the selected region of this X-ray and explain the key findings verbally.'
        : 'Analyze the entire X-ray and explain the key findings to me verbally as if to a patient.',
      true,
    );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-region-panel">
      {/* Header — dynamic title based on selection state */}
      <div className="ai-region-header">
        <h4>
          <Scan size={16} style={{ color: '#6366f1' }} />
          {hasSelection ? 'Ask About Selected Region' : 'Ask About Full Image'}
        </h4>
        {hasSelection && (
          <button className="clear-selection-btn" onClick={onClearSelection}>
            Clear Selection
            <X size={12} style={{ marginLeft: 4 }} />
          </button>
        )}
      </div>

      {/* Mode Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 0 8px',
        fontSize: 11,
        color: hasSelection ? '#4f46e5' : '#64748b',
        fontWeight: 500,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: hasSelection ? '#4f46e5' : '#94a3b8',
          display: 'inline-block',
        }} />
        {hasSelection ? 'Region selected — will analyze cropped area' : 'No region — will analyze full image'}
      </div>

      {/* Input */}
      <div className="ai-region-input-row">
        <input
          className="ai-region-input"
          type="text"
          placeholder={hasSelection ? 'Ask about the selected region…' : 'Ask about the full image…'}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className="ai-region-send-btn"
          onClick={handleSend}
          disabled={!question.trim() || isLoading}
          title="Send question"
        >
          <Send size={16} />
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={handleFractureAnalysis}
          disabled={isLoading}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 8px',
            borderRadius: 8,
            border: '1px solid #c7d2fe',
            background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
            color: '#4338ca',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Bone size={14} />
          Fracture Analysis
        </button>

        <button
          onClick={handleVoiceExplanation}
          disabled={isLoading}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 8px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: isSpeaking ? '#fee2e2' : '#f8fafc',
            color: isSpeaking ? '#ef4444' : '#475569',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {isSpeaking ? (
            <>
              <Square size={14} fill="currentColor" onClick={(e) => { e.stopPropagation(); stopSpeech(); setIsSpeaking(false); }} /> Stop Voice
            </>
          ) : (
            <>
              <Volume2 size={14} /> Explain with Voice
            </>
          )}
        </button>
      </div>

      {/* Error + Retry */}
      {error && (
        <div style={{
          padding: '10px 14px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: 8,
          fontSize: 12,
          color: '#dc2626',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <span>{error}</span>
          <button
            onClick={handleFractureAnalysis}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #fca5a5',
              background: '#fff',
              color: '#dc2626',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <AnalysisLoading />
          <p style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>{loadingText}</p>
        </div>
      )}

      {/* Result */}
      {result && !isLoading && result.kind === 'fracture' && (
        <FractureAnalysisCard result={result.data} />
      )}
      {result && !isLoading && result.kind === 'generic' && (
        <AnalysisCard result={result.data} />
      )}
    </div>
  );
};
