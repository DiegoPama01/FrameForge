import { Project } from '../../core/domain/entities/project.entity';
import { ProjectRepository } from '../../core/domain/repositories/project.repository';
import { ApiClient } from '../api/api.client';

export class HttpProjectRepository implements ProjectRepository {
    async getAll(): Promise<Project[]> {
        const projects = await ApiClient.get<{ id: string, name: string }[]>('/projects');
        return projects.map(p => ({
            id: p.id,
            title: p.name,
            source: 'Reddit',
            status: 'Idle',
            updatedAt: new Date().toISOString(), // In real app, we'd use stat from worker
        }));
    }

    async getById(id: string): Promise<Project> {
        const data = await ApiClient.get<any>(`/projects/${id}`);
        return {
            id: data.project_id,
            title: data.meta?.title || data.project_id,
            source: data.meta?.subreddit || 'Disk',
            status: 'Idle',
            updatedAt: new Date().toISOString(),
        };
    }

    async update(id: string, data: Partial<Project>): Promise<void> {
        const metaUpdate: any = {};
        if (data.title) metaUpdate.title = data.title;
        if (data.source) metaUpdate.subreddit = data.source;

        await ApiClient.patch(`/projects/${id}/meta`, metaUpdate);
    }

    async sync(id: string): Promise<void> {
        await ApiClient.post(`/projects/${id}/sync`);
    }
}
