
import React, { useState, useEffect, useRef } from 'react';
import { Level, ModelType, RunResult, Language, Submission } from '../types';
import { generateResponse, judgeSubmission } from '../services/geminiService';
import { saveSubmission, getHistory } from '../services/supabaseService';
import TerminalOutput from './TerminalOutput';
import HistoryPanel from './HistoryPanel';
import { Play, RotateCcw, Cpu, Flag, AlertTriangle, Sparkles, History as HistoryIcon, ChevronUp, ChevronDown, Zap, ShieldCheck } from 'lucide-react';
import Confetti from './Confetti';
import { getTranslation } from '../lib/translations';

interface PlaygroundProps {
    level: Level;
    lang: Language;
    userId: string;
    onLevelComplete: (levelId: string) => void;
}

const Playground: React.FC<PlaygroundProps> = ({ level, lang, userId, onLevelComplete }) => {
    // 1. Initialize with Empty Prompt
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState<ModelType>(ModelType.GeminiFlash);
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<RunResult | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [history, setHistory] = useState<Submission[]>([]);
    const [isMissionExpanded, setIsMissionExpanded] = useState(true);
    
    const confettiTimeoutRef = useRef<number | null>(null);
    const t = getTranslation(lang);

    // Reset state when level changes
    useEffect(() => {
        setPrompt(""); // Clear editor
        setResult(null);
        setIsRunning(false);
        setShowConfetti(false);
        setIsMissionExpanded(true);
        if (confettiTimeoutRef.current) window.clearTimeout(confettiTimeoutRef.current);
        
        // Load history for this level
        loadHistory();
    }, [level]);

    const loadHistory = async () => {
        const data = await getHistory(userId, level.id);
        setHistory(data);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (confettiTimeoutRef.current) window.clearTimeout(confettiTimeoutRef.current);
        };
    }, []);

    const handleRun = async () => {
        if (!prompt.trim()) return;

        setIsRunning(true);
        setResult(null);
        setShowConfetti(false);

        const startTime = Date.now();

        // 1. Generate Content
        const output = await generateResponse(prompt, model);

        // 2. Judge Content
        const judgeResult = await judgeSubmission(level, prompt, output, lang);
        
        const duration = Date.now() - startTime;

        setResult(judgeResult);
        setIsRunning(false);

        // 3. Save to History (Supabase)
        const newSubmission: Submission = {
            id: 'sub_' + Math.random().toString(36).substr(2, 9),
            userId,
            levelId: level.id,
            prompt,
            output: judgeResult.output,
            success: judgeResult.success,
            feedback: judgeResult.feedback,
            timestamp: Date.now(),
            durationMs: duration
        };
        
        await saveSubmission(newSubmission);
        await loadHistory(); // Refresh history list

        if (judgeResult.success) {
            setShowConfetti(true);
            onLevelComplete(level.id);
            if (confettiTimeoutRef.current) window.clearTimeout(confettiTimeoutRef.current);
            confettiTimeoutRef.current = window.setTimeout(() => setShowConfetti(false), 5000);
        }
    };

    const handleReset = () => {
        setPrompt("");
        setResult(null);
        setShowConfetti(false);
        if (confettiTimeoutRef.current) window.clearTimeout(confettiTimeoutRef.current);
    };

    return (
        <div className="flex flex-col h-full bg-background text-zinc-100 overflow-hidden relative font-sans">
            {showConfetti && <Confetti />}
            
            {/* History Panel */}
            <HistoryPanel 
                isOpen={isHistoryOpen} 
                onClose={() => setIsHistoryOpen(false)}
                history={history}
                onRestore={setPrompt}
                lang={lang}
            />
            
            {/* 1. Header & Mission Brief (Collapsible) */}
            <div className="border-b border-border bg-surface/50 backdrop-blur-sm z-10 transition-all duration-300 shrink-0">
                <div className="p-4 flex justify-between items-start">
                    <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => setIsMissionExpanded(!isMissionExpanded)}
                    >
                        <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider ${
                                level.category === 'Hardcore' ? 'bg-red-950/30 text-red-400 border-red-900/50' : 
                                level.category === 'Research' ? 'bg-purple-950/30 text-purple-400 border-purple-900/50' :
                                'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}>
                                {level.category}
                            </span>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                {level.title}
                                {isMissionExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                            </h2>
                        </div>
                        {!isMissionExpanded && (
                            <p className="text-xs text-zinc-400 mt-1 truncate max-w-xl">{level.description}</p>
                        )}
                    </div>

                    <div className="flex gap-2 items-center">
                         {/* Stats Pill */}
                         <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-zinc-800 rounded text-xs text-zinc-400 mr-2">
                             <ShieldCheck size={14} className={result?.success ? "text-primary" : "text-zinc-600"} />
                             <span>{result?.success ? t.passed : t.verdict}</span>
                         </div>
                    </div>
                </div>
                
                {isMissionExpanded && (
                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <h3 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <Zap size={12} /> {t.missionObjective}
                                </h3>
                                <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/50 p-3 rounded border border-zinc-800/50">
                                    {level.missionBrief}
                                </p>
                            </div>
                            
                            {/* Example / Hint Section */}
                            <div className="w-full md:w-1/3 bg-red-950/10 border border-red-900/20 rounded p-3">
                                 <h3 className="text-xs font-semibold text-red-400 mb-1 flex items-center gap-1 opacity-80">
                                    <AlertTriangle size={12} /> {t.failureExample}
                                 </h3>
                                 <div className="text-xs text-red-200/60 font-mono space-y-1">
                                    <div><span className="opacity-40">User:</span> {level.badExample.prompt}</div>
                                    <div><span className="opacity-40"> AI:</span> {level.badExample.output}</div>
                                 </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Control Toolbar */}
            <div className="h-14 bg-zinc-900 border-b border-border flex items-center justify-between px-4 shrink-0 shadow-md z-20">
                <div className="flex items-center gap-3">
                     <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 font-mono hidden md:inline">MODEL:</span>
                        <select 
                            value={model}
                            onChange={(e) => setModel(e.target.value as ModelType)}
                            className="bg-zinc-800 border border-zinc-700 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-primary text-zinc-300 w-32 md:w-40"
                        >
                            <option value={ModelType.GeminiFlash}>Gemini 2.5 Flash</option>
                            <option value={ModelType.GeminiPro}>Gemini 2.0 Pro</option>
                        </select>
                     </div>
                     <div className="h-4 w-px bg-zinc-800 mx-1"></div>
                     <button 
                        onClick={() => setIsHistoryOpen(true)}
                        className="text-zinc-400 hover:text-white transition-colors p-1.5 hover:bg-zinc-800 rounded"
                        title={t.history}
                    >
                        <HistoryIcon size={16} />
                    </button>
                    <button 
                        onClick={handleReset}
                        className="text-zinc-400 hover:text-white transition-colors p-1.5 hover:bg-zinc-800 rounded"
                        title={t.reset}
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                     <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Auto-Verification</span>
                        <span className="text-[10px] text-zinc-600">AI Judge Active</span>
                     </div>
                     <button
                        onClick={handleRun}
                        disabled={isRunning || !prompt.trim()}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded font-bold text-sm transition-all shadow-lg
                            ${isRunning || !prompt.trim()
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                                : 'bg-primary text-zinc-950 hover:bg-emerald-400 hover:scale-105 active:scale-95'
                            }
                        `}
                    >
                        {isRunning ? <Cpu size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                        {isRunning ? t.compiling : "Run & Verify"}
                    </button>
                </div>
            </div>

            {/* 3. Split View: Editor & Output */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-zinc-950/30">
                {/* Editor Section */}
                {/* On mobile: take 40% height. On desktop: take 50% width and full height. */}
                <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-border bg-background relative group h-[40%] md:h-auto shrink-0">
                    <span className="absolute top-0 right-0 p-2 text-[10px] font-mono text-zinc-600 bg-zinc-900/80 rounded-bl backdrop-blur-sm z-10 pointer-events-none group-hover:text-zinc-400 transition-colors">
                        EDITOR
                    </span>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="flex-1 w-full bg-transparent p-4 font-mono text-sm text-zinc-200 focus:outline-none resize-none leading-relaxed placeholder:text-zinc-700"
                        placeholder={t.inputPlaceholder}
                        spellCheck={false}
                    />
                </div>

                {/* Output & Verdict Section */}
                {/* On mobile: take remaining height (approx 60%). On desktop: take 50% width. */}
                <div className="w-full md:w-1/2 flex flex-col bg-zinc-900/20 h-[60%] md:h-auto min-h-0">
                     {/* The output area needs min-h-0 to allow proper scrolling within flex items */}
                     <div className="flex-1 min-h-0 relative">
                        <TerminalOutput 
                            content={result?.output || ''} 
                            isLoading={isRunning}
                            label={t.systemOutput}
                            type={result?.success ? 'success' : 'neutral'}
                        />
                     </div>
                     
                     {/* Feedback Panel */}
                     {result && (
                        <div className={`border-t p-4 animate-in slide-in-from-bottom-5 duration-300 shrink-0
                             ${result.success ? 'border-primary/30 bg-primary/5' : 'border-red-900/30 bg-red-950/10'}
                        `}>
                             <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-full ${result.success ? 'bg-primary text-black' : 'bg-red-500/20 text-red-500'}`}>
                                        {result.success ? <Flag size={14} fill="currentColor" /> : <AlertTriangle size={14} />}
                                    </div>
                                    <span className={`text-sm font-bold ${result.success ? 'text-primary' : 'text-red-400'}`}>
                                        {result.success ? "Flag Captured!" : "Challenge Failed"}
                                    </span>
                                </div>
                                {result.success && <span className="text-[10px] font-mono text-primary/70">{result.flag}</span>}
                             </div>
                             <p className="text-sm text-zinc-300 leading-snug">{result.feedback}</p>
                        </div>
                     )}
                </div>
            </div>
        </div>
    );
};

export default Playground;
