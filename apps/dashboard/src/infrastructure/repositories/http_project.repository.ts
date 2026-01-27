import { Project, ProjectStatus, ProjectStage } from '../../core/domain/entities/project.entity';
import { ProjectRepository } from '../../core/domain/repositories/project.repository';
import { ApiClient } from '../api/api.client';

export class HttpProjectRepository implements ProjectRepository {
    async getAll(): Promise<Project[]> {
        const projects = await ApiClient.get<{ id: string, name: string, category: string, status: string, currentStage: string }[]>('/projects');
        return projects.map(p => ({
            id: p.id,
            title: p.name,
            source: 'Reddit',
            category: p.category,
            status: (p.status || 'Idle') as ProjectStatus,
            currentStage: (p.currentStage || 'Source Discovery') as ProjectStage,
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
            currentStage: (data.meta?.currentStage || 'Source Discovery') as ProjectStage,
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

    async cleanup(id: string): Promise<void> {
        await ApiClient.cleanupProject(id);
    }

    async delete(id: string, complete: boolean): Promise<void> {
        await ApiClient.deleteProject(id, complete);
    }
}
