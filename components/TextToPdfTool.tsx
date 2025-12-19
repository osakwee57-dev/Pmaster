
import React, { useState, useRef } from 'react';
import { FileText, Download, Share2, Eye, Type, X, Maximize2, Loader2, Image as ImageIcon, Plus, Trash2, ArrowUp, ArrowDown, ChevronLeft } from 'lucide-react';
import { generatePdfFromMixedContent, downloadBlob, shareBlob } from '../services/pdfService';
import PdfPreview from './PdfPreview';

type ContentBlock = 
  | { id: string; type: 'text'; value: string }
  | { id: string; type: 'image'; value: string; file: File };

const TextToPdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { id: Math.random().toString(36).substr(2, 9), type: 'text', value: '' }
  ]);
  const [filename, setFilename] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFinalFilename = () => {
    const base = filename.trim() || `document_${Date.now()}`;
    return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  };

  const addTextBlock = () => {
    setBlocks(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), type: 'text', value: '' }]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setBlocks(prev => [...prev, { 
          id: Math.random().toString(36).substr(2, 9), 
          type: 'image', 
          value: base64,
          file: file
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateTextBlock = (id: string, val: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, value: val } : b));
  };

  const removeBlock = (id: string) => {
    if (blocks.length === 1 && blocks[0].type === 'text') {
       updateTextBlock(id, '');
       return;
    }
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const handleAction = async (type: 'download' | 'share' | 'preview') => {
    const hasContent = blocks.some(b => (b.type === 'text' && b.value.trim()) || b.type === 'image');
    if (!hasContent) return alert("Please add some text or images.");
    
    setIsProcessing(true);
    try {
      const content = blocks.map(b => ({ type: b.type, value: b.value }));
      const blob = await generatePdfFromMixedContent(content);
      setGeneratedBlob(blob);
      if (type === 'download') downloadBlob(blob, getFinalFilename());
      else if (type === 'share') await shareBlob(blob, getFinalFilename());
      else if (type === 'preview') setShowPreview(true);
    } catch (err) {
      console.error(err);
      alert("Error generating PDF. The document might be too complex for local processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-3xl mx-auto p-4 space-y-6 pb-40 min-h-screen">
      <div className="w-full flex justify-between items-center mb-4 pt-8">
        <button onClick={onBack} className="text-slate-600 font-bold p-2 hover:bg-slate-100 rounded-xl flex items-center transition-all">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900 leading-none">Doc Builder</h2>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Multi-Page Editor</p>
        </div>
      </div>

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Project Filename</label>
          <input 
            type="text"
            placeholder="Document Name"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 focus:border-blue-500 outline-none bg-slate-50 font-bold text-slate-800 transition-all"
          />
        </div>

        <div className="space-y-6">
          {blocks.map((block, index) => (
            <div key={block.id} className="group relative bg-white rounded-[2.5rem] shadow-lg border border-slate-100 p-6 transition-all hover:shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${block.type === 'text' ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-600'}`}>
                    {block.type === 'text' ? <Type className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Block {index + 1} &bull; {block.type}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-2 text-slate-300 hover:text-blue-600 disabled:opacity-20 transition-all"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1} className="p-2 text-slate-300 hover:text-blue-600 disabled:opacity-20 transition-all"><ArrowDown className="w-4 h-4" /></button>
                  <div className="w-px h-4 bg-slate-100 mx-1" />
                  <button onClick={() => removeBlock(block.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {block.type === 'text' ? (
                <textarea 
                  value={block.value}
                  onChange={(e) => updateTextBlock(block.id, e.target.value)}
                  placeholder="Start typing your document content..."
                  className="w-full min-h-[160px] p-0 rounded-none focus:ring-0 border-none outline-none resize-none bg-transparent leading-relaxed text-slate-800 font-medium text-lg placeholder:text-slate-300"
                />
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 aspect-[4/3] flex items-center justify-center">
                  <img src={block.value} className="w-full h-full object-contain" alt="Upload Preview" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Floating Add Bar */}
        <div className="flex justify-center items-center space-x-4 py-8">
          <button 
            onClick={addTextBlock}
            className="flex items-center space-x-2 px-8 py-4 bg-white border-2 border-slate-100 rounded-full text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-purple-200 hover:text-purple-600 transition-all shadow-xl active:scale-95"
          >
            <Plus className="w-5 h-5" /> <span>Insert Text Block</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-8 py-4 bg-white border-2 border-slate-100 rounded-full text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-pink-200 hover:text-pink-600 transition-all shadow-xl active:scale-95"
          >
            <ImageIcon className="w-5 h-5" /> <span>Insert Photo Block</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            multiple 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-6 z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
          <div className="max-w-3xl mx-auto grid grid-cols-2 gap-4">
            <button 
              disabled={isProcessing}
              onClick={() => handleAction('preview')}
              className="col-span-2 flex items-center justify-center bg-slate-900 text-white py-5 rounded-2xl font-black shadow-2xl hover:bg-black transition-all active:scale-95 group"
            >
              {isProcessing ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <Eye className="w-6 h-6 mr-3 transition-transform group-hover:scale-110" />} 
              Generate & Inspect Full Preview
            </button>
            <button 
              disabled={isProcessing}
              onClick={() => handleAction('download')}
              className="flex items-center justify-center bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 active:scale-95 transition-all text-xs"
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </button>
            <button 
              disabled={isProcessing}
              onClick={() => handleAction('share')}
              className="flex items-center justify-center bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-emerald-700 active:scale-95 transition-all text-xs"
            >
              <Share2 className="w-4 h-4 mr-2" /> Share
            </button>
          </div>
        </div>
      </div>

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

export default TextToPdfTool;
