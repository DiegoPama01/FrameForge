"use client";
import React, { useState } from 'react';
import { Workflow } from '../../core/domain/entities/project.entity';
import { useProject } from '../context/ProjectContext';

interface CreateJobModalProps {
    workflow: Workflow | null;
    isOpen: boolean;
    onClose: () => void;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({ workflow, isOpen, onClose }) => {
    const { createJob } = useProject();
    const [params, setParams] = useState<Record<string, any>>({});
    const [currentStep, setCurrentStep] = useState(0);

    React.useEffect(() => {
        if (workflow?.nodes) {
            const defaults: Record<string, any> = {};
            workflow.nodes.forEach(node => {
                node.parameters.forEach(p => {
                    defaults[p.id] = p.defaultValue ?? '';
                });
            });
            setParams(defaults);
            setCurrentStep(0);
        }
    }, [workflow, isOpen]);

    if (!isOpen || !workflow) return null;

    const nodes = workflow.nodes;
    const isLastStep = currentStep === nodes.length; // Final summary step
    const currentNode = nodes[currentStep];

    const handleNext = () => {
        if (currentStep < nodes.length) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleLaunch = async () => {
        await createJob(workflow.id, params);
        onClose();
    };

    const handleParamChange = (id: string, value: any) => {
        if (id.startsWith('global_')) {
            // Update all global parameters with this ID (sync across nodes)
            setParams(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    if (key === id) {
                        next[key] = value;
                    }
                });
                return next;
            });
        } else {
            setParams(prev => ({ ...prev, [id]: value }));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-background-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 min-h-[500px]">
                {/* Header with Stepper Progress */}
                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">rocket_launch</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">Launch Workflow</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{workflow.name}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Step Progress Bar */}
                    <div className="flex items-center gap-2 px-1">
                        {nodes.map((node, index) => (
                            <React.Fragment key={node.id}>
                                <div className={`flex items-center justify-center size-7 rounded-full text-[10px] font-black transition-all ${index <= currentStep ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                                    {index + 1}
                                </div>
                                {index < nodes.length - 1 && (
                                    <div className={`flex-1 h-0.5 rounded-full ${index < currentStep ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                                )}
                            </React.Fragment>
                        ))}
                        <div className={`flex-1 h-0.5 rounded-full ${currentStep === nodes.length ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                        <div className={`flex items-center justify-center size-7 rounded-full text-[10px] font-black transition-all ${currentStep === nodes.length ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                            <span className="material-symbols-outlined text-[14px]">done</span>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                    {currentStep < nodes.length ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="material-symbols-outlined text-primary text-2xl">{currentNode.icon}</span>
                                <h4 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">{currentNode.label}</h4>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
                                {currentNode.description}
                            </p>

                            <div className="space-y-5">
                                {currentNode.parameters.map((param) => (
                                    <div key={param.id} className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">{param.label}</label>
                                        {param.type === 'select' ? (
                                            <select
                                                value={params[param.id]}
                                                onChange={(e) => handleParamChange(param.id, e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 transition-all outline-none cursor-pointer"
                                            >
                                                {param.options?.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        ) : param.type === 'boolean' ? (
                                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                <input
                                                    type="checkbox"
                                                    checked={params[param.id]}
                                                    onChange={(e) => handleParamChange(param.id, e.target.checked)}
                                                    className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                />
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Enable feature</span>
                                            </div>
                                        ) : (
                                            <input
                                                type={param.type === 'number' ? 'number' : 'text'}
                                                placeholder={param.placeholder}
                                                value={params[param.id]}
                                                onChange={(e) => handleParamChange(param.id, param.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                            <div className="flex flex-col items-center justify-center py-4 text-center">
                                <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-4xl">task_alt</span>
                                </div>
                                <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Ready to Launch</h4>
                                <p className="text-xs text-slate-500 font-medium">Review your configuration before creating the job.</p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
                                {nodes.map(node => (
                                    <div key={node.id} className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-primary">{node.icon}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{node.label}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pl-6">
                                            {node.parameters.map(p => (
                                                <div key={p.id} className="flex flex-col">
                                                    <span className="text-[9px] text-slate-400 font-bold">{p.label}</span>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                                        {typeof params[p.id] === 'boolean' ? (params[p.id] ? 'Yes' : 'No') : params[p.id]}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/10">
                    <button
                        onClick={currentStep === 0 ? onClose : handleBack}
                        className="px-6 py-2.5 text-sm font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center gap-2"
                    >
                        {currentStep === 0 ? 'Cancel' : (
                            <>
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                                Back
                            </>
                        )}
                    </button>
                    {!isLastStep ? (
                        <button
                            onClick={handleNext}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-2xl text-sm font-black shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                        >
                            Next Step
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleLaunch}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2.5 rounded-2xl text-sm font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">play_arrow</span>
                            Launch Workflow
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
