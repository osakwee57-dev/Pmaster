
import React, { useMemo, useEffect } from 'react';
import { X, Download, Share2, ExternalLink, FileWarning } from 'lucide-react';

interface PdfPreviewProps {
  blob: Blob;
  filename: string;
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ blob, filename, onClose, onDownload, onShare }) => {
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
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl p-4 md:p-8 flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-5xl h-full flex flex-col bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-white/10">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50 backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <ExternalLink className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 tracking-tight leading-none mb-1">Preview Result</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[180px]">{filename}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white hover:bg-slate-100 text-slate-900 rounded-full shadow-md border border-slate-200 transition-all active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 bg-slate-100 overflow-hidden relative group">
          {pdfUrl ? (
             <object 
              data={pdfUrl} 
              type="application/pdf" 
              className="w-full h-full"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 space-y-6">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center">
                  <FileWarning className="w-10 h-10 text-slate-400" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-800">Preview Unavailable</h4>
                  <p className="text-slate-500 font-medium max-w-xs mt-2">Your browser can't display the preview, but you can still download or share the document.</p>
                </div>
                <button 
                  onClick={() => window.open(pdfUrl, '_blank')}
                  className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black shadow-xl active:scale-95 transition-all"
                >
                  Open in New Tab
                </button>
              </div>
            </object>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              Generating Preview...
            </div>
          )}
        </div>

        <div className="p-8 grid grid-cols-2 gap-4 bg-slate-50/80 backdrop-blur-sm border-t">
          <button 
            onClick={onDownload}
            className="flex items-center justify-center bg-blue-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Download className="w-5 h-5 mr-2" /> Save PDF
          </button>
          <button 
            onClick={onShare}
            className="flex items-center justify-center bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <Share2 className="w-5 h-5 mr-2" /> Share PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfPreview;
