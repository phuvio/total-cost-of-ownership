import { describe, expect, it, vi } from "vitest";
import { handleAgentRuntimeRequest } from "@/lib/agentRuntime";

describe("agentRuntime", () => {
  it("normalizes returned model names to include deployment labels", async () => {
    const originalFetch = globalThis.fetch;
    const originalApiKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "test-key";
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("api.anthropic.com")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            content: [
              {
                text: JSON.stringify({
                  model1Name: "Custom name",
                  model1Params: { modelType: "cloud" },
                  model2Name: "Another name",
                  model2Params: { modelType: "self-hosted" },
                  reasoning: { model1: "ok", model2: "ok" },
                }),
              },
            ],
          }),
        } as Response);
      }

      return Promise.resolve({ ok: false, text: () => Promise.resolve("") } as Response);
    }) as typeof fetch;

    try {
      const suggestion = await handleAgentRuntimeRequest({
        mode: "configure",
        targetSlot: "model1",
        currentModel1Name: "GPT-5.4",
        currentModel2Name: "Llama 3.1 70B",
        answers: [
          { key: "application", value: "support assistant", label: "Application" },
          { key: "users", value: "1000", label: "Users" },
        ],
      });

      expect(suggestion.model1Name).toBe("Custom name");
      expect(suggestion.model2Name).toBe("Another name");
    } finally {
      globalThis.fetch = originalFetch;
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  });
});