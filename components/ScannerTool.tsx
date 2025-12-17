
import React, { useState, useRef, useCallback } from 'react';
import { Camera, RefreshCw, Check, Download, Share2, Type as TypeIcon, Image as ImageIcon, Eye, FileEdit, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera", err);
      alert("Could not access camera. Please check permissions.");
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
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImages(prev => [...prev, dataUrl]);
        setOcrTexts(prev => [...prev, '']);
        setActivePageIndex(capturedImages.length);
        stopCamera();
      }
    }
  }, [stream, capturedImages]);

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

  const reset = () => {
    setCapturedImages([]);
    setOcrTexts([]);
    setFilename('');
    setPreviewBlob(null);
    setProgress(0);
    startCamera();
  };

  const performOcr = async () => {
    const currentImg = capturedImages[activePageIndex];
    if (!currentImg) return;
    setIsProcessing(true);
    try {
      const { data: { text } } = await Tesseract.recognize(currentImg, 'eng', {
        logger: m => {
          if (m.status === 'recognizing') setProgress(Math.floor(m.progress * 100));
        }
      });
      const updatedOcr = [...ocrTexts];
      updatedOcr[activePageIndex] = text;
      setOcrTexts(updatedOcr);
    } catch (err) {
      alert("OCR failed.");
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
        blob = await generatePdfFromText(ocrTexts.join('\n\n--- Page Break ---\n\n'));
      } else {
        blob = await generatePdfFromImages(capturedImages);
      }
      setPreviewBlob(blob);
    } catch (err) {
      alert("Error generating preview.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getFinalFilename = () => {
    const base = filename.trim() || `scanned_doc_${Date.now()}`;
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

  const handleShare = async () => {
    let blob = previewBlob;
    if (!blob) {
      if (mode === 'typed') blob = await generatePdfFromText(ocrTexts.join('\n\n'));
      else blob = await generatePdfFromImages(capturedImages);
    }
    await shareBlob(blob, getFinalFilename());
  };

  React.useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto p-4 space-y-6 pb-24">
      <div className="w-full flex justify-between items-center mb-2">
        <button onClick={onBack} className="text-blue-600 font-semibold p-2 hover:bg-blue-50 rounded-lg flex items-center">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </button>
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-800">Scanner</h2>
          {capturedImages.length > 0 && (
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{capturedImages.length} Page{capturedImages.length > 1 ? 's' : ''} Captured</p>
          )}
        </div>
        <button onClick={reset} className="text-slate-400 font-bold text-sm hover:text-red-500 transition-colors">Reset</button>
      </div>

      <div className="w-full aspect-[3/4] bg-slate-900 rounded-[2.5rem] overflow-hidden relative shadow-2xl border-4 border-white">
        {isCameraActive ? (
          <>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute top-6 right-6 bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
              <span className="text-white text-xs font-black uppercase tracking-widest">Live View</span>
            </div>
            <button 
              onClick={capture}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white/20 backdrop-blur-md rounded-full border-4 border-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 rounded-full" />
              </div>
            </button>
          </>
        ) : (
          <div className="w-full h-full relative group bg-slate-100">
            <img src={capturedImages[activePageIndex]} className="w-full h-full object-contain" alt={`Page ${activePageIndex + 1}`} />
            
            {/* Page Navigation Overlay */}
            {capturedImages.length > 1 && (
              <div className="absolute inset-y-0 w-full flex justify-between items-center px-4 pointer-events-none">
                <button 
                  disabled={activePageIndex === 0}
                  onClick={() => setActivePageIndex(prev => prev - 1)}
                  className="w-10 h-10 rounded-full bg-white/80 shadow-lg flex items-center justify-center pointer-events-auto disabled:opacity-0 transition-opacity"
                >
                  <ChevronLeft className="w-6 h-6 text-slate-800" />
                </button>
                <button 
                  disabled={activePageIndex === capturedImages.length - 1}
                  onClick={() => setActivePageIndex(prev => prev + 1)}
                  className="w-10 h-10 rounded-full bg-white/80 shadow-lg flex items-center justify-center pointer-events-auto disabled:opacity-0 transition-opacity"
                >
                  <ChevronRight className="w-6 h-6 text-slate-800" />
                </button>
              </div>
            )}

            <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg">
              Page {activePageIndex + 1} / {capturedImages.length}
            </div>
            
            <button 
              onClick={() => removePage(activePageIndex)}
              className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg active:scale-90 transition-transform"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {capturedImages.length > 0 && !isCameraActive && (
        <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          
          {/* Thumbnail Strip */}
          <div className="flex space-x-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
            {capturedImages.map((img, idx) => (
              <button 
                key={idx}
                onClick={() => setActivePageIndex(idx)}
                className={`relative flex-shrink-0 w-16 h-20 rounded-xl overflow-hidden border-2 transition-all ${activePageIndex === idx ? 'border-blue-600 scale-105 shadow-md' : 'border-transparent opacity-60'}`}
              >
                <img src={img} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1 rounded-tl-lg font-bold">P{idx + 1}</div>
              </button>
            ))}
            <button 
              onClick={startCamera}
              className="flex-shrink-0 w-16 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              <Plus className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1 tracking-widest">Document Title</label>
              <input 
                type="text"
                placeholder="Name your file..."
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white shadow-sm font-semibold"
              />
            </div>

            <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem]">
              <button 
                onClick={() => setMode('raw')}
                className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all ${mode === 'raw' ? 'bg-white shadow-md text-blue-600 font-black' : 'text-slate-500 font-bold'}`}
              >
                <ImageIcon className="w-4 h-4 mr-2" /> Visual PDF
              </button>
              <button 
                onClick={() => {
                  setMode('typed');
                  if (!ocrTexts[activePageIndex]) performOcr();
                }}
                className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all ${mode === 'typed' ? 'bg-white shadow-md text-blue-600 font-black' : 'text-slate-500 font-bold'}`}
              >
                <TypeIcon className="w-4 h-4 mr-2" /> Typed (OCR)
              </button>
            </div>

            {mode === 'typed' && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black text-slate-500 flex items-center uppercase tracking-widest">
                    <FileEdit className="w-3 h-3 mr-1.5" /> Content: Page {activePageIndex + 1}
                  </label>
                  {isProcessing && <span className="text-[10px] text-blue-600 font-black animate-pulse">Scanning: {progress}%</span>}
                </div>
                <textarea 
                  value={ocrTexts[activePageIndex]}
                  onChange={(e) => {
                    const updated = [...ocrTexts];
                    updated[activePageIndex] = e.target.value;
                    setOcrTexts(updated);
                  }}
                  placeholder="Recognizing text from image..."
                  className="w-full h-40 p-5 rounded-2xl border-2 border-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white shadow-inner text-sm leading-relaxed font-medium"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button 
                disabled={isProcessing}
                onClick={handlePreview}
                className="col-span-2 flex items-center justify-center bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95"
              >
                <Eye className="w-5 h-5 mr-2" /> Full Preview
              </button>
              <button 
                disabled={isProcessing}
                onClick={handleDownload}
                className="flex items-center justify-center bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
              >
                <Download className="w-5 h-5 mr-2" /> Download
              </button>
              <button 
                disabled={isProcessing}
                onClick={handleShare}
                className="flex items-center justify-center bg-green-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95"
              >
                <Share2 className="w-5 h-5 mr-2" /> Share PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {previewBlob && (
        <PdfPreview 
          blob={previewBlob} 
          filename={getFinalFilename()} 
          onClose={() => setPreviewBlob(null)}
          onDownload={handleDownload}
          onShare={handleShare}
        />
      )}
    </div>
  );
};

export default ScannerTool;
