
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Submission, LeaderboardEntry, User } from "../types";

/**
 * --- DATABASE SETUP (Run in Supabase SQL Editor) ---
 * 
 * create table users (
 *   id text primary key,
 *   name text,
 *   email text,
 *   avatar text,
 *   provider text,
 *   total_flags int default 0,
 *   last_flag_at bigint
 * );
 * 
 * create table submissions (
 *   id text primary key,
 *   user_id text references users(id),
 *   level_id text not null,
 *   prompt text,
 *   output text,
 *   success boolean,
 *   feedback text,
 *   duration_ms int,
 *   timestamp bigint
 * );
 */

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

// Export client for App.tsx usage (Session Listener)
export let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.warn("Supabase keys missing. Falling back to LocalStorage.");
}

// --- AUTHENTICATION API ---

export const loginWithSocial = async (provider: 'google' | 'github' | 'linuxdo') => {
    if (!supabase) throw new Error("Supabase not configured");
    
    // Note: Linux.do would require a custom OIDC provider configuration in Supabase.
    // We map 'linuxdo' to a custom provider string if needed, or assume standard OAuth.
    // For this example, we treat it as an OIDC flow if configured, otherwise standard OAuth.
    const providerName = provider === 'linuxdo' ? 'oidc' : provider; 
    
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: providerName,
        options: {
            // Redirect back to the deployment URL
            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
            // For Linux.do custom OIDC, you might need extra scopes or params
            // queryParams: provider === 'linuxdo' ? { 'issuer': 'https://linux.do' } : undefined
        }
    });

    if (error) throw error;
    return data;
};

export const loginWithEmail = async (email: string) => {
    if (!supabase) throw new Error("Supabase not configured");
    
    // Uses Magic Link
    const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        }
    });

    if (error) throw error;
    return data;
};

export const logoutUser = async () => {
    if (supabase) {
        await supabase.auth.signOut();
    }
};

export const getCurrentSession = async () => {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

// --- LOCAL STORAGE FALLBACKS ---
const STORAGE_KEY_SUBMISSIONS = 'prompt_ctf_submissions';
const STORAGE_KEY_USERS = 'prompt_ctf_users';

const getLocalSubmissions = (): Submission[] => {
    const data = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
    return data ? JSON.parse(data) : [];
};

const getLocalUsers = (): User[] => {
    const data = localStorage.getItem(STORAGE_KEY_USERS);
    return data ? JSON.parse(data) : [];
};

// --- DATA API ---

export const saveSubmission = async (submission: Submission): Promise<void> => {
    if (supabase) {
        const { error } = await supabase.from('submissions').insert(submission);
        if (error) console.error("Supabase Save Error:", error);

        if (submission.success) {
            // Recalculate unique flags
            const { data: solvedData } = await supabase
                .from('submissions')
                .select('level_id')
                .eq('user_id', submission.userId)
                .eq('success', true);
            
            // Use a Set to count unique level IDs
            const uniqueSolved = new Set((solvedData || []).map((s: any) => s.level_id)).size;

            await supabase.from('users').update({
                total_flags: uniqueSolved,
                last_flag_at: Date.now()
            }).eq('id', submission.userId);
        }
    } else {
        const submissions = getLocalSubmissions();
        submissions.push(submission);
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));

        if (submission.success) {
            const users = getLocalUsers();
            const userIndex = users.findIndex(u => u.id === submission.userId);
            if (userIndex >= 0) {
                const userSubs = submissions.filter(s => s.userId === submission.userId && s.success);
                const uniqueLevels = new Set(userSubs.map(s => s.levelId));
                users[userIndex].totalFlags = uniqueLevels.size;
                users[userIndex].lastFlagAt = Date.now();
                localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
            }
        }
    }
};

export const getHistory = async (userId: string, levelId: string): Promise<Submission[]> => {
    if (supabase) {
        const { data, error } = await supabase
            .from('submissions')
            .select('*')
            .eq('user_id', userId)
            .eq('level_id', levelId)
            .order('timestamp', { ascending: false });
        
        if (error) {
            console.error("Supabase History Error:", error);
            return [];
        }
        return data || [];
    } else {
        const submissions = getLocalSubmissions();
        return submissions
            .filter(s => s.userId === userId && s.levelId === levelId)
            .sort((a, b) => b.timestamp - a.timestamp);
    }
};

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    if (supabase) {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, avatar, total_flags, last_flag_at')
            .order('total_flags', { ascending: false })
            .order('last_flag_at', { ascending: true })
            .limit(50);
        
        if (error) {
            console.error("Supabase Leaderboard Error:", error);
            return [];
        }

        return (data || []).map((u: any, index: number) => ({
            userId: u.id,
            name: u.name || 'Anonymous',
            avatar: u.avatar,
            flagCount: u.total_flags || 0,
            lastActive: u.last_flag_at || 0,
            rank: index + 1
        }));
    } else {
        const users = getLocalUsers();
        const sorted = users.sort((a, b) => {
            if (b.totalFlags !== a.totalFlags) return b.totalFlags - a.totalFlags;
            return (b.lastFlagAt || 0) - (a.lastFlagAt || 0);
        });

        return sorted.map((u, index) => ({
            userId: u.id,
            name: u.name,
            avatar: u.avatar,
            flagCount: u.totalFlags || 0,
            lastActive: u.lastFlagAt || 0,
            rank: index + 1
        }));
    }
};

export const syncUser = async (user: User): Promise<User> => {
    if (supabase) {
        const { data, error } = await supabase
            .from('users')
            .upsert({
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                provider: user.provider
            }, { onConflict: 'id' })
            .select()
            .single();
        
        if (error) {
            console.error("Supabase Sync User Error:", error);
            return user;
        }
        
        return {
            ...user,
            totalFlags: data.total_flags || 0,
            lastFlagAt: data.last_flag_at
        };
    } else {
        const users = getLocalUsers();
        const existing = users.find(u => u.id === user.id);
        if (existing) {
            return existing;
        } else {
            const newUser = { ...user, totalFlags: 0, lastFlagAt: Date.now() };
            users.push(newUser);
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
            return newUser;
        }
    }
};
