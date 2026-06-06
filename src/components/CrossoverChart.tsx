import { calculateTCO, TCOParams } from "@/lib/tco-calculations";
import { useMemo, useState } from "react";
import {
  Area, CartesianGrid, Legend, ResponsiveContainer, Tooltip,
  XAxis, YAxis, ReferenceLine, Line, ComposedChart, PieChart, Pie, Cell,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

type XAxisKey = "days" | "requestsPerDay" | "cacheHitRate" | "costPerHour";

const X_AXIS_OPTIONS: { value: XAxisKey; label: string; unit: string; min: number; max: number; step: number }[] = [
  { value: "days",           label: "Days",                    unit: "days", min: 0,   max: 365,   step: 1 },
  { value: "requestsPerDay", label: "Requests per day",       unit: "req",  min: 500, max: 100000, step: 500 },
  { value: "cacheHitRate",   label: "Cache hit rate",         unit: "%",   min: 0,   max: 90,    step: 5 },
  { value: "costPerHour",    label: "Engineering cost / hour", unit: "€",   min: 50,  max: 500,   step: 10 },
];

const N_POINTS = 40;

interface ChartPoint {
  x: number;
  setup: number;
  inference: number;
  total: number;
}

function buildChartPoints(params: TCOParams, xKey: XAxisKey, xMin: number, xMax: number) {
  const points: ChartPoint[] = [];
  const step = (xMax - xMin) / (N_POINTS - 1);
  const baseParams = xKey === "cacheHitRate"
    ? { ...params, caching: true }
    : params;

  for (let i = 0; i < N_POINTS; i++) {
    const x = xMin + i * step;
    const p = { ...baseParams, [xKey]: x } as TCOParams;
    const results = calculateTCO(p);

    points.push({
      x: Math.round(x * 100) / 100,
      setup: results.totalSetupCost,
      inference: results.totalInferenceCost,
      total: results.tco,
    });
  }

  return points;
}

function findCrossover(pts1: ChartPoint[], pts2: ChartPoint[]) {
  for (let i = 1; i < pts1.length; i++) {
    const d0 = pts1[i - 1].total - pts2[i - 1].total;
    const d1 = pts1[i].total - pts2[i].total;
    if (d0 === 0) return pts1[i - 1].x;
    if (d0 * d1 < 0) {
      return Math.round(((pts1[i - 1].x + pts1[i].x) / 2) * 100) / 100;
    }
  }
  return null;
}

function formatXAxisValue(value: number, xKey: XAxisKey) {
  if (xKey === "requestsPerDay") {
    return value >= 1000 ? `${Math.round(value / 100) / 10}k` : `${Math.round(value)}`;
  }
  if (xKey === "cacheHitRate") {
    return `${Math.round(value)}%`;
  }
  if (xKey === "costPerHour") {
    return `€${Math.round(value)}`;
  }
  return `${Math.round(value)}`;
}

function getCrossoverSummary(
  crossover: number | null,
  pts1: ChartPoint[],
  pts2: ChartPoint[],
  xKey: XAxisKey,
  model1Name: string,
  model2Name: string,
) {
  if (crossover !== null) {
    return `Break-even: ${formatXAxisValue(crossover, xKey)} — models have equal total cost there`;
  }

  const firstDiff = pts1[0].total - pts2[0].total;
  const lastDiff = pts1[pts1.length - 1].total - pts2[pts2.length - 1].total;
  if (Math.abs(firstDiff) < 1 && Math.abs(lastDiff) < 1) {
    return 'Models have almost identical costs across the selected range';
  }

  const cheaperModel = firstDiff < 0 ? model1Name : model2Name;
  const consistent = (firstDiff < 0 && lastDiff < 0) || (firstDiff > 0 && lastDiff > 0);
  if (consistent) {
    return `${cheaperModel} is cheaper across the selected ${xKey} range`;
  }

  return `No clear crossover detected across the selected ${xKey} range`;
}

const CHART_FONT_SIZE = 'var(--chart-font-size)';

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
                fontSize: CHART_FONT_SIZE,
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
              className="flex items-center gap-1 text-[0.75rem]"
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
  const [xAxisKey, setXAxisKey] = useState<XAxisKey>("days");
  const showBoth = model2Ever;
  const results1 = calculateTCO(params1);
  const results2 = calculateTCO(params2);

  const xAxisOption = X_AXIS_OPTIONS.find((option) => option.value === xAxisKey)!;
  const xRange = useMemo(() => {
    if (xAxisKey === "days") {
      return { min: 0, max: Math.max(params1.days, params2.days, 1) };
    }

    if (xAxisKey === "requestsPerDay") {
      return {
        min: Math.min(xAxisOption.min, params1.requestsPerDay, params2.requestsPerDay),
        max: Math.max(xAxisOption.max, params1.requestsPerDay, params2.requestsPerDay),
      };
    }

    if (xAxisKey === "cacheHitRate") {
      return {
        min: 0,
        max: Math.max(xAxisOption.max, params1.cacheHitRate, params2.cacheHitRate),
      };
    }

    return {
      min: Math.min(xAxisOption.min, params1.costPerHour, params2.costPerHour),
      max: Math.max(xAxisOption.max, params1.costPerHour, params2.costPerHour),
    };
  }, [xAxisKey, xAxisOption.max, xAxisOption.min, params1, params2]);

  const points1 = useMemo(
    () => buildChartPoints(params1, xAxisKey, xRange.min, xRange.max),
    [params1, xAxisKey, xRange],
  );

  const points2 = useMemo(
    () => (showBoth ? buildChartPoints(params2, xAxisKey, xRange.min, xRange.max) : []),
    [params2, showBoth, xAxisKey, xRange],
  );

  const chartData = useMemo(
    () => points1.map((point, index) => ({
      x: point.x,
      m1Setup: point.setup,
      m1Inference: point.inference,
      m1Total: point.total,
      ...(showBoth && points2[index]
        ? {
            m2Setup: points2[index].setup,
            m2Inference: points2[index].inference,
            m2Total: points2[index].total,
          }
        : {}),
    })),
    [points1, points2, showBoth],
  );

  const crossoverValue = useMemo(
    () => (showBoth ? findCrossover(points1, points2) : null),
    [points1, points2, showBoth],
  );

  const crossoverReason = useMemo(
    () =>
      showBoth
        ? getCrossoverSummary(crossoverValue, points1, points2, xAxisKey, model1Name, model2Name)
        : null,
    [crossoverValue, points1, points2, xAxisKey, model1Name, model2Name, showBoth],
  );

  const tooltipLabels: Record<string, string> = {
    m1Setup: `${model1Name} Setup Cost`,
    m1Inference: `${model1Name} Total Inference Cost`,
    m2Setup: `${model2Name} Setup Cost`,
    m2Inference: `${model2Name} Total Inference Cost`,
  };

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex flex-wrap items-center gap-3">
        <h2
          className="text-sm font-bold uppercase tracking-widest text-primary"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Cost Breakdown & Break-even
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            X-axis:
          </span>
          <Select value={xAxisKey} onValueChange={(value) => setXAxisKey(value as XAxisKey)}>
            <SelectTrigger className="param-input h-9 min-w-[180px]">
              <SelectValue placeholder="Select axis" />
            </SelectTrigger>
            <SelectContent>
              {X_AXIS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pie charts */}
      <div className="flex gap-4 flex-wrap">
        <CostPieChart
          title={`${model1Name} — Total Cost Breakdown`}
          breakdown={results1.costBreakdown}
        />
        {showBoth && (
          <CostPieChart
            title={`${model2Name} — Total Cost Breakdown`}
            breakdown={results2.costBreakdown}
          />
        )}
      </div>

      {/* Break-even summary badge — only shown when both models visible */}
      {showBoth && crossoverReason && (
        <div
          className="text-xs px-3 py-2 rounded-md border"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'var(--color-background-secondary)',
            borderColor: 'var(--color-border-secondary)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {crossoverReason}
        </div>
      )}

      
      {/* CHART 1: Total cost per selected x-axis variable */}
      <div style={{ height: '300px' }}>
        <p className="text-xs font-medium text-muted-foreground mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Total cost — {showBoth ? 'model comparison' : model1Name}
        </p>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 4, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="cumGradM1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="cumGradM2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(280, 65%, 55%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(280, 65%, 55%)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[xRange.min, xRange.max]}
              tick={{ fontSize: CHART_FONT_SIZE, fontFamily: 'var(--font-display)' }}
              tickFormatter={(value) => formatXAxisValue(Number(value), xAxisKey)}
              label={{ value: xAxisOption.label, position: 'insideBottom', offset: -4, style: { fontSize: CHART_FONT_SIZE, fontFamily: 'var(--font-display)' } }}
            />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: CHART_FONT_SIZE, fontFamily: 'var(--font-display)' }} width={48} />
            <Tooltip
              formatter={(v: number, name: string) => [fmtAxis(v), name]}
              labelFormatter={(l) => `${xAxisOption.label}: ${formatXAxisValue(Number(l), xAxisKey)}`}
              contentStyle={{ fontSize: CHART_FONT_SIZE, fontFamily: 'var(--font-display)', borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: CHART_FONT_SIZE, fontFamily: 'var(--font-display)' }} />
            <Area type="monotone" dataKey="m1Total" stroke="hsl(160, 60%, 45%)" fill="url(#cumGradM1)" strokeWidth={2.5} name={`${model1Name} Total`} dot={false} />
            {showBoth && (
              <Area type="monotone" dataKey="m2Total" stroke="hsl(280, 65%, 55%)" fill="url(#cumGradM2)" strokeWidth={2.5} strokeDasharray="8 4" name={`${model2Name} Total`} dot={false} />
            )}
            {showBoth && crossoverValue !== null && crossoverValue >= xRange.min && crossoverValue <= xRange.max && (
              <ReferenceLine
                x={crossoverValue}
                stroke="hsl(var(--foreground))"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Break-even: ${formatXAxisValue(crossoverValue, xAxisKey)}`,
                  position: 'insideTop',
                  offset: 8,
                  style: { fontSize: CHART_FONT_SIZE, fontFamily: 'var(--font-display)', fill: 'hsl(var(--foreground))' },
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* CHART 2: Setup vs Inference breakdown per model */}
      <div style={{ height: '320px' }}>
        <p className="text-xs font-medium text-muted-foreground mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Cost breakdown — setup vs. inference
        </p>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 10, left: 10, bottom: 0 }}>
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
            <XAxis dataKey="x" type="number" domain={[xRange.min, xRange.max]} tick={{ fontSize: CHART_FONT_SIZE, fontFamily: 'var(--font-display)' }} tickFormatter={(value) => formatXAxisValue(Number(value), xAxisKey)} />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: CHART_FONT_SIZE, fontFamily: 'var(--font-display)' }} width={48} />
            <Tooltip
              formatter={(v: number, name: string) => [fmtAxis(v), tooltipLabels[name] || name]}
              labelFormatter={(l) => `${xAxisOption.label}: ${formatXAxisValue(Number(l), xAxisKey)}`}
              contentStyle={{ fontSize: CHART_FONT_SIZE, fontFamily: 'var(--font-display)', borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: CHART_FONT_SIZE, fontFamily: 'var(--font-display)' }} />
            {activeModel === 1 ? (
              <>
                {showBoth && (
                  <>
                    <Line type="monotone" dataKey="m2Setup" stroke="hsl(280, 65%, 55%)" strokeWidth={1.5} strokeDasharray="8 4" strokeOpacity={0.5} name={`${model2Name} Setup`} dot={false} />
                    <Line type="monotone" dataKey="m2Inference" stroke="hsl(45, 85%, 55%)" strokeWidth={1.5} strokeDasharray="8 4" strokeOpacity={0.5} name={`${model2Name} Inference`} dot={false} />
                  </>
                )}
                <Area type="monotone" dataKey="m1Setup" stroke="hsl(0, 72%, 60%)" fill="url(#setupGradM1)" strokeWidth={2} name={`${model1Name} Setup`} dot={false} />
                <Area type="monotone" dataKey="m1Inference" stroke="hsl(160, 60%, 45%)" fill="url(#inferenceGradM1)" strokeWidth={2} name={`${model1Name} Inference`} dot={false} />
              </>
            ) : (
              <>
                <Line type="monotone" dataKey="m1Setup" stroke="hsl(0, 72%, 60%)" strokeWidth={1.5} strokeOpacity={0.5} name={`${model1Name} Setup`} dot={false} />
                <Line type="monotone" dataKey="m1Inference" stroke="hsl(160, 60%, 45%)" strokeWidth={1.5} strokeOpacity={0.5} name={`${model1Name} Inference`} dot={false} />
                <Area type="monotone" dataKey="m2Setup" stroke="hsl(280, 65%, 55%)" fill="url(#setupGradM2)" strokeWidth={2} strokeDasharray="8 4" name={`${model2Name} Setup`} dot={false} />
                <Area type="monotone" dataKey="m2Inference" stroke="hsl(45, 85%, 55%)" fill="url(#inferenceGradM2)" strokeWidth={2} strokeDasharray="8 4" name={`${model2Name} Inference`} dot={false} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs flex-wrap" style={{ fontFamily: 'var(--font-display)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: 'hsl(0, 72%, 60%, 0.6)' }} />
          <span className="text-muted-foreground">{model1Name} Setup</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: 'hsl(160, 60%, 45%, 0.6)' }} />
          <span className="text-muted-foreground">{model1Name} Inference</span>
        </div>
        {showBoth && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: 'hsl(280, 65%, 55%, 0.6)' }} />
              <span className="text-muted-foreground">{model2Name} Setup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: 'hsl(45, 85%, 55%, 0.6)' }} />
              <span className="text-muted-foreground">{model2Name} Inference</span>
            </div>
          </>
        )}
        {showBoth && crossoverValue !== null && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 border-t-2 border-dashed" style={{ borderColor: 'hsl(var(--foreground))' }} />
            <span className="text-muted-foreground">Break-even point</span>
          </div>
        )}
      </div>
    </div>
  );
}
