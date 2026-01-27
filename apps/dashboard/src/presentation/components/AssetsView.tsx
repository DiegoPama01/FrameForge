"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { AssetCard } from './AssetCard';
import { UploadAssetModal } from './UploadAssetModal';
import { ApiClient } from '../../infrastructure/api/api.client';
import { useProject } from '../context/ProjectContext';

interface Asset {
    name: string;
    path: string;
    category: string;
    size: number;
    created_at: string;
    type: string;
    url: string;
}

export const AssetsView: React.FC = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [filter, setFilter] = useState('All');
    const { globalSearch } = useProject();
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const refreshAssets = async () => {
        try {
            const data = await ApiClient.getAssets();
            setAssets(data);
        } catch (error) {
            console.error('Failed to load assets', error);
        }
    };

    useEffect(() => {
        refreshAssets();
    }, []);

    const categories = useMemo(() => {
        const cats = new Set(assets.map(a => a.category));
        return ['All', ...Array.from(cats)].sort();
    }, [assets]);

    const filteredAssets = useMemo(() => {
        return assets.filter(a => {
            const matchesFilter = filter === 'All' || a.category.toLowerCase() === filter.toLowerCase();
            const matchesSearch = a.name.toLowerCase().includes(globalSearch.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [assets, filter, globalSearch]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/30">
            {/* Filter Bar */}
            <section className="px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex items-center shrink-0 justify-between">
                <nav className="flex gap-8 overflow-x-auto">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`py-4 border-b-2 text-sm hover:cursor-pointer font-medium transition-colors ${filter === cat ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                    ))}
                </nav>
                <div className="py-2 flex items-center gap-3">
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20 cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[18px]">upload</span>
                        <span>Upload New Asset</span>
                    </button>
                </div>
            </section>

            {/* Grid */}
            <section className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {assets.length > 0 && globalSearch && filteredAssets.length === 0 && (
                    <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center gap-3 animate-in slide-in-from-top-2">
                        <span className="material-symbols-outlined text-primary">search_off</span>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            No assets matching <span className="font-bold text-primary">"{globalSearch}"</span> in the current folder.
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {filteredAssets.map((asset) => (
                        <AssetCard
                            key={asset.path}
                            asset={asset}
                            onDelete={refreshAssets}
                            onUpdate={refreshAssets}
                        />
                    ))}
                    {filteredAssets.length === 0 && !globalSearch && (
                        <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">folder_open</span>
                            <p>No assets found</p>
                        </div>
                    )}
                </div>
            </section>

            <UploadAssetModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={refreshAssets}
            />
        </div>
    );
};
