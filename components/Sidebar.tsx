
import React, { useState } from 'react';
import { Level, Chapter, UserProgress, User, Language } from '../types';
import { Terminal, CheckCircle, Lock, LogOut, User as UserIcon, Globe, ChevronDown, ChevronRight, BookOpen, FlaskConical, Wrench, Layers, Trophy, PanelLeftClose, PanelLeftOpen, Brain, Settings2 } from 'lucide-react';
import { getTranslation } from '../lib/translations';

interface SidebarProps {
  chapters: Chapter[];
  levels: Level[];
  progress: UserProgress;
  user: User;
  lang: Language;
  onSelectLevel: (id: string) => void;
  onSetLang: (lang: Language) => void;
  onLogout: () => void;
  onShowLeaderboard: () => void;
  onOpenSettings: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    chapters, 
    levels, 
    progress, 
    user, 
    lang, 
    onSelectLevel, 
    onSetLang, 
    onLogout, 
    onShowLeaderboard,
    onOpenSettings,
    isCollapsed,
    toggleCollapse
}) => {
  const t = getTranslation(lang);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(
    chapters.reduce((acc, ch) => ({ ...acc, [ch.id]: true }), {})
  );

  const toggleChapter = (chapterId: string) => {
    // If collapsed, clicking a chapter should expand the sidebar first
    if (isCollapsed) {
        toggleCollapse();
        // Ensure this chapter is open
        setOpenChapters(prev => ({ ...prev, [chapterId]: true }));
        return;
    }
    setOpenChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
  };

  const getChapterIcon = (id: string) => {
    switch (id) {
      case 'ch1': return <BookOpen size={18} />;
      case 'ch2': return <Layers size={18} />;
      case 'ch3': return <Brain size={18} />;
      case 'ch4': return <Wrench size={18} />;
      case 'ch5': return <FlaskConical size={18} />;
      default: return <Terminal size={18} />;
    }
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-surface border-r border-border h-full flex flex-col transition-all duration-300 ease-in-out relative shadow-xl z-20`}>
      {/* Header */}
      <div className={`p-4 border-b border-border flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'}`}>
        <div className="flex items-center gap-2 text-primary overflow-hidden whitespace-nowrap">
          <Terminal size={24} className="shrink-0" />
          <h1 className={`font-bold text-lg tracking-wider transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
            {t.appTitle}
          </h1>
        </div>
        
        <button 
            onClick={toggleCollapse} 
            className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Sub-Header Actions (Leaderboard) */}
      {!isCollapsed && (
          <div className="px-6 py-2 flex items-center justify-between animate-in fade-in duration-300">
             <p className="text-[10px] text-muted">v2.1.0 // Online</p>
             <button onClick={onShowLeaderboard} className="text-yellow-500 hover:text-yellow-400 transition-colors" title={t.leaderboard}>
                <Trophy size={16} />
             </button>
          </div>
      )}
      {isCollapsed && (
          <div className="py-2 flex justify-center border-b border-border">
             <button onClick={onShowLeaderboard} className="text-yellow-500 hover:text-yellow-400 p-2 hover:bg-zinc-800 rounded transition-colors" title={t.leaderboard}>
                <Trophy size={20} />
             </button>
          </div>
      )}

      {/* Level List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700">
        {!isCollapsed && <h3 className="text-[10px] font-semibold text-muted uppercase tracking-widest px-2 mb-2">{t.missionLog}</h3>}
        
        {chapters.map((chapter) => {
            const chapterLevels = levels.filter(l => l.chapterId === chapter.id);
            if (chapterLevels.length === 0) return null;

            const isOpen = openChapters[chapter.id];
            const isChapterComplete = chapterLevels.every(l => progress.completedLevels.includes(l.id));
            const isAnyLevelActive = chapterLevels.some(l => l.id === progress.currentLevelId);

            return (
                <div key={chapter.id} className="space-y-1">
                    {/* Chapter Header */}
                    <button 
                        onClick={() => toggleChapter(chapter.id)}
                        className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded transition-colors
                            ${isCollapsed ? 'justify-center' : 'justify-between'}
                            ${isAnyLevelActive && isCollapsed ? 'bg-zinc-800/50 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'}
                        `}
                        title={isCollapsed ? chapter.title : undefined}
                    >
                        <div className="flex items-center gap-3">
                             <span className={`${isChapterComplete ? "text-primary" : "text-zinc-500"} transition-colors`}>
                                {getChapterIcon(chapter.id)}
                             </span>
                             {!isCollapsed && <span className="truncate max-w-[120px] text-left">{chapter.title}</span>}
                        </div>
                        {!isCollapsed && (
                            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                        )}
                    </button>

                    {/* Nested Levels (Only show if not collapsed and chapter is open) */}
                    {isOpen && !isCollapsed && (
                        <div className="ml-4 pl-2 border-l border-zinc-800 space-y-1 animate-in slide-in-from-left-1 duration-200">
                            {chapterLevels.map((level) => {
                                const isCompleted = progress.completedLevels.includes(level.id);
                                const isActive = progress.currentLevelId === level.id;
                                
                                const globalIndex = levels.findIndex(l => l.id === level.id);
                                const isLocked = globalIndex > 0 && !progress.completedLevels.includes(levels[globalIndex - 1].id);

                                return (
                                    <button
                                    key={level.id}
                                    disabled={isLocked && !isCompleted}
                                    onClick={() => onSelectLevel(level.id)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-xs transition-all flex items-center justify-between group
                                        ${isActive ? 'bg-zinc-800 text-white border-l-2 border-primary shadow-sm' : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200'}
                                        ${isLocked && !isCompleted ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                    >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="truncate">{level.title}</span>
                                    </div>
                                    {isLocked && !isCompleted && <Lock size={10} />}
                                    {isCompleted && <CheckCircle size={10} className="text-primary" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        })}
      </div>

      {/* Footer */}
      <div className={`p-4 border-t border-border bg-zinc-900/50 flex flex-col gap-3 transition-all ${isCollapsed ? 'items-center' : ''}`}>
        
        {/* Progress Bar (Hidden when collapsed) */}
        {!isCollapsed && (
            <div className="px-1 w-full">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                    <span>{t.flags}</span>
                    <span className="font-mono text-primary">{user.totalFlags || progress.completedLevels.length}/{levels.length}</span>
                </div>
                <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                    <div 
                        className="bg-primary h-full transition-all duration-500" 
                        style={{ width: `${(progress.completedLevels.length / levels.length) * 100}%` }}
                    />
                </div>
            </div>
        )}

        {!isCollapsed && <div className="h-px bg-zinc-800 w-full" />}
        
        {/* User Info */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full`}>
            <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 flex items-center justify-center shrink-0">
                {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <UserIcon size={14} className="text-zinc-500" />}
            </div>
            {!isCollapsed && (
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{user.name}</p>
                </div>
            )}
        </div>

        {/* Action Buttons */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-4 mt-2' : 'justify-between'} w-full`}>
            <button 
                onClick={() => onSetLang(lang === 'en' ? 'zh' : 'en')}
                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
                title={t.reset}
            >
                <Globe size={isCollapsed ? 18 : 14} />
                {!isCollapsed && <span>{lang === 'en' ? 'English' : '中文'}</span>}
            </button>

            <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
                title={t.settings}
            >
                <Settings2 size={isCollapsed ? 18 : 14} />
                {!isCollapsed && <span>{t.settings}</span>}
            </button>

            <button 
                onClick={onLogout}
                className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                title={t.signOut}
            >
                <LogOut size={isCollapsed ? 18 : 14} />
                {!isCollapsed && <span>{t.signOut}</span>}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
