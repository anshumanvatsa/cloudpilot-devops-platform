import { cn } from '@/lib/utils';
import { DeploymentStatus } from '@/types/dashboard';

const config: Record<DeploymentStatus, { label: string; className: string; pulse?: boolean }> = {
  success: { label: 'Live', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20' },
  building: { label: 'Building', className: 'bg-primary/10 text-primary border-primary/20', pulse: true },
  queued: { label: 'Queued', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  cloning: { label: 'Cloning', className: 'bg-sky-500/10 text-sky-400 border-sky-500/20', pulse: true },
  stopped: { label: 'Stopped', className: 'bg-muted/50 text-muted-foreground border-border' },
};

const dotColor: Record<DeploymentStatus, string> = {
  success: 'bg-emerald-500',
  failed: 'bg-destructive',
  pending: 'bg-warning',
  building: 'bg-primary animate-pulse',
  queued: 'bg-slate-400',
  cloning: 'bg-sky-400 animate-pulse',
  stopped: 'bg-muted-foreground',
};

export function StatusBadge({ status }: { status: DeploymentStatus | string }) {
  const safeStatus = (status in config ? status : 'pending') as DeploymentStatus;
  const c = config[safeStatus];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border', c.className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dotColor[safeStatus])} />
      {c.label}
    </span>
  );
}
