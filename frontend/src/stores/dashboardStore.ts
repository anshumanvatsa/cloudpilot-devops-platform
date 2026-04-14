import { create } from 'zustand';
import { toast } from '@/hooks/use-toast';
import { cloudpilotApi, DeploymentDto, LogsResponse } from '@/services/cloudpilotApi';
import { Alert, DashboardKpis, Deployment, LogEntry, LogLevel, MetricPoint } from '@/types/dashboard';

interface DashboardState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  deployments: Deployment[];
  logs: LogEntry[];
  alerts: Alert[];
  metrics: MetricPoint[];
  loading: {
    dashboard: boolean;
    deployments: boolean;
    monitoring: boolean;
    logs: boolean;
    alerts: boolean;
  };
  actionLoading: {
    deploy: string | null;
    restart: string | null;
    rollback: string | null;
  };
  toggleSidebar: () => void;
  toggleMobileNav: () => void;
  closeMobileNav: () => void;
  setLoading: (key: keyof DashboardState['loading'], value: boolean) => void;
  loadDashboardData: () => Promise<void>;
  loadDeployments: () => Promise<void>;
  loadMetrics: () => Promise<void>;
  loadLogs: (params?: { level?: string; q?: string; page?: number; page_size?: number }) => Promise<void>;
  loadAlerts: () => Promise<void>;
  dismissAlert: (id: string) => void;
  acknowledgeAlert: (id: string) => Promise<void>;
  triggerDeploy: (serviceId: string) => Promise<void>;
  restartDeployment: (serviceId: string) => Promise<void>;
  rollbackDeployment: (serviceId: string) => Promise<void>;
  createDeployment: (payload: { name: string; branch?: string; environment?: string; author?: string }) => Promise<void>;
  appendMetricFromSocket: (payload: unknown) => void;
  appendLogFromSocket: (payload: unknown) => void;
  getKpis: () => DashboardKpis;
}

