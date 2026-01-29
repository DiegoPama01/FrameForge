export class ApiClient {
    private static baseUrl = process.env.NEXT_PUBLIC_WORKER_API_URL || 'http://localhost:8000';
    private static token = process.env.NEXT_PUBLIC_WORKER_TOKEN || '';

    static async get<T>(path: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
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
        const response = await fetch(`${this.baseUrl}${path}`, {
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
        const response = await fetch(`${this.baseUrl}${path}`, {
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

    static async retryStage(projectId: string): Promise<any> {
        return this.post(`/projects/${projectId}/retry-stage`);
    }

    static async patch<T>(path: string, body?: any): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
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
        const response = await fetch(`${this.baseUrl}/projects/${projectId}?complete=${complete}`, {
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
        const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
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
            return `${this.baseUrl}/events?token=${encodeURIComponent(this.token)}`;
        }
        return `${this.baseUrl}/events`;
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

    static async uploadAsset(file: File, category: string = 'uncategorized'): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);

        const response = await fetch(`${this.baseUrl}/assets`, {
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
        const response = await fetch(`${this.baseUrl}/assets/${category}/${filename}`, {
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

    static async updateAssetCategories(category: string, filename: string, categories: string[]): Promise<any> {
        return this.patch(`/assets/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`, { categories });
    }
}
