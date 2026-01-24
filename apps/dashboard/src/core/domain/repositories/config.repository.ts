import { GlobalConfig } from '../entities/config.entity';

export interface ConfigRepository {
    get(): Promise<GlobalConfig>;
    update(config: Partial<GlobalConfig>): Promise<void>;
}
