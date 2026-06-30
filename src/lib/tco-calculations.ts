export interface TCOParams {
  // Timeline
  days: number;

  // Model config
  modelType: 'api' | 'cloud' | 'self-hosted';
  inputTokenPrice: number;   // € per 1M tokens
  outputTokenPrice: number;  // € per 1M tokens
  contextLength: number;     // max tokens
  responseLength: number;    // max output tokens

  // Usage
  requestsPerDay: number;
  avgTokensPerRequest: number;
  avgResponseTokens: number;

  // Architecture components
  vectorDb: boolean;
  embeddingGen: boolean;
  rerankingModel: boolean;
  moderationModel: boolean;
  guardrails: boolean;
  toolCalls: boolean;
  toolCallsPerRequest: number; // avg number of tool calls per request
  avgCostPerToolCall?: number; // € per tool call on average

  // Optimization flags
  caching: boolean;
  modelRouting: boolean;
  quantization: boolean;
  batching: boolean;
  promptCompression: boolean;
  fineTuningReduction: boolean;
  speculativeDecoding: boolean;

  // Optimization parameters — all require source justification (see comments)
  cacheHitRate: number;        // 0–100 %
  routingSmallModelShare: number;  // 0–100 %, share routed to cheap model
  routingCostRatio: number;    // cheap model cost / expensive model cost (replaces hardcoded 0.3)
  tokenReduction: number;      // 0–100 %, prompt compression savings
  fineTuningTokenReduction: number; // legacy parameter; no longer used in calculations

  // Quantization: affects GPU memory and throughput, NOT token prices
  // Dettmers et al. (2022) LLM.int8(); Frantar et al. (2022) GPTQ
  quantizationThroughputGain: number; // e.g. 1.5 = 50% more tokens/sec with INT8
  quantizationQualityRetention: number; // 0–100%, typically 95–99% (GPTQ paper)

  // Speculative decoding: latency/throughput benefit for self-hosted
  // Leviathan et al. (2023) "Fast Inference from Transformers via Speculative Decoding"
  specDecodingThroughputGain: number; // e.g. 2.0 = 2x throughput

  // Batching: API batch discount vs self-hosted utilization improvement
  // Anthropic/OpenAI Batch API: 50% discount on eligible requests
  apiBatchDiscount: number;    // 0–100 %, typically 50 for Anthropic/OpenAI
  // vLLM continuous batching: Kwon et al. (2023)
  selfHostedBatchUtilizationGain: number; // 0–100 %, throughput improvement

  // Self-hosted compute
  // Default throughput sources: MLCommons MLPerf Inference results
  tokensPerSecond: number;     // GPU throughput, model- and hardware-specific
  gpuPrice: number;            // $/hour
  // numberOfGpus is a capacity-planning input. It does not multiply per-request
  // compute cost. It only informs hardwareCost, which the caller should set 
  // as numberOfGpus × per-unit acquisition price  for self-hosted deployments.
  // Included here for documentation/UI purposes.
  numberOfGpus?: number;

  // Fine-tuning costs
  trainingGpuHours: number;
  finetuningCost?: number; // legacy field; ignored in calculations
  dataPreparationCost: number;
  hardwareCost: number; // total hardware cost = numberOfGpus × unit price (self-hosted only)

  // Engineering costs — split into one-time and recurring
  // One-time: architecture setup, optimization implementation
  engineeringHoursOneTime: number;
  costPerHour: number;
  // Recurring monthly: ops, monitoring, maintenance
  // Rationale: architecture components (RAG, reranker) require ongoing ops
  engineeringHoursMonthlyOps: number;

  // Implementation hours per optimization (one-time)
  cachingImplHours: number;
  routingImplHours: number;
  quantizationImplHours: number;
  batchingImplHours: number;
  compressionImplHours: number;
  fineTuningImplHours: number;
  specDecodingImplHours: number;

  // Implementation hours per architecture component (one-time)
  vectorDbImplHours: number;
  embeddingGenImplHours: number;
  rerankingImplHours: number;
  moderationImplHours: number;
  guardrailsImplHours: number;
  toolCallsImplHours: number;
}

