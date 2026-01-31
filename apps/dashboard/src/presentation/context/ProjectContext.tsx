"use client";
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Project, Job, Workflow, WorkflowNode, ProjectStatus, ProjectStage } from '../../core/domain/entities/project.entity';
import { HttpProjectRepository } from '../../infrastructure/repositories/http_project.repository';
import { ApiClient } from '../../infrastructure/api/api.client';

const projectRepo = new HttpProjectRepository();

const STAGE_LABELS: Record<string, ProjectStage> = {
    'Text Scrapped': 'Source Discovery',
    'Text Translated': 'Content Translation',
    'Speech Generated': 'Vocal Synthesis',
    'Subtitles Created': 'Caption Engine',
    'Thumbnail Created': 'Thumbnail Forge',
    'Master Composition': 'Visual Production',
    'Source Discovery': 'Source Discovery',
    'Content Translation': 'Content Translation',
    'Gender Analysis': 'Gender Analysis',
    'Vocal Synthesis': 'Vocal Synthesis',
    'Caption Engine': 'Caption Engine',
    'Thumbnail Forge': 'Thumbnail Forge',
    'Visual Production': 'Visual Production',
    'Cancelled': 'Cancelled',
};

const normalizeStage = (stage?: string): ProjectStage => {
    if (!stage) return 'Source Discovery';
    return STAGE_LABELS[stage] || 'Source Discovery';
};

