export interface GlobalConfig {
    REDDIT_CLIENT_ID: string;
    REDDIT_CLIENT_SECRET: string;
    REDDIT_USER_AGENT: string;
    REDDIT_USERNAME: string;
    REDDIT_PASSWORD: string;
    REDDIT_LIMIT: number;
    REDDIT_TIMEFRAME: string;
    DRIVE_INDEX_ROOT_ID: string;
    DRIVE_SEEN_FILE_ID: string;
    OPENAI_API_KEY: string;
    N8N_WEBHOOK_URL: string;
    SUBREDDITS: string[];
    MIN_CHARS: number;
    MAX_CHARS: number;
    default_model: string;
    default_language: string;
}
