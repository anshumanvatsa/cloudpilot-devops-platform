import { useEffect } from 'react';
import { connectLogsStream } from '@/services/cloudpilotApi';
import { useDashboardStore } from '@/store/dashboardStore';
import { useAuthStore } from '@/store/authStore';

export function useLogsSocket() {
  const appendLogFromSocket = useDashboardStore((state) => state.appendLogFromSocket);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const socket = connectLogsStream((payload) => {
      appendLogFromSocket(payload);
    });

    return () => {
      socket.close();
    };
  }, [isAuthenticated, appendLogFromSocket]);
}
