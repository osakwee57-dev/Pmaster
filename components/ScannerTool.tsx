
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera as CameraIcon, Check, Download, Share2, Type as TypeIcon, Image as ImageIcon, Eye, Plus, Trash2, ChevronLeft, ChevronRight, Loader2, RefreshCw, Sun, SunDim, Edit3, X, Maximize2 } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { generatePdfFromImages, generatePdfFromText, downloadBlob, shareBlob, preprocessForOcr } from '../services/pdfService';
import PdfPreview from './PdfPreview';
import ImageEditor from './ImageEditor';

// Local Image Viewer for full screen photos
const FullScreenImageViewer: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in zoom-in-95 duration-300">
    <div className="absolute top-6 right-6 z-10">
      <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all">
        <X className="w-6 h-6" />
      </button>
    </div>
    <div className="flex-1 flex items-center justify-center p-4">
      <img src={src} className="max-w-full max-h-full object-contain shadow-2xl" alt="Full Preview" />
    </div>
    <div className="p-10 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
       <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Full Resolution Preview</p>
    </div>
  </div>
);

const ScannerTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'raw' | 'typed'>('raw');
  const [progress, setProgress] = useState(0);
  const [ocrTexts, setOcrTexts] = useState<string[]>([]);
  const [filename, setFilename] = useState('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [isShutterActive, setIsShutterActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.error("Error accessing camera", err);
      alert("Camera access denied. Please enable permissions.");
    }
  };

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;
    if (capabilities.torch) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }]
        } as any);
        setTorchOn(!torchOn);
      } catch (e) {
        console.error("Torch error", e);
      }
    } else {
      alert("Flashlight not supported on this camera.");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsCameraActive(false);
  };

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        setIsShutterActive(true);
        setTimeout(() => setIsShutterActive(false), 150);

        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
        
        setCapturedImages(prev => {
          const newImages = [...prev, dataUrl];
          setActivePageIndex(newImages.length - 1);
          return newImages;
        });
        setOcrTexts(prev => [...prev, '']);
      }
    }
  }, [stream]);

  const performOcr = async (index: number) => {
    const currentImg = capturedImages[index];
    if (!currentImg) return;
    
    setIsProcessing(true);
    setProgress(0);
    try {
      const ocrSource = await preprocessForOcr(currentImg);
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing') setProgress(Math.floor(m.progress * 100));
        }
      });
      const { data: { text } } = await worker.recognize(ocrSource);
      await worker.terminate();
      
      setOcrTexts(prev => {
        const updated = [...prev];
        updated[index] = text;
        return updated;
      });
    } catch (err) {
      console.error("OCR Error:", err);
      alert("OCR failed to recognize text in this image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreview = async () => {
    if (capturedImages.length === 0) return;
    setIsProcessing(true);
    try {
      const blob = mode === 'typed' 
        ? await generatePdfFromText(ocrTexts.filter(t => t).join('\n\n') || "Empty Document")
        : await generatePdfFromImages(capturedImages);
      setPreviewBlob(blob);
    } catch (err) {
      alert("Generation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onEditSave = (newImg: string) => {
    const updated = [...capturedImages];
    updated[activePageIndex] = newImg;
    setCapturedImages(updated);
    setIsEditing(false);
    const newOcr = [...ocrTexts];
    newOcr[activePageIndex] = '';
    setOcrTexts(newOcr);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-40">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white rounded-full transition-colors text-slate-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-black text-slate-900">
            {isCameraActive ? 'Scanning' : 'Review'}
          </h2>
          {capturedImages.length > 0 && (
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
              {capturedImages.length} Page{capturedImages.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button 
          onClick={() => { setCapturedImages([]); setOcrTexts([]); startCamera(); }} 
          className="text-xs font-bold text-slate-400 hover:text-red-500"
        >
          Reset
        </button>
      </div>

      <div className="flex-1 px-4 space-y-6">
        {/* Viewfinder Area */}
        <div className={`relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-900 transition-all ${isShutterActive ? 'scale-95 brightness-150' : 'scale-100'}`}>
          {isCameraActive ? (
            <>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <button 
                onClick={toggleTorch}
                className={`absolute top-6 left-6 p-4 rounded-full backdrop-blur-md transition-all ${torchOn ? 'bg-yellow-400 text-slate-900 shadow-xl shadow-yellow-400/30' : 'bg-black/30 text-white'}`}
              >
                {torchOn ? <Sun className="w-6 h-6" /> : <SunDim className="w-6 h-6" />}
              </button>
            </>
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
              <img 
                src={capturedImages[activePageIndex]} 
                className="max-w-full max-h-full object-contain cursor-pointer" 
                alt="Preview" 
                onClick={() => setFullScreenImage(capturedImages[activePageIndex])}
              />
              
              <div className="absolute top-6 left-6 flex space-x-2">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-white text-blue-600 p-3 rounded-full shadow-lg active:scale-90 transition-transform"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setFullScreenImage(capturedImages[activePageIndex])}
                  className="bg-white text-slate-800 p-3 rounded-full shadow-lg active:scale-90 transition-transform"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>

              <button 
                onClick={() => {
                  const newImages = capturedImages.filter((_, i) => i !== activePageIndex);
                  const newOcr = ocrTexts.filter((_, i) => i !== activePageIndex);
                  setCapturedImages(newImages);
                  setOcrTexts(newOcr);
                  if (newImages.length === 0) startCamera();
                  else setActivePageIndex(Math.max(0, activePageIndex - 1));
                }}
                className="absolute top-6 right-6 bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600 active:scale-90 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        {isCameraActive ? (
          <div className="flex flex-col items-center space-y-8 pb-10">
            <div className="flex items-center space-x-12">
              <button 
                onClick={() => capturedImages.length > 0 && setFullScreenImage(capturedImages[capturedImages.length - 1])}
                className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg bg-slate-200"
              >
                {capturedImages.length > 0 && <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover" />}
              </button>
              <button 
                onClick={capture}
                className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full border-4 border-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
              >
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-blue-600 rounded-full" />
                </div>
              </button>
              {capturedImages.length > 0 ? (
                <button 
                  onClick={stopCamera}
                  className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
                >
                  <Check className="w-6 h-6" />
                </button>
              ) : (
                <div className="w-12" />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            <div className="flex space-x-3 overflow-x-auto pb-4 px-2 scrollbar-hide">
              {capturedImages.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActivePageIndex(idx)}
                  className={`relative flex-shrink-0 w-20 h-24 rounded-2xl overflow-hidden border-4 transition-all ${activePageIndex === idx ? 'border-blue-600 scale-105 shadow-xl' : 'border-transparent opacity-60'}`}
                >
                  <img src={img} className="w-full h-full object-cover" />
                </button>
              ))}
              <button 
                onClick={startCamera}
                className="flex-shrink-0 w-20 h-24 rounded-2xl border-4 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center space-y-1 text-slate-400"
              >
                <Plus className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase">Add</span>
              </button>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button onClick={() => setMode('raw')} className={`flex-1 py-3 rounded-xl ${mode === 'raw' ? 'bg-white shadow text-blue-600 font-black' : 'text-slate-500 font-bold'}`}>Original</button>
                <button onClick={() => { setMode('typed'); performOcr(activePageIndex); }} className={`flex-1 py-3 rounded-xl ${mode === 'typed' ? 'bg-white shadow text-blue-600 font-black' : 'text-slate-500 font-bold'}`}>OCR Text</button>
              </div>

              {mode === 'typed' && (
                <textarea 
                  value={ocrTexts[activePageIndex] || ''}
                  onChange={(e) => {
                    const updated = [...ocrTexts];
                    updated[activePageIndex] = e.target.value;
                    setOcrTexts(updated);
                  }}
                  className="w-full h-40 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              )}

              <button 
                onClick={handlePreview}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg flex items-center justify-center active:scale-95 transition-all"
              >
                <Eye className="w-5 h-5 mr-2" /> Preview & Save PDF
              </button>
            </div>
          </div>
        )}
      </div>

      {isEditing && (
        <ImageEditor 
          image={capturedImages[activePageIndex]} 
          onSave={onEditSave}
          onCancel={() => setIsEditing(false)}
        />
      )}

      {fullScreenImage && (
        <FullScreenImageViewer src={fullScreenImage} onClose={() => setFullScreenImage(null)} />
      )}

      {previewBlob && (
        <PdfPreview 
          blob={previewBlob} 
          filename={filename.trim() || `Scan_${Date.now()}.pdf`} 
          onClose={() => setPreviewBlob(null)}
          onDownload={() => downloadBlob(previewBlob, filename || `Scan_${Date.now()}.pdf`)}
          onShare={() => shareBlob(previewBlob, filename || `Scan_${Date.now()}.pdf`)}
        />
      )}
    </div>
  );
};

export default ScannerTool;
