export type DeploymentStatus = 'success' | 'failed' | 'pending' | 'building';

export interface Deployment {
  id: string;
  name: string;
  branch: string;
  status: DeploymentStatus;
  environment: 'Production' | 'Staging' | 'Preview';
  commit: string;
  author: string;
  duration: string;
  timestamp: string;
  cpu: number;
  requestsPerMin: number;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
}

export type AlertSeverity = 'error' | 'warning' | 'info';

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  dismissed: boolean;
  acknowledged: boolean;
}

export interface MetricPoint {
  time: string;
  cpu: number;
  memory: number;
  network: number;
  requests: number;
  latency: number;
}

export interface DashboardKpis {
  activeDeployments: number;
  averageCpu: number;
  errorRate: number;
  avgLatency: number;
}
