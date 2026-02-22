import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Volume2 } from 'lucide-react';
import { StructuredOutputCard } from './StructuredOutputCard';
import type { ChatMessage as ChatMessageType } from '../../hooks/useAIConsult';

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * Extracts JSON blocks from markdown content (```json ... ```)
 * Returns { textParts, jsonBlocks }
 */
function extractStructuredBlocks(content: string) {
  const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/g;
  const jsonBlocks: any[] = [];
  let lastIndex = 0;
  const textParts: string[] = [];
  let match;

  while ((match = jsonBlockRegex.exec(content)) !== null) {
    // Text before this JSON block
    const before = content.slice(lastIndex, match.index).trim();
    if (before) textParts.push(before);

    // Parse the JSON block
    try {
      const parsed = JSON.parse(match[1]);
      jsonBlocks.push(parsed);
    } catch {
      // If JSON parse fails, treat as regular text
      textParts.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last JSON block
  const remaining = content.slice(lastIndex).trim();
  if (remaining) textParts.push(remaining);

  return { textParts, jsonBlocks };
}

/**
 * Optional text-to-speech for assistant messages
 */
function handleTTS(text: string) {
  if (!('speechSynthesis' in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Strip markdown for cleaner TTS
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[|─]/g, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const { textParts, jsonBlocks } = !isUser
    ? extractStructuredBlocks(message.content)
    : { textParts: [message.content], jsonBlocks: [] };

  return (
    <div className={`copilot-msg ${isUser ? 'user' : 'assistant'}`}>
      <div className={`copilot-msg-avatar ${isUser ? 'user' : 'assistant'}`}>
        {isUser ? (
          <User style={{ width: 14, height: 14, color: '#64748b' }} />
        ) : (
          <Bot style={{ width: 14, height: 14, color: '#6366f1' }} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div className={`copilot-msg-bubble ${isUser ? 'user' : 'assistant'}`}>
          {textParts.map((part, i) => (
            <ReactMarkdown key={i}>{part}</ReactMarkdown>
          ))}
          {jsonBlocks.map((block, i) => (
            <StructuredOutputCard key={`json-${i}`} data={block} />
          ))}
        </div>

        {!isUser && (
          <button
            className="copilot-tts-btn"
            onClick={() => handleTTS(message.content)}
            title="Read aloud"
          >
            <Volume2 style={{ width: 12, height: 12 }} />
          </button>
        )}
      </div>
    </div>
  );
}
