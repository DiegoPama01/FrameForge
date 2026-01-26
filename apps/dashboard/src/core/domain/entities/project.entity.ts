export type ProjectStatus = 'Idle' | 'Processing' | 'Success' | 'Error' | 'Cancelled';

export type ProjectStage =
    | 'Text Scrapped'
    | 'Text Translated'
    | 'Speech Generated'
    | 'Subtitles Created'
    | 'Thumbnail Created'
    | 'Cancelled';

export interface Project {
    id: string;
    title: string;
    source: string;
    category?: string;
    status: ProjectStatus;
    currentStage: ProjectStage;
    updatedAt: string;
    duration?: string;
    content?: string;
}

export interface Job {
    id: string;
    projectId: string;
    type: string;
    status: string;
    progress: number;
    createdAt: string;
}
