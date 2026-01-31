"use client";
import React from 'react';
import Link from 'next/link';
import { ApiClient } from '../../infrastructure/api/api.client';
import { useProject } from '../../presentation/context/ProjectContext';
import { DeleteProjectModal } from '../../presentation/components/DeleteProjectModal';

const STAGE_SEQUENCE = [
    'Source Discovery',
    'Content Translation',
    'Gender Analysis',
    'Vocal Synthesis',
    'Caption Engine',
    'Thumbnail Forge',
    'Visual Production'
] as const;

const CARD_GRADIENTS = [
    'from-slate-900 via-slate-800 to-slate-700',
    'from-indigo-950 via-slate-900 to-slate-800',
    'from-emerald-950 via-slate-900 to-slate-800',
    'from-rose-950 via-slate-900 to-slate-800'
];

function getNextStage(stage: string) {
    const idx = STAGE_SEQUENCE.indexOf(stage as typeof STAGE_SEQUENCE[number]);
    if (idx === -1) return undefined;
    return STAGE_SEQUENCE[idx + 1];
}

function timeAgo(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Ready recently';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ready just now';
    if (mins < 60) return `Ready ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Ready ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Ready ${days}d ago`;
}

export default function ResultsPage() {
    const { projects, loading, globalSearch, refresh, deleteProject } = useProject();
    const [activeCategory, setActiveCategory] = React.useState<string>('All');
    const [sortMode, setSortMode] = React.useState<'ready' | 'title' | 'status'>('ready');
    const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
    const [isCategoryOpen, setIsCategoryOpen] = React.useState(false);
    const [isSortOpen, setIsSortOpen] = React.useState(false);
    const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);
    const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDeleteProject = async (complete: boolean) => {
        if (!deleteTargetId) return;
        setIsDeleteModalOpen(false);
        try {
            setIsDeleting(true);
            await deleteProject(deleteTargetId, complete);
        } catch (error) {
            alert('Error during project removal');
        } finally {
            setIsDeleting(false);
            setDeleteTargetId(null);
        }
    };

    const items = React.useMemo(() => {
        return projects.filter((project) => {
            const nextStage = getNextStage(project.currentStage);
            const ready = project.currentStage === 'Visual Production' || (project.status === 'Success' && nextStage === 'Visual Production');
            if (!ready) return false;
            if (activeCategory !== 'All' && project.category !== activeCategory) return false;
            const search = globalSearch.trim().toLowerCase();
            if (!search) return true;
            return project.title.toLowerCase().includes(search) || project.id.toLowerCase().includes(search);
        });
    }, [projects, activeCategory, globalSearch]);

    const categories = React.useMemo(() => {
        const set = new Set<string>();
        projects.forEach((project) => {
            const nextStage = getNextStage(project.currentStage);
            const ready = project.currentStage === 'Visual Production' || (project.status === 'Success' && nextStage === 'Visual Production');
            if (ready && project.category) set.add(project.category);
        });
        return ['All', ...Array.from(set).sort()];
    }, [projects]);

    const sortedItems = React.useMemo(() => {
        const sorted = [...items];
        if (sortMode === 'title') {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortMode === 'status') {
            sorted.sort((a, b) => a.status.localeCompare(b.status));
        } else {
            sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
        if (sortDir === 'asc') {
            sorted.reverse();
        }
        return sorted;
    }, [items, sortMode, sortDir]);

    return (
        <section className="flex-1 overflow-auto bg-slate-50 dark:bg-background-dark p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Ready for Assembly</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            {loading ? 'Loading projects...' : `${sortedItems.length} project${sortedItems.length === 1 ? '' : 's'} have cleared the pipeline and are ready for final stitching.`}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <button
                            onClick={() => setIsCategoryOpen((prev) => !prev)}
                            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg text-slate-500">filter_list</span>
                            <span>{activeCategory === 'All' ? 'All Subreddits' : `r/${activeCategory}`}</span>
                            <span className="material-symbols-outlined text-lg text-slate-500">expand_more</span>
                        </button>
                        {isCategoryOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsCategoryOpen(false)}></div>
                                <div className="absolute z-20 mt-2 min-w-[220px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                setActiveCategory(cat);
                                                setIsCategoryOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors hover:cursor-pointer ${activeCategory === cat
                                                ? 'text-primary font-bold bg-primary/10'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            {cat === 'All' ? 'All Subreddits' : `r/${cat}`}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <div className="relative">
                        <button
                            onClick={() => setIsSortOpen((prev) => !prev)}
                            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg text-slate-500">sort</span>
                            <span>
                                Sort: {sortMode === 'ready' ? 'Date Ready' : sortMode === 'title' ? 'Title' : 'Status'}
                            </span>
                            <span className="material-symbols-outlined text-lg text-slate-500">expand_more</span>
                        </button>
                        {isSortOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)}></div>
                                <div className="absolute z-20 mt-2 min-w-[180px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                                    {[
                                        { label: 'Date Ready', value: 'ready' },
                                        { label: 'Title', value: 'title' },
                                        { label: 'Status', value: 'status' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => {
                                                setSortMode(opt.value as 'ready' | 'title' | 'status');
                                                setIsSortOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors hover:cursor-pointer ${sortMode === opt.value
                                                ? 'text-primary font-bold bg-primary/10'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:cursor-pointer"
                        title={`Sort ${sortDir === 'asc' ? 'descending' : 'ascending'}`}
                    >
                        <span className="material-symbols-outlined text-lg">{sortDir === 'asc' ? 'arrow_downward' : 'arrow_upward'}</span>
                        <span>{sortDir === 'asc' ? 'Asc' : 'Desc'}</span>
                    </button>
                    <button
                        onClick={() => refresh(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg ml-auto hover:cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                    </button>
                </div>

                {menuOpenId && (
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)}></div>
                )}

                {sortedItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-3xl opacity-20">movie</span>
                        <p className="text-sm font-medium">No projects are ready for video generation yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {sortedItems.map((project, index) => {
                            const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
                            const baseUrl = ApiClient.getBaseUrl();
                            const token = ApiClient.getToken();
                            const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
                            const thumbnailUrl = project.thumbnail
                                ? `${baseUrl}/projects/${project.id}/files/content?path=${encodeURIComponent(project.thumbnail)}${tokenParam}`
                                : null;
                            return (
                                <div
                                    key={project.id}
                                    className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300"
                                >
                                    <div
                                        className={`relative aspect-video ${thumbnailUrl ? '' : `bg-gradient-to-br ${gradient}`}`}
                                        style={thumbnailUrl ? { backgroundImage: `url('${thumbnailUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                                    >
                                        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="material-symbols-outlined text-5xl text-white">play_circle</span>
                                        </div>
                                        {project.duration && (
                                            <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                                                {project.duration}
                                            </div>
                                        )}
                                        <div className="absolute bottom-2 left-2 flex gap-1">
                                            <span className="bg-green-500 w-2 h-2 rounded-full border border-white dark:border-slate-900"></span>
                                            <span className="bg-green-500 w-2 h-2 rounded-full border border-white dark:border-slate-900"></span>
                                            <span className="bg-green-500 w-2 h-2 rounded-full border border-white dark:border-slate-900"></span>
                                        </div>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-sm line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                                {project.title}
                                            </h3>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setMenuOpenId((prev) => (prev === project.id ? null : project.id))}
                                                    className="text-slate-400 hover:text-white"
                                                >
                                                    <span className="material-symbols-outlined text-lg">more_vert</span>
                                                </button>
                                                {menuOpenId === project.id && (
                                                    <div className="absolute right-0 top-6 z-30 w-44 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                                                        <button
                                                            onClick={() => {
                                                                setMenuOpenId(null);
                                                                setDeleteTargetId(project.id);
                                                                setIsDeleteModalOpen(true);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px] align-[-4px] mr-2">delete</span>
                                                            Remove project
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                {project.id}
                                            </span>
                                            {project.category && (
                                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                    r/{project.category}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-auto flex flex-col gap-3">
                                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                                                <span>{timeAgo(project.updatedAt)}</span>
                                                <span className="text-green-500 font-medium">Assets Verified</span>
                                            </div>
                                            <Link
                                                href={`/results/${project.id}`}
                                                className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-lg">movie_edit</span>
                                                <span>Start Assembly</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {deleteTargetId && (
                <DeleteProjectModal
                    projectId={deleteTargetId}
                    isOpen={isDeleteModalOpen}
                    onClose={() => {
                        setIsDeleteModalOpen(false);
                        setDeleteTargetId(null);
                    }}
                    onDelete={handleDeleteProject}
                    isRunning={isDeleting}
                />
            )}
        </section>
    );
}
