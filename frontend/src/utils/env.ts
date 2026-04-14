export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? 'CloudPilot Console',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  logLevel: import.meta.env.VITE_LOG_LEVEL ?? 'info',
};
