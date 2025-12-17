
import React, { useState } from 'react';
import { ImageIcon, Download, Share2, Plus, X } from 'lucide-react';
import { generatePdfFromImages, downloadBlob, shareBlob } from '../services/pdfService';

const ImageToPdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [images, setImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Add explicit type cast to File[] to avoid 'unknown' type being inferred for 'file'
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      // reader.readAsDataURL expects a Blob; casting 'files' ensures 'file' is treated as a File (which extends Blob)
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAction = async (action: 'download' | 'share') => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const blob = await generatePdfFromImages(images);
      const filename = `images_doc_${Date.now()}.pdf`;
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
        <h2 className="text-2xl font-bold text-slate-800">Photos to PDF</h2>
        <div className="w-12"></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
            <img src={img} className="w-full h-full object-cover" alt={`Select ${idx}`} />
            <button 
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
          <Plus className="w-8 h-8 text-slate-400 mb-2" />
          <span className="text-xs text-slate-500 font-medium">Add Photos</span>
          <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <button 
            disabled={isProcessing}
            onClick={() => handleAction('download')}
            className="flex items-center justify-center bg-blue-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="w-5 h-5 mr-2" /> Download
          </button>
          <button 
            disabled={isProcessing}
            onClick={() => handleAction('share')}
            className="flex items-center justify-center bg-green-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Share2 className="w-5 h-5 mr-2" /> Share PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageToPdfTool;
