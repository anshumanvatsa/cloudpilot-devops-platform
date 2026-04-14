import { motion } from 'framer-motion';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Search, Terminal, PauseCircle, PlayCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useLogsSocket } from '@/hooks/useLogsSocket';

const levelColors: Record<string, string> = {
  info: 'text-primary',
  warn: 'text-warning',
  error: 'text-destructive',
  debug: 'text-muted-foreground',
};

const levelBg: Record<string, string> = {
  info: 'bg-primary/10',
  warn: 'bg-warning/10',
  error: 'bg-destructive/10',
  debug: 'bg-muted/50',
};

export default function LogsPage() {
  const { logs, loading, loadLogs } = useDashboardStore();
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  useLogsSocket();

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLogs({ q: filter || undefined, level: levelFilter || undefined, page: 1, page_size: 120 });
    }, 250);
    return () => clearTimeout(timer);
  }, [filter, levelFilter, loadLogs]);

  const filtered = logs;

  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filtered, autoScroll]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">Live service logs</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter logs..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        {['info', 'warn', 'error', 'debug'].map((level) => (
          <button
            key={level}
            onClick={() => setLevelFilter(levelFilter === level ? null : level)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize',
              levelFilter === level
                ? `${levelBg[level]} ${levelColors[level]} border-current/20`
                : 'bg-muted border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {level}
          </button>
        ))}
      </div>

      {loading.logs ? (
        <Skeleton className="h-[560px] rounded-2xl bg-muted/45" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Terminal}
          title="No log entries match"
          description="Try clearing filters or changing log level selection to inspect different streams."
        />
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <div className="h-3 w-3 rounded-full bg-destructive/60" />
          <div className="h-3 w-3 rounded-full bg-warning/60" />
          <div className="h-3 w-3 rounded-full bg-success/60" />
          <span className="text-xs text-muted-foreground ml-2 font-mono">cloudpilot-logs</span>
          <button
            onClick={() => setAutoScroll((value) => !value)}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-border/80 bg-card/70 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {autoScroll ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
            {autoScroll ? 'Pause' : 'Resume'}
          </button>
        </div>
        <div className="p-4 h-[500px] overflow-y-auto font-mono text-sm space-y-1">
          {filtered.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex gap-3 py-1 hover:bg-muted/20 px-2 rounded"
            >
              <span className="text-muted-foreground shrink-0">{log.timestamp}</span>
              <span className={cn('uppercase font-bold w-12 shrink-0', levelColors[log.level])}>
                {log.level}
              </span>
              <span className="text-foreground/90">{log.message}</span>
            </motion.div>
          ))}
          <div ref={endRef} />
        </div>
        </div>
      )}
    </motion.div>
  );
}
