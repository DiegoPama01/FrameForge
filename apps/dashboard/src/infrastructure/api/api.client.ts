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
}
