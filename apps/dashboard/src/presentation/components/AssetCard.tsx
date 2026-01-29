"use client";
import React, { useState, useMemo } from 'react';
import { ApiClient } from '../../infrastructure/api/api.client';

interface AssetCardProps {
    asset: {
        name: string;
        path: string;
        categories: string[];
        size: number;
        type: string;
        url: string;
    };
    onDelete: () => void;
    onUpdate?: () => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onDelete, onUpdate }) => {
    const [isManagingFolders, setIsManagingFolders] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Get available folders from local storage
    const availableFolders = useMemo(() => {
        const custom = JSON.parse(localStorage.getItem('custom_asset_folders') || '[]');
        const defaults = ['backgrounds', 'intros', 'endings', 'music', 'sfx', 'uncategorized'];
        return Array.from(new Set([...defaults, ...custom])).sort();
    }, []);

    const handleDelete = async () => {
        if (!confirm(`Delete ${asset.name}?`)) return;
        try {
            // Note: The physical path is derived from the first category in the original implementation
            // so we use the parent folder from the path for physical deletion
            const physicalCategory = asset.path.split('/')[0] || 'uncategorized';
            await ApiClient.deleteAsset(physicalCategory, asset.name);
            onDelete();
        } catch (error) {
            alert('Failed to delete asset');
            console.error(error);
        }
    };

    const toggleFolder = async (folder: string) => {
        const currentCats = asset.categories || [];
        let newCats: string[];

        if (currentCats.includes(folder)) {
            newCats = currentCats.filter(c => c !== folder);
        } else {
            newCats = [...currentCats, folder];
        }

        if (newCats.length === 0) newCats = ['uncategorized'];

        setUpdating(true);
        try {
            // We use the first category as the "access" path for the endpoint
            const accessCategory = asset.path.split('/')[0] || 'uncategorized';
            await ApiClient.updateAssetCategories(accessCategory, asset.name, newCats);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Failed to update categories', error);
            alert('Failed to update folders');
        } finally {
            setUpdating(false);
        }
    };

    const isVideo = (type: string) => {
        const videoExtensions = ['.mp4', '.webm', '.mkv', '.mov', '.avi'];
        return videoExtensions.includes(type.toLowerCase());
    };

    const getFullUrl = (url: string) => {
        const base = process.env.NEXT_PUBLIC_WORKER_API_URL || 'http://localhost:8000';
        return `${base}${encodeURI(url)}`;
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="asset-card group bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col hover:border-primary/50 transition-all shadow-sm">
            <div className={`aspect-video relative overflow-hidden bg-slate-200 dark:bg-slate-700 ${updating ? 'opacity-50 pointer-events-none' : ''}`}>
                {isVideo(asset.type) ? (
                    <video
                        src={getFullUrl(asset.url)}
                        className="w-full h-full object-cover opacity-80"
                        preload="metadata"
                        muted
                    />
                ) : (
                    <img
                        alt={asset.name}
                        className="w-full h-full object-cover opacity-80"
                        src={getFullUrl(asset.url)}
                    />
                )}

                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-all">
                    <span className="material-symbols-outlined text-white text-4xl cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                        {isVideo(asset.type) ? 'play_circle' : 'image'}
                    </span>
                </div>

                <div className="card-hover-actions absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                    <button
                        onClick={() => setIsManagingFolders(!isManagingFolders)}
                        className={`size-9 rounded-xl backdrop-blur-md flex items-center justify-center transition-all ${isManagingFolders ? 'bg-primary text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
                        title="Manage Folders"
                    >
                        <span className="material-symbols-outlined text-[18px]">folder_shared</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        className="size-9 rounded-xl bg-rose-500/80 backdrop-blur-md text-white hover:bg-rose-600 flex items-center justify-center transition-all"
                        title="Delete"
                    >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </div>

            <div className="p-5 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate pr-4" title={asset.name}>
                        {asset.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">database</span> {formatSize(asset.size)}</span>
                        <span>•</span>
                        <span>{asset.type}</span>
                    </div>
                </div>

                {isManagingFolders ? (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {availableFolders.map(folder => {
                            const isSelected = asset.categories.includes(folder);
                            return (
                                <button
                                    key={folder}
                                    onClick={() => toggleFolder(folder)}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary/30'}`}
                                >
                                    {folder}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-1.5 mt-1 min-h-[24px]">
                        {asset.categories.map(cat => (
                            <span
                                key={cat}
                                className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-primary/5 text-primary border border-primary/10 uppercase tracking-widest"
                            >
                                {cat}
                            </span>
                        ))}
                        {asset.categories.length === 0 && (
                            <span className="text-[9px] font-black text-slate-300 italic uppercase tracking-widest">Uncategorized</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