export const defaultParams: TCOParams = {
  days: 365,
  modelType: 'api',

  // OpenAI GPT-5.4 pricing as of 2026 converted to euros (update from provider pricing pages)
  // Prices in € per 1M tokens
  inputTokenPrice: 2.175, // €/M tokens
  outputTokenPrice: 13.05, // €/M tokens
  contextLength: 4096,
  responseLength: 512,

  requestsPerDay: 10000,
  avgTokensPerRequest: 2000,
  avgResponseTokens: 500,

  vectorDb: false,
  embeddingGen: false,
  rerankingModel: false,
  moderationModel: false,
  guardrails: false,
  toolCalls: false,
  toolCallsPerRequest: 2,
  avgCostPerToolCall: 0.002,

  // Optimization flags — all default to false (no optimizations applied)
  caching: false,
  modelRouting: false,
  quantization: false,
  batching: false,
  promptCompression: false,
  fineTuningReduction: false,
  speculativeDecoding: false,

  // SGLang (Zheng et al., 2023) §4: ~30% prefix cache hit rate for general chatbot workloads
  cacheHitRate: 30,

  // RouteLLM (Ong et al., 2024): 40–60% of queries can be handled by smaller models
  routingSmallModelShare: 50,
  // Example: GPT-4o-mini vs GPT-4o = ~15x price diff → ratio ≈ 0.067
  // Claude Haiku vs Sonnet = ~5x → ratio ≈ 0.20. Use conservative 0.15 as default.
  routingCostRatio: 0.15,

  // LLMLingua (Jiang et al., 2023): 2–5x compression, conservative 20% token reduction default
  tokenReduction: 20,
  fineTuningTokenReduction: 15,

  // Dettmers et al. (2022) LLM.int8(): INT8 quantization ~1.3–1.5x throughput on A100
  quantizationThroughputGain: 1.4,
  quantizationQualityRetention: 97,

  // Leviathan et al. (2023): 2–3x wallclock speedup with speculative decoding
  specDecodingThroughputGain: 2.0,

  // Anthropic / OpenAI Batch API: 50% discount, documented in provider API docs
  apiBatchDiscount: 50,
  // Kwon et al. (2023) vLLM continuous batching: up to 23x throughput vs naive serving
  // Conservative default: 40% utilization improvement with moderate batch sizes
  selfHostedBatchUtilizationGain: 40,

  // MLPerf Inference results: A100 80GB, Llama-2-70B, ~20 tok/s single-stream
  // With vLLM continuous batching at moderate load: ~200–400 tok/s realistic throughput
  tokensPerSecond: 300,
  // Lambda Labs A100 80GB: ~$1.99/hr on-demand; A10G ~$0.76/hr (2024 rates)
  gpuPrice: 1.99,
  numberOfGpus: 1,

  trainingGpuHours: 0,
  dataPreparationCost: 0,
  hardwareCost: 0,

  // Base engineering: initial deployment setup
  // Conservative estimate: 40h for basic API integration, 200h for self-hosted
  engineeringHoursOneTime: 40,
  // Monthly ops: ~10h for API-based, ~40h for self-hosted
  // Source: Reyna et al. (2025) on-premise TCO paper reports staffing as major TCO component
  engineeringHoursMonthlyOps: 10,
  costPerHour: 150,

  // Implementation hours — based on typical engineering estimates
  // These are the most uncertain parameters; treat as configurable, not ground truth
  cachingImplHours: 16,
  routingImplHours: 28,
  quantizationImplHours: 80,
  batchingImplHours: 24,
  compressionImplHours: 12,
  fineTuningImplHours: 120,
  specDecodingImplHours: 80,

  vectorDbImplHours: 80,
  embeddingGenImplHours: 24,
  rerankingImplHours: 60,
  moderationImplHours: 16,
  guardrailsImplHours: 30,
  toolCallsImplHours: 80,
};

