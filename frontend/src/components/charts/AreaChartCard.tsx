import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';

interface AreaChartCardProps {
  title: string;
  data: Array<Record<string, unknown>>;
  dataKey: string;
  color?: string;
  gradientId?: string;
  valueFormatter?: (value: number) => string;
  subtitle?: string;
}

export const AreaChartCard = memo(function AreaChartCard({
  title,
  data,
  dataKey,
  color = 'hsl(239, 84%, 67%)',
  gradientId = 'chartGradient',
  valueFormatter = (value) => value.toString(),
  subtitle,
}: AreaChartCardProps) {
  const latest = useMemo(() => {
    const point = data[data.length - 1]?.[dataKey];
    return typeof point === 'number' ? point : null;
  }, [data, dataKey]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35 }}
      className="glass-card rounded-2xl p-6 hover-lift"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {subtitle ? <p className="text-xs text-muted-foreground/80 mt-1">{subtitle}</p> : null}
        </div>
        {latest !== null ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {valueFormatter(latest)}
          </span>
        ) : null}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 18%)" />
            <XAxis dataKey="time" tick={{ fill: 'hsl(215, 14%, 50%)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(215, 14%, 50%)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(220, 18%, 10%)',
                border: '1px solid hsl(220, 13%, 18%)',
                borderRadius: '0.75rem',
                color: 'hsl(210, 20%, 92%)',
                fontSize: 12,
              }}
              formatter={(value: number) => valueFormatter(value)}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#${gradientId})`} isAnimationActive animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
});
