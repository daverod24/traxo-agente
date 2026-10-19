import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createTraxoMcp, inProcessClient } from "@traxo/mcp-server";
import type { Hono } from "hono";
import { INTERNAL } from "./auth.ts";

/**
/**
 * Expone las herramientas de Traxo por MCP sobre HTTP en /mcp.
 * Modo FAIL-CLOSED: si TRAXO_MCP_TOKEN no está definido o es vacío, rechaza con 401 invariablemente.
 */
export function mountMcp(
  app: Hono,
  token = process.env.TRAXO_MCP_TOKEN,
  opts: { readOnly?: boolean } = {},
): void {
  app.all("/mcp", async (c) => {
    // Fail-Closed: denegar si falta token en servidor o si la cabecera no coincide exactamente
    if (!token || token.trim() === "" || c.req.header("authorization") !== `Bearer ${token}`) {
      return c.json(
        { error: "Acceso no autorizado: TRAXO_MCP_TOKEN no configurado o token Bearer inválido." },
        401,
      );
    }
    // El servidor se llama a sí mismo: ya validamos el token de /mcp, así que entra con el pase interno.
    const internal = {
      request: (path: string, init: RequestInit = {}) =>
        app.request(path, {
          ...init,
          headers: {
            ...(init.headers as Record<string, string> | undefined),
            "x-traxo-internal": INTERNAL,
          },
        }),
    };
    const server = createTraxoMcp(inProcessClient(internal), { readOnly: opts.readOnly });
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });
}
