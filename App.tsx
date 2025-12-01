import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Playground from './components/Playground';
import AuthPage from './components/AuthPage';
import Leaderboard from './components/Leaderboard';
import { getCurriculum } from './data/curriculum';
import { UserProgress, User, Language } from './types';
import { syncUser, supabase, logoutUser } from './services/supabaseService';
import { Menu, AlertTriangle } from 'lucide-react';

// Simple JWT decoder (to avoid big library payload on frontend)
function parseJwt (token: string) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<Language>('en');
  const [view, setView] = useState<'game' | 'leaderboard'>('game');
  
  // Mobile sidebar toggle
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  // Desktop sidebar collapse
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  
  const [progress, setProgress] = useState<UserProgress>({
    completedLevels: [],
    currentLevelId: 'L1-1'
  });

  // 1. Session Listener (For Real Auth)
  useEffect(() => {
    // A. Check for Linux.do Token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
        try {
            const decoded = parseJwt(token);
            const userData: User = {
                id: decoded.sub,
                name: decoded.name || 'Linux.do User',
                avatar: decoded.avatar,
                provider: 'linuxdo',
                totalFlags: 0, 
                lastFlagAt: Date.now()
            };
            // Clear URL
            window.history.replaceState({}, document.title, "/");
            // Sync
            handleLogin(userData);
            return;
        } catch (e) {
            console.error("Invalid Token", e);
        }
    }

    // B. Check Supabase Session
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
            handleAuthUser(session.user);
        }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session && session.user) {
            handleAuthUser(session.user);
        } else if (!token) { 
            // Only clear user if we aren't in the middle of a LinuxDo login
            setUser(null);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helper to normalize Supabase user to App User
  const handleAuthUser = async (sbUser: any) => {
      const provider = sbUser.app_metadata.provider || 'email';
      const userData: User = {
          id: sbUser.id,
          name: sbUser.user_metadata.full_name || sbUser.email?.split('@')[0] || 'Agent',
          email: sbUser.email,
          avatar: sbUser.user_metadata.avatar_url,
          provider: provider as any,
          totalFlags: 0,
          lastFlagAt: Date.now()
      };
      // Sync with DB to get real stats
      handleLogin(userData);
  };

  // Sync user with DB
  const handleLogin = async (userData: User) => {
    try {
        const syncedUser = await syncUser(userData);
        setUser(syncedUser);
    } catch (e) {
        console.error("Sync failed", e);
        setUser(userData);
    }
  };

  const handleLogout = async () => {
      if (supabase) {
          await logoutUser();
      }
      setUser(null);
  };

  const { chapters, levels } = useMemo(() => {
    try {
      return getCurriculum(lang);
    } catch (e) {
      console.error("Failed to load curriculum:", e);
      return { chapters: [], levels: [] };
    }
  }, [lang]);
  
  const currentLevel = useMemo(() => {
    if (!levels || levels.length === 0) return null;
    return levels.find(l => l.id === progress.currentLevelId) || levels[0];
  }, [levels, progress.currentLevelId]);

  const handleLevelSelect = (id: string) => {
    setProgress(prev => ({ ...prev, currentLevelId: id }));
    setSidebarOpen(false);
    setView('game');
  };

  const handleLevelComplete = (levelId: string) => {
    setProgress(prev => {
        const newCompleted = prev.completedLevels.includes(levelId) 
            ? prev.completedLevels 
            : [...prev.completedLevels, levelId];
        
        return {
            ...prev,
            completedLevels: newCompleted,
        };
    });
    // Update local user stats for UI display immediately
    if (user) {
        setUser({ ...user, totalFlags: (user.totalFlags || 0) + 1 });
    }
  };

  if (!user) {
    return <AuthPage onLogin={handleLogin} lang={lang} />;
  }

  if (!currentLevel || levels.length === 0) {
    return (
      <div className="flex h-[100dvh] w-screen items-center justify-center bg-background text-red-400 flex-col gap-4">
        <AlertTriangle size={48} />
        <h1 className="text-xl font-bold">System Error</h1>
        <p className="text-zinc-500">Failed to load curriculum data. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-screen bg-background overflow-hidden text-zinc-100 font-sans selection:bg-primary/30">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/80 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-all duration-300 ease-in-out shrink-0 h-full`}>
        <Sidebar 
            chapters={chapters}
            levels={levels} 
            progress={progress}
            user={user}
            lang={lang}
            onSelectLevel={handleLevelSelect}
            onSetLang={setLang}
            onLogout={handleLogout}
            onShowLeaderboard={() => {
                setView('leaderboard');
                setSidebarOpen(false);
            }}
            isCollapsed={isDesktopCollapsed}
            toggleCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 transition-all duration-300">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-border flex items-center gap-3 bg-surface shrink-0">
            <button onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
            </button>
            <span className="font-bold">PROMPT_CTF</span>
        </div>

        {view === 'leaderboard' ? (
            <Leaderboard lang={lang} onBack={() => setView('game')} />
        ) : (
            <Playground 
                level={currentLevel} 
                lang={lang}
                userId={user.id}
                onLevelComplete={handleLevelComplete}
            />
        )}
      </div>
    </div>
  );
}