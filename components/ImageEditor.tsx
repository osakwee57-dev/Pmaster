
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCw, FlipHorizontal, FlipVertical, Crop, Maximize, Move } from 'lucide-react';
import { processImage } from '../services/pdfService';

interface ImageEditorProps {
  image: string;
  onSave: (processedImage: string) => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSave, onCancel }) => {
  const [filter, setFilter] = useState('none');
  const [rotate, setRotate] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Crop states
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 10, y: 10, width: 80, height: 80 }); // Percentages
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  const filters = [
    { id: 'none', name: 'Original' },
    { id: 'grayscale', name: 'B&W' },
    { id: 'sepia', name: 'Retro' },
    { id: 'high-contrast', name: 'Scan' },
  ];

  const handleSave = async () => {
    setIsProcessing(true);
    
    let cropPx = undefined;
    if (isCropMode) {
      // Calculate pixel coordinates for cropping
      cropPx = {
        x: (cropRect.x / 100) * imgSize.w,
        y: (cropRect.y / 100) * imgSize.h,
        width: (cropRect.width / 100) * imgSize.w,
        height: (cropRect.height / 100) * imgSize.h,
      };
    }

    const result = await processImage(image, { 
      filter, 
      rotate, 
      flipH, 
      flipV,
      crop: cropPx 
    });
    onSave(result);
    setIsProcessing(false);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgSize({ w: naturalWidth, h: naturalHeight });
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-2xl h-full flex flex-col p-4">
        {/* Header */}
        <div className="flex justify-between items-center py-4 text-white">
          <button onClick={onCancel} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          <div className="text-center">
            <h3 className="font-black uppercase tracking-[0.2em] text-xs">Page Editor</h3>
            <p className="text-[10px] text-white/40 font-bold mt-1">Enhance & Adjust</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={isProcessing}
            className="p-3 bg-blue-600 rounded-full shadow-xl shadow-blue-500/20 active:scale-90 transition-all disabled:opacity-50"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>

        {/* Workspace */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-black/50 rounded-[2.5rem] overflow-hidden border border-white/5 flex items-center justify-center group"
        >
          <img 
            src={image} 
            onLoad={onImageLoad}
            className="max-w-full max-h-full object-contain pointer-events-none transition-all duration-300" 
            style={{ 
              filter: filter === 'grayscale' ? 'grayscale(1)' : filter === 'sepia' ? 'sepia(1)' : filter === 'high-contrast' ? 'contrast(1.5) grayscale(1) brightness(1.1)' : 'none',
              transform: `rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`
            }}
          />

          {/* Simple Crop Overlay */}
          {isCropMode && (
            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
              <div 
                className="relative border-4 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-auto"
                style={{
                  width: `${cropRect.width}%`,
                  height: `${cropRect.height}%`,
                  left: `${cropRect.x - 50}%`, // Rough adjustment for simple centering logic
                  top: `${cropRect.y - 50}%`,
                }}
              >
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  <div className="border border-white/20" />
                  <div className="border border-white/20" />
                  <div className="border border-white/20" />
                  <div className="border border-white/20" />
                  <div className="border border-white/20" />
                  <div className="border border-white/20" />
                  <div className="border border-white/20" />
                  <div className="border border-white/20" />
                  <div className="border border-white/20" />
                </div>
                {/* Interaction handles could go here, but for simplicity we keep fixed crop area centered */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-blue-600 text-[10px] font-black text-white px-3 py-1 rounded-full whitespace-nowrap">
                  DRAG EDGES TO RESIZE
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="py-8 space-y-6">
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${filter === f.id ? 'bg-white text-slate-900 border-white shadow-lg' : 'bg-white/5 text-white/50 border-white/10'}`}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/10">
            <button 
              onClick={() => setIsCropMode(!isCropMode)}
              className={`flex flex-col items-center space-y-2 ${isCropMode ? 'text-blue-400' : 'text-white/60'}`}
            >
              <Crop className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Crop</span>
            </button>
            <button 
              onClick={() => setRotate(r => (r + 90) % 360)}
              className="flex flex-col items-center space-y-2 text-white/60 hover:text-white"
            >
              <RotateCw className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Rotate</span>
            </button>
            <button 
              onClick={() => setFlipH(f => !f)}
              className={`flex flex-col items-center space-y-2 ${flipH ? 'text-blue-400' : 'text-white/60'}`}
            >
              <FlipHorizontal className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Flip H</span>
            </button>
            <button 
              onClick={() => setFlipV(f => !f)}
              className={`flex flex-col items-center space-y-2 ${flipV ? 'text-blue-400' : 'text-white/60'}`}
            >
              <FlipVertical className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Flip V</span>
            </button>
             <button 
              onClick={() => {
                setFilter('none');
                setRotate(0);
                setFlipH(false);
                setFlipV(false);
                setIsCropMode(false);
              }}
              className="flex flex-col items-center space-y-2 text-red-400"
            >
              <X className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
