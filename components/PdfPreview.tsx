
import React from 'react';
import { X, Download, Share2 } from 'lucide-react';

interface PdfPreviewProps {
  blob: Blob;
  filename: string;
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ blob, filename, onClose, onDownload, onShare }) => {
  const pdfUrl = React.useMemo(() => URL.createObjectURL(blob), [blob]);

  React.useEffect(() => {
    return () => URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800">Preview</h3>
            <p className="text-xs text-slate-500 truncate max-w-[200px]">{filename}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>
        
        <div className="flex-1 bg-slate-200 relative">
          <iframe 
            src={`${pdfUrl}#toolbar=0`}
            className="w-full h-full border-none"
            title="PDF Preview"
          />
        </div>

        <div className="p-6 bg-white border-t grid grid-cols-2 gap-4">
          <button 
            onClick={onDownload}
            className="flex items-center justify-center bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-all active:scale-95"
          >
            <Download className="w-5 h-5 mr-2" /> Download
          </button>
          <button 
            onClick={onShare}
            className="flex items-center justify-center bg-green-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-green-700 transition-all active:scale-95"
          >
            <Share2 className="w-5 h-5 mr-2" /> Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfPreview;
