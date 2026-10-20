import { WooCommerce } from "@traxo/commerce";
import { EventBus } from "@traxo/core";
import { VENEZUELA_ADDRESS_FIXTURES } from "@traxo/market-ve";
import { createTraxoMcp } from "@traxo/mcp-server";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { mountMcp } from "../src/mcp.ts";
import { redactPii, sanitizeLogData } from "../src/security.ts";

describe("L4: Certificación E2E Sandbox y Seguridad (Gate G4)", () => {
  // 1. MCP sin token -> 401
  it("G4.1: /mcp sin token retorna 401 Unauthorized (Fail-Closed)", async () => {
    const app = new Hono();
    mountMcp(app, "");

    const res = await app.request("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
    });

    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("Acceso no autorizado");
  });

  // 2. Webhook inválido -> 401
  it("G4.2: Webhook con firma HMAC inválida retorna 401 Unauthorized", async () => {
    const bus = new EventBus();
    const mockDb = {
      mode: "memory",
      prisma: {},
    } as any;

    const wooAdapter = new WooCommerce({
      storeId: "davebeauty_staging",
      url: "https://staging.davebeauty.test",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "secreto_webhook_super_seguro_123",
    });

    const app = createApp({
      db: mockDb,
      bus,
      commerce: {
        woocommerce: wooAdapter,
      },
    });

    const fakePayload = JSON.stringify({ id: 999, status: "processing" });

    // Intento con cabecera de firma errónea
    const res = await app.request("/webhooks/commerce/woocommerce", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wc-webhook-signature": "firma_invalida_falsificada",
        "x-wc-webhook-topic": "order.created",
      },
      body: fakePayload,
    });

    expect(res.status).toBe(401);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain("Firma inválida");
  });

  // 3. Rechazo estricto cross-tenant
  it("G4.3: Rechazo cross-tenant estricto (403 Forbidden) ante consulta entre tiendas", async () => {
    const mockClient = {
      get: async (path: string) => {
        if (path === "/api/orders") {
          return [
            {
              id: "1",
              number: "#1001",
              tenantId: "tenant_davebeauty",
              total: 45,
              address: { name: "Valeria", city: "Caracas" },
            },
            {
              id: "2",
              number: "#9001",
              tenantId: "tenant_otro_comercio",
              total: 90,
              address: { name: "Extraño", city: "Maracaibo" },
            },
          ];
        }
        if (path.includes("/api/orders/")) {
          return {
            order: {
              id: "2",
              number: "#9001",
              tenantId: "tenant_otro_comercio",
              total: 90,
              address: {
                name: "Extraño",
                phone: "+584149998877",
                street: "Av. 5",
                city: "Maracaibo",
              },
              lines: [],
            },
            quotes: [],
            shipments: [],
          };
        }
        return {};
      },
    };

    // Servidor MCP restringido a Davebeauty
    const server = createTraxoMcp(mockClient as any, {
      readOnly: true,
      tenantId: "tenant_davebeauty",
    });
    const tools = (server as any)._registeredTools;

    // A. Listar solo muestra órdenes del tenant Davebeauty
    const listRes = await tools["listar_pedidos"].handler({});
    expect(listRes.content[0].text).toContain("#1001");
    expect(listRes.content[0].text).not.toContain("#9001");

    // B. Ver pedido ajeno lanza 403
    const verRes = await tools["ver_pedido"].handler({ pedido: "9001" });
    expect(verRes.isError).toBe(true);
    expect(verRes.content[0].text).toContain("Acceso denegado (403)");
  });

  // 4. Secreto omitido en logs y sanitización de PII
  it("G4.4: Enmascaramiento y redacción de PII y secretos en logs (redactPii / sanitizeLogData)", () => {
    const rawLog =
      "Cliente Valeria Mendoza con teléfono +584121234567 y email valeria@davebeauty.test autorizó con Bearer tok_secret_123456789";
    const sanitized = redactPii(rawLog);

    expect(sanitized).not.toContain("tok_secret_123456789");
    expect(sanitized).toContain("Bearer [REDACTED]");
    expect(sanitized).not.toContain("valeria@davebeauty.test");
    expect(sanitized).toContain("v***a@davebeauty.test");
    expect(sanitized).not.toContain("+584121234567");
    expect(sanitized).toContain("+58412***4567");

    const objectWithSecrets = {
      user: "Carlos",
      email: "carlos@gmail.com",
      phone: "+584149876543",
      apiSecret: "super_secret_key",
      nested: {
        password: "user_secret_password",
      },
    };

    const sanitizedObj = sanitizeLogData(objectWithSecrets) as any;
    expect(sanitizedObj.apiSecret).toBe("[REDACTED]");
    expect(sanitizedObj.nested.password).toBe("[REDACTED]");
    expect(sanitizedObj.phone).toBe("+58414***6543");
    expect(sanitizedObj.email).toBe("c***s@gmail.com");
  });

  // 5. Checkout staging sin cobro real y sin completed prematuro
  it("G4.5: Flujo E2E de checkout staging sin cobro real y preservación de estado comercial", async () => {
    // Verificamos que la dirección venezolana de fixture sea procesable
    const address = VENEZUELA_ADDRESS_FIXTURES.caracas_davebeauty;
    expect(address.phoneE164).toBe("+584121234567");
    expect(address.stateCode).toBe("VE-A");

    // Simulador de WooCommerce Adapter en Staging
    const adapter = new WooCommerce({
      storeId: "davebeauty_staging",
      url: "https://staging.davebeauty.test",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "secret",
    });

    // Mock de llamadas REST para verificar que addFulfillment NO envía "status: completed"
    let updatedPayload: any = null;
    (adapter as any).call = async (endpoint: string, opts?: any) => {
      if (endpoint.includes("/notes")) {
        return { id: 101, note: "Nota creada" };
      }
      if (endpoint.includes("/orders/1001") && opts?.method === "PUT") {
        updatedPayload = JSON.parse(opts.body);
        return { id: 1001, status: "processing" };
      }
      return {};
    };

    await adapter.addFulfillment("1001", {
      carrier: "MRW",
      trackingNumber: "TRK-VE-001",
      url: "https://mrw.com.ve/rastreo/TRK-VE-001",
      notifyCustomer: true,
    });

    expect(updatedPayload).toBeDefined();
    // Validar que solo actualiza metadatos de guía y NO altera el estado a 'completed'
    expect(updatedPayload.status).toBeUndefined();
    expect(updatedPayload.meta_data).toEqual([
      { key: "_traxo_tracking_number", value: "TRK-VE-001" },
      { key: "_traxo_carrier", value: "MRW" },
    ]);
  });
});
