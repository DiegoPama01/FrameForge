"use client";
import React, { useState } from 'react';
import { ApiClient } from '../../infrastructure/api/api.client';
import { ProjectProvider, useProject } from '../context/ProjectContext';

export const Header: React.FC = () => {
    const { globalSearch, setGlobalSearch } = useProject();

    return (
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-background-dark/50 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-4 flex-1">
                <h2 className="text-lg font-bold tracking-tight">
                    <span>Frame</span>
                    <span className="text-primary">Forge</span>
                </h2>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
                <div className="relative max-w-sm w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 transition-all"
                        placeholder="Search everywhere..."
                        type="text"
                    />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button className="size-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">notifications</span>
                </button>
                <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <span className="text-[10px] font-bold text-primary">ADMIN</span>
                </div>
            </div>
        </header>
    );
};
