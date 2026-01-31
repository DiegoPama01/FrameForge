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
    const { globalSearch, assets, refreshAssets, assetCategories, refreshAssetCategories, templates, refreshTemplates } = useProject();
    const [filter, setFilter] = useState('All');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'assets' | 'templates'>('assets');
    const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

    useEffect(() => {
        refreshAssets();
    }, []);

    const categories = useMemo(() => {
        const cleaned = assetCategories.filter((cat) => cat !== 'templates');
        const allCats = new Set(['All', ...cleaned]);
        return Array.from(allCats).sort((a, b) => {
            if (a === 'All') return -1;
            if (b === 'All') return 1;
            return a.localeCompare(b);
        });
    }, [assetCategories]);

    const filteredAssets = useMemo(() => {
        const filterKey = filter.toLowerCase();
        return assets.filter(a => {
            const isTemplateAsset = a.categories?.includes('templates');
            if (isTemplateAsset) return false;
            const matchesFilter = filter === 'All' || (a.categories && a.categories.includes(filterKey));
            const matchesSearch = a.name.toLowerCase().includes(globalSearch.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [assets, filter, globalSearch]);

    const templateAssets = useMemo(() => {
        return templates.map((tpl: any) => {
            const asset = assets.find((a) => a.path === tpl.image_path);
            if (asset) {
                return { ...asset, name: tpl.name, templateId: tpl.id };
            }
            const ext = (tpl.image_path || '').split('.').pop()?.toLowerCase() || 'png';
            return {
                name: tpl.name,
                path: tpl.image_path || `templates/${tpl.id}`,
                categories: ['templates'],
                size: 0,
                type: `.${ext}`,
                url: `/assets_static/${tpl.image_path || ''}`,
                templateId: tpl.id
            };
        });
    }, [templates, assets]);

    const handleCreateFolder = async (name: string) => {
        try {
            const res = await ApiClient.createAssetCategory(name);
            await refreshAssetCategories();
            setFilter(res?.id || name.toLowerCase());
        } catch (error) {
            console.error('Failed to create category', error);
            alert('Failed to create folder');
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/10">
            {/* Folder Navigation Bar */}
            <section className="px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark flex items-center shrink-0 justify-between">
                <div className="flex items-center gap-8 overflow-x-auto custom-scrollbar no-scrollbar">
                    <div className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 p-1">
                        <button
                            onClick={() => setActiveTab('assets')}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-full transition-all ${activeTab === 'assets'
                                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                        >
                            Assets
                        </button>
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-full transition-all ${activeTab === 'templates'
                                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                        >
                            Templates
                        </button>
                    </div>
                    {activeTab === 'assets' && (
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
                    )}
                </div>
                <div className="py-3 flex items-center gap-3">
                    {activeTab === 'templates' ? (
                        <button
                            onClick={() => { setEditingTemplate(null); setIsTemplateModalOpen(true); }}
                            className="btn-outline"
                        >
                            <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
                            <span>New Template</span>
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsFolderModalOpen(true)}
                                className="btn-outline"
                            >
                                <span className="material-symbols-outlined text-[20px]">create_new_folder</span>
                                <span>New Folder</span>
                            </button>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className="btn-primary"
                            >
                                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                                <span>Upload Asset</span>
                            </button>
                        </>
                    )}
                </div>
            </section>

            {/* Main Content Area */}
            <section className="flex-1 overflow-y-auto custom-scrollbar p-10">
                {activeTab === 'assets' && assets.length > 0 && globalSearch && filteredAssets.length === 0 && (
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

                {activeTab === 'assets' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                        {filteredAssets.map((asset) => (
                            <AssetCard
                                key={asset.path}
                                asset={asset}
                                categories={assetCategories}
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
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                        {templateAssets
                            .filter((tpl) => tpl.name.toLowerCase().includes(globalSearch.toLowerCase()))
                            .map((tpl: any) => (
                                <AssetCard
                                    key={tpl.templateId || tpl.path}
                                    asset={tpl}
                                    categories={assetCategories}
                                    onDelete={refreshAssets}
                                    onUpdate={refreshAssets}
                                    variant="template"
                                    onEdit={() => {
                                        const source = templates.find((t: any) => t.id === tpl.templateId);
                                        setEditingTemplate(source || null);
                                        setIsTemplateModalOpen(true);
                                    }}
                                />
                            ))}
                        {templates.length === 0 && (
                            <div className="col-span-full h-60 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                                <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-4xl opacity-30">auto_fix_high</span>
                                </div>
                                <h4 className="text-xl font-black tracking-tight text-slate-400">No Templates</h4>
                                <p className="text-sm font-medium opacity-60">Create a template to start.</p>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <UploadAssetModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={refreshAssets}
                initialCategory={filter === 'All' ? 'uncategorized' : filter}
                categories={assetCategories}
            />

            <CreateFolderModal
                isOpen={isFolderModalOpen}
                onClose={() => setIsFolderModalOpen(false)}
                onCreate={handleCreateFolder}
            />

            <TemplateBuilderModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                onCreated={async () => {
                    await refreshTemplates();
                    await refreshAssets();
                }}
                initialTemplate={editingTemplate}
            />
        </div>
    );
};

type TemplateField = {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    font: string;
    size: number;
    color: string;
    shadow: string;
    align: string;
    preview?: boolean;
    autoFit?: boolean;
    strokeWidth?: number;
    strokeColor?: string;
};

const FONT_OPTIONS = ['DejaVuSans', 'DejaVuSans-Bold', 'Inter', 'Montserrat', 'Poppins', 'Roboto', 'Oswald'];
const ALIGN_OPTIONS = ['left', 'center', 'right'];
const SHADOW_OPTIONS = ['none', 'soft', 'strong'];
const SHADOW_STYLES: Record<string, string> = {
    none: 'none',
    soft: '0 2px 6px rgba(0,0,0,0.35)',
    strong: '0 4px 10px rgba(0,0,0,0.55)'
};
const PRESET_STYLES = [
    {
        id: 'yt-bold',
        label: 'YouTube Bold',
        values: {
            font: 'DejaVuSans-Bold',
            size: 96,
            color: '#ffffff',
            shadow: 'strong',
            align: 'center',
            autoFit: true,
            strokeWidth: 6,
            strokeColor: '#000000'
        }
    },
    {
        id: 'yt-outline',
        label: 'YouTube Outline',
        values: {
            font: 'DejaVuSans-Bold',
            size: 84,
            color: '#ffeb3b',
            shadow: 'strong',
            align: 'center',
            autoFit: true,
            strokeWidth: 6,
            strokeColor: '#000000'
        }
    },
    {
        id: 'reddit-title',
        label: 'Reddit Title',
        values: {
            font: 'DejaVuSans-Bold',
            size: 48,
            color: '#1a1a1b',
            shadow: 'none',
            align: 'left',
            autoFit: true,
            strokeWidth: 0,
            strokeColor: '#000000'
        }
    },
    {
        id: 'reddit-meta',
        label: 'Reddit Meta',
        values: {
            font: 'DejaVuSans',
            size: 28,
            color: '#878a8c',
            shadow: 'none',
            align: 'left',
            autoFit: false,
            strokeWidth: 0,
            strokeColor: '#000000'
        }
    }
];

const TemplateBuilderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    initialTemplate?: any | null;
}> = ({ isOpen, onClose, onCreated, initialTemplate }) => {
    const { assets, templates, refreshTemplates } = useProject();
    const [name, setName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [imagePath, setImagePath] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [fields, setFields] = useState<TemplateField[]>([]);
    const [backendPreviewUrl, setBackendPreviewUrl] = useState('');
    const [drawing, setDrawing] = useState<TemplateField | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
    const [resizingId, setResizingId] = useState<string | null>(null);
    const [resizeAnchor, setResizeAnchor] = useState<{ x: number; y: number } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const [imageAspect, setImageAspect] = useState<number | null>(null);
    const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
    const [showFinalPreview, setShowFinalPreview] = useState(false);
    const [previewAspect, setPreviewAspect] = useState<'image' | '16:9' | '9:16'>('16:9');

    const imageAssets = useMemo(() => {
        return assets.filter((asset) => {
            const type = asset.type?.toLowerCase() || '';
            return ['.png', '.jpg', '.jpeg', '.webp'].includes(type);
        });
    }, [assets]);

    React.useEffect(() => {
        if (!isOpen) return;
        setName('');
        setImagePath('');
        setImageUrl('');
        setFields([]);
        setDrawing(null);
        setDraggingId(null);
        setDragOffset(null);
        setResizingId(null);
        setResizeAnchor(null);
        setEditingId(null);
        setImageAspect(null);
        setImageSize(null);
        setShowFinalPreview(false);
        setPreviewAspect('16:9');
        if (initialTemplate) {
            setEditingId(initialTemplate.id);
            setName(initialTemplate.name || '');
            setImagePath(initialTemplate.image_path || '');
            setImageUrl(initialTemplate.image_path ? `${ApiClient.getBaseUrl()}/assets_static/${initialTemplate.image_path}${ApiClient.getToken() ? `?token=${encodeURIComponent(ApiClient.getToken())}` : ''}` : '');
            setFields((initialTemplate.fields || []).map((f: any) => ({
                ...f,
                preview: f.preview ?? true,
                autoFit: f.autoFit ?? false,
                strokeWidth: f.strokeWidth ?? 0,
                strokeColor: f.strokeColor ?? '#000000'
            })));
        }
    }, [isOpen]);

    const baseUrl = ApiClient.getBaseUrl();
    const token = ApiClient.getToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            const res = await ApiClient.uploadAsset(file, 'templates');
            setImagePath(res.path);
            setImageUrl(`${baseUrl}${res.url}${tokenParam}`);
            setImageAspect(null);
        } finally {
            setUploading(false);
        }
    };

    React.useEffect(() => {
        if (!isOpen || !containerRef.current) return;
        const el = containerRef.current;
        const observer = new ResizeObserver(() => {
            const rect = el.getBoundingClientRect();
            setContainerSize({ width: rect.width, height: rect.height });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [isOpen]);

    const canvasHeight = useMemo(() => {
        if (!containerSize.width) return 380;
        if (previewAspect === '16:9') {
            return Math.min(520, Math.max(300, containerSize.width * (9 / 16)));
        }
        if (previewAspect === '9:16') {
            return Math.min(720, Math.max(360, containerSize.width * (16 / 9)));
        }
        if (!imageAspect) return 380;
        const natural = containerSize.width / imageAspect;
        return Math.min(520, Math.max(300, natural));
    }, [imageAspect, containerSize.width, previewAspect]);

    const getImageTransform = () => {
        if (!imageSize || !containerSize.width || !containerSize.height) {
            return { scale: 1, offsetX: 0, offsetY: 0 };
        }
        const scale = Math.max(containerSize.width / imageSize.width, containerSize.height / imageSize.height);
        const displayW = imageSize.width * scale;
        const displayH = imageSize.height * scale;
        const offsetX = (containerSize.width - displayW) / 2;
        const offsetY = (containerSize.height - displayH) / 2;
        return { scale, offsetX, offsetY };
    };

    const resolveFontStyle = (fontName: string) => {
        const lower = (fontName || '').toLowerCase();
        let family = fontName || 'DejaVuSans';
        let weight = 600;
        if (lower.includes('dejavusans')) {
            family = '"DejaVu Sans", "Inter", sans-serif';
        }
        if (lower.includes('bold')) {
            weight = 800;
        }
        return { fontFamily: family, fontWeight: weight };
    };

    const toImageCoords = (event: React.MouseEvent) => {
        if (!containerRef.current || !imageSize) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const { scale, offsetX, offsetY } = getImageTransform();
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;
        const ix = (cx - offsetX) / scale;
        const iy = (cy - offsetY) / scale;
        const nx = Math.min(1, Math.max(0, ix / imageSize.width));
        const ny = Math.min(1, Math.max(0, iy / imageSize.height));
        return { x: nx, y: ny };
    };

    const toContainerRect = (field: TemplateField) => {
        if (!imageSize || !containerSize.width || !containerSize.height) {
            return { left: 0, top: 0, width: 0, height: 0 };
        }
        const { scale, offsetX, offsetY } = getImageTransform();
        const left = offsetX + (field.x * imageSize.width * scale);
        const top = offsetY + (field.y * imageSize.height * scale);
        const width = field.width * imageSize.width * scale;
        const height = field.height * imageSize.height * scale;
        return { left, top, width, height };
    };

    const handleMouseDown = (event: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
        const { x, y } = toImageCoords(event);
        const id = `field_${fields.length + 1}`;
        setDrawing({
            id,
            name: id,
            x,
            y,
            width: 0,
            height: 0,
            font: 'DejaVuSans',
            size: 36,
            color: '#ffffff',
            shadow: 'soft',
            align: 'left',
            strokeWidth: 0,
            strokeColor: '#000000',
            preview: true
        });
    };

    const handleMouseMove = (event: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width !== containerSize.width || rect.height !== containerSize.height) {
            setContainerSize({ width: rect.width, height: rect.height });
        }
        const { x, y } = toImageCoords(event);
        if (drawing) {
            const width = Math.max(0, x - drawing.x);
            const height = Math.max(0, y - drawing.y);
            setDrawing({ ...drawing, width, height });
            return;
        }
        if (resizingId && resizeAnchor) {
            setFields((prev) =>
                prev.map((field) => {
                    if (field.id !== resizingId) return field;
                    const newWidth = Math.max(0.02, x - resizeAnchor.x);
                    const newHeight = Math.max(0.02, y - resizeAnchor.y);
                    const maxWidth = Math.max(0.02, 1 - resizeAnchor.x);
                    const maxHeight = Math.max(0.02, 1 - resizeAnchor.y);
                    return {
                        ...field,
                        x: resizeAnchor.x,
                        y: resizeAnchor.y,
                        width: Math.min(newWidth, maxWidth),
                        height: Math.min(newHeight, maxHeight)
                    };
                })
            );
            return;
        }
        if (draggingId) {
            setFields((prev) =>
                prev.map((field) => {
                    if (field.id !== draggingId || !dragOffset) return field;
                    const nextX = Math.min(Math.max(0, x - dragOffset.x), 1 - field.width);
                    const nextY = Math.min(Math.max(0, y - dragOffset.y), 1 - field.height);
                    return { ...field, x: nextX, y: nextY };
                })
            );
        }
    };

    const handleMouseUp = () => {
        if (drawing) {
            if (drawing.width > 0.01 && drawing.height > 0.01) {
                setFields((prev) => [...prev, drawing]);
            }
            setDrawing(null);
        }
        setDraggingId(null);
        setDragOffset(null);
        setResizingId(null);
        setResizeAnchor(null);
    };

    const handleFieldMouseDown = (event: React.MouseEvent, field: TemplateField) => {
        event.stopPropagation();
        if (!containerRef.current) return;
        const { x, y } = toImageCoords(event);
        setDraggingId(field.id);
        setDragOffset({ x: x - field.x, y: y - field.y });
    };

    const handleResizeMouseDown = (event: React.MouseEvent, field: TemplateField) => {
        event.stopPropagation();
        setResizingId(field.id);
        setResizeAnchor({ x: field.x, y: field.y });
    };

    const updateField = (id: string, key: keyof TemplateField, value: any) => {
        setFields((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
    };

    const applyPreset = (id: string, presetId: string) => {
        const preset = PRESET_STYLES.find((style) => style.id === presetId);
        if (!preset) return;
        setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...preset.values } : f)));
    };

    const deleteField = (id: string) => {
        setFields((prev) => prev.filter((f) => f.id !== id));
    };

    const handleCreateTemplate = async () => {
        if (!name.trim() || !imagePath) return;
        if (editingId) {
            await ApiClient.updateTemplate(editingId, {
                name: name.trim(),
                image_path: imagePath,
                fields
            });
        } else {
            await ApiClient.createTemplate({
                name: name.trim(),
                image_path: imagePath,
                fields
            });
        }
        await refreshTemplates();
        onCreated();
        onClose();
    };

    React.useEffect(() => {
        let active = true;
        if (!showFinalPreview || !imagePath) {
            if (backendPreviewUrl) {
                URL.revokeObjectURL(backendPreviewUrl);
                setBackendPreviewUrl('');
            }
            return () => {
                active = false;
            };
        }
        const loadPreview = async () => {
            try {
                const fieldValues: Record<string, string> = {};
                fields.forEach((field) => {
                    if (field.id) {
                        fieldValues[field.id] = field.name || 'Sample';
                    }
                });
                const blob = await ApiClient.renderTemplatePreview({
                    template_id: editingId || undefined,
                    image_path: imagePath,
                    fields,
                    field_values: fieldValues,
                    preview_aspect: previewAspect,
                });
                if (!active) return;
                const url = URL.createObjectURL(blob);
                setBackendPreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return url;
                });
            } catch (error) {
                console.error('Failed to load backend preview', error);
            }
        };
        loadPreview();
        return () => {
            active = false;
        };
    }, [showFinalPreview, imagePath, previewAspect, fields, editingId]);

    const handleDownloadPreview = async () => {
        try {
            if (!imagePath) return;
            const fieldValues: Record<string, string> = {};
            fields.forEach((field) => {
                if (field.id) {
                    fieldValues[field.id] = field.name || 'Preview';
                }
            });
            const out = await ApiClient.renderTemplatePreview({
                template_id: editingId || undefined,
                image_path: imagePath,
                fields,
                field_values: fieldValues,
                preview_aspect: previewAspect,
            });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(out);
            link.download = `${name || 'template'}_preview.png`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Failed to generate preview download', error);
        }
    };

    const handleNewTemplate = () => {
        setEditingId(null);
        setName('');
        setImagePath('');
        setImageUrl('');
        if (backendPreviewUrl) {
            URL.revokeObjectURL(backendPreviewUrl);
            setBackendPreviewUrl('');
        }
        setFields([]);
        setDrawing(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
            <div className="w-full max-w-5xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Template Builder</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto">
                    <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    {editingId ? 'Editing Template' : 'New Template'}
                                </div>
                            <div className="flex items-center gap-4">
                                <select
                                    value={previewAspect}
                                    onChange={(event) => setPreviewAspect(event.target.value as 'image' | '16:9' | '9:16')}
                                    className="text-[10px] font-bold uppercase tracking-widest bg-transparent text-slate-400 hover:text-primary"
                                >
                                    <option value="16:9">Preview 16:9</option>
                                    <option value="9:16">Preview 9:16</option>
                                    <option value="image">Preview Image</option>
                                </select>
                                <button
                                    onClick={handleDownloadPreview}
                                    className="text-xs font-bold text-slate-500 hover:text-primary"
                                >
                                    Download Preview
                                </button>
                                <button
                                    onClick={() => setShowFinalPreview((prev) => !prev)}
                                    className="text-xs font-bold text-slate-500 hover:text-primary"
                                >
                                    {showFinalPreview ? 'Edit View' : 'Final Preview'}
                                </button>
                                <button
                                    onClick={handleNewTemplate}
                                    className="text-xs font-bold text-primary hover:underline"
                                >
                                    New Template
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Template Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm font-medium"
                                placeholder="e.g. Reddit Intro"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Template PNG</label>
                            <div className="flex gap-3">
                                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium cursor-pointer">
                                    <span className="material-symbols-outlined text-base">upload</span>
                                    Upload PNG
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleUpload(file);
                                        }}
                                    />
                                </label>
                                <select
                                    value={imagePath}
                                    onChange={(e) => {
                                        const path = e.target.value;
                                        const asset = imageAssets.find((a) => a.path === path);
                                        setImagePath(path);
                                        setImageUrl(asset ? `${baseUrl}${asset.url}${tokenParam}` : '');
                                    }}
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-sm font-medium"
                                >
                                    <option value="">Select existing PNG</option>
                                    {imageAssets.map((asset) => (
                                        <option key={asset.path} value={asset.path}>{asset.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/40">
                            <div
                                ref={containerRef}
                                className={`relative w-full bg-slate-200 dark:bg-slate-800 overflow-hidden ${showFinalPreview ? 'cursor-default' : 'cursor-crosshair'}`}
                                style={{ height: canvasHeight }}
                                onMouseDown={imageUrl && !showFinalPreview ? handleMouseDown : undefined}
                                onMouseMove={imageUrl && !showFinalPreview ? handleMouseMove : undefined}
                                onMouseUp={imageUrl && !showFinalPreview ? handleMouseUp : undefined}
                                onMouseLeave={imageUrl && !showFinalPreview ? handleMouseUp : undefined}
                            >
                                {(imageUrl || backendPreviewUrl) && (
                                    <img
                                        src={showFinalPreview && backendPreviewUrl ? backendPreviewUrl : imageUrl}
                                        alt="template"
                                        className="absolute inset-0 w-full h-full object-cover"
                                        onLoad={(e) => {
                                            if (showFinalPreview && backendPreviewUrl) return;
                                            const target = e.currentTarget;
                                            if (target.naturalWidth && target.naturalHeight) {
                                                setImageAspect(target.naturalWidth / target.naturalHeight);
                                                setImageSize({ width: target.naturalWidth, height: target.naturalHeight });
                                            }
                                        }}
                                    />
                                )}
                                {!(showFinalPreview && backendPreviewUrl) && fields.map((field) => (
                                    (() => {
                                        const rect = toContainerRect(field);
                                        const width = Math.max(0, rect.width);
                                        const height = Math.max(0, rect.height);
                                        const left = (rect.left / (containerSize.width || 1)) * 100;
                                        const top = (rect.top / (containerSize.height || 1)) * 100;
                                        const widthPct = (width / (containerSize.width || 1)) * 100;
                                        const heightPct = (height / (containerSize.height || 1)) * 100;
                                        const { scale } = getImageTransform();
                                        const fontPx = field.autoFit
                                            ? Math.max(10, Math.min(Math.round(field.size * scale), height * 0.6, width * 0.12))
                                            : Math.max(10, Math.round(field.size * scale));
                                        const { fontFamily, fontWeight } = resolveFontStyle(field.font);
                                        const strokeWidth = field.strokeWidth || 0;
                                        const strokeColor = field.strokeColor || '#000000';
                                        return (
                                            <div
                                                key={field.id}
                                                className={`absolute ${showFinalPreview ? '' : 'border-2 border-primary/70 bg-primary/10 text-[10px] text-primary font-bold cursor-move'}`}
                                                onMouseDown={(event) => {
                                                    if (!showFinalPreview) handleFieldMouseDown(event, field);
                                                }}
                                                style={{
                                                    left: `${left}%`,
                                                    top: `${top}%`,
                                                    width: `${widthPct}%`,
                                                    height: `${heightPct}%`
                                                }}
                                            >
                                                {!showFinalPreview && (
                                                    <div
                                                        onMouseDown={(event) => handleResizeMouseDown(event, field)}
                                                        className="absolute -right-1 -bottom-1 size-3 rounded-sm bg-primary border border-white cursor-se-resize"
                                                    ></div>
                                                )}
                                                {!showFinalPreview && <span className="absolute -top-5 left-0">{field.name}</span>}
                                                {(field.preview || showFinalPreview) && (
                                                    <div
                                                        className="absolute inset-0 p-1 text-white"
                                                        style={{
                                                            fontFamily,
                                                            fontWeight,
                                                            fontSize: `${fontPx}px`,
                                                            color: field.color,
                                                            textAlign: field.align as 'left' | 'center' | 'right',
                                                            textShadow: SHADOW_STYLES[field.shadow] || 'none',
                                                            WebkitTextStroke: strokeWidth > 0 ? `${strokeWidth}px ${strokeColor}` : undefined,
                                                            textRendering: 'geometricPrecision',
                                                            WebkitFontSmoothing: 'antialiased',
                                                            lineHeight: 1.1,
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        {showFinalPreview ? (field.name || 'Sample') : 'Lorem ipsum'}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()
                                ))}
                                {drawing && (
                                    (() => {
                                        const rect = toContainerRect(drawing);
                                        const left = (rect.left / (containerSize.width || 1)) * 100;
                                        const top = (rect.top / (containerSize.height || 1)) * 100;
                                        const width = (rect.width / (containerSize.width || 1)) * 100;
                                        const height = (rect.height / (containerSize.height || 1)) * 100;
                                        return (
                                    <div
                                        className="absolute border-2 border-primary/70 bg-primary/10"
                                        style={{
                                            left: `${left}%`,
                                            top: `${top}%`,
                                            width: `${width}%`,
                                            height: `${height}%`
                                        }}
                                    />
                                        );
                                    })()
                                )}
                            </div>
                            {!imageUrl && (
                                <p className="text-xs text-slate-500 mt-2">Upload or select a PNG to draw text fields.</p>
                            )}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Fields</h4>
                        {fields.length === 0 && (
                            <p className="text-xs text-slate-500">Draw a rectangle on the image to add a field.</p>
                        )}
                        <div className="space-y-4 max-h-[520px] overflow-auto custom-scrollbar pr-2">
                            {fields.map((field) => (
                                <div key={field.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <input
                                            value={field.name}
                                            onChange={(e) => updateField(field.id, 'name', e.target.value)}
                                            className="text-xs font-bold bg-transparent text-slate-700 dark:text-slate-200 w-full"
                                        />
                                        <button onClick={() => deleteField(field.id)} className="text-slate-400 hover:text-rose-500">
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                const presetId = e.target.value;
                                                if (presetId) {
                                                    applyPreset(field.id, presetId);
                                                }
                                            }}
                                            className="input-field"
                                        >
                                            <option value="">Apply style preset</option>
                                            {PRESET_STYLES.map((preset) => (
                                                <option key={preset.id} value={preset.id}>{preset.label}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={field.font}
                                            onChange={(e) => updateField(field.id, 'font', e.target.value)}
                                            className="input-field"
                                        >
                                            {FONT_OPTIONS.map((font) => (
                                                <option key={font} value={font}>{font}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={field.size}
                                            onChange={(e) => updateField(field.id, 'size', Number(e.target.value))}
                                            className="input-field"
                                            min={8}
                                            max={160}
                                        />
                                        <select
                                            value={field.shadow}
                                            onChange={(e) => updateField(field.id, 'shadow', e.target.value)}
                                            className="input-field"
                                        >
                                            {SHADOW_OPTIONS.map((shadow) => (
                                                <option key={shadow} value={shadow}>{shadow}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={field.align}
                                            onChange={(e) => updateField(field.id, 'align', e.target.value)}
                                            className="input-field"
                                        >
                                            {ALIGN_OPTIONS.map((align) => (
                                                <option key={align} value={align}>{align}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="color"
                                            value={field.color}
                                            onChange={(e) => updateField(field.id, 'color', e.target.value)}
                                            className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800"
                                        />
                                    </div>
                                    <details className="group">
                                        <summary className="text-xs font-bold text-slate-500 cursor-pointer select-none list-none flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] transition-transform group-open:rotate-90">chevron_right</span>
                                            Advanced
                                        </summary>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <input
                                                type="number"
                                                value={field.strokeWidth ?? 0}
                                                onChange={(e) => updateField(field.id, 'strokeWidth', Number(e.target.value))}
                                                className="input-field"
                                                min={0}
                                                max={12}
                                                placeholder="Stroke"
                                            />
                                            <input
                                                type="color"
                                                value={field.strokeColor ?? '#000000'}
                                                onChange={(e) => updateField(field.id, 'strokeColor', e.target.value)}
                                                className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800"
                                            />
                                            <label className="col-span-2 flex items-center gap-2 text-xs text-slate-500">
                                                <input
                                                    type="checkbox"
                                                    checked={field.preview ?? true}
                                                    onChange={(e) => updateField(field.id, 'preview', e.target.checked)}
                                                    className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                />
                                                Preview text
                                            </label>
                                            <label className="col-span-2 flex items-center gap-2 text-xs text-slate-500">
                                                <input
                                                    type="checkbox"
                                                    checked={(field as any).autoFit ?? false}
                                                    onChange={(e) => updateField(field.id, 'autoFit' as any, e.target.checked)}
                                                    className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                />
                                                Auto-fit text
                                            </label>
                                            <div className="col-span-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                                                <div>X: {(field.x * 100).toFixed(1)}%</div>
                                                <div>Y: {(field.y * 100).toFixed(1)}%</div>
                                                <div>W: {(field.width * 100).toFixed(1)}%</div>
                                                <div>H: {(field.height * 100).toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleCreateTemplate}
                            disabled={!name.trim() || !imagePath || uploading}
                            className="w-full mt-2 btn-primary"
                        >
                            {editingId ? 'Save Changes' : 'Save Template'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
