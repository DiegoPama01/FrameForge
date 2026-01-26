import { Project } from '../entities/project.entity';

export interface ProjectRepository {
    getAll(): Promise<Project[]>;
    getById(id: string): Promise<Project>;
    update(id: string, data: Partial<Project>): Promise<void>;
    sync(id: string): Promise<void>;
    runNextStage(id: string): Promise<void>;
    retryStage(id: string): Promise<void>;
}
