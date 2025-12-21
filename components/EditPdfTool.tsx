
import React, { useState, useRef } from 'react';
import { ChevronLeft, Plus, Trash2, ArrowUp, ArrowDown, Layers, Download, Share2, Eye, Loader2, FileText, X, Files, Zap, Edit3, Type, Check } from 'lucide-react';
import { mergeHybridPdf, downloadBlob, shareBlob } from '../services/pdfService';
import PdfPreview from './PdfPreview';
import { PDFDocument } from 'pdf-lib';

interface PdfSource {
  id: string;
  name: string;
  buffer: ArrayBuffer;
  pageCount: number;
}

type EditBlock = 
  | { id: string; type: 'original'; sourceId: string; pageIndex: number; name: string }
  | { id: string; type: 'text'; value: string; name: string };

const EditPdfTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [sources, setSources] = useState<PdfSource[]>([]);
  const [blocks, setBlocks] = useState<EditBlock[]>([]);
  const [filename, setFilename] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  
  // Full Screen Editor State
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsProcessing(true);
    const newSources: PdfSource[] = [];
    const newBlocks: EditBlock[] = [];

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer);
        const sourceId = Math.random().toString(36).substr(2, 9);
        const count = pdfDoc.getPageCount();

        newSources.push({
          id: sourceId,
          name: file.name,
          buffer: buffer,
          pageCount: count
        });

        for (let i = 0; i < count; i++) {
          newBlocks.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'original',
            sourceId: sourceId,
            pageIndex: i,
            name: file.name
          });
        }
      } catch (err) {
        console.error("Error loading PDF", err);
      }
    }

    setSources(prev => [...prev, ...newSources]);
    setBlocks(prev => [...prev, ...newBlocks]);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addEmptyTextPage = () => {
    setBlocks(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      value: '',
      name: 'New Custom Page'
    }]);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const next = [...blocks];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(p => p.id !== id));
  };

  const toggleToText = (id: string) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === id && b.type === 'original') {
        return { 
          ...b, 
          type: 'text', 
          value: '', // In a real app, we might try to extract text here
          name: `Edited: ${b.name} (P${b.pageIndex + 1})`
        } as EditBlock;
      }
      return b;
    }));
    setEditingBlockId(id);
  };

  const updateTextBlock = (id: string, value: string) => {
    setBlocks(prev => prev.map(b => (b.id === id && b.type === 'text') ? { ...b, value } : b));
  };

  const getFinalFilename = () => {
    const base = filename.trim() || `edited_doc_${Date.now()}`;
    return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  };

  const handleAction = async (type: 'download' | 'share' | 'preview') => {
    if (blocks.length === 0) return alert("Please add at least one page.");
    
    setIsProcessing(true);
    try {
      const pageSpecs = blocks.map(b => {
        if (b.type === 'original') {
          const source = sources.find(s => s.id === b.sourceId);
          return { type: 'original' as const, buffer: source!.buffer, pageIndex: b.pageIndex };
        } else {
          return { type: 'text' as const, value: b.value };
        }
      });

      const blob = await mergeHybridPdf(pageSpecs);
      setGeneratedBlob(blob);
      if (type === 'download') downloadBlob(blob, getFinalFilename());
      else if (type === 'share') await shareBlob(blob, getFinalFilename());
      else if (type === 'preview') setShowPreview(true);
    } catch (err) {
      console.error(err);
      alert("Error generating hybrid PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const activeEditingBlock = blocks.find(b => b.id === editingBlockId);

  return (
    <div className="flex flex-col max-w-4xl mx-auto p-4 space-y-6 pb-48 min-h-screen pt-8">
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-slate-600 font-bold p-2 hover:bg-slate-100 rounded-xl flex items-center transition-all">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900 leading-none">Structure Editor</h2>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Edit & Merge Workspace</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Files className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Document Canvas</h3>
                    <p className="text-[10px] font-bold text-slate-400">{blocks.length} Pages Scheduled</p>
                  </div>
               </div>
               {blocks.length > 0 && (
                 <button onClick={() => { setBlocks([]); setSources([]); }} className="text-[10px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest transition-colors">Clear All</button>
               )}
            </div>

            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border-4 border-dashed border-slate-100 rounded-[2rem] text-slate-300">
                <Layers className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-black text-sm uppercase tracking-widest">Workspace Empty</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blocks.map((block, index) => (
                  <div key={block.id} className={`group flex items-center p-4 border rounded-2xl transition-all ${block.type === 'text' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'} hover:bg-white hover:shadow-lg`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${block.type === 'text' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-100 text-slate-300'}`}>
                      {index + 1}
                    </div>
                    <div className="ml-4 flex-1 overflow-hidden">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${block.type === 'text' ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                          {block.type === 'text' ? 'Editable Content' : 'Original PDF'}
                        </span>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{block.name}</p>
                      </div>
                      <p className="font-bold text-slate-700 text-sm">
                        {block.type === 'original' ? `Original Page ${block.pageIndex + 1}` : (block.value.substring(0, 40) || 'Empty text page...') + '...'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => block.type === 'original' ? toggleToText(block.id) : setEditingBlockId(block.id)} className="p-2 text-slate-400 hover:text-emerald-600 transition-all" title="Edit text inside">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-2 text-slate-300 hover:text-emerald-500 disabled:opacity-0 transition-all"><ArrowUp className="w-4 h-4" /></button>
                      <button onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1} className="p-2 text-slate-300 hover:text-emerald-500 disabled:opacity-0 transition-all"><ArrowDown className="w-4 h-4" /></button>
                      <div className="w-px h-4 bg-slate-200 mx-1" />
                      <button onClick={() => removeBlock(block.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 grid grid-cols-2 gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center space-x-3 px-6 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5" /> <span>Upload PDFs</span>
              </button>
              <button 
                onClick={addEmptyTextPage}
                className="flex items-center justify-center space-x-3 px-6 py-5 bg-white border-2 border-emerald-100 text-emerald-600 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-50 active:scale-95 transition-all"
              >
                <Type className="w-5 h-5" /> <span>Add Text Page</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="application/pdf" className="hidden" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-950 p-8 rounded-[3rem] shadow-2xl space-y-6 sticky top-8 border border-white/5">
            <div className="flex items-center space-x-3 mb-2">
               <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                 <Zap className="w-4 h-4 text-emerald-400" />
               </div>
               <h3 className="text-white font-black text-sm uppercase tracking-wider">Merge Engine</h3>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 px-2">Project Name</label>
              <input 
                type="text"
                placeholder="rebuilt_document"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl border border-white/10 outline-none bg-white/5 font-bold text-sm text-white focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="pt-4 space-y-4">
               <button 
                 disabled={isProcessing || blocks.length === 0}
                 onClick={() => handleAction('preview')}
                 className="w-full flex items-center justify-center bg-white text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all group"
               >
                 {isProcessing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Eye className="w-5 h-5 mr-2" />} 
                 Compile & Inspect
               </button>
               
               <div className="grid grid-cols-2 gap-3">
                 <button 
                   disabled={isProcessing || blocks.length === 0}
                   onClick={() => handleAction('download')}
                   className="flex items-center justify-center bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                 >
                   <Download className="w-4 h-4 mr-2" /> Download
                 </button>
                 <button 
                   disabled={isProcessing || blocks.length === 0}
                   onClick={() => handleAction('share')}
                   className="flex items-center justify-center bg-emerald-800 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                 >
                   <Share2 className="w-4 h-4 mr-2" /> Share
                 </button>
               </div>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
               <div className="flex items-start space-x-3">
                 <Check className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                 <p className="text-[10px] text-white/40 font-bold leading-relaxed">
                   Editing text will convert that page into a new high-quality text block. Original pages remain unchanged.
                 </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zen Text Editor for PDF Pages */}
      {editingBlockId && activeEditingBlock && activeEditingBlock.type === 'text' && (
        <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-300">
           <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                 </div>
                 <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Content Editor</p>
                    <p className="font-black text-slate-900 leading-none truncate max-w-[200px]">{activeEditingBlock.name}</p>
                 </div>
              </div>
              <button 
                onClick={() => setEditingBlockId(null)}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95"
              >
                Save Changes
              </button>
           </div>
           <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-slate-50">
              <div className="max-w-4xl mx-auto h-full">
                <textarea 
                  autoFocus
                  value={activeEditingBlock.value}
                  onChange={(e) => updateTextBlock(editingBlockId, e.target.value)}
                  placeholder="Enter or paste the new content for this page here..."
                  className="w-full h-full bg-transparent border-none focus:ring-0 text-xl md:text-2xl text-slate-800 leading-relaxed font-medium resize-none placeholder:text-slate-200"
                />
              </div>
           </div>
        </div>
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

export default EditPdfTool;
