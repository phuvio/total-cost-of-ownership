import { generateChartData, TCOParams } from "@/lib/tco-calculations";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Line, ComposedChart } from "recharts";

interface Props {
  params1: TCOParams;
  params2: TCOParams;
  activeModel: 1 | 2;
}

function fmtAxis(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

export function CrossoverChart({ params1, params2, activeModel }: Props) {
  const data1 = generateChartData(params1);
  const data2 = generateChartData(params2);

  const activeData = activeModel === 1 ? data1 : data2;
  const bgData = activeModel === 1 ? data2 : data1;

  // Merge data points by day for both models
  const maxDays = Math.max(params1.days, params2.days);
  const step = Math.max(1, Math.floor(maxDays / 100));
  const mergedPoints: Array<Record<string, number>> = [];

  for (let d = 0; d <= maxDays; d += step) {
    const point: Record<string, number> = { day: d };
    // Active model
    point.activeTraining = activeData.results.trainingCost;
    point.activeInference = activeData.results.dailyInference * d;
    // Background model
    point.bgTraining = bgData.results.trainingCost;
    point.bgInference = bgData.results.dailyInference * d;
    mergedPoints.push(point);
  }

  const activeCrossover = activeData.crossoverDays < (activeModel === 1 ? params1.days : params2.days)
    ? Math.round(activeData.crossoverDays) : null;

  const activeLabel = `Model ${activeModel}`;
  const bgLabel = `Model ${activeModel === 1 ? 2 : 1}`;

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <h2 className="text-sm font-bold uppercase tracking-widest text-primary" style={{ fontFamily: 'var(--font-display)' }}>
        Crossover Point
      </h2>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mergedPoints} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="activeTrainingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 72%, 60%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="activeInferenceGrad" x1="0" y1="0" x2="0" y2="1">
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
              formatter={(v: number, name: string) => {
                const labels: Record<string, string> = {
                  activeTraining: `${activeLabel} Training`,
                  activeInference: `${activeLabel} Inference`,
                  bgTraining: `${bgLabel} Training`,
                  bgInference: `${bgLabel} Inference`,
                };
                return [fmtAxis(v), labels[name] || name];
              }}
              labelFormatter={(l) => `Day ${l}`}
              contentStyle={{ fontSize: 12, fontFamily: 'var(--font-display)', borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-display)' }} />

            {/* Background model: solid lines, no fill */}
            <Line
              type="monotone"
              dataKey="bgTraining"
              stroke="hsl(0, 72%, 60%)"
              strokeWidth={1.5}
              strokeOpacity={0.4}
              dot={false}
              name={`${bgLabel} Training`}
            />
            <Line
              type="monotone"
              dataKey="bgInference"
              stroke="hsl(160, 60%, 45%)"
              strokeWidth={1.5}
              strokeOpacity={0.4}
              dot={false}
              name={`${bgLabel} Inference`}
            />

            {/* Active model: dotted lines with area fill */}
            <Area
              type="monotone"
              dataKey="activeTraining"
              stroke="hsl(0, 72%, 60%)"
              fill="url(#activeTrainingGrad)"
              strokeWidth={2}
              strokeDasharray={activeModel === 2 ? "6 3" : undefined}
              name={`${activeLabel} Training`}
            />
            <Area
              type="monotone"
              dataKey="activeInference"
              stroke="hsl(160, 60%, 45%)"
              fill="url(#activeInferenceGrad)"
              strokeWidth={2}
              strokeDasharray={activeModel === 2 ? "6 3" : undefined}
              name={`${activeLabel} Inference`}
            />

            {activeCrossover && activeCrossover < maxDays && (
              <ReferenceLine
                x={activeCrossover}
                stroke="hsl(var(--foreground))"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Crossover: Day ${activeCrossover}`,
                  position: 'top',
                  style: { fontSize: 10, fontFamily: 'var(--font-display)', fill: 'hsl(var(--foreground))' },
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-3 text-xs" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: 'hsl(0, 72%, 60%, 0.3)' }} />
          <span className="text-muted-foreground">Training</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: 'hsl(160, 60%, 45%, 0.3)' }} />
          <span className="text-muted-foreground">Inference</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 bg-muted-foreground opacity-40" />
          <span className="text-muted-foreground">Background model</span>
        </div>
      </div>
    </div>
  );
}
