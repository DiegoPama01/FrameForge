"use client";
import React, { useState } from 'react';

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

    // Dropdown states
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);


    return (
        <section className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
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

            <div className="w-4"></div>
        </section>
    );
};
