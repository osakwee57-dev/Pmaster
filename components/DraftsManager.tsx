
import React, { useEffect, useState } from 'react';
import { ChevronLeft, Trash2, Play, Calendar, FileText, Camera, ImageIcon, Layers, Clock } from 'lucide-react';
import { Draft, ToolType } from '../types';
import { persistenceService } from '../services/persistenceService';

interface DraftsManagerProps {
  onBack: () => void;
  onResume: (draft: Draft) => void;
}

const DraftsManager: React.FC<DraftsManagerProps> = ({ onBack, onResume }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    const list = await persistenceService.getAllDrafts();
    setDrafts(list);
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this draft permanently?')) {
      await persistenceService.deleteDraft(id);
      loadDrafts();
    }
  };

  const getToolIcon = (type: ToolType) => {
    switch (type) {
      case 'scan': return <Camera className="w-5 h-5" />;
      case 'text': return <FileText className="w-5 h-5" />;
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'edit': return <Layers className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <div className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-slate-50/80 backdrop-blur-md z-40">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white rounded-full transition-colors text-slate-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-black text-slate-900">Saved Drafts</h2>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Local Recovery</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <Clock className="w-12 h-12 animate-pulse mb-4" />
            <p className="font-black text-xs uppercase">Loading Drafts...</p>
          </div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <FileText className="w-16 h-16 mb-4 opacity-10" />
            <p className="font-black text-sm uppercase">No active drafts found</p>
            <p className="text-[10px] font-bold mt-2 text-center max-w-[200px]">Unsaved work from any tool will automatically appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {drafts.map((draft) => (
              <div 
                key={draft.id} 
                onClick={() => onResume(draft)}
                className="group bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    draft.type === 'scan' ? 'bg-blue-100 text-blue-600' :
                    draft.type === 'text' ? 'bg-purple-100 text-purple-600' :
                    draft.type === 'image' ? 'bg-pink-100 text-pink-600' :
                    'bg-emerald-100 text-emerald-600'
                  }`}>
                    {getToolIcon(draft.type)}
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, draft.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <h3 className="font-black text-slate-900 truncate pr-4">{draft.title || 'Untitled Document'}</h3>
                <div className="flex items-center space-x-3 mt-2">
                  <div className="flex items-center text-[10px] font-bold text-slate-400">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(draft.lastEdited).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-[10px] font-bold text-slate-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(draft.lastEdited).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="absolute right-4 bottom-4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftsManager;
