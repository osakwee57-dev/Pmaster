
import React, { useState } from 'react';
import { FileDown, Download, Share2, FileCheck, Loader2 } from 'lucide-react';
import { compressPdf, downloadBlob, shareBlob } from '../services/pdfService';

const CompressPdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
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

  const handleAction = async (action: 'download' | 'share') => {
    if (!compressedBlob) return;
    const filename = `compressed_${file?.name || 'document'}`;
    if (action === 'download') {
      downloadBlob(compressedBlob, filename);
    } else {
      await shareBlob(compressedBlob, filename);
    }
  };

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-4 space-y-6">
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-blue-600 font-semibold">&larr; Back</button>
        <h2 className="text-2xl font-bold text-slate-800">Compress PDF</h2>
        <div className="w-12"></div>
      </div>

      <div className="w-full border-2 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center bg-white shadow-sm space-y-4">
        {file ? (
          <div className="flex items-center space-x-3 bg-slate-100 p-4 rounded-2xl w-full">
            <FileDown className="w-10 h-10 text-blue-600" />
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold text-slate-800 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button onClick={() => setFile(null)} className="text-red-500 text-sm font-medium">Remove</button>
          </div>
        ) : (
          <label className="flex flex-col items-center cursor-pointer py-12">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <FileDown className="w-10 h-10 text-blue-600" />
            </div>
            <p className="text-slate-700 font-semibold">Select PDF from Files</p>
            <p className="text-slate-400 text-sm">Tap to browse your device</p>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
          </label>
        )}
      </div>

      {file && !compressedBlob && (
        <button 
          disabled={isProcessing}
          onClick={handleCompress}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center disabled:opacity-70"
        >
          {isProcessing ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Compressing...</>
          ) : (
            'Optimize & Compress PDF'
          )}
        </button>
      )}

      {compressedBlob && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <FileCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-green-800 font-bold">Compression Ready!</p>
              <p className="text-green-600 text-sm">New size: {(compressedBlob.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleAction('download')}
              className="flex items-center justify-center bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-700"
            >
              <Download className="w-5 h-5 mr-2" /> Download
            </button>
            <button 
              onClick={() => handleAction('share')}
              className="flex items-center justify-center bg-green-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-green-700"
            >
              <Share2 className="w-5 h-5 mr-2" /> Share PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompressPdfTool;
