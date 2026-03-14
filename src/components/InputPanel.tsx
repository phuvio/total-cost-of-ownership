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

export function InputPanel({ params, onChange, activeModel, onModelChange, days, onDaysChange, model1Name, model2Name, onModel1NameChange, onModel2NameChange }: Props) {
  const set = <K extends keyof TCOParams>(key: K, val: TCOParams[K]) =>
    onChange({ ...params, [key]: val });

  const numField = (label: string, key: keyof TCOParams, step?: string) => (
    <div className="grid grid-cols-2 items-center gap-2">
      <Label className="param-label">{label}</Label>
      <Input
        type="number"
        className="param-input"
        value={params[key] as number}
        step={step || "any"}
        onChange={(e) => set(key, parseFloat(e.target.value) || 0)}
      />
    </div>
  );

  const toggle = (label: string, key: keyof TCOParams) => (
    <div className="flex items-center justify-between">
      <Label className="param-label">{label}</Label>
      <Switch
        checked={params[key] as boolean}
        onCheckedChange={(v) => set(key, v as TCOParams[typeof key])}
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
              <Select value={params.modelType} onValueChange={(v) => set('modelType', v as TCOParams['modelType'])}>
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
            {numField("Input token price ($/tok)", "inputTokenPrice", "0.000001")}
            {numField("Output token price ($/tok)", "outputTokenPrice", "0.000001")}
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
            {toggle("Embedding Generation", "embeddingGen")}
            {toggle("Reranking Model", "rerankingModel")}
            {toggle("Moderation Model", "moderationModel")}
            {toggle("Guardrails", "guardrails")}
            {toggle("Tool Calls", "toolCalls")}
            {numField("Embedding cost / req ($)", "embeddingCostPerReq", "0.0001")}
            {numField("Reranker cost / req ($)", "rerankerCostPerReq", "0.0001")}
          </div>
        </Section>

        <Section title="Optimization Toggles">
          <div className="param-grid space-y-1">
            {toggle("Caching", "caching")}
            {toggle("Model Routing", "modelRouting")}
            {toggle("Quantization", "quantization")}
            {toggle("Batching", "batching")}
            {toggle("Prompt Compression", "promptCompression")}
            {numField("Cache hit rate (%)", "cacheHitRate", "1")}
            {numField("Routing share (%)", "routingShare", "1")}
            {numField("Batch size", "batchSize", "1")}
            {numField("Token reduction (%)", "tokenReduction", "1")}
          </div>
        </Section>

        <Section title="Development Cost">
          <div className="param-grid">
            {numField("Engineering hours", "engineeringHours", "1")}
            {numField("Cost per hour ($/hr)", "costPerHour", "1")}
            {numField("Training GPU hours", "trainingGpuHours", "1")}
            {numField("GPU price ($/hr)", "gpuPrice", "0.1")}
            {numField("Fine-tuning cost ($)", "finetuningCost", "1")}
            {numField("Data preparation cost ($)", "dataPreparationCost", "1")}
          </div>
        </Section>
        <button
          onClick={() => { onChange({ ...defaultParams }); onDaysChange(defaultParams.days); onModelChange(1); }}
          className="w-full mt-4 px-4 py-2 rounded text-sm font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Reset Parameters
        </button>
      </div>
    </ScrollArea>
  );
}
