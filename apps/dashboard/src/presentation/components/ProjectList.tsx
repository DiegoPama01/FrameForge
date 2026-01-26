"use client";
import React from 'react';
import { Project } from '../../core/domain/entities/project.entity';

interface ProjectListProps {
    projects: Project[];
    selectedId?: string;
    onSelect: (id: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, selectedId, onSelect }) => {
    return (
        <section className="w-1/3 min-w-[320px] max-w-md border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-background-dark/20 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">All Projects ({projects.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => onSelect(project.id)}
                            className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-l-4 ${selectedId === project.id ? 'bg-primary/5 dark:bg-primary/10 border-primary' : 'border-transparent'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-1.5">
                                <span className={`text-[10px] font-mono font-bold tracking-tight ${selectedId === project.id ? 'text-primary' : 'text-slate-400'}`}>
                                    #{project.id.split('_').pop()?.substring(0, 8)}
                                </span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${getStatusClasses(project.status)}`}>
                                    {project.status === 'Processing' && <span className="size-1 bg-current rounded-full animate-ping mr-1"></span>}
                                    {project.status}
                                </span>
                            </div>
                            <h3 className="text-sm font-bold truncate mb-2 text-slate-800 dark:text-slate-200">{project.title}</h3>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                                        r/{project.category}
                                    </span>
                                </div>
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-tight ${project.status === 'Cancelled' ? 'text-slate-400' : 'text-primary/70 bg-primary/5'}`}>
                                    <span className="material-symbols-outlined text-[13px]">
                                        {project.status === 'Cancelled' ? 'cancel' : 'rebase_edit'}
                                    </span>
                                    <span>{project.currentStage}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-background-dark/50">
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Page 1 of 1</span>
                <div className="flex gap-1">
                    <button className="p-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer" disabled>
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    <button className="p-1 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer" disabled>
                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                </div>
            </div>
        </section>
    );
};

function getStatusClasses(status: string) {
    switch (status) {
        case 'Success':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
        case 'Processing':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
        case 'Error':
            return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
        case 'Cancelled':
            return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500 border-slate-200 dark:border-slate-700';
        case 'Idle':
        default:
            return 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
}
