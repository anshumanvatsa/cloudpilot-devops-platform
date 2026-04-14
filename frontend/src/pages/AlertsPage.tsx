import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { AlertTriangle, AlertCircle, Info, X, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const severityConfig = {
  error: { icon: AlertCircle, borderClass: 'border-l-destructive', bgClass: 'bg-destructive/5', iconClass: 'text-destructive' },
  warning: { icon: AlertTriangle, borderClass: 'border-l-warning', bgClass: 'bg-warning/5', iconClass: 'text-warning' },
  info: { icon: Info, borderClass: 'border-l-primary', bgClass: 'bg-primary/5', iconClass: 'text-primary' },
};

export default function AlertsPage() {
  const { alerts, dismissAlert, acknowledgeAlert, loading, loadAlerts } = useDashboardStore();

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const active = alerts.filter((a) => !a.dismissed);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">{active.length} active alerts</p>
      </div>

      {loading.alerts ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-2xl bg-muted/45" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
        <AnimatePresence>
          {active.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;
            return (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                className={cn('glass-card rounded-2xl p-5 border-l-4 hover-lift', config.borderClass, config.bgClass)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.iconClass)} />
                    <div>
                      <h3 className="font-semibold text-foreground">{alert.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                        {!alert.acknowledged && (
                          <button
                            onClick={() => void acknowledgeAlert(alert.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-card/70 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            <CheckCheck className="h-3 w-3" />
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {active.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-success/10 mb-4">
              <Info className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">All Clear</h3>
            <p className="text-sm text-muted-foreground mt-1">No active alerts at this time</p>
          </motion.div>
        )}
        </div>
      )}
    </motion.div>
  );
}
