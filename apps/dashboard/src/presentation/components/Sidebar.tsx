import React from 'react';

interface SidebarProps {
    currentNav: 'projects' | 'jobs' | 'assets' | 'settings';
    onNavChange: (nav: 'projects' | 'jobs' | 'assets' | 'settings') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentNav, onNavChange }) => {
    return (
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between bg-white dark:bg-background-dark p-4 shrink-0">
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="bg-primary rounded-lg p-2 text-white">
                        <span className="material-symbols-outlined">movie_edit</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-base font-bold leading-tight">VideoAPI</h1>
                        <p className="text-slate-500 text-xs font-medium">Pipeline Dashboard</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-1">
                    <button
                        onClick={() => onNavChange('projects')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-left w-full ${currentNav === 'projects' ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        <span className={`material-symbols-outlined ${currentNav === 'projects' ? 'fill-icon' : ''}`}>grid_view</span>
                        <span className={`text-sm ${currentNav === 'projects' ? 'font-semibold' : 'font-medium'}`}>Projects</span>
                    </button>
                    <button
                        onClick={() => onNavChange('jobs')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-left w-full ${currentNav === 'jobs' ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        <span className={`material-symbols-outlined ${currentNav === 'jobs' ? 'fill-icon' : ''}`}>work</span>
                        <span className={`text-sm ${currentNav === 'jobs' ? 'font-semibold' : 'font-medium'}`}>Jobs</span>
                    </button>
                    <button
                        onClick={() => onNavChange('assets')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-left w-full ${currentNav === 'assets' ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        <span className={`material-symbols-outlined ${currentNav === 'assets' ? 'fill-icon' : ''}`}>folder</span>
                        <span className={`text-sm ${currentNav === 'assets' ? 'font-semibold' : 'font-medium'}`}>Assets</span>
                    </button>
                    <button
                        onClick={() => onNavChange('settings')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-left w-full ${currentNav === 'settings' ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        <span className={`material-symbols-outlined ${currentNav === 'settings' ? 'fill-icon' : ''}`}>settings</span>
                        <span className={`text-sm ${currentNav === 'settings' ? 'font-semibold' : 'font-medium'}`}>Settings</span>
                    </button>
                </nav>
            </div>
            <div className="flex flex-col gap-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center gap-3 px-3">
                    <div className="size-8 rounded-full bg-slate-300 dark:bg-slate-700 overflow-hidden">
                        <img alt="User profile avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDXRHyU-UeC8u3UnrLtJC1R2_EYua_ZEfQaxIlR6Kbqb1MN3o43YXipoKPrI5ruRWY4-wMSEOiPSl9RsQPDZxs4L0Ssc5kvKAtRm8bIsxft3AM0LdsFy1JYzxpfaPJaZ1eYjnzyHgETkphSrbbBZx5rmQF3w1PYvVUKg0tCigqTerGuY6QkZ6nAO7Eq_ZhjUZ6pX9OlCYdAqrI49AF-Lh94gVK619K6ibWqYru5qhtbkeUSqcQkb9WGmVT1-0ZZp-2WlwCJh_fmNc" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <p className="text-xs font-bold truncate">Admin Console</p>
                        <p className="text-[10px] text-slate-500 truncate">admin@videoapi.io</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};
