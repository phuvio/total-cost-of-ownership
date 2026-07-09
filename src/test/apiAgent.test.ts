import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

const { handleAgentRuntimeRequestMock } = vi.hoisted(() => ({
  handleAgentRuntimeRequestMock: vi.fn(),
}));

vi.mock("../../src/lib/agentRuntime", () => ({
  handleAgentRuntimeRequest: handleAgentRuntimeRequestMock,
}));

import handler from "../../api/agent";

function createMockResponse() {
  const chunks: string[] = [];
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    end(payload: string) {
      chunks.push(payload);
    },
    body() {
      return chunks.join("");
    },
  } as {
    statusCode: number;
    headers: Record<string, string>;
    setHeader(name: string, value: string): void;
    end(payload: string): void;
    body(): string;
  };
}

function createMockRequest(method: string, payload?: unknown) {
  const request = new PassThrough() as PassThrough & {
    method?: string;
    body?: unknown;
  };

  request.method = method;
  if (payload !== undefined) {
    request.body = payload;
  }

  if (payload && request.body === undefined) {
    request.end(JSON.stringify(payload));
  }

  return request;
}

afterEach(() => {
  handleAgentRuntimeRequestMock.mockReset();
});

describe("api/agent", () => {
  it("returns 405 for non-POST requests", async () => {
    const req = createMockRequest("GET");
    const res = createMockResponse();

    await handler(req, res as never);

    expect(res.statusCode).toBe(405);
    expect(JSON.parse(res.body())).toEqual({ error: "Method not allowed" });
    expect(handleAgentRuntimeRequestMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid payloads", async () => {
    const req = createMockRequest("POST", { invalid: true });
    const res = createMockResponse();

    await handler(req, res as never);

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body())).toEqual({ error: "Invalid agent request payload" });
    expect(handleAgentRuntimeRequestMock).not.toHaveBeenCalled();
  });

  it("delegates valid requests to the agent runtime", async () => {
    handleAgentRuntimeRequestMock.mockResolvedValue({
      model1Name: "Model A",
      model1Params: { days: 365 },
      model2Name: "Model B",
      model2Params: { days: 365 },
      reasoning: { model1: "ok", model2: "ok" },
    });

    const req = createMockRequest("POST", {
      mode: "configure",
      targetSlot: "model1",
      currentModel1Name: "Model 1",
      currentModel2Name: "Model 2",
      answers: [],
    });
    const res = createMockResponse();

    await handler(req, res as never);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body())).toMatchObject({
      model1Name: "Model A",
      model2Name: "Model B",
      reasoning: { model1: "ok", model2: "ok" },
    });
    expect(handleAgentRuntimeRequestMock).toHaveBeenCalledTimes(1);
  });
});
