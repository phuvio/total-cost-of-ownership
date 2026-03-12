import { calculateTCO, TCOParams } from "@/lib/tco-calculations";

interface Props {
  params: TCOParams;
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

export function CostPanel({ params }: Props) {
  const r = calculateTCO(params);
  const dominant = r.crossoverDays < params.days
    ? "Inference costs dominate"
    : "Training costs dominate";
  const inferencePer10k = r.inferencePerRequest * 10000;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-sm font-bold uppercase tracking-widest text-primary" style={{ fontFamily: 'var(--font-display)' }}>
        Cost Calculations
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="metric-card">
          <div className="metric-value text-foreground">{fmt(r.trainingCost)}</div>
          <div className="metric-label">Training Cost</div>
        </div>
        <div className="metric-card">
          <div className="metric-value text-foreground">{fmt(r.inferencePerRequest)}</div>
          <div className="metric-label">Inference Cost / Request</div>
        </div>
        <div className="metric-card">
          <div className="metric-value text-foreground">{fmtNum(r.requestsPerDay)}</div>
          <div className="metric-label">Requests per Day</div>
        </div>
        <div className="metric-card">
          <div className="metric-value text-foreground">{fmt(r.annualInference)}</div>
          <div className="metric-label">Annual Inference Cost</div>
        </div>
      </div>

      <div className="param-section">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: r.crossoverDays < 365 ? 'hsl(var(--chart-inference))' : 'hsl(var(--chart-training))' }}
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
        <p>TCO = C_training + C_inference_total</p>
        <p>C_inference = tokens + retrieval + reranking + guardrails + tools + compute</p>
        <p>Optimized = base × cache × routing × compression × batch × quant</p>
        <p className="font-semibold text-foreground text-sm mt-3">
          Total TCO (1yr): {fmt(r.tco)}
        </p>
      </div>
    </div>
  );
}
