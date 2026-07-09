import { defaultParams, TCOParams } from "./tco-calculations";
import {
  AgentGenerationRequest,
  AgentGenerationResponse,
  AgentSuggestion,
} from "./agentTypes";

const gpuFallbackByModelType: Record<TCOParams["modelType"], number> = {
  api: 0,
  cloud: 1.19,
  "self-hosted": 0.87,
};

interface AgentRuntimeContext {
  evidence: Array<{
    source: string;
    title: string;
    url?: string;
    note?: string;
  }>;
  mode: AgentGenerationRequest["mode"];
  targetSlot: AgentGenerationRequest["targetSlot"];
  answers: Record<string, string>;
}

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

function answerMap(request: AgentGenerationRequest) {
  return Object.fromEntries(request.answers.map((answer) => [answer.key, answer.value]));
}

function isYes(value: string | undefined) {
  return value === "yes" || value === "toolUse";
}

function parseModelNames(request: AgentGenerationRequest, answers: Record<string, string>) {
  if (request.mode === "compare") {
    const comparison = answers.models || "";
    const parts = comparison.split(/\s+vs\s+|\s+against\s+|\s+and\s+/i).map((part) => part.trim()).filter(Boolean);
    return {
      model1Name: parts[0] || request.currentModel1Name || "Recommended API",
      model2Name: parts[1] || request.currentModel2Name || "Alternative baseline",
    };
  }

  const applicationName = answers.application?.trim();
  return {
    model1Name: applicationName || request.currentModel1Name || "Recommended configuration",
    model2Name: request.currentModel2Name || "Alternative baseline",
  };
}

function inferRequestsPerDay(mode: AgentGenerationRequest["mode"], answers: Record<string, string>): number {
  if (mode === "compare") {
    return normalizeNumber(answers.requestsPerDay, defaultParams.requestsPerDay);
  }

  const users = normalizeNumber(answers.users, 500);
  if (users >= 5000) return 50000;
  if (users >= 1000) return 10000;
  if (users >= 200) return 2500;
  return 500;
}

function inferTokenCounts(mode: AgentGenerationRequest["mode"], answers: Record<string, string>) {
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

async function readTextFromUrl(url: string, timeoutMs = 6000): Promise<string> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return "";
    }

    const text = await response.text();
    return text.slice(0, 15000);
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function titleFromHtml(html: string, fallback: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() || fallback;
}

function extractPriceHints(text: string) {
  const matches = text.match(/(?:€|\$)\s?\d+(?:[.,]\d+)?(?:\s?\/\s?(?:1M|million|1\s?000\s?000)\s?tokens)?/gi);
  return matches?.slice(0, 4) ?? [];
}

function buildSourceSet(request: AgentGenerationRequest, answers: Record<string, string>) {
  const urls = new Set<string>([
    "https://openai.com/api/pricing/",
    "https://www.anthropic.com/pricing",
    "https://www.artificialanalysis.ai/",
    "https://www.lambdalabs.com/service/gpu-cloud",
    "https://aws.amazon.com/ec2/instance-types/g5/",
  ]);

  if (request.mode === "compare" || answers.useCase === "rag" || isYes(answers.retrieval)) {
    urls.add("https://www.mlcommons.org/en/inference/overview/");
  }

  if (answers.existingGpuInfra === "yes") {
    urls.add("https://www.lambdalabs.com/service/gpu-cloud");
  }

  return Array.from(urls);
}

async function collectEvidence(request: AgentGenerationRequest, answers: Record<string, string>) {
  const urls = buildSourceSet(request, answers);
  const fetched = await Promise.allSettled(
    urls.map(async (url) => {
      const html = await readTextFromUrl(url);
      if (!html) {
        return null;
      }

      const title = titleFromHtml(html, url);
      const priceHints = extractPriceHints(html);

      return {
        source: new URL(url).hostname.replace(/^www\./, ""),
        title,
        url,
        note: priceHints.length > 0
          ? `Detected pricing hints: ${priceHints.join(", ")}`
          : "Fetched source text for pricing/benchmark context.",
      };
    }),
  );

  const evidence: AgentRuntimeContext["evidence"] = [];
  for (const result of fetched) {
    if (result.status === "fulfilled" && result.value) {
      evidence.push(result.value);
    }
  }

  return evidence;
}

