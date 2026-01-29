"use client";
import React, { useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Job, Workflow } from '../../core/domain/entities/project.entity';
import { EditJobModal } from './EditJobModal';

type WorkflowTemplate = {
    id: string;
    name: string;
    description: string;
    stages: string[];
    status: 'locked' | 'active' | 'draft';
    usageCount: number;
    tags: string[];
};

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
    {
        id: 'wf-reddit-default',
        name: 'Reddit Shorts',
        description: 'Default pipeline for Reddit stories with subtitles and thumbnail.',
        stages: ['Text Scrapped', 'Text Translated', 'Speech Generated', 'Subtitles Created', 'Thumbnail Created'],
        status: 'locked',
        usageCount: 24,
        tags: ['default', 'auto']
    },
    {
        id: 'wf-narration-lite',
        name: 'Narration Only',
        description: 'Script to voice, optimized for fast audio-only output.',
        stages: ['Text Scrapped', 'Text Translated', 'Speech Generated'],
        status: 'draft',
        usageCount: 8,
        tags: ['draft']
    },
    {
        id: 'wf-story-clip',
        name: 'Story Clips',
        description: 'Short-form workflow with captions and minimal assets.',
        stages: ['Text Scrapped', 'Speech Generated', 'Subtitles Created'],
        status: 'active',
        usageCount: 12,
        tags: ['shorts']
    },
    {
        id: 'wf-trending-video',
        name: 'Trending Video',
        description: 'Adds thumbnail prep and polishing for trend-based content.',
        stages: ['Text Scrapped', 'Text Translated', 'Speech Generated', 'Subtitles Created', 'Thumbnail Created'],
        status: 'active',
        usageCount: 5,
        tags: ['experimental']
    }
];

const DEFAULT_STAGES = WORKFLOW_TEMPLATES[0].stages;

