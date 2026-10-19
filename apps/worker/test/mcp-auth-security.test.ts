import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { mountMcp } from "../src/mcp.ts";
import { createTraxoMcp } from "@traxo/mcp-server";

describe("L1-A3: Seguridad MCP y Modo Fail-Closed", () => {
  it("deniega acceso con 401 si TRAXO_MCP_TOKEN está vacío o no configurado (Fail-Closed)", async () => {
    const app = new Hono();
    mountMcp(app, ""); // Token no configurado / vacío

    const res = await app.request("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
    });

    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("Acceso no autorizado");
  });

  it("deniega acceso con 401 si falta la cabecera Authorization", async () => {
    const app = new Hono();
    mountMcp(app, "secreto-seguro-123");

    const res = await app.request("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
    });

    expect(res.status).toBe(401);
  });

  it("deniega acceso con 401 si el token es incorrecto", async () => {
    const app = new Hono();
    mountMcp(app, "secreto-seguro-123");

    const res = await app.request("/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-falso",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
    });

    expect(res.status).toBe(401);
  });
});

describe("L1-A3: Catálogo MCP en Modo Read-Only", () => {
  it("no expone herramientas de escritura en modo readOnly: true", () => {
    const mockClient = {
      get: async () => ({}),
      post: async () => ({}),
      patch: async () => ({}),
      delete: async () => ({}),
    };

    // Servidor normal (con herramientas de escritura)
    const normalServer = createTraxoMcp(mockClient as any, { readOnly: false });
    const normalTools = Object.keys((normalServer as any)._registeredTools || {});

    // Servidor estrictamente de solo lectura
    const readOnlyServer = createTraxoMcp(mockClient as any, { readOnly: true });
    const readOnlyTools = Object.keys((readOnlyServer as any)._registeredTools || {});

    // El servidor readOnly debe tener menos herramientas
    expect(readOnlyTools.length).toBeLessThan(normalTools.length);
    expect(readOnlyTools).toContain("traxo_estado");
    expect(readOnlyTools).toContain("listar_pedidos");
    expect(readOnlyTools).toContain("cotizar_envio");

    // No debe contener herramientas de compra o modificación
    expect(readOnlyTools).not.toContain("crear_guia");
    expect(readOnlyTools).not.toContain("crear_campana");
    expect(readOnlyTools).not.toContain("enviar_whatsapp");
  });
});
