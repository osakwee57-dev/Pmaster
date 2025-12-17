
import React, { useState } from 'react';
import { FileText, Download, Share2, Eye, Type } from 'lucide-react';
import { generatePdfFromText, downloadBlob, shareBlob } from '../services/pdfService';
import PdfPreview from './PdfPreview';

const TextToPdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [text, setText] = useState('');
  const [filename, setFilename] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const getFinalFilename = () => {
    const base = filename.trim() || `text_doc_${Date.now()}`;
    return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  };

  const handlePreview = async () => {
    if (!text.trim()) return alert("Please enter some text.");
    setIsProcessing(true);
    try {
      const blob = await generatePdfFromText(text);
      setPreviewBlob(blob);
    } catch (err) {
      alert("Error generating PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    let blob = previewBlob;
    if (!blob) blob = await generatePdfFromText(text);
    downloadBlob(blob, getFinalFilename());
  };

  const handleShare = async () => {
    let blob = previewBlob;
    if (!blob) blob = await generatePdfFromText(text);
    await shareBlob(blob, getFinalFilename());
  };

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-4 space-y-6 pb-20">
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-blue-600 font-semibold p-2 hover:bg-blue-50 rounded-lg">&larr; Back</button>
        <h2 className="text-2xl font-bold text-slate-800">Text to PDF</h2>
        <div className="w-12"></div>
      </div>

      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-600 px-1">PDF File Name</label>
          <input 
            type="text"
            placeholder="Document Name (e.g. MyNotes)"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white shadow-sm transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-600 px-1 flex items-center">
            <Type className="w-4 h-4 mr-1" /> Content
          </label>
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing or paste your content here..."
            className="w-full h-80 p-6 rounded-[2rem] border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white shadow-inner transition-all leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            disabled={isProcessing || !text}
            onClick={handlePreview}
            className="col-span-2 flex items-center justify-center bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
          >
            <Eye className="w-5 h-5 mr-2" /> Preview Document
          </button>
          <button 
            disabled={isProcessing || !text}
            onClick={handleDownload}
            className="flex items-center justify-center bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
          >
            <Download className="w-5 h-5 mr-2" /> Download
          </button>
          <button 
            disabled={isProcessing || !text}
            onClick={handleShare}
            className="flex items-center justify-center bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95"
          >
            <Share2 className="w-5 h-5 mr-2" /> Share PDF
          </button>
        </div>
      </div>

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

export default TextToPdfTool;
