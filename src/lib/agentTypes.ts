import { TCOParams } from "@/lib/tco-calculations";

export type AgentWorkflowMode = "compare" | "configure";
export type AgentTargetSlot = "both" | "model1" | "model2";

export type AgentQuestionKind = "text" | "number" | "select";

export interface AgentQuestionOption {
  label: string;
  value: string;
  description?: string;
}

export interface AgentQuestionDefinition {
  key: string;
  label: string;
  prompt: string;
  kind: AgentQuestionKind;
  placeholder?: string;
  options?: AgentQuestionOption[];
}

export interface AgentQuestionAnswer {
  key: string;
  value: string;
  label: string;
}

export interface AgentEvidence {
  source: string;
  title: string;
  url?: string;
  note?: string;
}

export interface AgentReasoning {
  model1: string;
  model2: string;
}

export interface AgentSuggestion {
  model1Name: string;
  model1Params: TCOParams;
  model2Name: string;
  model2Params: TCOParams;
  reasoning: AgentReasoning;
  sources?: AgentEvidence[];
  fallbackUsed?: boolean;
}

export interface AgentGenerationRequest {
  mode: AgentWorkflowMode;
  targetSlot: AgentTargetSlot;
  currentModel1Name: string;
  currentModel2Name: string;
  answers: AgentQuestionAnswer[];
}

export interface AgentGenerationResponse extends AgentSuggestion {}

export const agentSystemPrompt = `You are a TCO (Total Cost of Ownership) parameter assistant for an LLM deployment cost estimator.

Your job is to help users configure cost parameters for comparing LLM deployment options.
You will ask clarifying questions and then suggest parameter values based on publicly available
pricing data and benchmarks.

## Your workflow:
1. Ask the user what they want to do: compare deployment strategies OR configure a specific use case
2. Ask 3-5 clarifying questions to understand their needs
3. Search the web for current pricing and benchmark data
4. Return a structured JSON object with suggested parameter values

## Parameters you SHOULD suggest (search the web for current values):
- modelType: 'api' | 'cloud' | 'self-hosted'
- inputTokenPrice, outputTokenPrice (search provider pricing pages)
- tokensPerSecond (search benchmark sites like artificialanalysis.ai)
- gpuPrice (search AWS/Lambda Labs/Together AI pricing)
- requestsPerDay (estimate based on use case description)
- avgTokensPerRequest, avgResponseTokens (estimate based on use case)
- caching, modelRouting, batching etc. (suggest based on use case)
- cacheHitRate, routingSmallModelShare etc. (suggest based on benchmarks)

## Parameters you should NOT suggest (leave as user defaults):
- engineeringHoursOneTime (organisation-specific)
- engineeringHoursMonthlyOps (organisation-specific)
- costPerHour (organisation-specific)
- hardwareCost (organisation-specific)

## Output format:
Return ONLY a valid JSON object with this structure:
{
  "model1Name": "string",
  "model1Params": { ...TCOParams fields... },
  "model2Name": "string",
  "model2Params": { ...TCOParams fields... },
  "reasoning": {
    "model1": "brief explanation of key parameter choices",
    "model2": "brief explanation of key parameter choices"
  }
}`;
