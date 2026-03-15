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
  fineTuning: boolean;
  hardwareOptimization: boolean;
  speculativeDecoding: boolean;
  cacheHitRate: number;
  routingShare: number;
  batchSize: number;
  tokenReduction: number;
  sizeReduction: number;
  fineTuningCostOpt: number;
  fineTuningTokenReduction: number;
  hwOptimizationCost: number;
  hwEfficiencyGain: number;
  specDecodingReduction: number;
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
  requestsPerDay: 50000,
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
  fineTuning: false,
  hardwareOptimization: false,
  speculativeDecoding: false,
  cacheHitRate: 30,
  routingShare: 20,
  batchSize: 4,
  tokenReduction: 15,
  sizeReduction: 25,
  fineTuningCostOpt: 5000,
  fineTuningTokenReduction: 15,
  hwOptimizationCost: 10000,
  hwEfficiencyGain: 20,
  specDecodingReduction: 30,
  engineeringHours: 500,
  costPerHour: 150,
  trainingGpuHours: 100,
  gpuPrice: 3.5,
  finetuningCost: 5000,
  dataPreparationCost: 10000,
};

export function calculateTCO(p: TCOParams) {
  // Token costs per request
  const cTokens = (p.avgTokensPerRequest * p.inputTokenPrice) + (p.avgResponseTokens * p.outputTokenPrice);

  // Retrieval cost
  const cRetrieval = (p.vectorDb ? p.embeddingCostPerReq : 0) + (p.embeddingGen ? p.embeddingCostPerReq * 0.5 : 0);

  // Reranking
  const cReranking = p.rerankingModel ? p.rerankerCostPerReq : 0;

  // Guardrails (moderation + guardrails)
  const cGuardrails = (p.moderationModel ? 0.0002 : 0) + (p.guardrails ? 0.0003 : 0);

  // Tool calls
  const cTools = p.toolCalls ? 0.0005 : 0;

  // Compute overhead
  const cCompute = p.modelType === 'self-hosted' ? 0.002 : p.modelType === 'cloud' ? 0.001 : 0;

  // Base inference cost per request
  const cInferenceRequest = cTokens + cRetrieval + cReranking + cGuardrails + cTools + cCompute;

  // Optimization factors
  const cacheReduction = p.caching ? (1 - p.cacheHitRate / 100) : 1;
  const routingFactor = p.modelRouting ? (1 - p.routingShare / 200) : 1;
  const tokenRedFactor = p.promptCompression ? (1 - p.tokenReduction / 100) : 1;
  const batchFactor = p.batching ? (1 / Math.sqrt(p.batchSize)) : 1;
  const quantFactor = p.quantization ? 0.85 : 1;

  const cInferenceOptimized = cInferenceRequest * cacheReduction * routingFactor * tokenRedFactor * batchFactor * quantFactor;

  // Training costs
  const cTrainingCompute = p.trainingGpuHours * p.gpuPrice;
  const cEngineering = p.engineeringHours * p.costPerHour;
  const cTraining = cTrainingCompute + p.finetuningCost + cEngineering + p.dataPreparationCost;

  // Period inference
  const annualInference = cInferenceOptimized * p.requestsPerDay * p.days;

  // TCO
  const tco = cTraining + annualInference;

  // Crossover point (days where cumulative inference = training)
  const dailyInference = cInferenceOptimized * p.requestsPerDay;
  const crossoverDays = dailyInference > 0 ? cTraining / dailyInference : Infinity;

  return {
    trainingCost: cTraining,
    inferencePerRequest: cInferenceOptimized,
    requestsPerDay: p.requestsPerDay,
    annualInference,
    tco,
    crossoverDays,
    dailyInference,
    cInferenceRequest,
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
