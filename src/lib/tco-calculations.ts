export interface TCOParams {
  // Timeline
  days: number;
  // Model config
  modelType: 'api' | 'cloud' | 'self-hosted';
  inputTokenPrice: number;
  outputTokenPrice: number;
  contextLength: number;
  responseLength: number;
  // Usage
  requestsPerDay: number;
  avgTokensPerRequest: number;
  avgResponseTokens: number;
  peakLoadMultiplier: number;
  // Architecture
  vectorDb: boolean;
  embeddingGen: boolean;
  rerankingModel: boolean;
  moderationModel: boolean;
  guardrails: boolean;
  toolCalls: boolean;
  embeddingCostPerReq: number;
  rerankerCostPerReq: number;
  // Optimization
  caching: boolean;
  modelRouting: boolean;
  quantization: boolean;
  batching: boolean;
  promptCompression: boolean;
  fineTuningReduction: boolean;
  speculativeDecoding: boolean;
  cacheHitRate: number;
  routingShare: number;
  batchSize: number;
  tokenReduction: number;
  sizeReduction: number;
  fineTuningCostOpt: number;
  fineTuningTokenReduction: number;
  specDecodingReduction: number;
  // Implementation hours per optimization
  cachingImplHours: number;
  routingImplHours: number;
  quantizationImplHours: number;
  batchingImplHours: number;
  compressionImplHours: number;
  fineTuningImplHours: number;
  specDecodingImplHours: number;
  // Implementation hours per architecture component
  vectorDbImplHours: number;
  embeddingGenImplHours: number;
  rerankingImplHours: number;
  moderationImplHours: number;
  guardrailsImplHours: number;
  toolCallsImplHours: number;
  hardwareCost: number;
  // Dev costs
  engineeringHours: number;
  costPerHour: number;
  trainingGpuHours: number;
  gpuPrice: number;
  finetuningCost: number;
  dataPreparationCost: number;
}

export const defaultParams: TCOParams = {
  days: 365,
  modelType: 'api',
  inputTokenPrice: 0.00001,
  outputTokenPrice: 0.00003,
  contextLength: 4096,
  responseLength: 512,
  requestsPerDay: 10000,
  avgTokensPerRequest: 2000,
  avgResponseTokens: 500,
  peakLoadMultiplier: 1.5,
  vectorDb: false,
  embeddingGen: false,
  rerankingModel: false,
  moderationModel: false,
  guardrails: false,
  toolCalls: false,
  embeddingCostPerReq: 0.0001,
  rerankerCostPerReq: 0.0005,
  caching: false,
  modelRouting: false,
  quantization: false,
  batching: false,
  promptCompression: false,
  fineTuningReduction: false,
  speculativeDecoding: false,
  cacheHitRate: 30,
  routingShare: 20,
  batchSize: 4,
  tokenReduction: 15,
  sizeReduction: 25,
  fineTuningCostOpt: 5000,
  fineTuningTokenReduction: 15,
  specDecodingReduction: 30,
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
  hardwareCost: 0,
  engineeringHours: 10,
  costPerHour: 150,
  trainingGpuHours: 0,
  gpuPrice: 3.5,
  finetuningCost: 0,
  dataPreparationCost: 0,
};

