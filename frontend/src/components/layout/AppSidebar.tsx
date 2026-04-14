import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Rocket,
  Activity,
  ScrollText,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Rocket, label: 'Deployments', path: '/deployments' },
  { icon: Activity, label: 'Monitoring', path: '/monitoring' },
  { icon: ScrollText, label: 'Logs', path: '/logs' },
  { icon: Bell, label: 'Alerts', path: '/alerts' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, closeMobileNav } = useDashboardStore();
  const location = useLocation();
  const isMobile = useIsMobile();

  const sidebarVisible = !isMobile || mobileNavOpen;
  const showLabel = !sidebarCollapsed || isMobile;

  return (
    <>
      {isMobile && sidebarVisible && (
        <button
          aria-label="Close navigation menu"
          onClick={closeMobileNav}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
        />
      )}
      <motion.aside
        animate={
          isMobile
            ? { x: sidebarVisible ? 0 : -280, width: 272 }
            : { x: 0, width: sidebarCollapsed ? 80 : 248 }
        }
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-screen z-40 flex flex-col border-r border-border bg-sidebar/95 backdrop-blur-xl"
      >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xl">🚀</span>
          {showLabel && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-foreground whitespace-nowrap"
            >
              CloudPilot
            </motion.span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={isMobile ? closeMobileNav : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <item.icon className="h-5 w-5 shrink-0 relative z-10" />
              {showLabel && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative z-10 whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        disabled={isMobile}
        className="flex items-center justify-center h-12 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
      </motion.aside>
    </>
  );
}
