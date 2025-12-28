
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, RotateCw, FlipHorizontal, FlipVertical, Crop, RotateCcw, Sliders, Sparkles, Wand2, Type, Eraser } from 'lucide-react';
import { processImage } from '../services/pdfService';

interface ImageEditorProps {
  image: string;
  onSave: (processedImage: string) => void;
  onCancel: () => void;
  mode?: 'scan' | 'photo';
}

const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSave, onCancel, mode = 'scan' }) => {
  const [filter, setFilter] = useState('none');
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [rotate, setRotate] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 10, y: 10, width: 80, height: 80 });
  
  // Custom Sliders
  const [custom, setCustom] = useState({
    brightness: 0,
    contrast: 0,
    sharpness: 20,
    shadows: 10,
    denoise: 5
  });

  const [imgDisplaySize, setImgDisplaySize] = useState({ w: 0, h: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  
  const imgRef = useRef<HTMLImageElement>(null);
  const dragInfo = useRef<any>(null);

  const scanPresets = [
    { id: 'none', name: 'Original', icon: <X className="w-3 h-3" /> },
    { id: 'auto-scan', name: 'Auto Scan', icon: <Sparkles className="w-3 h-3" /> },
    { id: 'text-soft', name: 'Soft Text', icon: <Type className="w-3 h-3" /> },
    { id: 'grayscale', name: 'Grayscale', icon: <Wand2 className="w-3 h-3" /> },
    { id: 'color-scan', name: 'Color Scan', icon: <Sparkles className="w-3 h-3" /> },
    { id: 'soft-scan', name: 'Soft Scan', icon: <Wand2 className="w-3 h-3" /> },
  ];

  const photoPresets = [
    { id: 'none', name: 'Original', icon: <X className="w-3 h-3" /> },
    { id: 'auto-enhance', name: 'Auto Enhance', icon: <Sparkles className="w-3 h-3" /> },
    { id: 'color-boost', name: 'Color Boost', icon: <Sparkles className="w-3 h-3" /> },
    { id: 'grayscale', name: 'Grayscale', icon: <Wand2 className="w-3 h-3" /> },
    { id: 'text-soft', name: 'B&W Soft', icon: <Type className="w-3 h-3" /> },
  ];

  const currentPresets = mode === 'scan' ? scanPresets : photoPresets;

  const handleSave = async () => {
    setIsProcessing(true);
    let cropPx = undefined;
    if (isCropMode) {
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
      crop: cropPx,
      custom: activeTab === 'custom' ? custom : undefined
    });
    onSave(result);
    setIsProcessing(false);
  };

  const updateDisplaySize = useCallback(() => {
    if (imgRef.current) {
      setImgDisplaySize({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateDisplaySize);
    return () => window.removeEventListener('resize', updateDisplaySize);
  }, [updateDisplaySize]);

  const handleDragMove = useCallback((e: any) => {
    if (!dragInfo.current || !imgDisplaySize.w || !imgDisplaySize.h) return;
    const info = dragInfo.current;
    const point = 'touches' in e ? e.touches[0] : e;
    const dx = ((point.clientX - info.startX) / imgDisplaySize.w) * 100;
    const dy = ((point.clientY - info.startY) / imgDisplaySize.h) * 100;
    
    setCropRect(prev => {
      let next = { ...prev };
      if (info.type === 'center') {
        next.x = Math.max(0, Math.min(100 - info.startRect.width, info.startRect.x + dx));
        next.y = Math.max(0, Math.min(100 - info.startRect.height, info.startRect.y + dy));
      } else {
        if (info.type.includes('left')) {
          const newX = Math.max(0, Math.min(info.startRect.x + info.startRect.width - 5, info.startRect.x + dx));
          next.width = info.startRect.width + (info.startRect.x - newX);
          next.x = newX;
        }
        if (info.type.includes('right')) next.width = Math.max(5, Math.min(100 - info.startRect.x, info.startRect.width + dx));
        if (info.type.includes('top')) {
          const newY = Math.max(0, Math.min(info.startRect.y + info.startRect.height - 5, info.startRect.y + dy));
          next.height = info.startRect.height + (info.startRect.y - newY);
          next.y = newY;
        }
        if (info.type.includes('bottom')) next.height = Math.max(5, Math.min(100 - info.startRect.y, info.startRect.height + dy));
      }
      return next;
    });
  }, [imgDisplaySize]);

  useEffect(() => {
    if (isCropMode) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', () => dragInfo.current = null);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', () => dragInfo.current = null);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleDragMove);
    };
  }, [isCropMode, handleDragMove]);

  const SliderControl = ({ label, value, min, max, onChange }: any) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center px-1">
        <span className="text-[9px] font-black uppercase text-white/40">{label}</span>
        <span className="text-[9px] font-black text-blue-400">{value}</span>
      </div>
      <input 
        type="range" min={min} max={max} value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-full appearance-none accent-blue-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-2xl h-full flex flex-col p-4">
        <div className="flex justify-between items-center py-4 text-white">
          <button onClick={onCancel} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
          <div className="text-center">
            <h3 className="font-black uppercase tracking-[0.2em] text-xs">Visual Engine</h3>
            <p className="text-[10px] text-white/40 font-bold mt-1">Non-Destructive Processing</p>
          </div>
          <button onClick={handleSave} disabled={isProcessing} className="p-3 bg-blue-600 rounded-full shadow-xl shadow-blue-500/20 active:scale-90 transition-all">
            {isProcessing ? <RotateCcw className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
          </button>
        </div>

        <div className="flex-1 relative bg-black/30 rounded-[2.5rem] overflow-hidden border border-white/5 flex items-center justify-center">
          <div className="relative inline-block transition-transform duration-300" style={{ transform: `rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})` }}>
            <img 
              ref={imgRef}
              src={image} 
              onLoad={(e) => {
                setImgNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
                updateDisplaySize();
              }}
              className="max-w-full max-h-[50vh] object-contain select-none" 
              style={{ 
                filter: activeTab === 'custom' 
                  ? `brightness(${1 + custom.brightness/100}) contrast(${1 + custom.contrast/100}) grayscale(${filter === 'grayscale' || filter === 'text-soft' ? 1 : 0})`
                  : filter === 'grayscale' ? 'grayscale(1)' : filter === 'text-soft' ? 'grayscale(1) contrast(1.5)' : filter === 'auto-scan' ? 'contrast(1.2)' : 'none',
              }}
              draggable={false}
            />
            {isCropMode && (
              <div 
                className="absolute border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-20"
                style={{ left: `${cropRect.x}%`, top: `${cropRect.y}%`, width: `${cropRect.width}%`, height: `${cropRect.height}%` }}
              >
                <div className="absolute inset-0 cursor-move" onMouseDown={(e) => { e.stopPropagation(); dragInfo.current = { type: 'center', startX: e.clientX, startY: e.clientY, startRect: { ...cropRect } }; }} />
                {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                  <div key={pos} className="absolute w-6 h-6 bg-white border-2 border-blue-500 rounded-full z-30 shadow-lg -translate-x-1/2 -translate-y-1/2 cursor-crosshair" style={{ left: pos.includes('right') ? '100%' : '0%', top: pos.includes('bottom') ? '100%' : '0%' }} onMouseDown={(e) => { e.stopPropagation(); dragInfo.current = { type: pos, startX: e.clientX, startY: e.clientY, startRect: { ...cropRect } }; }} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="py-6 space-y-4">
          <div className="flex justify-center bg-white/5 p-1 rounded-2xl mx-2">
            <button onClick={() => setActiveTab('presets')} className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'presets' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/40'}`}>
              <Sparkles className="w-3.5 h-3.5" /> <span>Presets</span>
            </button>
            <button onClick={() => setActiveTab('custom')} className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'custom' ? 'bg-white text-slate-900 shadow-lg' : 'text-white/40'}`}>
              <Sliders className="w-3.5 h-3.5" /> <span>Custom {mode === 'scan' ? 'Scan' : ''}</span>
            </button>
          </div>

          <div className="min-h-[100px] flex items-center">
            {activeTab === 'presets' ? (
              <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide px-2 w-full">
                {currentPresets.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setFilter(p.id)}
                    className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border flex flex-col items-center justify-center space-y-1 min-w-[80px] ${filter === p.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white/5 text-white/50 border-white/10'}`}
                  >
                    {p.icon}
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 w-full">
                <SliderControl label="Brightness" value={custom.brightness} min={-100} max={100} onChange={(v: any) => setCustom({...custom, brightness: v})} />
                <SliderControl label="Contrast" value={custom.contrast} min={-100} max={100} onChange={(v: any) => setCustom({...custom, contrast: v})} />
                <SliderControl label="Shadow Recovery" value={custom.shadows} min={0} max={100} onChange={(v: any) => setCustom({...custom, shadows: v})} />
                <SliderControl label="Sharpness" value={custom.sharpness} min={0} max={100} onChange={(v: any) => setCustom({...custom, sharpness: v})} />
                <div className="col-span-2">
                  <SliderControl label="Noise Reduction" value={custom.denoise} min={0} max={100} onChange={(v: any) => setCustom({...custom, denoise: v})} />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-5 gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/10 mx-2">
            <button onClick={() => { setIsCropMode(!isCropMode); if (!isCropMode) setCropRect({ x: 10, y: 10, width: 80, height: 80 }); }} className={`flex flex-col items-center space-y-2 transition-colors ${isCropMode ? 'text-blue-400' : 'text-white/60'}`}><Crop className="w-5 h-5" /><span className="text-[9px] font-bold uppercase">Crop</span></button>
            <button onClick={() => { setRotate(r => (r + 90) % 360); setTimeout(updateDisplaySize, 350); }} className="flex flex-col items-center space-y-2 text-white/60"><RotateCw className="w-5 h-5" /><span className="text-[9px] font-bold uppercase">Rotate</span></button>
            <button onClick={() => setFlipH(f => !f)} className={`flex flex-col items-center space-y-2 ${flipH ? 'text-blue-400' : 'text-white/60'}`}><FlipHorizontal className="w-5 h-5" /><span className="text-[9px] font-bold uppercase">Flip H</span></button>
            <button onClick={() => setFlipV(f => !f)} className={`flex flex-col items-center space-y-2 ${flipV ? 'text-blue-400' : 'text-white/60'}`}><FlipVertical className="w-5 h-5" /><span className="text-[9px] font-bold uppercase">Flip V</span></button>
            <button onClick={() => { setFilter('none'); setRotate(0); setFlipH(false); setFlipV(false); setIsCropMode(false); setCustom({brightness: 0, contrast: 0, sharpness: 20, shadows: 10, denoise: 5}); }} className="flex flex-col items-center space-y-2 text-red-400/80"><RotateCcw className="w-5 h-5" /><span className="text-[9px] font-bold uppercase">Reset</span></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
