import { generateChartData, TCOParams } from "@/lib/tco-calculations";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";

interface Props {
  params: TCOParams;
}

function fmtAxis(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

export function CrossoverChart({ params }: Props) {
  const { points, crossoverDays, results } = generateChartData(params, 365);
  const crossoverDay = crossoverDays < 365 ? Math.round(crossoverDays) : null;

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <h2 className="text-sm font-bold uppercase tracking-widest text-primary" style={{ fontFamily: 'var(--font-display)' }}>
        Crossover Point
      </h2>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="trainingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 72%, 60%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="inferenceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fontFamily: 'var(--font-display)' }}
              label={{ value: 'Days', position: 'insideBottom', offset: -5, style: { fontSize: 10, fontFamily: 'var(--font-display)' } }}
            />
            <YAxis
              tickFormatter={fmtAxis}
              tick={{ fontSize: 10, fontFamily: 'var(--font-display)' }}
              label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fontFamily: 'var(--font-display)' } }}
            />
            <Tooltip
              formatter={(v: number, name: string) => [`${fmtAxis(v)}`, name === 'training' ? 'Training' : 'Cumulative Inference']}
              labelFormatter={(l) => `Day ${l}`}
              contentStyle={{ fontSize: 12, fontFamily: 'var(--font-display)', borderRadius: 8 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-display)' }}
            />
            <Area
              type="monotone"
              dataKey="training"
              stroke="hsl(0, 72%, 60%)"
              fill="url(#trainingGrad)"
              strokeWidth={2}
              name="Training Cost"
            />
            <Area
              type="monotone"
              dataKey="inference"
              stroke="hsl(160, 60%, 45%)"
              fill="url(#inferenceGrad)"
              strokeWidth={2}
              name="Cumulative Inference"
            />
            {crossoverDay && crossoverDay < 365 && (
              <ReferenceLine
                x={crossoverDay}
                stroke="hsl(var(--foreground))"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Crossover: Day ${crossoverDay}`,
                  position: 'top',
                  style: { fontSize: 10, fontFamily: 'var(--font-display)', fill: 'hsl(var(--foreground))' },
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-3 text-xs" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: 'hsl(0, 72%, 60%, 0.3)' }} />
          <span className="text-muted-foreground">Training dominates</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: 'hsl(160, 60%, 45%, 0.3)' }} />
          <span className="text-muted-foreground">Inference dominates</span>
        </div>
      </div>
    </div>
  );
}
