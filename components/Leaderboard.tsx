
import React, { useEffect, useState } from 'react';
import { LeaderboardEntry, Language } from '../types';
import { getLeaderboard } from '../services/supabaseService';
import { Trophy, User, Calendar, Shield } from 'lucide-react';
import { getTranslation } from '../lib/translations';

interface LeaderboardProps {
    lang: Language;
    onBack: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ lang, onBack }) => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const t = getTranslation(lang);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await getLeaderboard();
            setEntries(data);
            setLoading(false);
        };
        load();
    }, []);

    const formatDate = (timestamp: number) => {
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto bg-background animate-in fade-in zoom-in-95 duration-300">
            <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/10 rounded-full border border-yellow-500/20">
                            <Trophy size={32} className="text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-wide">{t.leaderboard}</h2>
                            <p className="text-zinc-500 text-sm">Top operatives ranking</p>
                        </div>
                    </div>
                    <button 
                        onClick={onBack}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-sm font-medium transition-colors"
                    >
                        {t.backToGame}
                    </button>
                </div>

                <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-zinc-900/50 border-b border-border text-xs uppercase tracking-wider text-muted font-medium">
                                    <th className="px-6 py-4 w-20 text-center">#</th>
                                    <th className="px-6 py-4">{t.player}</th>
                                    <th className="px-6 py-4 text-center">{t.score}</th>
                                    <th className="px-6 py-4 text-right">{t.lastActive}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-zinc-500 italic">
                                            Scanning database...
                                        </td>
                                    </tr>
                                ) : entries.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                                            No records found. Be the first.
                                        </td>
                                    </tr>
                                ) : (
                                    entries.map((entry, idx) => (
                                        <tr 
                                            key={entry.userId} 
                                            className={`
                                                group transition-colors hover:bg-zinc-800/30
                                                ${idx === 0 ? 'bg-yellow-500/5' : ''}
                                                ${idx === 1 ? 'bg-zinc-300/5' : ''}
                                                ${idx === 2 ? 'bg-amber-700/5' : ''}
                                            `}
                                        >
                                            <td className="px-6 py-4 text-center">
                                                <div className={`
                                                    w-8 h-8 mx-auto flex items-center justify-center rounded-full font-bold text-sm font-mono
                                                    ${idx === 0 ? 'bg-yellow-500 text-black' : 
                                                      idx === 1 ? 'bg-zinc-300 text-black' : 
                                                      idx === 2 ? 'bg-amber-700 text-white' : 'text-zinc-500 bg-zinc-900'}
                                                `}>
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 flex items-center justify-center">
                                                        {entry.avatar ? (
                                                            <img src={entry.avatar} alt="av" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={14} className="text-zinc-500" />
                                                        )}
                                                    </div>
                                                    <span className={`font-medium ${idx < 3 ? 'text-white' : 'text-zinc-300'}`}>
                                                        {entry.name}
                                                    </span>
                                                    {idx === 0 && <Shield size={12} className="text-yellow-500" />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-mono text-primary font-bold">{entry.flagCount}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs text-zinc-500 font-mono">
                                                {formatDate(entry.lastActive)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
