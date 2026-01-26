"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project } from '../../core/domain/entities/project.entity';
import { HttpProjectRepository } from '../../infrastructure/repositories/http_project.repository';

const projectRepo = new HttpProjectRepository();

interface ProjectContextType {
    projects: Project[];
    selectedProject: Project | undefined;
    setSelectedProject: (project: Project | undefined) => void;
    loading: boolean;
    refresh: (silent?: boolean) => Promise<void>;
    updateProject: (id: string, data: Partial<Project>) => Promise<void>;
    runNextStage: (id: string) => Promise<void>;
    retryStage: (id: string) => Promise<void>;
    cleanupProject: (id: string) => Promise<void>;
    deleteProject: (id: string, complete: boolean) => Promise<void>;
    view: 'projects' | 'logs';
    setView: (view: 'projects' | 'logs') => void;
    logs: LogEntry[];
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
    const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'projects' | 'logs'>('projects');
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const refresh = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const data = await projectRepo.getAll();
            setProjects(data);

            // Sync selectedProject with new data
            if (selectedProject) {
                const updated = data.find(p => p.id === selectedProject.id);
                if (updated) {
                    // Only update if something changed to avoid unnecessary re-renders
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
            await projectRepo.update(id, data);
            setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
            if (selectedProject?.id === id) {
                setSelectedProject(prev => prev ? { ...prev, ...data } : undefined);
            }
        } catch (error) {
            console.error('Failed to update project', error);
            throw error;
        }
    };

    const runNextStage = async (id: string) => {
        // Optimistic update
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'Processing' as const } : p));
        if (selectedProject?.id === id) {
            setSelectedProject(prev => prev ? { ...prev, status: 'Processing' as const } : undefined);
        }

        try {
            await projectRepo.runNextStage(id);
            await refresh(true);
        } catch (error) {
            console.error('Failed to run next stage', error);
            await refresh(true); // Revert state on error
            throw error;
        }
    };

    const retryStage = async (id: string) => {
        // Optimistic update
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'Processing' as const } : p));
        if (selectedProject?.id === id) {
            setSelectedProject(prev => prev ? { ...prev, status: 'Processing' as const } : undefined);
        }

        try {
            await projectRepo.retryStage(id);
            await refresh(true);
        } catch (error) {
            console.error('Failed to retry stage', error);
            await refresh(true); // Revert state on error
            throw error;
        }
    };

    const cleanupProject = async (id: string) => {
        try {
            await projectRepo.cleanupProject(id);
            await refresh();
        } catch (error) {
            console.error('Failed to cleanup project', error);
            throw error;
        }
    };

    const deleteProject = async (id: string, complete: boolean) => {
        try {
            await projectRepo.deleteProject(id, complete);
            if (selectedProject?.id === id) {
                setSelectedProject(undefined);
            }
            await refresh();
        } catch (error) {
            console.error('Failed to delete project', error);
            throw error;
        }
    };

    useEffect(() => {
        refresh();

        // Connect to SSE with Auth Token
        const token = process.env.NEXT_PUBLIC_WORKER_TOKEN || '';
        const baseUrl = process.env.NEXT_PUBLIC_WORKER_API_URL || 'http://localhost:8000';
        const eventSource = new EventSource(`${baseUrl}/events?token=${token}`);

        eventSource.onopen = () => {
            console.log('SSE Connected');
            setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'success', message: 'Connected to Real-time Events' }]);
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'log') {
                    setLogs(prev => [...prev, {
                        timestamp: new Date().toISOString(),
                        level: data.data.level,
                        message: data.data.message,
                        project_id: data.data.project_id
                    }]);
                } else if (data.type === 'status_update') {
                    setProjects(prev => prev.map(p => p.id === data.data.id ? { ...p, status: data.data.status, currentStage: data.data.currentStage } : p));
                    if (selectedProject?.id === data.data.id) {
                        // Only update specific fields to avoid full re-render resets
                        setSelectedProject(prev => prev ? { ...prev, status: data.data.status, currentStage: data.data.currentStage } : undefined);
                    }
                }
            } catch (e) {
                console.error('Failed to parse SSE event', e);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE Error', err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, []);

    // Polling for processing projects - Keeping as backup or removing?
    // User wanted real-time "instead" of polling, so removing polling helps reduce load.

    return (
        <ProjectContext.Provider value={{ projects, selectedProject, setSelectedProject, loading, refresh, updateProject, runNextStage, retryStage, cleanupProject, deleteProject, view, setView, logs }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) throw new Error('useProject must be used within ProjectProvider');
    return context;
};
