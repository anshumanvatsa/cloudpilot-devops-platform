import { useEffect } from 'react';
import { connectMetricsStream } from '@/services/cloudpilotApi';
import { useDashboardStore } from '@/store/dashboardStore';
import { useAuthStore } from '@/store/authStore';

export function useMetricsSocket() {
  const appendMetricFromSocket = useDashboardStore((state) => state.appendMetricFromSocket);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const socket = connectMetricsStream((payload) => {
      appendMetricFromSocket(payload);
    });

    return () => {
      socket.close();
    };
  }, [isAuthenticated, appendMetricFromSocket]);
}
