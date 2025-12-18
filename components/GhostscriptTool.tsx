
import React, { useState, useEffect, useRef } from 'react';
import { FileDown, Download, Share2, FileCheck, Loader2, Eye, Zap, ShieldAlert, ArrowRight, Cpu, Terminal, Layers } from 'lucide-react';
import { compressPdf, downloadBlob, shareBlob } from '../services/pdfService';
import PdfPreview from './PdfPreview';

const GhostscriptTool: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [compressionRatio, setCompressionRatio] = useState<number>(0);
  const [activePreset, setActivePreset] = useState<'screen' | 'ebook' | 'printer'>('screen');
  
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-25), `[${new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${msg}`]);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setCompressedBlob(null);
      setLogs([]);
      addLog(`File system ready: ${selected.name}`);
      addLog(`Initial weight: ${formatSize(selected.size)}`);
    }
  };

  const runCompression = async () => {
    if (!file) return;
    setIsProcessing(true);
    setLogs([]);
    addLog(`GS-PRO V3.1: Starting compression task...`);
    
    try {
      const buffer = await file.arrayBuffer();
      
      const resultBlob = await compressPdf(
        buffer, 
        activePreset, 
        (msg) => addLog(msg)
      );
      
      setCompressedBlob(resultBlob);
      const ratio = ((file.size - resultBlob.size) / file.size) * 100;
      setCompressionRatio(Math.max(0, ratio));
      
      addLog(`Optimization successful.`);
      addLog(`Saved ${formatSize(file.size - resultBlob.size)} (${ratio.toFixed(1)}%)`);
    } catch (err) {
      addLog(`FATAL: Ghostscript core failed to parse stream.`);
      alert("Compression failed. The file might be encrypted or corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-4 space-y-6 pb-20 min-h-screen">
      <div className="w-full flex justify-between items-center mb-4 pt-8">
        <button onClick={onBack} className="text-slate-600 font-black p-2 hover:bg-slate-100 rounded-xl transition-all">← Back</button>
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900 leading-none tracking-tight">GS Compressor</h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Direct Stream Processing</p>
        </div>
      </div>

      {!file ? (
        <div className="w-full border-4 border-dashed border-slate-200 rounded-[3rem] p-12 bg-white shadow-2xl shadow-slate-200/50 flex flex-col items-center">
          <label className="flex flex-col items-center cursor-pointer group">
            <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl transition-transform group-hover:scale-110 group-hover:rotate-3 duration-500">
              <Cpu className="w-10 h-10 text-white" />
            </div>
            <p className="text-slate-900 font-black text-2xl mb-1">Load Source</p>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center">Ghostscript WASM-Simulation Mode</p>
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center">
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mr-4">
               <Layers className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 overflow-hidden">
               <p className="font-black text-slate-900 truncate">{file.name}</p>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatSize(file.size)} (Source)</p>
            </div>
            <button onClick={() => { setFile(null); setCompressedBlob(null); setLogs([]); }} className="p-3 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors">
              <ShieldAlert className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
             {[
               { id: 'screen', label: 'Screen', sub: '72 DPI' },
               { id: 'ebook', label: 'Ebook', sub: '150 DPI' },
               { id: 'printer', label: 'Printer', sub: '300 DPI' }
             ].map(p => (
               <button 
                 key={p.id}
                 disabled={isProcessing}
                 onClick={() => setActivePreset(p.id as any)}
                 className={`p-4 rounded-[1.5rem] border-2 transition-all text-left ${activePreset === p.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'} disabled:opacity-50`}
               >
                 <p className="font-black text-xs uppercase tracking-widest">{p.label}</p>
                 <p className={`text-[8px] font-bold mt-1 opacity-60`}>{p.sub}</p>
               </button>
             ))}
          </div>

          <div className="bg-slate-950 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden border border-slate-800">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center space-x-2">
                 <Terminal className="w-4 h-4 text-emerald-500" />
                 <span className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">GS_CORE_OUTPUT</span>
               </div>
               <div className="flex space-x-1">
                 <div className="w-2 h-2 rounded-full bg-red-500/50" />
                 <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                 <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
               </div>
            </div>
            <div ref={logContainerRef} className="h-48 overflow-y-auto font-mono text-[10px] text-emerald-400/80 leading-relaxed space-y-1 scrollbar-hide">
              {logs.length === 0 ? (
                <p className="text-white/20 italic">Select a preset and execute optimization...</p>
              ) : (
                logs.map((log, i) => <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-300">{log}</div>)
              )}
              {isProcessing && <div className="flex items-center text-white/50"><Loader2 className="w-3 h-3 mr-2 animate-spin" /> IO_WAIT: Stream processing...</div>}
            </div>
          </div>

          {!compressedBlob ? (
            <button 
              disabled={isProcessing}
              onClick={runCompression}
              className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-black active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 group"
            >
              {isProcessing ? (
                <><Loader2 className="w-6 h-6 mr-3 animate-spin" /> Processing Streams...</>
              ) : (
                <span className="flex items-center">Run GS Optimization <Zap className="w-5 h-5 ml-2 group-hover:fill-yellow-400 transition-all" /></span>
              )}
            </button>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
               <div className="bg-emerald-500 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                 <div className="relative z-10">
                   <div className="flex items-center mb-6">
                     <FileCheck className="w-6 h-6 mr-2" />
                     <p className="font-black uppercase tracking-widest text-xs opacity-80">Ghostscript Task Finalized</p>
                   </div>
                   <div className="flex items-end justify-between">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase opacity-60">Optimized Weight</p>
                        <p className="text-3xl font-black">{formatSize(compressedBlob.size)}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black uppercase opacity-60">Delta</p>
                        <p className="text-4xl font-black">-{compressionRatio.toFixed(1)}%</p>
                     </div>
                   </div>
                 </div>
                 <Cpu className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10" />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowPreview(true)} className="col-span-2 flex items-center justify-center bg-slate-900 text-white py-5 rounded-2xl font-black shadow-lg active:scale-95 transition-all">
                    <Eye className="w-5 h-5 mr-2" /> Inspect Rebuilt Stream
                  </button>
                  <button onClick={() => downloadBlob(compressedBlob, `gs_optimized_${file.name}`)} className="flex items-center justify-center bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg active:scale-95 transition-all">
                    <Download className="w-5 h-5 mr-2" /> Download
                  </button>
                  <button onClick={() => shareBlob(compressedBlob, `gs_optimized_${file.name}`)} className="flex items-center justify-center bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-lg active:scale-95 transition-all">
                    <Share2 className="w-5 h-5 mr-2" /> Share
                  </button>
               </div>
            </div>
          )}
        </div>
      )}

      {showPreview && compressedBlob && (
        <PdfPreview 
          blob={compressedBlob} 
          filename={`gs_optimized_${file?.name || 'document'}.pdf`}
          onClose={() => setShowPreview(false)}
          onDownload={() => downloadBlob(compressedBlob, `gs_optimized_${file?.name}`)}
          onShare={() => shareBlob(compressedBlob, `gs_optimized_${file?.name}`)}
        />
      )}
    </div>
  );
};

export default GhostscriptTool;
