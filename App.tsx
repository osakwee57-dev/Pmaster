
import React, { useState } from 'react';
import { Camera, FileText, ImageIcon, ChevronRight, FileOutput, ShieldCheck, Zap, Cpu } from 'lucide-react';
import ScannerTool from './components/ScannerTool';
import TextToPdfTool from './components/TextToPdfTool';
import ImageToPdfTool from './components/ImageToPdfTool';
import GhostscriptTool from './components/GhostscriptTool';
import { ToolType } from './types';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);

  const tools = [
    {
      id: 'scan' as ToolType,
      title: 'Scan Document',
      description: 'Capture with high-quality inspection',
      icon: <Camera className="w-7 h-7 text-blue-600" />,
      color: 'bg-blue-100',
    },
    {
      id: 'text' as ToolType,
      title: 'Text to PDF',
      description: 'Quick notes to professional PDF',
      icon: <FileText className="w-7 h-7 text-purple-600" />,
      color: 'bg-purple-100',
    },
    {
      id: 'image' as ToolType,
      title: 'Photos to PDF',
      description: 'Stitch gallery images together',
      icon: <ImageIcon className="w-7 h-7 text-pink-600" />,
      color: 'bg-pink-100',
    },
    {
      id: 'gs_compress' as ToolType,
      title: 'GS Compressor',
      description: 'Aggressive 50% size reduction',
      icon: <Cpu className="w-7 h-7 text-slate-800" />,
      color: 'bg-slate-200',
    }
  ];

  if (activeTool === 'scan') return <ScannerTool onBack={() => setActiveTool(null)} />;
  if (activeTool === 'text') return <TextToPdfTool onBack={() => setActiveTool(null)} />;
  if (activeTool === 'image') return <ImageToPdfTool onBack={() => setActiveTool(null)} />;
  if (activeTool === 'gs_compress') return <GhostscriptTool onBack={() => setActiveTool(null)} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100">
      {/* Dynamic Header */}
      <header className="px-8 pt-16 pb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200">
              <FileOutput className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">PDF Master</h1>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">PRO TOOLSET</p>
            </div>
          </div>
          <div className="flex items-center bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-500 mr-2" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Local Only</span>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="px-6 mb-10">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 max-w-[220px]">
            <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 w-fit px-3 py-1 rounded-full flex items-center mb-6">
              <Zap className="w-3 h-3 text-blue-400 mr-2 fill-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Local Privacy</span>
            </div>
            <h2 className="text-3xl font-bold mb-3 tracking-tight leading-tight">Professional Scanning.</h2>
            <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">Turn your paper trail into high-quality digital assets instantly.</p>
            <button 
              onClick={() => setActiveTool('scan')}
              className="bg-white text-slate-900 px-8 py-3.5 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all hover:bg-blue-50 uppercase tracking-widest"
            >
              Start Scan
            </button>
          </div>
          
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-12 transform -translate-y-1/2 opacity-10 group-hover:scale-110 transition-transform duration-1000">
            <FileOutput className="w-48 h-48" />
          </div>
        </div>
      </div>

      <main className="px-6 flex-grow pb-32">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 px-2">Workflows</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className="group flex items-center p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200 active:scale-[0.98] transition-all text-left"
            >
              <div className={`w-16 h-16 ${tool.color} rounded-2xl flex items-center justify-center mr-5 group-hover:scale-110 transition-transform duration-500`}>
                {tool.icon}
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{tool.title}</h4>
                <p className="text-slate-400 text-xs font-medium leading-tight mt-1">{tool.description}</p>
              </div>
              <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-blue-50 group-hover:translate-x-1 transition-all">
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
              </div>
            </button>
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-slate-50/90 backdrop-blur-md border-t border-slate-100/50">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Privacy Secured: All processing is local</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
