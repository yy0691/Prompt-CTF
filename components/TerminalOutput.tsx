
import React from 'react';

interface TerminalOutputProps {
    content: string;
    label?: string;
    type?: 'neutral' | 'success' | 'error';
    isLoading?: boolean;
}

const TerminalOutput: React.FC<TerminalOutputProps> = ({ content, label = "SYSTEM_OUTPUT", type = 'neutral', isLoading }) => {
    let labelColor = 'text-zinc-500';

    if (type === 'success') {
        labelColor = 'text-primary';
    } else if (type === 'error') {
        labelColor = 'text-red-500';
    }

    return (
        <div className="flex flex-col h-full font-mono text-sm overflow-hidden bg-transparent">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-dashed border-zinc-800 bg-zinc-900/20">
                <span className={`text-[10px] font-bold ${labelColor} uppercase tracking-wider`}>{label}</span>
                <div className="flex gap-1.5 opacity-50">
                    <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                    <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                </div>
            </div>
            
            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1 text-zinc-300 whitespace-pre-wrap leading-relaxed scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                {isLoading ? (
                     <div className="flex flex-col gap-2 mt-4">
                         <div className="flex items-center gap-2 text-zinc-500">
                             <span className="w-1.5 h-3 bg-primary animate-blink"></span>
                             <span className="text-xs">Processing...</span>
                         </div>
                         <div className="space-y-2 opacity-30">
                            <div className="h-2 w-3/4 bg-zinc-700 rounded animate-pulse"></div>
                            <div className="h-2 w-1/2 bg-zinc-700 rounded animate-pulse"></div>
                         </div>
                     </div>
                ) : (
                    content || <span className="text-zinc-700 italic select-none">// Output will appear here...</span>
                )}
            </div>
        </div>
    );
};

export default TerminalOutput;
