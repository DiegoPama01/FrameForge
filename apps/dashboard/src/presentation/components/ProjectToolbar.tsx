"use client";
import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { ApiClient } from '../../infrastructure/api/api.client';

interface ProjectToolbarProps {
    statusFilter: string;
    setStatusFilter: (s: string) => void;
    categoryFilter: string;
    setCategoryFilter: (c: string) => void;
    onlyErrors: boolean;
    setOnlyErrors: (e: boolean) => void;
    categories: string[];
    statuses: string[];
}

export const ProjectToolbar: React.FC<ProjectToolbarProps> = ({
    statusFilter, setStatusFilter,
    categoryFilter, setCategoryFilter,
    onlyErrors, setOnlyErrors,
    categories, statuses
}) => {
    const { refresh, view, setView } = useProject();
    const [triggering, setTriggering] = useState(false);
    const [harvesting, setHarvesting] = useState(false);

    // Dropdown states
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    const handleTrigger = async () => {
        setTriggering(true);
        try {
            await ApiClient.triggerN8n();
            alert('Pipeline triggered successfully! Check n8n for progress.');
        } catch (error) {
            console.error('Failed to trigger n8n', error);
            alert('Failed to trigger pipeline.');
        } finally {
            setTriggering(false);
        }
    };

    const handleHarvest = async () => {
        setHarvesting(true);
        try {
            const res = await ApiClient.harvestProjects();
            alert(`Harvesting complete! Found ${res.harvested_count} new stories.`);
            await refresh();
        } catch (error) {
            console.error('Failed to harvest', error);
            alert('Failed to harvest stories.');
        } finally {
            setHarvesting(false);
        }
    };

    return (
        <section className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
                {/* View Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mr-2">
                    <button
                        onClick={() => setView('projects')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${view === 'projects' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => setView('logs')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${view === 'logs' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Logs
                    </button>
                </div>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

                {/* Status Filter */}
                <div className="relative">
                    <div
                        onClick={() => setIsStatusOpen(!isStatusOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Status:</span>
                        <span className="text-slate-900 dark:text-slate-100">{statusFilter}</span>
                        <span className="material-symbols-outlined text-[14px]">expand_more</span>
                    </div>
                    {isStatusOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsStatusOpen(false)}></div>
                            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-20 overflow-hidden">
                                {statuses.map(s => (
                                    <div
                                        key={s}
                                        onClick={() => { setStatusFilter(s); setIsStatusOpen(false); }}
                                        className={`px-4 py-2 text-xs hover:bg-primary/10 cursor-pointer transition-colors ${statusFilter === s ? 'text-primary font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                                    >
                                        {s}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Category Filter */}
                <div className="relative">
                    <div
                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        <span className="text-slate-500 text-[10px] uppercase font-bold">Category:</span>
                        <span className="text-slate-900 dark:text-slate-100">{categoryFilter === 'All' ? 'All Subreddits' : `r/${categoryFilter}`}</span>
                        <span className="material-symbols-outlined text-[14px]">expand_more</span>
                    </div>
                    {isCategoryOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsCategoryOpen(false)}></div>
                            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-20 max-h-60 overflow-auto">
                                {categories.map(c => (
                                    <div
                                        key={c}
                                        onClick={() => { setCategoryFilter(c || 'All'); setIsCategoryOpen(false); }}
                                        className={`px-4 py-2 text-xs hover:bg-primary/10 cursor-pointer transition-colors ${categoryFilter === c ? 'text-primary font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                                    >
                                        {c === 'All' ? 'All Subreddits' : `r/${c}`}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Errors Toggle */}
                <label className="flex items-center gap-3 cursor-pointer group ml-2">
                    <span className="text-xs font-bold uppercase text-slate-500 group-hover:text-primary transition-colors">Only Errors</span>
                    <div className="relative">
                        <input
                            checked={onlyErrors}
                            onChange={(e) => setOnlyErrors(e.target.checked)}
                            className="sr-only peer"
                            type="checkbox"
                        />
                        <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </div>
                </label>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={handleHarvest}
                    disabled={harvesting}
                    className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[18px]">rss_feed</span>
                    <span>{harvesting ? 'Scraping...' : 'Scrape Stories'}</span>
                </button>
                <button
                    onClick={handleTrigger}
                    disabled={triggering}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[18px]">sync</span>
                    <span>{triggering ? 'Triggering...' : 'Refresh All'}</span>
                </button>
            </div>
        </section>
    );
};
