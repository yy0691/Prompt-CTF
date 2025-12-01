import React, { useState, useMemo, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Playground from './components/Playground';
import AuthPage from './components/AuthPage';
import Leaderboard from './components/Leaderboard';
import { getCurriculum } from './data/curriculum';
import { UserProgress, User, Language } from './types';
import { syncUser, supabase, logoutUser } from './services/supabaseService';
import { Menu, AlertTriangle, Loader2 } from 'lucide-react';

// Simple JWT decoder (to avoid big library payload on frontend)
function parseJwt (token: string) {
    try {
        var base64Url = token.split('.')[1];
        if (!base64Url) return null;
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); 
  const [authError, setAuthError] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>('en');
  const [view, setView] = useState<'game' | 'leaderboard'>('game');
  const [showSkip, setShowSkip] = useState(false);
  
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
    let mounted = true;

    // Safety Timeout: Force app to load if Auth hangs for more than 15 seconds (e.g. slow network)
    const safetyTimeout = setTimeout(() => {
        if (mounted) {
            console.warn("Auth initialization timed out. Forcing load.");
            setIsAuthLoading(false);
            if (!user) {
                // If we forced load and no user, show skip button in case it's just really slow
                setShowSkip(true);
            }
        }
    }, 15000); // Increased to 15s for better UX on slow connections

    const initAuth = async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            
            // A. Check for Error
            const errorParam = params.get('error');
            if (errorParam) {
                setAuthError(decodeURIComponent(errorParam));
                // Clean URL
                window.history.replaceState({}, document.title, "/");
                return; // Finally block will handle loading state
            }

            // B. Check for Linux.do Token in URL Query Params (Custom Flow)
            const token = params.get('token');
            
            if (token) {
                const decoded = parseJwt(token);
                if (decoded && decoded.sub) {
                    const userData: User = {
                        id: decoded.sub,
                        name: decoded.name || 'Linux.do User',
                        avatar: decoded.avatar,
                        provider: 'linuxdo',
                        totalFlags: 0, 
                        lastFlagAt: Date.now()
                    };
                    // Clear URL to prevent token reuse issues
                    window.history.replaceState({}, document.title, "/");
                    
                    // Attempt login, catch sync errors so we don't block entry
                    await handleLogin(userData).catch(e => console.warn("Sync failed, proceeding offline", e));
                    return;
                }
            }

            // C. Check Supabase Session (Standard OAuth Flow - Google/Github)
            if (supabase) {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.warn("Supabase session error:", error.message);
                } else if (session && session.user) {
                    await handleAuthUser(session.user).catch(e => console.warn("User sync failed", e));
                }
            } else {
                console.log("Supabase not configured. Running in offline/demo mode.");
            }
        } catch (err) {
            console.error("Critical Auth Initialization Error:", err);
            setAuthError("Failed to initialize system. Please refresh.");
        } finally {
            if (mounted) {
                clearTimeout(safetyTimeout);
                setIsAuthLoading(false);
            }
        }
    };

    initAuth();

    // Listen for auth changes (Redirects trigger SIGNED_IN)
    // Safely check if supabase exists before attaching listener
    let subscription: { unsubscribe: () => void } = { unsubscribe: () => {} };
    
    if (supabase) {
        try {
            const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
                console.log("Auth Event:", event);
                if (event === 'SIGNED_IN' && session?.user) {
                    // Only sync if user changed or isn't set
                    if (!user || user.id !== session.user.id) {
                        await handleAuthUser(session.user).catch(console.error);
                    }
                    if (mounted) setIsAuthLoading(false);
                } else if (event === 'SIGNED_OUT') {
                    if (mounted) setUser(null);
                }
            });
            subscription = data.subscription;
        } catch (e) {
            console.error("Failed to attach auth listener", e);
        }
    }

    return () => {
        mounted = false;
        clearTimeout(safetyTimeout);
        subscription.unsubscribe();
    };
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
      await handleLogin(userData);
  };

  // Sync user with DB
  const handleLogin = async (userData: User) => {
    try {
        const syncedUser = await syncUser(userData);
        setUser(syncedUser);
        setAuthError(null); // Clear error on success
    } catch (e) {
        console.error("Sync failed", e);
        // Fallback to local user data if sync fails
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

  if (isAuthLoading) {
    return (
        <div className="flex h-[100dvh] w-screen items-center justify-center bg-background text-zinc-500 flex-col gap-4">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm font-mono animate-pulse">Initializing Protocol Omega...</p>
            <p className="text-xs text-zinc-700">Checking credentials...</p>
            {showSkip && (
                <button 
                    onClick={() => setIsAuthLoading(false)}
                    className="mt-4 px-4 py-2 text-xs text-zinc-400 hover:text-white border border-zinc-800 rounded bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
                >
                    System Unresponsive? Skip Check
                </button>
            )}
        </div>
    );
  }

  if (!user) {
    return <AuthPage lang={lang} initialError={authError} />;
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