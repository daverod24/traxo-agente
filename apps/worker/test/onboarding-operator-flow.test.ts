import { commerceFromEnv, ShopifyCommerce, WooCommerce } from "@traxo/commerce";
import { createTraxoMcp } from "@traxo/mcp-server";
import { describe, expect, it } from "vitest";

describe("L5: Onboarding, Operabilidad Multi-Tienda y Flujo de Operador (Gate G5)", () => {
  it("G5.1: Fábrica commerceFromEnv soporta múltiples tiendas aisladas", () => {
    // Configuración multi-tienda simultánea
    const env = {
      WOOCOMMERCE_URL: "https://staging.davebeauty.test",
      WOOCOMMERCE_KEY: "ck_woo_123",
      WOOCOMMERCE_SECRET: "cs_woo_456",
      WOOCOMMERCE_WEBHOOK_SECRET: "sec_woo_789",
      SHOPIFY_STORE_DOMAIN: "davebeauty-ve.myshopify.com",
      SHOPIFY_ADMIN_TOKEN: "shpat_test_123456",
      SHOPIFY_WEBHOOK_SECRET: "shpss_test_789012",
    };

    const adapters = commerceFromEnv(env, "davebeauty_staging");

    expect(adapters.woocommerce).toBeDefined();
    expect(adapters.shopify).toBeDefined();
    expect(adapters.woocommerce.platform).toBe("woocommerce");
    expect(adapters.shopify.platform).toBe("shopify");
    expect(adapters.woocommerce.storeId).toBe("davebeauty_staging");
    expect(adapters.shopify.storeId).toBe("davebeauty_staging");
  });

  it("G5.2: Herramientas MCP para operador no técnico responden sin mutación", async () => {
    const mockClient = {
      get: async (path: string) => {
        if (path === "/api/state") {
          return {
            store: { name: "Davebeauty Staging" },
            db: "pglite",
            settings: { autonomy: 0, maxAutoShipmentCost: 50000 },
            kpis: {
              orders: 12,
              shipments: 5,
              inTransit: 3,
              delivered: 2,
              incidents: 0,
              pendingApprovals: 1,
              shippingSpend: 45000,
            },
            connections: [
              { name: "WooCommerce", live: true },
              { name: "Dropi VE", live: false, note: "simulado" },
            ],
          };
        }
        if (path.includes("/quote")) {
          return {
            explanation: "Cotización calculada para Caracas",
            ranking: [
              {
                carrier: "MRW",
                provider: "dropi",
                total: 15000,
                businessDays: 2,
                score: 95,
                simulated: true,
              },
              {
                carrier: "Zoom",
                provider: "dropi",
                total: 18000,
                businessDays: 1,
                score: 90,
                simulated: true,
              },
            ],
            failed: [],
          };
        }
        return {};
      },
    };

    // Servidor MCP para operador en modo read-only
    const server = createTraxoMcp(mockClient as any, {
      readOnly: true,
      tenantId: "tenant_davebeauty_ve",
    });
    const tools = (server as any)._registeredTools;

    // Prompt 1: Estado de la tienda
    const estado = await tools["traxo_estado"].handler({});
    expect(estado.content[0].text).toContain("Davebeauty Staging");
    expect(estado.content[0].text).toContain("WooCommerce: real");
    expect(estado.content[0].text).toContain("Dropi VE: simulado");

    // Prompt 2: Conciliación de pedidos
    const recon = await tools["conciliar_pedidos"].handler({ limite: 10 });
    expect(recon.content[0].text).toContain("REPORTE DE CONCILIACIÓN");
    expect(recon.content[0].text).toContain("Tenant: tenant_davebeauty_ve");

    // Prompt 3: Consultar cobertura
    const cov = await tools["consultar_cobertura"].handler({ estado: "VE-B", ciudad: "Lechería" });
    expect(cov.content[0].text).toContain("Cobertura CONFIRMADA");

    // Prompt 4: Cotizar envío (borrador sin emitir guía)
    const quote = await tools["cotizar_envio"].handler({ pedido: "1001" });
    expect(quote.content[0].text).toContain("MRW (dropi)");
    expect(quote.content[0].text).toContain("Zoom (dropi)");

    // Garantizar que no puede emitir guías sin modo escritura y confirmación
    expect(tools["crear_guia"]).toBeUndefined();
  });
});
