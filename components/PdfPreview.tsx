
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
  const [iframeError, setIframeError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Generate a strictly typed PDF blob URL
  const pdfUrl = useMemo(() => {
    try {
      // Ensure the blob is explicitly marked as PDF
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      return URL.createObjectURL(pdfBlob);
    } catch (e) {
      console.error("Blob creation failed", e);
      return '';
    }
  }, [blob]);

  useEffect(() => {
    // Longer timeout for mobile devices to attempt rendering
    const timer = setTimeout(() => {
      setIsLoading(false);
      // After 3 seconds, if it's still "loading" or blank, we might want to suggest opening externally
    }, 1500);

    return () => {
      clearTimeout(timer);
      // Important: Only revoke when the component is destroyed to keep the URL valid for window.open
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
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

  /**
   * Robust 'Open in New Tab' implementation.
   * Direct window.open(blobUrl) can be blocked or fail to load content in some browsers.
   * Creating a temporary link and clicking it is generally more reliable.
   */
  const openInNewTab = () => {
    if (!pdfUrl) return;
    
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // Append to body to ensure it works in all browsers
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 100);
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300"
    >
      {/* Top Navigation */}
      <div className={`px-4 sm:px-6 py-4 flex justify-between items-center z-20 transition-all ${isFullscreen ? 'bg-black/80 backdrop-blur border-b border-white/10' : 'bg-white border-b border-slate-200'}`}>
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${isFullscreen ? 'bg-white/10' : 'bg-blue-600 shadow-blue-500/20'}`}>
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <h3 className={`font-black text-xs sm:text-sm tracking-tight leading-none mb-1 truncate ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>{filename}</h3>
            <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${isFullscreen ? 'text-white/40' : 'text-slate-400'}`}>Secure Preview</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button 
            onClick={openInNewTab}
            className={`flex items-center px-3 sm:px-4 py-2 rounded-xl border font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all active:scale-95 ${isFullscreen ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'}`}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
          </button>
          <button 
            onClick={toggleNativeFullscreen}
            className={`hidden sm:flex p-2.5 rounded-full border transition-all active:scale-90 ${isFullscreen ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
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
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Generating Live Preview</p>
          </div>
        )}

        {pdfUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {/* iframe fallback messaging - many mobile browsers can't show PDFs in iframes */}
            <iframe 
              src={pdfUrl}
              className="w-full h-full border-none"
              title="PDF View"
              onLoad={() => {
                setIsLoading(false);
                setIframeError(false);
              }}
              onError={() => setIframeError(true)}
            />
            
            {/* Mobile / Fallback View: If the iframe is blank or device is small, offer an explicit 'View' button */}
            {!isLoading && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px] sm:hidden">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center max-w-xs pointer-events-auto animate-in zoom-in-95">
                   <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <Eye className="w-8 h-8 text-blue-600" />
                   </div>
                   <h4 className="font-black text-slate-900 text-lg mb-2">View Document</h4>
                   <p className="text-slate-500 text-xs font-bold mb-6">Mobile browsers require opening PDFs in a full-screen native viewer.</p>
                   <button 
                     onClick={openInNewTab}
                     className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center"
                   >
                     <ExternalLink className="w-4 h-4 mr-2" /> Open Full Screen
                   </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center p-10 space-y-6">
            <FileWarning className="w-16 h-16 text-slate-500" />
            <div className="text-white">
              <h4 className="text-xl font-black">Memory Restricted</h4>
              <p className="text-slate-400 font-medium max-w-xs mt-2 text-sm">Could not generate a temporary local URL. Try downloading directly.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
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
