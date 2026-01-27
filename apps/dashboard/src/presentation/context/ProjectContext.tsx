"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Job, Workflow, WorkflowNode } from '../../core/domain/entities/project.entity';
import { HttpProjectRepository } from '../../infrastructure/repositories/http_project.repository';

const projectRepo = new HttpProjectRepository();

const NODE_TEMPLATES: WorkflowNode[] = [
    {
        id: 'tpl-source',
        label: 'Source Discovery',
        icon: 'rss_feed',
        description: 'Find and scrape stories from targeted subreddits.',
        parameters: [
            { id: 'subreddits', label: 'Target Subreddits', type: 'string', placeholder: 'e.g. AskReddit, Nosleep', defaultValue: 'AskReddit' },
            { id: 'limit', label: 'Post Limit', type: 'number', defaultValue: 5 }
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
                    { label: 'AR - Elena (Female)', value: 'es-AR-ElenaNeural' }
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
                id: 'background_type', label: 'Background', type: 'select', defaultValue: 'gameplay', options: [
                    { label: 'Gameplay', value: 'gameplay' },
                    { label: 'Abstract', value: 'abstract' }
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
            {
                id: 'output_format', label: 'Output Format', type: 'select', defaultValue: 'mp4', options: [
                    { label: 'MP4 1080p', value: 'mp4' },
                    { label: 'Vertical 4K', value: '4k_vertical' }
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
            { id: 'platforms', label: 'Target Platforms', type: 'string', defaultValue: 'TikTok, Reels, Shorts' }
        ]
    }
];

const DEFAULT_WORKFLOWS: Workflow[] = [
    {
        id: 'wf-reddit-advanced',
        name: 'Professional Reddit Pipeline',
        description: 'Advanced pipeline with multilingual support, automatic gender detection, and custom visual mastering.',
        status: 'active',
        usageCount: 42,
        tags: ['premium', 'advanced', 'auto'],
        nodes: [
            { ...NODE_TEMPLATES[0], id: `node_1` }, // Source
            { ...NODE_TEMPLATES[1], id: `node_2` }, // Translation
            { ...NODE_TEMPLATES[2], id: `node_3` }, // Gender
            { ...NODE_TEMPLATES[3], id: `node_4` }, // Voice
            { ...NODE_TEMPLATES[5], id: `node_5` }, // Thumbnail
            { ...NODE_TEMPLATES[8], id: `node_6` }, // Video Gen
            { ...NODE_TEMPLATES[9], id: `node_7` }, // Mastering
            { ...NODE_TEMPLATES[10], id: `node_8` } // Publishing
        ]
    }
];

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
    cleanupProject: (id: string) => Promise<void>;
    deleteProject: (id: string, complete: boolean) => Promise<void>;
    createJob: (workflowId: string, parameters: Record<string, any>) => Promise<void>;
    addNodeToWorkflow: (workflowId: string, nodeTemplate: WorkflowNode) => void;
    removeNodeFromWorkflow: (workflowId: string, nodeId: string) => void;
    moveNodeInWorkflow: (workflowId: string, nodeId: string, direction: 'up' | 'down') => void;
    view: 'projects' | 'logs';
    setView: (view: 'projects' | 'logs') => void;
    globalSearch: string;
    setGlobalSearch: (s: string) => void;
    logs: LogEntry[];
    nodeTemplates: WorkflowNode[];
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
    const [workflows, setWorkflows] = useState<Workflow[]>(DEFAULT_WORKFLOWS);
    const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'projects' | 'logs'>('projects');
    const [globalSearch, setGlobalSearch] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const refresh = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const data = await projectRepo.getAll();
            setProjects(data);

            if (selectedProject) {
                const updated = data.find(p => p.id === selectedProject.id);
                if (updated) {
                    if (JSON.stringify(updated) !== JSON.stringify(selectedProject)) {
                        setSelectedProject(updated);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch projects', error);
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

    const createJob = async (workflowId: string, parameters: Record<string, any>) => {
        const newJob: Job = {
            id: `job_${Date.now()}`,
            workflowId,
            status: 'Pending',
            progress: 0,
            parameters,
            createdAt: new Date().toISOString()
        };

        setJobs(prev => [newJob, ...prev]);

        setTimeout(() => {
            setJobs(prev => prev.map(j => j.id === newJob.id ? { ...j, status: 'Running', progress: 10 } : j));
            setTimeout(async () => {
                setJobs(prev => prev.map(j => j.id === newJob.id ? { ...j, status: 'Completed', progress: 100 } : j));
                await refresh(true);
            }, 5000);
        }, 2000);
    };

    const addNodeToWorkflow = (workflowId: string, nodeTemplate: WorkflowNode) => {
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

    return (
        <ProjectContext.Provider value={{
            projects, jobs, workflows, selectedProject, setSelectedProject,
            loading, refresh, updateProject,
            runNextStage, retryStage, cleanupProject, deleteProject,
            createJob, addNodeToWorkflow, removeNodeFromWorkflow, moveNodeInWorkflow,
            view, setView,
            globalSearch, setGlobalSearch,
            logs,
            nodeTemplates: NODE_TEMPLATES
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
