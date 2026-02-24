import React from 'react';
import { Image as ImageIcon, Maximize2, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface ScanPreviewCardProps {
  imageDataUrl: string;
  scanType: string;
  onClick: () => void;
}

export const ScanPreviewCard: React.FC<ScanPreviewCardProps> = ({
  imageDataUrl,
  scanType,
  onClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="group bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
    >
      {/* Thumbnail */}
      <div className="relative h-28 bg-slate-900 overflow-hidden">
        <img
          src={imageDataUrl}
          alt="Scan preview"
          className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
            <Maximize2 size={14} className="text-slate-700" />
          </div>
        </div>
        {/* Scan type badge */}
        <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider text-white bg-indigo-500/80 backdrop-blur-sm px-2 py-0.5 rounded">
          {scanType}
        </span>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ImageIcon size={12} className="text-indigo-400" />
          <span className="font-medium text-slate-700">Uploaded Scan</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Clock size={10} />
          <span>Just now</span>
        </div>
      </div>
    </motion.div>
  );
};
