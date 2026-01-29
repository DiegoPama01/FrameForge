"use client";
import React, { useState, useRef } from 'react';
import { ApiClient } from '../../infrastructure/api/api.client';

interface UploadAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadSuccess: () => void;
    initialCategory?: string;
}

export const UploadAssetModal: React.FC<UploadAssetModalProps> = ({ isOpen, onClose, onUploadSuccess, initialCategory = 'uncategorized' }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [category, setCategory] = useState(initialCategory);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            setCategory(initialCategory);
        }
    }, [isOpen, initialCategory]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) return;
        setUploading(true);
        setUploadProgress({ current: 0, total: files.length });

        try {
            for (let i = 0; i < files.length; i++) {
                setUploadProgress(prev => ({ ...prev, current: i + 1 }));
                await ApiClient.uploadAsset(files[i], category);
            }
            onUploadSuccess();
            onClose();
            setFiles([]);
            setCategory('uncategorized');
        } catch (error) {
            console.error('Upload failed', error);
            alert('Upload failed during batch process');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold">Upload Assets</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-4">
                    {/* Drag & Drop Zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${files.length > 0 ? 'border-primary bg-primary/5' : 'border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            }`}
                    >
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            multiple
                        />
                        {files.length > 0 ? (
                            <div className="text-center w-full">
                                <span className="material-symbols-outlined text-4xl text-primary mb-2">folder_zip</span>
                                <p className="font-bold text-sm">{files.length} files selected</p>
                                <div className="mt-2 max-h-32 overflow-y-auto custom-scrollbar text-left text-xs text-slate-500 bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                                    {files.map((f, i) => (
                                        <div key={i} className="truncate border-b border-slate-200 dark:border-slate-700 py-1 last:border-none">
                                            {f.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">cloud_upload</span>
                                <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Click to upload or drag & drop</p>
                                <p className="text-xs text-slate-400 mt-1">Multi-file support enabled</p>
                            </div>
                        )}
                    </div>

                    {/* Category Selection */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Target Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-700/50 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="uncategorized">Uncategorized</option>
                            <option value="backgrounds">Backgrounds</option>
                            <option value="intros">Intros</option>
                            <option value="endings">Endings</option>
                            <option value="music">Music</option>
                            <option value="sfx">SFX</option>
                        </select>
                    </div>

                    {uploading && (
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] font-bold text-primary uppercase">
                                <span>Uploading...</span>
                                <span>{uploadProgress.current} / {uploadProgress.total}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        disabled={uploading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={files.length === 0 || uploading}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                                <span>Processing...</span>
                            </>
                        ) : (
                            <span>Upload {files.length > 0 ? `(${files.length})` : ''} Assets</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
