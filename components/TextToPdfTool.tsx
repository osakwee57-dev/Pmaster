
import React, { useState } from 'react';
import { FileText, Download, Share2, Eye, Type, X, Maximize2 } from 'lucide-react';
import { generatePdfFromText, downloadBlob, shareBlob } from '../services/pdfService';

const FullScreenTextReader: React.FC<{ text: string; onClose: () => void }> = ({ text, onClose }) => (
  <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in zoom-in-95 duration-300">
    <div className="absolute top-6 right-6 z-10">
      <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-900 p-3 rounded-full transition-all border border-slate-200">
        <X className="w-6 h-6" />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto px-8 py-24 max-w-3xl mx-auto w-full">
       <div className="flex items-center space-x-3 mb-10 opacity-40">
         <Type className="w-5 h-5" />
         <span className="text-xs font-black uppercase tracking-widest">Reader Mode</span>
       </div>
       <div className="whitespace-pre-wrap text-xl leading-relaxed text-slate-800 font-medium selection:bg-blue-100">
         {text}
       </div>
    </div>
  </div>
);

const TextToPdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [text, setText] = useState('');
  const [filename, setFilename] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReader, setShowReader] = useState(false);

  const getFinalFilename = () => {
    const base = filename.trim() || `text_doc_${Date.now()}`;
    return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  };

  const handleAction = async (type: 'download' | 'share') => {
    if (!text.trim()) return alert("Please enter some text.");
    setIsProcessing(true);
    try {
      const blob = await generatePdfFromText(text);
      if (type === 'download') downloadBlob(blob, getFinalFilename());
      else await shareBlob(blob, getFinalFilename());
    } catch (err) {
      alert("Error generating PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-4 space-y-6 pb-20 min-h-screen">
      <div className="w-full flex justify-between items-center mb-4 pt-8">
        <button onClick={onBack} className="text-blue-600 font-bold p-2 hover:bg-blue-50 rounded-lg">← Back</button>
        <h2 className="text-2xl font-black text-slate-900">Text to PDF</h2>
        <div className="w-12"></div>
      </div>

      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">File Name</label>
          <input 
            type="text"
            placeholder="Document Title"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
          />
        </div>

        <div className="relative group">
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing your content..."
            className="w-full h-96 p-8 rounded-[2.5rem] border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white shadow-xl transition-all leading-relaxed text-slate-800"
          />
          {text && (
            <button 
              onClick={() => setShowReader(true)}
              className="absolute bottom-6 right-6 bg-slate-100 text-slate-600 p-3 rounded-full hover:bg-white border border-slate-200 shadow-lg active:scale-90 transition-all"
              title="Full Screen Review"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            disabled={isProcessing || !text}
            onClick={() => setShowReader(true)}
            className="col-span-2 flex items-center justify-center bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-black transition-all active:scale-95"
          >
            <Eye className="w-5 h-5 mr-2" /> Review Full Screen
          </button>
          <button 
            disabled={isProcessing || !text}
            onClick={() => handleAction('download')}
            className="flex flex-col items-center justify-center bg-blue-600 text-white py-6 rounded-2xl font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Download className="w-5 h-5 mb-1" /> Download
          </button>
          <button 
            disabled={isProcessing || !text}
            onClick={() => handleAction('share')}
            className="flex flex-col items-center justify-center bg-emerald-600 text-white py-6 rounded-2xl font-black shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <Share2 className="w-5 h-5 mb-1" /> Share
          </button>
        </div>
      </div>

      {showReader && (
        <FullScreenTextReader text={text} onClose={() => setShowReader(false)} />
      )}
    </div>
  );
};

export default TextToPdfTool;
