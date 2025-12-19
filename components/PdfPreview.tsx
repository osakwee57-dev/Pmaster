
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { X, Download, Share2, ExternalLink, FileWarning, Maximize2, Loader2, FileText, Minimize2, Eye } from 'lucide-react';

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
  
  // Generate a strictly typed PDF blob URL
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
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => {
      clearTimeout(timer);
      // We delay revocation slightly to ensure any "Open in new tab" requests finish loading
      if (pdfUrl) {
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
      }
    };
  }, [pdfUrl]);

  const toggleNativeFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Fullscreen error: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const openInNewTab = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 100);
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-300"
    >
      {/* Top Navigation */}
      <div className={`px-4 sm:px-6 py-4 flex justify-between items-center z-20 transition-all ${isFullscreen ? 'bg-black/80 backdrop-blur border-b border-white/10' : 'bg-white border-b border-slate-200'}`}>
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${isFullscreen ? 'bg-white/10' : 'bg-blue-600 shadow-blue-500/20'}`}>
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <h3 className={`font-black text-xs sm:text-sm tracking-tight leading-none mb-1 truncate ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>{filename}</h3>
            <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${isFullscreen ? 'text-white/40' : 'text-slate-400'}`}>Document Preview</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button 
            onClick={openInNewTab}
            className={`flex items-center px-3 sm:px-4 py-2 rounded-xl border font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all active:scale-95 ${isFullscreen ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'}`}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
          </button>
          <button 
            onClick={toggleNativeFullscreen}
            className={`flex p-2.5 rounded-full border transition-all active:scale-90 ${isFullscreen ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button 
            onClick={onClose}
            className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full border border-red-400 transition-all active:scale-90 shadow-lg shadow-red-500/20"
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
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Rendering View</p>
          </div>
        )}

        {pdfUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <iframe 
              src={pdfUrl}
              className="w-full h-full border-none bg-white"
              title="PDF View"
              onLoad={() => setIsLoading(false)}
            />
            
            {/* Mobile Fallback Overlay */}
            {!isLoading && (
              <div className="absolute inset-x-0 bottom-6 px-6 pointer-events-none sm:hidden">
                <div className="bg-white/95 backdrop-blur-sm p-5 rounded-3xl shadow-2xl pointer-events-auto flex items-center justify-between animate-in slide-in-from-bottom-4">
                   <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Maximize2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-slate-900 text-xs">Mobile Viewer</p>
                        <p className="text-slate-500 text-[10px] font-bold">Best viewed full-screen</p>
                      </div>
                   </div>
                   <button 
                     onClick={openInNewTab}
                     className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95"
                   >
                     View Full Screen
                   </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center p-10 space-y-6">
            <FileWarning className="w-16 h-16 text-slate-500" />
            <div className="text-white">
              <h4 className="text-xl font-black">Display Error</h4>
              <p className="text-slate-400 font-medium max-w-xs mt-2 text-sm">We couldn't generate the preview. Please try downloading the file.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      {!isFullscreen && (
        <div className="p-6 md:p-8 bg-white border-t border-slate-100 flex flex-col sm:flex-row gap-4 shadow-2xl">
          <button 
            onClick={onDownload}
            className="flex-1 flex items-center justify-center bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Download className="w-5 h-5 mr-3" /> Download PDF
          </button>
          <button 
            onClick={onShare}
            className="flex-1 flex items-center justify-center bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <Share2 className="w-5 h-5 mr-3" /> Share PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfPreview;