function buildLocalSuggestion(request: AgentGenerationRequest, context: AgentRuntimeContext): AgentSuggestion {
  const { answers } = context;
  const names = parseModelNames(request, answers);
  const requestsPerDay = inferRequestsPerDay(request.mode, answers);
  const tokenCounts = inferTokenCounts(request.mode, answers);
  const latencyCritical = answers.latencyCritical === "yes";
  const existingGpuInfra = answers.existingGpuInfra === "yes";
  const needsRetrieval = isYes(answers.retrieval) || isYes(answers.toolUse);

  const model1Params = normalizeParams({
    modelType: request.mode === "compare" ? "api" : "api",
    requestsPerDay,
    ...tokenCounts,
    caching: true,
    cacheHitRate: latencyCritical ? 20 : needsRetrieval ? 30 : 35,
    batching: answers.latencyCritical !== "yes",
    apiBatchDiscount: 50,
    toolCalls: isYes(answers.toolUse),
    vectorDb: needsRetrieval,
    embeddingGen: needsRetrieval,
    rerankingModel: needsRetrieval,
    guardrails: answers.useCase === "agent",
    moderationModel: answers.useCase === "chatbot",
    inputTokenPrice: defaultParams.inputTokenPrice,
    outputTokenPrice: defaultParams.outputTokenPrice,
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
    vectorDb: needsRetrieval,
    embeddingGen: needsRetrieval,
    rerankingModel: needsRetrieval,
    guardrails: answers.useCase === "agent",
    moderationModel: answers.useCase === "chatbot",
    tokensPerSecond: existingGpuInfra ? 240 : 180,
    gpuPrice: existingGpuInfra ? 0.87 : 1.19,
  });

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
    sources: context.evidence,
    fallbackUsed: true,
  };
}

async function callAnthropic(request: AgentGenerationRequest, context: AgentRuntimeContext): Promise<AgentSuggestion | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-latest";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      temperature: 0.2,
      system: [
        "You are a TCO (Total Cost of Ownership) parameter assistant for an LLM deployment cost estimator.",
        "Return only JSON with model1Name, model1Params, model2Name, model2Params, reasoning.",
        "Do not include markdown, code fences, or explanation outside the JSON object.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            request,
            evidence: context.evidence,
            defaults: defaultParams,
            instructions: {
              compareVsConfigure: true,
              preserveOrgSpecificFields: ["engineeringHoursOneTime", "engineeringHoursMonthlyOps", "costPerHour", "hardwareCost"],
              returnPricesInEuroPerMillionTokens: true,
            },
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    content?: Array<{ text?: string }>;
  };
  const text = payload.content?.map((item) => item.text || "").join("") || "";
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as Partial<AgentGenerationResponse>;
    return {
      model1Name: parsed.model1Name || context.evidence[0]?.title || "Model 1",
      model1Params: normalizeParams(parsed.model1Params),
      model2Name: parsed.model2Name || context.evidence[1]?.title || "Model 2",
      model2Params: normalizeParams(parsed.model2Params),
      reasoning: {
        model1: parsed.reasoning?.model1 || "Suggested by Claude.",
        model2: parsed.reasoning?.model2 || "Suggested by Claude.",
      },
      sources: context.evidence,
      fallbackUsed: false,
    };
  } catch {
    return null;
  }
}

export async function handleAgentRuntimeRequest(request: AgentGenerationRequest): Promise<AgentSuggestion> {
  const answers = answerMap(request);
  const evidence = await collectEvidence(request, answers);
  const context: AgentRuntimeContext = {
    mode: request.mode,
    targetSlot: request.targetSlot,
    answers,
    evidence,
  };

  const anthropicResult = await callAnthropic(request, context);
  if (anthropicResult) {
    return anthropicResult;
  }

  return buildLocalSuggestion(request, context);
}
