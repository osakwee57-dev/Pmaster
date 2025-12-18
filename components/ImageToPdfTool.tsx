
import React, { useState } from 'react';
import { ImageIcon, Download, Share2, Plus, X, Eye, ArrowLeft, ArrowRight, Edit3, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { generatePdfFromImages, downloadBlob, shareBlob } from '../services/pdfService';
import ImageEditor from './ImageEditor';

const FullScreenGallery: React.FC<{ 
  images: string[]; 
  initialIndex: number; 
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
}> = ({ images, initialIndex, onClose, onDownload, onShare }) => {
  const [index, setIndex] = useState(initialIndex);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in zoom-in-95 duration-300">
      <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-center">
        <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md border border-white/10 transition-all">
          <X className="w-6 h-6" />
        </button>
        <div className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 text-white text-xs font-black">
          {index + 1} / {images.length}
        </div>
        <div className="flex space-x-2">
           <button onClick={onShare} className="bg-emerald-500 text-white p-3 rounded-full shadow-lg"><Share2 className="w-6 h-6" /></button>
           <button onClick={onDownload} className="bg-blue-600 text-white p-3 rounded-full shadow-lg"><Download className="w-6 h-6" /></button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative">
        <button 
          disabled={index === 0}
          onClick={() => setIndex(i => i - 1)}
          className="absolute left-6 p-4 text-white/40 hover:text-white disabled:opacity-0 transition-all"
        >
          <ChevronLeft className="w-10 h-10" />
        </button>
        
        <img src={images[index]} className="max-w-full max-h-full object-contain shadow-2xl transition-all duration-500" alt={`Image ${index + 1}`} />

        <button 
          disabled={index === images.length - 1}
          onClick={() => setIndex(i => i + 1)}
          className="absolute right-6 p-4 text-white/40 hover:text-white disabled:opacity-0 transition-all"
        >
          <ChevronRight className="w-10 h-10" />
        </button>
      </div>
      
      <div className="p-10 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center">
         <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Gallery Inspection</p>
         <div className="flex space-x-2 overflow-x-auto max-w-full px-4 scrollbar-hide">
           {images.map((img, i) => (
             <button key={i} onClick={() => setIndex(i)} className={`w-12 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === index ? 'border-blue-500 scale-110' : 'border-transparent opacity-40'}`}>
               <img src={img} className="w-full h-full object-cover" />
             </button>
           ))}
         </div>
      </div>
    </div>
  );
};

const ImageToPdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [images, setImages] = useState<string[]>([]);
  const [filename, setFilename] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

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

  const handleAction = async (type: 'download' | 'share') => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const blob = await generatePdfFromImages(images);
      const base = filename.trim() || `images_doc_${Date.now()}`;
      const finalName = base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
      if (type === 'download') downloadBlob(blob, finalName);
      else await shareBlob(blob, finalName);
    } catch (err) {
      alert("Action failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-4 space-y-6 pb-20 min-h-screen pt-8">
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-blue-600 font-bold p-2 hover:bg-blue-50 rounded-lg">← Back</button>
        <h2 className="text-2xl font-black text-slate-900">Photos to PDF</h2>
        <div className="w-12"></div>
      </div>

      <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">PDF Name</label>
          <input 
            type="text"
            placeholder="Document Name"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-[1.5rem] overflow-hidden border border-slate-200 shadow-md group">
              <img src={img} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <button onClick={() => setEditingIndex(idx)} className="bg-white text-blue-600 p-2 rounded-full shadow-lg"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className="bg-red-500 text-white p-2 rounded-full shadow-lg"><X className="w-4 h-4" /></button>
                </div>
                <button onClick={() => { setGalleryIndex(idx); setShowGallery(true); }} className="mx-auto bg-white text-slate-900 p-3 rounded-full shadow-xl active:scale-90"><Maximize2 className="w-5 h-5" /></button>
                <div className="flex justify-center space-x-2">
                  <button disabled={idx === 0} onClick={() => {
                    const next = [...images];
                    [next[idx], next[idx-1]] = [next[idx-1], next[idx]];
                    setImages(next);
                  }} className="bg-white/20 text-white p-1.5 rounded-full disabled:opacity-0"><ArrowLeft className="w-4 h-4" /></button>
                  <button disabled={idx === images.length - 1} onClick={() => {
                    const next = [...images];
                    [next[idx], next[idx+1]] = [next[idx+1], next[idx]];
                    setImages(next);
                  }} className="bg-white/20 text-white p-1.5 rounded-full disabled:opacity-0"><ArrowRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
          <label className="flex flex-col items-center justify-center aspect-square rounded-[1.5rem] border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-white hover:border-blue-400 cursor-pointer transition-all shadow-sm">
            <div className="p-3 bg-white rounded-full shadow-sm mb-2 border border-slate-100"><Plus className="w-6 h-6 text-blue-600" /></div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Add Photo</span>
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>

        {images.length > 0 && (
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 grid grid-cols-2 gap-4">
             <button onClick={() => handleAction('download')} disabled={isProcessing} className="flex flex-col items-center justify-center bg-blue-600 text-white py-6 rounded-2xl font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all"><Download className="w-6 h-6 mb-1" /> Download</button>
             <button onClick={() => handleAction('share')} disabled={isProcessing} className="flex flex-col items-center justify-center bg-emerald-600 text-white py-6 rounded-2xl font-black shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"><Share2 className="w-6 h-6 mb-1" /> Share</button>
             <button onClick={() => { setGalleryIndex(0); setShowGallery(true); }} className="col-span-2 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg flex items-center justify-center active:scale-95 transition-all"><Maximize2 className="w-5 h-5 mr-2" /> View All Full Screen</button>
          </div>
        )}
      </div>

      {editingIndex !== null && (
        <ImageEditor 
          image={images[editingIndex]} 
          onSave={(img) => {
            const next = [...images];
            next[editingIndex] = img;
            setImages(next);
            setEditingIndex(null);
          }}
          onCancel={() => setEditingIndex(null)}
        />
      )}

      {showGallery && (
        <FullScreenGallery 
          images={images} 
          initialIndex={galleryIndex} 
          onClose={() => setShowGallery(false)}
          onDownload={() => handleAction('download')}
          onShare={() => handleAction('share')}
        />
      )}
    </div>
  );
};

export default ImageToPdfTool;
