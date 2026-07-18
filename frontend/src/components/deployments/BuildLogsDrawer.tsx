import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, CheckCircle2, XCircle, Loader2, ExternalLink, Copy, Check, AlertTriangle } from 'lucide-react';
import { connectBuildStream, cloudpilotApi } from '@/services/cloudpilotApi';
import { cn } from '@/lib/utils';

interface BuildLogsDrawerProps {
  open: boolean;
  onClose: () => void;
  deploymentId: number | null;
  deploymentName: string;
  initialLogs?: string;   // Pre-fetched logs for completed deployments
  errorSummary?: string;  // Human-readable error reason
  status?: string;
  url?: string | null;
}

function LogLine({ line }: { line: string }) {
  const isError = /error|failed|fatal/i.test(line);
  const isSuccess = /✅|success|done|complete/i.test(line);
  const isStep = /^(🔄|🔨|🚀|🔍|📋)/u.test(line);
  const isWarning = /warn|warning/i.test(line);
  const isDivider = line.startsWith('---');

  return (
    <div
      className={cn(
        'font-mono text-xs leading-5 px-4 py-0.5 whitespace-pre-wrap break-all',
        isError && 'text-red-400 bg-red-950/20',
        isSuccess && 'text-emerald-400',
        isStep && 'text-sky-400 font-medium py-1.5',
        isWarning && !isError && 'text-amber-400',
        isDivider && 'text-muted-foreground/40 border-t border-border/20 pt-2 mt-1',
        !isError && !isSuccess && !isStep && !isWarning && !isDivider && 'text-muted-foreground',
      )}
    >
      {line || '\u00a0'}
    </div>
  );
}

export function BuildLogsDrawer({
  open,
  onClose,
  deploymentId,
  deploymentName,
  initialLogs,
  errorSummary,
  status: initialStatus,
  url: initialUrl,
}: BuildLogsDrawerProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [copied, setCopied] = useState(false);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Determine if this is a completed deployment (no streaming needed)
  const isCompleted = initialStatus === 'success' || initialStatus === 'failed';

  useEffect(() => {
    if (!open || !deploymentId) return;

    // Reset state
    setLines([]);
    setDone(false);
    setFailed(false);
    setUrl(initialUrl ?? null);

    // If deployment already completed, show stored logs
    if (isCompleted) {
      setDone(true);
      setFailed(initialStatus === 'failed');

      if (initialLogs) {
        // Logs were pre-passed from the parent
        setLines(initialLogs.split('\n').filter(l => l.trim() !== ''));
      } else {
        // Fetch stored logs from the API
        setFetchingLogs(true);
        cloudpilotApi.getDeploymentLogs(deploymentId)
          .then(res => {
            const log = res.data?.logs || '';
            setLines(log.split('\n').filter((l: string) => l.trim() !== ''));
          })
          .catch(() => setLines(['Could not load build logs.']))
          .finally(() => setFetchingLogs(false));
      }
      return;
    }

    // Otherwise stream live
    const ws = connectBuildStream(
      deploymentId,
      (line) => setLines((prev) => [...prev, line]),
      (deployedUrl, isFailed) => {
        setDone(true);
        setFailed(!!isFailed);
        if (deployedUrl) setUrl(deployedUrl);
      },
    );
    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [open, deploymentId, isCompleted, initialLogs, initialStatus, initialUrl]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleCopyUrl = () => {
    if (!url) return;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl flex flex-col bg-[#0d1117] border-l border-border shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Terminal className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{deploymentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {done
                      ? failed
                        ? 'Build failed'
                        : 'Deployment successful'
                      : 'Build in progress…'}
                  </p>
                </div>
                {!done && (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                )}
                {done && !failed && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                {done && failed && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Success URL banner */}
            {done && !failed && url && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-3 px-5 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex-shrink-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-emerald-300 font-medium">Live at:</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 underline underline-offset-2 hover:text-emerald-300 truncate"
                  >
                    {url}
                  </a>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleCopyUrl}
                    className="h-7 px-2 rounded-lg text-xs flex items-center gap-1.5 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 px-2 rounded-lg text-xs flex items-center gap-1.5 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                </div>
              </motion.div>
            )}

            {/* Failed banner — shows human-readable reason */}
            {done && failed && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-shrink-0 border-b border-red-500/20"
              >
                <div className="flex items-start gap-2.5 px-5 py-3 bg-red-500/10">
                  <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-red-300 mb-0.5">Deployment Failed</p>
                    <p className="text-xs text-red-400/90 leading-relaxed">
                      {errorSummary || 'Build failed — see logs below for details.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Log output */}
            <div className="flex-1 overflow-y-auto py-3 font-mono">
              {fetchingLogs && (
                <div className="flex items-center gap-2 px-4 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading build logs…
                </div>
              )}
              {!fetchingLogs && lines.length === 0 && !done && (
                <div className="flex items-center gap-2 px-4 py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Connecting to build stream…
                </div>
              )}
              {!fetchingLogs && lines.length === 0 && done && (
                <div className="px-4 py-6 text-xs text-muted-foreground">
                  No build log available.
                </div>
              )}
              {lines.map((line, idx) => (
                <LogLine key={idx} line={line} />
              ))}
              {!done && lines.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground/60">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Building…</span>
                  <span className="animate-pulse">▌</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-muted-foreground">
                {lines.length} lines
              </span>
              {done && (
                <span className={cn(
                  'text-xs font-medium px-2.5 py-1 rounded-full',
                  failed
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-emerald-500/15 text-emerald-400',
                )}>
                  {failed ? 'Failed' : 'Success'}
                </span>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
