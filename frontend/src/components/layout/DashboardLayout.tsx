import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppSidebar } from './AppSidebar';
import { TopNav } from './TopNav';
import { useDashboardStore } from '@/store/dashboardStore';
import { useIsMobile } from '@/hooks/use-mobile';

export function DashboardLayout() {
  const { sidebarCollapsed } = useDashboardStore();
  const isMobile = useIsMobile();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AppSidebar />
      <TopNav />
      <motion.main
        animate={{ marginLeft: isMobile ? 0 : sidebarCollapsed ? 80 : 248 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="px-4 py-5 md:px-6 md:py-6"
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </motion.main>
    </div>
  );
}
