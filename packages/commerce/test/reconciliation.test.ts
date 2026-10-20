import { DropiOrderSchema, OrderSchema, ReconciliationReportSchema } from "@traxo/core";
import { RECONCILIATION_FIXTURES } from "@traxo/market-ve";
import { describe, expect, it } from "vitest";
import { DropiReadOnlyClient } from "../src/dropi-reader.ts";
import { reconcileOrders } from "../src/reconciliation.ts";

describe("L3-A2: Dropi Read-Only Client (0 Escrituras)", () => {
  const client = new DropiReadOnlyClient({
    tenantId: "tenant_davebeauty_ve",
    simulated: true,
    simulatedOrders: RECONCILIATION_FIXTURES.dropiOrders as any,
  });

  it("garantiza modo de solo lectura", () => {
    expect(client.isReadOnly).toBe(true);
    expect(() => client.createOrder()).toThrow(/FAIL-CLOSED.*solo lectura/);
    expect(() => client.generateGuide()).toThrow(/FAIL-CLOSED.*solo lectura/);
  });

  it("lista y recupera pedidos sin mutar ningún dato", async () => {
    const orders = await client.listOrders();
    expect(orders.length).toBeGreaterThanOrEqual(6);

    const single = await client.getOrder("dropi_ve_5001");
    expect(single).toBeDefined();
    expect(single?.trackingNumber).toBe("TRK-VE-001");
  });

  it("verifica cobertura de forma fidedigna y fail-closed para zonas remotas", async () => {
    const caracas = await client.checkCoverage("VE-A", "Caracas");
    expect(caracas.hasCoverage).toBe(true);
    expect(caracas.placeId).toBeTruthy();

    const remota = await client.checkCoverage("VE-Y", "San Fernando de Atabapo");
    expect(remota.hasCoverage).toBe(false);
    expect(remota.placeId).toBeUndefined();
  });
});

describe("L3-A2: Motor de Conciliación de Órdenes (Gate G3)", () => {
  const tenantId = "tenant_davebeauty_ve";
  const storeId = "davebeauty_staging";

  it("concilia suite completa de 10 fixtures y genera reporte conforme a ReconciliationReportSchema", () => {
    const report = reconcileOrders({
      tenantId,
      storeId,
      wooOrders: RECONCILIATION_FIXTURES.wooOrders as any,
      dropiOrders: RECONCILIATION_FIXTURES.dropiOrders as any,
      simulatedErrors: RECONCILIATION_FIXTURES.simulatedErrors,
    });

    // Validar esquema Zod oficial de reporte
    const parsed = ReconciliationReportSchema.safeParse(report);
    expect(parsed.success).toBe(true);

    expect(report.source).toBe("reconciliation_engine");
    expect(report.tenantId).toBe(tenantId);
    expect(report.totalAudited).toBeGreaterThanOrEqual(10);

    // Escenario 1 & 2: Sincronizados
    const syncedItems = report.items.filter((i) => i.discrepancyType === "synced");
    expect(syncedItems.length).toBe(2);
    expect(syncedItems.map((s) => s.wooOrderId)).toContain("woo_1001");
    expect(syncedItems.map((s) => s.wooOrderId)).toContain("woo_1002");

    // Escenario 3: Faltante en Dropi
    const missingDropi = report.items.find((i) => i.wooOrderId === "woo_1003");
    expect(missingDropi?.discrepancyType).toBe("missing_in_dropi");
    expect(missingDropi?.requiresManualReview).toBe(true);

    // Escenario 4: Faltante en WooCommerce (huérfano en Dropi)
    const missingWoo = report.items.find((i) => i.dropiOrderId === "dropi_ve_5004");
    expect(missingWoo?.discrepancyType).toBe("missing_in_woo");
    expect(missingWoo?.requiresManualReview).toBe(true);

    // Escenario 5: Conflicto cancelado en Woo vs tránsito en Dropi
    const conflictCancelled = report.items.find((i) => i.wooOrderId === "woo_1005");
    expect(conflictCancelled?.discrepancyType).toBe("status_mismatch");
    expect(conflictCancelled?.severity).toBe("critical");
    expect(conflictCancelled?.requiresManualReview).toBe(true);

    // Escenario 6: Conflicto entregado en Dropi vs pendiente en Woo
    const conflictDelivered = report.items.find((i) => i.wooOrderId === "woo_1006");
    expect(conflictDelivered?.discrepancyType).toBe("status_mismatch");
    expect(conflictDelivered?.severity).toBe("warning");
    expect(conflictDelivered?.requiresManualReview).toBe(true);

    // Escenario 7: Guía duplicada
    const dupes = report.items.filter((i) => i.discrepancyType === "duplicate_tracking");
    expect(dupes.length).toBe(2);
    expect(dupes[0].trackingNumber).toBe("TRK-VE-DUP-999");
    expect(dupes[0].severity).toBe("critical");

    // Escenario 8: Error 500 de API
    const err500 = report.items.find((i) => i.wooOrderId === "woo_1009");
    expect(err500?.discrepancyType).toBe("api_error");
    expect(err500?.severity).toBe("critical");

    // Escenario 9: Rate limit 429
    const err429 = report.items.find((i) => i.wooOrderId === "woo_1010");
    expect(err429?.discrepancyType).toBe("rate_limited");
    expect(err429?.requiresManualReview).toBe(false);

    // Escenario 10: Localidad sin cobertura
    const unmapped = report.items.find((i) => i.wooOrderId === "woo_1011");
    expect(unmapped?.discrepancyType).toBe("unmapped_locality");
    expect(unmapped?.requiresManualReview).toBe(true);
  });

  it("bloquea y aborta conciliación ante intrusión o contaminación cross-tenant", () => {
    const foreignOrders = [
      ...RECONCILIATION_FIXTURES.wooOrders.slice(0, 1),
      {
        ...RECONCILIATION_FIXTURES.wooOrders[0],
        id: "woo_hack_999",
        tenantId: "tenant_malicioso_externo",
      },
    ];

    expect(() =>
      reconcileOrders({
        tenantId,
        storeId,
        wooOrders: foreignOrders as any,
        dropiOrders: [],
      }),
    ).toThrow(/Violación de tenant/);
  });
});
