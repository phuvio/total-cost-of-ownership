import { defaultParams, TCOParams } from "@/lib/tco-calculations.js";
import {
  AgentGenerationRequest,
  AgentGenerationResponse,
  AgentQuestionAnswer,
  AgentSuggestion,
  AgentWorkflowMode,
  agentSystemPrompt,
} from "@/lib/agentTypes.js";
import { resolveAgentModelNames } from "./agentNaming.js";

const AGENT_ENDPOINT = import.meta.env.VITE_AGENT_ENDPOINT || "/api/agent";

const gpuFallbackByModelType: Record<TCOParams["modelType"], number> = {
  api: 0,
  cloud: 1.19,
  "self-hosted": 0.87,
};

function normalizeNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeParams(partial?: Partial<TCOParams>): TCOParams {
  const merged = {
    ...defaultParams,
    ...partial,
  };

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
    gpuPrice: merged.gpuPrice > 0 ? merged.gpuPrice : gpuFallbackByModelType[merged.modelType],
  };
}

function answerMap(answers: AgentQuestionAnswer[]) {
  return Object.fromEntries(answers.map((answer) => [answer.key, answer.value]));
}

function isYes(value: string | undefined) {
  return value === "yes" || value === "toolUse";
}

function deriveModelNames(request: AgentGenerationRequest, answers: Record<string, string>) {
  if (request.mode === "compare") {
    const comparison = answers.models || "";
    const parts = comparison.split(/\s+vs\s+|\s+against\s+|\s+and\s+/i).map((part) => part.trim()).filter(Boolean);
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

function resolveSuggestionNames(
  request: AgentGenerationRequest,
  answers: Record<string, string>,
  model1Type: TCOParams["modelType"],
  model2Type: TCOParams["modelType"],
) {
  const baseNames = deriveModelNames(request, answers);
  return resolveAgentModelNames(baseNames.model1Name, baseNames.model2Name, model1Type, model2Type);
}

function inferRequestsPerDay(mode: AgentWorkflowMode, answers: Record<string, string>): number {
  if (mode === "compare") {
    return normalizeNumber(answers.requestsPerDay, defaultParams.requestsPerDay);
  }

  const users = normalizeNumber(answers.users, 500);
  if (users >= 5000) return 50000;
  if (users >= 1000) return 10000;
  if (users >= 200) return 2500;
  return 500;
}

function inferTokenCounts(mode: AgentWorkflowMode, answers: Record<string, string>) {
  if (mode === "compare") {
    return {
      avgTokensPerRequest: normalizeNumber(answers.avgTokensPerRequest, defaultParams.avgTokensPerRequest),
      avgResponseTokens: normalizeNumber(answers.avgResponseTokens, defaultParams.avgResponseTokens),
    };
  }

  const inputTokens = normalizeNumber(answers.inputLength, 700);
  const retrieval = isYes(answers.retrieval) || isYes(answers.toolUse);

  return {
    avgTokensPerRequest: Math.max(300, retrieval ? Math.round(inputTokens * 1.35) : Math.round(inputTokens * 1.1)),
    avgResponseTokens: retrieval ? 350 : 220,
  };
}

function buildCompareSuggestion(request: AgentGenerationRequest, answers: Record<string, string>): AgentSuggestion {
  const requestsPerDay = inferRequestsPerDay(request.mode, answers);
  const tokenCounts = inferTokenCounts(request.mode, answers);
  const latencyCritical = answers.latencyCritical === "yes";
  const existingGpuInfra = answers.existingGpuInfra === "yes";

  const model1Params = normalizeParams({
    modelType: "api",
    requestsPerDay,
    ...tokenCounts,
    caching: true,
    cacheHitRate: latencyCritical ? 20 : 35,
    batching: !latencyCritical,
    apiBatchDiscount: 50,
    toolCalls: isYes(answers.toolUse),
    vectorDb: answers.useCase === "rag" || isYes(answers.retrieval),
    embeddingGen: answers.useCase === "rag" || isYes(answers.retrieval),
    rerankingModel: answers.useCase === "rag" || isYes(answers.retrieval),
    guardrails: answers.useCase === "agent",
    moderationModel: answers.useCase === "chatbot",
  });

  const model2Params = normalizeParams({
    modelType: existingGpuInfra ? "self-hosted" : "cloud",
    requestsPerDay,
    ...tokenCounts,
    caching: true,
    cacheHitRate: latencyCritical ? 15 : 30,
    modelRouting: true,
    routingSmallModelShare: 45,
    routingCostRatio: 0.18,
    batching: true,
    selfHostedBatchUtilizationGain: 35,
    toolCalls: isYes(answers.toolUse),
    vectorDb: answers.useCase === "rag" || isYes(answers.retrieval),
    embeddingGen: answers.useCase === "rag" || isYes(answers.retrieval),
    rerankingModel: answers.useCase === "rag" || isYes(answers.retrieval),
    guardrails: answers.useCase === "agent",
    moderationModel: answers.useCase === "chatbot",
    tokensPerSecond: existingGpuInfra ? 240 : 180,
    gpuPrice: existingGpuInfra ? 0.87 : 1.19,
  });

  const names = resolveSuggestionNames(request, answers, model1Params.modelType, model2Params.modelType);

  return {
    model1Name: names.model1Name,
    model1Params,
    model2Name: names.model2Name,
    model2Params,
    reasoning: {
      model1: latencyCritical
        ? "API-first setup prioritizes lower operational overhead and latency-sensitive batching defaults."
        : "API-first setup keeps token pricing current while assuming moderate caching and optional batch savings.",
      model2: existingGpuInfra
        ? "Self-hosted comparison assumes existing GPU capacity and higher throughput with routing and batching enabled."
        : "Cloud-hosted comparison uses a cheaper deployment path with routing and batching to approximate a managed setup.",
    },
    fallbackUsed: true,
  };
}

function buildConfigureSuggestion(request: AgentGenerationRequest, answers: Record<string, string>): AgentSuggestion {
  const requestsPerDay = inferRequestsPerDay(request.mode, answers);
  const tokenCounts = inferTokenCounts(request.mode, answers);
  const needsRetrieval = isYes(answers.retrieval) || isYes(answers.toolUse);

  const primaryParams = normalizeParams({
    modelType: "api",
    requestsPerDay,
    ...tokenCounts,
    vectorDb: needsRetrieval,
    embeddingGen: needsRetrieval,
    rerankingModel: needsRetrieval,
    toolCalls: isYes(answers.toolUse),
    guardrails: answers.useCase === "agent" || answers.useCase === "support",
    moderationModel: answers.useCase === "chatbot",
    caching: true,
    cacheHitRate: needsRetrieval ? 25 : 40,
    batching: answers.latencyCritical !== "yes",
  });

  const secondaryParams = normalizeParams({
    modelType: "cloud",
    requestsPerDay,
    ...tokenCounts,
    vectorDb: needsRetrieval,
    embeddingGen: needsRetrieval,
    rerankingModel: needsRetrieval,
    toolCalls: isYes(answers.toolUse),
    guardrails: answers.useCase === "agent" || answers.useCase === "support",
    moderationModel: answers.useCase === "chatbot",
    caching: true,
    cacheHitRate: 20,
    batching: true,
    modelRouting: true,
  });

  const names = resolveSuggestionNames(request, answers, primaryParams.modelType, secondaryParams.modelType);

  return {
    model1Name: names.model1Name,
    model1Params: primaryParams,
    model2Name: names.model2Name,
    model2Params: secondaryParams,
    reasoning: {
      model1: needsRetrieval
        ? "Configured for retrieval-heavy usage with a modest cache and RAG components enabled."
        : "Configured for a single-application deployment with simpler token and ops assumptions.",
      model2: "Baseline kept conservative so the calculator can compare the recommendation against a lower-risk alternative.",
    },
    fallbackUsed: true,
  };
}

function buildFallbackSuggestion(request: AgentGenerationRequest): AgentSuggestion {
  const answers = answerMap(request.answers);
  return request.mode === "compare"
    ? buildCompareSuggestion(request, answers)
    : buildConfigureSuggestion(request, answers);
}

function parseResponse(payload: unknown): AgentSuggestion {
  const candidate = payload as Partial<AgentGenerationResponse> | null | undefined;

  const model1Params = normalizeParams(candidate?.model1Params);
  const model2Params = normalizeParams(candidate?.model2Params);

  return {
    model1Name: candidate?.model1Name || "Model 1",
    model1Params,
    model2Name: candidate?.model2Name || "Model 2",
    model2Params,
    reasoning: {
      model1: candidate?.reasoning?.model1 || "Suggested by the agent.",
      model2: candidate?.reasoning?.model2 || "Suggested by the agent.",
    },
    sources: candidate?.sources,
    fallbackUsed: candidate?.fallbackUsed,
  };
}

export async function generateAgentSuggestion(request: AgentGenerationRequest): Promise<AgentSuggestion> {
  try {
    const response = await fetch(AGENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemPrompt: agentSystemPrompt,
        ...request,
      }),
    });

    if (!response.ok) {
      throw new Error(`Agent endpoint returned ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    return parseResponse(payload);
  } catch {
    return buildFallbackSuggestion(request);
  }
}
