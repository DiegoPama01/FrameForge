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
    refresh: () => Promise<void>;
    updateProject: (id: string, data: Partial<Project>) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        try {
            setLoading(true);
            const data = await projectRepo.getAll();
            setProjects(data);
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            setLoading(false);
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

    useEffect(() => {
        refresh();
    }, []);

    return (
        <ProjectContext.Provider value={{ projects, selectedProject, setSelectedProject, loading, refresh, updateProject }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) throw new Error('useProject must be used within ProjectProvider');
    return context;
};
