"use client";
import React from 'react';

export type IntroOutroConfig = {
    mode: 'compose' | 'video';
    video: string;
    text: string;
    voice: string;
    templateId: string;
    templateFields: Record<string, string>;
    previewAspect?: '16:9' | '9:16' | 'image';
};

export type IntroOutroModalProps = {
    title: string;
    config: IntroOutroConfig;
    onClose: () => void;
    onSave: (next: IntroOutroConfig) => Promise<boolean> | boolean;
    videoAssets: { name: string; path: string }[];
    templates: any[];
    placeholderValues: Record<string, string>;
};

const PLACEHOLDER_REGEX = /{{\s*([\w.-]+)\s*}}/g;

export const buildPlaceholderValues = (meta: Record<string, any>, titleFallback: string, projectId?: string) => {
    const values: Record<string, string> = {};
    values.title = meta.title || meta.title_es || titleFallback;
    if (projectId) values.project_id = projectId;
    Object.entries(meta || {}).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            values[key] = String(value);
        }
    });
    return values;
};

const getPlaceholderTooltip = (fields: Record<string, string>, values: Record<string, string>) => {
    const tooltips: Record<string, string> = {};
    Object.entries(fields).forEach(([key, text]) => {
        const matches = Array.from(String(text || '').matchAll(PLACEHOLDER_REGEX)).map((m) => m[1]);
        if (matches.length === 0) {
            tooltips[key] = '';
            return;
        }
        const resolved = matches.map((token) => `${token}: ${values[token] ?? 'N/A'}`).join('\n');
        tooltips[key] = resolved;
    });
    return tooltips;
};

const InlineTooltip: React.FC<{ text?: string }> = ({ text }) => {
    if (!text) return null;
    return (
        <div className="pointer-events-none absolute right-0 top-0 z-20 -translate-y-full translate-x-0 rounded-lg bg-slate-900 px-3 py-2 text-[11px] text-white shadow-lg opacity-0 transition-opacity group-hover:opacity-100 whitespace-pre-line">
            {text}
        </div>
    );
};

export const IntroOutroModal: React.FC<IntroOutroModalProps> = ({
    title,
    config,
    onClose,
    onSave,
    videoAssets,
    templates,
    placeholderValues
}) => {
    const [draft, setDraft] = React.useState(config);

    const handleChange = (key: keyof IntroOutroConfig, value: IntroOutroConfig[keyof IntroOutroConfig]) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    };

    const selectedTemplate = templates.find((tpl) => tpl.id === draft.templateId);
    const templateTooltip = getPlaceholderTooltip(draft.templateFields, placeholderValues);
    const overlayTooltip = getPlaceholderTooltip({ text: draft.text }, placeholderValues);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
            <div className="w-full max-w-2xl bg-white dark:bg-background-dark rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleChange('mode', 'compose')}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${draft.mode === 'compose'
                                ? 'border-primary text-primary bg-primary/10'
                                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-primary/50'
                                }`}
                        >
                            Compose (Video + PNG + Text)
                        </button>
                        <button
                            onClick={() => handleChange('mode', 'video')}
                            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${draft.mode === 'video'
                                ? 'border-primary text-primary bg-primary/10'
                                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-primary/50'
                                }`}
                        >
                            Use Raw Video
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Video</label>
                        <select
                            value={draft.video}
                            onChange={(event) => handleChange('video', event.target.value)}
                            className="input-field-compact"
                        >
                            <option value="">Select video</option>
                            {videoAssets.map((asset) => (
                                <option key={asset.path} value={asset.path}>{asset.name}</option>
                            ))}
                        </select>
                    </div>

                    {draft.mode === 'compose' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Template</label>
                                <select
                                    value={draft.templateId}
                                    onChange={(event) => {
                                        const nextId = event.target.value;
                                        const tpl = templates.find((t) => t.id === nextId);
                                        const fields: Record<string, string> = {};
                                        (tpl?.fields || []).forEach((f: any) => {
                                            fields[f.id] = '';
                                        });
                                        setDraft((prev) => ({
                                            ...prev,
                                            templateId: nextId,
                                            templateFields: fields,
                                            previewAspect: '16:9'
                                        }));
                                    }}
                                    className="input-field-compact"
                                >
                                    <option value="">Select template</option>
                                    {templates.map((tpl) => (
                                        <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={draft.previewAspect || '16:9'}
                                    onChange={(event) => handleChange('previewAspect', event.target.value as '16:9' | '9:16' | 'image')}
                                    className="input-field-compact"
                                >
                                    <option value="16:9">Preview 16:9</option>
                                    <option value="9:16">Preview 9:16</option>
                                    <option value="image">Preview Image</option>
                                </select>
                            </div>

                            {selectedTemplate && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Template Fields</label>
                                    <div className="space-y-2">
                                        {selectedTemplate.fields.map((field: any) => (
                                            <div key={field.id} className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-500 w-28 truncate">{field.name}</span>
                                                <div className="relative group flex-1">
                                                    <input
                                                        value={draft.templateFields[field.id] || ''}
                                                        onChange={(event) => {
                                                            const value = event.target.value;
                                                            setDraft((prev) => ({
                                                                ...prev,
                                                                templateFields: { ...prev.templateFields, [field.id]: value }
                                                            }));
                                                        }}
                                                        className="input-field-compact"
                                                        placeholder="{{author}} or {{title}}"
                                                    />
                                                    <InlineTooltip text={templateTooltip[field.id]} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Overlay Text</label>
                                <div className="relative group">
                                    <textarea
                                        value={draft.text}
                                        onChange={(event) => handleChange('text', event.target.value)}
                                        className="input-field-compact min-h-[90px]"
                                        placeholder="Write the intro/outro text..."
                                    />
                                    <InlineTooltip text={overlayTooltip.text} />
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900/30">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            const ok = await onSave(draft);
                            if (ok !== false) {
                                onClose();
                            }
                        }}
                        className="px-6 py-2 rounded-lg text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                        Save Intro/Outro
                    </button>
                </div>
            </div>
        </div>
    );
};
