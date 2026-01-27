"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Sidebar: React.FC = () => {
    const pathname = usePathname();

    const menuItems = [
        { id: 'projects', label: 'Projects', icon: 'grid_view', href: '/projects' },
        { id: 'jobs', label: 'Jobs', icon: 'work', href: '/jobs' },
        { id: 'workflows', label: 'Workflows', icon: 'hub', href: '/workflows' },
        { id: 'assets', label: 'Assets', icon: 'folder', href: '/assets' },
        { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
    ];

    return (
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between bg-white dark:bg-background-dark p-4 shrink-0">
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="bg-primary rounded-lg p-2 text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined">movie_edit</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-base font-black leading-tight tracking-tight">FrameForge</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Studio Console</p>
                    </div>
                </div>
                <nav className="flex flex-col gap-1">
                    {menuItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-primary/10 text-primary shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                                    }`}
                            >
                                <span className={`material-symbols-outlined transition-transform duration-200 group-hover:scale-110 ${isActive ? 'fill-icon' : ''}`}>
                                    {item.icon}
                                </span>
                                <span className={`text-sm tracking-tight ${isActive ? 'font-black' : 'font-bold'}`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="ml-auto size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]"></div>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="flex flex-col gap-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div className="flex items-center gap-3 px-3">
                    <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        <img alt="User profile avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDXRHyU-UeC8u3UnrLtJC1R2_EYua_ZEfQaxIlR6Kbqb1MN3o43YXipoKPrI5ruRWY4-wMSEOiPSl9RsQPDZxs4L0Ssc5kvKAtRm8bIsxft3AM0LdsFy1JYzxpfaPJaZ1eYjnzyHgETkphSrbbBZx5rmQF3w1PYvVUKg0tCigqTerGuY6QkZ6nAO7Eq_ZhjUZ6pX9OlCYdAqrI49AF-Lh94gVK619K6ibWqYru5qhtbkeUSqcQkb9WGmVT1-0ZZp-2WlwCJh_fmNc" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <p className="text-xs font-black truncate text-slate-900 dark:text-slate-100">Admin Console</p>
                        <p className="text-[10px] text-slate-500 truncate font-bold uppercase tracking-tighter">admin@videoapi.io</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};
