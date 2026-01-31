"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import { ApiClient } from '../../../infrastructure/api/api.client';
import { useProject } from '../../../presentation/context/ProjectContext';

type ProjectResponse = {
    project_id: string;
    meta?: {
        title?: string;
        output_format?: string;
        asset_folder?: string;
        thumbnail?: string;
        aspect_ratio?: 'horizontal' | 'vertical';
        output_resolution?: string;
        bgm_enabled?: boolean;
        bgm_volume?: number;
        status?: string;
        currentStage?: string;
        intro_config?: IntroOutroConfig;
        outro_config?: IntroOutroConfig;
        [key: string]: any;
    };
};

const OUTPUT_FORMATS = [
    { label: 'MP4 1080p (Vertical)', value: 'mp4', aspect: 'vertical' },
    { label: 'MP4 4K (Vertical)', value: '4k_vertical', aspect: 'vertical' },
    { label: 'MP4 1080p (Horizontal)', value: 'mp4_horizontal', aspect: 'horizontal' },
    { label: 'MP4 4K (Horizontal)', value: '4k_horizontal', aspect: 'horizontal' }
] as const;

const RESOLUTION_OPTIONS = [
    { label: '1080p Full HD (60fps)', value: '1080p_60' },
    { label: '4K Ultra HD (30fps)', value: '4k_30' },
    { label: '720p Standard', value: '720p' }
];

