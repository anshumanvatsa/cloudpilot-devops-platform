import { RotateCcw, Play, Undo2, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Deployment, DeploymentStatus } from '@/types/dashboard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeploymentTableProps {
  data: Deployment[];
  actionLoading: {
    deploy: string | null;
    restart: string | null;
    rollback: string | null;
  };
  onDeploy: (serviceId: string) => Promise<void>;
  onRestart: (serviceId: string) => Promise<void>;
  onRollback: (serviceId: string) => Promise<void>;
}

type PendingAction = { type: 'deploy' | 'restart' | 'rollback'; id: string; name: string } | null;

const filters: Array<{ label: string; value: 'all' | DeploymentStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Success', value: 'success' },
  { label: 'Building', value: 'building' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
];

export function DeploymentTable({ data, actionLoading, onDeploy, onRestart, onRollback }: DeploymentTableProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | DeploymentStatus>('all');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const textMatch =
        !query ||
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.author.toLowerCase().includes(query.toLowerCase()) ||
        item.branch.toLowerCase().includes(query.toLowerCase());
      const statusMatch = status === 'all' || item.status === status;
      return textMatch && statusMatch;
    });
  }, [data, query, status]);

  return (
    <div className="space-y-4">
      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="capitalize">Confirm {pendingAction?.type}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction
                ? `You are about to ${pendingAction.type} ${pendingAction.name}. This action will trigger a backend workflow.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingAction) return;
                if (pendingAction.type === 'deploy') {
                  void onDeploy(pendingAction.id);
                }
                if (pendingAction.type === 'restart') {
                  void onRestart(pendingAction.id);
                }
                if (pendingAction.type === 'rollback') {
                  void onRollback(pendingAction.id);
                }
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="glass-card rounded-2xl p-4 md:p-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search service, branch, author"
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <span className="inline-flex items-center text-xs text-muted-foreground mr-1">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> Status
            </span>
            {filters.map((item) => (
              <button
                key={item.value}
                onClick={() => setStatus(item.value)}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-medium border transition-colors',
                  status === item.value
                    ? 'bg-primary/15 text-primary border-primary/25'
                    : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1024px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Service</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Branch</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Environment</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Author</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">CPU</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">RPM</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <motion.tr
                  key={d.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-muted/25 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-foreground">{d.name}</td>
                  <td className="py-3 px-4">
                    <code className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">{d.branch}</code>
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={d.status} /></td>
                  <td className="py-3 px-4 text-muted-foreground">{d.environment}</td>
                  <td className="py-3 px-4 text-muted-foreground">{d.author}</td>
                  <td className="py-3 px-4 text-muted-foreground">{d.cpu}%</td>
                  <td className="py-3 px-4 text-muted-foreground">{d.requestsPerMin.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => setPendingAction({ type: 'deploy', id: d.id, name: d.name })}
                              size="icon"
                              variant="ghost"
                              disabled={actionLoading.deploy === d.id}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Deploy</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => setPendingAction({ type: 'restart', id: d.id, name: d.name })}
                              size="icon"
                              variant="ghost"
                              disabled={actionLoading.restart === d.id}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Restart</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => setPendingAction({ type: 'rollback', id: d.id, name: d.name })}
                              size="icon"
                              variant="ghost"
                              disabled={actionLoading.rollback === d.id}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rollback</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
