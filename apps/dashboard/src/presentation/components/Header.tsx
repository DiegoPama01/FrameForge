"use client";
import React, { useState } from 'react';
import { ApiClient } from '../../infrastructure/api/api.client';

export const Header: React.FC = () => {
    const [triggering, setTriggering] = useState(false);

    const [harvesting, setHarvesting] = useState(false);

    const handleTrigger = async () => {
        setTriggering(true);
        try {
            await ApiClient.triggerN8n();
            alert('Pipeline triggered successfully! Check n8n for progress.');
        } catch (error) {
            console.error('Failed to trigger n8n', error);
            alert('Failed to trigger pipeline. Is the webhook URL configured in Settings?');
        } finally {
            setTriggering(false);
        }
    };

    const handleHarvest = async () => {
        setHarvesting(true);
        try {
            const res = await ApiClient.harvestProjects();
            alert(`Harvesting complete! Found ${res.harvested_count} new stories.`);
        } catch (error) {
            console.error('Failed to harvest', error);
            alert('Failed to harvest stories. Check Worker logs.');
        } finally {
            setHarvesting(false);
        }
    };

    return (
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-background-dark/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-4 flex-1">
                <h2 className="text-lg font-bold tracking-tight">Projects Pipeline</h2>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
                <div className="relative max-w-sm w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 transition-all" placeholder="Search projects..." type="text" />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button className="px-3 py-1 text-xs font-medium rounded-md bg-white dark:bg-slate-700 shadow-sm cursor-pointer">Dashboard</button>
                    <button className="px-3 py-1 text-xs font-medium rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">Analytics</button>
                    <button className="px-3 py-1 text-xs font-medium rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">Logs</button>
                </div>
                <button className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">notifications</span>
                </button>
                <button
                    onClick={handleHarvest}
                    disabled={harvesting}
                    className="flex items-center gap-2 border border-primary/20 hover:bg-primary/5 text-primary px-4 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[18px]">rss_feed</span>
                    <span>{harvesting ? 'Scraping...' : 'Scrape Stories'}</span>
                </button>
                <button
                    onClick={handleTrigger}
                    disabled={triggering}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[18px]">sync</span>
                    <span>{triggering ? 'Triggering...' : 'Refresh All'}</span>
                </button>
            </div>
        </header>
    );
};
