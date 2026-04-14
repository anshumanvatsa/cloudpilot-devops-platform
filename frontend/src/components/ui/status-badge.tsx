import { cn } from '@/lib/utils';
import { DeploymentStatus } from '@/types/dashboard';

const config: Record<DeploymentStatus, { label: string; className: string }> = {
  success: { label: 'Success', className: 'bg-success/10 text-success border-success/20' },
  failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20' },
  building: { label: 'Building', className: 'bg-primary/10 text-primary border-primary/20' },
};

export function StatusBadge({ status }: { status: DeploymentStatus }) {
  const c = config[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border', c.className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', {
        'bg-success': status === 'success',
        'bg-destructive': status === 'failed',
        'bg-warning': status === 'pending',
        'bg-primary animate-pulse': status === 'building',
      })} />
      {c.label}
    </span>
  );
}
