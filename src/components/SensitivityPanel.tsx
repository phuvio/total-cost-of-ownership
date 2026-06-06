import { useEffect, useRef, useState } from "react";
import { Chart, type ChartDataset, type TooltipItem } from "chart.js";
import { TCOParams, calculateTCO } from "@/lib/tco-calculations";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import "./SensitivityPanel.css";

interface Props {
  params1: TCOParams;
  params2: TCOParams;
  model1Name: string;
  model2Name: string;
  model2Ever: boolean;
}

type XAxisKey =
  | "requestsPerDay"
  | "avgTokensPerRequest"
  | "avgResponseTokens"
  | "cacheHitRate"
  | "costPerHour";

type YAxisKey = "tco" | "costPerRequest" | "dailyInference";

const X_AXIS_OPTIONS: { value: XAxisKey; label: string; unit: string; min: number; max: number; step: number }[] = [
  { value: "requestsPerDay",      label: "Requests per day",        unit: "req", min: 500, max: 100000, step: 500 },
  { value: "avgTokensPerRequest", label: "Input tokens / request",  unit: "tok", min: 100, max: 8000, step: 100 },
  { value: "avgResponseTokens",   label: "Output tokens / request", unit: "tok", min: 50,  max: 2000, step: 50  },
  { value: "cacheHitRate",        label: "Cache hit rate",          unit: "%",   min: 0,   max: 90,   step: 5   },
  { value: "costPerHour",         label: "Engineering cost / hour", unit: "€",   min: 50,  max: 500,  step: 10  },
];

const Y_AXIS_OPTIONS: { value: YAxisKey; label: string }[] = [
  { value: "tco",            label: "Total cost of ownership (€)" },
  { value: "costPerRequest", label: "Cost per request (€)" },
  { value: "dailyInference", label: "Daily inference cost (€)" },
];

const N_POINTS = 40;

function buildPoints(
  params: TCOParams,
  xKey: XAxisKey,
  yKey: YAxisKey,
  xMin: number,
  xMax: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const step = (xMax - xMin) / (N_POINTS - 1);

  // caching must be ON for cacheHitRate to have any effect
  const baseParams = xKey === "cacheHitRate"
    ? { ...params, caching: true }
    : params;

  for (let i = 0; i < N_POINTS; i++) {
    const xVal = xMin + i * step;
    const p = { ...baseParams, [xKey]: xVal };
    const r = calculateTCO(p);
    const y =
      yKey === "costPerRequest" ? r.optimizedCostPerRequest :
      yKey === "tco"            ? r.tco :
      r.dailyInferenceCost;
    points.push({ x: Math.round(xVal * 10) / 10, y });
  }
  return points;
}

