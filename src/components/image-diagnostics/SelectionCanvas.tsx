import React, { useRef, useState, useCallback, useEffect } from 'react';

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SelectionCanvasProps {
  containerRef: HTMLDivElement | null;
  selection: SelectionRect | null;
  onSelectionChange: (rect: SelectionRect | null) => void;
}

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLE_SIZE = 8;

export const SelectionCanvas: React.FC<SelectionCanvasProps> = ({
  containerRef,
  selection,
  onSelectionChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<HandlePosition | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const getHandleAtPoint = useCallback((px: number, py: number, sel: SelectionRect): HandlePosition | null => {
    const handles: { pos: HandlePosition; x: number; y: number }[] = [
      { pos: 'nw', x: sel.x, y: sel.y },
      { pos: 'n',  x: sel.x + sel.width / 2, y: sel.y },
      { pos: 'ne', x: sel.x + sel.width, y: sel.y },
      { pos: 'e',  x: sel.x + sel.width, y: sel.y + sel.height / 2 },
      { pos: 'se', x: sel.x + sel.width, y: sel.y + sel.height },
      { pos: 's',  x: sel.x + sel.width / 2, y: sel.y + sel.height },
      { pos: 'sw', x: sel.x, y: sel.y + sel.height },
      { pos: 'w',  x: sel.x, y: sel.y + sel.height / 2 },
    ];
    for (const h of handles) {
      if (Math.abs(px - h.x) <= HANDLE_SIZE && Math.abs(py - h.y) <= HANDLE_SIZE) return h.pos;
    }
    return null;
  }, []);

  const isInsideSelection = useCallback((px: number, py: number, sel: SelectionRect) => {
    return px >= sel.x && px <= sel.x + sel.width && py >= sel.y && py <= sel.y + sel.height;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasCoords(e);

    if (selection) {
      const handle = getHandleAtPoint(pos.x, pos.y, selection);
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        setStartPos(pos);
        return;
      }
      if (isInsideSelection(pos.x, pos.y, selection)) {
        setIsDragging(true);
        setDragOffset({ x: pos.x - selection.x, y: pos.y - selection.y });
        return;
      }
    }

    // Start new selection
    setIsDrawing(true);
    setStartPos(pos);
    onSelectionChange(null);
  }, [selection, getCanvasCoords, getHandleAtPoint, isInsideSelection, onSelectionChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDrawing) {
      const newSel: SelectionRect = {
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(pos.x - startPos.x),
        height: Math.abs(pos.y - startPos.y),
      };
      onSelectionChange(newSel);
    } else if (isDragging && selection) {
      const newX = Math.max(0, Math.min(pos.x - dragOffset.x, canvas.width - selection.width));
      const newY = Math.max(0, Math.min(pos.y - dragOffset.y, canvas.height - selection.height));
      onSelectionChange({ ...selection, x: newX, y: newY });
    } else if (isResizing && selection && resizeHandle) {
      const newSel = { ...selection };
      switch (resizeHandle) {
        case 'se':
          newSel.width = Math.max(20, pos.x - newSel.x);
          newSel.height = Math.max(20, pos.y - newSel.y);
          break;
        case 'nw':
          newSel.width = Math.max(20, newSel.x + newSel.width - pos.x);
          newSel.height = Math.max(20, newSel.y + newSel.height - pos.y);
          newSel.x = pos.x;
          newSel.y = pos.y;
          break;
        case 'ne':
          newSel.width = Math.max(20, pos.x - newSel.x);
          newSel.height = Math.max(20, newSel.y + newSel.height - pos.y);
          newSel.y = pos.y;
          break;
        case 'sw':
          newSel.width = Math.max(20, newSel.x + newSel.width - pos.x);
          newSel.height = Math.max(20, pos.y - newSel.y);
          newSel.x = pos.x;
          break;
        case 'n':
          newSel.height = Math.max(20, newSel.y + newSel.height - pos.y);
          newSel.y = pos.y;
          break;
        case 's':
          newSel.height = Math.max(20, pos.y - newSel.y);
          break;
        case 'e':
          newSel.width = Math.max(20, pos.x - newSel.x);
          break;
        case 'w':
          newSel.width = Math.max(20, newSel.x + newSel.width - pos.x);
          newSel.x = pos.x;
          break;
      }
      onSelectionChange(newSel);
    } else {
      // Update cursor
      if (selection) {
        const handle = getHandleAtPoint(pos.x, pos.y, selection);
        if (handle) {
          const cursorMap: Record<HandlePosition, string> = {
            nw: 'nwse-resize', ne: 'nesw-resize', se: 'nwse-resize', sw: 'nesw-resize',
            n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
          };
          canvas.style.cursor = cursorMap[handle];
        } else if (isInsideSelection(pos.x, pos.y, selection)) {
          canvas.style.cursor = 'move';
        } else {
          canvas.style.cursor = 'crosshair';
        }
      }
    }
  }, [isDrawing, isDragging, isResizing, startPos, selection, dragOffset, resizeHandle, getCanvasCoords, getHandleAtPoint, isInsideSelection, onSelectionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // Draw selection on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!selection || selection.width < 2 || selection.height < 2) return;

    // Semi-transparent overlay outside selection
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(selection.x, selection.y, selection.width, selection.height);

    // Blue dashed border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
    ctx.setLineDash([]);

    // Handles
    const handles = [
      { x: selection.x, y: selection.y },
      { x: selection.x + selection.width / 2, y: selection.y },
      { x: selection.x + selection.width, y: selection.y },
      { x: selection.x + selection.width, y: selection.y + selection.height / 2 },
      { x: selection.x + selection.width, y: selection.y + selection.height },
      { x: selection.x + selection.width / 2, y: selection.y + selection.height },
      { x: selection.x, y: selection.y + selection.height },
      { x: selection.x, y: selection.y + selection.height / 2 },
    ];

    handles.forEach((h) => {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(h.x, h.y, HANDLE_SIZE / 2 + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(h.x, h.y, HANDLE_SIZE / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [selection]);

  // Sync canvas size with container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!containerRef || !canvas) return;

    const resize = () => {
      canvas.width = containerRef.clientWidth;
      canvas.height = containerRef.clientHeight;
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(containerRef);
    return () => observer.disconnect();
  }, [containerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="selection-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};
