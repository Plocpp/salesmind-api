// API service para fazer chamadas para o backend
const API_BASE_URL = 'http://localhost:3000';

const apiClient = {
  request: async (endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any, token?: string) => {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (data !== undefined && method !== 'GET' && method !== 'DELETE') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  },

  get: async (endpoint: string, token?: string) => apiClient.request(endpoint, 'GET', undefined, token),

  post: async (endpoint: string, data: any, token?: string) => apiClient.request(endpoint, 'POST', data, token),

  put: async (endpoint: string, data: any, token?: string) => apiClient.request(endpoint, 'PUT', data, token),

  delete: async (endpoint: string, token?: string) => apiClient.request(endpoint, 'DELETE', undefined, token),
};

export const api = {
  ...apiClient,
  auth: {
    login: async (email: string, senha: string) => {
      return apiClient.post('/auth/login', { email, senha });
    },
    register: async (nome: string, email: string, senha: string) => {
      return apiClient.post('/auth/register', { nome, email, senha });
    },
  },
  produtos: {
    listar: async (token: string) => {
      return apiClient.get('/produtos', token);
    },
    criar: async (token: string, produto: any) => {
      return apiClient.post('/produtos', produto, token);
    },
  },
};