import { GlobalConfig } from '../../core/domain/entities/config.entity';
import { ConfigRepository } from '../../core/domain/repositories/config.repository';
import { ApiClient } from '../api/api.client';

export class HttpConfigRepository implements ConfigRepository {
    async get(): Promise<GlobalConfig> {
        return ApiClient.get<GlobalConfig>('/config/global');
    }

    async update(config: Partial<GlobalConfig>): Promise<void> {
        await ApiClient.put('/config/global', config);
    }
}
