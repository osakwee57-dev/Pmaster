
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera as CameraIcon, Check, Download, Share2, Type as TypeIcon, Image as ImageIcon, Eye, FileEdit, Plus, Trash2, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { generatePdfFromImages, generatePdfFromText, downloadBlob, shareBlob } from '../services/pdfService';
import PdfPreview from './PdfPreview';

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera", err);
      alert("Camera access denied. Please enable permissions in your browser settings.");
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
        // Shutter animation
        setIsShutterActive(true);
        setTimeout(() => setIsShutterActive(false), 150);

        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        
        setCapturedImages(prev => {
          const newImages = [...prev, dataUrl];
          setActivePageIndex(newImages.length - 1);
          return newImages;
        });
        setOcrTexts(prev => [...prev, '']);
      }
    }
  }, [stream]);

  const removePage = (index: number) => {
    const newImages = capturedImages.filter((_, i) => i !== index);
    const newOcrTexts = ocrTexts.filter((_, i) => i !== index);
    setCapturedImages(newImages);
    setOcrTexts(newOcrTexts);
    if (activePageIndex >= newImages.length) {
      setActivePageIndex(Math.max(0, newImages.length - 1));
    }
    if (newImages.length === 0) {
      startCamera();
    }
  };

  const performOcr = async (index: number) => {
    const currentImg = capturedImages[index];
    if (!currentImg || ocrTexts[index]) return;
    
    setIsProcessing(true);
    try {
      const { data: { text } } = await Tesseract.recognize(currentImg, 'eng', {
        logger: m => {
          if (m.status === 'recognizing') setProgress(Math.floor(m.progress * 100));
        }
      });
      setOcrTexts(prev => {
        const updated = [...prev];
        updated[index] = text;
        return updated;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreview = async () => {
    if (capturedImages.length === 0) return;
    setIsProcessing(true);
    try {
      let blob: Blob;
      if (mode === 'typed') {
        blob = await generatePdfFromText(ocrTexts.filter(t => t).join('\n\n'));
      } else {
        blob = await generatePdfFromImages(capturedImages);
      }
      setPreviewBlob(blob);
    } catch (err) {
      alert("Failed to generate preview.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getFinalFilename = () => {
    const base = filename.trim() || `Scan_${new Date().toLocaleDateString().replace(/\//g, '-')}`;
    return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  };

  const handleDownload = async () => {
    let blob = previewBlob;
    if (!blob) {
      if (mode === 'typed') blob = await generatePdfFromText(ocrTexts.join('\n\n'));
      else blob = await generatePdfFromImages(capturedImages);
    }
    downloadBlob(blob, getFinalFilename());
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Dynamic Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-40">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white rounded-full transition-colors text-slate-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            {isCameraActive ? 'Scanning Document' : 'Review & Edit'}
          </h2>
          {capturedImages.length > 0 && (
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">
              {capturedImages.length} Page{capturedImages.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button 
          onClick={() => {
            setCapturedImages([]);
            setOcrTexts([]);
            startCamera();
          }} 
          className="text-xs font-bold text-slate-400 hover:text-red-500"
        >
          Reset
        </button>
      </div>

      <div className="flex-1 px-4 space-y-6">
        {/* Viewfinder / Previewer */}
        <div className={`relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-slate-900 transition-all ${isShutterActive ? 'scale-95 brightness-150' : 'scale-100'}`}>
          {isCameraActive ? (
            <>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {/* Overlay graphics */}
              <div className="absolute inset-0 border-[20px] border-white/5 pointer-events-none">
                <div className="w-full h-full border border-white/20 rounded-2xl" />
              </div>
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                <p className="text-white text-[10px] font-bold uppercase tracking-[0.2em]">Align document</p>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
              <img src={capturedImages[activePageIndex]} className="max-w-full max-h-full object-contain" alt="Preview" />
              
              {capturedImages.length > 1 && (
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                  <button 
                    disabled={activePageIndex === 0}
                    onClick={() => setActivePageIndex(p => p - 1)}
                    className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center pointer-events-auto disabled:opacity-0 transition-opacity"
                  >
                    <ChevronLeft className="w-6 h-6 text-slate-800" />
                  </button>
                  <button 
                    disabled={activePageIndex === capturedImages.length - 1}
                    onClick={() => setActivePageIndex(p => p + 1)}
                    className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center pointer-events-auto disabled:opacity-0 transition-opacity"
                  >
                    <ChevronRight className="w-6 h-6 text-slate-800" />
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => removePage(activePageIndex)}
                className="absolute top-6 right-6 bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        {isCameraActive ? (
          <div className="flex flex-col items-center space-y-8 pb-10">
            <div className="flex items-center space-x-12">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg bg-slate-200">
                {capturedImages.length > 0 && <img src={capturedImages[capturedImages.length - 1]} className="w-full h-full object-cover" />}
              </div>
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
                  className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  <Check className="w-6 h-6" />
                </button>
              ) : (
                <div className="w-12" />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Slider */}
            <div className="flex space-x-3 overflow-x-auto pb-4 scrollbar-hide px-2">
              {capturedImages.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActivePageIndex(idx)}
                  className={`relative flex-shrink-0 w-20 h-24 rounded-2xl overflow-hidden border-4 transition-all ${activePageIndex === idx ? 'border-blue-600 scale-105 shadow-xl' : 'border-transparent opacity-60'}`}
                >
                  <img src={img} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/10" />
                  <span className="absolute bottom-1 right-2 text-[10px] text-white font-black">{idx + 1}</span>
                </button>
              ))}
              <button 
                onClick={startCamera}
                className="flex-shrink-0 w-20 h-24 rounded-2xl border-4 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center space-y-1 text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-colors"
              >
                <Plus className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase">Add</span>
              </button>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200 border border-slate-100 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Document Name</label>
                <input 
                  type="text"
                  placeholder="Scan Title..."
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-800"
                />
              </div>

              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                <button 
                  onClick={() => setMode('raw')}
                  className={`flex-1 flex items-center justify-center py-3 rounded-xl transition-all ${mode === 'raw' ? 'bg-white shadow text-blue-600 font-black' : 'text-slate-500 font-bold'}`}
                >
                  <ImageIcon className="w-4 h-4 mr-2" /> Visual
                </button>
                <button 
                  onClick={() => {
                    setMode('typed');
                    performOcr(activePageIndex);
                  }}
                  className={`flex-1 flex items-center justify-center py-3 rounded-xl transition-all ${mode === 'typed' ? 'bg-white shadow text-blue-600 font-black' : 'text-slate-500 font-bold'}`}
                >
                  <TypeIcon className="w-4 h-4 mr-2" /> OCR Text
                </button>
              </div>

              {mode === 'typed' && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Page {activePageIndex + 1} Content</p>
                    {isProcessing && <span className="flex items-center text-[10px] text-blue-600 font-black animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {progress}%</span>}
                  </div>
                  <textarea 
                    value={ocrTexts[activePageIndex]}
                    onChange={(e) => {
                      const updated = [...ocrTexts];
                      updated[activePageIndex] = e.target.value;
                      setOcrTexts(updated);
                    }}
                    className="w-full h-48 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handlePreview}
                  disabled={isProcessing}
                  className="col-span-2 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
                >
                  <Eye className="w-5 h-5 mr-2" /> Full Preview
                </button>
                <button 
                  onClick={handleDownload}
                  disabled={isProcessing}
                  className="py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center"
                >
                  <Download className="w-5 h-5 mr-2" /> Download
                </button>
                <button 
                  onClick={() => shareBlob(previewBlob!, getFinalFilename())}
                  disabled={isProcessing || !previewBlob}
                  className="py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  <Share2 className="w-5 h-5 mr-2" /> Share
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {previewBlob && (
        <PdfPreview 
          blob={previewBlob} 
          filename={getFinalFilename()} 
          onClose={() => setPreviewBlob(null)}
          onDownload={handleDownload}
          onShare={() => shareBlob(previewBlob!, getFinalFilename())}
        />
      )}
    </div>
  );
};

export default ScannerTool;
