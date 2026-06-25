import { TCOParams } from "@/lib/tco-calculations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Lock, LockOpen } from "lucide-react";
import { useState } from "react";

type NumericFieldKey = {
  [K in keyof TCOParams]: NonNullable<TCOParams[K]> extends number ? K : never;
}[keyof TCOParams];

interface Props {
  params1: TCOParams;
  params2: TCOParams;
  onParams1Change: (p: TCOParams) => void;
  onParams2Change: (p: TCOParams) => void;
  activeModel: 1 | 2;
  onModelChange: (m: 1 | 2) => void;
  days: number;
  onDaysChange: (d: number) => void;
  model1Name: string;
  model2Name: string;
  onModel1NameChange: (n: string) => void;
  onModel2NameChange: (n: string) => void;
  onReset: () => void;
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="param-section">
      <CollapsibleTrigger className="flex items-center justify-between w-full">
        <span className="param-section-title mb-0">{title}</span>
        <ChevronDown
          className="h-4 w-4 text-muted-foreground transition-transform"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function InputPanel({
  params1,
  params2,
  onParams1Change,
  onParams2Change,
  activeModel,
  onModelChange,
  days,
  onDaysChange,
  model1Name,
  model2Name,
  onModel1NameChange,
  onModel2NameChange,
  onReset,
}: Props) {
  const [lockedFields, setLockedFields] = useState<Partial<Record<NumericFieldKey, boolean>>>({});

  const activeParams = activeModel === 1 ? params1 : params2;
  const otherParams = activeModel === 1 ? params2 : params1;

  const updateActiveParams = (nextParams: TCOParams) => {
    if (activeModel === 1) {
      onParams1Change(nextParams);
    } else {
      onParams2Change(nextParams);
    }
  };

  const updateNumericField = <K extends NumericFieldKey>(key: K, value: number) => {
    const nextActiveParams = { ...activeParams, [key]: value } as TCOParams;
    if (lockedFields[key] && activeParams[key] === otherParams[key]) {
      const nextOtherParams = { ...otherParams, [key]: value } as TCOParams;
      if (activeModel === 1) {
        onParams1Change(nextActiveParams);
        onParams2Change(nextOtherParams);
      } else {
        onParams2Change(nextActiveParams);
        onParams1Change(nextOtherParams);
      }
      return;
    }

    updateActiveParams(nextActiveParams);
  };

  const toggleNumericLock = <K extends NumericFieldKey>(key: K) => {
    if (activeParams[key] !== otherParams[key]) {
      return;
    }

    setLockedFields((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleReset = () => {
    setLockedFields({});
    onReset();
  };

  // tco.ts sums impl hours internally (optimizationImplHours + architectureImplHours).
  // InputPanel must NOT touch engineeringHoursOneTime when toggling or editing impl hours.
  // engineeringHoursOneTime is purely the base hours field (e.g. 40h for API, 200h for self-hosted).

  const numField = (label: string, key: NumericFieldKey, step?: string) => {
    const value = (activeParams[key] ?? (key === "numberOfGpus" ? 1 : 0)) as number;
    const valuesMatch = params1[key] === params2[key];
    const isLocked = lockedFields[key] ?? false;

    return (
      <div className="grid grid-cols-2 items-center gap-2">
        <Label className="param-label">{label}</Label>
        <div className="relative">
          <Input
            type="number"
            className="param-input pr-10"
            value={value}
            step={step || "any"}
            onChange={(e) => updateNumericField(key, parseFloat(e.target.value) || 0)}
          />
          {valuesMatch && (
            <button
              type="button"
              aria-label={isLocked ? `Unlock ${label}` : `Lock ${label}`}
              aria-pressed={isLocked}
              title={isLocked ? `Unlock ${label}` : `Lock ${label}`}
              onClick={() => toggleNumericLock(key)}
              className="absolute inset-y-0 right-2 flex items-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    );
  };

  const toggle = (label: string, key: keyof TCOParams, disabled = false) => (
    <div className={`flex items-center justify-between ${disabled ? "opacity-50" : ""}`}>
      <Label className="param-label">{label}</Label>
      <Switch
        checked={activeParams[key] as boolean}
        onCheckedChange={(v) => updateActiveParams({ ...activeParams, [key]: v } as TCOParams)}
        disabled={disabled}
      />
    </div>
  );

  return (
    <div className="p-4 space-y-1">
        <h2
          className="text-sm font-bold uppercase tracking-widest text-primary mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Input Parameters
        </h2>

        {/* Timeline */}
        <Section title="Days" defaultOpen={true}>
          <div className="param-grid">
            <div className="grid grid-cols-2 items-center gap-2">
              <Label className="param-label">Number of days</Label>
              <Input
                type="number"
                className="param-input"
                value={days}
                step="1"
                onChange={(e) => onDaysChange(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </Section>

        {/* Model switcher */}
        <div className="param-section">
          <div className="flex items-center justify-between">
            <span className="param-section-title mb-0">Active Model</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onModelChange(1)}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  activeModel === 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {model1Name}
              </button>
              <button
                onClick={() => onModelChange(2)}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  activeModel === 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {model2Name}
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 items-center gap-2">
            <Label className="param-label">Rename</Label>
            <Input
              type="text"
              className="param-input"
              value={activeModel === 1 ? model1Name : model2Name}
              onChange={(e) =>
                activeModel === 1
                  ? onModel1NameChange(e.target.value)
                  : onModel2NameChange(e.target.value)
              }
            />
          </div>
        </div>

        {/* Model configuration */}
        <Section title="Model Configuration" defaultOpen={true}>
          <div className="param-grid">
            <div className="grid grid-cols-2 items-center gap-2">
              <Label className="param-label">Model Type</Label>
              <Select
                value={activeParams.modelType}
                onValueChange={(v) => {
                  const modelType = v as TCOParams["modelType"];
                  // Base one-time engineering hours by deployment type
                  // API: minimal setup; cloud: moderate; self-hosted: significant
                  const baseOneTimeHours: Record<string, number> = {
                    api: 40,
                    cloud: 100,
                    "self-hosted": 200,
                  };
                  // Monthly ops hours by deployment type
                  // Source: Reyna et al. (2025) — staffing is major self-hosted TCO driver
                  const baseMonthlyOpsHours: Record<string, number> = {
                    api: 10,
                    cloud: 20,
                    "self-hosted": 40,
                  };
                  // engineeringHoursOneTime = base hours only.
                  // impl hours are summed inside tco.ts, not here.
                  updateActiveParams({
                    ...activeParams,
                    modelType,
                    engineeringHoursOneTime: baseOneTimeHours[modelType],
                    engineeringHoursMonthlyOps: baseMonthlyOpsHours[modelType],
                    trainingGpuHours: 0,
                    finetuningCost: 0,
                    dataPreparationCost: 0,
                    hardwareCost: 0,
                  });
                }}
              >
                <SelectTrigger className="param-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api">API Model</SelectItem>
                  <SelectItem value="cloud">Cloud-hosted</SelectItem>
                  <SelectItem value="self-hosted">Self-hosted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {numField("Input token price (€/1M tok)", "inputTokenPrice", "0.1")}
            {numField("Output token price (€/1M tok)", "outputTokenPrice", "0.1")}
            {numField("Context length (tokens)", "contextLength", "1")}
            {numField("Response length (tokens)", "responseLength", "1")}
          </div>
        </Section>

        {/* Usage */}
        <Section title="Usage Parameters" defaultOpen={true}>
          <div className="param-grid">
            {numField("Requests per day", "requestsPerDay", "1")}
            {numField("Avg input tokens / request", "avgTokensPerRequest", "1")}
            {numField("Avg response tokens", "avgResponseTokens", "1")}
            {/* peakLoadMultiplier kept as informational input for infra sizing,
                but no longer distorts daily request count in calculations */}
          </div>
        </Section>

        {/* Architecture */}
        <Section title="System Architecture">
          <div className="param-grid space-y-1">
            {toggle("Vector Database", "vectorDb")}
            {activeParams.vectorDb &&
              numField("Implementation hours", "vectorDbImplHours", "1")}

            {toggle("Embedding Generation", "embeddingGen")}
            {activeParams.embeddingGen &&
              numField("Implementation hours", "embeddingGenImplHours", "1")}

            {toggle("Reranking Model", "rerankingModel")}
            {activeParams.rerankingModel &&
              numField("Reranker cost / req (€)", "rerankerCostPerReq", "0.000001")}
            {activeParams.rerankingModel &&
              numField("Implementation hours", "rerankingImplHours", "1")}

            {toggle("Moderation Model", "moderationModel")}
            {activeParams.moderationModel &&
              numField("Implementation hours", "moderationImplHours", "1")}

            {toggle("Guardrails", "guardrails")}
            {activeParams.guardrails &&
              numField("Implementation hours", "guardrailsImplHours", "1")}

            {toggle("Tool Calls", "toolCalls")}
            {activeParams.toolCalls &&
              numField("Tool calls / request (avg)", "toolCallsPerRequest", "1")}
            {activeParams.toolCalls &&
              numField("Implementation hours", "toolCallsImplHours", "1")}
          </div>
        </Section>

        {/* Optimizations */}
        <Section title="Optimization Toggles">
          <div className="param-grid space-y-1">

            {toggle("Caching", "caching")}
            {activeParams.caching &&
              numField("Cache hit rate (%)", "cacheHitRate", "1")}
            {activeParams.caching &&
              numField("Implementation hours", "cachingImplHours", "1")}

            {toggle("Model Routing", "modelRouting")}
            {activeParams.modelRouting &&
              numField("Small model share (%)", "routingSmallModelShare", "1")}
            {activeParams.modelRouting &&
              numField("Small/large cost ratio", "routingCostRatio", "0.01")}
            {activeParams.modelRouting &&
              numField("Implementation hours", "routingImplHours", "1")}

            {/* Quantization: only relevant for self-hosted / cloud */}
            {toggle(
              "Quantization",
              "quantization",
              activeParams.modelType === "api"
            )}
            {activeParams.quantization && activeParams.modelType !== "api" && (
              <>
                {numField("Throughput gain (multiplier)", "quantizationThroughputGain", "0.1")}
                {numField("Implementation hours", "quantizationImplHours", "1")}
              </>
            )}

            {/* Batching: API discount vs self-hosted utilization */}
            {toggle("Batching", "batching")}
            {activeParams.batching && activeParams.modelType === "api" &&
              numField("API batch discount (%)", "apiBatchDiscount", "1")}
            {activeParams.batching && activeParams.modelType !== "api" &&
              numField("Utilization gain (%)", "selfHostedBatchUtilizationGain", "1")}
            {activeParams.batching &&
              numField("Implementation hours", "batchingImplHours", "1")}

            {toggle("Prompt Compression", "promptCompression")}
            {activeParams.promptCompression &&
              numField("Token reduction (%)", "tokenReduction", "1")}
            {activeParams.promptCompression &&
              numField("Implementation hours", "compressionImplHours", "1")}

            {toggle(
              "Fine-tuning",
              "fineTuningReduction",
              activeParams.modelType === "api"
            )}
            {activeParams.fineTuningReduction && activeParams.modelType !== "api" && (
              <>
                {numField("Training GPU hours", "trainingGpuHours", "1")}
                {numField("Data preparation cost (€)", "dataPreparationCost", "1")}
                {numField("Implementation hours", "fineTuningImplHours", "1")}
              </>
            )}

            {/* Speculative decoding: self-hosted / cloud only */}
            {toggle(
              "Speculative Decoding",
              "speculativeDecoding",
              activeParams.modelType === "api"
            )}
            {activeParams.speculativeDecoding && activeParams.modelType !== "api" && (
              <>
                {numField("Throughput gain (multiplier)", "specDecodingThroughputGain", "0.1")}
                {numField("Implementation hours", "specDecodingImplHours", "1")}
              </>
            )}
          </div>
        </Section>

        {/* Development & ops cost */}
        <Section title="Development Cost">
          <div className="param-grid">
            {numField("Engineering hours (one-time)", "engineeringHoursOneTime", "1")}
            {numField("Monthly ops hours", "engineeringHoursMonthlyOps", "1")}
            {numField("Cost per hour (€/hr)", "costPerHour", "1")}
            {activeParams.modelType !== "api" && numField("GPU price (€/hr)", "gpuPrice", "0.1")}
            {activeParams.modelType !== "api" && numField("Number of GPUs", "numberOfGpus", "1")}
            {activeParams.modelType === "self-hosted" && numField("Hardware costs (€)", "hardwareCost", "1")}
            {/* Tokens per second shown only for self-hosted/cloud */}
            {activeParams.modelType !== "api" &&
              numField("Tokens per second (GPU throughput)", "tokensPerSecond", "1")}
          </div>
        </Section>

        <button
          onClick={handleReset}
          className="w-full mt-4 px-4 py-2 rounded text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Reset Parameters
        </button>
      </div>
  );
}
