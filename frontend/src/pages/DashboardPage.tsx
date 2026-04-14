import { motion } from 'framer-motion';
import { Rocket, Cpu, AlertTriangle, Zap, Activity } from 'lucide-react';
import { useEffect } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { AreaChartCard } from '@/components/charts/AreaChartCard';
import { useDashboardStore } from '@/store/dashboardStore';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function DashboardPage() {
  const { metrics, loading, getKpis, alerts, loadDashboardData } = useDashboardStore();

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const kpis = getKpis();
  const activeAlerts = alerts.filter((item) => !item.dismissed).length;
  const requestsData = metrics.map((point) => ({ time: point.time, requests: point.requests }));
  const latencyData = metrics.map((point) => ({ time: point.time, latency: point.latency }));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time overview of your cloud estate and release health</p>
      </div>

      {loading.dashboard ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Deployments" value={kpis.activeDeployments} change="+3 this week" changeType="positive" icon={Rocket} delay={0} />
          <StatCard title="CPU Usage" value={`${kpis.averageCpu}%`} change="Stable over last 30m" changeType="neutral" icon={Cpu} delay={1} />
          <StatCard title="Error Rate" value={`${kpis.errorRate}%`} change={activeAlerts > 2 ? 'Needs attention' : 'Within SLO'} changeType={activeAlerts > 2 ? 'negative' : 'positive'} icon={AlertTriangle} delay={2} />
          <StatCard title="Avg Response" value={`${kpis.avgLatency}ms`} change="-11ms vs previous hour" changeType="positive" icon={Zap} delay={3} />
        </div>
      )}

      {metrics.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Metrics feed unavailable"
          description="No telemetry points are currently available. Connect a source or wait for data ingestion."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AreaChartCard
            title="Requests Over Time"
            subtitle="Rolling traffic across active edge regions"
            data={requestsData}
            dataKey="requests"
            color="hsl(239, 84%, 67%)"
            gradientId="reqGradient"
            valueFormatter={(value) => `${Math.round(value).toLocaleString()} rpm`}
          />
          <AreaChartCard
            title="Latency (ms)"
            subtitle="P95 response latency from gateway"
            data={latencyData}
            dataKey="latency"
            color="hsl(199, 89%, 48%)"
            gradientId="latGradient"
            valueFormatter={(value) => `${Math.round(value)}ms`}
          />
        </div>
      )}
    </motion.div>
  );
}
