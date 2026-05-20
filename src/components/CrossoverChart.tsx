import { generateChartData, calculateTCO, TCOParams } from "@/lib/tco-calculations";
import {
  Area, CartesianGrid, Legend, ResponsiveContainer, Tooltip,
  XAxis, YAxis, ReferenceLine, Line, ComposedChart, PieChart, Pie, Cell,
} from "recharts";

interface Props {
  params1: TCOParams;
  params2: TCOParams;
  activeModel: 1 | 2;
  model2Ever: boolean;
  model1Name: string;
  model2Name: string;
}

function fmtAxis(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}k`;
  return `€${n.toFixed(0)}`;
}

const PIE_COLORS = [
  'hsl(210, 70%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(0, 72%, 60%)',
  'hsl(280, 65%, 55%)',
  'hsl(45, 85%, 55%)',
  'hsl(190, 60%, 45%)',
  'hsl(340, 70%, 55%)',
];

// Updated key index to match new costBreakdown keys from tco-calculations
const PIE_KEY_INDEX: Record<string, number> = {
  tokens: 0,
  retrieval: 1,
  reranking: 2,
  guardrails: 3,
  tools: 4,
  compute: 5,
  engineeringOneTime: 6,
  engineeringRecurring: 7,
};

const PIE_LABELS: Record<string, string> = {
  tokens: 'Tokens',
  retrieval: 'Retrieval',
  reranking: 'Reranking',
  guardrails: 'Guardrails',
  tools: 'Tools',
  compute: 'Compute',
  engineeringOneTime: 'Eng. (one-time)',
  engineeringRecurring: 'Eng. (recurring)',
  trainingAndSetup: 'Training & Setup',
};

function breakdownToData(breakdown: Record<string, number>) {
  return Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: PIE_LABELS[key] || key, value, key }));
}

function CostPieChart({
  title,
  breakdown,
}: {
  title: string;
  breakdown: Record<string, number>;
}) {
  const data = breakdownToData(breakdown);
  if (data.length === 0) return null;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex-1 min-w-[200px]">
      <h3
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 text-center"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h3>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={PIE_COLORS[PIE_KEY_INDEX[entry.key] ?? 0]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => {
                const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
                return [`${pct}%`, undefined];
              }}
              contentStyle={{
                fontSize: 11,
                fontFamily: 'var(--font-display)',
                borderRadius: 8,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
        {data.map((entry) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
          return (
            <div
              key={entry.key}
              className="flex items-center gap-1 text-[10px]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <div
                className="w-2 h-2 rounded-sm"
                style={{ background: PIE_COLORS[PIE_KEY_INDEX[entry.key] ?? 0] }}
              />
              <span className="text-muted-foreground">
                {entry.name} {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CrossoverChart({
  params1,
  params2,
  activeModel,
  model2Ever,
  model1Name,
  model2Name,
}: Props) {
  const data1 = generateChartData(params1);
  const data2 = generateChartData(params2);

  // calculateTCO used separately for pie chart costBreakdown
  // (generateChartData already calls calculateTCO internally via results)
  const showBoth = model2Ever;
  const activeData = activeModel === 1 ? data1 : data2;
  const maxDays = params1.days;

  // Build merged chart points using updated field names:
  // totalSetupCost replaces trainingCost
  // dailyTotalCost replaces dailyInference (includes ops cost)
  const mergedPoints: Array<Record<string, number>> = [];
  const step = Math.max(1, Math.floor(maxDays / 100));

  for (let d = 0; d <= maxDays; d += step) {
    const point: Record<string, number> = { day: d };
    point.m1Setup = data1.results.totalSetupCost;
    point.m1Inference = data1.results.dailyTotalCost * d;
    if (showBoth) {
      point.m2Setup = data2.results.totalSetupCost;
      point.m2Inference = data2.results.dailyTotalCost * d;
    }
    mergedPoints.push(point);
  }

  const isModel1Active = activeModel === 1;

  // Tooltip label mapping updated to match new point keys
  const tooltipLabels: Record<string, string> = {
    m1Setup: `${model1Name} Setup`,
    m1Inference: `${model1Name} Cumulative Inference`,
    m2Setup: `${model2Name} Setup`,
    m2Inference: `${model2Name} Cumulative Inference`,
  };

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <h2
        className="text-sm font-bold uppercase tracking-widest text-primary"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Cost Breakdown & Crossover Point
      </h2>

      {/* Pie charts — show total cost breakdown over full period */}
      <div className="flex gap-4 flex-wrap">
        <CostPieChart
          title={`${model1Name} — Total Cost Breakdown`}
          breakdown={data1.results.costBreakdown}
        />
        {showBoth && (
          <CostPieChart
            title={`${model2Name} — Total Cost Breakdown`}
            breakdown={data2.results.costBreakdown}
          />
        )}
      </div>

      {/* Crossover line chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={mergedPoints}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="setupGradM1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 72%, 60%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="inferenceGradM1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="setupGradM2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(280, 65%, 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(280, 65%, 55%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="inferenceGradM2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(45, 85%, 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(45, 85%, 55%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="day"
              type="number"
              domain={[0, maxDays]}
              tick={{ fontSize: 12, fontFamily: 'var(--font-display)' }}
              label={{
                value: 'Days',
                position: 'insideBottom',
                offset: -5,
                style: { fontSize: 12, fontFamily: 'var(--font-display)' },
              }}
            />
            <YAxis
              tickFormatter={fmtAxis}
              tick={{ fontSize: 12, fontFamily: 'var(--font-display)' }}
              label={{
                value: 'Cost (€)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12, fontFamily: 'var(--font-display)' },
              }}
            />
            <Tooltip
              formatter={(v: number, name: string) => [
                fmtAxis(v),
                tooltipLabels[name] || name,
              ]}
              labelFormatter={(l) => `Day ${l}`}
              contentStyle={{
                fontSize: 12,
                fontFamily: 'var(--font-display)',
                borderRadius: 8,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 13, fontFamily: 'var(--font-display)' }} />

            {/* Model 1 — active = filled area, inactive = thin line */}
            {isModel1Active ? (
              <>
                <Area type="monotone" dataKey="m1Setup" stroke="hsl(0, 72%, 60%)" fill="url(#setupGradM1)" strokeWidth={2} name={`${model1Name} Setup`} />
                <Area type="monotone" dataKey="m1Inference" stroke="hsl(160, 60%, 45%)" fill="url(#inferenceGradM1)" strokeWidth={2} name={`${model1Name} Inference`} />
              </>
            ) : (
              <>
                <Line type="monotone" dataKey="m1Setup" stroke="hsl(0, 72%, 60%)" strokeWidth={1.5} strokeOpacity={0.4} dot={false} name={`${model1Name} Setup`} />
                <Line type="monotone" dataKey="m1Inference" stroke="hsl(160, 60%, 45%)" strokeWidth={1.5} strokeOpacity={0.4} dot={false} name={`${model1Name} Inference`} />
              </>
            )}

            {/* Model 2 */}
            {showBoth && (
              isModel1Active ? (
                <>
                  <Line type="monotone" dataKey="m2Setup" stroke="hsl(280, 65%, 55%)" strokeWidth={2} strokeOpacity={0.5} strokeDasharray="8 4" dot={false} name={`${model2Name} Setup`} />
                  <Line type="monotone" dataKey="m2Inference" stroke="hsl(45, 85%, 55%)" strokeWidth={2} strokeOpacity={0.5} strokeDasharray="8 4" dot={false} name={`${model2Name} Inference`} />
                </>
              ) : (
                <>
                  <Area type="monotone" dataKey="m2Setup" stroke="hsl(280, 65%, 55%)" fill="url(#setupGradM2)" strokeWidth={2.5} strokeDasharray="8 4" name={`${model2Name} Setup`} />
                  <Area type="monotone" dataKey="m2Inference" stroke="hsl(45, 85%, 55%)" fill="url(#inferenceGradM2)" strokeWidth={2.5} strokeDasharray="8 4" name={`${model2Name} Inference`} />
                </>
              )
            )}

            {/* Crossover reference line for active model */}
            {Number.isFinite(activeData.crossoverDays) && activeData.crossoverDays >= 0 ? (
              <ReferenceLine
                x={Math.max(1, Math.round(activeData.crossoverDays))}
                stroke="hsl(var(--foreground))"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Crossover: Day ${Math.max(1, Math.round(activeData.crossoverDays))}`,
                  position: 'insideTop',
                  offset: 20,
                  style: {
                    fontSize: 12,
                    fontFamily: 'var(--font-display)',
                    fill: 'hsl(var(--foreground))',
                  },
                }}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div
        className="flex gap-3 text-xs flex-wrap"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: 'hsl(0, 72%, 60%, 0.5)' }} />
          <span className="text-muted-foreground">{model1Name} Setup</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: 'hsl(160, 60%, 45%, 0.5)' }} />
          <span className="text-muted-foreground">{model1Name} Inference</span>
        </div>
        {showBoth && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: 'hsl(280, 65%, 55%, 0.5)' }} />
              <span className="text-muted-foreground">{model2Name} Setup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: 'hsl(45, 85%, 55%, 0.5)' }} />
              <span className="text-muted-foreground">{model2Name} Inference</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
