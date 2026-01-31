"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Sidebar: React.FC = () => {
    const pathname = usePathname();

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'space_dashboard', href: '/dashboard' },
        { id: 'assets', label: 'Assets', icon: 'folder', href: '/assets' },
    ];

    return (
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between bg-white dark:bg-background-dark p-4 shrink-0">
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3 px-2">
                    <img
                        src="/FF-logo.png"
                        alt="FrameForge"
                        className="size-12 object-contain shrink-0"
                    />
                    <div className="flex flex-col justify-center">
                        <h1 className="text-base font-black leading-tight tracking-tight">
                            <span>Frame</span>
                            <span className="text-primary">Forge</span>
                        </h1>
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
            <div className="h-4"></div>
        </aside>
    );
};
