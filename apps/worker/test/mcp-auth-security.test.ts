import { createTraxoMcp } from "@traxo/mcp-server";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { mountMcp } from "../src/mcp.ts";

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
    expect(readOnlyTools).toContain("conciliar_pedidos");
    expect(readOnlyTools).toContain("consultar_cobertura");

    // No debe contener herramientas de compra o modificación
    expect(readOnlyTools).not.toContain("crear_guia");
    expect(readOnlyTools).not.toContain("crear_campana");
    expect(readOnlyTools).not.toContain("enviar_whatsapp");
  });

  it("herramienta conciliar_pedidos opera de solo lectura y audita discrepancias", async () => {
    const mockClient = {
      get: async () => ({}),
    };
    const server = createTraxoMcp(mockClient as any, {
      readOnly: true,
      tenantId: "tenant_davebeauty_ve",
    });
    const tools = (server as any)._registeredTools;

    const res = await tools["conciliar_pedidos"].handler({ limite: 10 });
    expect(res.isError).toBeFalsy();
    const text = res.content[0].text;
    expect(text).toContain("REPORTE DE CONCILIACIÓN");
    expect(text).toContain("Fuente: reconciliation_engine");
    expect(text).toContain("Sincronizados: 2");
    expect(text).toContain("Faltantes en Dropi: 1");
    expect(text).toContain("Faltantes en WooCommerce: 1");
    expect(text).toContain("Conflictos de estado: 2");
    expect(text).toContain("Guías duplicadas: 2");
    expect(text).toContain("Sin cobertura Dropi: 1");
  });

  it("herramienta consultar_cobertura responde con fidelidad para localidades VE", async () => {
    const mockClient = { get: async () => ({}) };
    const server = createTraxoMcp(mockClient as any, { readOnly: true });
    const tools = (server as any)._registeredTools;

    // Con cobertura
    const resCaracas = await tools["consultar_cobertura"].handler({
      estado: "VE-A",
      ciudad: "Caracas",
    });
    expect(resCaracas.content[0].text).toContain("Cobertura CONFIRMADA");

    // Sin cobertura
    const resAtabapo = await tools["consultar_cobertura"].handler({
      estado: "VE-Y",
      ciudad: "San Fernando de Atabapo",
    });
    expect(resAtabapo.content[0].text).toContain("SIN cobertura logística");
  });

  it("aisla pedidos por tenantId e impide acceso cruzado entre tiendas (403)", async () => {
    const mockClient = {
      get: async (path: string) => {
        if (path === "/api/orders") {
          return [
            {
              id: "1",
              number: "#101",
              tenantId: "tenant_davebeauty",
              total: 30000,
              address: { name: "Ana", city: "Caracas" },
            },
            {
              id: "2",
              number: "#202",
              tenantId: "tenant_otra_tienda",
              total: 45000,
              address: { name: "Luis", city: "Valencia" },
            },
          ];
        }
        if (path.includes("/api/orders/")) {
          return {
            order: {
              id: "2",
              number: "#202",
              tenantId: "tenant_otra_tienda",
              total: 45000,
              address: { name: "Luis", phone: "+584149876543", street: "Av. 1", city: "Valencia" },
              lines: [],
            },
            quotes: [],
            shipments: [],
          };
        }
        return {};
      },
    };

    // Servidor autenticado solo para Davebeauty
    const daveServer = createTraxoMcp(mockClient as any, {
      readOnly: true,
      tenantId: "tenant_davebeauty",
    });
    const tools = (daveServer as any)._registeredTools;

    // 1. listar_pedidos solo retorna pedidos de Davebeauty
    const listRes = await tools["listar_pedidos"].handler({});
    expect(listRes.content[0].text).toContain("#101");
    expect(listRes.content[0].text).not.toContain("#202");

    // 2. ver_pedido de otra tienda es bloqueado con error 403
    const verRes = await tools["ver_pedido"].handler({ pedido: "202" });
    expect(verRes.isError).toBe(true);
    expect(verRes.content[0].text).toContain("Acceso denegado (403)");
  });
});
