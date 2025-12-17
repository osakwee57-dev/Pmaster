
import React, { useState, useRef, useCallback } from 'react';
import { Camera, RefreshCw, Check, Download, Share2, Type as TypeIcon, Image as ImageIcon } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { generatePdfFromImages, generatePdfFromText, downloadBlob, shareBlob } from '../services/pdfService';

const ScannerTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'raw' | 'typed'>('raw');
  const [progress, setProgress] = useState(0);
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
        // Stop stream
        stream?.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  }, [stream]);

  const reset = () => {
    setCapturedImage(null);
    setProgress(0);
    startCamera();
  };

  const handleAction = async (action: 'download' | 'share') => {
    if (!capturedImage) return;
    setIsProcessing(true);

    try {
      let blob: Blob;
      if (mode === 'typed') {
        const { data: { text } } = await Tesseract.recognize(capturedImage, 'eng', {
          logger: m => {
            if (m.status === 'recognizing') setProgress(Math.floor(m.progress * 100));
          }
        });
        blob = await generatePdfFromText(text);
      } else {
        blob = await generatePdfFromImages([capturedImage]);
      }

      const filename = `scanned_doc_${Date.now()}.pdf`;
      if (action === 'download') {
        downloadBlob(blob, filename);
      } else {
        await shareBlob(blob, filename);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to process document.");
    } finally {
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto p-4 space-y-6">
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-blue-600 font-semibold">&larr; Back</button>
        <h2 className="text-2xl font-bold text-slate-800">Scan Picture</h2>
        <div className="w-12"></div>
      </div>

      <div className="w-full aspect-[3/4] bg-slate-200 rounded-2xl overflow-hidden relative shadow-inner border border-slate-300">
        {!capturedImage ? (
          <>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <button 
              onClick={capture}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-blue-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-full" />
            </button>
          </>
        ) : (
          <img src={capturedImage} className="w-full h-full object-contain" alt="Captured" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {capturedImage && (
        <div className="w-full space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setMode('raw')}
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg transition-colors ${mode === 'raw' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              <ImageIcon className="w-4 h-4 mr-2" /> Raw PDF
            </button>
            <button 
              onClick={() => setMode('typed')}
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg transition-colors ${mode === 'typed' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              <TypeIcon className="w-4 h-4 mr-2" /> Typed Form
            </button>
          </div>

          {isProcessing && (
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={reset}
              className="flex items-center justify-center bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-300"
            >
              <RefreshCw className="w-5 h-5 mr-2" /> Retake
            </button>
            <button 
              disabled={isProcessing}
              onClick={() => handleAction('download')}
              className="flex items-center justify-center bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Download className="w-5 h-5 mr-2" /> Download
            </button>
            <button 
              disabled={isProcessing}
              onClick={() => handleAction('share')}
              className="col-span-2 flex items-center justify-center bg-green-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Share2 className="w-5 h-5 mr-2" /> Share PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerTool;
