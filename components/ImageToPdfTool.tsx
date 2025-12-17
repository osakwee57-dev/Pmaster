
import React, { useState } from 'react';
import { ImageIcon, Download, Share2, Plus, X, Eye, ArrowLeft, ArrowRight } from 'lucide-react';
import { generatePdfFromImages, downloadBlob, shareBlob } from '../services/pdfService';
import PdfPreview from './PdfPreview';

const ImageToPdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [images, setImages] = useState<string[]>([]);
  const [filename, setFilename] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const newImages = [...images];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < images.length) {
      [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
      setImages(newImages);
    }
  };

  const getFinalFilename = () => {
    const base = filename.trim() || `images_doc_${Date.now()}`;
    return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  };

  const handlePreview = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const blob = await generatePdfFromImages(images);
      setPreviewBlob(blob);
    } catch (err) {
      alert("Error generating PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    let blob = previewBlob;
    if (!blob) blob = await generatePdfFromImages(images);
    downloadBlob(blob, getFinalFilename());
  };

  const handleShare = async () => {
    let blob = previewBlob;
    if (!blob) blob = await generatePdfFromImages(images);
    await shareBlob(blob, getFinalFilename());
  };

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-4 space-y-6 pb-20">
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-blue-600 font-semibold p-2 hover:bg-blue-50 rounded-lg">&larr; Back</button>
        <h2 className="text-2xl font-bold text-slate-800">Photos to PDF</h2>
        <div className="w-12"></div>
      </div>

      <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-600 px-1">PDF File Name</label>
          <input 
            type="text"
            placeholder="My_Photo_Album"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white shadow-sm"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-md group">
              <img src={img} className="w-full h-full object-cover" alt={`Select ${idx}`} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-end">
                  <button 
                    onClick={() => removeImage(idx)}
                    className="bg-red-500 text-white p-1.5 rounded-full shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-center space-x-2">
                  <button 
                    onClick={() => moveImage(idx, 'left')}
                    disabled={idx === 0}
                    className="bg-white/80 text-slate-800 p-1.5 rounded-full disabled:opacity-30"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => moveImage(idx, 'right')}
                    disabled={idx === images.length - 1}
                    className="bg-white/80 text-slate-800 p-1.5 rounded-full disabled:opacity-30"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                Page {idx + 1}
              </div>
            </div>
          ))}
          <label className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all hover:border-blue-400">
            <div className="p-3 bg-white rounded-full shadow-sm mb-2">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Add Photos</span>
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              disabled={isProcessing}
              onClick={handlePreview}
              className="col-span-2 flex items-center justify-center bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
            >
              <Eye className="w-5 h-5 mr-2" /> Preview
            </button>
            <button 
              disabled={isProcessing}
              onClick={handleDownload}
              className="flex items-center justify-center bg-blue-600 text-white py-4 rounded-xl font-bold shadow-xl hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
            >
              <Download className="w-5 h-5 mr-2" /> Download
            </button>
            <button 
              disabled={isProcessing}
              onClick={handleShare}
              className="flex items-center justify-center bg-green-600 text-white py-4 rounded-xl font-bold shadow-xl hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95"
            >
              <Share2 className="w-5 h-5 mr-2" /> Share PDF
            </button>
          </div>
        )}
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

export default ImageToPdfTool;
