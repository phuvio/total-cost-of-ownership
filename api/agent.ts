import type { IncomingMessage, ServerResponse } from "http";
import { handleAgentRuntimeRequest } from "../src/lib/agentRuntime";
import type { AgentGenerationRequest } from "../src/lib/agentTypes";

type AgentRequest = IncomingMessage & {
  body?: unknown;
};

function sendJson(res: ServerResponse<IncomingMessage>, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req: AgentRequest): Promise<unknown> {
  if (req.body !== undefined) {
    return req.body;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function isAgentRequest(payload: unknown): payload is AgentGenerationRequest {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<AgentGenerationRequest>;
  return (
    (candidate.mode === "compare" || candidate.mode === "configure") &&
    (candidate.targetSlot === "both" || candidate.targetSlot === "model1" || candidate.targetSlot === "model2") &&
    typeof candidate.currentModel1Name === "string" &&
    typeof candidate.currentModel2Name === "string" &&
    Array.isArray(candidate.answers)
  );
}

export default async function handler(req: AgentRequest, res: ServerResponse<IncomingMessage>) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = await readRequestBody(req);
    if (!isAgentRequest(body)) {
      sendJson(res, 400, { error: "Invalid agent request payload" });
      return;
    }

    const suggestion = await handleAgentRuntimeRequest(body);
    sendJson(res, 200, suggestion);
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Agent handler failed",
    });
  }
}
