
import React, { useState } from 'react';
import { FileDown, Download, Share2, FileCheck, Loader2, Eye } from 'lucide-react';
import { compressPdf, downloadBlob, shareBlob } from '../services/pdfService';
import PdfPreview from './PdfPreview';

const CompressPdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [filename, setFilename] = useState('');
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setFilename(selected.name.replace('.pdf', ''));
      setCompressedBlob(null);
    } else {
      alert("Please select a valid PDF file.");
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const resultBlob = await compressPdf(buffer);
      setCompressedBlob(resultBlob);
    } catch (err) {
      console.error(err);
      alert("Compression failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getFinalFilename = () => {
    const base = filename.trim() || `compressed_${file?.name || 'document'}`;
    return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  };

  const handleDownload = () => {
    if (!compressedBlob) return;
    downloadBlob(compressedBlob, getFinalFilename());
  };

  const handleShare = async () => {
    if (!compressedBlob) return;
    await shareBlob(compressedBlob, getFinalFilename());
  };

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-4 space-y-6 pb-20">
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-blue-600 font-semibold p-2 hover:bg-blue-50 rounded-lg">&larr; Back</button>
        <h2 className="text-2xl font-bold text-slate-800">Compress PDF</h2>
        <div className="w-12"></div>
      </div>

      <div className="w-full border-2 border-dashed border-slate-300 rounded-[2.5rem] p-8 flex flex-col items-center justify-center bg-white shadow-xl space-y-4">
        {file ? (
          <div className="w-full space-y-4">
            <div className="flex items-center space-x-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="p-3 bg-blue-100 rounded-2xl">
                <FileDown className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-500 font-medium">Original: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button 
                onClick={() => { setFile(null); setCompressedBlob(null); }} 
                className="text-red-500 text-sm font-bold p-2"
              >
                Remove
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600 px-1">Save As Name</label>
              <input 
                type="text"
                placeholder="Optimized_File"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              />
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center cursor-pointer py-16 w-full">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileDown className="w-12 h-12 text-blue-600" />
            </div>
            <p className="text-slate-800 font-black text-xl mb-1">Select PDF</p>
            <p className="text-slate-400 text-sm font-medium">Tap to browse your documents</p>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
          </label>
        )}
      </div>

      {file && !compressedBlob && (
        <button 
          disabled={isProcessing}
          onClick={handleCompress}
          className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center disabled:opacity-70 active:scale-95"
        >
          {isProcessing ? (
            <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Optimizing...</>
          ) : (
            'Optimize & Compress'
          )}
        </button>
      )}

      {compressedBlob && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-green-50 border border-green-100 p-6 rounded-3xl flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <FileCheck className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <p className="text-green-900 font-black text-lg">Magic Done!</p>
              <p className="text-green-700 text-sm font-bold">New size: {(compressedBlob.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setShowPreview(true)}
              className="col-span-2 flex items-center justify-center bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <Eye className="w-5 h-5 mr-2" /> Preview Compressed
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center justify-center bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Download className="w-5 h-5 mr-2" /> Download
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center justify-center bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all"
            >
              <Share2 className="w-5 h-5 mr-2" /> Share
            </button>
          </div>
        </div>
      )}

      {showPreview && compressedBlob && (
        <PdfPreview 
          blob={compressedBlob} 
          filename={getFinalFilename()} 
          onClose={() => setShowPreview(false)}
          onDownload={handleDownload}
          onShare={handleShare}
        />
      )}
    </div>
  );
};

export default CompressPdfTool;
