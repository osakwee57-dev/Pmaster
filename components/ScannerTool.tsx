
import React, { useState, useRef, useCallback } from 'react';
import { Camera, RefreshCw, Check, Download, Share2, Type as TypeIcon, Image as ImageIcon, Eye, FileEdit } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { generatePdfFromImages, generatePdfFromText, downloadBlob, shareBlob } from '../services/pdfService';
import PdfPreview from './PdfPreview';

const ScannerTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'raw' | 'typed'>('raw');
  const [progress, setProgress] = useState(0);
  const [ocrText, setOcrText] = useState('');
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
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stream?.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  }, [stream]);

  const reset = () => {
    setCapturedImage(null);
    setOcrText('');
    setFilename('');
    setPreviewBlob(null);
    setProgress(0);
    startCamera();
  };

  const performOcr = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    try {
      const { data: { text } } = await Tesseract.recognize(capturedImage, 'eng', {
        logger: m => {
          if (m.status === 'recognizing') setProgress(Math.floor(m.progress * 100));
        }
      });
      setOcrText(text);
    } catch (err) {
      alert("OCR failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreview = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    try {
      let blob: Blob;
      if (mode === 'typed') {
        blob = await generatePdfFromText(ocrText);
      } else {
        blob = await generatePdfFromImages([capturedImage]);
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
      if (mode === 'typed') blob = await generatePdfFromText(ocrText);
      else blob = await generatePdfFromImages([capturedImage!]);
    }
    downloadBlob(blob, getFinalFilename());
  };

  const handleShare = async () => {
    let blob = previewBlob;
    if (!blob) {
      if (mode === 'typed') blob = await generatePdfFromText(ocrText);
      else blob = await generatePdfFromImages([capturedImage!]);
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
    <div className="flex flex-col items-center max-w-2xl mx-auto p-4 space-y-6 pb-20">
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-blue-600 font-semibold p-2 hover:bg-blue-50 rounded-lg">&larr; Back</button>
        <h2 className="text-2xl font-bold text-slate-800">Scan Document</h2>
        <div className="w-12"></div>
      </div>

      <div className="w-full aspect-[3/4] bg-slate-200 rounded-3xl overflow-hidden relative shadow-2xl border border-slate-300">
        {!capturedImage ? (
          <>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <button 
              onClick={capture}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 bg-white/20 backdrop-blur-md rounded-full border-4 border-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 rounded-full" />
              </div>
            </button>
          </>
        ) : (
          <img src={capturedImage} className="w-full h-full object-contain" alt="Captured" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {capturedImage && (
        <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-600 px-1">PDF File Name</label>
            <input 
              type="text"
              placeholder="Enter file name (e.g. Invoice_March)"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white shadow-sm"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
              onClick={() => setMode('raw')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all ${mode === 'raw' ? 'bg-white shadow-md text-blue-600 font-bold' : 'text-slate-500'}`}
            >
              <ImageIcon className="w-4 h-4 mr-2" /> Raw PDF
            </button>
            <button 
              onClick={() => {
                setMode('typed');
                if (!ocrText) performOcr();
              }}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-xl transition-all ${mode === 'typed' ? 'bg-white shadow-md text-blue-600 font-bold' : 'text-slate-500'}`}
            >
              <TypeIcon className="w-4 h-4 mr-2" /> Typed (OCR)
            </button>
          </div>

          {mode === 'typed' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-bold text-slate-600 flex items-center">
                  <FileEdit className="w-4 h-4 mr-1" /> Edit Recognized Text
                </label>
                {isProcessing && <span className="text-xs text-blue-600 animate-pulse">OCR in progress: {progress}%</span>}
              </div>
              <textarea 
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                placeholder="Extracting text..."
                className="w-full h-40 p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white shadow-inner text-sm leading-relaxed"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={reset}
              className="flex items-center justify-center bg-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-300 transition-colors"
            >
              <RefreshCw className="w-5 h-5 mr-2" /> Retake
            </button>
            <button 
              disabled={isProcessing}
              onClick={handlePreview}
              className="flex items-center justify-center bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
            >
              <Eye className="w-5 h-5 mr-2" /> Preview
            </button>
            <button 
              disabled={isProcessing}
              onClick={handleDownload}
              className="flex items-center justify-center bg-blue-600 text-white py-4 rounded-xl font-bold shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
            >
              <Download className="w-5 h-5 mr-2" /> Download
            </button>
            <button 
              disabled={isProcessing}
              onClick={handleShare}
              className="flex items-center justify-center bg-green-600 text-white py-4 rounded-xl font-bold shadow-xl hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95"
            >
              <Share2 className="w-5 h-5 mr-2" /> Share
            </button>
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
