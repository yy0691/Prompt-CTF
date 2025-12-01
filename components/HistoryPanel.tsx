
import React from 'react';
import { Submission } from '../types';
import { Clock, CheckCircle, XCircle, ChevronRight, RotateCcw } from 'lucide-react';

interface HistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    history: Submission[];
    onRestore: (prompt: string) => void;
    lang: 'en' | 'zh';
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, history, onRestore, lang }) => {
    const t = lang === 'zh' ? {
        title: "历史记录",
        empty: "暂无记录",
        restore: "恢复",
        success: "成功",
        fail: "失败"
    } : {
        title: "History",
        empty: "No history found",
        restore: "Restore",
        success: "Success",
        fail: "Fail"
    };

    return (
        <div className={`absolute top-0 right-0 h-full w-80 bg-surface border-l border-border shadow-2xl transform transition-transform duration-300 z-20 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 border-b border-border flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-2 text-zinc-100 font-medium">
                    <Clock size={16} />
                    <span>{t.title}</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded text-zinc-400">
                    <ChevronRight size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {history.length === 0 ? (
                    <div className="text-center text-zinc-500 text-sm mt-10 italic">{t.empty}</div>
                ) : (
                    history.map((item) => (
                        <div key={item.id} className="bg-zinc-900/50 border border-zinc-800 rounded p-3 hover:border-zinc-700 transition-colors group">
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${item.success ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50' : 'bg-red-950/30 text-red-400 border-red-900/50'}`}>
                                    {item.success ? t.success : t.fail}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                    {new Date(item.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            <p className="text-xs text-zinc-300 font-mono line-clamp-2 mb-2 bg-black p-1.5 rounded opacity-80">
                                {item.prompt}
                            </p>
                            <button 
                                onClick={() => {
                                    onRestore(item.prompt);
                                    onClose();
                                }}
                                className="w-full py-1 text-[10px] font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <RotateCcw size={10} />
                                {t.restore}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistoryPanel;
