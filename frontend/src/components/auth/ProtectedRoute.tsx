import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { PageSkeleton } from '@/components/ui/page-skeleton';

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuthStore();

  if (isBootstrapping) {
    return (
      <div className="p-6">
        <PageSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
