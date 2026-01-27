"use client";
import React, { useState } from 'react';
import { ApiClient } from '../../infrastructure/api/api.client';

interface AssetCardProps {
    asset: {
        name: string;
        path: string;
        category: string;
        size: number;
        type: string;
        url: string;
    };
    onDelete: () => void;
    onUpdate?: () => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onDelete, onUpdate }) => {
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [updating, setUpdating] = useState(false);

    const handleDelete = async () => {
        if (!confirm(`Delete ${asset.name}?`)) return;
        try {
            await ApiClient.deleteAsset(asset.category, asset.name);
            onDelete();
        } catch (error) {
            alert('Failed to delete asset');
            console.error(error);
        }
    };

    const handleCategoryChange = async (newCategory: string) => {
        if (newCategory === asset.category) {
            setIsEditingCategory(false);
            return;
        }

        setUpdating(true);
        try {
            await ApiClient.updateAssetCategory(asset.category, asset.name, newCategory);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Failed to update category', error);
            alert('Failed to update category');
        } finally {
            setUpdating(false);
            setIsEditingCategory(false);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = getFullUrl(asset.url);
        link.download = asset.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        <div className="asset-card group bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col hover:border-primary/50 transition-all">
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

                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
                    {isVideo(asset.type) ? (
                        <span className="material-symbols-outlined text-white text-4xl cursor-pointer">play_circle</span>
                    ) : (
                        <span className="material-symbols-outlined text-white text-4xl cursor-pointer">image</span>
                    )}
                </div>

                <div className="card-hover-actions absolute top-2 right-2 flex gap-1">
                    <button
                        onClick={handleDownload}
                        className="size-8 hover:cursor-pointer rounded-lg bg-white/10 backdrop-blur-md text-white hover:bg-white/20 flex items-center justify-center transition-all"
                        title="Download"
                    >
                        <span className="material-symbols-outlined text-sm">download</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        className="size-8 hover:cursor-pointer rounded-lg bg-rose-500/80 backdrop-blur-md text-white hover:bg-rose-600 flex items-center justify-center transition-all"
                        title="Delete"
                    >
                        <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-1">
                <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold truncate pr-4 flex-1" title={asset.name}>{asset.name}</h4>

                    {/* Category Selector */}
                    {isEditingCategory ? (
                        <select
                            autoFocus
                            onBlur={() => setIsEditingCategory(false)}
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            value={asset.category}
                            className="text-[10px] font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded uppercase"
                        >
                            <option value="uncategorized">None</option>
                            <option value="backgrounds">BG</option>
                            <option value="intros">Intro</option>
                            <option value="endings">End</option>
                            <option value="music">Music</option>
                            <option value="sfx">SFX</option>
                        </select>
                    ) : (
                        <span
                            onClick={() => setIsEditingCategory(true)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase truncate cursor-pointer hover:bg-primary/20 transition-colors"
                            title="Click to change category"
                        >
                            {asset.category}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">database</span> {formatSize(asset.size)}</span>
                </div>
            </div>
        </div>
    );
};
