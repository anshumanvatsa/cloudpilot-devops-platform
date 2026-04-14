import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loginLoading, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('admin@cloudpilot.io');
  const [password, setPassword] = useState('admin123');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = await login(email, password);
    if (success) {
      toast({ title: 'Login successful', description: 'Welcome back to CloudPilot.' });
      navigate('/dashboard');
      return;
    }

    toast({
      title: 'Unable to sign in',
      description: 'Invalid credentials',
      variant: 'destructive',
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-7 md:p-8">
        <div className="mb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary inline-flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">CloudPilot Console</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to access deployments and infrastructure telemetry.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>
          <Button type="submit" className="w-full h-11 rounded-xl" disabled={loginLoading}>
            <LogIn className="h-4 w-4" />
            {loginLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
}
