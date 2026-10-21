import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Db, openDb, saveOrder } from "@traxo/db";
import { buildDemoOrder, MockCommerce } from "@traxo/commerce";
import { createRuntime, type Runtime } from "../src/runtime.ts";
import { approve, reject } from "../src/approvals.ts";
import { createApp } from "../src/app.ts";

let db: Db;
let rt: Runtime;

beforeEach(async () => {
  db = await openDb({ dataDir: "memory://" });
  rt = await createRuntime({}, { db });
});

afterEach(async () => db?.close());

describe("conciliación de pagos en Venezuela (Pago Móvil, Zelle, USDT) y actualización en WooCommerce", () => {
  it("al aprobar una conciliación de Pago Móvil, actualiza el pedido a prepago, notifica por WhatsApp y cambia el estado en WooCommerce", async () => {
    process.env.MARKET = "VE";
    process.env.TRAXO_CURRENCY = "USD";
    process.env.TRAXO_BCV_RATE = "880.00";

    // 1. Crear pedido demo venezolano
    const o = buildDemoOrder({
      storeId: rt.storeId,
      dane: "VE-A",
      payment: "cod",
      total: 55,
    });
    const mockCommerce = rt.commerce as MockCommerce;
    mockCommerce.receive(o);
    const { order } = await saveOrder(db, o);

    // 2. Registrar solicitud de conciliación de Pago Móvil
    const approval = await db.prisma.approval.create({
      data: {
        id: "apr_test_pm_1",
        storeId: order.storeId,
        orderId: order.id,
        kind: "payment_reconciliation",
        title: `Conciliar Pago Móvil: ${order.number}`,
        detail: `Cliente reportó Pago Móvil por $ 55.00 (Bs. 2.664,75 BCV) ref 123456`,
        payload: {
          orderId: order.id,
          method: "pago_movil",
          reference: "123456",
          amount: 55,
          senderBank: "Banesco",
          senderPhone: "+584121234567",
        },
        status: "pending",
      },
    });

    // 3. Aprobar la conciliación
    const res = await approve(rt, approval.id);
    expect(res.ok).toBe(true);
    expect(res.message).toContain("conciliado");

    // 4. Verificar que el pedido en Traxo se actualizó a prepagado y confirmado/enviado
    const updated = await db.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updated.payment).toBe("prepaid");
    expect(["confirmed", "shipped"]).toContain(updated.status);

    // 5. Verificar que el estado del pedido en la tienda (WooCommerce / Mock) se actualizó a 'processing'
    const inStore = await mockCommerce.getOrder(order.externalId ?? order.id);
    expect(inStore?.status).toBe("processing");

    // 6. Verificar que la aprobación quedó como 'approved'
    const aprUpdated = await db.prisma.approval.findUniqueOrThrow({ where: { id: approval.id } });
    expect(aprUpdated.status).toBe("approved");

    // 7. Verificar que se envió el mensaje de confirmación de pago
    const msgs = await db.prisma.message.findMany({
      where: { conversation: { storeId: order.storeId } },
    });
    expect(msgs.length).toBeGreaterThan(0);
    const pagoMsg = msgs.find((m) => m.template === "pago_conciliado");
    expect(pagoMsg).toBeDefined();
    expect(pagoMsg?.text).toContain("123456");

    delete process.env.MARKET;
    delete process.env.TRAXO_CURRENCY;
  });

  it("al rechazar un comprobante de pago, marca la aprobación como rechazada y avisa al cliente", async () => {
    const o = buildDemoOrder({
      storeId: rt.storeId,
      dane: "VE-A",
      payment: "cod",
      total: 34,
    });
    const { order } = await saveOrder(db, o);

    const approval = await db.prisma.approval.create({
      data: {
        id: "apr_test_pm_2",
        storeId: order.storeId,
        orderId: order.id,
        kind: "payment_reconciliation",
        title: `Conciliar Zelle: ${order.number}`,
        detail: `Comprobante dudoso`,
        payload: {
          orderId: order.id,
          method: "zelle",
          reference: "000000",
        },
        status: "pending",
      },
    });

    const res = await reject(rt, approval.id);
    expect(res.ok).toBe(true);

    const aprUpdated = await db.prisma.approval.findUniqueOrThrow({ where: { id: approval.id } });
    expect(aprUpdated.status).toBe("rejected");
  });
});
