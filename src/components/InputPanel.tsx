import { TCOParams } from "@/lib/tco-calculations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  params: TCOParams;
  onChange: (p: TCOParams) => void;
}

export function InputPanel({ params, onChange }: Props) {
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

        {/* Model Configuration */}
        <div className="param-section">
          <div className="param-section-title">Model Configuration</div>
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
        </div>

        {/* Usage Parameters */}
        <div className="param-section">
          <div className="param-section-title">Usage Parameters</div>
          <div className="param-grid">
            {numField("Requests per day", "requestsPerDay", "1")}
            {numField("Avg tokens / request", "avgTokensPerRequest", "1")}
            {numField("Avg response tokens", "avgResponseTokens", "1")}
            {numField("Peak load multiplier", "peakLoadMultiplier", "0.1")}
          </div>
        </div>

        {/* System Architecture */}
        <div className="param-section">
          <div className="param-section-title">System Architecture</div>
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
        </div>

        {/* Optimization Toggles */}
        <div className="param-section">
          <div className="param-section-title">Optimization Toggles</div>
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
        </div>

        {/* Development Cost */}
        <div className="param-section">
          <div className="param-section-title">Development Cost</div>
          <div className="param-grid">
            {numField("Engineering hours", "engineeringHours", "1")}
            {numField("Cost per hour ($/hr)", "costPerHour", "1")}
            {numField("Training GPU hours", "trainingGpuHours", "1")}
            {numField("GPU price ($/hr)", "gpuPrice", "0.1")}
            {numField("Fine-tuning cost ($)", "finetuningCost", "1")}
            {numField("Data preparation cost ($)", "dataPreparationCost", "1")}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
