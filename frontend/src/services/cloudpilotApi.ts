import { api, clearTokens, setTokens } from '@/services/api';

export interface LoginResponse {
  access_token: string;
  csrf_token: string;
  token_type: string;
}

export interface DeploymentDto {
  id: number;
  name: string;
  branch: string;
  status: 'success' | 'failed' | 'pending' | 'building' | 'queued' | 'cloning' | 'stopped';
  environment: 'Production' | 'Staging' | 'Preview';
  commit: string;
  author: string;
  duration: string;
  cpu: number;
  requests_per_min: number;
  created_at: string;
  updated_at: string;
  // Real deployment fields
  repo_url: string | null;
  port: number | null;
  host_port: number | null;
  url: string | null;
  container_id: string | null;
  image_tag: string | null;
}

export interface ProjectDto {
  name: string;
  latest: {
    id: number;
    status: DeploymentDto['status'];
    commit: string;
    branch: string;
    environment: string;
    url: string | null;
    host_port: number | null;
    created_at: string;
    duration: string;
    author: string;
    repo_url: string | null;
  };
  total_deployments: number;
  deployments: Array<{
    id: number;
    status: string;
    commit: string;
    branch: string;
    created_at: string;
    url: string | null;
    duration: string;
  }>;
}

export interface MetricsResponse {
  source: string;
  points: Array<{
    cpu: number;
    memory: number;
    request_count: number;
    latency: number;
    network: number;
    timestamp: string;
  }>;
}

export interface LogsResponse {
  items: Array<{
    id: number;
    message: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    service: string;
    timestamp: string;
  }>;
  total: number;
  page: number;
  page_size: number;
}

export interface AlertDto {
  id: number;
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  status: string;
  acknowledged: boolean;
  timestamp: string;
}

export interface CreateDeploymentPayload {
  name: string;
  repo_url: string;
  branch?: string;
  environment?: string;
  author?: string;
  port?: number;
}

export const cloudpilotApi = {
  async login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (response.status === 200 && data.access_token) {
      setTokens({ accessToken: data.access_token, csrfToken: data.csrf_token });
      localStorage.setItem('token', data.access_token);
      return data;
    }
    throw new Error(data.detail || 'Login failed');
  },

  async refresh() {
    const res = await api.post<LoginResponse>('/auth/refresh');
    setTokens({ accessToken: res.data.access_token, csrfToken: res.data.csrf_token });
    return res.data;
  },

  me() {
    return api.get<{ id: number; email: string; role: string }>('/auth/me');
  },

  deployments() {
    return api.get<DeploymentDto[]>('/deployments');
  },

  createDeployment(payload: CreateDeploymentPayload) {
    return api.post<DeploymentDto>('/deployments', payload);
  },

  restartDeployment(id: number) {
    return api.post<DeploymentDto>(`/deployments/${id}/restart`);
  },

  rollbackDeployment(id: number) {
    return api.post<DeploymentDto>(`/deployments/${id}/rollback`);
  },

  getDeploymentLogs(id: number) {
    return api.get<{ deployment_id: number; logs: string }>(`/deployments/${id}/logs`);
  },

  projects() {
    return api.get<ProjectDto[]>('/projects');
  },

  metrics() {
    return api.get<MetricsResponse>('/metrics');
  },

  logs(params?: { page?: number; page_size?: number; level?: string; q?: string }) {
    return api.get<LogsResponse>('/logs', { params });
  },

  alerts() {
    return api.get<AlertDto[]>('/alerts');
  },

  acknowledgeAlert(id: number) {
    return api.post<{ id: number; acknowledged: boolean; status: string }>(`/alerts/${id}/acknowledge`);
  },

  async logout() {
    try {
      await api.post<{ status: string }>('/auth/logout');
    } finally {
      clearTokens();
    }
  },

  logoutLocal() {
    clearTokens();
  },
};

function websocketBaseUrl() {
  const explicit = import.meta.env.VITE_WS_BASE_URL;
  if (explicit) return explicit;
  // Use same host/port as the page — nginx proxies /ws/* to backend
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}`;
}

export function connectMetricsStream(onMessage: (payload: unknown) => void): WebSocket {
  const ws = new WebSocket(`${websocketBaseUrl()}/ws/metrics`);
  ws.onmessage = (event) => onMessage(JSON.parse(event.data));
  ws.onopen = () => ws.send('subscribe');
  return ws;
}

export function connectLogsStream(onMessage: (payload: unknown) => void): WebSocket {
  const ws = new WebSocket(`${websocketBaseUrl()}/ws/logs`);
  ws.onmessage = (event) => onMessage(JSON.parse(event.data));
  ws.onopen = () => ws.send('subscribe');
  return ws;
}

export function connectBuildStream(
  deploymentId: number,
  onLine: (line: string) => void,
  onDone: (url?: string, failed?: boolean) => void,
): WebSocket {
  const ws = new WebSocket(`${websocketBaseUrl()}/ws/build/${deploymentId}`);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data) as { line?: string; done?: boolean; url?: string; failed?: boolean; ping?: boolean };
    if (data.ping) return;
    if (data.done) {
      onDone(data.url, data.failed);
    } else if (data.line !== undefined) {
      onLine(data.line);
    }
  };
  return ws;
}