const NODE_TEMPLATES: WorkflowNode[] = [
    {
        id: 'tpl-source',
        label: 'Source Discovery',
        icon: 'rss_feed',
        description: 'Find and scrape stories from targeted subreddits.',
        parameters: [
            { id: 'subreddits', label: 'Target Subreddits', type: 'chips', placeholder: 'Type subreddit and press Enter...', defaultValue: ['AskReddit'] },
            { id: 'posts_per_subreddit', label: 'Posts per Subreddit', type: 'number', defaultValue: 5 },
            { id: 'minChars', label: 'Min Characters', type: 'number', defaultValue: 500 },
            { id: 'maxChars', label: 'Max Characters', type: 'number', defaultValue: 4000 },
            {
                id: 'timeframe', label: 'Timeframe', type: 'select', defaultValue: 'day', options: [
                    { label: 'Hour', value: 'hour' },
                    { label: 'Day', value: 'day' },
                    { label: 'Week', value: 'week' },
                    { label: 'Month', value: 'month' },
                    { label: 'Year', value: 'year' },
                    { label: 'All Time', value: 'all' }
                ]
            },
            {
                id: 'sort', label: 'Sort By', type: 'select', defaultValue: 'top', options: [
                    { label: 'Hot', value: 'hot' },
                    { label: 'New', value: 'new' },
                    { label: 'Top', value: 'top' },
                    { label: 'Rising', value: 'rising' }
                ]
            }
        ]
    },
    {
        id: 'tpl-translation',
        label: 'Content Translation',
        icon: 'translate',
        description: 'Translate the source text to a target language.',
        parameters: [
            {
                id: 'global_language', label: 'Workflow Language', type: 'select', defaultValue: 'es', options: [
                    { label: 'Spanish', value: 'es' },
                    { label: 'English', value: 'en' },
                    { label: 'French', value: 'fr' }
                ]
            }
        ]
    },
    {
        id: 'tpl-gender',
        label: 'Gender Analysis',
        icon: 'face_retouching_natural',
        description: 'Detect character/narrator gender for voice mapping.',
        parameters: [
            {
                id: 'global_gender', label: 'Narrator Gender', type: 'select', defaultValue: 'auto', options: [
                    { label: 'Auto Detect', value: 'auto' },
                    { label: 'Male', value: 'male' },
                    { label: 'Female', value: 'female' }
                ]
            }
        ]
    },
    {
        id: 'tpl-voice',
        label: 'Vocal Synthesis',
        icon: 'record_voice_over',
        description: 'Convert text to speech using Edge-TTS models.',
        parameters: [
            {
                id: 'global_voice_style', label: 'Voice Model', type: 'select', defaultValue: 'es-ES-AlvaroNeural', options: [
                    { label: 'ES - Alvaro (Male)', value: 'es-ES-AlvaroNeural' },
                    { label: 'ES - Elvira (Female)', value: 'es-ES-ElviraNeural' },
                    { label: 'MX - Jorge (Male)', value: 'es-MX-JorgeNeural' },
                    { label: 'MX - Dalia (Female)', value: 'es-MX-DaliaNeural' },
                    { label: 'AR - Tomas (Male)', value: 'es-AR-TomasNeural' },
                    { label: 'AR - Elena (Female)', value: 'es-AR-ElenaNeural' },
                    { label: 'EN - Guy (Male)', value: 'en-US-GuyNeural' },
                    { label: 'EN - Aria (Female)', value: 'en-US-AriaNeural' }
                ]
            },
            {
                id: 'global_language', label: 'Voice Language', type: 'select', defaultValue: 'es', options: [
                    { label: 'Spanish', value: 'es' },
                    { label: 'English', value: 'en' }
                ]
            },
            {
                id: 'global_gender', label: 'Preferred Gender', type: 'select', defaultValue: 'auto', options: [
                    { label: 'Auto', value: 'auto' },
                    { label: 'Male', value: 'male' },
                    { label: 'Female', value: 'female' }
                ]
            }
        ]
    },
    {
        id: 'tpl-subtitles',
        label: 'Caption Engine',
        icon: 'subtitles',
        description: 'Generate and format on-screen subtitles.',
        parameters: [
            {
                id: 'style', label: 'Display Style', type: 'select', defaultValue: 'modern', options: [
                    { label: 'Modern (Clean)', value: 'modern' },
                    { label: 'Dynamic (Pop)', value: 'dynamic' }
                ]
            },
            {
                id: 'global_language', label: 'Subtitle Language', type: 'select', defaultValue: 'es', options: [
                    { label: 'Spanish', value: 'es' },
                    { label: 'English', value: 'en' }
                ]
            }
        ]
    },
    {
        id: 'tpl-thumbnail',
        label: 'Thumbnail Forge',
        icon: 'image',
        description: 'Generate a high-impact thumbnail for the video.',
        parameters: [
            { id: 'template', label: 'Layout Template', type: 'string', defaultValue: 'standard-v1' },
            { id: 'prompt_template', label: 'Image Prompt (OpenAI)', type: 'string', defaultValue: 'A dramatic scene showing...' },
            {
                id: 'style', label: 'Visual Style', type: 'select', defaultValue: 'hyper-realistic', options: [
                    { label: 'Hyper-Realistic', value: 'hyper-realistic' },
                    { label: 'Digital Art', value: 'digital-art' },
                    { label: 'Comic Book', value: 'comic-book' },
                    { label: 'Minimalist', value: 'minimalist' }
                ]
            },
            { id: 'overlay_text', label: 'Enable Overlay Text', type: 'boolean', defaultValue: true }
        ]
    },
    {
        id: 'tpl-intro',
        label: 'Intro Sequencer',
        icon: 'first_page',
        description: 'Create a compelling introduction hook.',
        parameters: [
            {
                id: 'intro_theme', label: 'Intro Theme', type: 'select', defaultValue: 'dynamic', options: [
                    { label: 'Dynamic', value: 'dynamic' },
                    { label: 'Cinematic', value: 'cinematic' }
                ]
            }
        ]
    },
    {
        id: 'tpl-ending',
        label: 'Ending Sequencer',
        icon: 'last_page',
        description: 'Add call-to-action and outro screens.',
        parameters: [
            {
                id: 'cta_type', label: 'CTA Type', type: 'select', defaultValue: 'subscribe', options: [
                    { label: 'Subscribe', value: 'subscribe' },
                    { label: 'Watch More', value: 'watch_more' }
                ]
            }
        ]
    },
    {
        id: 'tpl-video-gen',
        label: 'Video Constructor',
        icon: 'video_settings',
        description: 'Generate the primary video content from assets.',
        parameters: [
            {
                id: 'asset_folder', label: 'Background Asset Folder', type: 'select', defaultValue: 'backgrounds', options: [
                    { label: 'Backgrounds', value: 'backgrounds' },
                    { label: 'Gameplay', value: 'gameplay' },
                    { label: 'Minecraft', value: 'minecraft' },
                    { label: 'GTA 5', value: 'gta5' }
                ]
            },
            {
                id: 'selection_strategy', label: 'Selection Strategy', type: 'select', defaultValue: 'random_loop', options: [
                    { label: 'Random Loop', value: 'random_loop' },
                    { label: 'Sequential', value: 'sequential' },
                    { label: 'Specific Video', value: 'specific' }
                ]
            },
            { id: 'specific_video_id', label: 'Specific Video ID (Optional)', type: 'string' },
            {
                id: 'transition_type', label: 'Transition Logic', type: 'select', defaultValue: 'dissolve', options: [
                    { label: 'None (Cut)', value: 'cut' },
                    { label: 'Dissolve', value: 'dissolve' },
                    { label: 'Blur Fade', value: 'blur_fade' }
                ]
            }
        ]
    },
    {
        id: 'tpl-mastering',
        label: 'Master Composition',
        icon: 'layers',
        description: 'Merge all sequences into the final master file.',
        parameters: [
            { id: 'include_intro', label: 'Include Intro Hook', type: 'boolean', defaultValue: true },
            { id: 'include_ending', label: 'Include Outro CTA', type: 'boolean', defaultValue: true },
            { id: 'include_audio', label: 'Include Voiceover', type: 'boolean', defaultValue: true },
            { id: 'include_video', label: 'Include Background Video', type: 'boolean', defaultValue: true },
            { id: 'include_music', label: 'Include Background Music', type: 'boolean', defaultValue: true },
            {
                id: 'output_format', label: 'Output Format', type: 'select', defaultValue: 'mp4', options: [
                    { label: 'MP4 1080p (Shorts)', value: 'mp4' },
                    { label: 'MP4 4K (Vertical)', value: '4k_vertical' }
                ]
            }
        ]
    },
    {
        id: 'tpl-publishing',
        label: 'Publishing Hub',
        icon: 'upload',
        description: 'Upload and distribute to social media platforms.',
        parameters: [
            {
                id: 'platforms', label: 'Target Platforms', type: 'multiselect', defaultValue: ['TikTok'], options: [
                    { label: 'TikTok', value: 'TikTok' },
                    { label: 'Instagram Reels', value: 'Reels' },
                    { label: 'YouTube Shorts', value: 'Shorts' }
                ]
            }
        ]
    },
];

