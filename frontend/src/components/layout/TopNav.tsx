import { Search, Bell, User, PanelLeftOpen } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthStore } from '@/store/authStore';

export function TopNav() {
  const { sidebarCollapsed, alerts, toggleMobileNav } = useDashboardStore();
  const { logout, user } = useAuthStore();
  const isMobile = useIsMobile();
  const activeAlerts = alerts.filter((a) => !a.dismissed).length;

  return (
    <motion.header
      animate={{ marginLeft: isMobile ? 0 : sidebarCollapsed ? 80 : 248 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="sticky top-0 z-20 h-16 border-b border-border bg-background/75 backdrop-blur-xl flex items-center justify-between px-4 md:px-6"
    >
      {/* Search */}
      <div className="relative max-w-md flex-1 flex items-center gap-2">
        {isMobile && (
          <button
            aria-label="Open menu"
            onClick={toggleMobileNav}
            className="h-9 w-9 rounded-xl border border-border/70 bg-card/70 text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex items-center justify-center"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search services, deployments..."
          className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
        />
        <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="h-5 w-5" />
          {activeAlerts > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {activeAlerts}
            </span>
          )}
        </button>
        <button
          onClick={logout}
          className="text-xs text-muted-foreground hover:text-foreground hidden md:inline-flex"
          title="Sign out"
        >
          {user?.email ?? 'Sign out'}
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary via-[hsl(252,82%,69%)] to-[hsl(199,89%,48%)] flex items-center justify-center shadow-lg shadow-primary/20">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      </div>
    </motion.header>
  );
}
