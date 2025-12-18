
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, RotateCw, FlipHorizontal, FlipVertical, Crop, RotateCcw } from 'lucide-react';
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
  
  // Crop states: x, y, width, height in percentage (0-100)
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [imgDisplaySize, setImgDisplaySize] = useState({ w: 0, h: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragInfo = useRef<{ type: string; startX: number; startY: number; startRect: typeof cropRect } | null>(null);

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
      // The processImage service applies rotation first, then crops.
      const isRotated = (rotate / 90) % 2 !== 0;
      const targetW = isRotated ? imgNaturalSize.h : imgNaturalSize.w;
      const targetH = isRotated ? imgNaturalSize.w : imgNaturalSize.h;

      cropPx = {
        x: (cropRect.x / 100) * targetW,
        y: (cropRect.y / 100) * targetH,
        width: (cropRect.width / 100) * targetW,
        height: (cropRect.height / 100) * targetH,
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

  const updateDisplaySize = useCallback(() => {
    if (imgRef.current) {
      setImgDisplaySize({
        w: imgRef.current.clientWidth,
        h: imgRef.current.clientHeight
      });
    }
  }, []);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgNaturalSize({ w: naturalWidth, h: naturalHeight });
    updateDisplaySize();
  };

  useEffect(() => {
    window.addEventListener('resize', updateDisplaySize);
    return () => window.removeEventListener('resize', updateDisplaySize);
  }, [updateDisplaySize]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, type: string) => {
    e.stopPropagation();
    const point = 'touches' in e ? e.touches[0] : e;
    dragInfo.current = {
      type,
      startX: point.clientX,
      startY: point.clientY,
      startRect: { ...cropRect }
    };
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragInfo.current || !imgDisplaySize.w || !imgDisplaySize.h) return;
    
    const info = dragInfo.current; // Capture current ref value to avoid null issues in state update closure
    const point = 'touches' in e ? e.touches[0] : (e as MouseEvent);
    const dx = ((point.clientX - info.startX) / imgDisplaySize.w) * 100;
    const dy = ((point.clientY - info.startY) / imgDisplaySize.h) * 100;
    
    setCropRect(prev => {
      let next = { ...prev };
      const { type, startRect } = info;

      if (type === 'center') {
        next.x = Math.max(0, Math.min(100 - startRect.width, startRect.x + dx));
        next.y = Math.max(0, Math.min(100 - startRect.height, startRect.y + dy));
      } else {
        if (type.includes('left')) {
          const newX = Math.max(0, Math.min(startRect.x + startRect.width - 5, startRect.x + dx));
          next.width = startRect.width + (startRect.x - newX);
          next.x = newX;
        }
        if (type.includes('right')) {
          next.width = Math.max(5, Math.min(100 - startRect.x, startRect.width + dx));
        }
        if (type.includes('top')) {
          const newY = Math.max(0, Math.min(startRect.y + startRect.height - 5, startRect.y + dy));
          next.height = startRect.height + (startRect.y - newY);
          next.y = newY;
        }
        if (type.includes('bottom')) {
          next.height = Math.max(5, Math.min(100 - startRect.y, startRect.height + dy));
        }
      }
      return next;
    });
  }, [imgDisplaySize]);

  const handleDragEnd = useCallback(() => {
    dragInfo.current = null;
  }, []);

  useEffect(() => {
    if (isCropMode) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isCropMode, handleDragMove, handleDragEnd]);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-300 overflow-hidden">
      <div className="w-full max-w-2xl h-full flex flex-col p-4">
        {/* Header */}
        <div className="flex justify-between items-center py-4 text-white">
          <button onClick={onCancel} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          <div className="text-center">
            <h3 className="font-black uppercase tracking-[0.2em] text-xs">Editor</h3>
            <p className="text-[10px] text-white/40 font-bold mt-1">Enhance & Adjust</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={isProcessing}
            className="p-3 bg-blue-600 rounded-full shadow-xl shadow-blue-500/20 active:scale-90 transition-all disabled:opacity-50"
          >
            {isProcessing ? <RotateCcw className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
          </button>
        </div>

        {/* Workspace */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-black/30 rounded-[2.5rem] overflow-hidden border border-white/5 flex items-center justify-center"
        >
          <div className="relative inline-block transition-transform duration-300" style={{ transform: `rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})` }}>
            <img 
              ref={imgRef}
              src={image} 
              onLoad={onImageLoad}
              className="max-w-full max-h-[60vh] object-contain select-none" 
              style={{ 
                filter: filter === 'grayscale' ? 'grayscale(1)' : filter === 'sepia' ? 'sepia(1)' : filter === 'high-contrast' ? 'contrast(1.5) grayscale(1) brightness(1.1)' : 'none',
              }}
              draggable={false}
            />

            {/* Crop UI */}
            {isCropMode && (
              <div 
                className="absolute border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-20"
                style={{
                  left: `${cropRect.x}%`,
                  top: `${cropRect.y}%`,
                  width: `${cropRect.width}%`,
                  height: `${cropRect.height}%`,
                }}
              >
                {/* Drag Handle: Center */}
                <div 
                  className="absolute inset-0 cursor-move"
                  onMouseDown={(e) => handleDragStart(e, 'center')}
                  onTouchStart={(e) => handleDragStart(e, 'center')}
                />
                
                {/* Visual Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div className="border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div className="border-r border-b border-white/40" />
                  <div className="border-b border-white/40" />
                </div>

                {/* Resizers */}
                {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                  <div 
                    key={pos}
                    className="absolute w-6 h-6 bg-white border-2 border-blue-500 rounded-full z-30 shadow-lg -translate-x-1/2 -translate-y-1/2 cursor-crosshair touch-none"
                    style={{
                      left: pos.includes('right') ? '100%' : '0%',
                      top: pos.includes('bottom') ? '100%' : '0%',
                    }}
                    onMouseDown={(e) => handleDragStart(e, pos)}
                    onTouchStart={(e) => handleDragStart(e, pos)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="py-6 space-y-4">
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide px-2">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${filter === f.id ? 'bg-white text-slate-900 border-white shadow-lg' : 'bg-white/5 text-white/50 border-white/10'}`}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/10 mx-2">
            <button 
              onClick={() => {
                setIsCropMode(!isCropMode);
                if (!isCropMode) {
                   setCropRect({ x: 10, y: 10, width: 80, height: 80 });
                   // Wait for next tick to ensure imgDisplaySize is correct
                   setTimeout(updateDisplaySize, 0);
                }
              }}
              className={`flex flex-col items-center space-y-2 transition-colors ${isCropMode ? 'text-blue-400' : 'text-white/60 hover:text-white'}`}
            >
              <Crop className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase">Crop</span>
            </button>
            <button 
              onClick={() => {
                setRotate(r => (r + 90) % 360);
                setTimeout(updateDisplaySize, 350); 
              }}
              className="flex flex-col items-center space-y-2 text-white/60 hover:text-white"
            >
              <RotateCw className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase">Rotate</span>
            </button>
            <button 
              onClick={() => setFlipH(f => !f)}
              className={`flex flex-col items-center space-y-2 transition-colors ${flipH ? 'text-blue-400' : 'text-white/60 hover:text-white'}`}
            >
              <FlipHorizontal className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase">Flip H</span>
            </button>
            <button 
              onClick={() => setFlipV(f => !f)}
              className={`flex flex-col items-center space-y-2 transition-colors ${flipV ? 'text-blue-400' : 'text-white/60 hover:text-white'}`}
            >
              <FlipVertical className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase">Flip V</span>
            </button>
             <button 
              onClick={() => {
                setFilter('none');
                setRotate(0);
                setFlipH(false);
                setFlipV(false);
                setIsCropMode(false);
                setTimeout(updateDisplaySize, 350);
              }}
              className="flex flex-col items-center space-y-2 text-red-400/80 hover:text-red-400"
            >
              <X className="w-5 h-5" />
              <span className="text-[9px] font-bold uppercase">Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
