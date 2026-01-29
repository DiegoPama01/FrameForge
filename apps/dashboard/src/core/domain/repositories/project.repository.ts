import { Project, Workflow, Job } from '../entities/project.entity';

export interface ProjectRepository {
    getAll(): Promise<Project[]>;
    getById(id: string): Promise<Project>;
    update(id: string, data: Partial<Project>): Promise<void>;
    sync(id: string): Promise<void>;
    runNextStage(id: string): Promise<void>;
    retryStage(id: string): Promise<void>;
    cleanup(id: string): Promise<void>;
    delete(id: string, complete: boolean): Promise<void>;
    createShorts(id: string, count?: number, segmentLength?: number): Promise<void>;

    // Workflows
    getWorkflows(): Promise<Workflow[]>;
    createWorkflow(workflow: Workflow): Promise<void>;
    deleteWorkflow(id: string): Promise<void>;

    // Jobs
    getJobs(): Promise<Job[]>;
    createJob(
        workflowId: string,
        parameters: Record<string, any>,
        scheduling?: { interval: string; time?: string }
    ): Promise<{ id: string }>;
    deleteJob(id: string): Promise<void>;
    runJob(id: string): Promise<void>;
    updateJob(
        id: string,
        parameters: Record<string, any>,
        scheduling?: { interval: string; time?: string }
    ): Promise<void>;
}
