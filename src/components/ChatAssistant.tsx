import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello, I am UrbanCare AI. How can I assist you with this patient?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { selectedPatientId, patients } = useStore();
  const patient = patients.find(p => p.id === selectedPatientId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !patient) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const context = `
        You are a helpful medical assistant.
        Current Patient Context:
        Name: ${patient.name}
        Age: ${patient.age}
        Condition: ${patient.condition}
        Vitals: HR ${patient.vitals.heartRate.value}, BP ${patient.vitals.bloodPressure.sys}/${patient.vitals.bloodPressure.dia}, SpO2 ${patient.vitals.spO2.value}
        
        Answer the user's question based on this context. Be concise and professional.
      `;
      
      const chat = ai.chats.create({
        model: "gemini-2.5-flash-latest",
        config: { systemInstruction: context },
        history: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
      });

      const result = await chat.sendMessage({ message: input });
      const response = result.text;

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center transition-all hover:scale-105 z-50"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-10 fade-in duration-200">
          <div className="p-4 bg-indigo-600 text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">UrbanCare AI Assistant</h3>
              <p className="text-xs text-indigo-200">Patient Context Active</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={clsx(
                  "flex gap-3 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  msg.role === 'user' ? "bg-slate-200" : "bg-indigo-100"
                )}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-slate-600" /> : <Bot className="w-4 h-4 text-indigo-600" />}
                </div>
                <div className={clsx(
                  "p-3 rounded-2xl text-sm shadow-sm",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                )}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                </div>
                <div className="p-3 bg-white border border-slate-100 rounded-2xl rounded-tl-none text-sm text-slate-500 shadow-sm">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about the patient..."
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
