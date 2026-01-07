
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileText, Download, Share2, Eye, Type, X, Maximize2, Loader2, Image as ImageIcon, Plus, Trash2, ArrowUp, ArrowDown, ChevronLeft, Shrink, Expand, Save, Table as TableIcon, Grid3X3, Check, MousePointer2, Merge } from 'lucide-react';
import { generatePdfFromMixedContent, downloadBlob, shareBlob } from '../services/pdfService';
import { persistenceService, getAutosaveInterval } from '../services/persistenceService';
import { PDFToolProps } from '../types';
import PdfPreview from './PdfPreview';

interface TableCell {
  content: string;
  colSpan?: number;
  rowSpan?: number;
  mergedInto?: [number, number]; // [row, col]
}

type ContentBlock = 
  | { id: string; type: 'text'; value: string }
  | { id: string; type: 'image'; value: string; file?: File; widthPercent: number }
  | { id: string; type: 'table'; rows: number; cols: number; data: TableCell[][]; widthPercent: number };

const TextToPdfTool: React.FC<PDFToolProps> = ({ onBack, initialData, draftId }) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialData?.blocks || [
    { id: Math.random().toString(36).substr(2, 9), type: 'text', value: '' }
  ]);
  const [filename, setFilename] = useState(initialData?.filename || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState(draftId || Math.random().toString(36).substr(2, 9));
  const [isSaved, setIsSaved] = useState(true);
  
  const [fullScreenTextId, setFullScreenTextId] = useState<string | null>(null);
  const [fullScreenTableId, setFullScreenTableId] = useState<string | null>(null);
  const [showGridConfig, setShowGridConfig] = useState(false);
  const [gridConfig, setGridConfig] = useState({ rows: 4, cols: 4 });
  
  // Selection and Merging state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveToDrafts = useCallback(async () => {
    const hasContent = blocks.some(b => (b.type === 'text' && b.value.trim()) || b.type === 'image' || b.type === 'table');
    if (!hasContent) return;
    
    setIsSaved(false);
    await persistenceService.saveDraft({
      id: currentDraftId,
      type: 'text',
      title: filename || `Doc Builder (${blocks.length} blocks)`,
      lastEdited: Date.now(),
      data: { blocks, filename }
    });
    setIsSaved(true);
  }, [blocks, filename, currentDraftId]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveToDrafts();
    }, getAutosaveInterval());
    return () => clearInterval(interval);
  }, [saveToDrafts]);

  const getFinalFilename = () => {
    const base = filename.trim() || `document_${Date.now()}`;
    return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  };

  const addTextBlock = () => {
    setBlocks(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), type: 'text', value: '' }]);
  };

  const addTableBlock = () => {
    const rows = Math.max(0, Math.min(100, gridConfig.rows));
    const cols = Math.max(0, Math.min(100, gridConfig.cols));
    if (rows === 0 || cols === 0) { setShowGridConfig(false); return; }

    const data: TableCell[][] = Array(rows).fill(0).map(() => 
      Array(cols).fill(0).map(() => ({ content: '', colSpan: 1, rowSpan: 1 }))
    );
    
    setBlocks(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      type: 'table', 
      rows, 
      cols, 
      data,
      widthPercent: 100
    }]);
    setShowGridConfig(false);
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
          widthPercent: 100
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateTextBlock = (id: string, val: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, value: val } : b));
  };

  const updateTableData = (id: string, r: number, c: number, val: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === id && b.type === 'table') {
        const newData = [...b.data];
        newData[r] = [...newData[r]];
        newData[r][c] = { ...newData[r][c], content: val.slice(0, 2000) };
        return { ...b, data: newData };
      }
      return b;
    }));
  };

  const toggleCellSelection = (r: number, c: number) => {
    const isSelected = selectedCells.some(([sr, sc]) => sr === r && sc === c);
    if (isSelected) {
      setSelectedCells(selectedCells.filter(([sr, sc]) => !(sr === r && sc === c)));
    } else {
      setSelectedCells([...selectedCells, [r, c]]);
    }
  };

  const mergeSelectedCells = () => {
    if (selectedCells.length < 2 || !fullScreenTableId) return;
    
    setBlocks(blocks.map(b => {
      if (b.id === fullScreenTableId && b.type === 'table') {
        const newData = b.data.map(row => row.map(cell => ({ ...cell })));
        
        // Find bounding box
        const rows = selectedCells.map(([r]) => r);
        const cols = selectedCells.map(([_, c]) => c);
        const minR = Math.min(...rows);
        const maxR = Math.max(...rows);
        const minC = Math.min(...cols);
        const maxC = Math.max(...cols);
        
        // Horizontal merge logic (limited to same row for stability in current PDF engine)
        if (minR !== maxR) {
          alert("Multi-row merging is currently limited to single-row spans for high-quality PDF reconstruction.");
          return b;
        }

        const spanC = maxC - minC + 1;
        const mainCell = newData[minR][minC];
        
        // Update the master cell
        newData[minR][minC] = {
          ...mainCell,
          colSpan: spanC,
          mergedInto: undefined
        };

        // Mark others as hidden/merged
        for (let c = minC + 1; c <= maxC; c++) {
          newData[minR][c] = {
            content: '',
            colSpan: 1,
            mergedInto: [minR, minC]
          };
        }

        return { ...b, data: newData };
      }
      return b;
    }));
    
    setSelectedCells([]);
    setSelectionMode(false);
  };

  const updateBlockWidth = (id: string, width: number) => {
    setBlocks(blocks.map(b => (b.id === id && (b.type === 'image' || b.type === 'table')) ? { ...b, widthPercent: width } : b));
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
    const hasContent = blocks.some(b => (b.type === 'text' && b.value.trim()) || b.type === 'image' || b.type === 'table');
    if (!hasContent) return alert("Please add some text, images, or a table.");
    
    setIsProcessing(true);
    try {
      const content = blocks.map(b => ({ 
        ...b,
        value: b.type === 'text' || b.type === 'image' ? b.value : undefined
      }));
      const blob = await generatePdfFromMixedContent(content);
      setGeneratedBlob(blob);
      if (type === 'download') {
        downloadBlob(blob, getFinalFilename());
        await persistenceService.deleteDraft(currentDraftId);
      }
      else if (type === 'share') await shareBlob(blob, getFinalFilename());
      else if (type === 'preview') setShowPreview(true);
    } catch (err) {
      console.error(err);
      alert("Error generating PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentFsBlock = blocks.find(b => b.id === fullScreenTextId);
  const currentFsTable = blocks.find(b => b.id === fullScreenTableId) as Extract<ContentBlock, { type: 'table' }> | undefined;

  return (
    <div className="flex flex-col max-w-3xl mx-auto p-4 space-y-6 pb-48 min-h-screen">
      <div className="w-full flex justify-between items-center mb-4 pt-8">
        <button onClick={onBack} className="text-slate-600 font-bold p-2 hover:bg-slate-100 rounded-xl flex items-center transition-all">
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </button>
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-900 leading-none">Doc Builder</h2>
          <div className="flex items-center justify-end space-x-2 mt-1">
            <span className={`text-[9px] font-black uppercase tracking-widest ${isSaved ? 'text-emerald-500' : 'text-orange-400'}`}>
              {isSaved ? 'Cloud Saved' : 'Syncing...'}
            </span>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Advanced Layouts</span>
          </div>
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
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${block.type === 'text' ? 'bg-purple-100 text-purple-600' : block.type === 'table' ? 'bg-emerald-100 text-emerald-600' : 'bg-pink-100 text-pink-600'}`}>
                    {block.type === 'text' ? <Type className="w-5 h-5" /> : block.type === 'table' ? <TableIcon className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Block {index + 1} &bull; {block.type}
                    </span>
                    {(block.type === 'image' || block.type === 'table') && (
                      <span className="text-[8px] font-bold text-slate-300">Scale: {block.widthPercent}%</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {(block.type === 'text' || block.type === 'table') && (
                    <button 
                      onClick={() => block.type === 'text' ? setFullScreenTextId(block.id) : setFullScreenTableId(block.id)}
                      className={`p-2 rounded-lg transition-all ${block.type === 'text' ? 'text-slate-400 hover:text-purple-600 hover:bg-purple-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                      title="Full Screen Editor"
                    >
                      <Expand className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-2 text-slate-300 hover:text-blue-600 disabled:opacity-0 transition-all"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1} className="p-2 text-slate-300 hover:text-blue-600 disabled:opacity-0 transition-all"><ArrowDown className="w-4 h-4" /></button>
                  <div className="w-px h-4 bg-slate-100 mx-1" />
                  <button onClick={() => removeBlock(block.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {block.type === 'text' && (
                <textarea 
                  value={block.value}
                  onChange={(e) => updateTextBlock(block.id, e.target.value)}
                  placeholder="Start typing your document content..."
                  className="w-full min-h-[160px] p-0 rounded-none focus:ring-0 border-none outline-none resize-none bg-transparent leading-relaxed text-slate-800 font-medium text-lg placeholder:text-slate-300"
                />
              )}

              {block.type === 'image' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Size:</span>
                    <input 
                      type="range" min="20" max="100" step="5"
                      value={block.widthPercent}
                      onChange={(e) => updateBlockWidth(block.id, parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                    <span className="text-[9px] font-black text-pink-600 w-8">{block.widthPercent}%</span>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <img 
                      src={block.value} 
                      className="max-h-[400px] object-contain transition-all duration-300" 
                      style={{ width: `${block.widthPercent}%` }} 
                      alt="Upload Preview" 
                    />
                  </div>
                </div>
              )}

              {block.type === 'table' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex-1 mr-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Width:</span>
                      <input 
                        type="range" min="20" max="100" step="5"
                        value={block.widthPercent}
                        onChange={(e) => updateBlockWidth(block.id, parseInt(e.target.value))}
                        className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <span className="text-[9px] font-black text-emerald-600 w-8">{block.widthPercent}%</span>
                    </div>
                    <button 
                      onClick={() => setFullScreenTableId(block.id)}
                      className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                    >
                      Edit Grid Data
                    </button>
                  </div>
                  <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-100 p-2">
                    <div className="min-w-full inline-block">
                      <table className="border-collapse border border-slate-200 text-xs w-full">
                        <tbody>
                          {block.data.slice(0, 3).map((row, r) => (
                            <tr key={r}>
                              {row.map((cell, c) => {
                                if (cell.mergedInto) return null;
                                return (
                                  <td 
                                    key={c} 
                                    colSpan={cell.colSpan}
                                    className="border border-slate-200 p-2 text-slate-500 italic max-w-[200px] truncate bg-white"
                                  >
                                    {cell.content || '-'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(block.rows > 3 || block.cols > 5) && (
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 text-center italic">Showing partial preview ({block.rows}x{block.cols} Grid)</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Floating Add Bar */}
        <div className="flex flex-wrap justify-center items-center gap-3 py-8">
          <button 
            onClick={addTextBlock}
            className="flex items-center space-x-2 px-6 py-4 bg-white border-2 border-slate-100 rounded-full text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:border-purple-200 hover:text-purple-600 transition-all shadow-xl active:scale-95"
          >
            <Plus className="w-4 h-4" /> <span>Text Block</span>
          </button>
          <button 
            onClick={() => setShowGridConfig(true)}
            className="flex items-center space-x-2 px-6 py-4 bg-white border-2 border-slate-100 rounded-full text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:border-emerald-200 hover:text-emerald-600 transition-all shadow-xl active:scale-95"
          >
            <TableIcon className="w-4 h-4" /> <span>Grid Block</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-6 py-4 bg-white border-2 border-slate-100 rounded-full text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:border-pink-200 hover:text-pink-600 transition-all shadow-xl active:scale-95"
          >
            <ImageIcon className="w-4 h-4" /> <span>Photo Block</span>
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

      {/* Grid Configuration Overlay */}
      {showGridConfig && (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-8 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8 shrink-0">
                 <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                       <Grid3X3 className="w-6 h-6" />
                    </div>
                    <div>
                       <h4 className="font-black text-slate-900 uppercase text-sm tracking-[0.2em]">Grid Architecture</h4>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dimensions & Pictorial Preview</p>
                    </div>
                 </div>
                 <button onClick={() => setShowGridConfig(false)} className="p-3 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all active:scale-90">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-8 custom-scrollbar">
                <div className="flex flex-col items-center text-center bg-slate-50 py-10 rounded-[2.5rem] border border-slate-100 relative overflow-hidden group">
                   <div className="relative z-10">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-3">Active Resolution</p>
                    <div className="flex items-center justify-center space-x-4">
                      <span className="text-6xl font-black text-slate-900 tabular-nums">{gridConfig.rows}</span>
                      <X className="w-8 h-8 text-slate-200 stroke-[4px]" />
                      <span className="text-6xl font-black text-slate-900 tabular-nums">{gridConfig.cols}</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 mt-4 uppercase tracking-widest bg-white/80 backdrop-blur border border-slate-200 px-4 py-1 rounded-full inline-block">
                      Total Capacity: {gridConfig.rows * gridConfig.cols} Data Points
                    </p>
                   </div>
                   <div className="absolute inset-0 opacity-[0.03] pointer-events-none grid" style={{ 
                     gridTemplateColumns: `repeat(${Math.max(1, gridConfig.cols)}, 1fr)`, 
                     gridTemplateRows: `repeat(${Math.max(1, gridConfig.rows)}, 1fr)` 
                   }}>
                      {gridConfig.rows > 0 && gridConfig.cols > 0 && Array.from({ length: Math.min(100, gridConfig.rows * gridConfig.cols) }).map((_, i) => (
                        <div key={i} className="border border-slate-900" />
                      ))}
                   </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Rows (0-100)</label>
                          <span className="text-xs font-black text-emerald-600">{gridConfig.rows}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <input 
                            type="range" min="0" max="100" value={gridConfig.rows} 
                            onChange={(e) => setGridConfig({...gridConfig, rows: parseInt(e.target.value) || 0})}
                            className="flex-1 h-2 bg-slate-100 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                          />
                          <input 
                            type="number" min="0" max="100" value={gridConfig.rows}
                            onChange={(e) => setGridConfig({...gridConfig, rows: Math.max(0, Math.min(100, parseInt(e.target.value) || 0))})}
                            className="w-16 px-2 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-center text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Columns (0-100)</label>
                          <span className="text-xs font-black text-emerald-600">{gridConfig.cols}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <input 
                            type="range" min="0" max="100" value={gridConfig.cols} 
                            onChange={(e) => setGridConfig({...gridConfig, cols: parseInt(e.target.value) || 0})}
                            className="flex-1 h-2 bg-slate-100 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                          />
                          <input 
                            type="number" min="0" max="100" value={gridConfig.cols}
                            onChange={(e) => setGridConfig({...gridConfig, cols: Math.max(0, Math.min(100, parseInt(e.target.value) || 0))})}
                            className="w-16 px-2 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-center text-xs outline-none focus:border-emerald-500"
                          />
                        </div>
                     </div>
                  </div>

                  <div className="p-6 bg-slate-900 rounded-[2rem] text-white/80">
                     <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Pictorial Representation</span>
                        <MousePointer2 className="w-4 h-4 text-emerald-400 opacity-50" />
                     </div>
                     <div className="aspect-video w-full bg-black/40 rounded-xl border border-white/5 flex items-center justify-center p-4 relative overflow-hidden">
                        {(gridConfig.rows === 0 || gridConfig.cols === 0) ? (
                          <div className="text-center">
                            <X className="w-12 h-12 text-red-500/20 mx-auto mb-2" />
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Null Dimension Grid</p>
                          </div>
                        ) : (
                          <div className="w-full h-full max-w-[280px] max-h-[160px] border border-emerald-500/10 grid gap-[1px] p-[1px] bg-white/5 transition-all duration-300" 
                               style={{ 
                                 gridTemplateColumns: `repeat(${Math.min(20, gridConfig.cols)}, 1fr)`,
                                 gridTemplateRows: `repeat(${Math.min(12, gridConfig.rows)}, 1fr)` 
                               }}>
                             {Array.from({ length: Math.min(240, gridConfig.rows * gridConfig.cols) }).map((_, i) => (
                               <div key={i} className="bg-emerald-500/20 border border-emerald-500/10 rounded-[1px] animate-in fade-in duration-300" />
                             ))}
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 shrink-0">
                <button 
                  onClick={addTableBlock}
                  disabled={gridConfig.rows === 0 || gridConfig.cols === 0}
                  className="w-full bg-emerald-600 text-white py-6 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/30 active:scale-[0.98] transition-all hover:bg-emerald-700 disabled:opacity-20 disabled:grayscale flex items-center justify-center space-x-3"
                >
                  <Plus className="w-4 h-4" /> <span>Construct Grid Entity</span>
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Full Screen Table Editor */}
      {fullScreenTableId && currentFsTable && (
        <div className="fixed inset-0 z-[250] bg-slate-50 flex flex-col animate-in fade-in zoom-in-95 duration-300">
           <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm shrink-0">
              <div className="flex items-center space-x-4">
                 <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <TableIcon className="w-6 h-6" />
                 </div>
                 <div className="text-left">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Logic Engine &bull; Grid Editor</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentFsTable.rows} Rows &bull; {currentFsTable.cols} Columns</p>
                 </div>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => {
                    setSelectionMode(!selectionMode);
                    setSelectedCells([]);
                  }}
                  className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center space-x-2 ${selectionMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <Merge className="w-4 h-4" />
                  <span>{selectionMode ? 'Finish Selection' : 'Merge Mode'}</span>
                </button>
                
                {selectionMode && selectedCells.length > 1 && (
                  <button 
                    onClick={mergeSelectedCells}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg animate-in fade-in slide-in-from-right-2"
                  >
                    Merge Selected
                  </button>
                )}

                <button 
                  onClick={() => setFullScreenTableId(null)}
                  className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  Save & Exit
                </button>
              </div>
           </div>
           
           <div className="flex-1 overflow-auto p-4 md:p-8">
              <div className="inline-block min-w-full bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden">
                <table className="border-collapse w-full table-fixed">
                   <thead>
                      <tr className="bg-slate-900 text-white">
                         <th className="p-4 border border-slate-800 text-[9px] font-black w-14 sticky left-0 z-20 bg-slate-900">#</th>
                         {Array(currentFsTable.cols).fill(0).map((_, i) => (
                           <th key={i} className="p-4 border border-slate-800 text-[9px] font-black uppercase tracking-widest min-w-[200px] text-center">
                              COL {i + 1}
                           </th>
                         ))}
                      </tr>
                   </thead>
                   <tbody>
                      {currentFsTable.data.map((row, r) => (
                        <tr key={r} className="group hover:bg-slate-50/50 transition-colors">
                           <td className="p-4 border border-slate-100 bg-slate-50 text-[9px] font-black text-slate-400 text-center sticky left-0 z-10">{r + 1}</td>
                           {row.map((cell, c) => {
                             if (cell.mergedInto) return null;
                             
                             const isSelected = selectedCells.some(([sr, sc]) => sr === r && sc === c);
                             
                             return (
                               <td 
                                 key={c} 
                                 colSpan={cell.colSpan}
                                 className={`p-0 border border-slate-100 relative transition-all duration-200 ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-500 z-10' : ''}`}
                               >
                                  {selectionMode ? (
                                    <div 
                                      onClick={() => toggleCellSelection(r, c)}
                                      className={`w-full h-full min-h-[80px] cursor-pointer flex items-center justify-center p-4`}
                                    >
                                       <div className={`p-4 rounded-xl font-bold text-xs text-center break-all ${isSelected ? 'text-blue-600' : 'text-slate-300'}`}>
                                          {cell.content || (isSelected ? 'Cell Selected' : 'Tap to select')}
                                       </div>
                                       {isSelected && <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-0.5"><Check className="w-3 h-3" /></div>}
                                    </div>
                                  ) : (
                                    <textarea 
                                      value={cell.content}
                                      onChange={(e) => updateTableData(fullScreenTableId, r, c, e.target.value)}
                                      className="w-full p-4 bg-transparent border-none focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none font-medium text-xs text-slate-800 leading-relaxed min-h-[80px]"
                                      placeholder="Alpha-numeric input..."
                                      maxLength={2000}
                                    />
                                  )}
                               </td>
                             );
                           })}
                        </tr>
                      ))}
                   </tbody>
                </table>
              </div>
           </div>

           <div className="p-4 bg-white border-t border-slate-200 flex justify-center items-center text-slate-400 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center">
                 {selectionMode ? (
                    <span className="text-blue-600 animate-pulse">Select cells in the same row to merge into a longer entity</span>
                 ) : (
                    <span>Massive Data Ingestion Node Active &bull; Merge Mode Available in Toolbar</span>
                 )}
              </span>
           </div>
        </div>
      )}

      {/* Full Screen Text Editor Overlay */}
      {fullScreenTextId && currentFsBlock && (
        <div className="fixed inset-0 z-[300] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-300">
           <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                    <Type className="w-5 h-5" />
                 </div>
                 <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Screen Editor</p>
                    <p className="font-black text-slate-900 leading-none">Focus Writing Mode</p>
                 </div>
              </div>
              <button 
                onClick={() => setFullScreenTextId(null)}
                className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95"
              >
                Done Editing
              </button>
           </div>
           <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-slate-50">
              <div className="max-w-4xl mx-auto h-full">
                <textarea 
                  autoFocus
                  value={currentFsBlock.value}
                  onChange={(e) => updateTextBlock(fullScreenTextId, e.target.value)}
                  placeholder="Focus on your writing here..."
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

export default TextToPdfTool;
