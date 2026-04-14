import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { Play, PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeploymentTable } from '@/components/deployments/DeploymentTable';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function DeploymentsPage() {
  const { deployments, loading, loadDeployments, triggerDeploy, restartDeployment, rollbackDeployment, createDeployment, actionLoading } = useDashboardStore();

  useEffect(() => {
    void loadDeployments();
  }, [loadDeployments]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deployments</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and monitor your deployments</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => void createDeployment({ name: 'service-' + Math.floor(Math.random() * 9999), branch: 'main', environment: 'Production', author: 'cloudpilot' })}
          disabled={actionLoading.deploy === 'create'}
        >
          <Play className="h-4 w-4 mr-2" /> New Deploy
        </Button>
      </div>

      {loading.deployments ? (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-2xl bg-muted/50" />
          <Skeleton className="h-[480px] rounded-2xl bg-muted/45" />
        </div>
      ) : deployments.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No deployments yet"
          description="Kick off your first deployment and CloudPilot will track release health, rollback history, and runtime telemetry here."
        />
      ) : (
        <DeploymentTable
          data={deployments}
          actionLoading={actionLoading}
          onDeploy={triggerDeploy}
          onRestart={restartDeployment}
          onRollback={rollbackDeployment}
        />
      )}
    </motion.div>
  );
}
