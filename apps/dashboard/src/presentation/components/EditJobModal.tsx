"use client";
import React, { useEffect, useState } from 'react';
import { Job, Workflow, WorkflowParameter } from '../../core/domain/entities/project.entity';
import { useProject } from '../context/ProjectContext';
import { IntroOutroModal, IntroOutroConfig } from './IntroOutroModal';

interface EditJobModalProps {
    job: Job | null;
    workflow: Workflow | null;
    isOpen: boolean;
    onClose: () => void;
}

export const EditJobModal: React.FC<EditJobModalProps> = ({ job, workflow, isOpen, onClose }) => {
    const { updateJob, assetCategories, assets, templates } = useProject();
    const [params, setParams] = useState<Record<string, any>>({});
    const [scheduleInterval, setScheduleInterval] = useState<'once' | 'daily' | 'weekly'>('once');
    const [scheduleTime, setScheduleTime] = useState('09:00');
    const [isIntroOpen, setIsIntroOpen] = useState(false);
    const [isOutroOpen, setIsOutroOpen] = useState(false);

    useEffect(() => {
        if (job && workflow) {
            const defaults: Record<string, any> = {};
            workflow.nodes.forEach(node => {
                node.parameters.forEach(p => {
                    defaults[p.id] = p.defaultValue ?? (p.type === 'chips' || p.type === 'multiselect' ? [] : '');
                });
            });
            setParams({ ...defaults, ...(job.parameters || {}) });
            const interval = job.schedule_interval === 'daily' || job.schedule_interval === 'weekly' ? job.schedule_interval : 'once';
            setScheduleInterval(interval);
            setScheduleTime(job.schedule_time || '09:00');
        } else if (job) {
            setParams({ ...(job.parameters || {}) });
            const interval = job.schedule_interval === 'daily' || job.schedule_interval === 'weekly' ? job.schedule_interval : 'once';
            setScheduleInterval(interval);
            setScheduleTime(job.schedule_time || '09:00');
        }
    }, [job, workflow, isOpen]);

    const handleSave = async () => {
        if (!job) return;
        if (scheduleInterval !== 'once' && !scheduleTime) {
            alert('Please select a schedule time.');
            return;
        }
        await updateJob(job.id, params, {
            interval: scheduleInterval,
            time: scheduleInterval === 'once' ? '' : scheduleTime
        });
        onClose();
    };

    const handleParamChange = (id: string, value: any) => {
        setParams(prev => ({ ...prev, [id]: value }));
    };

    const nodes = workflow?.nodes || [];
    const hiddenParamIds = React.useMemo(() => new Set([
        'intro_mode',
        'intro_template_id',
        'intro_video',
        'intro_text',
        'intro_voice',
        'intro_preview_aspect',
        'intro_template_fields',
        'outro_mode',
        'outro_template_id',
        'outro_video',
        'outro_text',
        'outro_voice',
        'outro_preview_aspect',
        'outro_template_fields'
    ]), []);
    const videoAssets = React.useMemo(() => {
        return assets.filter((asset) => {
            const type = asset.type?.toLowerCase() || '';
            return ['.mp4', '.mov', '.mkv', '.webm', '.avi'].includes(type);
        });
    }, [assets]);

    const imageAssets = React.useMemo(() => {
        return assets.filter((asset) => {
            const type = asset.type?.toLowerCase() || '';
            return ['.png', '.jpg', '.jpeg', '.webp'].includes(type);
        });
    }, [assets]);

    const buildIntroOutroConfig = (prefix: 'intro' | 'outro'): IntroOutroConfig => ({
        mode: (params[`${prefix}_mode`] || 'compose') as 'compose' | 'video',
        video: params[`${prefix}_video`] || '',
        text: params[`${prefix}_text`] || '',
        voice: params[`${prefix}_voice`] || 'same',
        templateId: params[`${prefix}_template_id`] || '',
        templateFields: params[`${prefix}_template_fields`] || {},
        previewAspect: params[`${prefix}_preview_aspect`] || '16:9'
    });

    const applyIntroOutroConfig = (prefix: 'intro' | 'outro', config: IntroOutroConfig) => {
        setParams(prev => ({
            ...prev,
            [`${prefix}_mode`]: config.mode,
            [`${prefix}_video`]: config.video,
            [`${prefix}_text`]: config.text,
            [`${prefix}_voice`]: config.voice,
            [`${prefix}_template_id`]: config.templateId,
            [`${prefix}_template_fields`]: config.templateFields,
            [`${prefix}_preview_aspect`]: config.previewAspect || '16:9'
        }));
    };

    if (!isOpen || !job) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-background-dark rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 max-h-[90vh]">
                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">tune</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">Edit Job</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{workflow?.name || 'Unknown Workflow'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scheduling</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Run</label>
                                <select
                                    value={scheduleInterval}
                                    onChange={(e) => setScheduleInterval(e.target.value as 'once' | 'daily' | 'weekly')}
                                    className="input-field-solid cursor-pointer"
                                >
                                    <option value="once">Once (manual)</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </div>
                            <div className={`space-y-1.5 ${scheduleInterval === 'once' ? 'opacity-50 pointer-events-none' : ''}`}>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Time (UTC)</label>
                                <input
                                    type="time"
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    className="input-field-solid"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Times run in UTC</p>
                    </div>

                    {nodes.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-slate-400 text-sm">
                            No workflow parameters available for this job.
                        </div>
                    )}

                    {nodes.map(node => (
                        <div key={node.id} className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-2xl">{node.icon}</span>
                                <div>
                                    <h4 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">{node.label}</h4>
                                    {node.description && <p className="text-xs text-slate-500 font-medium">{node.description}</p>}
                                </div>
                            </div>

                            <div className="space-y-5">
                                {node.parameters.filter((param) => !hiddenParamIds.has(param.id)).map((param) => {
                                    const input = renderParameterInput(param, node.id, params, assetCategories, templates, videoAssets, imageAssets, handleParamChange);
                                    if (!input) return null;
                                    return (
                                        <div key={param.id} className={`space-y-1.5 ${param.id === 'global_voice_style' && params['global_gender'] === 'auto' ? 'hidden' : ''}`}>
                                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">{param.label}</label>
                                            {input}
                                        </div>
                                    );
                                })}
                                {node.label === 'Mastering' && (
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsIntroOpen(true)}
                                            className="btn-outline"
                                        >
                                            Configure Intro
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsOutroOpen(true)}
                                            className="btn-outline"
                                        >
                                            Configure Outro
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/10">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center gap-2"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn-primary-lg"
                    >
                        <span className="material-symbols-outlined text-lg">save</span>
                        Save Changes
                    </button>
                </div>
            </div>
            {isIntroOpen && (
                <IntroOutroModal
                    title="Intro Builder"
                    config={buildIntroOutroConfig('intro')}
                    onClose={() => setIsIntroOpen(false)}
                    onSave={(next) => {
                        applyIntroOutroConfig('intro', next);
                        return true;
                    }}
                    videoAssets={videoAssets.map((asset) => ({ name: asset.name, path: asset.path }))}
                    templates={templates}
                    placeholderValues={{}}
                />
            )}
            {isOutroOpen && (
                <IntroOutroModal
                    title="Outro Builder"
                    config={buildIntroOutroConfig('outro')}
                    onClose={() => setIsOutroOpen(false)}
                    onSave={(next) => {
                        applyIntroOutroConfig('outro', next);
                        return true;
                    }}
                    videoAssets={videoAssets.map((asset) => ({ name: asset.name, path: asset.path }))}
                    templates={templates}
                    placeholderValues={{}}
                />
            )}
        </div>
    );
};

function renderParameterInput(
    param: WorkflowParameter,
    nodeId: string,
    params: Record<string, any>,
    assetCategories: string[],
    templates: any[],
    videoAssets: any[],
    imageAssets: any[],
    onChange: (id: string, value: any) => void
) {
    let options = param.options || [];
    if (nodeId === 'tpl-voice' && param.id === 'global_voice_style') {
        const currentLang = params['global_language'] || 'es';
        options = (param.options || []).filter(opt => {
            return String(opt.value).startsWith(`${currentLang}-`);
        });
    }

    if (param.id === 'asset_folder') {
        options = assetCategories.map(f => ({
            label: f.charAt(0).toUpperCase() + f.slice(1),
            value: f
        }));
    }
    if (param.id === 'intro_template_id' || param.id === 'outro_template_id') {
        options = templates.map((tpl) => ({
            label: tpl.name,
            value: tpl.id
        }));
    }
    if (param.id === 'background_video' || param.id === 'intro_video' || param.id === 'outro_video') {
        options = videoAssets.map((asset) => ({
            label: asset.name,
            value: asset.path
        }));
    }
    if (param.id === 'thumbnail') {
        options = imageAssets.map((asset) => ({
            label: asset.name,
            value: asset.path
        }));
    }

    if (param.type === 'chips') {
        return (
            <ChipsInput
                value={params[param.id] || []}
                onChange={(val) => onChange(param.id, val)}
                placeholder={param.placeholder}
            />
        );
    }

    if (param.type === 'multiselect') {
        return (
            <MultiSelect
                value={params[param.id] || []}
                onChange={(val) => onChange(param.id, val)}
                options={options}
            />
        );
    }

    if (param.type === 'select') {
        return (
            <select
                value={params[param.id]}
                onChange={(e) => onChange(param.id, e.target.value)}
                className="input-field-solid cursor-pointer"
            >
                <option value="">Select option</option>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        );
    }

    if (param.type === 'boolean') {
        return (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <input
                    type="checkbox"
                    checked={params[param.id]}
                    onChange={(e) => onChange(param.id, e.target.checked)}
                    className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Enable feature</span>
            </div>
        );
    }

    return (
        <input
            type={param.type === 'number' ? 'number' : 'text'}
            placeholder={param.placeholder}
            value={params[param.id]}
            onChange={(e) => onChange(param.id, param.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
            className="input-field-solid"
        />
    );
}

const ChipsInput: React.FC<{ value: string[], onChange: (val: string[]) => void, placeholder?: string }> = ({ value, onChange, placeholder }) => {
    const [input, setInput] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && input.trim()) {
            e.preventDefault();
            const newItem = input.trim().toLowerCase().replace(/^r\//, '');
            if (!value.includes(newItem)) {
                onChange([...value, newItem]);
            }
            setInput('');
        }
    };

    const removeChip = (item: string) => {
        onChange(value.filter(v => v !== item));
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[50px] items-start">
                {value.map(item => (
                    <div key={item} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary dark:bg-primary/20 rounded-lg text-xs font-bold ring-1 ring-primary/20">
                        <span>{item}</span>
                        <button type="button" onClick={() => removeChip(item)} className="material-symbols-outlined text-[14px] hover:text-rose-500 transition-colors cursor-pointer">close</button>
                    </div>
                ))}
                <input
                    type="text"
                    placeholder={placeholder}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-300 py-1 px-2 flex-1 min-w-[120px]"
                />
            </div>
        </div>
    );
};

const MultiSelect: React.FC<{ value: string[], onChange: (val: string[]) => void, options: { label: string, value: any }[] }> = ({ value, onChange, options }) => {
    const toggleOption = (optValue: string) => {
        if (value.includes(optValue)) {
            onChange(value.filter(v => v !== optValue));
        } else {
            onChange([...value, optValue]);
        }
    };

    return (
        <div className="grid grid-cols-1 gap-2">
            {options.map(opt => {
                const isSelected = value.includes(opt.value);
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleOption(opt.value)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isSelected ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'}`}
                    >
                        <span className="text-sm font-bold">{opt.label}</span>
                        <span className="material-symbols-outlined text-[20px]">
                            {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
