import { describe, expect, it, vi } from "vitest";
import { defaultParams } from "@/lib/tco-calculations";
import { generateAgentSuggestion } from "@/lib/agentService";

describe("agentService", () => {
  it("returns a normalized suggestion when the backend is unavailable", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() => Promise.reject(new Error("offline"))) as typeof fetch;

    try {
      const suggestion = await generateAgentSuggestion({
        mode: "configure",
        targetSlot: "model1",
        currentModel1Name: "Model 1",
        currentModel2Name: "Model 2",
        answers: [
          { key: "application", value: "support assistant", label: "Application" },
          { key: "users", value: "1000", label: "Users" },
          { key: "inputLength", value: "800", label: "Input length" },
          { key: "retrieval", value: "yes", label: "Retrieval" },
        ],
      });

      expect(suggestion.model1Params.days).toBe(defaultParams.days);
      expect(suggestion.model1Params.vectorDb).toBe(true);
      expect(suggestion.model1Params.requestsPerDay).toBeGreaterThan(0);
      expect(suggestion.reasoning.model1.length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("enforces deployment pricing rules for non-api outputs", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            model1Name: "Cloud candidate",
            model1Params: {
              modelType: "cloud",
              inputTokenPrice: 4.5,
              outputTokenPrice: 9.5,
              gpuPrice: 0,
            },
            model2Name: "API candidate",
            model2Params: {
              modelType: "api",
              inputTokenPrice: 1.2,
              outputTokenPrice: 6.3,
              gpuPrice: 3.2,
            },
            reasoning: {
              model1: "cloud",
              model2: "api",
            },
          }),
      }) as unknown as Response,
    ) as typeof fetch;

    try {
      const suggestion = await generateAgentSuggestion({
        mode: "compare",
        targetSlot: "both",
        currentModel1Name: "GPT-4.1",
        currentModel2Name: "Llama 3.1 70B",
        answers: [
          { key: "models", value: "mistral vs qwen", label: "models" },
        ],
      });

      expect(suggestion.model1Name).toBe("Cloud candidate");
      expect(suggestion.model2Name).toBe("API candidate");

      expect(suggestion.model1Params.modelType).toBe("cloud");
      expect(suggestion.model1Params.inputTokenPrice).toBe(0);
      expect(suggestion.model1Params.outputTokenPrice).toBe(0);
      expect(suggestion.model1Params.gpuPrice).toBeGreaterThan(0);

      expect(suggestion.model2Params.modelType).toBe("api");
      expect(suggestion.model2Params.gpuPrice).toBe(0);
      expect(suggestion.model2Params.inputTokenPrice).toBeGreaterThan(0);
      expect(suggestion.model2Params.outputTokenPrice).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("preserves the user-provided model names in compare fallback mode", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(() => Promise.reject(new Error("offline"))) as typeof fetch;

    try {
      const suggestion = await generateAgentSuggestion({
        mode: "compare",
        targetSlot: "both",
        currentModel1Name: "Model 1",
        currentModel2Name: "Model 2",
        answers: [
          { key: "models", value: "mistral vs qwen", label: "models" },
        ],
      });

      expect(suggestion.model1Name).toBe("mistral");
      expect(suggestion.model2Name).toBe("qwen");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
