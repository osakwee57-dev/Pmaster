
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { X, Download, Share2, ExternalLink, FileWarning, Maximize2, Loader2, FileText, Minimize2 } from 'lucide-react';

interface PdfPreviewProps {
  blob: Blob;
  filename: string;
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ blob, filename, onClose, onDownload, onShare }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const pdfUrl = useMemo(() => {
    try {
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      return URL.createObjectURL(pdfBlob);
    } catch (e) {
      console.error("Blob creation failed", e);
      return '';
    }
  }, [blob]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => {
      clearTimeout(timer);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const toggleNativeFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const openInNewTab = () => {
    if (pdfUrl) window.open(pdfUrl, '_blank');
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300"
    >
      {/* Top Navigation */}
      <div className={`px-6 py-4 flex justify-between items-center z-20 transition-all ${isFullscreen ? 'bg-black/80 backdrop-blur border-b border-white/10' : 'bg-white border-b border-slate-200'}`}>
        <div className="flex items-center space-x-4 overflow-hidden">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${isFullscreen ? 'bg-white/10' : 'bg-blue-600 shadow-blue-500/20'}`}>
            <FileText className={`w-5 h-5 ${isFullscreen ? 'text-white' : 'text-white'}`} />
          </div>
          <div className="overflow-hidden">
            <h3 className={`font-black text-sm tracking-tight leading-none mb-1 truncate ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>{filename}</h3>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isFullscreen ? 'text-white/40' : 'text-slate-400'}`}>Preview Mode</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button 
            onClick={toggleNativeFullscreen}
            className={`p-2.5 rounded-full border transition-all active:scale-90 ${isFullscreen ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button 
            onClick={onClose}
            className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full border border-red-400 transition-all active:scale-90 shadow-lg shadow-red-500/20"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-slate-900 flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-slate-900 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Loading Immersive Viewer</p>
          </div>
        )}

        {pdfUrl ? (
          <div className="w-full h-full">
            <iframe 
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full border-none"
              title="PDF Full Preview"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center text-center p-10 space-y-6">
            <FileWarning className="w-16 h-16 text-slate-500" />
            <div className="text-white">
              <h4 className="text-xl font-black">Preview Restricted</h4>
              <p className="text-slate-400 font-medium max-w-xs mt-2 text-sm">This browser restricted local PDF rendering. You can still download the file below.</p>
            </div>
            <button onClick={openInNewTab} className="bg-white text-black px-8 py-3 rounded-2xl font-black shadow-xl flex items-center">
              <ExternalLink className="w-4 h-4 mr-2" /> Open In External Tab
            </button>
          </div>
        )}
      </div>

      {/* Footer Controls (Hidden in native fullscreen for maximum space) */}
      {!isFullscreen && (
        <div className="p-6 md:p-8 bg-white border-t border-slate-100 flex flex-col sm:flex-row gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <button 
            onClick={onDownload}
            className="flex-1 flex items-center justify-center bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Download className="w-5 h-5 mr-3" /> Download
          </button>
          <button 
            onClick={onShare}
            className="flex-1 flex items-center justify-center bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <Share2 className="w-5 h-5 mr-3" /> Share
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfPreview;
