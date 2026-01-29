"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { AssetCard } from './AssetCard';
import { UploadAssetModal } from './UploadAssetModal';
import { CreateFolderModal } from './CreateFolderModal';
import { ApiClient } from '../../infrastructure/api/api.client';
import { useProject } from '../context/ProjectContext';

interface Asset {
    name: string;
    path: string;
    categories: string[];
    size: number;
    created_at: string;
    type: string;
    url: string;
}

export const AssetsView: React.FC = () => {
    const { globalSearch, assets, refreshAssets, assetCategories } = useProject();
    const [filter, setFilter] = useState('All');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [customFolders, setCustomFolders] = useState<string[]>([]);

    useEffect(() => {
        refreshAssets();
        // Load custom folders from local storage
        const saved = localStorage.getItem('custom_asset_folders');
        if (saved) setCustomFolders(JSON.parse(saved));
    }, []);

    const categories = useMemo(() => {
        const allCats = new Set(['All', ...assetCategories, ...customFolders]);
        return Array.from(allCats).sort((a, b) => {
            if (a === 'All') return -1;
            if (b === 'All') return 1;
            return a.localeCompare(b);
        });
    }, [assetCategories, customFolders]);

    const filteredAssets = useMemo(() => {
        return assets.filter(a => {
            const matchesFilter = filter === 'All' || (a.categories && a.categories.includes(filter.toLowerCase()));
            const matchesSearch = a.name.toLowerCase().includes(globalSearch.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [assets, filter, globalSearch]);

    const handleCreateFolder = (name: string) => {
        const newList = [...customFolders, name];
        setCustomFolders(newList);
        localStorage.setItem('custom_asset_folders', JSON.stringify(newList));
        setFilter(name);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/10">
            {/* Folder Navigation Bar */}
            <section className="px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex items-center shrink-0 justify-between">
                <nav className="flex gap-8 overflow-x-auto custom-scrollbar no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`py-5 border-b-2 text-xs hover:cursor-pointer font-black uppercase tracking-widest transition-all ${filter === cat ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </nav>
                <div className="py-3 flex items-center gap-3">
                    <button
                        onClick={() => setIsFolderModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[20px]">create_new_folder</span>
                        <span>New Folder</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl text-xs font-black transition-all shadow-lg shadow-primary/20 cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[20px]">upload_file</span>
                        <span>Upload Asset</span>
                    </button>
                </div>
            </section>

            {/* Main Content Area */}
            <section className="flex-1 overflow-y-auto custom-scrollbar p-10">
                {assets.length > 0 && globalSearch && filteredAssets.length === 0 && (
                    <div className="mb-10 p-6 bg-primary/5 rounded-3xl border border-primary/10 flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">search_off</span>
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-800 dark:text-slate-100">No assets found</p>
                            <p className="text-xs text-slate-500 font-medium">Nothing matches your search <span className="text-primary font-bold">"{globalSearch}"</span> in this folder.</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                    {filteredAssets.map((asset) => (
                        <AssetCard
                            key={asset.path}
                            asset={asset}
                            onDelete={refreshAssets}
                            onUpdate={refreshAssets}
                        />
                    ))}

                    {filteredAssets.length === 0 && !globalSearch && (
                        <div className="col-span-full h-80 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                            <div className="size-24 rounded-full bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-5xl opacity-30">folder_open</span>
                            </div>
                            <h4 className="text-xl font-black tracking-tight text-slate-400">Empty Folder</h4>
                            <p className="text-sm font-medium opacity-60">Upload files here to use them in your generators.</p>
                        </div>
                    )}
                </div>
            </section>

            <UploadAssetModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={refreshAssets}
                initialCategory={filter === 'All' ? 'uncategorized' : filter}
            />

            <CreateFolderModal
                isOpen={isFolderModalOpen}
                onClose={() => setIsFolderModalOpen(false)}
                onCreate={handleCreateFolder}
            />
        </div>
    );
};