function formatRelative(timestamp: string) {
  const value = new Date(timestamp).getTime();
  if (Number.isNaN(value)) return 'just now';
  const diffMs = Date.now() - value;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day ago`;
}

function mapDeployment(item: DeploymentDto): Deployment {
  return {
    id: String(item.id),
    name: item.name,
    branch: item.branch,
    status: item.status,
    environment: item.environment,
    commit: item.commit,
    author: item.author,
    duration: item.duration,
    timestamp: formatRelative(item.created_at),
    cpu: item.cpu,
    requestsPerMin: item.requests_per_min,
  };
}

function mapLogsResponse(response: LogsResponse): LogEntry[] {
  return response.items.map((item) => ({
    id: String(item.id),
    message: item.message,
    level: item.level,
    service: item.service,
    timestamp: new Date(item.timestamp).toLocaleTimeString('en-US', { hour12: false }),
  }));
}

async function withRetry<T>(work: () => Promise<T>, retries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 300));
      }
    }
  }
  throw lastError;
}

function parseLogLevel(value: string): LogLevel {
  if (value === 'warn' || value === 'error' || value === 'debug' || value === 'info') {
    return value;
  }
  return 'info';
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  deployments: [],
  logs: [],
  alerts: [],
  metrics: [],
  loading: {
    dashboard: false,
    deployments: false,
    monitoring: false,
    logs: false,
    alerts: false,
  },
  actionLoading: {
    deploy: null,
    restart: null,
    rollback: null,
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  setLoading: (key, value) =>
    set((s) => ({
      loading: {
        ...s.loading,
        [key]: value,
      },
    })),
  loadDashboardData: async () => {
    set((s) => ({ loading: { ...s.loading, dashboard: true } }));
    const { loadDeployments, loadMetrics, loadAlerts } = get();
    try {
      await Promise.all([loadDeployments(), loadMetrics(), loadAlerts()]);
    } finally {
      set((s) => ({ loading: { ...s.loading, dashboard: false } }));
    }
  },
  loadDeployments: async () => {
    set((s) => ({ loading: { ...s.loading, deployments: true } }));
    try {
      const deployments = await withRetry(() => cloudpilotApi.deployments(), 1);
      set({ deployments: deployments.map(mapDeployment) });
    } catch (error) {
      toast({ title: 'Failed to load deployments', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      set((s) => ({ loading: { ...s.loading, deployments: false } }));
    }
  },
  loadMetrics: async () => {
    set((s) => ({ loading: { ...s.loading, monitoring: true } }));
    try {
      const payload = await withRetry(() => cloudpilotApi.metrics(), 1);
      set({
        metrics: payload.points.map((point) => ({
          time: new Date(point.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          cpu: point.cpu,
          memory: point.memory,
          network: point.network,
          requests: point.request_count,
          latency: point.latency,
        })),
      });
    } catch (error) {
      toast({ title: 'Failed to load metrics', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      set((s) => ({ loading: { ...s.loading, monitoring: false } }));
    }
  },
  loadLogs: async (params) => {
    set((s) => ({ loading: { ...s.loading, logs: true } }));
    try {
      const payload = await withRetry(() => cloudpilotApi.logs(params), 1);
      set({ logs: mapLogsResponse(payload) });
    } catch (error) {
      toast({ title: 'Failed to load logs', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      set((s) => ({ loading: { ...s.loading, logs: false } }));
    }
  },
  loadAlerts: async () => {
    set((s) => ({ loading: { ...s.loading, alerts: true } }));
    try {
      const payload = await withRetry(() => cloudpilotApi.alerts(), 1);
      set({
        alerts: payload.map((item) => ({
          id: String(item.id),
          title: item.title,
          message: item.message,
          severity: item.severity,
          timestamp: formatRelative(item.timestamp),
          dismissed: item.status === 'closed',
          acknowledged: item.acknowledged,
        })),
      });
    } catch (error) {
      toast({ title: 'Failed to load alerts', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      set((s) => ({ loading: { ...s.loading, alerts: false } }));
    }
  },
  dismissAlert: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    })),
  acknowledgeAlert: async (id) => {
    try {
      await cloudpilotApi.acknowledgeAlert(Number(id));
      set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)) }));
      toast({ title: 'Alert acknowledged', description: 'The alert has been acknowledged.' });
    } catch (error) {
      toast({ title: 'Unable to acknowledge alert', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  },
  createDeployment: async (payload) => {
    set((s) => ({ actionLoading: { ...s.actionLoading, deploy: 'create' } }));
    try {
      const deployment = await cloudpilotApi.createDeployment(payload);
      set((s) => ({ deployments: [mapDeployment(deployment), ...s.deployments] }));
      toast({ title: 'Deployment queued', description: `${deployment.name} is now building.` });
    } catch (error) {
      toast({ title: 'Deployment failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      set((s) => ({ actionLoading: { ...s.actionLoading, deploy: null } }));
    }
  },
  triggerDeploy: async (serviceId) => {
    set((s) => ({ actionLoading: { ...s.actionLoading, deploy: serviceId } }));
    try {
      const target = get().deployments.find((item) => item.id === serviceId);
      if (!target) return;
      const deployment = await cloudpilotApi.createDeployment({
        name: target.name,
        branch: target.branch,
        environment: target.environment,
        author: target.author,
      });
      set((s) => ({
        deployments: s.deployments.map((item) => (item.id === serviceId ? mapDeployment(deployment) : item)),
      }));
      toast({ title: 'Deploy started', description: `${deployment.name} deployment has started.` });
    } catch (error) {
      toast({ title: 'Deploy action failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      set((s) => ({ actionLoading: { ...s.actionLoading, deploy: null } }));
    }
  },
  restartDeployment: async (serviceId) => {
    set((s) => ({ actionLoading: { ...s.actionLoading, restart: serviceId } }));
    try {
      const deployment = await cloudpilotApi.restartDeployment(Number(serviceId));
      set((s) => ({
        deployments: s.deployments.map((item) => (item.id === serviceId ? mapDeployment(deployment) : item)),
      }));
      toast({ title: 'Restart initiated', description: `${deployment.name} is restarting.` });
    } catch (error) {
      toast({ title: 'Restart failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      set((s) => ({ actionLoading: { ...s.actionLoading, restart: null } }));
    }
  },
  rollbackDeployment: async (serviceId) => {
    set((s) => ({ actionLoading: { ...s.actionLoading, rollback: serviceId } }));
    try {
      const deployment = await cloudpilotApi.rollbackDeployment(Number(serviceId));
      set((s) => ({
        deployments: s.deployments.map((item) => (item.id === serviceId ? mapDeployment(deployment) : item)),
      }));
      toast({ title: 'Rollback initiated', description: `${deployment.name} rollback is in progress.` });
    } catch (error) {
      toast({ title: 'Rollback failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      set((s) => ({ actionLoading: { ...s.actionLoading, rollback: null } }));
    }
  },
  appendMetricFromSocket: (payload) => {
    const message = payload as Partial<{ timestamp: string; cpu: number; memory: number; network: number; request_count: number; latency: number }>;
    if (!message.timestamp) return;

    const point: MetricPoint = {
      time: new Date(message.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      cpu: Number(message.cpu ?? 0),
      memory: Number(message.memory ?? 0),
      network: Number(message.network ?? 0),
      requests: Number(message.request_count ?? 0),
      latency: Number(message.latency ?? 0),
    };

    set((s) => ({ metrics: [...s.metrics.slice(-47), point] }));
  },
  appendLogFromSocket: (payload) => {
    const message = payload as Partial<{ service: string; level: string; message: string; timestamp: string }>;
    if (!message.message || !message.timestamp) return;

    set((s) => ({
      logs: [
        {
          id: `ws-${Date.now()}`,
          service: message.service ?? 'system',
          level: parseLogLevel(message.level ?? 'info'),
          message: message.message,
          timestamp: new Date(message.timestamp).toLocaleTimeString('en-US', { hour12: false }),
        },
        ...s.logs,
      ].slice(0, 240),
    }));
  },
  getKpis: () => {
    const state = get();
    const liveAlerts = state.alerts.filter((a) => !a.dismissed);
    const activeDeployments = state.deployments.filter((d) => d.status === 'success' || d.status === 'building').length;
    const averageCpu = state.deployments.length > 0
      ? Math.round(state.deployments.reduce((sum, item) => sum + item.cpu, 0) / state.deployments.length)
      : 0;
    const errorRate = Number(((liveAlerts.filter((a) => a.severity === 'error').length / Math.max(liveAlerts.length, 1)) * 100).toFixed(1));
    const avgLatency = state.metrics.length > 0
      ? Math.round(state.metrics.reduce((sum, point) => sum + point.latency, 0) / state.metrics.length)
      : 0;

    return { activeDeployments, averageCpu, errorRate, avgLatency };
  },
}));
