import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { aiPost } from '../lib/aiClient';
import { useStore } from '../store/useStore';

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  size?: 'small' | 'default';
}

/**
 * Microphone button that records audio via MediaRecorder,
 * sends it to /api/transcribe, and returns the transcript.
 */
export function VoiceMicButton({ onTranscript, disabled = false, size = 'default' }: VoiceMicButtonProps) {
  const { settings } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);

        try {
          // Convert to base64
          const buffer = await blob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          const result = await aiPost('/api/transcribe', {
            audio: base64,
            mimeType: 'audio/webm',
            language: 'en',
          }, settings.offlineMode);

          onTranscript(result.data.transcript);
        } catch (err) {
          console.error('Transcription error:', err);
          onTranscript('⚠️ Transcription failed. Is the backend running?');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
    }
  }, [onTranscript, settings.offlineMode]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const isSmall = size === 'small';
  const btnSize = isSmall ? 32 : 40;

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing…' : 'Record symptoms'}
      style={{
        width: btnSize,
        height: btnSize,
        borderRadius: '50%',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled || isTranscribing ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        background: isRecording
          ? '#ef4444'
          : isTranscribing
          ? '#94a3b8'
          : 'linear-gradient(135deg, #4f46e5, #6366f1)',
        color: '#fff',
        boxShadow: isRecording
          ? '0 0 0 4px rgba(239,68,68,0.25)'
          : '0 2px 8px rgba(79,70,229,0.25)',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      {isTranscribing ? (
        <Loader2 className="animate-spin" style={{ width: isSmall ? 14 : 18, height: isSmall ? 14 : 18 }} />
      ) : isRecording ? (
        <MicOff style={{ width: isSmall ? 14 : 18, height: isSmall ? 14 : 18 }} />
      ) : (
        <Mic style={{ width: isSmall ? 14 : 18, height: isSmall ? 14 : 18 }} />
      )}
    </button>
  );
}
