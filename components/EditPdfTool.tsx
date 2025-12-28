
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, Plus, Trash2, ArrowUp, ArrowDown, Layers, Download, Share2, Eye, Loader2, FileText, X, Files, Zap, Edit3, Type, Check, FileCode, FileType, Search, ArrowRight, Save } from 'lucide-react';
import { mergeHybridPdf, downloadBlob, shareBlob, extractTextFromPdf } from '../services/pdfService';
import { persistenceService, getAutosaveInterval } from '../services/persistenceService';
import { PDFToolProps } from '../types';
import PdfPreview from './PdfPreview';
import { PDFDocument } from 'pdf-lib';

interface PdfSource {
  id: string;
  name: string;
  buffer: ArrayBuffer;
  pageCount: number;
}

type EditBlock = 
  | { id: string; type: 'original'; sourceId: string; pageIndex: number; name: string; peekText?: string }
  | { id: string; type: 'text'; value: string; name: string };

const EditPdfTool: React.FC<PDFToolProps> = ({ onBack, initialData, draftId }) => {
  const [activeTab, setActiveTab] = useState<'merge' | 'convert'>(initialData?.activeTab || 'merge');
  const [sources, setSources] = useState<PdfSource[]>(initialData?.sources || []);
  const [blocks, setBlocks] = useState<EditBlock[]>(initialData?.blocks || []);
  const [filename, setFilename] = useState(initialData?.filename || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState(draftId || Math.random().toString(36).substr(2, 9));
  const [isSaved, setIsSaved] = useState(true);
  
  const [convertFile, setConvertFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [extractedPages, setExtractedPages] = useState<string[]>([]);
  const [conversionStatus, setConversionStatus] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveToDrafts = useCallback(async () => {
    if (blocks.length === 0 && !convertFile) return;
    setIsSaved(false);
    await persistenceService.saveDraft({
      id: currentDraftId,
      type: 'edit',
      title: filename || (activeTab === 'merge' ? `Merge (${blocks.length} pages)` : `Convert (${convertFile?.name || 'Doc'})`),
      lastEdited: Date.now(),
      data: { sources, blocks, filename, activeTab }
    });
    setIsSaved(true);
  }, [sources, blocks, filename, activeTab, convertFile, currentDraftId]);

  useEffect(() => {
    const interval = setInterval(() => { saveToDrafts(); }, getAutosaveInterval());
    return () => clearInterval(interval);
  }, [saveToDrafts]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsProcessing(true);
    
    // Process each file sequentially to avoid memory spikes and ensure state updates correctly
    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer);
        const sourceId = Math.random().toString(36).substr(2, 9);
        const count = pdfDoc.getPageCount();

        const newSource: PdfSource = {
          id: sourceId,
          name: file.name,
          buffer: buffer,
          pageCount: count
        };

        const newBlocks: EditBlock[] = [];
        for (let i = 0; i < count; i++) {
          newBlocks.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'original',
            sourceId: sourceId,
            pageIndex: i,
            name: file.name
          });
        }

        // Functional state updates to prevent missing previous state
        setSources(prev => [...prev, newSource]);
        setBlocks(prev => [...prev, ...newBlocks]);

      } catch (err) {
        console.error("Error loading PDF", err);
      }
    }

    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConvertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setConvertFile(file);
      setIsProcessing(true);
      setExtractedText("");
      setConversionStatus("Initializing extraction engine...");
      try {
        const buffer = await file.arrayBuffer();
        const result = await extractTextFromPdf(buffer, (msg) => setConversionStatus(msg));
        setExtractedText(result.fullText);
        setExtractedPages(result.pages);
        setConversionStatus(`Extraction complete. ${result.pages.length} pages indexed.`);
      } catch (err) {
        setExtractedText("Failed to extract text. Scan might be image-only.");
        setConversionStatus("Error: Extraction failed.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleMergeAction = async (type: 'download' | 'share' | 'preview') => {
    if (blocks.length === 0) return alert("Please add at least one page.");
    setIsProcessing(true);
    try {
      const pageSpecs = blocks.map(b => {
        if (b.type === 'original') {
          const source = sources.find(s => s.id === b.sourceId);
          return { type: 'original' as const, buffer: source!.buffer, pageIndex: b.pageIndex };
        }
        return null;
      }).filter(Boolean);
      
      const blob = await mergeHybridPdf(pageSpecs);
      setGeneratedBlob(blob);
      const name = filename || `merged_${Date.now()}.pdf`;
      if (type === 'download') {
        downloadBlob(blob, name);
        await persistenceService.deleteDraft(currentDraftId);
      }
      else if (type === 'share') await shareBlob(blob, name);
      else if (type === 'preview') setShowPreview(true);
    } catch (err) {
      alert("Error merging files.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-5xl mx-auto p-4 space-y-6 pb-48 min-h-screen pt-8">
      <div className="w-full flex justify-between items-center mb-4">
        <button onClick={onBack} className="text-slate-600 font-bold p-2 hover:bg-slate-100 rounded-xl flex items-center transition-all">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900 leading-none">PDF Workspace</h2>
          <div className="flex items-center justify-end space-x-2 mt-1">
            <span className={`text-[9px] font-black uppercase tracking-widest ${isSaved ? 'text-emerald-500' : 'text-orange-400'}`}>
              {isSaved ? 'Draft Synced' : 'Syncing...'}
            </span>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Professional Suite</p>
          </div>
        </div>
      </div>

      <div className="flex bg-slate-200/50 p-1 rounded-2xl w-full sm:w-fit self-center sm:self-end shadow-sm">
        <button onClick={() => setActiveTab('merge')} className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'merge' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Merge Center</button>
        <button onClick={() => setActiveTab('convert')} className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'convert' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Format Converter</button>
      </div>

      {activeTab === 'merge' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 min-h-[500px]">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center"><Files className="w-5 h-5" /></div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Merge Canvas</h3>
                      <p className="text-[10px] font-bold text-slate-400">{blocks.length} Pages Queued</p>
                    </div>
                 </div>
                 {blocks.length > 0 && <button onClick={() => { setBlocks([]); setSources([]); }} className="text-[10px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest">Clear Canvas</button>}
              </div>

              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-80 border-4 border-dashed border-slate-100 rounded-[2rem] text-slate-300">
                  <Layers className="w-16 h-16 mb-4 opacity-10" />
                  <p className="font-black text-sm uppercase tracking-widest">No Documents Loaded</p>
                  <button onClick={() => fileInputRef.current?.click()} className="mt-6 text-[10px] font-black bg-slate-900 text-white px-6 py-3 rounded-xl uppercase tracking-widest hover:bg-black transition-all">Select PDF Files</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {blocks.map((block, index) => (
                    <div key={block.id} className="group flex items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-white hover:shadow-lg hover:border-emerald-100">
                      <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs shrink-0">{index + 1}</div>
                      <div className="ml-4 flex-1 overflow-hidden">
                        <div className="flex items-center space-x-2">
                           <span className="text-[7px] font-black bg-slate-200 px-1.5 py-0.5 rounded text-slate-500 uppercase">Original</span>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{block.name}</p>
                        </div>
                        <p className="font-bold text-slate-900 text-sm">Page {block.pageIndex + 1}</p>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { const next = [...blocks]; [next[index], next[index-1]] = [next[index-1], next[index]]; setBlocks(next); }} disabled={index === 0} className="p-2 text-slate-300 hover:text-emerald-500 disabled:opacity-0"><ArrowUp className="w-4 h-4" /></button>
                        <button onClick={() => { const next = [...blocks]; [next[index], next[index+1]] = [next[index+1], next[index]]; setBlocks(next); }} disabled={index === blocks.length - 1} className="p-2 text-slate-300 hover:text-emerald-500 disabled:opacity-0"><ArrowDown className="w-4 h-4" /></button>
                        <button onClick={() => setBlocks(prev => prev.filter(b => b.id !== block.id))} className="p-2 text-slate-300 hover:text-red-500 ml-2"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-6 mt-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-emerald-50 hover:border-emerald-200 transition-all group">
                    <Plus className="w-6 h-6 mb-1 group-hover:scale-110" /><span className="text-[10px] font-black uppercase tracking-widest">Add More PDF Sources</span>
                  </button>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="application/pdf" className="hidden" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl space-y-6 sticky top-8 border border-white/5">
              <div className="flex items-center space-x-3 mb-2"><Zap className="w-6 h-6 text-emerald-400" /><h3 className="text-white font-black text-sm uppercase tracking-wider">Output Config</h3></div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40 px-2">Project Filename</label>
                <input type="text" placeholder="merged_document" value={filename} onChange={(e) => setFilename(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-white/10 outline-none bg-white/5 font-bold text-sm text-white focus:border-emerald-500 transition-all" />
              </div>
              <div className="pt-4 space-y-4">
                 <button disabled={isProcessing || blocks.length === 0} onClick={() => handleMergeAction('preview')} className="w-full flex items-center justify-center bg-white text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                   {isProcessing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Eye className="w-5 h-5 mr-2" />} Inspect Final Result
                 </button>
                 <div className="grid grid-cols-2 gap-3">
                   <button disabled={isProcessing || blocks.length === 0} onClick={() => handleMergeAction('download')} className="flex items-center justify-center bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"><Download className="w-4 h-4 mr-2" /> Download</button>
                   <button disabled={isProcessing || blocks.length === 0} onClick={() => handleMergeAction('share')} className="flex items-center justify-center bg-emerald-800 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"><Share2 className="w-4 h-4 mr-2" /> Share</button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col min-h-[500px]">
            <div className="flex items-center space-x-3 mb-8"><div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><FileType className="w-5 h-5" /></div><div><h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Format Converter</h3><p className="text-[10px] font-bold text-slate-400">Deep Text Extraction Engine</p></div></div>
            {!convertFile ? (
               <label className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[2rem] cursor-pointer hover:bg-blue-50/50 hover:border-blue-200 transition-all group">
                 <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110"><FileType className="w-10 h-10" /></div>
                 <p className="font-black text-slate-900 uppercase text-xs tracking-widest">Click to Choose PDF</p>
                 <input type="file" accept="application/pdf" className="hidden" onChange={handleConvertUpload} />
               </label>
            ) : (
              <div className="flex-1 space-y-6 flex flex-col">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mr-4"><FileText className="w-6 h-6 text-blue-600" /></div>
                  <div className="flex-1 overflow-hidden"><p className="font-black text-slate-900 truncate">{convertFile.name}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{(convertFile.size / 1024 / 1024).toFixed(2)} MB</p></div>
                  <button onClick={() => { setConvertFile(null); setExtractedText(""); }} className="p-3 text-slate-300 hover:text-red-500"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 bg-slate-900 rounded-[2rem] p-6 font-mono text-[11px] overflow-hidden flex flex-col">
                   <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2"><span className="text-blue-400/80 uppercase font-black tracking-widest text-[9px]">Live Extraction Log</span></div>
                   <div className="flex-1 overflow-y-auto text-blue-300/60 leading-relaxed whitespace-pre-wrap">{isProcessing ? <div className="flex items-center space-x-2"><Loader2 className="w-3 h-3 animate-spin" /><span>{conversionStatus}</span></div> : extractedText || "No text layers found."}</div>
                </div>
              </div>
            )}
          </div>
          <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl flex flex-col justify-center text-white space-y-6">
             <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center"><Zap className="w-8 h-8 text-blue-400" /></div>
             <div className="space-y-2"><h3 className="text-2xl font-bold tracking-tight">Proper PDF Parsing</h3><p className="text-slate-400 text-sm leading-relaxed">We use a browser-side virtual machine to traverse the PDF object model accurately.</p></div>
          </div>
        </div>
      )}
      {showPreview && generatedBlob && (
        <PdfPreview blob={generatedBlob} filename={filename || 'merged_doc.pdf'} onClose={() => setShowPreview(false)} onDownload={() => handleMergeAction('download')} onShare={() => shareBlob(generatedBlob, filename || 'merged_doc.pdf')} />
      )}
    </div>
  );
};

export default EditPdfTool;
