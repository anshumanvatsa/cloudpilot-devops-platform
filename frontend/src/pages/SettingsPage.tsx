import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your CloudPilot configuration</p>
      </div>

      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
          <Settings className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Settings</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Configure your organization, team members, integrations, and notification preferences.
        </p>
      </div>
    </motion.div>
  );
}