function fmtY(val: number, yKey: YAxisKey): string {
  if (yKey === "costPerRequest") {
    if (val < 0.001) return `€${val.toFixed(6)}`;
    if (val < 1)     return `€${val.toFixed(4)}`;
    return `€${val.toFixed(2)}`;
  }
  if (val >= 1_000_000) return `€${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000)     return `€${(val / 1_000).toFixed(1)}k`;
  return `€${val.toFixed(2)}`;
}

function findCrossover(
  pts1: { x: number; y: number }[],
  pts2: { x: number; y: number }[]
): number | null {
  for (let i = 1; i < pts1.length; i++) {
    const d0 = pts1[i - 1].y - pts2[i - 1].y;
    const d1 = pts1[i].y - pts2[i].y;
    if (d0 * d1 < 0) {
      return Math.round((pts1[i - 1].x + pts1[i].x) / 2);
    }
  }
  return null;
}

export function SensitivityPanel({
  params1,
  params2,
  model1Name,
  model2Name,
  model2Ever,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"line", { x: number; y: number }[], number> | null>(null);

  const initialXAxis = X_AXIS_OPTIONS.find((o) => o.value === "avgTokensPerRequest")!;
  const [xKey, setXKeyRaw] = useState<XAxisKey>("requestsPerDay");
  const [yKey, setYKey] = useState<YAxisKey>("tco");
  const [xMin, setXMin] = useState<number>(initialXAxis.min);
  const [xMax, setXMax] = useState<number>(initialXAxis.max);

  const setXKey = (key: XAxisKey) => {
    const opt = X_AXIS_OPTIONS.find((o) => o.value === key)!;
    setXKeyRaw(key);
    setXMin(opt.min);
    setXMax(opt.max);
  };

  // Build and render chart whenever inputs change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const xOpt = X_AXIS_OPTIONS.find((o) => o.value === xKey)!;
    const yOpt = Y_AXIS_OPTIONS.find((o) => o.value === yKey)!;

    const rangeMin = Math.min(xMin, xMax - xOpt.step);
    const rangeMax = Math.max(xMax, xMin + xOpt.step);

    const pts1 = buildPoints(params1, xKey, yKey, rangeMin, rangeMax);
    const pts2 = model2Ever
      ? buildPoints(params2, xKey, yKey, rangeMin, rangeMax)
      : [];
    const crossover = model2Ever ? findCrossover(pts1, pts2) : null;

    const datasets: ChartDataset<"line", { x: number; y: number }[]>[] = [
      {
        label: model1Name,
        data: pts1.map((p) => ({ x: p.x, y: p.y })),
        borderColor: "hsl(160, 60%, 45%)",
        backgroundColor: "rgba(29,158,117,0.07)",
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
    ];

    if (model2Ever) {
      datasets.push({
        label: model2Name,
        data: pts2.map((p) => ({ x: p.x, y: p.y })),
        borderColor: "hsl(280, 65%, 55%)",
        backgroundColor: "rgba(83,74,183,0.07)",
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
        borderDash: [6, 3],
      });
    }

    // Destroy old chart
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const annotations: Record<string, unknown> = {};
    if (crossover !== null) {
      annotations.crossoverLine = {
        type: "line",
        xMin: crossover,
        xMax: crossover,
        borderColor: "rgba(120,120,120,0.6)",
        borderWidth: 1.5,
        borderDash: [4, 3],
        label: {
          display: true,
          content: `Break-even: ${crossover} ${xOpt.unit}`,
          position: "start",
          backgroundColor: "rgba(80,80,80,0.8)",
          color: "#fff",
          font: { size: 11 },
          padding: 4,
        },
      };
    }

    const currentVal1 = params1[xKey];
    if (currentVal1 >= rangeMin && currentVal1 <= rangeMax) {
      annotations.currentVal1 = {
        type: "line",
        xMin: currentVal1,
        xMax: currentVal1,
        borderColor: "hsl(160, 60%, 45%)",
        borderWidth: 1,
        borderDash: [3, 3],
        label: {
          display: true,
          content: `${model1Name}: ${currentVal1} ${xOpt.unit}`,
          position: "end",
          backgroundColor: "rgba(29,158,117,0.8)",
          color: "#fff",
          font: { size: 10 },
          padding: 3,
        },
      };
    }

    if (model2Ever) {
      const currentVal2 = params2[xKey];
      if (currentVal2 >= rangeMin && currentVal2 <= rangeMax) {
        annotations.currentVal2 = {
          type: "line",
          xMin: currentVal2,
          xMax: currentVal2,
          borderColor: "hsl(280, 65%, 55%)",
          borderWidth: 1,
          borderDash: [3, 3],
          label: {
            display: true,
            content: `${model2Name}: ${currentVal2} ${xOpt.unit}`,
            position: "start",
            backgroundColor: "rgba(83,74,183,0.8)",
            color: "#fff",
            font: { size: 10 },
            padding: 3,
          },
        };
      }
    }

    chartRef.current = new Chart(canvas, {
      type: "line",
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 150 },
        plugins: {
          legend: { display: false },
          annotation: annotations,
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              title: (items: TooltipItem<"line">[]) =>
                `${xOpt.label}: ${items[0]?.parsed.x?.toFixed(0)} ${xOpt.unit}`,
              label: (item: TooltipItem<"line">) =>
                `${item.dataset.label}: ${fmtY(item.parsed.y, yKey)}`,
            },
          },
        },
        scales: {
          x: {
            type: "linear",
            min: rangeMin,
            max: rangeMax,
            title: {
              display: true,
              text: `${xOpt.label} (${xOpt.unit})`,
              font: { size: 12 },
              color: "hsl(0,0%,55%)",
            },
            ticks: { font: { size: 11 }, maxTicksLimit: 10 },
          },
          y: {
            title: {
              display: true,
              text: yOpt.label,
              font: { size: 12 },
              color: "hsl(0,0%,55%)",
            },
            ticks: {
              font: { size: 11 },
              callback: (v: number) => fmtY(v, yKey),
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [params1, params2, xKey, yKey, xMin, xMax, model2Ever, model1Name, model2Name]);

  const xOpt = X_AXIS_OPTIONS.find((o) => o.value === xKey)!;

  // Current values for stat cards
  const r1Current = calculateTCO(params1);
  const r2Current = model2Ever ? calculateTCO(params2) : null;
  const getVal = (r: ReturnType<typeof calculateTCO>) =>
    yKey === "costPerRequest" ? r.optimizedCostPerRequest :
    yKey === "tco"            ? r.tco :
    r.dailyInferenceCost;

  return (
    <div className="sensitivity-panel">
      <h2 className="sensitivity-title">
        Sensitivity Analysis
      </h2>

      <p className="sensitivity-description">
        Shows how one parameter affects cost while all others stay fixed
        (ceteris paribus). Initial values are taken from the Calculator tab.
      </p>

      {/* Controls */}
      <div className="sensitivity-controls">
        <div>
          <Label className="param-label">X-axis variable</Label>
          <Select value={xKey} onValueChange={(v) => setXKey(v as XAxisKey)}>
            <SelectTrigger className="param-input mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {X_AXIS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="param-label">Y-axis metric</Label>
          <Select value={yKey} onValueChange={(value) => setYKey(value as YAxisKey)}>
            <SelectTrigger className="param-input mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Y_AXIS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* X range slider */}
      <div>
        <div className="sensitivity-range-container">
          <Label className="param-label">
            X range — {xOpt.label}
          </Label>
          <span className="text-xs text-muted-foreground sensitivity-range-label">
            {xMin} – {xMax} {xOpt.unit}
          </span>
        </div>
        <Slider
          min={xOpt.min}
          max={xOpt.max}
          step={xOpt.step}
          value={[xMin, xMax]}
          onValueChange={(v) => {
            const [min, max] = v as [number, number];
            setXMin(min);
            setXMax(max);
          }}
          className="w-full"
        />
      </div>

      {/* Note for cacheHitRate */}
      {xKey === "cacheHitRate" && (
        <p className="text-xs text-muted-foreground sensitivity-cache-note">
          Caching is automatically enabled for this analysis regardless of the Calculator setting.
        </p>
      )}

      {/* Legend */}
      <div className="sensitivity-legend">
        <div className="sensitivity-legend-item">
          <div className="sensitivity-legend-line sensitivity-legend-line-model1" />
          <span className="text-muted-foreground">{model1Name}</span>
        </div>
        {model2Ever && (
          <div className="sensitivity-legend-item">
            <div className="sensitivity-legend-line sensitivity-legend-line-model2" />
            <span className="text-muted-foreground">{model2Name}</span>
          </div>
        )}
        <div className="sensitivity-legend-item">
          <div className="sensitivity-legend-line sensitivity-legend-line-breakeven" />
          <span className="text-muted-foreground">Break-even</span>
        </div>
        <div className="sensitivity-legend-item">
          <div className="sensitivity-legend-line sensitivity-legend-line-current" />
          <span className="text-muted-foreground">Current value</span>
        </div>
      </div>

      {/* Chart */}
      <div className="sensitivity-chart-container">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Sensitivity analysis: effect of ${xOpt.label} on ${yKey}`}
        />
      </div>

      {/* Stat cards — current param values */}
      <div className="sensitivity-stat-cards">
        <div className="metric-card">
          <div className="sensitivity-stat-value sensitivity-stat-value-model1">
            {fmtY(getVal(r1Current), yKey)}
          </div>
          <div className="metric-label">{model1Name} — current params</div>
        </div>
        {r2Current && (
          <div className="metric-card">
            <div className="sensitivity-stat-value sensitivity-stat-value-model2">
              {fmtY(getVal(r2Current), yKey)}
            </div>
            <div className="metric-label">{model2Name} — current params</div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground sensitivity-footer">
        Vertical dashed lines mark current parameter values from the Calculator
        tab. Adjust them there to move the reference markers.
      </p>
    </div>
  );
}
