import { describe, expect, it } from "vitest";
import {
  FulfillmentEventSchema,
  MoneySchema,
  OrderLinkSchema,
  OrderSchema,
  addMoney,
  createMoney,
  formatMoney,
  multiplyMoney,
} from "../src/index.ts";

describe("L1-A2: Contratos Money y Multi-Moneda", () => {
  it("valida importes decimales exactos en USD y VES", () => {
    const usd = createMoney("19.99", "USD");
    expect(MoneySchema.safeParse(usd).success).toBe(true);
    expect(formatMoney(usd)).toBe("$ 19.99");

    const ves = createMoney("1250.50", "VES");
    expect(MoneySchema.safeParse(ves).success).toBe(true);
    expect(formatMoney(ves)).toBe("Bs. 1.250,50");
  });

  it("efectúa sumas exactas sin errores de redondeo float", () => {
    const a = createMoney("0.10", "USD");
    const b = createMoney("0.20", "USD");
    const res = addMoney(a, b);
    expect(res.amount).toBe("0.30"); // En float 0.1 + 0.2 = 0.30000000000000004
  });

  it("multiplica cantidades manteniendo decimales correctos", () => {
    const unit = createMoney("14.99", "USD");
    const total = multiplyMoney(unit, 3);
    expect(total.amount).toBe("44.97");
  });

  it("mantiene retrocompatibilidad con COP entero", () => {
    const cop = createMoney(125000, "COP");
    expect(cop.amount).toBe("125000");
    expect(formatMoney(cop)).toBe("$ 125.000");
  });
});

describe("L1-A2: Contrato OrderLink (WooCommerce <-> Dropi)", () => {
  it("valida el vínculo unlinked inicial", () => {
    const link = {
      tenantId: "tenant_davebeauty_01",
      storeId: "store_davebeauty_01",
      wooOrderId: "woo_101",
      syncOwner: "traxo_outbox" as const,
      syncStatus: "unlinked" as const,
      updatedAt: new Date().toISOString(),
    };

    const parsed = OrderLinkSchema.safeParse(link);
    expect(parsed.success).toBe(true);
  });

  it("valida el vínculo linked cuando Dropi responde", () => {
    const link = {
      tenantId: "tenant_davebeauty_01",
      storeId: "store_davebeauty_01",
      wooOrderId: "woo_101",
      dropiOrderId: "dropi_ve_9876",
      syncOwner: "native_dropi_woocommerce" as const,
      syncStatus: "linked" as const,
      updatedAt: new Date().toISOString(),
    };

    const parsed = OrderLinkSchema.safeParse(link);
    expect(parsed.success).toBe(true);
  });

  it("falla si faltan identificadores obligatorios (tenantId)", () => {
    const invalid = {
      tenantId: "",
      storeId: "store_01",
      wooOrderId: "woo_101",
      syncOwner: "traxo_outbox" as const,
      syncStatus: "unlinked" as const,
      updatedAt: new Date().toISOString(),
    };

    const parsed = OrderLinkSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe("L1-A2: Contrato FulfillmentEvent", () => {
  it("normaliza eventos de despacho de Dropi Venezuela", () => {
    const event = {
      tenantId: "tenant_davebeauty_01",
      storeId: "store_davebeauty_01",
      wooOrderId: "woo_101",
      dropiOrderId: "dropi_ve_9876",
      externalEventId: "evt_dropi_12345",
      externalStatus: "EN_TRANSITO",
      mappedStatus: "in_transit" as const,
      receivedAt: new Date().toISOString(),
      simulated: false,
    };

    const parsed = FulfillmentEventSchema.safeParse(event);
    expect(parsed.success).toBe(true);
  });
});
