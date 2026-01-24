"use client";
import React, { useState, useEffect } from 'react';
import { GlobalConfig } from '../../core/domain/entities/config.entity';
import { HttpConfigRepository } from '../../infrastructure/repositories/http_config.repository';

const configRepo = new HttpConfigRepository();

export const SettingsView: React.FC = () => {
    const [config, setConfig] = useState<GlobalConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
    const [newSubreddit, setNewSubreddit] = useState('');

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const data = await configRepo.get();
                if (!data.SUBREDDITS) data.SUBREDDITS = [];
                setConfig(data);
            } catch (error) {
                console.error('Failed to load config', error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!config) return;
        const { name, value } = e.target;
        setConfig({
            ...config,
            [name]: name === 'REDDIT_LIMIT' ? parseInt(value) || 0 : value
        });
    };

    const addSubreddit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newSubreddit.trim() && config) {
            e.preventDefault();
            const sub = newSubreddit.trim().toLowerCase().replace(/^r\//, '');
            if (!config.SUBREDDITS.includes(sub)) {
                setConfig({
                    ...config,
                    SUBREDDITS: [...config.SUBREDDITS, sub]
                });
            }
            setNewSubreddit('');
        }
    };

    const removeSubreddit = (sub: string) => {
        if (!config) return;
        setConfig({
            ...config,
            SUBREDDITS: config.SUBREDDITS.filter(s => s !== sub)
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;
        setSaving(true);
        setStatus(null);
        try {
            await configRepo.update(config);
            setStatus({ type: 'success', msg: 'Settings saved successfully' });
        } catch (error) {
            setStatus({ type: 'error', msg: 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-slate-500">Loading settings...</div>;
    if (!config) return <div className="p-8 text-rose-500">Error loading configuration.</div>;

    return (
        <section className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900/20 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold">Global Settings</h2>
                        <p className="text-slate-500">The pipeline is optimized to use RSS feeds for anonymous Reddit scraping.</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Main Scraper Section */}
                    <div className="bg-white dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-emerald-500/5">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500">rss_feed</span>
                                <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Anonymous Reddit Scraper (RSS)</h3>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 italic">Target Subreddits</label>
                                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[100px] items-start">
                                    {config.SUBREDDITS.map(sub => (
                                        <div key={sub} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary dark:bg-primary/20 rounded-lg text-xs font-bold ring-1 ring-primary/20">
                                            <span>r/{sub}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeSubreddit(sub)}
                                                className="material-symbols-outlined text-[14px] hover:text-rose-500 transition-colors cursor-pointer"
                                            >
                                                close
                                            </button>
                                        </div>
                                    ))}
                                    <input
                                        type="text"
                                        placeholder="Add subreddit..."
                                        value={newSubreddit}
                                        onChange={(e) => setNewSubreddit(e.target.value)}
                                        onKeyDown={addSubreddit}
                                        className="bg-transparent border-none outline-none text-xs text-slate-700 dark:text-slate-300 py-1.5 px-2 flex-1 min-w-[120px]"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400">RSS Mode: No API credentials required for basic scraping.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Posts per Subreddit</label>
                                    <input name="REDDIT_LIMIT" value={config.REDDIT_LIMIT} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50" type="number" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Min Chars</label>
                                    <input name="MIN_CHARS" value={config.MIN_CHARS} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50" type="number" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Max Chars</label>
                                    <input name="MAX_CHARS" value={config.MAX_CHARS} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50" type="number" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Timeframe</label>
                                    <select name="REDDIT_TIMEFRAME" value={config.REDDIT_TIMEFRAME} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 cursor-pointer">
                                        <option value="hour">Hour</option>
                                        <option value="day">Day</option>
                                        <option value="week">Week</option>
                                        <option value="month">Month</option>
                                        <option value="year">Year</option>
                                        <option value="all">All</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* API & Services Section */}
                    <div className="bg-white dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500">External Integrations</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">OpenAI API Key</label>
                                    <input name="OPENAI_API_KEY" value={config.OPENAI_API_KEY} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50" type="password" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">n8n Webhook URL</label>
                                    <input name="N8N_WEBHOOK_URL" value={config.N8N_WEBHOOK_URL} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50" placeholder="http://localhost:5678/webhook/..." type="text" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legacy / Optional Section */}
                    <div className="group border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all">
                        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 flex items-center justify-between cursor-pointer" onClick={() => {
                            const el = document.getElementById('legacy-section');
                            if (el) el.classList.toggle('hidden');
                        }}>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Advanced Reddit API (Optional)</h3>
                            <span className="material-symbols-outlined text-slate-400 text-sm">expand_more</span>
                        </div>
                        <div id="legacy-section" className="p-6 hidden grid grid-cols-2 gap-6 bg-white dark:bg-background-dark/50">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400">Reddit Client ID</label>
                                <input name="REDDIT_CLIENT_ID" value={config.REDDIT_CLIENT_ID} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-4 py-2 text-sm text-slate-400" type="text" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400">Reddit Secret</label>
                                <input name="REDDIT_CLIENT_SECRET" value={config.REDDIT_CLIENT_SECRET} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-lg px-4 py-2 text-sm text-slate-400" type="password" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        {status && (
                            <p className={`text-sm font-semibold ${status.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {status.msg}
                            </p>
                        )}
                        <div></div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};
