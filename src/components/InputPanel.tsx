import { TCOParams, defaultParams } from "@/lib/tco-calculations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface Props {
  params: TCOParams;
  onChange: (p: TCOParams) => void;
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

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="param-section">
      <CollapsibleTrigger className="flex items-center justify-between w-full">
        <span className="param-section-title mb-0">{title}</span>
        <ChevronDown
          className="h-4 w-4 text-muted-foreground transition-transform"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function InputPanel({ params, onChange, activeModel, onModelChange, days, onDaysChange, model1Name, model2Name, onModel1NameChange, onModel2NameChange, onReset }: Props) {
  const set = <K extends keyof TCOParams>(key: K, val: TCOParams[K]) =>
    onChange({ ...params, [key]: val });

  const implHoursMap: Partial<Record<keyof TCOParams, keyof TCOParams>> = {
    vectorDb: 'vectorDbImplHours',
    embeddingGen: 'embeddingGenImplHours',
    rerankingModel: 'rerankingImplHours',
    moderationModel: 'moderationImplHours',
    guardrails: 'guardrailsImplHours',
    toolCalls: 'toolCallsImplHours',
    caching: 'cachingImplHours',
    modelRouting: 'routingImplHours',
    quantization: 'quantizationImplHours',
    batching: 'batchingImplHours',
    promptCompression: 'compressionImplHours',
    fineTuningReduction: 'fineTuningImplHours',
    speculativeDecoding: 'specDecodingImplHours',
  };

  const implHoursValues = new Set<string>(Object.values(implHoursMap) as string[]);

  const numField = (label: string, key: keyof TCOParams, step?: string) => (
    <div className="grid grid-cols-2 items-center gap-2">
      <Label className="param-label">{label}</Label>
      <Input
        type="number"
        className="param-input"
        value={params[key] as number}
        step={step || "any"}
        onChange={(e) => {
          const newVal = parseFloat(e.target.value) || 0;
          if (implHoursValues.has(key as string)) {
            const oldVal = params[key] as number;
            const delta = newVal - oldVal;
            onChange({ ...params, [key]: newVal, engineeringHours: Math.max(0, params.engineeringHours + delta) });
          } else {
            set(key, newVal as TCOParams[typeof key]);
          }
        }}
      />
    </div>
  );

  const toggle = (label: string, key: keyof TCOParams, disabled = false) => (
    <div className={`flex items-center justify-between ${disabled ? 'opacity-50' : ''}`}>
      <Label className="param-label">{label}</Label>
      <Switch
        checked={params[key] as boolean}
        onCheckedChange={(v) => {
          const implKey = implHoursMap[key];
          if (implKey) {
            const hours = params[implKey] as number;
            const currentEng = params.engineeringHours;
            const newEng = v
              ? currentEng + hours
              : Math.max(0, currentEng - hours);
            onChange({ ...params, [key]: v, engineeringHours: newEng });
          } else {
            set(key, v as TCOParams[typeof key]);
          }
        }}
        disabled={disabled}
      />
    </div>
  );

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          Input Parameters
        </h2>

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

        {/* Model Switcher */}
        <div className="param-section">
          <div className="flex items-center justify-between">
            <span className="param-section-title mb-0">Active Model</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onModelChange(1)}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  activeModel === 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {model1Name}
              </button>
              <button
                onClick={() => onModelChange(2)}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  activeModel === 2
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {model2Name}
              </button>
            </div>
          </div>
          {/* Editable model name */}
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

        <Section title="Model Configuration" defaultOpen={true}>
          <div className="param-grid">
            <div className="grid grid-cols-2 items-center gap-2">
              <Label className="param-label">Model Type</Label>
              <Select value={params.modelType} onValueChange={(v) => {
                const modelType = v as TCOParams['modelType'];
                const engineeringDefaults: Record<string, number> = {
                  'api': 10,
                  'cloud': 100,
                  'self-hosted': 500,
                };
                const baseHours = engineeringDefaults[modelType] ?? 10;
                // Sum implementation hours from all active toggles
                const activeImplHours = Object.entries(implHoursMap).reduce((sum, [toggleKey, hoursKey]) => {
                  if (params[toggleKey as keyof TCOParams]) {
                    return sum + (params[hoursKey as keyof TCOParams] as number);
                  }
                  return sum;
                }, 0);
                onChange({
                  ...params,
                  modelType,
                  engineeringHours: baseHours + activeImplHours,
                  costPerHour: 150,
                  trainingGpuHours: 0,
                  gpuPrice: 3.5,
                  finetuningCost: 0,
                  dataPreparationCost: 0,
                  hardwareCost: 0,
                });
              }}>
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
            {numField("Input token price (€/tok)", "inputTokenPrice", "0.000001")}
            {numField("Output token price (€/tok)", "outputTokenPrice", "0.000001")}
            {numField("Context length", "contextLength", "1")}
            {numField("Response length", "responseLength", "1")}
          </div>
        </Section>

        <Section title="Usage Parameters" defaultOpen={true}>
          <div className="param-grid">
            {numField("Requests per day", "requestsPerDay", "1")}
            {numField("Avg tokens / request", "avgTokensPerRequest", "1")}
            {numField("Avg response tokens", "avgResponseTokens", "1")}
            {numField("Peak load multiplier", "peakLoadMultiplier", "0.1")}
          </div>
        </Section>

        <Section title="System Architecture">
          <div className="param-grid space-y-1">
            {toggle("Vector Database", "vectorDb")}
            {params.vectorDb && numField("Implementation hours", "vectorDbImplHours", "1")}
            {toggle("Embedding Generation", "embeddingGen")}
            {params.embeddingGen && numField("Implementation hours", "embeddingGenImplHours", "1")}
            {toggle("Reranking Model", "rerankingModel")}
            {params.rerankingModel && numField("Implementation hours", "rerankingImplHours", "1")}
            {toggle("Moderation Model", "moderationModel")}
            {params.moderationModel && numField("Implementation hours", "moderationImplHours", "1")}
            {toggle("Guardrails", "guardrails")}
            {params.guardrails && numField("Implementation hours", "guardrailsImplHours", "1")}
            {toggle("Tool Calls", "toolCalls")}
            {params.toolCalls && numField("Implementation hours", "toolCallsImplHours", "1")}
            {numField("Embedding cost / req (€)", "embeddingCostPerReq", "0.0001")}
            {numField("Reranker cost / req (€)", "rerankerCostPerReq", "0.0001")}
          </div>
        </Section>

        <Section title="Optimization Toggles">
          <div className="param-grid space-y-1">
            {toggle("Caching", "caching")}
            {params.caching && numField("Cache hit rate (%)", "cacheHitRate", "1")}
            {params.caching && numField("Implementation hours", "cachingImplHours", "1")}
            {toggle("Model Routing", "modelRouting")}
            {params.modelRouting && numField("Routing share (%)", "routingShare", "1")}
            {params.modelRouting && numField("Implementation hours", "routingImplHours", "1")}
            {toggle("Quantization", "quantization", params.modelType === 'api')}
            {params.quantization && params.modelType !== 'api' && numField("Size reduction (%)", "sizeReduction", "1")}
            {params.quantization && params.modelType !== 'api' && numField("Implementation hours", "quantizationImplHours", "1")}
            {toggle("Batching", "batching")}
            {params.batching && numField("Batch size", "batchSize", "1")}
            {params.batching && numField("Implementation hours", "batchingImplHours", "1")}
            {toggle("Prompt Compression", "promptCompression")}
            {params.promptCompression && numField("Token reduction (%)", "tokenReduction", "1")}
            {params.promptCompression && numField("Implementation hours", "compressionImplHours", "1")}
            {toggle("Fine-tuning", "fineTuningReduction", params.modelType === 'api')}
            {params.fineTuningReduction && params.modelType !== 'api' && numField("Reduction of token usage (%)", "fineTuningTokenReduction", "1")}
            {params.fineTuningReduction && params.modelType !== 'api' && numField("Implementation hours", "fineTuningImplHours", "1")}
            {toggle("Speculative Decoding", "speculativeDecoding", params.modelType === 'api')}
            {params.speculativeDecoding && params.modelType !== 'api' && numField("Reduced inference cost (%)", "specDecodingReduction", "1")}
            {params.speculativeDecoding && params.modelType !== 'api' && numField("Implementation hours", "specDecodingImplHours", "1")}
          </div>
        </Section>

        <Section title="Development Cost">
          <div className="param-grid">
            {numField("Engineering hours", "engineeringHours", "1")}
            {numField("Cost per hour (€/hr)", "costPerHour", "1")}
            {numField("Training GPU hours", "trainingGpuHours", "1")}
            {numField("GPU price (€/hr)", "gpuPrice", "0.1")}
            {numField("Fine-tuning cost (€)", "finetuningCost", "1")}
            {numField("Data preparation cost (€)", "dataPreparationCost", "1")}
            {numField("Hardware costs (€)", "hardwareCost", "1")}
          </div>
        </Section>
        <button
          onClick={onReset}
          className="w-full mt-4 px-4 py-2 rounded text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Reset Parameters
        </button>
      </div>
    </ScrollArea>
  );
}
