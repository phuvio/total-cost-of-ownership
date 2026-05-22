import { calculateTCO, crossoverBetweenModels, TCOParams } from "@/lib/tco-calculations";

interface Props {
  params1: TCOParams;
  params2: TCOParams;
  activeModel: 1 | 2;
  model2Ever: boolean;
  model1Name: string;
  model2Name: string;
}

function fmtFi(n: number, decimals = 2): string {
  return n.toLocaleString('fi-FI', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' €';
}

function fmt(n: number): string {
  if (n >= 1_000_000) return fmtFi(n, 0);
  if (n >= 1_000) return fmtFi(n, 0);
  if (n >= 1) return fmtFi(n, 2);
  return fmtFi(n, 4);
}

function fmtNum(n: number): string {
  return n.toLocaleString('fi-FI', { maximumFractionDigits: 0 });
}

function ModelResults({
  label,
  r,
  days,
  highlight,
}: {
  label: string;
  r: ReturnType<typeof calculateTCO>;
  days: number;
  highlight: boolean;
}) {
  const inferencePer10k = r.optimizedCostPerRequest * 10000;

  return (
    <div className={`space-y-3 ${highlight ? "" : "opacity-75"}`}>
      <h3
        className="text-xs font-bold uppercase tracking-widest text-primary"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {label}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="metric-card">
          <div className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            {fmt(r.totalSetupCost)}
          </div>
          <div className="metric-label">Setup Cost (one-time)</div>
        </div>

        <div className="metric-card">
          <div className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            {fmt(inferencePer10k)}
          </div>
          <div className="metric-label">Inference Cost / 10,000 Req</div>
        </div>

        <div className="metric-card">
          <div className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            {fmtNum(r.requestsPerDay)}
          </div>
          <div className="metric-label">Requests per Day</div>
        </div>

        <div className="metric-card">
          <div className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            {fmt(r.recurringEngineeringCost)}
          </div>
          <div className="metric-label">Recurring Ops ({days} days)</div>
        </div>

        <div className="metric-card col-span-2">
          <div className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            {fmt(r.totalInferenceCost)}
          </div>
          <div className="metric-label">Total Inference Cost ({days} days)</div>
        </div>
      </div>

      <div className="param-section space-y-2 text-xs text-muted-foreground" style={{ fontFamily: "var(--font-display)" }}>
        <p className="font-semibold text-foreground text-sm">
          Total TCO ({days} days): {fmt(r.tco)}
        </p>
        <p>
          Engineering (one-time): {fmt(r.oneTimeEngineeringCost)} · Recurring:{" "}
          {fmt(r.recurringEngineeringCost)}
        </p>
      </div>
    </div>
  );
}

export function CostPanel({
  params1,
  params2,
  activeModel,
  model2Ever,
  model1Name,
  model2Name,
}: Props) {
  const r1 = calculateTCO(params1);
  const r2 = calculateTCO(params2);
  const days = params1.days;

  // Break-even between models — only computed when both are active
  const crossover = model2Ever ? crossoverBetweenModels(params1, params2) : null;

  return (
    <div className="p-6 space-y-6">
      <h2
        className="text-sm font-bold uppercase tracking-widest text-primary"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Cost Calculations
      </h2>

      <div className="metric-card">
        <div className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          {days}
        </div>
        <div className="metric-label">Number of Days</div>
      </div>

      {/* Break-even summary — shown only when comparing two models */}
      {crossover && (
        <div
          className="param-section text-xs space-y-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <p className="font-semibold text-foreground text-sm">Break-even</p>
          {crossover.crossoverDay !== null ? (
            <>
              <p className="text-muted-foreground">
                Day <span className="font-semibold text-foreground">{crossover.crossoverDay}</span>
                {" "}(~{(crossover.crossoverDay / 30).toFixed(1)} months)
              </p>
              <p className="text-muted-foreground">{crossover.reason}</p>
            </>
          ) : (
            <p className="text-muted-foreground">{crossover.reason}</p>
          )}
        </div>
      )}

      <ModelResults label={model1Name} r={r1} days={days} highlight={activeModel === 1} />

      {model2Ever && (
        <>
          <div className="border-t my-4" />
          <ModelResults label={model2Name} r={r2} days={days} highlight={activeModel === 2} />
        </>
      )}
    </div>
  );
}

