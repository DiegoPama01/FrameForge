"use client";
import React, { useState } from 'react';
import { WorkflowNode } from '../../core/domain/entities/project.entity';
import { useProject } from '../context/ProjectContext';

interface AddNodeModalProps {
    workflowId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({ workflowId, isOpen, onClose }) => {
    const { nodeTemplates, addNodeToWorkflow } = useProject();
    const [search, setSearch] = useState('');

    if (!isOpen) return null;

    const filteredTemplates = nodeTemplates.filter(t =>
        t.label.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = (template: WorkflowNode) => {
        addNodeToWorkflow(workflowId, template);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-background-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 max-h-[80vh]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">library_add</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight">Add Pipeline Node</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Node Library</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="Search nodes by name or function..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredTemplates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => handleAdd(template)}
                                className="flex flex-col text-left p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl hover:shadow-primary/5 transition-all group"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="size-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary/20 transition-all">
                                        <span className="material-symbols-outlined text-2xl">{template.icon}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">{template.label}</h4>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pipeline Stage</span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                                    {template.description}
                                </p>
                                <div className="mt-auto flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                        <span className="material-symbols-outlined text-[14px]">tune</span>
                                        {template.parameters.length} params
                                    </div>
                                    <div className="size-8 rounded-lg bg-primary/5 text-primary opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                        <span className="material-symbols-outlined text-lg font-black">add</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-[60%]">
                        Selecting a node will instantly add it to the end of your workflow pipeline.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                        Close Library
                    </button>
                </div>
            </div>
        </div>
    );
};
