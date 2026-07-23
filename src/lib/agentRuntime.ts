import { defaultParams, TCOParams } from "./tco-calculations";
import {
  AgentGenerationRequest,
  AgentGenerationResponse,
  AgentSuggestion,
} from "./agentTypes";
import { resolveAgentModelNames } from "./agentNaming";

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
    return { ...merged, gpuPrice: 0 };
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

function answerMap(request: AgentGenerationRequest): Record<string, string> {
  return Object.fromEntries(request.answers.map((a) => [a.key, a.value]));
}

function isYes(value: string | undefined) {
  return value === "yes" || value === "toolUse";
}

// ─── Model name helpers ───────────────────────────────────────────────────────

/**
 * Parse raw user input like "mistral vs qwen" into base names.
 * These are intentionally raw — Claude will replace them with official names.
 * Used only for fallback when Claude is unavailable.
 */
function parseRawModelNames(
  request: AgentGenerationRequest,
  answers: Record<string, string>
): { model1Name: string; model2Name: string } {
  if (request.mode === "compare") {
    const comparison = answers.models || "";
    const parts = comparison
      .split(/\s+vs\.?\s+|\s+against\s+|\s+and\s+/i)
      .map((p) => p.trim())
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

/**
 * Build a human-readable fallback name when Claude is unavailable.
 * Capitalises the first letter and appends the deployment type hint.
 */
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

// ─── Inference helpers ────────────────────────────────────────────────────────

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
  const inputTokens = normalizeNumber(answers.inputLength, 700);
  const retrieval = isYes(answers.retrieval) || isYes(answers.toolUse);
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

// ─── Evidence collection ──────────────────────────────────────────────────────

async function readTextFromUrl(
  url: string,
  timeoutMs = 6000
): Promise<string> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "text/html,application/xhtml+xml" },
    });
    if (!response.ok) return "";
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
  const matches = text.match(
    /(?:€|\$)\s?\d+(?:[.,]\d+)?(?:\s?\/\s?(?:1M|million|1\s?000\s?000)\s?tokens)?/gi
  );
  return matches?.slice(0, 4) ?? [];
}

function buildSourceSet(
  request: AgentGenerationRequest,
  answers: Record<string, string>
): string[] {
  const urls = new Set<string>([
    "https://openai.com/api/pricing/",
    "https://www.anthropic.com/pricing",
    "https://www.artificialanalysis.ai/",
    "https://www.lambdalabs.com/service/gpu-cloud",
    "https://aws.amazon.com/ec2/instance-types/g5/",
  ]);
  if (
    request.mode === "compare" ||
    answers.useCase === "rag" ||
    isYes(answers.retrieval)
  ) {
    urls.add("https://www.mlcommons.org/en/inference/overview/");
  }
  if (answers.existingGpuInfra === "yes") {
    urls.add("https://www.lambdalabs.com/service/gpu-cloud");
  }
  return Array.from(urls);
}

async function collectEvidence(
  request: AgentGenerationRequest,
  answers: Record<string, string>
): Promise<AgentRuntimeContext["evidence"]> {
  const urls = buildSourceSet(request, answers);
  const fetched = await Promise.allSettled(
    urls.map(async (url) => {
      const html = await readTextFromUrl(url);
      if (!html) return null;
      const title = titleFromHtml(html, url);
      const priceHints = extractPriceHints(html);
      return {
        source: new URL(url).hostname.replace(/^www\./, ""),
        title,
        url,
        note:
          priceHints.length > 0
            ? `Detected pricing hints: ${priceHints.join(", ")}`
            : "Fetched source text for pricing/benchmark context.",
      };
    })
  );
  const evidence: AgentRuntimeContext["evidence"] = [];
  for (const result of fetched) {
    if (result.status === "fulfilled" && result.value) {
      evidence.push(result.value);
    }
  }
  return evidence;
}

// ─── Fallback suggestion (no Claude) ─────────────────────────────────────────

