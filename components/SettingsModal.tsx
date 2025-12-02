
import React, { useState, useEffect } from 'react';
import { X, Save, Key, Globe, Server, RotateCcw, Box } from 'lucide-react';
import { STORAGE_KEYS } from '../services/geminiService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    // Official
    const [apiKey, setApiKey] = useState('');
    const [officialBaseUrl, setOfficialBaseUrl] = useState('');
    
    // Custom
    const [customUrl, setCustomUrl] = useState('');
    const [customKey, setCustomKey] = useState('');
    const [customModel, setCustomModel] = useState('');

    useEffect(() => {
        if (isOpen) {
            setApiKey(localStorage.getItem(STORAGE_KEYS.API_KEY) || '');
            setOfficialBaseUrl(localStorage.getItem(STORAGE_KEYS.OFFICIAL_BASE_URL) || '');
            
            setCustomUrl(localStorage.getItem(STORAGE_KEYS.CUSTOM_URL) || '');
            setCustomKey(localStorage.getItem(STORAGE_KEYS.CUSTOM_KEY) || '');
            setCustomModel(localStorage.getItem(STORAGE_KEYS.CUSTOM_MODEL) || '');
        }
    }, [isOpen]);

    const handleSave = () => {
        // Official
        if (apiKey.trim()) localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey.trim());
        else localStorage.removeItem(STORAGE_KEYS.API_KEY);

        if (officialBaseUrl.trim()) localStorage.setItem(STORAGE_KEYS.OFFICIAL_BASE_URL, officialBaseUrl.trim());
        else localStorage.removeItem(STORAGE_KEYS.OFFICIAL_BASE_URL);

        // Custom
        if (customUrl.trim()) localStorage.setItem(STORAGE_KEYS.CUSTOM_URL, customUrl.trim());
        else localStorage.removeItem(STORAGE_KEYS.CUSTOM_URL);

        if (customKey.trim()) localStorage.setItem(STORAGE_KEYS.CUSTOM_KEY, customKey.trim());
        else localStorage.removeItem(STORAGE_KEYS.CUSTOM_KEY);

        if (customModel.trim()) localStorage.setItem(STORAGE_KEYS.CUSTOM_MODEL, customModel.trim());
        else localStorage.removeItem(STORAGE_KEYS.CUSTOM_MODEL);

        window.location.reload(); 
    };

    const handleClear = () => {
        if (confirm('Clear all local API settings?')) {
            localStorage.removeItem(STORAGE_KEYS.API_KEY);
            localStorage.removeItem(STORAGE_KEYS.OFFICIAL_BASE_URL);
            localStorage.removeItem(STORAGE_KEYS.CUSTOM_URL);
            localStorage.removeItem(STORAGE_KEYS.CUSTOM_KEY);
            localStorage.removeItem(STORAGE_KEYS.CUSTOM_MODEL);
            window.location.reload();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Key size={18} className="text-primary" />
                        API Configuration
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Official API */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                             <Globe size={14} className="text-primary" />
                             <span className="text-sm font-bold text-white">Official Google API</span>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                                API Key
                            </label>
                            <input 
                                type="password" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-sm text-white focus:border-primary focus:outline-none placeholder:text-zinc-700"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                                Base URL (Optional)
                            </label>
                            <input 
                                type="text" 
                                value={officialBaseUrl}
                                onChange={(e) => setOfficialBaseUrl(e.target.value)}
                                placeholder="e.g. https://my-proxy.com/google"
                                className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-sm text-white focus:border-primary focus:outline-none placeholder:text-zinc-700"
                            />
                            <p className="text-[10px] text-zinc-600">Use this to proxy the Official SDK requests.</p>
                        </div>
                    </div>

                    <div className="h-px bg-zinc-800 w-full" />

                    {/* Custom Proxy */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                             <Server size={14} className="text-blue-400" />
                             <span className="text-sm font-bold text-white">Custom Proxy Provider</span>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                                Proxy Base URL
                            </label>
                            <input 
                                type="text" 
                                value={customUrl}
                                onChange={(e) => setCustomUrl(e.target.value)}
                                placeholder="e.g. https://api.openai.com/v1"
                                className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:outline-none placeholder:text-zinc-700"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                                Proxy API Key
                            </label>
                            <input 
                                type="password" 
                                value={customKey}
                                onChange={(e) => setCustomKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:outline-none placeholder:text-zinc-700"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                                Model ID (Optional)
                            </label>
                            <input 
                                type="text" 
                                value={customModel}
                                onChange={(e) => setCustomModel(e.target.value)}
                                placeholder="e.g. gemini-1.5-pro"
                                className="w-full bg-black/50 border border-zinc-700 rounded p-2 text-sm text-white focus:border-blue-500 focus:outline-none placeholder:text-zinc-700"
                            />
                            <p className="text-[10px] text-zinc-600">Overrides the default model selection.</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between">
                    <button 
                        onClick={handleClear}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-2 rounded hover:bg-red-950/20 transition-colors"
                    >
                        <RotateCcw size={14} /> Reset
                    </button>
                    <button 
                        onClick={handleSave}
                        className="bg-primary hover:bg-emerald-400 text-black font-bold text-sm px-4 py-2 rounded flex items-center gap-2 transition-colors"
                    >
                        <Save size={16} /> Save & Reload
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
