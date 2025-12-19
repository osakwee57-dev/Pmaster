
import React, { useState } from 'react';
import { ImageIcon, Download, Share2, Plus, X, Eye, ArrowLeft, ArrowRight, Edit3, Maximize2, ChevronLeft, ChevronRight, Settings, FileSearch, Loader2, FileText, Layout, Gauge } from 'lucide-react';
import { generateAdvancedPdfFromImages, downloadBlob, shareBlob, AdvancedPdfOptions } from '../services/pdfService';
import ImageEditor from './ImageEditor';
import PdfPreview from './PdfPreview';

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
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [recognizedText, setRecognizedText] = useState("");

  // Config States
  const [options, setOptions] = useState<Omit<AdvancedPdfOptions, 'onProgress'>>({
    pageSize: 'a4',
    orientation: 'p',
    margin: 10,
    spacing: 0,
    quality: 'high',
    ocrEnabled: false
  });

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

  const moveImage = (idx: number, direction: 'up' | 'down') => {
    const next = [...images];
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= images.length) return;
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setImages(next);
  };

  const handleReset = () => {
    setImages([]);
    setFilename('');
    setGeneratedBlob(null);
    setRecognizedText("");
    setProgress(0);
    setStatus("");
    setOptions({
      pageSize: 'a4',
      orientation: 'p',
      margin: 10,
      spacing: 0,
      quality: 'high',
      ocrEnabled: false
    });
  };

  const handleProcess = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setStatus("Starting engine...");
    
    try {
      const result = await generateAdvancedPdfFromImages(images, {
        ...options,
        onProgress: (p, s) => {
          setProgress(p);
          setStatus(s);
        }
      });
      
      setGeneratedBlob(result.blob);
      setRecognizedText(result.recognizedText);
      setShowPreview(true);
    } catch (err) {
      alert("Error generating PDF: " + err);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportText = (format: 'txt' | 'doc') => {
    if (!recognizedText) return;
    const blob = new Blob([recognizedText], { type: 'text/plain' });
    downloadBlob(blob, `${filename || 'extracted_text'}.${format}`);
  };

  const getFinalFilename = () => {
    const base = filename.trim() || `images_doc_${Date.now()}`;
    return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto p-4 space-y-6 pb-20 min-h-screen pt-8">
      <div className="w-full flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <button onClick={onBack} className="text-slate-600 font-bold p-2 hover:bg-slate-100 rounded-lg transition-all">← Back</button>
          <button onClick={handleReset} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 px-3 py-2 rounded-lg transition-all border border-transparent hover:border-red-100">Reset</button>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900 leading-none">Photo Engine Pro</h2>
          <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mt-1">Advanced PDF Layout & OCR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gallery / Editor Area */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 min-h-[400px]">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Project Canvas</h3>
                <span className="text-[10px] font-bold bg-pink-50 text-pink-600 px-3 py-1 rounded-full uppercase">{images.length} Images</span>
             </div>

             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm group">
                    <img src={img} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex justify-between">
                        <button onClick={() => setEditingIndex(idx)} className="bg-white text-blue-600 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="flex justify-center space-x-2">
                        <button disabled={idx === 0} onClick={() => moveImage(idx, 'up')} className="bg-white/20 text-white p-2 rounded-full disabled:opacity-0 hover:bg-white/40"><ArrowLeft className="w-4 h-4" /></button>
                        <button onClick={() => { setGalleryIndex(idx); setShowGallery(true); }} className="bg-white text-slate-900 p-2 rounded-full shadow-xl active:scale-90"><Maximize2 className="w-4 h-4" /></button>
                        <button disabled={idx === images.length - 1} onClick={() => moveImage(idx, 'down')} className="bg-white/20 text-white p-2 rounded-full disabled:opacity-0 hover:bg-white/40"><ArrowRight className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[8px] font-black px-2 py-0.5 rounded-full backdrop-blur-sm">
                       PAGE {idx + 1}
                    </div>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center aspect-[3/4] rounded-2xl border-4 border-dashed border-slate-200 bg-slate-50 hover:bg-white hover:border-pink-400 cursor-pointer transition-all">
                  <Plus className="w-10 h-10 text-slate-300 mb-2" />
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Add Page</span>
                  <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
             </div>
          </div>
        </div>

        {/* Configuration Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6 sticky top-8">
            <div className="flex items-center space-x-2 mb-4">
               <Settings className="w-5 h-5 text-slate-900" />
               <h3 className="font-black text-sm uppercase tracking-wider">Engine Settings</h3>
            </div>

            {/* General Info */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2">Output Name</label>
              <input 
                type="text"
                placeholder="Document Name"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-5 py-3 rounded-xl border-2 border-slate-50 focus:border-pink-500 outline-none bg-slate-50 font-bold text-xs"
              />
            </div>

            {/* Layout Options */}
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Page Size</label>
                     <select 
                       value={options.pageSize} 
                       onChange={(e) => setOptions({...options, pageSize: e.target.value as any})}
                       className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-pink-500"
                     >
                       <option value="a4">A4 Standard</option>
                       <option value="letter">US Letter</option>
                       <option value="legal">US Legal</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Orientation</label>
                     <div className="flex bg-slate-50 p-1 rounded-xl">
                        <button onClick={() => setOptions({...options, orientation: 'p'})} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${options.orientation === 'p' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>PORTRAIT</button>
                        <button onClick={() => setOptions({...options, orientation: 'l'})} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${options.orientation === 'l' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>LANDSCAPE</button>
                     </div>
                  </div>
               </div>

               <div className="space-y-2">
                  <div className="flex justify-between px-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Margins</label>
                    <span className="text-[9px] font-black text-pink-600">{options.margin}mm</span>
                  </div>
                  <input 
                    type="range" min="0" max="50" step="5"
                    value={options.margin}
                    onChange={(e) => setOptions({...options, margin: parseInt(e.target.value)})}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-pink-600"
                  />
               </div>
            </div>

            {/* Quality Section */}
            <div className="pt-4 border-t border-slate-50 space-y-3">
               <div className="flex items-center space-x-2">
                  <Gauge className="w-4 h-4 text-slate-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Target Quality</span>
               </div>
               <div className="grid grid-cols-3 gap-2">
                  {['low', 'medium', 'high'].map(q => (
                    <button 
                      key={q}
                      onClick={() => setOptions({...options, quality: q as any})}
                      className={`py-2 rounded-lg text-[9px] font-black uppercase border-2 transition-all ${options.quality === q ? 'bg-pink-600 border-pink-600 text-white shadow-lg' : 'bg-white border-slate-50 text-slate-400 hover:border-slate-100'}`}
                    >
                      {q}
                    </button>
                  ))}
               </div>
            </div>

            {/* OCR Toggle */}
            <div className="pt-4 border-t border-slate-50">
               <button 
                 onClick={() => setOptions({...options, ocrEnabled: !options.ocrEnabled})}
                 className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${options.ocrEnabled ? 'bg-emerald-50 border-emerald-500/20 text-emerald-900' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
               >
                  <div className="flex items-center space-x-3">
                     <FileSearch className={`w-5 h-5 ${options.ocrEnabled ? 'text-emerald-500' : 'text-slate-300'}`} />
                     <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest">Enable OCR</p>
                        <p className="text-[8px] font-bold opacity-60">Searchable PDF + Text Export</p>
                     </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${options.ocrEnabled ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                     {options.ocrEnabled && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
               </button>
            </div>

            {/* Final Action */}
            <button 
              onClick={handleProcess}
              disabled={isProcessing || images.length === 0}
              className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-sm shadow-xl hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50 flex flex-col items-center group"
            >
               {isProcessing ? (
                 <div className="flex flex-col items-center space-y-3">
                    <div className="flex items-center">
                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                       <span className="uppercase tracking-[0.15em] text-[10px]">Processing...</span>
                    </div>
                    <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-pink-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[8px] text-white/40 font-bold italic truncate w-40 text-center">{status}</p>
                 </div>
               ) : (
                 <span className="flex items-center uppercase tracking-widest">Generate Engine PDF <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></span>
               )}
            </button>
          </div>
        </div>
      </div>

      {/* Post-Processing Results / Extras */}
      {recognizedText && (
        <div className="bg-emerald-950 p-8 rounded-[3rem] text-white shadow-2xl space-y-6 animate-in fade-in duration-500">
           <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                 <FileText className="w-6 h-6 text-emerald-400" />
                 <div>
                    <h4 className="font-black text-sm uppercase tracking-wider">Recognized Text Data</h4>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">OCR Extraction Success</p>
                 </div>
              </div>
              <div className="flex space-x-2">
                 <button onClick={() => exportText('txt')} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Export .TXT</button>
                 <button onClick={() => exportText('doc')} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">Export .DOC</button>
              </div>
           </div>
           <div className="max-h-48 overflow-y-auto font-mono text-xs text-emerald-100/60 leading-relaxed bg-black/20 p-6 rounded-2xl scrollbar-hide">
              {recognizedText}
           </div>
        </div>
      )}

      {/* Modals */}
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
          onDownload={handleProcess}
          onShare={handleProcess}
        />
      )}

      {showPreview && generatedBlob && (
        <PdfPreview 
          blob={generatedBlob} 
          filename={getFinalFilename()} 
          onClose={() => setShowPreview(false)}
          onDownload={() => downloadBlob(generatedBlob, getFinalFilename())}
          onShare={() => shareBlob(generatedBlob, getFinalFilename())}
        />
      )}
    </div>
  );
};

export default ImageToPdfTool;
