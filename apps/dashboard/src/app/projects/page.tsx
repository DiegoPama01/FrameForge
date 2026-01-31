"use client";
import React, { useMemo, useState } from 'react';
import { useProject } from '../../presentation/context/ProjectContext';
import { ProjectToolbar } from '../../presentation/components/ProjectToolbar';
import { ProjectList } from '../../presentation/components/ProjectList';
import { ProjectDetail } from '../../presentation/components/ProjectDetail';

export default function ProjectsPage() {
    const { projects, selectedProject, setSelectedProject, globalSearch } = useProject();

    // Filter states
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [onlyErrors, setOnlyErrors] = useState(false);

    // Derived data for filters
    const readyStages = useMemo(() => [
        'Source Discovery',
        'Content Translation',
        'Gender Analysis',
        'Vocal Synthesis',
        'Caption Engine',
        'Thumbnail Forge',
        'Visual Production'
    ], []);

    const getNextStage = (stage: string) => {
        const idx = readyStages.indexOf(stage);
        if (idx === -1) return undefined;
        return readyStages[idx + 1];
    };

    const visibleProjects = useMemo(() => {
        return projects.filter((project) => {
            const nextStage = getNextStage(project.currentStage);
            const ready = project.currentStage === 'Visual Production' || (project.status === 'Success' && nextStage === 'Visual Production');
            return !ready;
        });
    }, [projects, readyStages]);

    const categories = useMemo(() => {
        const cats = new Set(visibleProjects.map(p => p.category).filter((c): c is string => !!c));
        return ['All', ...Array.from(cats)].sort();
    }, [visibleProjects]);

    const statuses = useMemo(() => {
        const stats = new Set(visibleProjects.map(p => p.status).filter((s): s is any => !!s));
        return ['All', ...Array.from(stats)].sort();
    }, [visibleProjects]);

    // Filtered projects
    const filteredProjects = useMemo(() => {
        return visibleProjects.filter(p => {
            const matchGlobal = p.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
                p.id.toLowerCase().includes(globalSearch.toLowerCase());
            const matchStatus = statusFilter === 'All' || p.status === statusFilter;
            const matchCategory = categoryFilter === 'All' || p.category === categoryFilter;
            const matchError = !onlyErrors || p.status === 'Error';
            return matchGlobal && matchStatus && matchCategory && matchError;
        });
    }, [visibleProjects, statusFilter, categoryFilter, onlyErrors, globalSearch]);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <ProjectToolbar
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                onlyErrors={onlyErrors}
                setOnlyErrors={setOnlyErrors}
                categories={categories}
                statuses={statuses}
            />

            <div className="flex-1 flex overflow-hidden">
                <ProjectList
                    projects={filteredProjects}
                    selectedId={selectedProject?.id}
                    onSelect={(id) => setSelectedProject(projects.find(p => p.id === id))}
                />
                <ProjectDetail project={selectedProject} />
            </div>
        </div>
    );
}