export interface Asset {
    name: string;
    path: string;
    categories: string[];
    size: number;
    created_at: string;
    type: string;
    url: string;
}

interface ProjectContextType {
    projects: Project[];
    jobs: Job[];
    workflows: Workflow[];
    selectedProject: Project | undefined;
    setSelectedProject: (project: Project | undefined) => void;
    loading: boolean;
    refresh: (silent?: boolean) => Promise<void>;
    updateProject: (id: string, data: Partial<Project>) => Promise<void>;
    runNextStage: (id: string) => Promise<void>;
    retryStage: (id: string) => Promise<void>;
    runAutomatically: (id: string) => Promise<void>;
    cleanupProject: (id: string) => Promise<void>;
    deleteProject: (id: string, complete: boolean) => Promise<void>;
    createShorts: (id: string, count?: number, segmentLength?: number) => Promise<void>;
    deleteJob: (id: string) => Promise<void>;
    runJob: (id: string) => Promise<void>;
    updateJob: (id: string, parameters: Record<string, any>, scheduling?: { interval: string, time?: string }) => Promise<void>;
    createJob: (workflowId: string, parameters: Record<string, any>, scheduling?: { interval: string, time?: string }) => Promise<void>;
    createWorkflow: (workflow: Workflow) => Promise<void>;
    deleteWorkflow: (id: string) => Promise<void>;
    addNodeToWorkflow: (workflowId: string, nodeTemplate: WorkflowNode) => void;
    removeNodeFromWorkflow: (workflowId: string, nodeId: string) => void;
    moveNodeInWorkflow: (workflowId: string, nodeId: string, direction: 'up' | 'down') => void;
    view: 'projects' | 'logs';
    setView: (view: 'projects' | 'logs') => void;
    globalSearch: string;
    setGlobalSearch: (s: string) => void;
    logs: LogEntry[];
    nodeTemplates: WorkflowNode[];
    assets: Asset[];
    assetCategories: string[];
    refreshAssets: () => Promise<void>;
    refreshAssetCategories: () => Promise<void>;
    templates: any[];
    refreshTemplates: () => Promise<void>;
}

