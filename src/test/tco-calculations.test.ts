import { describe, expect, it } from "vitest";
import {
  calculateTCO,
  calculateTCOByMonth,
  crossoverBetweenModels,
  defaultParams,
  generateChartData,
  TCOParams,
} from "@/lib/tco-calculations";

function createParams(overrides: Partial<TCOParams> = {}): TCOParams {
  return {
    ...defaultParams,
    days: 30.44,
    modelType: "api",
    inputTokenPrice: 2,
    outputTokenPrice: 4,
    contextLength: 1_000,
    responseLength: 100,
    requestsPerDay: 10,
    avgTokensPerRequest: 1_500,
    avgResponseTokens: 150,
    engineeringHoursOneTime: 0,
    engineeringHoursMonthlyOps: 0,
    costPerHour: 0,
    trainingGpuHours: 0,
    dataPreparationCost: 0,
    hardwareCost: 0,
    ...overrides,
  };
}

describe("calculateTCO", () => {
  it("clips input and output tokens to their configured limits", () => {
    const result = calculateTCO(createParams());

    expect(result.tokens).toEqual({ input: 1_000, output: 100 });
    expect(result.referenceCostPerRequest).toBeCloseTo(0.0024);
    expect(result.optimizedCostPerRequest).toBeCloseTo(0.0024);
    expect(result.dailyInferenceCost).toBeCloseTo(0.024);
  });

  it("applies prompt compression only to input tokens", () => {
    const result = calculateTCO(createParams({
      promptCompression: true,
      tokenReduction: 40,
    }));

    expect(result.tokens).toEqual({ input: 600, output: 100 });
    expect(result.optimizedCostPerRequest).toBeCloseTo(0.0016);
    expect(result.referenceCostPerRequest).toBeCloseTo(0.0024);
  });

  it("uses GPU compute costs for cloud and self-hosted deployments, but not API deployments", () => {
    const params = createParams({
      modelType: "cloud",
      inputTokenPrice: 0,
      outputTokenPrice: 0,
      avgTokensPerRequest: 300,
      avgResponseTokens: 300,
      contextLength: 1_000,
      responseLength: 1_000,
      requestsPerDay: 1,
      tokensPerSecond: 100,
      gpuPrice: 3.6,
    });

    const cloudResult = calculateTCO(params);
    const apiResult = calculateTCO({ ...params, modelType: "api" });

    expect(cloudResult.compute).toEqual({
      effectiveThroughput: 100,
      inferenceSecondsPerRequest: 6,
    });
    expect(cloudResult.optimizedCostPerRequest).toBeCloseTo(0.006);
    expect(apiResult.optimizedCostPerRequest).toBe(0);
  });

  it("applies caching, routing, and batching as request-level cost factors", () => {
    const result = calculateTCO(createParams({
      inputTokenPrice: 10,
      outputTokenPrice: 0,
      avgTokensPerRequest: 100,
      avgResponseTokens: 0,
      caching: true,
      cacheHitRate: 25,
      modelRouting: true,
      routingSmallModelShare: 50,
      routingCostRatio: 0.2,
      batching: true,
      apiBatchDiscount: 50,
      gpuPrice: 0,
    }));

    expect(result.referenceCostPerRequest).toBeCloseTo(0.001);
    expect(result.optimizedCostPerRequest).toBeCloseTo(0.000225, 8);
    expect(result.savingsPercent).toBeCloseTo(77.5, 8);
  });

  it("includes architecture costs and one-time and recurring engineering costs", () => {
    const result = calculateTCO(createParams({
      days: 60.88,
      moderationModel: true,
      guardrails: true,
      toolCalls: true,
      toolCallsPerRequest: 2,
      avgCostPerToolCall: 0.01,
      engineeringHoursOneTime: 10,
      engineeringHoursMonthlyOps: 2,
      costPerHour: 100,
      caching: true,
      cachingImplHours: 5,
      vectorDb: true,
      vectorDbImplHours: 7,
      trainingGpuHours: 3,
      gpuPrice: 4,
      dataPreparationCost: 20,
      hardwareCost: 50,
      requestsPerDay: 0,
    }));

    expect(result.optimizedCostPerRequest).toBeCloseTo(0.015904, 8);
    expect(result.oneTimeEngineeringCost).toBe(14_800);
    expect(result.recurringEngineeringCost).toBe(400);
    expect(result.totalEngineeringCost).toBe(15_200);
    expect(result.totalSetupCost).toBe(14_882);
    expect(result.tco).toBe(15_282);
  });

  it("generates cumulative chart data using setup and daily costs", () => {
    const params = createParams({
      days: 2,
      requestsPerDay: 1,
      inputTokenPrice: 1,
      outputTokenPrice: 0,
      avgTokensPerRequest: 1_000,
      avgResponseTokens: 0,
      engineeringHoursOneTime: 10,
      engineeringHoursMonthlyOps: 0,
      costPerHour: 100,
    });
    const { points } = generateChartData(params);

    expect(points).toEqual([
      { day: 0, cumulativeSetup: 1_000, cumulativeInference: 0, cumulativeTotal: 1_000 },
      { day: 1, cumulativeSetup: 1_000, cumulativeInference: 0.001, cumulativeTotal: 1_000.001 },
      { day: 2, cumulativeSetup: 1_000, cumulativeInference: 0.002, cumulativeTotal: 1_000.002 },
    ]);
  });

  it("calculates cumulative TCO at 30-day intervals through 720 days", () => {
    const monthly = calculateTCOByMonth(createParams({
      requestsPerDay: 0,
      engineeringHoursOneTime: 1,
      engineeringHoursMonthlyOps: 0,
      costPerHour: 100,
    }));

    expect(monthly).toHaveLength(24);
    expect(monthly[0]).toEqual({ month: 1, days: 30, tco: 100 });
    expect(monthly.at(-1)).toEqual({ month: 24, days: 720, tco: 100 });
  });
});

describe("crossoverBetweenModels", () => {
  it("returns a future crossover and the model that is cheaper afterward", () => {
    const model1 = createParams({
      engineeringHoursOneTime: 10,
      costPerHour: 100,
      inputTokenPrice: 1,
      avgTokensPerRequest: 1_000,
      requestsPerDay: 1_000,
    });
    const model2 = createParams({
      engineeringHoursOneTime: 20,
      costPerHour: 100,
      inputTokenPrice: 0.5,
      avgTokensPerRequest: 1_000,
      requestsPerDay: 1_000,
    });

    expect(crossoverBetweenModels(model1, model2)).toEqual({
      crossoverDay: 2000,
      cheaperModel: 2,
      reason: "Model 2 becomes cheaper after day 2000 (~66.7 months)",
    });
  });

  it("identifies parallel models and models that are always cheaper", () => {
    const baseline = createParams({ requestsPerDay: 0 });
    const higherSetup = { ...baseline, engineeringHoursOneTime: 1, costPerHour: 100 };

    expect(crossoverBetweenModels(baseline, higherSetup)).toEqual({
      crossoverDay: null,
      cheaperModel: 1,
      reason: "Model 1 has lower setup cost and equal daily cost — always cheaper",
    });
    expect(crossoverBetweenModels(higherSetup, higherSetup)).toEqual({
      crossoverDay: null,
      cheaperModel: "equal",
      reason: "Models have identical costs",
    });
  });
});
