"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '../../core/domain/entities/project.entity';
import { useProject } from '../context/ProjectContext';
import { FileBrowserModal } from './FileBrowserModal';
import { ContentViewModal } from './ContentViewModal';
import { DeleteProjectModal } from './DeleteProjectModal';

interface ProjectDetailProps {
    project?: Project;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project }) => {
    const router = useRouter();
    const { updateProject, runNextStage, retryStage, runAutomatically, cleanupProject, deleteProject } = useProject();
    const [isEditing, setIsEditing] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const [isFileBrowserOpen, setIsFileBrowserOpen] = React.useState(false);
    const [isContentViewOpen, setIsContentViewOpen] = React.useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [isRunning, setIsRunning] = React.useState(false);
    const [projectContent, setProjectContent] = React.useState('');

    React.useEffect(() => {
        if (project) {
            setTitle(project.title);
            setIsFileBrowserOpen(false);
            setIsContentViewOpen(false);
            setIsDeleteModalOpen(false);
            // Fetch project content if available
            if (project.content) {
                setProjectContent(project.content);
            }
        }
    }, [project]);

    const nextStage = React.useMemo(() => {
        if (!project) return undefined;
        return getNextStage(project.currentStage);
    }, [project]);

    React.useEffect(() => {
        if (!project) return;
        const readyForMaster = project.status === 'Success' && nextStage === 'Visual Production';
        if (readyForMaster || project.currentStage === 'Visual Production') {
            router.push(`/results/${project.id}`);
        }
    }, [nextStage, project, router]);

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

    const handleRunStage = async () => {
        if (nextStage === 'Visual Production') {
            router.push(`/results/${project.id}`);
            return;
        }
        try {
            setIsRunning(true);
            await runNextStage(project.id);
        } catch (error) {
            alert('Error running next stage');
        } finally {
            setIsRunning(false);
        }
    };

    const handleRetry = async () => {
        try {
            setIsRunning(true);
            await retryStage(project.id);
        } catch (error) {
            alert('Error retrying stage');
        } finally {
            setIsRunning(false);
        }
    };

    const handleCleanup = async () => {
        const confirmed = confirm(
            'This will delete all generated files (audio, video) but keep text files. Continue?'
        );
        if (!confirmed) return;

        try {
            setIsRunning(true);
            await cleanupProject(project.id);
            alert('Cleanup completed successfully');
        } catch (error) {
            alert('Error during cleanup');
        } finally {
            setIsRunning(false);
        }
    };

    const handleRunAutomatically = async () => {
        try {
            setIsRunning(true);
            await runAutomatically(project.id);
        } catch (error) {
            alert('Error running automatically');
        } finally {
            setIsRunning(false);
        }
    };

    const handleViewContent = () => {
        setIsContentViewOpen(true);
    };

    const handleDeleteProject = async (complete: boolean) => {
        setIsDeleteModalOpen(false);
        try {
            setIsRunning(true);
            await deleteProject(project.id, complete);
        } catch (error) {
            alert('Error during project removal');
        } finally {
            setIsRunning(false);
        }
    };

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
                            <h3 className="text-xl font-bold mb-1">Project Details {project.status === 'Processing' && <span className="inline-block animate-pulse text-primary ml-2">●</span>}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">{project.id}</span>
                                <span className="text-slate-300 dark:text-slate-700 text-sm">•</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pipeline Node</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                disabled={isRunning}
                                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove Project"
                            >
                                <span className="material-symbols-outlined">delete</span>
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
                                <p className="text-xs text-slate-500 italic">Source: {project.source} {project.category && `(r/${project.category})`}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                                <div className="pt-1">
                                    <span className={`inline-flex items-center px-3 py-1 rounded text-xs font-bold uppercase tracking-tighter border ${getStatusClasses(project.status)}`}>
                                        {project.status === 'Processing' ? 'Running...' : project.status}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pipeline Stage</label>
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <span className={`material-symbols-outlined text-primary text-[20px] ${project.status === 'Processing' ? 'animate-spin' : ''}`}>
                                        {project.status === 'Processing' ? 'autorenew' : 'check_circle'}
                                    </span>
                                    <span className="text-sm font-medium">{project.currentStage}</span>
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

                        {project.status !== 'Cancelled' && project.currentStage !== 'Cancelled' && (
                            <div className="border-t border-slate-100 dark:border-slate-800 mt-10 pt-8">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-4">Pipeline Actions</label>
                                <div className="grid grid-cols-5 gap-3">
                                    {project.status === 'Error' ? (
                                        <button
                                            onClick={handleRunAutomatically}
                                            disabled={isRunning}
                                            className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50/30 dark:bg-rose-500/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-400 transition-all group cursor-pointer disabled:opacity-50"
                                        >
                                            <span className={`material-symbols-outlined text-rose-500 ${isRunning ? 'animate-spin' : ''}`}>
                                                {isRunning ? 'autorenew' : 'refresh'}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Retry Stage</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleRunStage}
                                            disabled={project.status === 'Processing' || isRunning}
                                            className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-primary/5 hover:border-primary/50 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className={`material-symbols-outlined text-slate-500 group-hover:text-primary ${isRunning ? 'animate-spin' : ''}`}>
                                                {isRunning ? 'autorenew' : 'play_arrow'}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-primary">
                                                {nextStage === 'Visual Production' ? 'Configure Video' : 'Run Next Stage'}
                                            </span>
                                        </button>
                                    )}

                                    {project.status === 'Error' ? (
                                        <button
                                            onClick={handleRetry}
                                            disabled={isRunning}
                                            className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50/30 dark:bg-rose-500/5 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-400 transition-all group cursor-pointer disabled:opacity-50"
                                        >
                                            <span className={`material-symbols-outlined text-rose-500 ${isRunning ? 'animate-spin' : ''}`}>
                                                {isRunning ? 'autorenew' : 'refresh'}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Retry Automatically</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleRunAutomatically}
                                            disabled={project.status === 'Processing' || isRunning}
                                            className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-500/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-400 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className={`material-symbols-outlined text-emerald-600 dark:text-emerald-400 ${isRunning ? 'animate-spin' : ''}`}>
                                                {isRunning ? 'autorenew' : 'skip_next'}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Run Automatically</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={handleCleanup}
                                        disabled={isRunning}
                                        className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-500/5 hover:border-rose-500/50 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="material-symbols-outlined text-slate-500 group-hover:text-rose-500">delete_sweep</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-rose-500">Cleanup</span>
                                    </button>
                                    <button
                                        onClick={() => setIsFileBrowserOpen(true)}
                                        className={`w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all group cursor-pointer ${isFileBrowserOpen ? 'bg-primary border-primary shadow-lg shadow-primary/20' : 'border-slate-200 dark:border-slate-800 hover:bg-primary/5 hover:border-primary/50'}`}
                                    >
                                        <span className={`material-symbols-outlined ${isFileBrowserOpen ? 'text-white' : 'text-slate-500 group-hover:text-primary'}`}>folder_open</span>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isFileBrowserOpen ? 'text-white' : 'text-slate-500 group-hover:text-primary'}`}>Files</span>
                                    </button>
                                    <button
                                        onClick={handleViewContent}
                                        className="w-full flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-primary/5 hover:border-primary/50 transition-all group cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-slate-500 group-hover:text-primary">article</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-primary">View Content</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <FileBrowserModal
                projectId={project.id}
                isOpen={isFileBrowserOpen}
                onClose={() => setIsFileBrowserOpen(false)}
            />

            <ContentViewModal
                project={project}
                isOpen={isContentViewOpen}
                onClose={() => setIsContentViewOpen(false)}
            />

            <DeleteProjectModal
                projectId={project.id}
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onDelete={handleDeleteProject}
                isRunning={isRunning}
            />
        </section>
    );
};

const STAGE_SEQUENCE = [
    'Source Discovery',
    'Content Translation',
    'Gender Analysis',
    'Vocal Synthesis',
    'Caption Engine',
    'Thumbnail Forge',
    'Visual Production'
] as const;

function getNextStage(stage: string) {
    const idx = STAGE_SEQUENCE.indexOf(stage as typeof STAGE_SEQUENCE[number]);
    if (idx === -1) return undefined;
    return STAGE_SEQUENCE[idx + 1];
}

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
