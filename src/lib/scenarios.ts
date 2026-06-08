import { TCOParams } from './tco-calculations';

export interface Scenario {
  id: string;
  name: string;
  description: string;
  model1Name: string;
  model1Params: TCOParams;
  model2Name: string;
  model2Params: TCOParams;
  presentationText: string;
}

export const scenarios: Scenario[] = [
  {
    id: 'chatbot-request-volume',
    name: 'Chatbot Request Volume Analysis',
    description: 'Compare GPT-5.4 API vs Llama 3.1 8B cloud-hosted deployment for a chatbot application',
    model1Name: 'GPT-5.4 API',
    model1Params: {
      days: 365,
      modelType: 'api',
      inputTokenPrice: 2.175,
      outputTokenPrice: 13.05,
      contextLength: 4096,
      responseLength: 512,
      requestsPerDay: 25000,
      avgTokensPerRequest: 800,
      avgResponseTokens: 300,
      vectorDb: false,
      embeddingGen: false,
      rerankingModel: false,
      moderationModel: false,
      guardrails: false,
      toolCalls: false,
      embeddingCostPerReq: 0.00001,
      rerankerCostPerReq: 0.0002,
      toolCallsPerRequest: 2,
      caching: false,
      modelRouting: false,
      quantization: false,
      batching: false,
      promptCompression: false,
      fineTuningReduction: false,
      speculativeDecoding: false,
      cacheHitRate: 30,
      routingSmallModelShare: 50,
      routingCostRatio: 0.15,
      tokenReduction: 20,
      fineTuningTokenReduction: 15,
      quantizationThroughputGain: 1.4,
      quantizationQualityRetention: 97,
      specDecodingThroughputGain: 2.0,
      apiBatchDiscount: 50,
      selfHostedBatchUtilizationGain: 40,
      tokensPerSecond: 300,
      gpuPrice: 1.99,
      trainingGpuHours: 0,
      finetuningCost: 0,
      dataPreparationCost: 0,
      hardwareCost: 0,
      engineeringHoursOneTime: 40,
      costPerHour: 150,
      engineeringHoursMonthlyOps: 10,
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
    },
    model2Name: 'Llama 3.1 8B',
    model2Params: {
      days: 365,
      modelType: 'cloud',
      inputTokenPrice: 0,
      outputTokenPrice: 0,
      contextLength: 4096,
      responseLength: 512,
      requestsPerDay: 25000,
      avgTokensPerRequest: 800,
      avgResponseTokens: 300,
      vectorDb: false,
      embeddingGen: false,
      rerankingModel: false,
      moderationModel: false,
      guardrails: false,
      toolCalls: false,
      embeddingCostPerReq: 0.00001,
      rerankerCostPerReq: 0.0002,
      toolCallsPerRequest: 2,
      caching: false,
      modelRouting: false,
      quantization: false,
      batching: false,
      promptCompression: false,
      fineTuningReduction: false,
      speculativeDecoding: false,
      cacheHitRate: 30,
      routingSmallModelShare: 50,
      routingCostRatio: 0.15,
      tokenReduction: 20,
      fineTuningTokenReduction: 15,
      quantizationThroughputGain: 1.4,
      quantizationQualityRetention: 97,
      specDecodingThroughputGain: 2.0,
      apiBatchDiscount: 50,
      selfHostedBatchUtilizationGain: 40,
      tokensPerSecond: 250,
      gpuPrice: 0.76,
      trainingGpuHours: 0,
      finetuningCost: 0,
      dataPreparationCost: 0,
      hardwareCost: 0,
      engineeringHoursOneTime: 100,
      costPerHour: 150,
      engineeringHoursMonthlyOps: 20,
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
    },
    presentationText: `This scenario compares two approaches for deploying a chatbot application:

- **GPT-5.4** accessed through a commercial API
- **Llama 3.1 8B** hosted in a cloud environment

**Overview**

The scenario is designed to explore how request volume affects the total cost of ownership (TCO) of each deployment strategy. API-based solutions typically require less setup effort and lower initial investment, while cloud-hosted models may offer lower operating costs at high usage volumes.

The default parameters represent a medium-scale production chatbot. Costs include model inference, infrastructure, and engineering effort required for deployment and operation.

**Key Insights**

**GPT-5.4 API Approach:**
- High token costs (€2.175 input, €13.05 output per 1M tokens)
- Lower engineering overhead (40 hours one-time setup)
- Pay-per-use model with predictable scaling

**Llama 3.1 8B Cloud-Hosted Approach:**
- Zero token costs (fixed GPU pricing at €0.76/hour)
- Higher initial engineering effort (100 hours setup)
- Better economy at high request volumes (25,000 requests/day)
- More control over model behavior and customization

**What to Try**

- **Requests per day** — Adjust to identify the break-even point between the two deployment strategies
- **Token usage per request** — Simulate different chatbot complexities and response lengths
- **Engineering and operational effort** — Evaluate the impact of maintenance costs on total TCO
- **Monthly operations hours** — Explore how different SLA requirements affect each approach

**Key Takeaway**

This scenario demonstrates how workload characteristics significantly influence the long-term economics of LLM deployment. The crossover point where cloud-hosted becomes more economical typically occurs around 15,000-30,000 requests per day, depending on actual token usage patterns.`,
  },
];
