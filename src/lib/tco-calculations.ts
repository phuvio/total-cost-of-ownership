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
  vectorDb: true,
  embeddingGen: true,
  rerankingModel: false,
  moderationModel: false,
  guardrails: true,
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
  hardwareCost: 0,
  engineeringHours: 10,
  costPerHour: 150,
  trainingGpuHours: 0,
  gpuPrice: 3.5,
  finetuningCost: 0,
  dataPreparationCost: 0,
};

export function calculateTCO(p: TCOParams) {
  // Token-level factors (reduce token counts)
  const tokenRedFactor = p.promptCompression ? (1 - p.tokenReduction / 100) : 1;
  const quantFactor = p.quantization ? (1 - p.sizeReduction / 100) : 1;
  const fineTuningTokenFactor = p.fineTuningReduction ? (1 - p.fineTuningTokenReduction / 100) : 1;
  const tokenFactor = tokenRedFactor * quantFactor * fineTuningTokenFactor;

  // Token costs per request (factors applied to token counts)
  const tokenCost =
    ((p.avgTokensPerRequest * tokenFactor) * p.inputTokenPrice) +
    ((p.avgResponseTokens * tokenFactor) * p.outputTokenPrice);

  // Retrieval cost
  const cRetrieval = (p.vectorDb ? p.embeddingCostPerReq : 0) + (p.embeddingGen ? p.embeddingCostPerReq * 0.5 : 0);

  // Reranking
  const cReranking = p.rerankingModel ? p.rerankerCostPerReq : 0;

  // Guardrails (moderation + guardrails)
  const cGuardrails = (p.moderationModel ? 0.0002 : 0) + (p.guardrails ? 0.0003 : 0);

  // Tool calls
  const cTools = p.toolCalls ? 0.0005 : 0;

  // Compute overhead
  const tokensPerSecond = 1000; // TODO: make this a parameter
  const costPerSecond = p.gpuPrice / 3600;
  const computePerRequest =
    (p.avgTokensPerRequest + p.avgResponseTokens) / tokensPerSecond * costPerSecond;
  const cCompute = p.modelType === 'self-hosted' ? computePerRequest : p.modelType === 'cloud' ? computePerRequest * 0.5 : 0;

  // Compute-level factor (speculative decoding reduces compute)
  const specDecodingFactor = p.speculativeDecoding ? (1 - p.specDecodingReduction / 100) : 1;
  const computeCost = cCompute * specDecodingFactor;

  // Base cost per request
  const baseCost = tokenCost + cRetrieval + cReranking + cGuardrails + cTools + computeCost;

  // Request-level factors (reduce effective request volume/cost)
  const cacheReduction = p.caching ? (1 - p.cacheHitRate / 100) : 1;
  const cheapModelDiscount = 0.3;
  const routingFactor = p.modelRouting
    ? (1 - p.routingShare / 100) + (p.routingShare / 100) * cheapModelDiscount
    : 1;
  const batchFactor = p.batching ? (1 / Math.sqrt(p.batchSize)) : 1;
  const requestFactor = cacheReduction * routingFactor * batchFactor;

  const cInferenceOptimized = baseCost * requestFactor;

  // Unoptimized base for reference
  const cInferenceRequest = (p.avgTokensPerRequest * p.inputTokenPrice) + (p.avgResponseTokens * p.outputTokenPrice) + cRetrieval + cReranking + cGuardrails + cTools + cCompute;

  // Training costs
  const cTrainingCompute = p.trainingGpuHours * p.gpuPrice;
  const cEngineering = p.engineeringHours * p.costPerHour;
  const cTraining = cTrainingCompute + p.finetuningCost + cEngineering + p.dataPreparationCost + p.hardwareCost;

  // Adjusted requests with peak load
  const adjustedRequests = p.requestsPerDay * p.peakLoadMultiplier;

  // Period inference
  const annualInference = cInferenceOptimized * adjustedRequests * p.days;

  // TCO
  const tco = cTraining + annualInference;

  // Crossover point
  const dailyInference = cInferenceOptimized * adjustedRequests;
  const crossoverDays = dailyInference > 0 ? cTraining / dailyInference : Infinity;

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
    requestsPerDay: p.requestsPerDay,
    annualInference,
    tco,
    crossoverDays,
    dailyInference,
    cInferenceRequest,
    costBreakdown,
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
