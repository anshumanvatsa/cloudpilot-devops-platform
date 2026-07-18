import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Globe, GitBranch, Clock, ExternalLink, ChevronRight, PackageSearch, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { NewDeploymentDialog } from '@/components/deployments/NewDeploymentDialog';
import { BuildLogsDrawer } from '@/components/deployments/BuildLogsDrawer';
import { cloudpilotApi, ProjectDto } from '@/services/cloudpilotApi';
import { toast } from '@/hooks/use-toast';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/lib/utils';

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function UrlCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
      title="Copy URL"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function ProjectCard({ project, onViewLogs }: { project: ProjectDto; onViewLogs: (id: number, name: string, status: string, url: string | null, errorSummary: string | null) => void }) {
  const latest = project.latest;
  const isLive = latest.status === 'success';
  const inProgress = latest.status === 'queued' || latest.status === 'cloning' || latest.status === 'building';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-5 hover:border-primary/30 transition-all duration-200 group cursor-pointer"
      onClick={() => onViewLogs(latest.id, project.name, latest.status, latest.url, latest.error_summary ?? null)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold',
            isLive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/15 text-primary',
          )}>
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            {latest.repo_url && (
              <p className="text-xs text-muted-foreground truncate">
                {latest.repo_url.replace('https://github.com/', '')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={latest.status} />
          {inProgress && <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />}
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>

      {/* Live URL */}
      {isLive && latest.url && (
        <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
          <Globe className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <a
            href={latest.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2 truncate flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            {latest.url}
          </a>
          <UrlCopyButton url={latest.url} />
          <a
            href={latest.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded text-muted-foreground hover:text-emerald-400 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {inProgress && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/15">
          <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
          <span className="text-xs text-amber-400 capitalize">{latest.status}…</span>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          {latest.branch}
        </span>
        {latest.commit && latest.commit !== 'pending' && (
          <code className="font-mono">{latest.commit}</code>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="h-3 w-3" />
          {formatRelative(latest.created_at)}
        </span>
      </div>

      {/* Deployments count */}
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {project.total_deployments} deployment{project.total_deployments !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-muted-foreground">by {latest.author}</span>
      </div>
    </motion.div>
  );
}

export default function ProjectsPage() {
  const { createDeployment, actionLoading } = useDashboardStore();
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logsTarget, setLogsTarget] = useState<{
    id: number;
    name: string;
    status: string;
    url: string | null;
    errorSummary: string | null;
  } | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await cloudpilotApi.projects();
      setProjects(res);
    } catch {
      toast({ title: 'Failed to load projects', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProjects();
  }, []);

  // Poll while any project is building
  useEffect(() => {
    const inProgress = projects.some(
      (p) => p.latest.status === 'queued' || p.latest.status === 'cloning' || p.latest.status === 'building',
    );
    if (!inProgress) return;
    const timer = setInterval(() => void fetchProjects(), 4000);
    return () => clearInterval(timer);
  }, [projects]);

  const handleDeploy = async (payload: {
    name: string;
    repo_url: string;
    branch: string;
    environment: string;
    author: string;
    port: number;
  }) => {
    await createDeployment(payload);
    void fetchProjects();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deploy from GitHub — each project gets a live URL instantly
          </p>
        </div>
        <Button
          id="new-project-btn"
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl bg-muted/40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No projects yet"
          description="Click 'New Project', paste a GitHub repo URL and CloudPilot will build, containerise, and deploy it. You'll get a live URL you can share with anyone."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.name}
              project={project}
              onViewLogs={(id, name, status, url, errorSummary) =>
                setLogsTarget({ id, name, status, url, errorSummary })
              }
            />
          ))}
        </div>
      )}

      <NewDeploymentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onDeploy={handleDeploy}
        loading={actionLoading.deploy === 'create'}
      />

      <BuildLogsDrawer
        open={logsTarget !== null}
        onClose={() => setLogsTarget(null)}
        deploymentId={logsTarget?.id ?? null}
        deploymentName={logsTarget?.name ?? ''}
        status={logsTarget?.status}
        url={logsTarget?.url}
        errorSummary={logsTarget?.errorSummary ?? undefined}
      />
    </motion.div>
  );
}
