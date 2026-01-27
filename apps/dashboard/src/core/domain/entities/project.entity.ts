export type ProjectStatus = 'Idle' | 'Processing' | 'Success' | 'Error' | 'Cancelled';

export type ProjectStage =
    | 'Source Discovery'
    | 'Content Translation'
    | 'Gender Analysis'
    | 'Vocal Synthesis'
    | 'Caption Engine'
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
    type: 'string' | 'number' | 'select' | 'boolean';
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
    error?: string;
}