export default function ResultsPage() {
    const params = useParams();
    const projectId = Array.isArray(params.id) ? params.id[0] : params.id;
    const { runNextStage, assetCategories, assets, templates, refreshAssets } = useProject();
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [title, setTitle] = React.useState('Project');
    const [outputFormat, setOutputFormat] = React.useState('mp4');
    const [background, setBackground] = React.useState('backgrounds');
    const [backgroundMode, setBackgroundMode] = React.useState<'category' | 'single'>('category');
    const [backgroundVideo, setBackgroundVideo] = React.useState('');
    const [segmentMinutes, setSegmentMinutes] = React.useState(2);
    const [selectionStrategy, setSelectionStrategy] = React.useState<'random' | 'sequential'>('random');
    const [transitionType, setTransitionType] = React.useState<'cut' | 'dissolve' | 'blur_fade'>('dissolve');
    const [thumbnail, setThumbnail] = React.useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = React.useState<'horizontal' | 'vertical'>('horizontal');
    const [resolution, setResolution] = React.useState('4k_30');
    const [bgmEnabled, setBgmEnabled] = React.useState(true);
    const [bgmVolume, setBgmVolume] = React.useState(75);
    const [status, setStatus] = React.useState<string | undefined>(undefined);
    const [currentStage, setCurrentStage] = React.useState<string | undefined>(undefined);
    const [isResolutionOpen, setIsResolutionOpen] = React.useState(false);
    const [isIntroOpen, setIsIntroOpen] = React.useState(false);
    const [isOutroOpen, setIsOutroOpen] = React.useState(false);
    const [projectMeta, setProjectMeta] = React.useState<Record<string, any>>({});
    const [introPreviewNonce, setIntroPreviewNonce] = React.useState(0);
    const [outroPreviewNonce, setOutroPreviewNonce] = React.useState(0);
    const assetsLoadedRef = React.useRef(false);
    const [introConfig, setIntroConfig] = React.useState<IntroOutroConfig>({
        mode: 'compose',
        video: '',
        text: '',
        voice: 'same',
        templateId: '',
        templateFields: {},
        previewAspect: '16:9'
    });
    const [outroConfig, setOutroConfig] = React.useState<IntroOutroConfig>({
        mode: 'compose',
        video: '',
        text: '',
        voice: 'same',
        templateId: '',
        templateFields: {},
        previewAspect: '16:9'
    });

    const videoAssets = React.useMemo(() => {
        return assets.filter((asset) => {
            const type = asset.type?.toLowerCase() || '';
            return ['.mp4', '.mov', '.mkv', '.webm', '.avi'].includes(type);
        });
    }, [assets]);

    const videoCategoryOptions = React.useMemo(() => {
        const categories = assetCategories.filter((cat) =>
            videoAssets.some((asset) => asset.categories?.includes(cat))
        );
        return categories.length > 0 ? categories : assetCategories;
    }, [assetCategories, videoAssets]);

    const imageAssets = React.useMemo(() => {
        return assets.filter((asset) => {
            const type = asset.type?.toLowerCase() || '';
            return ['.png', '.jpg', '.jpeg', '.webp'].includes(type);
        });
    }, [assets]);

    React.useEffect(() => {
        if (assetCategories.length === 0) return;
        if (!assetCategories.includes(background)) {
            setBackground(assetCategories[0]);
        }
    }, [assetCategories, background]);

    React.useEffect(() => {
        if (!projectId) return;
        let isMounted = true;
        setLoading(true);
        ApiClient.get<ProjectResponse>(`/projects/${projectId}`)
            .then((data) => {
                if (!isMounted) return;
                setTitle(data.meta?.title || data.project_id);
                setOutputFormat(data.meta?.output_format || 'mp4');
                setBackground(data.meta?.asset_folder || 'backgrounds');
                setBackgroundMode(data.meta?.background_mode || 'category');
                setBackgroundVideo(data.meta?.background_video || '');
                setSegmentMinutes(data.meta?.background_segment_minutes ?? 2);
                setSelectionStrategy(data.meta?.background_strategy || 'random');
                setTransitionType(data.meta?.background_transition || 'dissolve');
                setThumbnail(data.meta?.thumbnail || null);
                setAspectRatio(data.meta?.aspect_ratio || 'horizontal');
                setResolution(data.meta?.output_resolution || '4k_30');
                setBgmEnabled(data.meta?.bgm_enabled ?? true);
                setBgmVolume(data.meta?.bgm_volume ?? 75);
                setStatus(data.meta?.status);
                setCurrentStage(data.meta?.currentStage);
                setProjectMeta(data.meta || {});
                if (data.meta?.intro_config) {
                    setIntroConfig(data.meta.intro_config);
                }
                if (data.meta?.outro_config) {
                    setOutroConfig(data.meta.outro_config);
                }
            })
            .catch(() => {
                if (!isMounted) return;
                setTitle('Project');
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, [projectId]);

    React.useEffect(() => {
        if (assetsLoadedRef.current) return;
        assetsLoadedRef.current = true;
        refreshAssets();
    }, [refreshAssets]);

    const baseUrl = ApiClient.getBaseUrl();
    const token = ApiClient.getToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    const assetThumbnail = thumbnail ? imageAssets.find((asset) => asset.path === thumbnail) : undefined;
    const thumbnailUrl = thumbnail
        ? assetThumbnail
            ? `${baseUrl}${assetThumbnail.url}`
            : projectId
                ? `${baseUrl}/projects/${projectId}/files/content?path=${encodeURIComponent(thumbnail)}${tokenParam}`
                : null
        : null;

    const introPreviewPath = 'video/parts/intro_preview.png';
    const outroPreviewPath = 'video/parts/outro_preview.png';
    const introPreviewUrl = projectId
        ? `${baseUrl}/projects/${projectId}/files/content?path=${encodeURIComponent(introPreviewPath)}${tokenParam}&v=${introPreviewNonce}`
        : null;
    const outroPreviewUrl = projectId
        ? `${baseUrl}/projects/${projectId}/files/content?path=${encodeURIComponent(outroPreviewPath)}${tokenParam}&v=${outroPreviewNonce}`
        : null;

    const finalVideoPath = projectMeta?.final_video ? `video/${projectMeta.final_video}` : null;
    const finalVideoUrl = finalVideoPath && projectId
        ? `${baseUrl}/projects/${projectId}/files/content?path=${encodeURIComponent(finalVideoPath)}${tokenParam}`
        : null;

    const outputFormats = React.useMemo(() => {
        return OUTPUT_FORMATS.filter((format) => format.aspect === aspectRatio);
    }, [aspectRatio]);

    React.useEffect(() => {
        if (!outputFormats.find((format) => format.value === outputFormat)) {
            setOutputFormat(outputFormats[0]?.value || 'mp4');
        }
    }, [outputFormats, outputFormat]);

    const introReady = Boolean(introConfig.video || introConfig.text || introConfig.templateId);
    const outroReady = Boolean(outroConfig.video || outroConfig.text || outroConfig.templateId);

    const handleSaveDraft = async () => {
        if (!projectId) return;
        try {
            setSaving(true);
            await ApiClient.patch(`/projects/${projectId}/meta`, {
                output_format: outputFormat,
                asset_folder: background,
                background_mode: backgroundMode,
                background_video: backgroundMode === 'single' ? backgroundVideo : '',
                background_segment_minutes: backgroundMode === 'category' ? segmentMinutes : null,
                background_strategy: backgroundMode === 'category' ? selectionStrategy : null,
                background_transition: transitionType,
                aspect_ratio: aspectRatio,
                output_resolution: resolution,
                bgm_enabled: bgmEnabled,
                bgm_volume: bgmVolume,
                thumbnail: thumbnail || null
            });
        } catch (error) {
            alert('Error saving draft');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = async () => {
        if (!projectId) return;
        try {
            setSaving(true);
            await ApiClient.patch(`/projects/${projectId}/meta`, {
                output_format: outputFormat,
                asset_folder: background,
                background_mode: backgroundMode,
                background_video: backgroundMode === 'single' ? backgroundVideo : '',
                background_segment_minutes: backgroundMode === 'category' ? segmentMinutes : null,
                background_strategy: backgroundMode === 'category' ? selectionStrategy : null,
                background_transition: transitionType,
                aspect_ratio: aspectRatio,
                output_resolution: resolution,
                bgm_enabled: bgmEnabled,
                bgm_volume: bgmVolume,
                thumbnail: thumbnail || null
            });
            await ApiClient.exportFinal(projectId);
        } catch (error) {
            alert('Error generating video');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="flex-1 overflow-auto bg-slate-50 dark:bg-background-dark/50">
            <div className="flex flex-wrap justify-between items-end gap-3 p-8">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                            {status || 'In Review'}
                        </span>
                        <span className="text-slate-400 text-xs font-mono">UID: {projectId || '---'}</span>
                    </div>
                    <h1 className="text-slate-900 dark:text-white text-3xl font-black leading-tight tracking-tight">
                        Final Assembly - {loading ? 'Loading...' : title}
                    </h1>
                    <p className="text-slate-500 dark:text-[#9dabb9] text-base font-normal">
                        Combine intro, main content, and outro for final rendering
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSaveDraft}
                        disabled={saving || loading}
                        className="flex items-center justify-center rounded-lg h-10 px-6 bg-slate-200 dark:bg-[#283039] text-slate-700 dark:text-white text-sm font-bold tracking-tight hover:bg-slate-300 dark:hover:bg-[#343e4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Draft
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={saving || loading}
                        className="flex items-center justify-center rounded-lg h-10 px-6 bg-primary text-white text-sm font-bold tracking-tight hover:bg-blue-600 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-sm mr-2">rocket_launch</span>
                        Start Final Export
                    </button>
                    {finalVideoUrl && (
                        <button
                            onClick={handleGenerate}
                            disabled={saving || loading}
                            className="flex items-center justify-center rounded-lg h-10 px-6 bg-slate-900 text-white text-sm font-bold tracking-tight hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Regenerate final export"
                        >
                            <span className="material-symbols-outlined text-sm mr-2">refresh</span>
                            Rebuild Export
                        </button>
                    )}
                </div>
            </div>

            <div className="px-8 pb-12 grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-[#283039] rounded-xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#283039] flex items-center justify-between">
                            <h2 className="text-slate-900 dark:text-white text-lg font-bold">Sequence Builder</h2>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="material-symbols-outlined text-sm">schedule</span>
                                {currentStage ? `${currentStage} Ready` : 'Awaiting build'}
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="flex items-center justify-between relative">
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 dark:bg-[#283039] -translate-y-1/2 z-0"></div>
                                <div className="relative z-10 flex flex-col items-center gap-4 w-1/3">
                                    <div
                                        onClick={() => setIsIntroOpen(true)}
                                        className={`w-full aspect-video rounded-lg border-2 ${introReady
                                            ? 'border-primary/60 bg-slate-900/10'
                                            : 'border-dashed border-slate-300 dark:border-[#3b4754] bg-slate-50 dark:bg-background-dark/40'
                                            } flex items-center justify-center group cursor-pointer hover:border-primary transition-all overflow-hidden relative`}
                                    >
                                        {introReady ? (
                                            <>
                                                <img
                                                    src={introPreviewUrl || ''}
                                                    alt="Intro preview"
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                    onError={(e) => {
                                                        const el = e.currentTarget;
                                                        el.style.display = 'none';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                                                <div className="relative z-10 flex items-center gap-2 text-white text-xs font-bold px-2 py-1 rounded bg-black/40">
                                                    <span className="material-symbols-outlined text-[16px]">image</span>
                                                    Intro preview
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="size-10 rounded-full bg-slate-200 dark:bg-[#283039] text-slate-500 dark:text-slate-400 flex items-center justify-center group-hover:bg-primary group-hover:text-white">
                                                    <span className="material-symbols-outlined">add</span>
                                                </div>
                                                <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Add Intro</p>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-slate-900 dark:text-white text-sm font-bold">Branding Intro</p>
                                        <p className="text-slate-500 text-xs">Optional</p>
                                    </div>
                                </div>
                                <div className="relative z-10 flex flex-col items-center gap-4 w-1/3 px-4">
                                    <div
                                        className="w-full aspect-video rounded-lg border-2 border-primary bg-slate-800 relative overflow-hidden group shadow-xl"
                                        style={thumbnailUrl ? { backgroundImage: `url('${thumbnailUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                                    >
                                        {!thumbnailUrl ? (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        ) : null}
                                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-primary text-[10px] font-bold text-white rounded uppercase">Locked</div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                            <button className="px-3 py-1 bg-white text-black text-xs font-bold rounded">Change Render</button>
                                        </div>
                                        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-white text-xs">play_circle</span>
                                            <span className="text-[10px] font-mono text-white">{loading ? '--:--' : '03:45'}</span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-slate-900 dark:text-white text-sm font-bold">Project Render</p>
                                        <p className="text-primary text-xs font-medium">Main Sequence</p>
                                    </div>
                                </div>
                                <div className="relative z-10 flex flex-col items-center gap-4 w-1/3">
                                    <div
                                        onClick={() => setIsOutroOpen(true)}
                                        className={`w-full aspect-video rounded-lg border-2 ${outroReady
                                            ? 'border-primary/60 bg-slate-900/10'
                                            : 'border-dashed border-slate-300 dark:border-[#3b4754] bg-slate-50 dark:bg-background-dark/40'
                                            } flex items-center justify-center group cursor-pointer hover:border-primary transition-all overflow-hidden relative`}
                                    >
                                        {outroReady ? (
                                            <>
                                                <img
                                                    src={outroPreviewUrl || ''}
                                                    alt="Outro preview"
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                    onError={(e) => {
                                                        const el = e.currentTarget;
                                                        el.style.display = 'none';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                                                <div className="relative z-10 flex items-center gap-2 text-white text-xs font-bold px-2 py-1 rounded bg-black/40">
                                                    <span className="material-symbols-outlined text-[16px]">image</span>
                                                    Outro preview
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="size-10 rounded-full bg-slate-200 dark:bg-[#283039] text-slate-500 dark:text-slate-400 flex items-center justify-center group-hover:bg-primary group-hover:text-white">
                                                    <span className="material-symbols-outlined">add</span>
                                                </div>
                                                <p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Add Outro</p>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-slate-900 dark:text-white text-sm font-bold">Call to Action</p>
                                        <p className="text-slate-500 text-xs">Optional</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-[#283039] rounded-xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#283039]">
                            <h2 className="text-slate-900 dark:text-white text-lg font-bold">Thumbnail</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-start">
                            <div className="aspect-video rounded-lg border border-slate-200 dark:border-[#283039] overflow-hidden bg-slate-100 dark:bg-[#283039] flex items-center justify-center">
                                {thumbnailUrl ? (
                                    <img
                                        src={thumbnailUrl}
                                        alt="Project thumbnail"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                                        <span className="material-symbols-outlined text-3xl">image</span>
                                        No thumbnail selected
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Thumbnail Path</label>
                                    <input
                                        value={thumbnail || ''}
                                        onChange={(event) => setThumbnail(event.target.value || null)}
                                        className="w-full bg-slate-100 dark:bg-[#283039] border-none rounded-lg px-3 py-2 text-sm font-medium"
                                        placeholder="thumbnail.png"
                                    />
                                    <p className="text-[10px] text-slate-400">
                                        Use a file path relative to the project folder (e.g. <span className="font-mono">thumbnail.png</span>).
                                    </p>
                                </div>
                                {imageAssets.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick Pick (Assets)</label>
                                        <select
                                            value=""
                                            onChange={(event) => {
                                                const next = event.target.value;
                                                if (!next) return;
                                                setThumbnail(next);
                                            }}
                                            className="w-full bg-slate-100 dark:bg-[#283039] border-none rounded-lg px-3 py-2 text-sm font-medium"
                                        >
                                            <option value="">Select image asset</option>
                                            {imageAssets.map((asset) => (
                                                <option key={asset.path} value={asset.path}>{asset.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <button
                                    onClick={() => setThumbnail(null)}
                                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    Clear thumbnail
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-background-dark border border-slate-200 dark:border-[#283039] rounded-xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#283039]">
                            <h2 className="text-slate-900 dark:text-white text-lg font-bold">Composition Settings</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="space-y-3">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Aspect Ratio</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setAspectRatio('horizontal')}
                                        className={`flex-1 border-2 p-3 rounded-lg flex flex-col items-center gap-2 ${aspectRatio === 'horizontal'
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-slate-200 dark:border-[#283039] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined">rectangle</span>
                                        <span className="text-xs font-bold">Horizontal (16:9)</span>
                                    </button>
                                    <button
                                        onClick={() => setAspectRatio('vertical')}
                                        className={`flex-1 border-2 p-3 rounded-lg flex flex-col items-center gap-2 ${aspectRatio === 'vertical'
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-slate-200 dark:border-[#283039] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined rotate-90">rectangle</span>
                                        <span className="text-xs font-bold">Vertical (9:16)</span>
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Output Resolution</p>
                                <div className="relative">
                                    <button
                                        onClick={() => setIsResolutionOpen((prev) => !prev)}
                                        className="w-full flex items-center justify-between gap-2 bg-slate-100 dark:bg-[#283039] rounded-lg px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:cursor-pointer"
                                    >
                                        <span>{RESOLUTION_OPTIONS.find((opt) => opt.value === resolution)?.label ?? 'Select'}</span>
                                        <span className="material-symbols-outlined text-lg text-slate-500">expand_more</span>
                                    </button>
                                    {isResolutionOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsResolutionOpen(false)}></div>
                                            <div className="absolute z-20 mt-2 min-w-[220px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                                                {RESOLUTION_OPTIONS.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => {
                                                            setResolution(option.value);
                                                            setIsResolutionOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2 text-sm transition-colors hover:cursor-pointer ${resolution === option.value
                                                            ? 'text-primary font-bold bg-primary/10'
                                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                            }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400">Est. file size: 1.2 GB</p>
                            </div>
                            <div className="space-y-3">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Output Format</p>
                                <div className="space-y-2">
                                    {outputFormats.map((format) => (
                                        <button
                                            key={format.value}
                                            onClick={() => setOutputFormat(format.value)}
                                            className={`w-full border rounded-lg px-3 py-2 text-xs font-bold text-left transition-all ${outputFormat === format.value
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-slate-200 dark:border-[#283039] text-slate-500 dark:text-slate-400 hover:border-primary/50'
                                                }`}
                                        >
                                            {format.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Background Music</p>
                                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-[#283039] rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-slate-400">music_note</span>
                                        <span className="text-sm font-medium">Auto-mix BGM</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            checked={bgmEnabled}
                                            onChange={(event) => setBgmEnabled(event.target.checked)}
                                            className="sr-only peer"
                                            type="checkbox"
                                        />
                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                                <div className="px-1">
                                    <input
                                        value={bgmVolume}
                                        onChange={(event) => setBgmVolume(Number(event.target.value))}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                        type="range"
                                        min={0}
                                        max={100}
                                    />
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] text-slate-500">Volume</span>
                                        <span className="text-[10px] text-slate-500">{bgmVolume}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 pb-6 border-t border-slate-200 dark:border-[#283039]">
                            <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Background Source</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setBackgroundMode('category')}
                                            className={`flex-1 border rounded-lg px-3 py-2 text-xs font-bold transition-all ${backgroundMode === 'category'
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-slate-200 dark:border-[#283039] text-slate-500 dark:text-slate-400 hover:border-primary/50'
                                                }`}
                                        >
                                            Category
                                        </button>
                                        <button
                                            onClick={() => setBackgroundMode('single')}
                                            className={`flex-1 border rounded-lg px-3 py-2 text-xs font-bold transition-all ${backgroundMode === 'single'
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-slate-200 dark:border-[#283039] text-slate-500 dark:text-slate-400 hover:border-primary/50'
                                                }`}
                                        >
                                            Single Video
                                        </button>
                                    </div>
                                    {backgroundMode === 'category' ? (
                                        <div className="space-y-2">
                                            <select
                                                value={background}
                                                onChange={(event) => setBackground(event.target.value)}
                                                className="w-full bg-slate-100 dark:bg-[#283039] border-none rounded-lg text-sm font-medium px-3 py-2"
                                            >
                                                {videoCategoryOptions.map((cat) => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Segment Minutes</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={30}
                                                        value={segmentMinutes}
                                                        onChange={(event) => setSegmentMinutes(Math.max(1, Number(event.target.value) || 1))}
                                                        className="w-full bg-slate-100 dark:bg-[#283039] border-none rounded-lg text-sm font-medium px-3 py-2"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selection</label>
                                                    <select
                                                        value={selectionStrategy}
                                                        onChange={(event) => setSelectionStrategy(event.target.value as 'random' | 'sequential')}
                                                        className="w-full bg-slate-100 dark:bg-[#283039] border-none rounded-lg text-sm font-medium px-3 py-2"
                                                    >
                                                        <option value="random">Random</option>
                                                        <option value="sequential">Sequential</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <select
                                                value={backgroundVideo}
                                                onChange={(event) => setBackgroundVideo(event.target.value)}
                                                className="w-full bg-slate-100 dark:bg-[#283039] border-none rounded-lg text-sm font-medium px-3 py-2"
                                            >
                                                <option value="">Select video asset</option>
                                                {videoAssets.map((asset) => (
                                                    <option key={asset.path} value={asset.path}>{asset.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Transition</p>
                                    <select
                                        value={transitionType}
                                        onChange={(event) => setTransitionType(event.target.value as 'cut' | 'dissolve' | 'blur_fade')}
                                        className="w-full bg-slate-100 dark:bg-[#283039] border-none rounded-lg text-sm font-medium px-3 py-2"
                                    >
                                        <option value="cut">Cut</option>
                                        <option value="dissolve">Dissolve</option>
                                        <option value="blur_fade">Blur Fade</option>
                                    </select>
                                    <p className="text-[10px] text-slate-400">
                                        For category mode, segments will be chained and trimmed to match the main video duration.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col aspect-square xl:aspect-auto xl:h-[500px]">
                        <div className="flex-1 relative flex items-center justify-center bg-black">
                            {finalVideoUrl ? (
                                <video
                                    controls
                                    className="absolute inset-0 w-full h-full object-cover"
                                    src={finalVideoUrl}
                                >
                                    Your browser does not support the video element.
                                </video>
                            ) : (
                                <>
                                    <div
                                        className="absolute inset-0 bg-center bg-cover opacity-50 grayscale blur-sm"
                                        style={thumbnailUrl ? { backgroundImage: `url('${thumbnailUrl}')` } : undefined}
                                    ></div>
                                    <span className="material-symbols-outlined text-white text-6xl relative z-10 cursor-pointer hover:scale-110 transition-transform">play_circle</span>
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent flex items-center gap-4">
                                        <span className="material-symbols-outlined text-white text-sm">pause</span>
                                        <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                                            <div className="bg-primary h-full w-1/3"></div>
                                        </div>
                                        <span className="text-[10px] font-mono text-white">01:22 / 04:22</span>
                                        <span className="material-symbols-outlined text-white text-sm">fullscreen</span>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-6 bg-slate-800">
                            <h3 className="text-white text-sm font-bold mb-4 uppercase tracking-widest opacity-60">Export Summary</h3>
                            <ul className="space-y-3">
                                <li className="flex justify-between text-xs">
                                    <span className="text-slate-400">Codec</span>
                                    <span className="text-white font-mono">H.264 / MP4</span>
                                </li>
                                <li className="flex justify-between text-xs">
                                    <span className="text-slate-400">Resolution</span>
                                    <span className="text-white font-mono">
                                        {resolution === '4k_30' ? '3840 x 2160' : resolution === '1080p_60' ? '1920 x 1080' : '1280 x 720'}
                                    </span>
                                </li>
                                <li className="flex justify-between text-xs">
                                    <span className="text-slate-400">Est. Time</span>
                                    <span className="text-white font-mono">~ 4 min 20 sec</span>
                                </li>
                            </ul>
                            <button
                                onClick={handleGenerate}
                                disabled={saving || loading}
                                className="w-full mt-6 flex items-center justify-center rounded-lg h-12 bg-primary text-white text-sm font-bold tracking-tight hover:bg-blue-600 transition-colors shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-lg mr-2">rocket_launch</span>
                                START FINAL EXPORT
                            </button>
                            <p className="text-[10px] text-center text-slate-400 mt-4 leading-relaxed">
                                By clicking export, the cloud engine will begin stitching and color grading your assets. Credits will be deducted upon completion.
                            </p>
                        </div>
                    </div>
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex gap-3">
                            <span className="material-symbols-outlined text-primary">lightbulb</span>
                            <div>
                                <p className="text-xs font-bold text-primary mb-1">PRO TIP</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Adding an Intro increases viewer retention by up to 25% for API-generated marketing content.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {isIntroOpen && (
                <IntroOutroModal
                    title="Intro Builder"
                    config={introConfig}
                    onClose={() => setIsIntroOpen(false)}
                    onSave={async (next) => {
                        try {
                            setIntroConfig(next);
                            if (!projectId) return false;
                            await ApiClient.patch(`/projects/${projectId}/meta`, {
                                intro_config: next
                            });
                            if (next.templateId || next.mode === 'video') {
                                await ApiClient.generatePreview(projectId, 'intro');
                                setIntroPreviewNonce(Date.now());
                            }
                            return true;
                        } catch (error) {
                            alert('Failed to save intro settings');
                            return false;
                        }
                        return false;
                    }}
                    videoAssets={videoAssets}
                    templates={templates}
                    placeholderValues={buildPlaceholderValues(projectMeta, title, projectId)}
                />
            )}

            {isOutroOpen && (
                <IntroOutroModal
                    title="Outro Builder"
                    config={outroConfig}
                    onClose={() => setIsOutroOpen(false)}
                    onSave={async (next) => {
                        try {
                            setOutroConfig(next);
                            if (!projectId) return false;
                            await ApiClient.patch(`/projects/${projectId}/meta`, {
                                outro_config: next
                            });
                            if (next.templateId || next.mode === 'video') {
                                await ApiClient.generatePreview(projectId, 'outro');
                                setOutroPreviewNonce(Date.now());
                            }
                            return true;
                        } catch (error) {
                            alert('Failed to save outro settings');
                            return false;
                        }
                        return false;
                    }}
                    videoAssets={videoAssets}
                    templates={templates}
                    placeholderValues={buildPlaceholderValues(projectMeta, title, projectId)}
                />
            )}
        </section>
    );
}

type IntroOutroConfig = {
    mode: 'compose' | 'video';
    video: string;
    text: string;
    voice: 'same' | 'custom';
    templateId: string;
    templateFields: Record<string, string>;
    previewAspect?: '16:9' | '9:16' | 'image';
};

type IntroOutroModalProps = {
    title: string;
    config: IntroOutroConfig;
    onClose: () => void;
    onSave: (next: IntroOutroConfig) => Promise<boolean> | boolean;
    videoAssets: { name: string; path: string }[];
    templates: any[];
    placeholderValues: Record<string, string>;
};

const IntroOutroModal: React.FC<IntroOutroModalProps> = ({
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
                            className="w-full bg-slate-100 dark:bg-[#283039] border-none rounded-lg text-sm font-medium px-3 py-2"
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
                                    className="w-full bg-slate-100 dark:bg-[#283039] border-none rounded-lg text-sm font-medium px-3 py-2"
                                >
                                    <option value="">Select template</option>
                                    {templates.map((tpl) => (
                                        <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={draft.previewAspect || '16:9'}
                                    onChange={(event) => handleChange('previewAspect', event.target.value as '16:9' | '9:16' | 'image')}
                                    className="w-full bg-slate-100 dark:bg-[#283039] border-none rounded-lg text-sm font-medium px-3 py-2"
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
                                                        className="w-full bg-slate-100 dark:bg-[#283039] border-none rounded-lg text-sm font-medium px-3 py-2"
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
                                        className="w-full bg-slate-100 dark:bg-[#283039] border-none rounded-lg text-sm font-medium px-3 py-2 min-h-[90px]"
                                        placeholder="Write the intro/outro text..."
                                    />
                                    <InlineTooltip text={overlayTooltip.text} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Voice</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleChange('voice', 'same')}
                                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${draft.voice === 'same'
                                            ? 'border-primary text-primary bg-primary/10'
                                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-primary/50'
                                            }`}
                                    >
                                        Use Project Voice
                                    </button>
                                    <button
                                        onClick={() => handleChange('voice', 'custom')}
                                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${draft.voice === 'custom'
                                            ? 'border-primary text-primary bg-primary/10'
                                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-primary/50'
                                            }`}
                                    >
                                        Pick Another Voice
                                    </button>
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

const PLACEHOLDER_REGEX = /{{\s*([\w.-]+)\s*}}/g;

const buildPlaceholderValues = (meta: Record<string, any>, titleFallback: string, projectId?: string) => {
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
