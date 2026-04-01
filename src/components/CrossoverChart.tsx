import { generateChartData, TCOParams } from "@/lib/tco-calculations";
import { Area, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Line, ComposedChart, PieChart, Pie, Cell } from "recharts";

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

export function CrossoverChart({ params1, params2, activeModel, model2Ever, model1Name, model2Name }: Props) {
  const data1 = generateChartData(params1);
  const data2 = generateChartData(params2);

  const showBoth = model2Ever;
  const activeData = activeModel === 1 ? data1 : data2;

  const maxDays = params1.days; // shared days
  const step = Math.max(1, Math.floor(maxDays / 100));
  const mergedPoints: Array<Record<string, number>> = [];

  for (let d = 0; d <= maxDays; d += step) {
    const point: Record<string, number> = { day: d };
    point.m1Training = data1.results.trainingCost;
    point.m1Inference = data1.results.dailyInference * d;
    if (showBoth) {
      point.m2Training = data2.results.trainingCost;
      point.m2Inference = data2.results.dailyInference * d;
    }
    mergedPoints.push(point);
  }

const PIE_COLORS = [
  'hsl(210, 70%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(0, 72%, 60%)',
  'hsl(280, 65%, 55%)',
  'hsl(45, 85%, 55%)',
];

const PIE_LABELS: Record<string, string> = {
  tokens: 'Tokens',
  retrieval: 'Retrieval',
  reranking: 'Reranking',
  guardrails: 'Guardrails',
  tools: 'Tools',
  compute: 'Compute',
};

function breakdownToData(breakdown: Record<string, number>) {
  return Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: PIE_LABELS[key] || key, value, key }));
}

function fmtCost(n: number): string {
  if (n >= 1) return `€${n.toFixed(2)}`;
  if (n >= 0.001) return `€${n.toFixed(4)}`;
  return `€${n.toFixed(6)}`;
}

  const isModel1Active = activeModel === 1;

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <h2 className="text-sm font-bold uppercase tracking-widest text-primary" style={{ fontFamily: 'var(--font-display)' }}>
        Crossover Point
      </h2>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={mergedPoints} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="trainingGradM1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 72%, 60%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="inferenceGradM1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="trainingGradM2" x1="0" y1="0" x2="0" y2="1">
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
              label={{ value: 'Days', position: 'insideBottom', offset: -5, style: { fontSize: 12, fontFamily: 'var(--font-display)' } }}
            />
            <YAxis
              tickFormatter={fmtAxis}
              tick={{ fontSize: 12, fontFamily: 'var(--font-display)' }}
              label={{ value: 'Cost (€)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fontFamily: 'var(--font-display)' } }}
            />
            <Tooltip
              formatter={(v: number, name: string) => {
                const labels: Record<string, string> = {
                  m1Training: `${model1Name} Training`,
                  m1Inference: `${model1Name} Inference`,
                  m2Training: `${model2Name} Training`,
                  m2Inference: `${model2Name} Inference`,
                };
                return [fmtAxis(v), labels[name] || name];
              }}
              labelFormatter={(l) => `Day ${l}`}
              contentStyle={{ fontSize: 12, fontFamily: 'var(--font-display)', borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 13, fontFamily: 'var(--font-display)' }} />

            {isModel1Active ? (
              <>
                <Area type="monotone" dataKey="m1Training" stroke="hsl(0, 72%, 60%)" fill="url(#trainingGradM1)" strokeWidth={2} name={`${model1Name} Training`} />
                <Area type="monotone" dataKey="m1Inference" stroke="hsl(160, 60%, 45%)" fill="url(#inferenceGradM1)" strokeWidth={2} name={`${model1Name} Inference`} />
              </>
            ) : (
              <>
                <Line type="monotone" dataKey="m1Training" stroke="hsl(0, 72%, 60%)" strokeWidth={1.5} strokeOpacity={0.4} dot={false} name={`${model1Name} Training`} />
                <Line type="monotone" dataKey="m1Inference" stroke="hsl(160, 60%, 45%)" strokeWidth={1.5} strokeOpacity={0.4} dot={false} name={`${model1Name} Inference`} />
              </>
            )}

            {showBoth && (
              isModel1Active ? (
                <>
                  <Line type="monotone" dataKey="m2Training" stroke="hsl(280, 65%, 55%)" strokeWidth={2} strokeOpacity={0.5} strokeDasharray="8 4" dot={false} name={`${model2Name} Training`} />
                  <Line type="monotone" dataKey="m2Inference" stroke="hsl(45, 85%, 55%)" strokeWidth={2} strokeOpacity={0.5} strokeDasharray="8 4" dot={false} name={`${model2Name} Inference`} />
                </>
              ) : (
                <>
                  <Area type="monotone" dataKey="m2Training" stroke="hsl(280, 65%, 55%)" fill="url(#trainingGradM2)" strokeWidth={2.5} strokeDasharray="8 4" name={`${model2Name} Training`} />
                  <Area type="monotone" dataKey="m2Inference" stroke="hsl(45, 85%, 55%)" fill="url(#inferenceGradM2)" strokeWidth={2.5} strokeDasharray="8 4" name={`${model2Name} Inference`} />
                </>
              )
            )}

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
                  style: { fontSize: 12, fontFamily: 'var(--font-display)', fill: 'hsl(var(--foreground))' },
                }}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-3 text-xs flex-wrap" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: 'hsl(0, 72%, 60%, 0.5)' }} />
          <span className="text-muted-foreground">{model1Name} Training</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: 'hsl(160, 60%, 45%, 0.5)' }} />
          <span className="text-muted-foreground">{model1Name} Inference</span>
        </div>
        {showBoth && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: 'hsl(280, 65%, 55%, 0.5)' }} />
              <span className="text-muted-foreground">{model2Name} Training</span>
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
