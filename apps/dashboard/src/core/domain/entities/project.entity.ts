export type ProjectStatus = 'Idle' | 'Processing' | 'Success' | 'Error' | 'Cancelled';

export type ProjectStage =
    | 'Source Discovery'
    | 'Content Translation'
    | 'Gender Analysis'
    | 'Vocal Synthesis'
    | 'Caption Engine'
    | 'Thumbnail Forge'
    | 'Visual Production'
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
    thumbnail?: string;
}

export interface WorkflowNode {
    id: string;
    label: string;
    icon: string;
    description?: string;
    parameters: WorkflowParameter[];
}

export interface Workflow {
    id: string;
    name: string;
    description: string;
    nodes: WorkflowNode[];
    status: 'locked' | 'active' | 'draft';
    usageCount: number;
    tags: string[];
}

export interface WorkflowParameter {
    id: string;
    label: string;
    type: 'string' | 'text' | 'number' | 'select' | 'boolean' | 'chips' | 'multiselect';
    placeholder?: string;
    defaultValue?: any;
    options?: { label: string; value: any }[];
}

export interface Job {
    id: string;
    workflowId: string;
    projectId?: string;
    status: 'Pending' | 'Running' | 'Completed' | 'Failed';
    progress: number;
    parameters: Record<string, any>;
    createdAt: string;
    schedule_interval?: 'once' | 'daily' | 'weekly';
    schedule_time?: string | null;
    last_run?: string | null;
    error?: string;
}
