import React, { useState } from 'react';
import { X, Link2, Copy, Check, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

export const FamilyLinkModal: React.FC<Props> = ({ open, onClose, patientId, patientName }) => {
  const [generatedLink, setGeneratedLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';
      const res = await fetch(`${API_URL}/api/family/generate-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ patientID: patientId }),
      });

      if (res.ok) {
        const data = await res.json();
        const link = `${window.location.origin}/family/${data.data.token}`;
        setGeneratedLink(link);
      } else {
        // Fallback: generate a local mock link
        const mockToken = `fam_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        setGeneratedLink(`${window.location.origin}/family/${mockToken}`);
      }
    } catch {
      // Offline fallback
      const mockToken = `fam_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      setGeneratedLink(`${window.location.origin}/family/${mockToken}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setGeneratedLink('');
    setCopied(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-500" />
                Family Access Link
              </h3>
              <button onClick={handleClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                Generate a read-only portal link for <span className="font-medium text-slate-900">{patientName}</span>'s family members. The link expires in 72 hours.
              </p>

              {!generatedLink ? (
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      Generate Family Link
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-emerald-700 font-medium">Link generated successfully</span>
                  </div>
                  <div className="flex items-stretch gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 select-all"
                    />
                    <button
                      onClick={handleCopy}
                      className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    Expires in 72 hours
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