export const JobsView: React.FC = () => {
    const { jobs, workflows, globalSearch, deleteJob, runJob } = useProject();
    const [statusFilter, setStatusFilter] = useState('All');
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const normalizedSearch = globalSearch.trim().toLowerCase();

    const statusOptions = useMemo(() => {
        const statuses = new Set(jobs.map((job) => job.status));
        return ['All', ...Array.from(statuses)];
    }, [jobs]);

    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            const matchesStatus = statusFilter === 'All' || job.status === statusFilter;
            if (!matchesStatus) return false;
            if (!normalizedSearch) return true;
            const workflow = workflows.find(w => w.id === job.workflowId);
            const haystack = [job.id, workflow?.name || '', job.status].join(' ').toLowerCase();
            return haystack.includes(normalizedSearch);
        });
    }, [jobs, statusFilter, normalizedSearch, workflows]);

    const handleDelete = async (jobId: string) => {
        if (!confirm('Delete this job?')) return;
        await deleteJob(jobId);
    };

    const handleRun = async (jobId: string) => {
        await runJob(jobId);
    };

    const openEdit = (job: Job) => {
        setEditingJob(job);
        setIsEditOpen(true);
    };

    const closeEdit = () => {
        setIsEditOpen(false);
        setEditingJob(null);
    };

    const editingWorkflow: Workflow | null = useMemo(() => {
        if (!editingJob) return null;
        return workflows.find(w => w.id === editingJob.workflowId) || null;
    }, [editingJob, workflows]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/20 p-6">
            <section className="mb-8 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Execution Queue</h2>
                        <p className="text-sm text-slate-500 font-medium">Monitor active and historical workflow jobs.</p>
                    </div>
                </div>
            </section>

            <section className="flex-1 overflow-y-auto custom-scrollbar space-y-8">
                {/* Jobs Queue */}
                <div className="bg-white dark:bg-background-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/30 dark:bg-transparent">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight">Active Jobs Queue</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Live monitoring</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter By Status</span>
                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                            >
                                {statusOptions.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                            <div className="h-8 w-px bg-slate-200 dark:border-slate-800"></div>
                            <span className="text-sm font-black text-primary">{filteredJobs.length} <span className="text-slate-400 font-medium">Jobs found</span></span>
                        </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredJobs.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">work</span>
                                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No active jobs matching filters</p>
                            </div>
                        )}

                        {filteredJobs.map((job) => {
                            const workflow = workflows.find(w => w.id === job.workflowId);
                            const progress = job.progress;
                            return (
                                <div key={job.id} className="group relative flex flex-col bg-slate-50/50 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 transition-all hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-1">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-mono font-black text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                                                    #{job.id.split('_').pop()?.substring(0, 8)}
                                                </span>
                                                {workflow?.tags[0] && (
                                                    <span className="text-[10px] px-2 py-1 rounded-lg bg-primary/10 text-primary font-black uppercase tracking-widest">
                                                        {workflow.tags[0]}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-1 tracking-tight">{workflow?.name || 'Unknown Workflow'}</h4>
                                        </div>
                                        <div className={`flex items-center px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm transition-all ${getStatusClasses(job.status)}`}>
                                            {job.status === 'Running' && <span className="size-1.5 bg-current rounded-full animate-ping mr-2"></span>}
                                            {job.status}
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-5">
                                        <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                            <div className="bg-primary/10 size-10 rounded-xl flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary">analytics</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Subreddit</span>
                                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                                                    {getSubredditLabel(job.parameters)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            <span className="material-symbols-outlined text-[14px]">event</span>
                                            <span>{getScheduleLabel(job)}</span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execution Progress</span>
                                                <span className="text-[11px] font-black text-primary">{progress}%</span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-inner">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-in-out shadow-[0_0_12px_rgba(var(--primary-rgb),0.4)]"
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <span className="material-symbols-outlined text-sm">schedule</span>
                                            <span className="text-[10px] font-bold uppercase tracking-tighter">{new Date(job.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    openEdit(job);
                                                }}
                                                className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                                                title="Edit job"
                                                aria-label="Edit job"
                                            >
                                                <span className="material-symbols-outlined text-lg">tune</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    void handleRun(job.id);
                                                }}
                                                className={`size-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                                    job.status === 'Running'
                                                        ? 'text-slate-300 cursor-not-allowed'
                                                        : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10'
                                                }`}
                                                title="Run job now"
                                                aria-label="Run job now"
                                                disabled={job.status === 'Running'}
                                            >
                                                <span className="material-symbols-outlined text-lg">play_arrow</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    void handleDelete(job.id);
                                                }}
                                                className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                                                title="Delete job"
                                                aria-label="Delete job"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
            <EditJobModal
                job={editingJob}
                workflow={editingWorkflow}
                isOpen={isEditOpen}
                onClose={closeEdit}
            />
        </div>
    );
};

function getStatusClasses(status: string) {
    switch (status) {
        case 'Completed':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
        case 'Running':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
        case 'Failed':
            return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
        case 'Pending':
        default:
            return 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
}

function getSubredditLabel(parameters: Record<string, any>) {
    const raw = Array.isArray(parameters?.subreddits)
        ? parameters.subreddits
        : parameters?.subreddit
            ? [parameters.subreddit]
            : [];

    const cleaned = raw
        .map((value: any) => String(value).replace(/^r\//i, '').trim())
        .filter(Boolean);

    if (cleaned.length === 0) return 'N/A';
    return `r/${cleaned.join(', r/')}`;
}

function getScheduleLabel(job: Job) {
    const interval = job.schedule_interval || 'once';
    const time = job.schedule_time ? `${job.schedule_time} UTC` : '';
    if (interval === 'daily') return `Daily ${time}`.trim();
    if (interval === 'weekly') return `Weekly ${time}`.trim();
    if (interval === 'once' && time) return `Once at ${time}`;
    return 'Manual';
}

function getWorkflowStatusClasses(status: WorkflowTemplate['status']) {
    switch (status) {
        case 'locked':
            return 'bg-slate-100 text-slate-500';
        case 'active':
            return 'bg-emerald-100 text-emerald-600';
        case 'draft':
        default:
            return 'bg-amber-100 text-amber-600';
    }
}