export type LogEntry = {
    timestamp: string;
    level: 'info' | 'success' | 'error';
    message: string;
    project_id?: string;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'projects' | 'logs'>('projects');
    const [globalSearch, setGlobalSearch] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [assetCategories, setAssetCategories] = useState<string[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);

    const refreshAssetCategories = async () => {
        try {
            const categories = await ApiClient.getAssetCategories();
            setAssetCategories(categories);
        } catch (error) {
            console.error('Failed to load asset categories', error);
        }
    };

    const refreshTemplates = async () => {
        try {
            const data = await ApiClient.getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load templates', error);
        }
    };

    const refreshAssets = async () => {
        try {
            const [data, categories] = await Promise.all([
                ApiClient.getAssets(),
                ApiClient.getAssetCategories()
            ]);
            setAssets(data);
            setAssetCategories(categories);
            await refreshTemplates();
        } catch (error) {
            console.error('Failed to load assets', error);
        }
    };

    const refresh = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [data, workflowData, jobData] = await Promise.all([
                projectRepo.getAll(),
                projectRepo.getWorkflows(),
                projectRepo.getJobs()
            ]);

            setProjects(data);
            setWorkflows(workflowData);
            setJobs(jobData);
            await refreshAssets();

            if (selectedProject) {
                const updated = data.find(p => p.id === selectedProject.id);
                if (updated) {
                    if (JSON.stringify(updated) !== JSON.stringify(selectedProject)) {
                        setSelectedProject(updated);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const updateProject = async (id: string, data: Partial<Project>) => {
        try {
            setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
            if (selectedProject?.id === id) {
                setSelectedProject(prev => prev ? { ...prev, ...data } : undefined);
            }
            await projectRepo.update(id, data);
        } catch (error) {
            console.error('Failed to update project', error);
            await refresh(true);
        }
    };

    const runNextStage = async (id: string) => {
        try {
            setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'Processing' } : p));
            if (selectedProject?.id === id) {
                setSelectedProject(prev => prev ? { ...prev, status: 'Processing' } : undefined);
            }
            await projectRepo.runNextStage(id);
        } catch (error) {
            console.error('Failed to run next stage', error);
            await refresh(true);
        }
    };

    const retryStage = async (id: string) => {
        try {
            setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'Processing' } : p));
            if (selectedProject?.id === id) {
                setSelectedProject(prev => prev ? { ...prev, status: 'Processing' } : undefined);
            }
            await projectRepo.retryStage(id);
        } catch (error) {
            console.error('Failed to retry stage', error);
            await refresh(true);
        }
    };

    const runAutomatically = async (id: string) => {
        try {
            setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'Processing' } : p));
            if (selectedProject?.id === id) {
                setSelectedProject(prev => prev ? { ...prev, status: 'Processing' } : undefined);
            }
            await projectRepo.runAutomatically(id);
        } catch (error) {
            console.error('Failed to run automatically', error);
            await refresh(true);
        }
    };

    const cleanupProject = async (id: string) => {
        try {
            await projectRepo.cleanup(id);
            await refresh(true);
        } catch (error) {
            console.error('Failed to cleanup project', error);
        }
    };

    const deleteProject = async (id: string, complete: boolean) => {
        try {
            if (complete) {
                setProjects(prev => prev.filter(p => p.id !== id));
                if (selectedProject?.id === id) setSelectedProject(undefined);
            }
            await projectRepo.delete(id, complete);
            await refresh(true);
        } catch (error) {
            console.error('Failed to delete project', error);
            await refresh(true);
        }
    };

    const createJob = async (
        workflowId: string,
        parameters: Record<string, any>,
        scheduling?: { interval: string; time?: string }
    ) => {
        try {
            const { id } = await projectRepo.createJob(workflowId, parameters, scheduling);
            console.log(`Job created: ${id}`);
            await refresh(true);
        } catch (error) {
            console.error('Failed to create job', error);
            alert('Failed to launch workflow. Check console for details.');
        }
    };

    const createShorts = async (id: string, count?: number, segmentLength?: number) => {
        try {
            await projectRepo.createShorts(id, count, segmentLength);
        } catch (error) {
            console.error('Failed to create shorts', error);
            alert('Failed to create shorts. Check console for details.');
        }
    };

    const deleteJob = async (id: string) => {
        try {
            setJobs(prev => prev.filter(j => j.id !== id));
            await projectRepo.deleteJob(id);
            await refresh(true);
        } catch (error) {
            console.error('Failed to delete job', error);
            alert('Failed to delete job. Check console for details.');
            await refresh(true);
        }
    };

    const runJob = async (id: string) => {
        try {
            setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'Pending', progress: 0 } : j));
            await projectRepo.runJob(id);
            await refresh(true);
        } catch (error) {
            console.error('Failed to run job', error);
            alert('Failed to run job. Check console for details.');
            await refresh(true);
        }
    };

    const updateJob = async (
        id: string,
        parameters: Record<string, any>,
        scheduling?: { interval: string; time?: string }
    ) => {
        try {
            await projectRepo.updateJob(id, parameters, scheduling);
            await refresh(true);
        } catch (error) {
            console.error('Failed to update job', error);
            alert('Failed to update job. Check console for details.');
            await refresh(true);
        }
    };

    const createWorkflow = async (workflow: Workflow) => {
        try {
            await projectRepo.createWorkflow(workflow);
            await refresh(true);
        } catch (error) {
            console.error('Failed to create workflow', error);
            alert('Failed to save workflow.');
        }
    };

    const deleteWorkflow = async (id: string) => {
        if (!confirm('Are you sure you want to delete this workflow?')) return;
        try {
            await projectRepo.deleteWorkflow(id);
            await refresh(true);
        } catch (error) {
            console.error('Failed to delete workflow', error);
            alert('Failed to delete workflow.');
        }
    };

    const addNodeToWorkflow = (workflowId: string, nodeTemplate: WorkflowNode) => {
        // Implementation for adding nodes (still local for now, could be persisted)
        setWorkflows(prev => prev.map(w => {
            if (w.id === workflowId) {
                return {
                    ...w,
                    nodes: [...w.nodes, { ...nodeTemplate, id: `node_${Date.now()}` }]
                };
            }
            return w;
        }));
    };

    const removeNodeFromWorkflow = (workflowId: string, nodeId: string) => {
        setWorkflows(prev => prev.map(w => {
            if (w.id === workflowId) {
                return {
                    ...w,
                    nodes: w.nodes.filter(n => n.id !== nodeId)
                };
            }
            return w;
        }));
    };

    const moveNodeInWorkflow = (workflowId: string, nodeId: string, direction: 'up' | 'down') => {
        setWorkflows(prev => prev.map(w => {
            if (w.id === workflowId) {
                const index = w.nodes.findIndex(n => n.id === nodeId);
                if (index === -1) return w;

                const newNodes = [...w.nodes];
                if (direction === 'up' && index > 0) {
                    [newNodes[index], newNodes[index - 1]] = [newNodes[index - 1], newNodes[index]];
                } else if (direction === 'down' && index < newNodes.length - 1) {
                    [newNodes[index], newNodes[index + 1]] = [newNodes[index + 1], newNodes[index]];
                }
                return { ...w, nodes: newNodes };
            }
            return w;
        }));
    };

    useEffect(() => {
        refresh();
    }, []);

    useEffect(() => {
        const eventsUrl = ApiClient.getEventsUrl();
        const source = new EventSource(eventsUrl);

        source.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                const type = payload?.type;
                if (type === 'log') {
                    const entry = payload.data || {};
                    setLogs(prev => {
                        const next = [...prev, {
                            timestamp: payload.timestamp || new Date().toISOString(),
                            level: entry.level || 'info',
                            message: entry.message || '',
                            project_id: entry.project_id
                        }];
                        return next.slice(-500);
                    });
                } else if (type === 'status_update') {
                    const data = payload.data || {};
                    if (data.type === 'job') {
                        setJobs(prev => prev.map(j => j.id === data.id ? { ...j, status: data.status || j.status } : j));
                    } else if (data.id) {
                        setProjects(prev => prev.map(p => p.id === data.id ? {
                            ...p,
                            status: (data.status || p.status) as ProjectStatus,
                            currentStage: normalizeStage(data.currentStage || p.currentStage),
                            duration: data.duration || p.duration
                        } : p));
                        if (selectedProject?.id === data.id) {
                            setSelectedProject(prev => prev ? {
                                ...prev,
                                status: (data.status || prev.status) as ProjectStatus,
                                currentStage: normalizeStage(data.currentStage || prev.currentStage),
                                duration: data.duration || prev.duration
                            } : prev);
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to parse event payload', error);
            }
        };

        source.onerror = (error) => {
            console.error('EventSource error', error);
        };

        return () => {
            source.close();
        };
    }, []);

    return (
        <ProjectContext.Provider value={{
            projects, jobs, workflows, selectedProject, setSelectedProject,
            loading, refresh, updateProject,
            runNextStage, retryStage, runAutomatically, cleanupProject, deleteProject,
            createJob, createWorkflow, deleteWorkflow, addNodeToWorkflow, removeNodeFromWorkflow, moveNodeInWorkflow,
            view, setView,
            globalSearch, setGlobalSearch,
            logs,
            nodeTemplates: NODE_TEMPLATES,
            assets,
            assetCategories,
            refreshAssets,
            refreshAssetCategories,
            templates,
            refreshTemplates,
            deleteJob,
            runJob,
            updateJob,
            createShorts
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) throw new Error('useProject must be used within a ProjectProvider');
    return context;
};
