import { DEMO_BEAUTY_STORE, DEMO_STORE, demoHistory } from "@traxo/commerce";
import type { Db } from "@traxo/db";

/**
 * Limpia y normaliza los pedidos de la tienda para mantener estrictamente los 5 pedidos
 * realistas solicitados por el usuario:
 * 1. #82 Carlos Pérez (Caracas Baruta, $43.00, Por confirmar COD)
 * 2. #81 Ana Martínez (Caracas Sucre, $43.00, Por confirmar COD)
 * 3. #80 María Rodríguez (Caracas Chacao, $65.00, Por confirmar COD)
 * 4. #79 Andrés Gómez (Caracas Baruta, $48.00, Entregado, cobrado COD)
 * 5. #74 QA Dropi Test (Caracas Chacao, $27.00, Cancelado / Rollback)
 */
export async function cleanDummyOrders(db: Db, storeId: string) {
  const allowedNumbers = ["#82", "#81", "#80", "#79", "#74", "82", "81", "80", "79", "74"];
  const allowedExternals = [
    "ext_demo_82",
    "ext_demo_81",
    "ext_demo_80",
    "ext_demo_79",
    "ext_demo_74",
  ];

  // 1. Encontrar órdenes que NO son parte de las 5 canónicas
  const extraneous = await db.prisma.order.findMany({
    where: {
      storeId,
      NOT: {
        OR: [
          { number: { in: allowedNumbers } },
          { externalId: { in: allowedExternals } },
        ],
      },
    },
    select: { id: true },
  });

  if (extraneous.length > 0) {
    const extIds = extraneous.map((o) => o.id);

    // Eliminar cotizaciones asociadas
    await db.prisma.carrierQuote.deleteMany({
      where: { orderId: { in: extIds } },
    });

    // Eliminar tracking events y shipments asociados
    const shipments = await db.prisma.shipment.findMany({
      where: { orderId: { in: extIds } },
      select: { id: true },
    });
    if (shipments.length > 0) {
      const shipIds = shipments.map((s) => s.id);
      await db.prisma.trackingEventRow.deleteMany({
        where: { shipmentId: { in: shipIds } },
      });
      await db.prisma.shipment.deleteMany({
        where: { id: { in: shipIds } },
      });
    }

    // Eliminar approvals vinculados a esas órdenes
    await db.prisma.approval.deleteMany({
      where: { orderId: { in: extIds } },
    });

    // Eliminar órdenes extra
    await db.prisma.order.deleteMany({
      where: { id: { in: extIds } },
    });
  }

  // 2. Asegurar que las 5 órdenes canónicas existan
  const canonicalOrders = demoHistory(storeId === DEMO_STORE.id ? DEMO_BEAUTY_STORE.id : storeId);
  for (const o of canonicalOrders) {
    const orderId = storeId === DEMO_STORE.id ? o.id : `${storeId}_${o.id}`;
    await db.prisma.order.upsert({
      where: { storeId_externalId: { storeId, externalId: o.externalId } },
      update: {
        number: o.number,
        address: o.address,
        lines: o.lines,
        subtotal: o.subtotal,
        shippingCharged: o.shippingCharged,
        total: o.total,
        payment: o.payment,
        status: o.status ?? "pending",
        utm: o.utm ?? undefined,
      },
      create: {
        id: orderId,
        storeId,
        externalId: o.externalId,
        number: o.number,
        address: o.address,
        lines: o.lines,
        subtotal: o.subtotal,
        shippingCharged: o.shippingCharged,
        total: o.total,
        payment: o.payment,
        utm: o.utm ?? undefined,
        status: o.status ?? "pending",
        createdAt: new Date(o.createdAt),
      },
    });
  }

  const remaining = await db.prisma.order.count({ where: { storeId } });
  return {
    ok: true,
    remaining,
    message: `Pedidos ficticios saneados: exactamente ${remaining} pedidos en base de datos.`,
  };
}
