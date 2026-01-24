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
}
