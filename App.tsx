
import React, { useState } from 'react';
import { Camera, FileText, ImageIcon, Minimize2, ChevronRight, FileOutput } from 'lucide-react';
import ScannerTool from './components/ScannerTool';
import TextToPdfTool from './components/TextToPdfTool';
import ImageToPdfTool from './components/ImageToPdfTool';
import CompressPdfTool from './components/CompressPdfTool';
import { ToolType } from './types';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType | null>(null);

  const tools = [
    {
      id: 'scan' as ToolType,
      title: 'Scan Picture',
      description: 'Capture & convert docs with OCR',
      icon: <Camera className="w-8 h-8 text-blue-600" />,
      color: 'bg-blue-50',
    },
    {
      id: 'text' as ToolType,
      title: 'Text to PDF',
      description: 'Convert typed notes instantly',
      icon: <FileText className="w-8 h-8 text-purple-600" />,
      color: 'bg-purple-50',
    },
    {
      id: 'image' as ToolType,
      title: 'Photos to PDF',
      description: 'Combine multiple photos',
      icon: <ImageIcon className="w-8 h-8 text-pink-600" />,
      color: 'bg-pink-50',
    },
    {
      id: 'compress' as ToolType,
      title: 'Compress PDF',
      description: 'Reduce file size efficiently',
      icon: <Minimize2 className="w-8 h-8 text-green-600" />,
      color: 'bg-green-50',
    }
  ];

  if (activeTool === 'scan') return <ScannerTool onBack={() => setActiveTool(null)} />;
  if (activeTool === 'text') return <TextToPdfTool onBack={() => setActiveTool(null)} />;
  if (activeTool === 'image') return <ImageToPdfTool onBack={() => setActiveTool(null)} />;
  if (activeTool === 'compress') return <CompressPdfTool onBack={() => setActiveTool(null)} />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="px-6 pt-12 pb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
            <FileOutput className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">PDF Master</h1>
        </div>
        <p className="text-slate-500 font-medium">All-in-one PDF tools on your phone.</p>
      </header>

      {/* Hero Section Card */}
      <div className="px-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Convert Anything</h2>
            <p className="text-blue-100 mb-6 text-sm max-w-[200px]">Powerful tools for scanning, editing, and optimizing documents.</p>
            <button 
              onClick={() => setActiveTool('scan')}
              className="bg-white text-blue-600 px-6 py-2.5 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-transform"
            >
              Get Started
            </button>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-20 transform rotate-12">
            <FileOutput className="w-48 h-48" />
          </div>
        </div>
      </div>

      {/* Tool Grid */}
      <main className="px-6 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className="flex items-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md active:bg-slate-50 transition-all text-left group"
          >
            <div className={`p-4 ${tool.color} rounded-2xl mr-4 group-hover:scale-110 transition-transform`}>
              {tool.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800">{tool.title}</h3>
              <p className="text-slate-400 text-sm leading-tight">{tool.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </main>

      {/* Sticky Bottom Help (Optional) */}
      <footer className="fixed bottom-0 w-full px-6 py-4 bg-white/80 backdrop-blur-md border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400 font-medium">No server involved. Your files stay on your device.</p>
      </footer>
    </div>
  );
};

export default App;
