import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, GitBranch, Rocket, Globe, Terminal, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NewDeploymentDialogProps {
  open: boolean;
  onClose: () => void;
  onDeploy: (payload: {
    name: string;
    repo_url: string;
    branch: string;
    environment: string;
    author: string;
    port: number;
  }) => Promise<void>;
  loading?: boolean;
}

const ENVIRONMENTS = ['Production', 'Staging', 'Preview'] as const;

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Input({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon: Icon,
  error,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ElementType;
  error?: string;
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-11 rounded-xl bg-muted/50 border text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all',
          Icon ? 'pl-10 pr-4' : 'px-4',
          error ? 'border-destructive/60' : 'border-border',
        )}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

export function NewDeploymentDialog({ open, onClose, onDeploy, loading }: NewDeploymentDialogProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [serviceName, setServiceName] = useState('');
  const [environment, setEnvironment] = useState<typeof ENVIRONMENTS[number]>('Production');
  const [port, setPort] = useState('3000');
  const [author, setAuthor] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [envOpen, setEnvOpen] = useState(false);

  // Auto-fill service name from repo URL
  const handleRepoChange = (url: string) => {
    setRepoUrl(url);
    if (!serviceName) {
      const match = url.match(/\/([^/]+?)(?:\.git)?$/);
      if (match) setServiceName(match[1].toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!repoUrl.trim()) errs.repoUrl = 'Repository URL is required';
    else if (!/^https?:\/\//.test(repoUrl)) errs.repoUrl = 'Must be an HTTPS URL (e.g. https://github.com/user/repo)';
    if (!serviceName.trim()) errs.serviceName = 'Service name is required';
    else if (serviceName.length < 2) errs.serviceName = 'Must be at least 2 characters';
    const portNum = parseInt(port, 10);
    if (!port || isNaN(portNum) || portNum < 1 || portNum > 65535) errs.port = 'Enter a valid port (1–65535)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onDeploy({
      name: serviceName.trim(),
      repo_url: repoUrl.trim(),
      branch: branch.trim() || 'main',
      environment,
      author: author.trim() || 'cloudpilot',
      port: parseInt(port, 10),
    });
    // Reset form
    setRepoUrl('');
    setBranch('main');
    setServiceName('');
    setEnvironment('Production');
    setPort('3000');
    setAuthor('');
    setErrors({});
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl shadow-black/40"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Rocket className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">New Deployment</h2>
                    <p className="text-xs text-muted-foreground">Deploy from a GitHub repository</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <Field
                  label="Repository URL"
                  hint="Must be a public GitHub repo or one accessible with your configured SSH key"
                >
                  <Input
                    id="repo-url"
                    value={repoUrl}
                    onChange={handleRepoChange}
                    placeholder="https://github.com/username/my-app"
                    icon={Github}
                    error={errors.repoUrl}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Branch">
                    <Input
                      id="branch"
                      value={branch}
                      onChange={setBranch}
                      placeholder="main"
                      icon={GitBranch}
                    />
                  </Field>

                  <Field label="App Port" hint="Port your app listens on">
                    <Input
                      id="port"
                      value={port}
                      onChange={setPort}
                      placeholder="3000"
                      type="number"
                      icon={Terminal}
                      error={errors.port}
                    />
                  </Field>
                </div>

                <Field label="Service Name" hint="Used as the container name and URL slug">
                  <Input
                    id="service-name"
                    value={serviceName}
                    onChange={setServiceName}
                    placeholder="my-awesome-app"
                    error={errors.serviceName}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  {/* Environment selector */}
                  <Field label="Environment">
                    <div className="relative">
                      <button
                        id="environment-selector"
                        onClick={() => setEnvOpen((o) => !o)}
                        className="w-full h-11 rounded-xl bg-muted/50 border border-border px-4 text-sm text-foreground flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          {environment}
                        </span>
                        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', envOpen && 'rotate-180')} />
                      </button>
                      <AnimatePresence>
                        {envOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-card border border-border shadow-xl z-10 overflow-hidden"
                          >
                            {ENVIRONMENTS.map((env) => (
                              <button
                                key={env}
                                onClick={() => { setEnvironment(env); setEnvOpen(false); }}
                                className={cn(
                                  'w-full px-4 py-2.5 text-sm text-left hover:bg-muted/50 transition-colors',
                                  environment === env && 'text-primary font-medium',
                                )}
                              >
                                {env}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Field>

                  <Field label="Deployer" hint="Optional">
                    <Input
                      id="author"
                      value={author}
                      onChange={setAuthor}
                      placeholder="your-name"
                    />
                  </Field>
                </div>

                {/* Info box */}
                <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">📋 Requirements</p>
                  <p>• Your repo must have a <code className="bg-muted px-1 rounded">Dockerfile</code> at the root</p>
                  <p>• Your app must listen on the port you specify above</p>
                  <p>• Docker must be running on this machine</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
                <Button variant="outline" onClick={onClose} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  id="deploy-button"
                  onClick={() => void handleSubmit()}
                  disabled={loading}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                      Deploying…
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Deploy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
