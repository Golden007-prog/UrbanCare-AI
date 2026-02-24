import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageViewer } from './ImageViewer';
import { SelectionCanvas, SelectionRect } from './SelectionCanvas';
import { AIRegionPanel } from './AIRegionPanel';
import { Patient } from '../../store/useStore';
import '../../styles/imageDiagnostics.css';

interface ImageDiagnosticsPanelProps {
  patient: Patient;
}

const SCAN_TYPES = [
  { key: 'xray', label: 'X-Ray' },
  { key: 'ct', label: 'CT' },
  { key: 'mri', label: 'MRI' },
  { key: 'ultrasound', label: 'Ultrasound' },
];

export const ImageDiagnosticsPanel: React.FC<ImageDiagnosticsPanelProps> = ({ patient }) => {
  const [activeTab, setActiveTab] = useState('xray');
  const [image, setImage] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [viewerContainer, setViewerContainer] = useState<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setSelection(null);
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
        setImage(reader.result as string);
        setSelection(null);
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

  const handleClearSelection = () => {
    setSelection(null);
  };

  const handleRemoveImage = () => {
    setImage(null);
    setSelection(null);
  };

  const canvasWidth = viewerContainer?.clientWidth || 0;
  const canvasHeight = viewerContainer?.clientHeight || 0;

  return (
    <div className="img-diag-panel">
      {/* Header */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{
          fontSize: 15,
          fontWeight: 700,
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          margin: 0,
        }}>
          <ImageIcon size={18} style={{ color: '#6366f1' }} />
          AI Image Analysis
        </h3>
        {image && (
          <button
            onClick={handleRemoveImage}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            New Upload
          </button>
        )}
      </div>

      {/* Scan Type Tabs */}
      <div className="scan-tabs">
        {SCAN_TYPES.map((t) => (
          <button
            key={t.key}
            className={`scan-tab ${activeTab === t.key ? 'scan-tab--active' : 'scan-tab--inactive'}`}
            onClick={() => { setActiveTab(t.key); }}
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
          >
            <div
              className="img-upload-area"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="upload-icon" />
              <p className="panel-empty-text">
                Upload {SCAN_TYPES.find((t) => t.key === activeTab)?.label || 'scan'}
              </p>
              <p className="panel-empty-subtext">
                Click to browse or drag & drop
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
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
            {/* Scan type badge */}
            <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#6366f1',
                background: '#eef2ff',
                padding: '3px 8px',
                borderRadius: 4,
              }}>
                {SCAN_TYPES.find((t) => t.key === activeTab)?.label}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                • {patient.name} ({patient.id})
              </span>
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
              scanType={activeTab}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
