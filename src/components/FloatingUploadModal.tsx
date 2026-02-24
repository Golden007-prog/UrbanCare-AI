import React, { useState, useRef, useCallback } from 'react';
import { Drawer } from 'antd';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageViewer } from './image-diagnostics/ImageViewer';
import { SelectionCanvas, SelectionRect } from './image-diagnostics/SelectionCanvas';
import { AIRegionPanel } from './image-diagnostics/AIRegionPanel';
import { Patient } from '../store/useStore';
import '../styles/imageDiagnostics.css';

const SCAN_TYPES = [
  { key: 'xray', label: 'X-Ray' },
  { key: 'ct', label: 'CT' },
  { key: 'mri', label: 'MRI' },
  { key: 'ultrasound', label: 'Ultrasound' },
];

interface FloatingUploadModalProps {
  open: boolean;
  onClose: () => void;
  patient: Patient;
  initialImage?: string | null;
  onImageUploaded?: (dataUrl: string, scanType: string) => void;
}

export const FloatingUploadModal: React.FC<FloatingUploadModalProps> = ({
  open,
  onClose,
  patient,
  initialImage = null,
  onImageUploaded,
}) => {
  const [activeTab, setActiveTab] = useState('xray');
  const [image, setImage] = useState<string | null>(initialImage);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [viewerContainer, setViewerContainer] = useState<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initialImage when prop changes
  React.useEffect(() => {
    if (initialImage) setImage(initialImage);
  }, [initialImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImage(dataUrl);
        setSelection(null);
        onImageUploaded?.(dataUrl, activeTab);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImage(dataUrl);
        setSelection(null);
        onImageUploaded?.(dataUrl, activeTab);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleContainerRef = useCallback((el: HTMLDivElement | null) => {
    setViewerContainer(el);
  }, []);

  const handleClearSelection = () => setSelection(null);

  const handleRemoveImage = () => {
    setImage(null);
    setSelection(null);
  };

  const canvasWidth = viewerContainer?.clientWidth || 0;
  const canvasHeight = viewerContainer?.clientHeight || 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={520}
      placement="right"
      closable={false}
      styles={{
        body: { padding: 0, background: '#f8fafc' },
        header: { display: 'none' },
      }}
      destroyOnClose={false}
    >
      {/* ── Drawer Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <ImageIcon size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">AI Image Analysis</h3>
            <p className="text-[11px] text-slate-400">{patient.name} • {patient.id}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors"
        >
          <X size={16} className="text-slate-500" />
        </button>
      </div>

      {/* ── Scan Type Tabs ── */}
      <div className="flex gap-1 px-5 pt-4 pb-2">
        {SCAN_TYPES.map((t) => (
          <button
            key={t.key}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.key
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {!image ? (
          /* ── Upload Area ── */
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-5 pb-5"
          >
            <div
              className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-indigo-400 hover:bg-indigo-50/30 min-h-[280px] mt-2"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                <Upload size={24} className="text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 mb-1">
                Upload {SCAN_TYPES.find((t) => t.key === activeTab)?.label || 'scan'}
              </p>
              <p className="text-xs text-slate-400">
                Click to browse or drag & drop
              </p>
              <p className="text-[10px] text-slate-300 mt-3">
                Supports DICOM, PNG, JPEG
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Quick tips */}
            <div className="mt-4 p-3 bg-white rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">AI Analysis Tips</p>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  Upload clear, high-resolution images for best results
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  Draw a selection region to focus AI analysis
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  Results include differential diagnosis and red flags
                </li>
              </ul>
            </div>
          </motion.div>
        ) : (
          /* ── Image Viewer + Selection + AI Panel ── */
          <motion.div
            key="viewer"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Action bar */}
            <div className="flex items-center justify-between px-5 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                  {SCAN_TYPES.find((t) => t.key === activeTab)?.label}
                </span>
                <span className="text-[11px] text-slate-400">Ready for analysis</span>
              </div>
              <button
                onClick={handleRemoveImage}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-slate-500 text-[11px] font-medium hover:bg-slate-50 transition-colors"
              >
                New Upload
              </button>
            </div>

            {/* Image Viewer with Canvas Overlay */}
            <ImageViewer src={image} onContainerRef={handleContainerRef}>
              <SelectionCanvas
                containerRef={viewerContainer}
                selection={selection}
                onSelectionChange={setSelection}
              />
            </ImageViewer>

            {/* AI Region Panel */}
            <AIRegionPanel
              selection={selection}
              imageDataUrl={image}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              onClearSelection={handleClearSelection}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Drawer>
  );
};
