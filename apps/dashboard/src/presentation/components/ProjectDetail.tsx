"use client";
import React from 'react';
import { Project } from '../../core/domain/entities/project.entity';
import { useProject } from '../context/ProjectContext';

interface ProjectDetailProps {
    project?: Project;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project }) => {
    const { updateProject } = useProject();
    const [isEditing, setIsEditing] = React.useState(false);
    const [title, setTitle] = React.useState('');

    React.useEffect(() => {
        if (project) setTitle(project.title);
    }, [project]);

    if (!project) {
        return (
            <section className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900/20 p-8 flex items-center justify-center">
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-3xl opacity-20">analytics</span>
                    <p className="text-sm font-medium">Select a project from the left to view detailed logs and job history.</p>
                </div>
            </section>
        );
    }

    const handleSave = async () => {
        if (title.trim() && title !== project.title) {
            try {
                await updateProject(project.id, { title });
            } catch (error) {
                setTitle(project.title);
            }
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setTitle(project.title);
            setIsEditing(false);
        }
    };

    return (
        <section className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900/20 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white dark:bg-background-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold mb-1">Project Details</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">{project.id}</span>
                                <span className="text-slate-300 dark:text-slate-700 text-sm">•</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Video Workflow</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                                <span className="material-symbols-outlined">share</span>
                            </button>
                            <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                                <span className="material-symbols-outlined">more_vert</span>
                            </button>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="grid grid-cols-2 gap-x-12 gap-y-8 mb-10">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Project Title</label>
                                {isEditing ? (
                                    <input
                                        autoFocus
                                        className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-snug bg-slate-100 dark:bg-slate-800 border-none rounded px-2 w-full focus:ring-2 focus:ring-primary/50 outline-none"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        onBlur={handleSave}
                                        onKeyDown={handleKeyDown}
                                    />
                                ) : (
                                    <p
                                        onClick={() => setIsEditing(true)}
                                        className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-snug hover:text-primary cursor-pointer transition-colors"
                                    >
                                        {project.title}
                                    </p>
                                )}
                                <p className="text-xs text-slate-500 italic">Source: {project.source}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                                <div className="pt-1">
                                    <span className={`inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-tighter border ${getStatusClasses(project.status)}`}>
                                        {project.status}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Stage</label>
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                                    <span className="text-sm font-medium">{project.currentStage || 'Unknown'}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Audio Duration</label>
                                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{project.duration || '00:00'}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Updated At</label>
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                                    <span className="text-sm font-medium">{project.updatedAt}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Project ID</label>
                                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{project.id}</p>
                            </div>
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-8">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-4">Actions</label>
                            <div className="grid grid-cols-5 gap-3">
                                <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-primary/5 hover:border-primary/50 transition-all group cursor-pointer">
                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-primary">play_arrow</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-primary">Run Stage</span>
                                </button>
                                <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-primary/5 hover:border-primary/50 transition-all group cursor-pointer">
                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-primary">refresh</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-primary">Retry</span>
                                </button>
                                <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-500/5 hover:border-rose-500/50 transition-all group cursor-pointer">
                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-rose-500">mop</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-rose-500">Cleanup</span>
                                </button>
                                <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-primary/5 hover:border-primary/50 transition-all group cursor-pointer">
                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-primary">folder_open</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-primary">Files</span>
                                </button>
                                <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-primary/5 hover:border-primary/50 transition-all group cursor-pointer">
                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-primary">description</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-primary">View Log</span>
                                </button>
                            </div>
                        </div>
                    </div>
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
            return 'bg-primary/10 text-primary border-primary/20';
        case 'Error':
            return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
        case 'Idle':
        default:
            return 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
}
