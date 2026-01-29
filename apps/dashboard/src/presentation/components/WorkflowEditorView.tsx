"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { Workflow } from '../../core/domain/entities/project.entity';
import { CreateJobModal } from './CreateJobModal';

export const WorkflowEditorView: React.FC = () => {
    const { globalSearch, workflows: WORKFLOW_TEMPLATES } = useProject();
    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
    const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);

    const normalizedSearch = globalSearch.trim().toLowerCase();

    const filteredWorkflows = useMemo(() => {
        if (!normalizedSearch) return WORKFLOW_TEMPLATES;
        return WORKFLOW_TEMPLATES.filter((workflow) => {
            const haystack = [workflow.name, workflow.description, workflow.tags.join(' '), workflow.nodes.map(n => n.label).join(' ')].join(' ').toLowerCase();
            return haystack.includes(normalizedSearch);
        });
    }, [normalizedSearch, WORKFLOW_TEMPLATES]);

    function getWorkflowStatusClasses(status: any) {
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

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/20 p-6">
            <section className="mb-8 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Workflow Library</h2>
                        <p className="text-sm text-slate-500 font-medium">Select a predefined pipeline to launch a new job.</p>
                    </div>
                </div>
            </section>

            <section className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
                    {filteredWorkflows.map((workflow) => (
                        <div
                            key={workflow.id}
                            className="group bg-white dark:bg-background-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all p-6 flex flex-col h-full"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="size-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-2xl">
                                        {workflow.nodes[0]?.icon || 'account_tree'}
                                    </span>
                                </div>
                                <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${getWorkflowStatusClasses(workflow.status)}`}>
                                    {workflow.status}
                                </div>
                            </div>

                            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2 group-hover:text-primary transition-colors">
                                {workflow.name}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-6 flex-1">
                                {workflow.description}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-6">
                                {workflow.tags.map((tag: string) => (
                                    <span key={tag} className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase tracking-widest">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <span className="material-symbols-outlined text-sm">account_tree</span>
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">{workflow.nodes.length} Stages</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedWorkflow(workflow);
                                        setIsLaunchModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                    Launch
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <CreateJobModal
                workflow={selectedWorkflow}
                isOpen={isLaunchModalOpen}
                onClose={() => {
                    setIsLaunchModalOpen(false);
                    setSelectedWorkflow(null);
                }}
            />
        </div>
    );
};
