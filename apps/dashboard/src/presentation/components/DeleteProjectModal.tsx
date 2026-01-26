"use client";
import React from 'react';

interface DeleteProjectModalProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    onDelete: (complete: boolean) => void;
    isRunning: boolean;
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
    projectId,
    isOpen,
    onClose,
    onDelete,
    isRunning
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="size-10 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                        <span className="material-symbols-outlined">delete_forever</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Remove Project</h3>
                        <p className="text-xs text-slate-500 font-mono">{projectId}</p>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        How do you want to remove this project? Choose the option that best fits your needs.
                    </p>

                    <div className="space-y-3">
                        <button
                            disabled={isRunning}
                            onClick={() => onDelete(false)}
                            className="w-full flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left group cursor-pointer"
                        >
                            <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors">
                                <span className="material-symbols-outlined text-[20px]">cancel</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">Cancel Project</h4>
                                <p className="text-[11px] text-slate-500">Marks as "Cancelled" in DB. Keeps all files in storage if you want to retry later.</p>
                            </div>
                        </button>

                        <button
                            disabled={isRunning}
                            onClick={() => onDelete(true)}
                            className="w-full flex items-start gap-4 p-4 rounded-xl border border-rose-100 dark:border-rose-900/20 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all text-left group cursor-pointer"
                        >
                            <div className="size-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-500 group-hover:text-rose-600 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 transition-colors">Delete Permanently</h4>
                                <p className="text-[11px] text-slate-500 font-medium text-rose-600/70">DANGER: Permanent action. Removes project folder and all database records.</p>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isRunning}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Keep for now
                    </button>
                </div>
            </div>
        </div>
    );
};