export function calculateTCO(p: TCOParams) {
  // 1. Effective tokens (context-aware)
  const effectiveInputTokens = Math.min(p.avgTokensPerRequest, p.contextLength);
  const effectiveOutputTokens = Math.min(p.avgResponseTokens, p.responseLength);

  // 2. Token-level optimizations
  const tokenRedFactor = p.promptCompression ? (1 - p.tokenReduction / 100) : 1;
  const quantFactor = p.quantization ? (1 - p.sizeReduction / 100) : 1;
  const fineTuningTokenFactor = p.fineTuningReduction ? (1 - p.fineTuningTokenReduction / 100) : 1;
  const tokenFactor = tokenRedFactor * quantFactor * fineTuningTokenFactor;

  const finalInputTokens = effectiveInputTokens * tokenFactor;
  const finalOutputTokens = effectiveOutputTokens * tokenFactor;

  // 3. Token cost
  const tokenCost = finalInputTokens * p.inputTokenPrice + finalOutputTokens * p.outputTokenPrice;

  // 4. Retrieval & components
  const cRetrieval = (p.vectorDb ? p.embeddingCostPerReq : 0) + (p.embeddingGen ? p.embeddingCostPerReq * 0.5 : 0);
  const cReranking = p.rerankingModel ? p.rerankerCostPerReq : 0;
  const cGuardrails = (p.moderationModel ? 0.0002 : 0) + (p.guardrails ? 0.0003 : 0);
  const cTools = p.toolCalls ? 0.0005 : 0;

  // 5. Compute cost (context-aware)
  const tokensPerSecond = 1000;
  const costPerSecond = p.gpuPrice / 3600;
  const totalTokens = finalInputTokens + finalOutputTokens;
  const attentionFactor = Math.max(1, finalInputTokens / 1000);
  const rawCompute = (totalTokens * attentionFactor) / tokensPerSecond * costPerSecond;
  const baseCompute = p.modelType === 'self-hosted' ? rawCompute : p.modelType === 'cloud' ? rawCompute * 0.5 : 0;
  const computeCost = p.speculativeDecoding ? baseCompute * (1 - p.specDecodingReduction / 100) : baseCompute;

  // 6. Base inference cost per request
  const baseCost = tokenCost + cRetrieval + cReranking + cGuardrails + cTools + computeCost;

  // 7. Request-level optimizations
  const cacheFactor = p.caching ? (1 - p.cacheHitRate / 100) : 1;
  const cheapModelFactor = 0.3;
  const routingFactor = p.modelRouting
    ? (1 - p.routingShare / 100) + (p.routingShare / 100) * cheapModelFactor
    : 1;
  const batchFactor = p.batching ? (1 / Math.sqrt(p.batchSize)) : 1;
  const requestFactor = cacheFactor * routingFactor * batchFactor;
  const cInferenceOptimized = baseCost * requestFactor;

  // 8. Reference (no optimizations)
  const cInferenceRequest = effectiveInputTokens * p.inputTokenPrice + effectiveOutputTokens * p.outputTokenPrice + cRetrieval + cReranking + cGuardrails + cTools + baseCompute;

  // 9. Engineering costs
  const cOptimizationEngineering =
    (p.caching ? p.cachingImplHours : 0) +
    (p.modelRouting ? p.routingImplHours : 0) +
    (p.quantization ? p.quantizationImplHours : 0) +
    (p.batching ? p.batchingImplHours : 0) +
    (p.promptCompression ? p.compressionImplHours : 0) +
    (p.fineTuningReduction ? p.fineTuningImplHours : 0) +
    (p.speculativeDecoding ? p.specDecodingImplHours : 0);

  const cArchitectureEngineering =
    (p.vectorDb ? p.vectorDbImplHours : 0) +
    (p.embeddingGen ? p.embeddingGenImplHours : 0) +
    (p.rerankingModel ? p.rerankingImplHours : 0) +
    (p.moderationModel ? p.moderationImplHours : 0) +
    (p.guardrails ? p.guardrailsImplHours : 0) +
    (p.toolCalls ? p.toolCallsImplHours : 0);

  const cEngineering = (p.engineeringHours + cOptimizationEngineering + cArchitectureEngineering) * p.costPerHour;

  // 10. Training costs
  const cTrainingCompute = p.trainingGpuHours * p.gpuPrice;
  const cTraining = cTrainingCompute + p.finetuningCost + p.dataPreparationCost + p.hardwareCost + cEngineering;

  // 11. Usage scaling
  const adjustedRequests = p.requestsPerDay * (0.7 + 0.3 * p.peakLoadMultiplier);
  const dailyInference = cInferenceOptimized * adjustedRequests;
  const totalInference = dailyInference * p.days;

  // 12. TCO & crossover
  const tco = cTraining + totalInference;
  const crossoverDays = dailyInference > 0 ? cTraining / dailyInference : Infinity;

  // 13. Cost breakdown
  const costBreakdown = {
    tokens: tokenCost,
    retrieval: cRetrieval,
    reranking: cReranking,
    guardrails: cGuardrails,
    tools: cTools,
    compute: computeCost,
  };

  return {
    trainingCost: cTraining,
    inferencePerRequest: cInferenceOptimized,
    requestsPerDay: adjustedRequests,
    dailyInference,
    totalInference,
    tco,
    crossoverDays,
    cInferenceRequest,
    costBreakdown,
    tokens: {
      input: finalInputTokens,
      output: finalOutputTokens,
    },
  };
}

export function generateChartData(p: TCOParams) {
  const results = calculateTCO(p);
  const days = p.days;
  const points: Array<{ day: number; training: number; inference: number }> = [];
  const step = Math.max(1, Math.floor(days / 100));

  for (let d = 0; d <= days; d += step) {
    points.push({
      day: d,
      training: results.trainingCost,
      inference: results.dailyInference * d,
    });
  }

  return { points, crossoverDays: results.crossoverDays, results };
}
