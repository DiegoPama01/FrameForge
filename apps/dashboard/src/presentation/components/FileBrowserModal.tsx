"use client";
import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../infrastructure/api/api.client';

interface FileItem {
    path: string;
    size: number;
}

interface FileBrowserModalProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
}

type FileType = 'text' | 'json' | 'audio' | 'video' | 'image' | 'srt' | 'unknown';

const getFileType = (path: string): FileType => {
    const ext = path.split('.').pop()?.toLowerCase();
    if (!ext) return 'unknown';

    if (['txt', 'md'].includes(ext)) return 'text';
    if (ext === 'json') return 'json';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    if (['mp4', 'webm', 'avi', 'mov'].includes(ext)) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext === 'srt') return 'srt';

    return 'unknown';
};

const getFileIcon = (path: string): string => {
    const type = getFileType(path);

    switch (type) {
        case 'text': return 'description';
        case 'json': return 'data_object';
        case 'audio': return 'audio_file';
        case 'video': return 'video_file';
        case 'image': return 'image';
        case 'srt': return 'closed_caption';
        default: return 'draft';
    }
};

const getFileUrl = (projectId: string, path: string): string => {
    const baseUrl = ApiClient.getBaseUrl();
    const token = ApiClient.getToken();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    return `${baseUrl}/projects/${projectId}/files/content?path=${encodeURIComponent(path)}${tokenParam}`;
};

export const FileBrowserModal: React.FC<FileBrowserModalProps> = ({ projectId, isOpen, onClose }) => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [reading, setReading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchFiles();
        } else {
            setSelectedFile(null);
            setFileContent(null);
        }
    }, [isOpen, projectId]);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const data = await ApiClient.getFiles(projectId);
            setFiles(data);
        } catch (error) {
            console.error('Failed to fetch files', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReadFile = async (path: string) => {
        setSelectedFile(path);
        const fileType = getFileType(path);

        // For media files, we don't need to fetch content
        if (['audio', 'video', 'image'].includes(fileType)) {
            setFileContent(null);
            setReading(false);
            return;
        }

        setReading(true);
        try {
            const data = await ApiClient.getFileContent(projectId, path);
            setFileContent(data.content);
        } catch (error) {
            setFileContent("Error reading file content.");
        } finally {
            setReading(false);
        }
    };

    const handleDownload = (path: string) => {
        const url = getFileUrl(projectId, path);
        const link = document.createElement('a');
        link.href = url;
        link.download = path.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderFilePreview = () => {
        if (!selectedFile) {
            return (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-300 dark:text-slate-700">
                    <span className="material-symbols-outlined text-5xl">find_in_page</span>
                    <p className="text-sm font-medium">Select a file from the list to preview its content</p>
                </div>
            );
        }

        const fileType = getFileType(selectedFile);
        const fileUrl = getFileUrl(projectId, selectedFile);

        return (
            <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-slate-400">{getFileIcon(selectedFile)}</span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedFile.split('/').pop()}</span>
                    </div>
                    <div className="flex gap-2">
                        {fileType === 'audio' && (
                            <button
                                onClick={() => handleDownload(selectedFile)}
                                className="text-[10px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">download</span>
                                Download
                            </button>
                        )}
                        {fileContent && (
                            <button
                                onClick={() => {
                                    if (fileContent) navigator.clipboard.writeText(fileContent);
                                }}
                                className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                            >
                                Copy Content
                            </button>
                        )}
                    </div>
                </div>

                {reading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 italic text-xs">Loading content...</div>
                ) : (
                    <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner overflow-auto">
                        {fileType === 'audio' && (
                            <div className="flex flex-col items-center justify-center h-full gap-6">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="size-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-5xl text-primary">headphones</span>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{selectedFile.split('/').pop()}</p>
                                        <p className="text-xs text-slate-500">Audio File</p>
                                    </div>
                                </div>
                                <audio
                                    controls
                                    className="w-full max-w-md"
                                    src={fileUrl}
                                    preload="metadata"
                                >
                                    Your browser does not support the audio element.
                                </audio>
                                <p className="text-xs text-slate-400 italic">Use the player controls to play, pause, and adjust volume</p>
                            </div>
                        )}
                        {fileType === 'image' && (
                            <div className="flex items-center justify-center h-full">
                                <img
                                    src={fileUrl}
                                    alt={selectedFile}
                                    className="max-w-full max-h-full object-contain rounded-lg"
                                />
                            </div>
                        )}
                        {fileType === 'video' && (
                            <div className="flex items-center justify-center h-full">
                                <video
                                    controls
                                    className="max-w-full max-h-full rounded-lg"
                                    src={fileUrl}
                                >
                                    Your browser does not support the video element.
                                </video>
                            </div>
                        )}
                        {['text', 'json', 'srt', 'unknown'].includes(fileType) && (
                            <pre className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                                {fileContent}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">folder_open</span>
                        <div>
                            <h3 className="text-lg font-bold">Project Files</h3>
                            <p className="text-xs text-slate-500 font-mono">{projectId}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* File List */}
                    <div className="w-1/3 border-r border-slate-100 dark:border-slate-800 overflow-auto p-4 space-y-1">
                        {loading ? (
                            <div className="p-4 text-xs text-slate-400 italic">Scanning directory...</div>
                        ) : files.length === 0 ? (
                            <div className="p-4 text-xs text-slate-400 italic">No files found.</div>
                        ) : (
                            files.map(file => (
                                <div
                                    key={file.path}
                                    onClick={() => handleReadFile(file.path)}
                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${selectedFile === file.path ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {getFileIcon(file.path)}
                                    </span>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs font-medium truncate">{file.path}</p>
                                        <p className="text-[9px] opacity-50">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    {selectedFile === file.path && <span className="material-symbols-outlined text-[14px]">chevron_right</span>}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Content Preview */}
                    <div className="flex-1 bg-slate-50 dark:bg-slate-950/20 overflow-auto p-6">
                        {renderFilePreview()}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/30 dark:bg-slate-800/30">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                        Close Browser
                    </button>
                </div>
            </div>
        </div>
    );
};
