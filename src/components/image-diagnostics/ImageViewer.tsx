import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, Move } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  onContainerRef?: (el: HTMLDivElement | null) => void;
  children?: React.ReactNode; // For canvas overlay
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, onContainerRef, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panMode, setPanMode] = useState(false);

  useEffect(() => {
    if (onContainerRef) onContainerRef(containerRef.current);
  }, [onContainerRef]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(Math.max(z + delta, 0.5), 5));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!panMode) return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan, panMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`img-viewer-container ${isFullscreen ? 'img-viewer-container--fullscreen' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: panMode ? (isPanning ? 'grabbing' : 'grab') : undefined }}
    >
      <img
        src={src}
        alt="Medical scan"
        className="img-viewer-image"
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
        }}
        draggable={false}
      />

      {/* Canvas overlay for selection (rendered as children) */}
      {!panMode && children}

      {/* Toolbar */}
      <div className="img-viewer-toolbar">
        <button
          onClick={(e) => { e.stopPropagation(); setPanMode(!panMode); }}
          title={panMode ? 'Selection mode' : 'Pan mode'}
          style={panMode ? { background: 'rgba(99, 102, 241, 0.3)', color: '#fff' } : {}}
        >
          <Move size={16} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(z + 0.25, 5)); }} title="Zoom in">
          <ZoomIn size={16} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(z - 0.25, 0.5)); }} title="Zoom out">
          <ZoomOut size={16} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); resetView(); }} title="Reset view">
          <RotateCcw size={16} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Hint */}
      {!panMode && (
        <div className="img-viewer-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          Click and drag to select a region, then ask a question about it
        </div>
      )}
    </div>
  );
};
