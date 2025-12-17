
import React, { useState } from 'react';
import { FileText, Download, Share2 } from 'lucide-react';
import { generatePdfFromText, downloadBlob, shareBlob } from '../services/pdfService';

const TextToPdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: 'download' | 'share') => {
    if (!text.trim()) return alert("Please enter some text.");
    setIsProcessing(true);
    try {
      const blob = await generatePdfFromText(text);
      const filename = `text_doc_${Date.now()}.pdf`;
      if (action === 'download') {
        downloadBlob(blob, filename);
      } else {
        await shareBlob(blob, filename);
      }
    } catch (err) {
      alert("Error generating PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-4 space-y-6">
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-blue-600 font-semibold">&larr; Back</button>
        <h2 className="text-2xl font-bold text-slate-800">Text to PDF</h2>
        <div className="w-12"></div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-600 mb-1">Enter your text content:</label>
        <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start typing or paste your content here..."
          className="w-full h-80 p-4 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none bg-white shadow-sm transition-all"
        />

        <div className="grid grid-cols-2 gap-4">
          <button 
            disabled={isProcessing || !text}
            onClick={() => handleAction('download')}
            className="flex items-center justify-center bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="w-5 h-5 mr-2" /> Download
          </button>
          <button 
            disabled={isProcessing || !text}
            onClick={() => handleAction('share')}
            className="flex items-center justify-center bg-green-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Share2 className="w-5 h-5 mr-2" /> Share PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextToPdfTool;
