
import React, { useState } from 'react';
import { ImageIcon, Download, Share2, Plus, X, Eye, ArrowLeft, ArrowRight, Edit3, Maximize2 } from 'lucide-react';
import { generatePdfFromImages, downloadBlob, shareBlob } from '../services/pdfService';
import PdfPreview from './PdfPreview';
import ImageEditor from './ImageEditor';

const FullScreenImageViewer: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => (
  <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in zoom-in-95 duration-300">
    <div className="absolute top-6 right-6 z-10">
      <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all">
        <X className="w-6 h-6" />
      </button>
    </div>
    <div className="flex-1 flex items-center justify-center p-4">
      <img src={src} className="max-w-full max-h-full object-contain" alt="Full Preview" />
    </div>
  </div>
);

const ImageToPdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [images, setImages] = useState<string[]>([]);
  const [filename, setFilename] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

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

  const handleEditSave = (processed: string) => {
    if (editingIndex !== null) {
      const updated = [...images];
      updated[editingIndex] = processed;
      setImages(updated);
      setEditingIndex(null);
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

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-4 space-y-6 pb-20">
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-blue-600 font-semibold p-2 hover:bg-blue-50 rounded-lg">&larr; Back</button>
        <h2 className="text-2xl font-bold text-slate-800">Photos to PDF</h2>
        <div className="w-12"></div>
      </div>

      <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-600 px-1">File Name</label>
          <input 
            type="text"
            placeholder="My_Photo_Album"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-md group">
              <img src={img} className="w-full h-full object-cover" alt={`Select ${idx}`} />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  <button 
                    onClick={() => setEditingIndex(idx)}
                    className="bg-blue-600 text-white p-2 rounded-full shadow-lg active:scale-90"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => removeImage(idx)}
                    className="bg-red-500 text-white p-2 rounded-full shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-center space-x-2">
                  <button 
                    onClick={() => setFullScreenImage(img)}
                    className="bg-white text-slate-900 p-2 rounded-full shadow-lg"
                  >
                    <Maximize2 className="w-4 h-4" />
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
            </div>
          ))}
          <label className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all hover:border-blue-400">
            <div className="p-3 bg-white rounded-full shadow-sm mb-2">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-slate-500 font-bold uppercase">Add Photos</span>
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>

        {images.length > 0 && (
          <button 
            disabled={isProcessing}
            onClick={handlePreview}
            className="w-full flex items-center justify-center bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-xl active:scale-95 transition-all"
          >
            <Eye className="w-5 h-5 mr-2" /> Preview & Save PDF
          </button>
        )}
      </div>

      {editingIndex !== null && (
        <ImageEditor 
          image={images[editingIndex]} 
          onSave={handleEditSave}
          onCancel={() => setEditingIndex(null)}
        />
      )}

      {fullScreenImage && (
        <FullScreenImageViewer src={fullScreenImage} onClose={() => setFullScreenImage(null)} />
      )}

      {previewBlob && (
        <PdfPreview 
          blob={previewBlob} 
          filename={getFinalFilename()} 
          onClose={() => setPreviewBlob(null)}
          onDownload={() => downloadBlob(previewBlob, getFinalFilename())}
          onShare={() => shareBlob(previewBlob, getFinalFilename())}
        />
      )}
    </div>
  );
};

export default ImageToPdfTool;
