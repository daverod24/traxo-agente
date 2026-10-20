import { describe, expect, it } from "vitest";
import { RECONCILIATION_FIXTURES } from "../src/reconciliation-fixtures.ts";

describe("L3-A4: Suite de Fixtures de Conciliación (10 Escenarios Gate G3)", () => {
  it("valida que las órdenes de WooCommerce contienen atributos obligatorios de Venezuela", () => {
    expect(RECONCILIATION_FIXTURES.wooOrders.length).toBeGreaterThanOrEqual(8);
    for (const order of RECONCILIATION_FIXTURES.wooOrders) {
      expect(order.id).toBeTruthy();
      expect(order.currency).toBe("USD");
      expect(order.address.country).toBe("VE");
      expect(order.address.phone).toMatch(/^\+58/);
      expect(order.totalDecimal).toBeTruthy();
      expect(order.lines.length).toBeGreaterThan(0);
    }
  });

  it("valida que las órdenes de Dropi contienen atributos de simulación e identificadores", () => {
    expect(RECONCILIATION_FIXTURES.dropiOrders.length).toBeGreaterThanOrEqual(6);
    for (const dOrder of RECONCILIATION_FIXTURES.dropiOrders) {
      expect(dOrder.id).toMatch(/^dropi_ve_/);
      expect(dOrder.simulated).toBe(true);
      expect(dOrder.currency).toBe("USD");
    }
  });

  it("incluye el escenario de orden sincronizada en tránsito (woo_1001 <-> dropi_ve_5001)", () => {
    const woo = RECONCILIATION_FIXTURES.wooOrders.find((o) => o.id === "woo_1001");
    const dropi = RECONCILIATION_FIXTURES.dropiOrders.find((d) => d.wooOrderId === "woo_1001");
    expect(woo).toBeDefined();
    expect(dropi).toBeDefined();
    expect(dropi?.trackingNumber).toBe("TRK-VE-001");
    expect(dropi?.mappedStatus).toBe("in_transit");
  });

  it("incluye el escenario de orden faltante en Dropi (woo_1003)", () => {
    const woo = RECONCILIATION_FIXTURES.wooOrders.find((o) => o.id === "woo_1003");
    const dropi = RECONCILIATION_FIXTURES.dropiOrders.find((d) => d.wooOrderId === "woo_1003");
    expect(woo).toBeDefined();
    expect(dropi).toBeUndefined();
  });

  it("incluye el escenario de orden huérfana faltante en WooCommerce (dropi_ve_5004)", () => {
    const dropi = RECONCILIATION_FIXTURES.dropiOrders.find((d) => d.id === "dropi_ve_5004");
    expect(dropi).toBeDefined();
    const woo = RECONCILIATION_FIXTURES.wooOrders.find((o) => o.id === dropi?.wooOrderId);
    expect(woo).toBeUndefined();
  });

  it("incluye el escenario de conflicto de estado cancelado en Woo vs tránsito en Dropi (woo_1005)", () => {
    const woo = RECONCILIATION_FIXTURES.wooOrders.find((o) => o.id === "woo_1005");
    const dropi = RECONCILIATION_FIXTURES.dropiOrders.find((d) => d.wooOrderId === "woo_1005");
    expect(woo?.id).toBe("woo_1005");
    expect(dropi?.mappedStatus).toBe("in_transit");
  });

  it("incluye el escenario de guía duplicada entre pedidos distintos (woo_1007 y woo_1008)", () => {
    const d1 = RECONCILIATION_FIXTURES.dropiOrders.find((d) => d.wooOrderId === "woo_1007");
    const d2 = RECONCILIATION_FIXTURES.dropiOrders.find((d) => d.wooOrderId === "woo_1008");
    expect(d1?.trackingNumber).toBe(d2?.trackingNumber);
    expect(d1?.trackingNumber).toBe("TRK-VE-DUP-999");
  });

  it("incluye simulaciones explícitas de errores de API 500 y 429 Rate Limit", () => {
    const errors = RECONCILIATION_FIXTURES.simulatedErrors;
    expect(errors?.woo_1009?.status).toBe(500);
    expect(errors?.woo_1010?.status).toBe(429);
    expect(errors?.woo_1010?.retryAfter).toBe(30);
  });

  it("incluye localidad remota sin cobertura en Dropi (woo_1011)", () => {
    const woo = RECONCILIATION_FIXTURES.wooOrders.find((o) => o.id === "woo_1011");
    const dropi = RECONCILIATION_FIXTURES.dropiOrders.find((d) => d.wooOrderId === "woo_1011");
    expect(woo?.address.city).toBe("San Fernando de Atabapo");
    expect(dropi?.placeId).toBeUndefined();
  });
});
