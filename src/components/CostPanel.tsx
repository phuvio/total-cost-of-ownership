import { calculateTCO, TCOParams } from "@/lib/tco-calculations";

interface Props {
  params1: TCOParams;
  params2: TCOParams;
  activeModel: 1 | 2;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(4)}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
}

function ModelResults({ label, r, days, highlight }: { label: string; r: ReturnType<typeof calculateTCO>; days: number; highlight: boolean }) {
  const inferencePer10k = r.inferencePerRequest * 10000;
  const dominant = r.crossoverDays < days
    ? "Inference costs dominate"
    : "Training costs dominate";

  return (
    <div className={`space-y-4 ${highlight ? '' : 'opacity-75'}`}>
      <h3 className="text-xs font-bold uppercase tracking-widest text-primary" style={{ fontFamily: 'var(--font-display)' }}>
        {label}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="metric-card col-span-2">
          <div className="metric-value text-foreground">{days}</div>
          <div className="metric-label">Number of Days</div>
        </div>
        <div className="metric-card">
          <div className="metric-value text-foreground">{fmt(r.trainingCost)}</div>
          <div className="metric-label">Training Cost</div>
        </div>
        <div className="metric-card">
          <div className="metric-value text-foreground">{fmt(r.inferencePerRequest)}</div>
          <div className="metric-label">Inference Cost / Request</div>
        </div>
        <div className="metric-card">
          <div className="metric-value text-foreground">{fmt(inferencePer10k)}</div>
          <div className="metric-label">Inference Cost / 10,000 Req</div>
        </div>
        <div className="metric-card">
          <div className="metric-value text-foreground">{fmtNum(r.requestsPerDay)}</div>
          <div className="metric-label">Requests per Day</div>
        </div>
        <div className="metric-card col-span-2">
          <div className="metric-value text-foreground">{fmt(r.annualInference)}</div>
          <div className="metric-label">Total Inference Cost ({days} days)</div>
        </div>
      </div>

      <div className="param-section">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: r.crossoverDays < days ? 'hsl(var(--chart-inference))' : 'hsl(var(--chart-training))' }}
          />
          <span className="text-sm font-medium">{dominant}</span>
        </div>
        {r.crossoverDays < Infinity && (
          <p className="text-xs text-muted-foreground mt-2">
            Crossover at day {Math.round(r.crossoverDays)} (~{Math.round(r.crossoverDays / 30)} months)
          </p>
        )}
      </div>

      <div className="param-section space-y-2 text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-display)' }}>
        <p className="font-semibold text-foreground text-sm">
          Total TCO ({days} days): {fmt(r.tco)}
        </p>
      </div>
    </div>
  );
}

export function CostPanel({ params1, params2, activeModel }: Props) {
  const r1 = calculateTCO(params1);
  const r2 = calculateTCO(params2);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-sm font-bold uppercase tracking-widest text-primary" style={{ fontFamily: 'var(--font-display)' }}>
        Cost Calculations
      </h2>

      <ModelResults label="Model 1" r={r1} days={params1.days} highlight={activeModel === 1} />

      {activeModel === 2 && (
        <>
          <div className="border-t my-4" />
          <ModelResults label="Model 2" r={r2} days={params2.days} highlight={true} />
        </>
      )}
    </div>
  );
}
