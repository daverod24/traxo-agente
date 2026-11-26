import { newId, type Order } from "@traxo/core";
import type { Db } from "./client.ts";

async function resolveCustomerId(db: Db, order: Order): Promise<string | null> {
  const { prisma } = db;
  if (!order.address.phone) return null;
  const found = await prisma.customer.findFirst({
    where: { storeId: order.storeId, phone: order.address.phone },
  });
  if (found) return found.id;
  const customerId = newId("cust");
  await prisma.customer.create({
    data: {
      id: customerId,
      storeId: order.storeId,
      name: order.address.name,
      phone: order.address.phone,
      email: order.email ?? null,
      city: order.address.city,
    },
  });
  return customerId;
}

const validDateOrUndefined = (iso?: string): Date | undefined => {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** Guarda el pedido y su cliente. Idempotente: el mismo (tienda, externalId) no se duplica. */
export async function saveOrder(db: Db, order: Order): Promise<{ order: Order; created: boolean }> {
  const { prisma } = db;
  const existing = await prisma.order.findUnique({
    where: { storeId_externalId: { storeId: order.storeId, externalId: order.externalId } },
  });
  if (existing) {
    orderStoreIndex.set(existing.id, order.storeId);
    const nextCustomerId = existing.customerId ?? (await resolveCustomerId(db, order));
    const existingMeta = (existing.meta as Record<string, unknown> | null) ?? {};
    const mergedMeta = order.meta
      ? { ...existingMeta, ...order.meta }
      : Object.keys(existingMeta).length > 0
        ? existingMeta
        : undefined;
    const manualTestOverride = existingMeta._manual_test_flag === true;
    const nextIsTest = manualTestOverride ? existing.isTest : (order.isTest ?? existing.isTest);
    const nextAnomalyReason = manualTestOverride
      ? (existing.anomalyReason ?? null)
      : (order.anomalyReason ?? null);
    const parsedCreatedAt = validDateOrUndefined(order.createdAt);

    await prisma.order.update({
      where: { id: existing.id },
      data: {
        customerId: nextCustomerId,
        status: order.status ?? existing.status,
        rawStatus: order.rawStatus ?? existing.rawStatus,
        total: order.total,
        totalExact: order.totalExact ?? order.total,
        subtotal: order.subtotal,
        subtotalExact: order.subtotalExact ?? order.subtotal,
        shippingCharged: order.shippingCharged,
        shippingChargedExact: order.shippingChargedExact ?? order.shippingCharged,
        currency: order.currency ?? existing.currency,
        email: order.email ?? existing.email,
        address: order.address as object,
        lines: order.lines as object[],
        payment: order.payment,
        origin: order.origin ?? existing.origin,
        isTest: nextIsTest,
        anomalyReason: nextAnomalyReason,
        meta: mergedMeta as object | undefined,
        ...(parsedCreatedAt ? { createdAt: parsedCreatedAt } : {}),
      },
    });
    return {
      order: {
        ...order,
        id: existing.id,
        customerId: nextCustomerId ?? undefined,
        status: order.status ?? existing.status,
        isTest: nextIsTest,
        anomalyReason: nextAnomalyReason ?? undefined,
      },
      created: false,
    };
  }

  const customerId = await resolveCustomerId(db, order);
  let anomalyReason = order.anomalyReason;
  const orderTotalExact = order.totalExact ?? order.total;
  if (order.address.phone && order.status !== "cancelled") {
    const recentSimilar = await prisma.order.findMany({
      where: {
        storeId: order.storeId,
        externalId: { not: order.externalId },
        status: { not: "cancelled" },
        createdAt: { gte: new Date(Date.now() - 30 * 60_000) },
      },
      select: { number: true, address: true, total: true, totalExact: true },
      take: 25,
    });
    const dup = recentSimilar.find((r) => {
      const addr = r.address as { phone?: string } | null;
      const rTotal = r.totalExact ?? r.total;
      return addr?.phone === order.address.phone && Math.abs(rTotal - orderTotalExact) < 0.01;
    });
    if (dup) {
      const dupNote = `Posible duplicado de ${dup.number}`;
      anomalyReason = anomalyReason ? `${anomalyReason} · ${dupNote}` : dupNote;
    }
  }

  const parsedCreatedAt = validDateOrUndefined(order.createdAt) ?? new Date();
  await prisma.order.create({
    data: {
      id: order.id,
      storeId: order.storeId,
      customerId,
      externalId: order.externalId,
      number: order.number,
      currency: order.currency ?? "USD",
      email: order.email ?? null,
      address: order.address as object,
      lines: order.lines as object[],
      subtotal: order.subtotal,
      subtotalExact: order.subtotalExact ?? order.subtotal,
      shippingCharged: order.shippingCharged,
      shippingChargedExact: order.shippingChargedExact ?? order.shippingCharged,
      total: order.total,
      totalExact: orderTotalExact,
      payment: order.payment,
      utm: order.utm ?? undefined,
      status: order.status || "pending",
      rawStatus: order.rawStatus ?? null,
      origin: order.origin ?? null,
      isTest: order.isTest ?? false,
      anomalyReason: anomalyReason ?? null,
      meta: (order.meta as object | undefined) ?? undefined,
      createdAt: parsedCreatedAt,
    },
  });
  orderStoreIndex.set(order.id, order.storeId);
  return {
    order: {
      ...order,
      customerId: customerId ?? undefined,
      anomalyReason,
    },
    created: true,
  };
}

/** Devuelve true la primera vez que ve el evento y false si ya lo había recibido (webhooks llegan 2+ veces). */
export async function claimWebhookEvent(db: Db, source: string, eventId: string): Promise<boolean> {
  try {
    await db.prisma.webhookEvent.create({ data: { id: newId("wh"), source, eventId } });
    return true;
  } catch {
    return false;
  }
}

/** Índice pedido → tienda, para que los eventos del agente lleguen solo a la cuenta correcta. */
export const orderStoreIndex = new Map<string, string>();

export async function loadOrderStoreIndex(db: Db): Promise<void> {
  const rows = await db.prisma.order.findMany({ select: { id: true, storeId: true } });
  for (const r of rows) orderStoreIndex.set(r.id, r.storeId);
}
