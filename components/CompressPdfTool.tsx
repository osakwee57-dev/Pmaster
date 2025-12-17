
import React, { useState } from 'react';
import { FileDown, Download, Share2, FileCheck, Loader2, Eye, Zap, ShieldAlert, ArrowRight } from 'lucide-react';
import { compressPdf, downloadBlob, shareBlob } from '../services/pdfService';
import PdfPreview from './PdfPreview';

const CompressPdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [filename, setFilename] = useState('');
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [compressionRatio, setCompressionRatio] = useState<number>(0);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setFilename(selected.name.replace('.pdf', ''));
      setCompressedBlob(null);
      setCompressionRatio(0);
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
      
      const ratio = ((file.size - resultBlob.size) / file.size) * 100;
      setCompressionRatio(Math.max(0, ratio));
    } catch (err) {
      console.error(err);
      alert("Compression failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getFinalFilename = () => {
    const base = filename.trim() || `optimized_${file?.name || 'document'}`;
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
        <button onClick={onBack} className="text-blue-600 font-black p-2 hover:bg-blue-50 rounded-xl transition-all">← Back</button>
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900 leading-none">Power Compress</h2>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">75% Target Reduction</p>
        </div>
      </div>

      <div className="w-full border-4 border-dashed border-slate-200 rounded-[3rem] p-8 flex flex-col items-center justify-center bg-white shadow-2xl shadow-slate-200/50 space-y-4">
        {file ? (
          <div className="w-full space-y-6">
            <div className="flex items-center space-x-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <FileDown className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-black text-slate-900 truncate">{file.name}</p>
                <div className="flex items-center mt-1">
                  <span className="text-[10px] font-black bg-slate-200 px-2 py-0.5 rounded-full text-slate-600 uppercase">Original</span>
                  <p className="text-xs text-slate-500 font-bold ml-2">{formatSize(file.size)}</p>
                </div>
              </div>
              <button 
                onClick={() => { setFile(null); setCompressedBlob(null); }} 
                className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center active:scale-90 transition-all"
              >
                <ShieldAlert className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-widest">New File Name</label>
              <input 
                type="text"
                placeholder="Optimized_File"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none bg-slate-50 font-bold text-slate-800 transition-all"
              />
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center cursor-pointer py-16 w-full">
            <div className="w-28 h-28 bg-blue-50 rounded-full flex items-center justify-center mb-8 shadow-inner">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30">
                <FileDown className="w-10 h-10 text-white" />
              </div>
            </div>
            <p className="text-slate-900 font-black text-2xl mb-2">Select PDF</p>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">High-Efficiency mode active</p>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
          </label>
        )}
      </div>

      <div className="bg-blue-900 text-white p-6 rounded-[2.5rem] flex items-start space-x-4 shadow-xl">
        <div className="p-3 bg-blue-500/20 rounded-2xl">
          <Zap className="w-6 h-6 text-blue-300" />
        </div>
        <div>
          <h4 className="font-black text-sm uppercase tracking-wider">75% Reduction Strategy</h4>
          <p className="text-blue-200 text-xs font-medium leading-relaxed mt-1">Our engine uses a hybrid method: structural packing for text and smart-rasterization for heavy graphics to guarantee minimum size.</p>
        </div>
      </div>

      {file && !compressedBlob && (
        <button 
          disabled={isProcessing}
          onClick={handleCompress}
          className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-black transition-all flex items-center justify-center disabled:opacity-70 active:scale-95 group"
        >
          {isProcessing ? (
            <><Loader2 className="w-6 h-6 mr-3 animate-spin" /> Analyzing & Optimizing...</>
          ) : (
            <span className="flex items-center">Start Compression <Zap className="w-5 h-5 ml-2 group-hover:fill-blue-400 transition-all" /></span>
          )}
        </button>
      )}

      {compressedBlob && file && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="bg-emerald-500 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <FileCheck className="w-6 h-6 mr-2" />
                <p className="font-black uppercase tracking-widest text-xs opacity-80">Optimization Finished</p>
              </div>
              <div className="flex items-end space-x-4 mb-6">
                <div className="text-center">
                   <p className="text-[10px] font-black uppercase opacity-60">Before</p>
                   <p className="text-sm font-bold">{formatSize(file.size)}</p>
                </div>
                <ArrowRight className="w-8 h-8 mb-1 opacity-40" />
                <div className="text-center">
                   <p className="text-[10px] font-black uppercase opacity-60">After</p>
                   <p className="text-xl font-black">{formatSize(compressedBlob.size)}</p>
                </div>
              </div>
              <div className="inline-block bg-white/20 px-6 py-2 rounded-2xl">
                <h3 className="text-3xl font-black">-{compressionRatio.toFixed(0)}%</h3>
              </div>
            </div>
            <FileCheck className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setShowPreview(true)}
              className="col-span-2 flex items-center justify-center bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <Eye className="w-5 h-5 mr-2" /> Preview & Verify
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center justify-center bg-blue-600 text-white py-5 rounded-[1.5rem] font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Download className="w-5 h-5 mr-2" /> Download
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center justify-center bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"
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
