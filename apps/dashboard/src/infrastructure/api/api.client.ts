export class ApiClient {
    private static token = process.env.NEXT_PUBLIC_WORKER_TOKEN || '';

    private static resolveBaseUrl(): string {
        const raw = process.env.NEXT_PUBLIC_WORKER_API_URL;
        if (!raw) return '/api';
        if (raw.startsWith('/') || raw.startsWith('.')) return raw;
        if (typeof window !== 'undefined') return '/api';
        return raw;
    }

    static async get<T>(path: string): Promise<T> {
        const response = await fetch(`${this.resolveBaseUrl()}${path}`, {
            headers: {
                'x-worker-token': this.token,
            },
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    }

    static async post<T>(path: string, body?: any): Promise<T> {
        const response = await fetch(`${this.resolveBaseUrl()}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-worker-token': this.token,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    }

    static async put<T>(path: string, body?: any): Promise<T> {
        const response = await fetch(`${this.resolveBaseUrl()}${path}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-worker-token': this.token,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    }

    static async triggerN8n(): Promise<any> {
        return this.post('/trigger-n8n');
    }

    static async harvestProjects(): Promise<any> {
        return this.post('/projects/harvest');
    }

    static async getFiles(projectId: string): Promise<{ path: string, size: number }[]> {
        return this.get(`/projects/${projectId}/files`);
    }

    static async getFileContent(projectId: string, path: string): Promise<{ content: string }> {
        return this.get(`/projects/${projectId}/files/content?path=${encodeURIComponent(path)}`);
    }

    static async runNextStage(projectId: string): Promise<any> {
        return this.post(`/projects/${projectId}/run-next-stage`);
    }

    static async exportFinal(projectId: string): Promise<any> {
        return this.post(`/projects/${projectId}/export`);
    }

    static async retryStage(projectId: string): Promise<any> {
        return this.post(`/projects/${projectId}/retry-stage`);
    }

    static async runAutomatically(projectId: string): Promise<any> {
        return this.post(`/projects/${projectId}/run-automatically`);
    }

    static async patch<T>(path: string, body?: any): Promise<T> {
        const response = await fetch(`${this.resolveBaseUrl()}${path}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-worker-token': this.token,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    }

    static async cleanupProject(projectId: string): Promise<any> {
        return this.post(`/projects/${projectId}/cleanup`);
    }

    static async deleteProject(projectId: string, complete: boolean): Promise<any> {
        const response = await fetch(`${this.resolveBaseUrl()}/projects/${projectId}?complete=${complete}`, {
            method: 'DELETE',
            headers: {
                'x-worker-token': this.token,
            },
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    }

    static async deleteJob(jobId: string): Promise<any> {
        const response = await fetch(`${this.resolveBaseUrl()}/jobs/${jobId}`, {
            method: 'DELETE',
            headers: {
                'x-worker-token': this.token,
            },
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.json();
    }

    static async runJob(jobId: string): Promise<any> {
        return this.post(`/jobs/${jobId}/run`);
    }

    static getEventsUrl(): string {
        if (this.token) {
            return `${this.resolveBaseUrl()}/events?token=${encodeURIComponent(this.token)}`;
        }
        return `${this.resolveBaseUrl()}/events`;
    }

    static async updateJob(jobId: string, body: any): Promise<any> {
        return this.patch(`/jobs/${jobId}`, body);
    }

    static async createShorts(projectId: string, body?: { count?: number; segment_length?: number }): Promise<any> {
        return this.post(`/projects/${projectId}/shorts`, body);
    }

    // --- Assets ---
    static async getAssets(): Promise<any[]> {
        return this.get('/assets');
    }

    static async getAssetCategories(): Promise<string[]> {
        return this.get('/asset-categories');
    }

    static async createAssetCategory(id: string): Promise<any> {
        return this.post('/asset-categories', { id });
    }

    static async getTemplates(): Promise<any[]> {
        return this.get('/templates');
    }

    static async createTemplate(payload: { name: string; image_path: string; fields: any[] }): Promise<any> {
        return this.post('/templates', payload);
    }

    static async updateTemplate(id: string, payload: { name?: string; image_path?: string; fields?: any[] }): Promise<any> {
        return this.patch(`/templates/${id}`, payload);
    }

    static async renderTemplatePreview(payload: {
        template_id?: string;
        image_path?: string;
        fields?: any[];
        field_values?: Record<string, string>;
        preview_aspect?: '16:9' | '9:16' | 'image';
    }): Promise<Blob> {
        const response = await fetch(`${this.resolveBaseUrl()}/templates/preview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-worker-token': this.token,
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        return response.blob();
    }

    static async generatePreview(projectId: string, type: 'intro' | 'outro'): Promise<any> {
        return this.post(`/projects/${projectId}/preview?type=${encodeURIComponent(type)}`);
    }

    static async deleteWorkflow(id: string): Promise<any> {
        const response = await fetch(`${this.resolveBaseUrl()}/workflows/${id}`, {
            method: 'DELETE',
            headers: {
                'x-worker-token': this.token,
            },
        });
        if (!response.ok) {
            throw new Error(`Delete Failed: ${response.statusText}`);
        }
        return response.json();
    }

    static async uploadAsset(file: File, category: string = 'uncategorized'): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);

        const response = await fetch(`${this.resolveBaseUrl()}/assets`, {
            method: 'POST',
            headers: {
                'x-worker-token': this.token,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload Failed: ${response.statusText}`);
        }
        return response.json();
    }

    static async deleteAsset(category: string, filename: string): Promise<any> {
        const response = await fetch(`${this.resolveBaseUrl()}/assets/${category}/${filename}`, {
            method: 'DELETE',
            headers: {
                'x-worker-token': this.token,
            },
        });
        if (!response.ok) {
            throw new Error(`Delete Failed: ${response.statusText}`);
        }
        return response.json();
    }

    static getBaseUrl(): string {
        return this.resolveBaseUrl();
    }

    static getToken(): string {
        return this.token;
    }

    static async updateAssetCategories(category: string, filename: string, categories: string[]): Promise<any> {
        return this.patch(`/assets/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`, { categories });
    }
}
