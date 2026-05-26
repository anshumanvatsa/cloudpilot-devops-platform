import { RotateCcw, Play, Undo2, Search, SlidersHorizontal, ExternalLink, ScrollText, Copy, Check } from 'lucide-react';
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
  onViewLogs?: (deployment: Deployment) => void;
}

type PendingAction = { type: 'deploy' | 'restart' | 'rollback'; id: string; name: string } | null;

const filters: Array<{ label: string; value: 'all' | DeploymentStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Success', value: 'success' },
  { label: 'Building', value: 'building' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="ml-1 h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
      title="Copy URL"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function DeploymentTable({ data, actionLoading, onDeploy, onRestart, onRollback, onViewLogs }: DeploymentTableProps) {
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

  const isInProgress = (d: Deployment) =>
    d.status === 'queued' || d.status === 'cloning' || d.status === 'building';

  return (
    <div className="space-y-4">
      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="capitalize">Confirm {pendingAction?.type}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction
                ? `You are about to ${pendingAction.type} ${pendingAction.name}. This will trigger a real Docker operation.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingAction) return;
                if (pendingAction.type === 'deploy') void onDeploy(pendingAction.id);
                if (pendingAction.type === 'restart') void onRestart(pendingAction.id);
                if (pendingAction.type === 'rollback') void onRollback(pendingAction.id);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters bar */}
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
                    : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Service</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Branch</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Environment</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">URL</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Duration</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Author</th>
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
                  <td className="py-3 px-4">
                    <div className="font-medium text-foreground">{d.name}</div>
                    {d.commit && d.commit !== 'pending' && (
                      <code className="text-xs text-muted-foreground">{d.commit}</code>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">{d.branch}</code>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={d.status} />
                      {isInProgress(d) && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{d.environment}</td>
                  <td className="py-3 px-4 max-w-[180px]">
                    {d.url ? (
                      <div className="flex items-center">
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline truncate max-w-[120px] inline-block"
                          title={d.url}
                        >
                          {d.url.replace('http://', '')}
                        </a>
                        <CopyButton text={d.url} />
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">
                        {isInProgress(d) ? 'Deploying…' : '—'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{d.duration || '—'}</td>
                  <td className="py-3 px-4 text-muted-foreground">{d.author}</td>
                  <td className="py-3 px-4">
                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        {/* View logs */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => onViewLogs?.(d)}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-sky-400 hover:bg-sky-400/10"
                            >
                              <ScrollText className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Build Logs</TooltipContent>
                        </Tooltip>
                        {/* Redeploy */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => setPendingAction({ type: 'deploy', id: d.id, name: d.name })}
                              size="icon"
                              variant="ghost"
                              disabled={actionLoading.deploy === d.id || isInProgress(d)}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Redeploy</TooltipContent>
                        </Tooltip>
                        {/* Restart */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => setPendingAction({ type: 'restart', id: d.id, name: d.name })}
                              size="icon"
                              variant="ghost"
                              disabled={actionLoading.restart === d.id || d.status !== 'success'}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Restart Container</TooltipContent>
                        </Tooltip>
                        {/* Rollback */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => setPendingAction({ type: 'rollback', id: d.id, name: d.name })}
                              size="icon"
                              variant="ghost"
                              disabled={actionLoading.rollback === d.id || isInProgress(d)}
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10"
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