function buildLocalSuggestion(
  request: AgentGenerationRequest,
  context: AgentRuntimeContext
): AgentSuggestion {
  const { answers } = context;
  const rawNames = parseRawModelNames(request, answers);
  const requestsPerDay = inferRequestsPerDay(request.mode, answers);
  const tokenCounts = inferTokenCounts(request.mode, answers);
  const latencyCritical = answers.latencyCritical === "yes";
  const existingGpuInfra = answers.existingGpuInfra === "yes";
  const needsRetrieval = isYes(answers.retrieval) || isYes(answers.toolUse);

  const model1Type: TCOParams["modelType"] = "api";
  const model2Type: TCOParams["modelType"] = existingGpuInfra
    ? "self-hosted"
    : "cloud";

  const model1Params = normalizeParams({
    modelType: model1Type,
    requestsPerDay,
    ...tokenCounts,
    caching: true,
    cacheHitRate: latencyCritical ? 20 : needsRetrieval ? 30 : 35,
    batching: !latencyCritical,
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
    modelType: model2Type,
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

  // FIX: use buildFallbackName so names communicate deployment type
  // even when Claude is unavailable — avoids returning raw "mistral"/"qwen"
  return {
    model1Name: buildFallbackName(rawNames.model1Name, model1Type),
    model2Name: buildFallbackName(rawNames.model2Name, model2Type),
    model1Params,
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

// ─── Claude API call ──────────────────────────────────────────────────────────

async function callAnthropic(
  request: AgentGenerationRequest,
  context: AgentRuntimeContext
): Promise<AgentSuggestion | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[agent] ANTHROPIC_API_KEY not set — using fallback");
    return null;
  }

  const model =
    process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-latest";

  // FIX: use context.answers (already computed) instead of calling answerMap again
  const { answers } = context;
  const modelsQuery =
    answers.models ||
    `${request.currentModel1Name} vs ${request.currentModel2Name}`;

  const userMessage = `
The user wants to compare these models: "${modelsQuery}"
Mode: ${request.mode}

## CRITICAL NAMING RULE:
You MUST use official full model names. Do NOT use "${request.currentModel1Name}"
or "${request.currentModel2Name}" as model names in your response.
Search for the most relevant current models matching those terms and return their
official names (e.g. "Mistral Small 3.1 24B" not "mistral", "Qwen3 4B" not "qwen").
Pick the most cost-efficient version suitable for the described use case.

## User answers:
${request.answers.map((a) => `${a.label}: ${a.value}`).join("\n")}

## Evidence from pricing sources:
${JSON.stringify(context.evidence, null, 2)}

## Default parameter base (use these as starting values):
${JSON.stringify(defaultParams, null, 2)}

## Rules:
- Prices in € per million tokens (multiply USD prices by 0.87)
- Do NOT change: engineeringHoursOneTime, engineeringHoursMonthlyOps, costPerHour, hardwareCost
- model1Name and model2Name MUST be official full model names, never raw user input
- Return ONLY valid JSON matching the required structure — no markdown, no explanation
`;

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        temperature: 0.2,
        system: [
          "You are a TCO parameter assistant for an LLM deployment cost estimator.",
          "Search the web to find the exact current official model names and pricing for the requested models.",
          "Return ONLY a JSON object with model1Name, model1Params, model2Name, model2Params, reasoning.",
          "Never use the user's raw search term as a model name — always resolve to the official full model name.",
          "Do not include markdown code fences or any text outside the JSON object.",
        ].join(" "),
        messages: [{ role: "user", content: userMessage }],
      }),
    });
  } catch (err) {
    console.error("[agent] Fetch to Anthropic failed:", err);
    return null;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(
      `[agent] Anthropic returned ${response.status}: ${body.slice(0, 200)}`
    );
    return null;
  }

  const payload = (await response.json()) as {
    content?: Array<{ text?: string }>;
  };
  const text =
    payload.content?.map((item) => item.text || "").join("") || "";

  if (!text) {
    console.error("[agent] Empty response from Anthropic");
    return null;
  }

  try {
    // Strip markdown fences if Claude added them despite instructions
    const clean = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
    const parsed = JSON.parse(clean) as Partial<AgentGenerationResponse>;

    if (!parsed.model1Name || !parsed.model2Name) {
      console.error("[agent] Claude response missing model names:", clean.slice(0, 300));
      return null;
    }

    const model1Params = normalizeParams(parsed.model1Params);
    const model2Params = normalizeParams(parsed.model2Params);

    return {
      model1Name: parsed.model1Name,
      model2Name: parsed.model2Name,
      model1Params,
      model2Params,
      reasoning: {
        model1: parsed.reasoning?.model1 || "Suggested by Claude.",
        model2: parsed.reasoning?.model2 || "Suggested by Claude.",
      },
      sources: context.evidence,
      fallbackUsed: false,
    };
  } catch (err) {
    console.error("[agent] JSON parse failed. Raw text:", text.slice(0, 500));
    console.error("[agent] Parse error:", err);
    return null;
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function handleAgentRuntimeRequest(
  request: AgentGenerationRequest
): Promise<AgentSuggestion> {
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

  console.warn("[agent] Claude unavailable — using local fallback suggestion");
  return buildLocalSuggestion(request, context);
}
