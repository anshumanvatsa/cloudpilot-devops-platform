import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { AreaChartCard } from '@/components/charts/AreaChartCard';
import { useDashboardStore } from '@/store/dashboardStore';
import { Skeleton } from '@/components/ui/skeleton';
import { useMetricsSocket } from '@/hooks/useMetricsSocket';

export default function MonitoringPage() {
  const { metrics, loading, loadMetrics } = useDashboardStore();
  useMetricsSocket();

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const cpuData = metrics.map((item) => ({ time: item.time, cpu: item.cpu }));
  const memoryData = metrics.map((item) => ({ time: item.time, memory: item.memory }));
  const networkData = metrics.map((item) => ({ time: item.time, network: item.network }));
  const rpsData = metrics.map((item) => ({ time: item.time, requests: item.requests }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time infrastructure metrics and traffic behavior</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs text-success">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" /> Live stream connected
        </span>
      </div>

      {loading.monitoring ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-2xl bg-muted/50" />
          <Skeleton className="h-72 rounded-2xl bg-muted/50" />
          <Skeleton className="h-72 rounded-2xl bg-muted/45" />
          <Skeleton className="h-72 rounded-2xl bg-muted/45" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AreaChartCard title="CPU Usage" subtitle="Application nodes" data={cpuData} dataKey="cpu" color="hsl(239, 84%, 67%)" gradientId="cpuG" valueFormatter={(v) => `${Math.round(v)}%`} />
          <AreaChartCard title="Memory Usage" subtitle="Container memory footprint" data={memoryData} dataKey="memory" color="hsl(142, 71%, 45%)" gradientId="memG" valueFormatter={(v) => `${Math.round(v)}%`} />
          <AreaChartCard title="Network Throughput" subtitle="Cross-region bandwidth" data={networkData} dataKey="network" color="hsl(38, 92%, 50%)" gradientId="netG" valueFormatter={(v) => `${Math.round(v)} MB/s`} />
          <AreaChartCard title="Requests Per Minute" subtitle="Global ingress" data={rpsData} dataKey="requests" color="hsl(199, 89%, 48%)" gradientId="rpsG" valueFormatter={(v) => `${Math.round(v).toLocaleString()}`} />
        </div>
      )}
    </motion.div>
  );
}
