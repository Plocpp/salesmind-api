// API service para fazer chamadas para o backend.
// Em producao, configure VITE_API_BASE_URL para a URL publica da API.
const API_BASE_URL = (() => {
  const envBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
    ? String(import.meta.env.VITE_API_BASE_URL).trim()
    : '';

  if (envBase) return envBase.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const { origin, hostname } = window.location;

    if (hostname === 'salesmind-app.onrender.com') {
      return 'https://salesmind-api.onrender.com';
    }

    if (hostname === 'salesmind-api.onrender.com') {
      return origin.replace(/\/$/, '');
    }

    return origin.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
})();

const apiClient = {
  request: async (endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any, token?: string | null) => {
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

  get: async (endpoint: string, token?: string | null) => apiClient.request(endpoint, 'GET', undefined, token),

  post: async (endpoint: string, data: any, token?: string | null) => apiClient.request(endpoint, 'POST', data, token),

  put: async (endpoint: string, data: any, token?: string | null) => apiClient.request(endpoint, 'PUT', data, token),

  delete: async (endpoint: string, token?: string | null) => apiClient.request(endpoint, 'DELETE', undefined, token),
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
  acessos: {
    meus: async (token: string) => {
      return apiClient.get('/acessos/me', token);
    },
    listarPerfisHierarquia: async (token: string) => {
      return apiClient.get('/acessos/hierarquia/perfis', token);
    },
    listarFuncionariosHierarquia: async (token: string) => {
      return apiClient.get('/acessos/hierarquia/funcionarios', token);
    },
    criarFuncionarioHierarquia: async (token: string, payload: any) => {
      return apiClient.post('/acessos/hierarquia/funcionarios', payload, token);
    },
    atualizarPermissoesHierarquia: async (token: string, userId: string, payload: any) => {
      return apiClient.put(`/acessos/hierarquia/funcionarios/${userId}/permissoes`, payload, token);
    },
    listar: async (token: string) => {
      return apiClient.get('/acessos', token);
    },
    criar: async (token: string, payload: any) => {
      return apiClient.post('/acessos', payload, token);
    },
    revogar: async (token: string, id: string, motivo?: string) => {
      return apiClient.post(`/acessos/${id}/revoke`, { motivo }, token);
    },
    auditoriaLgpd: async (token: string, userId?: string) => {
      const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      return apiClient.get(`/acessos/auditoria/lgpd${query}`, token);
    },
  },
};