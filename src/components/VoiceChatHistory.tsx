import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Trash2, Volume2, MessageSquare } from 'lucide-react';
import { aiGet, aiDelete } from '../lib/aiClient';
import { useStore } from '../store/useStore';
import { speakText } from '../lib/speech';

interface ChatHistoryItem {
  id: number;
  patient_id: string;
  doctor_id: string;
  role: 'doctor' | 'assistant';
  message_text: string;
  audio_url: string | null;
  created_at: string;
}

interface VoiceChatHistoryProps {
  patientId: string;
  onClose: () => void;
}

export function VoiceChatHistory({ patientId, onClose }: VoiceChatHistoryProps) {
  const { settings } = useStore();
  const [messages, setMessages] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await aiGet<{ success: boolean; data: { messages: ChatHistoryItem[] } }>(
        `/api/voice/history/${patientId}`,
        settings.offlineMode
      );
      if (result.success) {
        setMessages(result.data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch voice history:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, settings.offlineMode]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (chatId: number) => {
    try {
      await aiDelete(`/api/voice/history/${chatId}`, settings.offlineMode);
      setMessages(prev => prev.filter(m => m.id !== chatId));
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const handleReplay = (text: string) => {
    speakText(text);
  };

  // Group messages by date
  const grouped = messages.reduce<Record<string, ChatHistoryItem[]>>((acc, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  return (
    <div className="voice-history-panel">
      <div className="voice-history-header">
        <button className="voice-history-back" onClick={onClose}>
          <ChevronLeft size={16} />
        </button>
        <h3>Chat History</h3>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{messages.length} messages</span>
      </div>

      <div className="voice-history-body">
        {loading ? (
          <div className="voice-history-empty">
            <div style={{ fontSize: 16, color: '#a78bfa' }}>Loading...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="voice-history-empty">
            <div className="voice-history-empty-icon">🎙️</div>
            <p>No voice conversations yet.</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>Start by clicking the microphone button.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, msgs]) => (
            <div key={date} className="voice-history-day">
              <div className="voice-history-day-label">{date}</div>
              {msgs.map((msg) => (
                <div key={msg.id} className="voice-history-item">
                  <div className={`voice-history-role-icon ${msg.role}`}>
                    {msg.role === 'doctor' ? '🩺' : '🤖'}
                  </div>
                  <div className="voice-history-text">
                    <p>{msg.message_text}</p>
                  </div>
                  <span className="voice-history-time">
                    {new Date(msg.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  {msg.role === 'assistant' && (
                    <button
                      className="voice-history-delete"
                      onClick={() => handleReplay(msg.message_text)}
                      title="Replay"
                      style={{ opacity: 1, color: '#8b5cf6' }}
                    >
                      <Volume2 size={12} />
                    </button>
                  )}
                  <button
                    className="voice-history-delete"
                    onClick={() => handleDelete(msg.id)}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
