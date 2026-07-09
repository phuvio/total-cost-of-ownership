import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { handleAgentRuntimeRequest } from "./src/lib/agentRuntime";
import type { IncomingMessage, ServerResponse } from "http";

function agentProxyPlugin() {
  return {
    name: "agent-proxy",
    configureServer(server: { middlewares: { use: (path: string, handler: (req: IncomingMessage, res: ServerResponse<IncomingMessage>, next: (err?: unknown) => void) => void) => void } }) {
      server.middlewares.use("/api/agent", async (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", async () => {
          try {
            const raw = Buffer.concat(chunks).toString("utf8");
            const body = raw ? JSON.parse(raw) : {};
            const payload = await handleAgentRuntimeRequest(body);

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(payload));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({
              error: error instanceof Error ? error.message : "Agent proxy failed",
            }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: "/total-cost-of-ownership/",

  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },

  plugins: [
    react(),
    agentProxyPlugin(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
