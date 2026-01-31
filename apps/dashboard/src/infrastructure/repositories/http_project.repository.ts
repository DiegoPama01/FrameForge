import { Project, ProjectStatus, ProjectStage, Workflow, Job } from '../../core/domain/entities/project.entity';
import { ProjectRepository } from '../../core/domain/repositories/project.repository';
import { ApiClient } from '../api/api.client';

const STAGE_LABELS: Record<string, ProjectStage> = {
    'Text Scrapped': 'Source Discovery',
    'Text Translated': 'Content Translation',
    'Speech Generated': 'Vocal Synthesis',
    'Subtitles Created': 'Caption Engine',
    'Thumbnail Created': 'Thumbnail Forge',
    'Master Composition': 'Visual Production',
    'Source Discovery': 'Source Discovery',
    'Content Translation': 'Content Translation',
    'Gender Analysis': 'Gender Analysis',
    'Vocal Synthesis': 'Vocal Synthesis',
    'Caption Engine': 'Caption Engine',
    'Thumbnail Forge': 'Thumbnail Forge',
    'Visual Production': 'Visual Production',
    'Cancelled': 'Cancelled',
};

const normalizeStage = (stage?: string): ProjectStage => {
    if (!stage) return 'Source Discovery';
    return STAGE_LABELS[stage] || 'Source Discovery';
};

export class HttpProjectRepository implements ProjectRepository {
    async getAll(): Promise<Project[]> {
        const projects = await ApiClient.get<{ id: string, name: string, category: string, status: string, currentStage: string, duration?: string, thumbnail?: string }[]>('/projects');
        return projects.map(p => ({
            id: p.id,
            title: p.name,
            source: 'Reddit',
            category: p.category,
            status: (p.status || 'Idle') as ProjectStatus,
            currentStage: normalizeStage(p.currentStage),
            duration: p.duration || undefined,
            thumbnail: p.thumbnail,
            updatedAt: new Date().toISOString(),
        }));
    }

    async getById(id: string): Promise<Project> {
        const data = await ApiClient.get<any>(`/projects/${id}`);
        return {
            id: data.project_id,
            title: data.meta?.title || data.project_id,
            source: 'Reddit',
            category: data.meta?.subreddit || 'Disk',
            status: (data.meta?.status || 'Idle') as ProjectStatus,
            currentStage: normalizeStage(data.meta?.currentStage),
            duration: data.meta?.duration,
            content: data.content,
            updatedAt: new Date().toISOString(),
        };
    }

    async update(id: string, data: Partial<Project>): Promise<void> {
        const metaUpdate: any = {};
        if (data.title) metaUpdate.title = data.title;
        if (data.source) metaUpdate.subreddit = data.source;
        if (data.status) metaUpdate.status = data.status;
        if (data.currentStage) metaUpdate.currentStage = data.currentStage;

        await ApiClient.patch(`/projects/${id}/meta`, metaUpdate);
    }

    async sync(id: string): Promise<void> {
        await ApiClient.post(`/projects/${id}/sync`);
    }

    async runNextStage(id: string): Promise<void> {
        await ApiClient.runNextStage(id);
    }

    async retryStage(id: string): Promise<void> {
        await ApiClient.retryStage(id);
    }

    async runAutomatically(id: string): Promise<void> {
        await ApiClient.runAutomatically(id);
    }

    async cleanup(id: string): Promise<void> {
        await ApiClient.cleanupProject(id);
    }

    async delete(id: string, complete: boolean): Promise<void> {
        await ApiClient.deleteProject(id, complete);
    }

    async createShorts(id: string, count?: number, segmentLength?: number): Promise<void> {
        await ApiClient.createShorts(id, {
            count,
            segment_length: segmentLength
        });
    }

    // Workflows
    async getWorkflows(): Promise<Workflow[]> {
        return ApiClient.get<Workflow[]>('/workflows');
    }

    async createWorkflow(workflow: Workflow): Promise<void> {
        await ApiClient.post('/workflows', workflow);
    }

    async deleteWorkflow(id: string): Promise<void> {
        await ApiClient.deleteWorkflow(id);
    }

    // Jobs
    async getJobs(): Promise<Job[]> {
        return ApiClient.get<Job[]>('/jobs');
    }

    async createJob(
        workflowId: string,
        parameters: Record<string, any>,
        scheduling?: { interval: string; time?: string }
    ): Promise<{ id: string }> {
        const payload: Record<string, any> = { workflowId, parameters };
        if (scheduling?.interval) {
            payload.schedule_interval = scheduling.interval;
            if (scheduling.time) payload.schedule_time = scheduling.time;
        }
        return ApiClient.post<{ id: string }>('/jobs', payload);
    }

    async deleteJob(id: string): Promise<void> {
        await ApiClient.deleteJob(id);
    }

    async runJob(id: string): Promise<void> {
        await ApiClient.runJob(id);
    }

    async updateJob(
        id: string,
        parameters: Record<string, any>,
        scheduling?: { interval: string; time?: string }
    ): Promise<void> {
        const payload: Record<string, any> = { parameters };
        if (scheduling?.interval) {
            payload.schedule_interval = scheduling.interval;
            if (scheduling.time !== undefined) {
                payload.schedule_time = scheduling.time;
            }
        }
        await ApiClient.updateJob(id, payload);
    }
}
