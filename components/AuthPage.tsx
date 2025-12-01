
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Github, Mail, AlertCircle } from 'lucide-react';
import { User, Language } from '../types';
import { getTranslation } from '../lib/translations';
import { loginWithSocial, loginWithEmail, supabase } from '../services/supabaseService';

interface AuthPageProps {
    onLogin: (user: User) => void; // Used for Fallback mode only
    lang: Language;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, lang }) => {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [infoMsg, setInfoMsg] = useState<string | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const t = getTranslation(lang);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleRealLogin = async (provider: 'google' | 'github' | 'linuxdo' | 'email') => {
        setIsLoading(provider);
        setErrorMsg(null);
        setInfoMsg(null);

        try {
            if (provider === 'email') {
                if (!email) throw new Error("Please enter an email address");
                await loginWithEmail(email);
                setInfoMsg(lang === 'zh' ? '登录链接已发送至您的邮箱，请查收。' : 'Magic link sent! Check your email.');
                setIsLoading(null);
            } else {
                await loginWithSocial(provider);
                // Redirect happens automatically
            }
        } catch (error: any) {
            console.error("Login Failed:", error);
            setErrorMsg(error.message || "Authentication failed");
            setIsLoading(null);
        }
    };

    const handleMockLogin = (provider: User['provider']) => {
        setIsLoading(provider);
        timeoutRef.current = window.setTimeout(() => {
            let name = 'Demo User';
            let avatar = undefined;

            if (provider === 'github') {
                name = 'GitHub User';
                avatar = 'https://github.com/shadcn.png';
            } else if (provider === 'google') {
                name = 'Google User';
            } else if (provider === 'linuxdo') {
                name = 'Linux.do User';
                avatar = 'https://linux.do/user_avatar/linux.do/system/288/14605_2.png'; 
            }

            onLogin({
                id: 'usr_' + Math.random().toString(36).substr(2, 9),
                name,
                email: email || `user@${provider}.com`,
                provider,
                avatar,
                totalFlags: 0,
                lastFlagAt: Date.now()
            });
        }, 1500);
    };

    const handleClick = (provider: 'google' | 'github' | 'linuxdo' | 'email') => {
        if (supabase) {
            handleRealLogin(provider);
        } else {
            handleMockLogin(provider === 'email' ? 'email' : provider);
        }
    };

    return (
        <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8 shadow-2xl relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-secondary"></div>
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>

                <div className="flex flex-col items-center text-center mb-8 relative z-10">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800 shadow-inner">
                        <Terminal size={32} className="text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">{t.loginTitle}</h1>
                    <p className="text-muted text-sm">{t.loginSubtitle}</p>
                </div>

                {errorMsg && (
                    <div className="mb-4 p-3 bg-red-950/30 border border-red-900/50 rounded flex items-center gap-2 text-xs text-red-400">
                        <AlertCircle size={14} />
                        {errorMsg}
                    </div>
                )}

                {infoMsg && (
                    <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-900/50 rounded flex items-center gap-2 text-xs text-emerald-400">
                        <Terminal size={14} />
                        {infoMsg}
                    </div>
                )}

                <div className="space-y-4 relative z-10">
                    {/* Google Login */}
                    <button
                        disabled={!!isLoading}
                        onClick={() => handleClick('google')}
                        className="w-full h-11 bg-white hover:bg-zinc-100 text-black font-medium rounded-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading === 'google' ? (
                            <div className="w-5 h-5 border-2 border-zinc-300 border-t-black rounded-full animate-spin"></div>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                                <path fill="#EA4335" d="M12 4.66c1.61 0 3.06.56 4.21 1.64l3.16-3.16C17.45 1.18 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        {t.continueGoogle}
                    </button>

                    {/* GitHub Login */}
                    <button
                        disabled={!!isLoading}
                        onClick={() => handleClick('github')}
                        className="w-full h-11 bg-[#24292e] hover:bg-[#2f363d] text-white font-medium rounded-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                         {isLoading === 'github' ? (
                            <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Github size={20} />
                        )}
                        {t.continueGithub}
                    </button>

                    {/* Linux.do Login */}
                    <button
                        disabled={!!isLoading}
                        onClick={() => handleClick('linuxdo')}
                        className="w-full h-11 bg-[#1e2025] hover:bg-[#2a2d33] border border-zinc-700 text-white font-medium rounded-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                         {isLoading === 'linuxdo' ? (
                            <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12 12-5.373 12-12S18.628 0 12 0zm1.7 18.25c-1.3 0-2.35-1.1-2.35-2.45s1.05-2.45 2.35-2.45 2.35 1.1 2.35 2.45-1.05 2.45-2.35 2.45zm5.7-4.25c0 .65-.55 1.2-1.2 1.2h-.95c-.2 0-.35-.15-.35-.35V11.8c0-.95-.75-1.7-1.7-1.7s-1.7.75-1.7 1.7v2.2c0 .65-.55 1.2-1.2 1.2h-.9c-.65 0-1.2-.55-1.2-1.2V11.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5v2.5z"/>
                                <path d="M14.75 9.5c0 1.25-1 2.25-2.25 2.25S10.25 10.75 10.25 9.5 11.25 7.25 12.5 7.25 14.75 8.25 14.75 9.5z" fill="#FFF"/>
                                <path d="M7 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" fill="#FFC107"/>
                            </svg>
                        )}
                        {t.continueLinuxdo}
                    </button>
                    
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-surface px-2 text-muted">Or</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <input 
                            type="email" 
                            placeholder={t.emailPlaceholder}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-11 bg-zinc-900/50 border border-border rounded-lg px-4 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                        />
                        <button
                            disabled={!!isLoading}
                            onClick={() => handleClick('email')}
                            className="w-full h-11 bg-transparent border border-border hover:bg-zinc-900 text-zinc-300 hover:text-white font-medium rounded-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading === 'email' ? (
                                <div className="w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Mail size={18} />
                            )}
                            {t.continueEmail}
                        </button>
                    </div>
                </div>
                
                <div className="mt-8 text-center">
                    <p className="text-xs text-zinc-600 font-mono">protocol_omega // v1.0.0</p>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