export function calculateTCO(p: TCOParams) {
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Effective token counts (context window clipping)
  // ─────────────────────────────────────────────────────────────────────────
  const effectiveInputTokens = Math.min(p.avgTokensPerRequest, p.contextLength);
  const effectiveOutputTokens = Math.min(p.avgResponseTokens, p.responseLength);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Token-level reductions (prompt compression only)
  //
  // FIX: quantization is REMOVED from token factor.
  // Quantization reduces model size and improves GPU throughput;
  // it does not change the number of tokens sent to/from the model.
  // Source: Dettmers et al. (2022) LLM.int8(); Frantar et al. (2022) GPTQ
  // ─────────────────────────────────────────────────────────────────────────
  const compressionFactor = p.promptCompression ? (1 - p.tokenReduction / 100) : 1;
  const finalInputTokens = effectiveInputTokens * compressionFactor;
  const finalOutputTokens = effectiveOutputTokens; // compression only on input

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Token cost (API pricing)
  // Source: provider pricing pages (OpenAI, Anthropic, Google)
  // FrugalGPT (Chen et al. 2023): C = P_in × T_in + P_out × T_out
  // Prices are in € per 1M tokens, so divide by 1,000,000 for per-token calculation
  // ─────────────────────────────────────────────────────────────────────────
  const tokenCost = (finalInputTokens * p.inputTokenPrice + finalOutputTokens * p.outputTokenPrice) / 1_000_000;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Architecture component costs per request
  // ─────────────────────────────────────────────────────────────────────────

  // Moderation + guardrails: additional model inference
  // OpenAI moderation API: $0.00002/1K tokens (near-zero); guardrails higher
  const cGuardrails = (p.moderationModel ? 0.00002 : 0) + (p.guardrails ? 0.0003 : 0);

  // Tool calls: each tool call is an additional LLM round-trip
  // Cost = number of tool calls × average cost per tool call
  const avgCostPerToolCall = p.avgCostPerToolCall ?? defaultParams.avgCostPerToolCall;
  const cTools = p.toolCalls ? p.toolCallsPerRequest * avgCostPerToolCall : 0;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: Compute cost for self-hosted / cloud-hosted deployments
  //
  // FIX: quantization now correctly affects throughput (tokens/sec), not token prices.
  // Formula: cost = (tokens / throughput) × cost_per_second
  // Source: MLCommons MLPerf Inference Benchmark for throughput defaults
  // ─────────────────────────────────────────────────────────────────────────
  const effectiveThroughput = p.quantization
    ? p.tokensPerSecond * p.quantizationThroughputGain
    : p.tokensPerSecond;

  // Speculative decoding: further throughput improvement (self-hosted only)
  // Leviathan et al. (2023): 2–3x wallclock speedup
  const throughputWithSpecDecoding = p.speculativeDecoding
    ? effectiveThroughput * p.specDecodingThroughputGain
    : effectiveThroughput;

  const gpuCount = Math.max(0, p.numberOfGpus ?? 1);
  const costPerSecond = p.gpuPrice / 3600;
  const totalTokens = finalInputTokens + finalOutputTokens;
  const inferenceSeconds = totalTokens / throughputWithSpecDecoding;

  const computeCostPerRequest = inferenceSeconds * costPerSecond;

  const computeCost =
    p.modelType === 'self-hosted' ? computeCostPerRequest :
    p.modelType === 'cloud' ? computeCostPerRequest :
    0; // API: compute bundled into token price

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 6: Base inference cost per request (before request-level optimizations)
  // ─────────────────────────────────────────────────────────────────────────
  const baseCostPerRequest = tokenCost + cGuardrails + cTools + computeCost;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 7: Request-level optimizations
  // ─────────────────────────────────────────────────────────────────────────

  // Caching: skip inference for cache hits
  // SGLang (Zheng et al., 2023): prefix caching for shared system prompts
  // GPTCache, semantic caching: hit rate depends heavily on use case
  const cacheFactor = p.caching ? (1 - p.cacheHitRate / 100) : 1;

  // Model routing: route share of requests to cheaper model
  // FIX: routingCostRatio replaces hardcoded 0.3, user-configurable
  // RouteLLM (Ong et al., 2024): 40–60% of queries handleable by smaller model
  // FrugalGPT (Chen et al., 2023): cascade approach for cost/quality tradeoff
  const routingFactor = p.modelRouting
    ? (1 - p.routingSmallModelShare / 100) + (p.routingSmallModelShare / 100) * p.routingCostRatio
    : 1;

  // Batching:
  // FIX: separate API batch discount from self-hosted throughput gain
  // API batch: 50% discount (Anthropic Batch API docs, OpenAI Batch API docs)
  // Self-hosted: continuous batching improves GPU utilization (Kwon et al. 2023 vLLM)
  //   — higher utilization means more requests per GPU-hour, reducing cost/request
  const batchFactor =
    !p.batching ? 1 :
    p.modelType === 'api' ? (1 - p.apiBatchDiscount / 100) :
    (1 / (1 + p.selfHostedBatchUtilizationGain / 100)); // cost/req decreases as utilization rises

  const requestFactor = cacheFactor * routingFactor * batchFactor;
  const optimizedCostPerRequest = baseCostPerRequest * requestFactor;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 8: Reference cost (no optimizations, for savings calculation)
  // ─────────────────────────────────────────────────────────────────────────
  const referenceCostPerRequest =
    (effectiveInputTokens * p.inputTokenPrice +
    effectiveOutputTokens * p.outputTokenPrice) / 1_000_000 +
    cGuardrails + cTools + computeCostPerRequest;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 9: Engineering costs — split one-time vs recurring
  //
  // FIX: recurring ops costs (RAG pipeline maintenance, monitoring) are
  // ongoing and should NOT be counted only as upfront capex.
  // Source: Reyna et al. (2025) on-premise TCO paper: staffing is major component
  // ─────────────────────────────────────────────────────────────────────────

  // One-time implementation costs
  const optimizationImplHours =
    (p.caching ? p.cachingImplHours : 0) +
    (p.modelRouting ? p.routingImplHours : 0) +
    (p.quantization ? p.quantizationImplHours : 0) +
    (p.batching ? p.batchingImplHours : 0) +
    (p.promptCompression ? p.compressionImplHours : 0) +
    (p.fineTuningReduction ? p.fineTuningImplHours : 0) +
    (p.speculativeDecoding ? p.specDecodingImplHours : 0);

  const architectureImplHours =
    (p.vectorDb ? p.vectorDbImplHours : 0) +
    (p.embeddingGen ? p.embeddingGenImplHours : 0) +
    (p.rerankingModel ? p.rerankingImplHours : 0) +
    (p.moderationModel ? p.moderationImplHours : 0) +
    (p.guardrails ? p.guardrailsImplHours : 0) +
    (p.toolCalls ? p.toolCallsImplHours : 0);

  const oneTimeEngineeringCost =
    (p.engineeringHoursOneTime + optimizationImplHours + architectureImplHours) * p.costPerHour;

  // Recurring ops cost over the deployment period
  const months = p.days / 30.44;
  const recurringEngineeringCost = p.engineeringHoursMonthlyOps * p.costPerHour * months;

  const totalEngineeringCost = oneTimeEngineeringCost + recurringEngineeringCost;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 10: Training / setup costs (one-time capex)
  // ─────────────────────────────────────────────────────────────────────────
  const cTrainingCompute = p.trainingGpuHours * p.gpuPrice;
  const totalSetupCost =
    cTrainingCompute +
    p.dataPreparationCost +
    p.hardwareCost +
    oneTimeEngineeringCost; // only one-time here

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 11: Usage scaling
  //
  // FIX: peak load multiplier removed from daily request count.
  // Peak load affects infrastructure sizing and SLA cost, not avg daily volume.
  // Daily inference cost uses actual requestsPerDay as the base.
  // ─────────────────────────────────────────────────────────────────────────
  const dailyInferenceCost = optimizedCostPerRequest * p.requestsPerDay;

  // Recurring ops amortized to daily cost for crossover calculation
  const dailyOpsCost = (p.engineeringHoursMonthlyOps * p.costPerHour) / 30.44;
  const dailyTotalCost = dailyInferenceCost + dailyOpsCost;

  const totalInferenceCost = dailyInferenceCost * p.days;
  const tco = totalSetupCost + totalInferenceCost + recurringEngineeringCost;

  // Break-even: days until cumulative inference + ops exceeds setup cost
  const crossoverDays = dailyTotalCost > 0 ? totalSetupCost / dailyTotalCost : Infinity;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 12: Cost breakdown for visualization
  // ─────────────────────────────────────────────────────────────────────────
  const costBreakdown = {
    tokens: tokenCost * p.requestsPerDay * p.days,
    guardrails: cGuardrails * p.requestsPerDay * p.days,
    tools: cTools * p.requestsPerDay * p.days,
    compute: computeCost * p.requestsPerDay * p.days,
    engineeringOneTime: oneTimeEngineeringCost,
    engineeringRecurring: recurringEngineeringCost,
    trainingAndSetup: cTrainingCompute + p.dataPreparationCost + p.hardwareCost,
  };

  const savingsVsReference = (referenceCostPerRequest - optimizedCostPerRequest) / referenceCostPerRequest;

  return {
    // Setup / capex
    totalSetupCost,
    oneTimeEngineeringCost,
    recurringEngineeringCost,
    totalEngineeringCost,

    // Per-request
    optimizedCostPerRequest,
    referenceCostPerRequest,
    savingsPercent: savingsVsReference * 100,

    // Daily / total
    requestsPerDay: p.requestsPerDay,
    dailyInferenceCost,
    dailyTotalCost,
    totalInferenceCost,
    tco,

    // Break-even
    crossoverDays,

    // Breakdown
    costBreakdown,

    // Effective token counts after optimizations
    tokens: {
      input: finalInputTokens,
      output: finalOutputTokens,
    },

    // Throughput info (useful for self-hosted analysis)
    compute: {
      effectiveThroughput: throughputWithSpecDecoding,
      inferenceSecondsPerRequest: inferenceSeconds,
    },
  };
}

