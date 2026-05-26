import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { PackageSearch, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeploymentTable } from '@/components/deployments/DeploymentTable';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { NewDeploymentDialog } from '@/components/deployments/NewDeploymentDialog';
import { BuildLogsDrawer } from '@/components/deployments/BuildLogsDrawer';
import { Deployment } from '@/types/dashboard';

export default function DeploymentsPage() {
  const {
    deployments,
    loading,
    loadDeployments,
    triggerDeploy,
    restartDeployment,
    rollbackDeployment,
    createDeployment,
    actionLoading,
  } = useDashboardStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [logsTarget, setLogsTarget] = useState<Deployment | null>(null);

  useEffect(() => {
    void loadDeployments();
  }, [loadDeployments]);

  // Poll for status changes while any deployment is in-progress
  useEffect(() => {
    const inProgress = deployments.some(
      (d) => d.status === 'queued' || d.status === 'cloning' || d.status === 'building',
    );
    if (!inProgress) return;
    const timer = setInterval(() => void loadDeployments(), 4000);
    return () => clearInterval(timer);
  }, [deployments, loadDeployments]);

  const handleDeploy = async (payload: {
    name: string;
    repo_url: string;
    branch: string;
    environment: string;
    author: string;
    port: number;
  }) => {
    await createDeployment(payload);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deployments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and ship from GitHub — get a live URL instantly
          </p>
        </div>
        <Button
          id="new-deployment-btn"
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New Deployment
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
          description="Click 'New Deployment', paste your GitHub repo URL and CloudPilot will build, containerise, and deploy it — giving you a live URL."
        />
      ) : (
        <DeploymentTable
          data={deployments}
          actionLoading={actionLoading}
          onDeploy={triggerDeploy}
          onRestart={restartDeployment}
          onRollback={rollbackDeployment}
          onViewLogs={(deployment) => setLogsTarget(deployment)}
        />
      )}

      {/* New Deployment Dialog */}
      <NewDeploymentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onDeploy={handleDeploy}
        loading={actionLoading.deploy === 'create'}
      />

      {/* Build Logs Drawer */}
      <BuildLogsDrawer
        open={logsTarget !== null}
        onClose={() => setLogsTarget(null)}
        deploymentId={logsTarget ? parseInt(logsTarget.id) : null}
        deploymentName={logsTarget?.name ?? ''}
        status={logsTarget?.status}
        url={logsTarget?.url}
      />
    </motion.div>
  );
}
