import OpenAI from "openai";
import { defaultParams, TCOParams } from "./tco-calculations.js";
import {
  AgentGenerationRequest,
  AgentGenerationResponse,
  AgentSuggestion,
} from "./agentTypes.js";

const gpuFallbackByModelType: Record<TCOParams["modelType"], number> = {
  api: 0,
  cloud: 1.19,
  "self-hosted": 0.87,
};

interface AgentRuntimeContext {
  mode: AgentGenerationRequest["mode"];
  targetSlot: AgentGenerationRequest["targetSlot"];
  answers: Record<string, string>;
}

function normalizeNumber(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeParams(partial?: Partial<TCOParams>): TCOParams {
  const merged = { ...defaultParams, ...partial };

  if (merged.modelType === "api") {
    return {
      ...merged,
      gpuPrice: 0,
    };
  }

  return {
    ...merged,
    inputTokenPrice: 0,
    outputTokenPrice: 0,
    gpuPrice:
      merged.gpuPrice > 0
        ? merged.gpuPrice
        : gpuFallbackByModelType[merged.modelType],
  };
}

function answerMap(
  request: AgentGenerationRequest
): Record<string, string> {
  return Object.fromEntries(
    request.answers.map((answer) => [answer.key, answer.value])
  );
}

function isYes(value: string | undefined) {
  return value === "yes" || value === "toolUse";
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseRawModelNames(
  request: AgentGenerationRequest,
  answers: Record<string, string>
): { model1Name: string; model2Name: string } {
  if (request.mode === "compare") {
    const comparison = answers.models || "";

    const parts = comparison
      .split(/\s+vs\.?\s+|\s+against\s+|\s+and\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      model1Name: parts[0] || request.currentModel1Name,
      model2Name: parts[1] || request.currentModel2Name,
    };
  }

  return {
    model1Name: request.currentModel1Name,
    model2Name: request.currentModel2Name,
  };
}

function buildFallbackName(
  rawName: string,
  modelType: TCOParams["modelType"]
): string {
  const capitalized =
    rawName.charAt(0).toUpperCase() + rawName.slice(1);

  const suffix =
    modelType === "api"
      ? " (API)"
      : modelType === "cloud"
        ? " (Cloud)"
        : " (Self-hosted)";

  return `${capitalized}${suffix}`;
}

function inferRequestsPerDay(
  mode: AgentGenerationRequest["mode"],
  answers: Record<string, string>
): number {
  if (mode === "compare") {
    return normalizeNumber(
      answers.requestsPerDay,
      defaultParams.requestsPerDay
    );
  }

  const users = normalizeNumber(answers.users, 500);

  if (users >= 5000) return 50000;
  if (users >= 1000) return 10000;
  if (users >= 200) return 2500;

  return 500;
}

function inferTokenCounts(
  mode: AgentGenerationRequest["mode"],
  answers: Record<string, string>
) {
  if (mode === "compare") {
    return {
      avgTokensPerRequest: normalizeNumber(
        answers.avgTokensPerRequest,
        defaultParams.avgTokensPerRequest
      ),
      avgResponseTokens: normalizeNumber(
        answers.avgResponseTokens,
        defaultParams.avgResponseTokens
      ),
    };
  }

  const inputTokens = normalizeNumber(
    answers.inputLength,
    700
  );

  const retrieval =
    isYes(answers.retrieval) ||
    isYes(answers.toolUse);

  return {
    avgTokensPerRequest: Math.max(
      300,
      retrieval
        ? Math.round(inputTokens * 1.35)
        : Math.round(inputTokens * 1.1)
    ),
    avgResponseTokens: retrieval ? 350 : 220,
  };
}

function buildLocalSuggestion(
  request: AgentGenerationRequest,
  context: AgentRuntimeContext
): AgentSuggestion {
  const { answers } = context;

  const rawNames = parseRawModelNames(
    request,
    answers
  );

  const requestsPerDay = inferRequestsPerDay(
    request.mode,
    answers
  );

  const tokenCounts = inferTokenCounts(
    request.mode,
    answers
  );

  const latencyCritical =
    answers.latencyCritical === "yes";

  const existingGpuInfra =
    answers.existingGpuInfra === "yes";

  const needsRetrieval =
    isYes(answers.retrieval) ||
    isYes(answers.toolUse);

  const model1Type: TCOParams["modelType"] = "api";

  const model2Type: TCOParams["modelType"] =
    existingGpuInfra
      ? "self-hosted"
      : "cloud";

  const model1Params = normalizeParams({
    modelType: model1Type,
    requestsPerDay,
    ...tokenCounts,

    caching: true,
    cacheHitRate:
      latencyCritical
        ? 20
        : needsRetrieval
          ? 30
          : 35,

    batching: !latencyCritical,
    apiBatchDiscount: 50,

    toolCalls: isYes(answers.toolUse),

    vectorDb: needsRetrieval,
    embeddingGen: needsRetrieval,
    rerankingModel: needsRetrieval,

    guardrails:
      answers.useCase === "agent",

    moderationModel:
      answers.useCase === "chatbot",
  });

  const model2Params = normalizeParams({
    modelType: model2Type,
    requestsPerDay,
    ...tokenCounts,

    caching: true,
    cacheHitRate:
      latencyCritical ? 15 : 30,

    modelRouting: true,
    routingSmallModelShare: 45,
    routingCostRatio: 0.18,

    batching: true,
    selfHostedBatchUtilizationGain: 35,

    toolCalls: isYes(answers.toolUse),

    vectorDb: needsRetrieval,
    embeddingGen: needsRetrieval,
    rerankingModel: needsRetrieval,

    guardrails:
      answers.useCase === "agent",

    moderationModel:
      answers.useCase === "chatbot",

    tokensPerSecond:
      existingGpuInfra ? 240 : 180,

    gpuPrice:
      existingGpuInfra ? 0.87 : 1.19,
  });

  return {
    model1Name: buildFallbackName(
      rawNames.model1Name,
      model1Type
    ),

    model2Name: buildFallbackName(
      rawNames.model2Name,
      model2Type
    ),

    model1Params,
    model2Params,

    reasoning: {
      model1: latencyCritical
        ? "API-first setup prioritizes lower operational overhead and latency-sensitive workloads."
        : "API-first setup uses token pricing with moderate caching and optional batch savings.",

      model2: existingGpuInfra
        ? "Self-hosted comparison assumes existing GPU capacity with routing and batching enabled."
        : "Cloud-hosted comparison uses managed GPU infrastructure with routing and batching enabled.",
    },

    fallbackUsed: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI
// ─────────────────────────────────────────────────────────────────────────────

const suggestionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    model1Name: {
      type: "string",
    },

    model2Name: {
      type: "string",
    },

    model1Params: {
      type: "object",
      additionalProperties: false,
      properties: {
        days: { type: "number" },

        modelType: {
          type: "string",
          enum: ["api", "cloud", "self-hosted"],
        },
        inputTokenPrice: { type: "number" },
        outputTokenPrice: { type: "number" },
        contextLength: { type: "number" },
        responseLength: { type: "number" },

        requestsPerDay: { type: "number" },
        avgTokensPerRequest: { type: "number" },
        avgResponseTokens: { type: "number" },

        vectorDb: { type: "boolean" },
        embeddingGen: { type: "boolean" },
        rerankingModel: { type: "boolean" },
        moderationModel: { type: "boolean" },
        guardrails: { type: "boolean" },
        toolCalls: { type: "boolean" },
        toolCallsPerRequest: { type: "number" },
        avgCostPerToolCall: { type: ["number", "null"] },

        caching: { type: "boolean" },
        modelRouting: { type: "boolean" },
        quantization: { type: "boolean" },
        batching: { type: "boolean" },
        promptCompression: { type: "boolean" },
        fineTuningReduction: { type: "boolean" },
        speculativeDecoding: { type: "boolean" },

        cacheHitRate: { type: "number" },
        routingSmallModelShare: { type: "number" },
        routingCostRatio: { type: "number" },
        tokenReduction: { type: "number" },
        fineTuningTokenReduction: { type: "number" },

        quantizationThroughputGain: { type: "number" },
        quantizationQualityRetention: { type: "number" },

        specDecodingThroughputGain: { type: "number" },

        apiBatchDiscount: { type: "number" },
        selfHostedBatchUtilizationGain: { type: "number" },

        tokensPerSecond: { type: "number" },
        gpuPrice: { type: "number" },
        numberOfGpus: { type: ["number", "null"] },

        trainingGpuHours: { type: "number" },
        finetuningCost: { type: ["number", "null"] },
        dataPreparationCost: { type: "number" },
        hardwareCost: { type: "number" },

        engineeringHoursOneTime: { type: "number" },
        costPerHour: { type: "number" },
        engineeringHoursMonthlyOps: { type: "number" },

        cachingImplHours: { type: "number" },
        routingImplHours: { type: "number" },
        quantizationImplHours: { type: "number" },
        batchingImplHours: { type: "number" },
        compressionImplHours: { type: "number" },
        fineTuningImplHours: { type: "number" },
        specDecodingImplHours: { type: "number" },

        vectorDbImplHours: { type: "number" },
        embeddingGenImplHours: { type: "number" },
        rerankingImplHours: { type: "number" },
        moderationImplHours: { type: "number" },
        guardrailsImplHours: { type: "number" },
        toolCallsImplHours: { type: "number" },
      },
      required: [
        "days",
        "modelType",
        "inputTokenPrice",
        "outputTokenPrice",
        "contextLength",
        "responseLength",

        "requestsPerDay",
        "avgTokensPerRequest",
        "avgResponseTokens",

        "vectorDb",
        "embeddingGen",
        "rerankingModel",
        "moderationModel",
        "guardrails",
        "toolCalls",
        "toolCallsPerRequest",
        "avgCostPerToolCall",

        "caching",
        "modelRouting",
        "quantization",
        "batching",
        "promptCompression",
        "fineTuningReduction",
        "speculativeDecoding",

        "cacheHitRate",
        "routingSmallModelShare",
        "routingCostRatio",
        "tokenReduction",
        "fineTuningTokenReduction",

        "quantizationThroughputGain",
        "quantizationQualityRetention",

        "specDecodingThroughputGain",

        "apiBatchDiscount",
        "selfHostedBatchUtilizationGain",

        "tokensPerSecond",
        "gpuPrice",
        "numberOfGpus",

        "trainingGpuHours",
        "finetuningCost",
        "dataPreparationCost",
        "hardwareCost",

        "engineeringHoursOneTime",
        "costPerHour",
        "engineeringHoursMonthlyOps",

        "cachingImplHours",
        "routingImplHours",
        "quantizationImplHours",
        "batchingImplHours",
        "compressionImplHours",
        "fineTuningImplHours",
        "specDecodingImplHours",

        "vectorDbImplHours",
        "embeddingGenImplHours",
        "rerankingImplHours",
        "moderationImplHours",
        "guardrailsImplHours",
        "toolCallsImplHours",
      ],
    },

    model2Params: {
      type: "object",
      additionalProperties: false,
      properties: {
        days: { type: "number" },

        modelType: {
          type: "string",
          enum: ["api", "cloud", "self-hosted"],
        },
        inputTokenPrice: { type: "number" },
        outputTokenPrice: { type: "number" },
        contextLength: { type: "number" },
        responseLength: { type: "number" },

        requestsPerDay: { type: "number" },
        avgTokensPerRequest: { type: "number" },
        avgResponseTokens: { type: "number" },

        vectorDb: { type: "boolean" },
        embeddingGen: { type: "boolean" },
        rerankingModel: { type: "boolean" },
        moderationModel: { type: "boolean" },
        guardrails: { type: "boolean" },
        toolCalls: { type: "boolean" },
        toolCallsPerRequest: { type: "number" },
        avgCostPerToolCall: { type: ["number", "null"] },

        caching: { type: "boolean" },
        modelRouting: { type: "boolean" },
        quantization: { type: "boolean" },
        batching: { type: "boolean" },
        promptCompression: { type: "boolean" },
        fineTuningReduction: { type: "boolean" },
        speculativeDecoding: { type: "boolean" },

        cacheHitRate: { type: "number" },
        routingSmallModelShare: { type: "number" },
        routingCostRatio: { type: "number" },
        tokenReduction: { type: "number" },
        fineTuningTokenReduction: { type: "number" },

        quantizationThroughputGain: { type: "number" },
        quantizationQualityRetention: { type: "number" },

        specDecodingThroughputGain: { type: "number" },

        apiBatchDiscount: { type: "number" },
        selfHostedBatchUtilizationGain: { type: "number" },

        tokensPerSecond: { type: "number" },
        gpuPrice: { type: "number" },
        numberOfGpus: { type: ["number", "null"] },

        trainingGpuHours: { type: "number" },
        finetuningCost: { type: ["number", "null"] },
        dataPreparationCost: { type: "number" },
        hardwareCost: { type: "number" },

        engineeringHoursOneTime: { type: "number" },
        costPerHour: { type: "number" },
        engineeringHoursMonthlyOps: { type: "number" },

        cachingImplHours: { type: "number" },
        routingImplHours: { type: "number" },
        quantizationImplHours: { type: "number" },
        batchingImplHours: { type: "number" },
        compressionImplHours: { type: "number" },
        fineTuningImplHours: { type: "number" },
        specDecodingImplHours: { type: "number" },

        vectorDbImplHours: { type: "number" },
        embeddingGenImplHours: { type: "number" },
        rerankingImplHours: { type: "number" },
        moderationImplHours: { type: "number" },
        guardrailsImplHours: { type: "number" },
        toolCallsImplHours: { type: "number" },
      },
      required: [
        "days",
        "modelType",
        "inputTokenPrice",
        "outputTokenPrice",
        "contextLength",
        "responseLength",

        "requestsPerDay",
        "avgTokensPerRequest",
        "avgResponseTokens",

        "vectorDb",
        "embeddingGen",
        "rerankingModel",
        "moderationModel",
        "guardrails",
        "toolCalls",
        "toolCallsPerRequest",
        "avgCostPerToolCall",

        "caching",
        "modelRouting",
        "quantization",
        "batching",
        "promptCompression",
        "fineTuningReduction",
        "speculativeDecoding",

        "cacheHitRate",
        "routingSmallModelShare",
        "routingCostRatio",
        "tokenReduction",
        "fineTuningTokenReduction",

        "quantizationThroughputGain",
        "quantizationQualityRetention",

        "specDecodingThroughputGain",

        "apiBatchDiscount",
        "selfHostedBatchUtilizationGain",

        "tokensPerSecond",
        "gpuPrice",
        "numberOfGpus",

        "trainingGpuHours",
        "finetuningCost",
        "dataPreparationCost",
        "hardwareCost",

        "engineeringHoursOneTime",
        "costPerHour",
        "engineeringHoursMonthlyOps",

        "cachingImplHours",
        "routingImplHours",
        "quantizationImplHours",
        "batchingImplHours",
        "compressionImplHours",
        "fineTuningImplHours",
        "specDecodingImplHours",

        "vectorDbImplHours",
        "embeddingGenImplHours",
        "rerankingImplHours",
        "moderationImplHours",
        "guardrailsImplHours",
        "toolCallsImplHours",
      ],
    },

    reasoning: {
      type: "object",
      additionalProperties: false,
      properties: {
        model1: {
          type: "string",
        },
        model2: {
          type: "string",
        },
      },
      required: ["model1", "model2"],
    },
  },

  required: [
    "model1Name",
    "model2Name",
    "model1Params",
    "model2Params",
    "reasoning",
  ],
} as const;

async function callOpenAI(
  request: AgentGenerationRequest,
  context: AgentRuntimeContext
): Promise<AgentSuggestion | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn(
      "[agent] OPENAI_API_KEY not set — using fallback"
    );
    return null;
  }

  const client = new OpenAI({
    apiKey,
  });

  const model =
    process.env.OPENAI_AGENT_MODEL ||
    "gpt-5.6-luna";

  const { answers } = context;

  const modelsQuery =
    answers.models ||
    `${request.currentModel1Name} vs ${request.currentModel2Name}`;

  const userMessage = `
The user is building an LLM Total Cost of Ownership estimator.

Workflow mode:
${request.mode}

Target slot:
${request.targetSlot}

Requested model comparison:
${modelsQuery}

Current model 1:
${request.currentModel1Name}

Current model 2:
${request.currentModel2Name}

User answers:
${request.answers
  .map(
    (answer) =>
      `${answer.label}: ${answer.value}`
  )
  .join("\n")}

Default TCO parameters:
${JSON.stringify(defaultParams, null, 2)}

Your task:

1. Identify the most relevant current models for the user's request.
2. Resolve informal model names such as "mistral", "qwen", "llama", "gpt" or "claude" to official current model names.
3. Prefer cost-efficient models that satisfy the described workload.
4. Search the web for current model pricing and relevant technical information.
5. Prefer official model-provider pricing pages when available.
6. Do not invent pricing.
7. Prices used in TCOParams must be expressed in EUR per million tokens.
8. Convert USD prices to EUR using an approximate conversion rate of 0.87 when the source price is in USD.
9. For API models, populate inputTokenPrice and outputTokenPrice.
10. For cloud/self-hosted deployments, use gpuPrice instead of API token prices.
11. Do not change engineeringHoursOneTime, engineeringHoursMonthlyOps, costPerHour, or hardwareCost unless the user explicitly supplied them.
12. Return a complete configuration for both model 1 and model 2.
13. Do not leave the second model configuration empty just because the user selected one target slot.
14. The target slot controls which configuration the UI will apply; it does NOT mean that the response should omit the other configuration.
15. Keep the reasoning concise and explain the main cost/deployment assumptions.
16. Do not include URLs or markdown links in the reasoning fields.
17. Do not invent or construct URLs.
18. The source list will be handled separately by the application.
`;

  try {
    const response =
      await client.responses.create({
        model,

        tools: [
          {
            type: "web_search",
          },
        ],

        input: [
          {
            role: "system",
            content: `
You are an expert assistant for an LLM Total Cost of Ownership estimator.

Your job is to produce reliable, current TCO configurations.

Always search the web when current model names,
pricing, availability, or technical characteristics
are relevant.

Prefer primary sources:
- official model-provider pricing pages
- official model documentation
- official cloud GPU pricing pages

Never pretend that an old or guessed URL is a current source.

Return only data matching the requested structured output.
            `.trim(),
          },
          {
            role: "user",
            content: userMessage,
          },
        ],

        text: {
          format: {
            type: "json_schema",
            name: "tco_agent_suggestion",
            strict: true,
            schema: suggestionSchema,
          },
        },
      });

    const text = response.output_text;

    if (!text) {
      console.error(
        "[agent] OpenAI returned no output text"
      );
      return null;
    }

    const parsed =
      JSON.parse(text) as Partial<AgentGenerationResponse>;

    if (
      !parsed.model1Name ||
      !parsed.model2Name
    ) {
      console.error(
        "[agent] OpenAI response missing model names"
      );
      return null;
    }

    const model1Params =
      normalizeParams(parsed.model1Params);

    const model2Params =
      normalizeParams(parsed.model2Params);

    return {
      model1Name: parsed.model1Name,
      model2Name: parsed.model2Name,

      model1Params,
      model2Params,

      reasoning: {
        model1:
          parsed.reasoning?.model1 ||
          "Suggested by OpenAI.",

        model2:
          parsed.reasoning?.model2 ||
          "Suggested by OpenAI.",
      },

      fallbackUsed: false,
    };
  } catch (error) {
    console.error(
      "[agent] OpenAI request failed:",
      error
    );

    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function handleAgentRuntimeRequest(
  request: AgentGenerationRequest
): Promise<AgentSuggestion> {
  const answers = answerMap(request);

  const context: AgentRuntimeContext = {
    mode: request.mode,
    targetSlot: request.targetSlot,
    answers,
  };

  const openAIResult =
    await callOpenAI(request, context);

  if (openAIResult) {
    return openAIResult;
  }

  console.warn(
    "[agent] OpenAI unavailable — using local fallback suggestion"
  );

  return buildLocalSuggestion(
    request,
    context
  );
}
