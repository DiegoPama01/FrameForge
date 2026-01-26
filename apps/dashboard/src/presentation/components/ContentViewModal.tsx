"use client";
import React, { useState } from 'react';

interface MetadataViewModalProps {
    project: any;
    isOpen: boolean;
    onClose: () => void;
}

export const ContentViewModal: React.FC<MetadataViewModalProps> = ({
    project,
    isOpen,
    onClose
}) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !project) return null;

    const metadata = [
        { label: 'Project ID', value: project.id, icon: 'fingerprint', mono: true },
        { label: 'Title', value: project.title, icon: 'title' },
        { label: 'Source', value: project.source || 'Reddit', icon: 'source' },
        { label: 'Subreddit', value: project.category ? `r/${project.category}` : 'N/A', icon: 'forum' },
        { label: 'Status', value: project.status, icon: 'info', badge: true },
        { label: 'Current Stage', value: project.currentStage, icon: 'step_into' },
        { label: 'Duration', value: project.duration || 'Not generated', icon: 'timer' },
        { label: 'Last Updated', value: new Date(project.updatedAt).toLocaleString(), icon: 'update' },
    ];

    const jsonString = JSON.stringify(project, null, 2);

    const handleCopyJson = () => {
        navigator.clipboard.writeText(jsonString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">analytics</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Metadata Explorer</h3>
                            <p className="text-xs text-slate-500 font-medium">Visualizing project data properties</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {metadata.map((item, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-slate-400">{item.icon}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.label}</span>
                                </div>
                                <p className={`text-sm font-semibold truncate ${item.mono ? 'font-mono text-xs' : ''} ${item.badge ? 'text-primary' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {item.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Raw JSON Data</span>
                            <button
                                onClick={handleCopyJson}
                                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[14px]">{copied ? 'check' : 'content_copy'}</span>
                                {copied ? 'Copied' : 'Copy JSON'}
                            </button>
                        </div>
                        <div className="bg-slate-900 rounded-xl p-4 overflow-auto border border-slate-800">
                            <pre className="text-[11px] font-mono text-emerald-400/90 leading-relaxed">
                                {jsonString}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-black/10"
                    >
                        Close Inspector
                    </button>
                </div>
            </div>
        </div>
    );
};