export function generateChartData(p: TCOParams) {
  const results = calculateTCO(p);
  const points: Array<{ day: number; cumulativeSetup: number; cumulativeInference: number; cumulativeTotal: number }> = [];
  const step = Math.max(1, Math.floor(p.days / 100));

  for (let d = 0; d <= p.days; d += step) {
    const dailyOps = (p.engineeringHoursMonthlyOps * p.costPerHour) / 30.44;
    const cumulativeInference = (results.dailyInferenceCost + dailyOps) * d;
    points.push({
      day: d,
      cumulativeSetup: results.totalSetupCost,
      cumulativeInference,
      cumulativeTotal: results.totalSetupCost + cumulativeInference,
    });
  }

  return { points, results };
}

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODEL BREAK-EVEN
//
// Returns the day at which model2 becomes cheaper than model1, or null if:
//   - the lines are parallel (same daily cost)
//   - the crossover already happened before day 0 (one model always cheaper)
//
// Formula:
//   setup1 + dailyTotal1 × d = setup2 + dailyTotal2 × d
//   d = (setup2 - setup1) / (dailyTotal1 - dailyTotal2)
// ─────────────────────────────────────────────────────────────────────────────
export function crossoverBetweenModels(
  p1: TCOParams,
  p2: TCOParams
): {
  crossoverDay: number | null;
  // Which model is cheaper after crossover (or always, if no crossover)
  cheaperModel: 1 | 2 | 'equal';
  // Explanation string for UI
  reason: string;
} {
  const r1 = calculateTCO(p1);
  const r2 = calculateTCO(p2);
 
  const dailyDiff = r1.dailyTotalCost - r2.dailyTotalCost;
  const setupDiff = r2.totalSetupCost - r1.totalSetupCost;
 
  // Lines parallel — same daily cost
  if (Math.abs(dailyDiff) < 0.001) {
    const cheaperModel = r1.totalSetupCost < r2.totalSetupCost ? 1
      : r1.totalSetupCost > r2.totalSetupCost ? 2
      : 'equal';
    return {
      crossoverDay: null,
      cheaperModel,
      reason: cheaperModel === 'equal'
        ? 'Models have identical costs'
        : `Model ${cheaperModel} has lower setup cost and equal daily cost — always cheaper`,
    };
  }
 
  const d = setupDiff / dailyDiff;
 
  // Crossover in the past — one model is always cheaper
  if (d < 0) {
    const cheaperModel = r1.dailyTotalCost < r2.dailyTotalCost ? 1 : 2;
    return {
      crossoverDay: null,
      cheaperModel,
      reason: `Model ${cheaperModel} has both lower setup and lower daily cost — always cheaper`,
    };
  }
 
  // Valid future crossover
  // Before crossover: model with lower setup is cheaper
  // After crossover: model with lower daily cost is cheaper
  const cheaperAfter = r1.dailyTotalCost < r2.dailyTotalCost ? 1 : 2;
  return {
    crossoverDay: Math.round(d),
    cheaperModel: cheaperAfter,
    reason: `Model ${cheaperAfter} becomes cheaper after day ${Math.round(d)} (~${(d / 30).toFixed(1)} months)`,
  };
}
