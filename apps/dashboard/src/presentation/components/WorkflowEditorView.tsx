"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { CreateJobModal } from './CreateJobModal';
import { AddNodeModal } from './AddNodeModal';

export const WorkflowEditorView: React.FC = () => {
    const { globalSearch, workflows: WORKFLOW_TEMPLATES, removeNodeFromWorkflow, moveNodeInWorkflow } = useProject();
    const [selectedWorkflowId, setSelectedWorkflowId] = useState(WORKFLOW_TEMPLATES[0]?.id ?? '');
    const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
    const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);

    const normalizedSearch = globalSearch.trim().toLowerCase();

    const filteredWorkflows = useMemo(() => {
        if (!normalizedSearch) return WORKFLOW_TEMPLATES;
        return WORKFLOW_TEMPLATES.filter((workflow) => {
            const haystack = [workflow.name, workflow.description, workflow.tags.join(' '), workflow.nodes.map(n => n.label).join(' ')].join(' ').toLowerCase();
            return haystack.includes(normalizedSearch);
        });
    }, [normalizedSearch, WORKFLOW_TEMPLATES]);

    useEffect(() => {
        if (!filteredWorkflows.find((workflow) => workflow.id === selectedWorkflowId)) {
            if (filteredWorkflows[0]) {
                setSelectedWorkflowId(filteredWorkflows[0].id);
            }
        }
    }, [filteredWorkflows, selectedWorkflowId]);

    const selectedWorkflow = useMemo(() => {
        return WORKFLOW_TEMPLATES.find((workflow) => workflow.id === selectedWorkflowId) ?? WORKFLOW_TEMPLATES[0];
    }, [selectedWorkflowId, WORKFLOW_TEMPLATES]);

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
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Workflow Studio</h2>
                        <p className="text-sm text-slate-500 font-medium">Design and automate your video production pipelines.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsLaunchModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer"
                        >
                            <span className="material-symbols-outlined">rocket_launch</span>
                            Launch Workflow
                        </button>
                    </div>
                </div>
            </section>

            <section className="flex-1 flex gap-8 overflow-hidden">
                {/* Studio Sidebar: Template Selection */}
                <aside className="w-80 flex flex-col bg-white dark:bg-background-dark rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 overflow-hidden shrink-0">
                    <div className="p-6 border-b border-slate-50 dark:border-slate-800">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">Templates</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Select a base to edit</p>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                        {filteredWorkflows.map((workflow) => {
                            const isSelected = selectedWorkflowId === workflow.id;
                            return (
                                <button
                                    key={workflow.id}
                                    onClick={() => setSelectedWorkflowId(workflow.id)}
                                    className={`w-full text-left p-4 rounded-2xl transition-all relative group ${isSelected ? 'bg-primary/5 border-primary/20 border shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">{workflow.name}</span>
                                        </div>
                                        <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${getWorkflowStatusClasses(workflow.status)}`}>
                                            {workflow.status}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                        <div className="flex -space-x-2">
                                            {workflow.tags.map((tag: string) => (
                                                <div key={tag} title={tag} className="size-6 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                                    <span className="text-[8px] font-black text-slate-500 uppercase">{tag[0]}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                                            <div className="flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[16px]">account_tree</span>
                                                <span>{workflow.nodes.length} Nodes</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[16px]">flash_on</span>
                                                <span>{workflow.usageCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {isSelected && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-r-xl shadow-[2px_0_10px_rgba(var(--primary-rgb),0.5)]"></div>}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Studio Main Content: Editor */}
                <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-background-dark shrink-0 rounded-t-3xl border-t border-x">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-2xl">design_services</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">Pipeline Editor</h3>
                                <p className="text-[11px] text-slate-500 font-medium">Configure and reorder automated nodes</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsAddNodeModalOpen(true)}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-lg">add_circle</span>
                                Add Node
                            </button>
                            <button disabled className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-500/20 opacity-50 cursor-not-allowed">
                                <span className="material-symbols-outlined text-lg">done_all</span>
                                Save Configuration
                            </button>
                        </div>
                    </div>

                    <div className="p-10 flex-1 bg-white dark:bg-slate-950/20 overflow-y-auto custom-scrollbar border-x border-b rounded-b-3xl">
                        <div className="mb-12 flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">Selected Config</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">v1.2.0</span>
                                </div>
                                <h4 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{selectedWorkflow?.name}</h4>
                                <p className="text-sm text-slate-500 max-w-2xl font-medium">{selectedWorkflow?.description}</p>
                            </div>
                            <div className="hidden lg:flex items-center gap-10">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Automation</p>
                                    <p className="text-base font-black text-slate-800 dark:text-slate-100">100% Autonomous</p>
                                </div>
                                <div className="w-px h-10 bg-slate-200 dark:bg-slate-800"></div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Runtime</p>
                                    <p className="text-base font-black text-slate-800 dark:text-slate-100">4m 20s</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 max-w-4xl mx-auto xl:mx-0 pr-4 pb-20">
                            {selectedWorkflow?.nodes.map((node: any, index: number) => (
                                <div key={node.id} className="relative group">
                                    {index < (selectedWorkflow?.nodes.length - 1) && (
                                        <div className="absolute left-[31px] top-16 w-1 h-12 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent z-0 opacity-50"></div>
                                    )}
                                    <div className="relative z-10 flex items-center justify-between gap-8 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 hover:border-primary/40 transition-all hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 group/card">
                                        <div className="flex items-center gap-6">
                                            <div className="size-16 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-lg font-black text-slate-300 group-hover/card:text-primary group-hover/card:border-primary/20 group-hover/card:bg-primary/5 transition-all">
                                                <span className="material-symbols-outlined text-2xl">{node.icon}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">{node.label}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                                        <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                                        Active Stage
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                        {node.parameters.length} Parameters
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button className="flex items-center gap-2 py-2.5 px-4 rounded-xl hover:bg-primary/5 text-slate-400 hover:text-primary transition-all font-black text-[10px] uppercase tracking-widest border border-transparent hover:border-primary/10">
                                                <span className="material-symbols-outlined text-[20px]">tune</span>
                                                Edit Params
                                            </button>
                                            <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 mx-2"></div>
                                            <button
                                                onClick={() => removeNodeFromWorkflow(selectedWorkflow.id, node.id)}
                                                className="p-3 rounded-xl text-slate-300 hover:text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/10 cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-[22px]">delete</span>
                                            </button>
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => moveNodeInWorkflow(selectedWorkflow.id, node.id, 'up')}
                                                    disabled={index === 0}
                                                    className="p-1 rounded-md hover:bg-primary/10 text-slate-300 hover:text-primary transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
                                                    title="Move Up"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">expand_less</span>
                                                </button>
                                                <button
                                                    onClick={() => moveNodeInWorkflow(selectedWorkflow.id, node.id, 'down')}
                                                    disabled={index === selectedWorkflow.nodes.length - 1}
                                                    className="p-1 rounded-md hover:bg-primary/10 text-slate-300 hover:text-primary transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
                                                    title="Move Down"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <CreateJobModal
                workflow={selectedWorkflow}
                isOpen={isLaunchModalOpen}
                onClose={() => setIsLaunchModalOpen(false)}
            />

            <AddNodeModal
                workflowId={selectedWorkflowId}
                isOpen={isAddNodeModalOpen}
                onClose={() => setIsAddNodeModalOpen(false)}
            />
        </div>
    );
};
