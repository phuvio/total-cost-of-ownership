import { describe, expect, it } from "vitest";
import { handleAgentRuntimeRequest } from "@/lib/agentRuntime";

describe("agentRuntime", () => {
  it("builds labeled model names when OpenAI is unavailable", async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const suggestion = await handleAgentRuntimeRequest({
        mode: "configure",
        targetSlot: "model1",
        currentModel1Name: "GPT-5.4",
        currentModel2Name: "Llama 3.1 70B",
        answers: [
          { key: "application", value: "support assistant", label: "Application" },
          { key: "users", value: "1000", label: "Users" },
          { key: "existingGpuInfra", value: "yes", label: "Existing GPU infrastructure" },
        ],
      });

      expect(suggestion.model1Name).toBe("GPT-5.4 (API)");
      expect(suggestion.model2Name).toBe("Llama 3.1 70B (Self-hosted)");
      expect(suggestion.fallbackUsed).toBe(true);
    } finally {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });
});