export type ProjectStatus = 'Success' | 'Processing' | 'Error' | 'Idle';

export interface Project {
    id: string;
    title: string;
    source: string;
    status: ProjectStatus;
    updatedAt: string;
    duration?: string;
    currentStage?: string;
}

export interface Job {
    id: string;
    type: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    createdAt: string;
    result?: any;
    error?: string;
}
