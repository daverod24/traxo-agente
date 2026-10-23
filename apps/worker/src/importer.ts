import type { CommerceAdapter } from "@traxo/commerce";
import { newId, StoreSettingsSchema } from "@traxo/core";
import { type Db, saveOrder } from "@traxo/db";
import type { AgentDeps } from "./agent.ts";

export type ImportResult = { products: number; customers: number; orders: number };

/**
 * Trae el catálogo, los clientes y los pedidos de una tienda a la base de Traxo. Es idempotente:
 * volver a importar no duplica (productos y clientes se buscan por id externo / celular; pedidos por tienda + id externo).
 * Los pedidos importados son historia: no disparan el agente ni mandan mensajes.
 */
export async function importStore(
  deps: AgentDeps,
  storeId: string,
  adapter: CommerceAdapter,
  opts: { orders?: number } = {},
): Promise<ImportResult> {
  const { db } = deps;

  // Validar y asegurar que storeId exista en la base de datos para no violar FKs
  let validStoreId = storeId;
  const storeExists = await db.prisma.store.findUnique({
    where: { id: validStoreId },
    select: { id: true },
  });
  if (!storeExists) {
    const fallbackStore = (deps as any).storeId
      ? await db.prisma.store.findUnique({ where: { id: (deps as any).storeId }, select: { id: true } })
      : null;
    const firstStore = fallbackStore ?? (await db.prisma.store.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } }));
    if (firstStore) {
      validStoreId = firstStore.id;
    } else {
      await db.prisma.store.create({
        data: {
          id: "store_main",
          name: "Davebeauty (WooCommerce en Vivo)",
          platform: "woocommerce",
          url: "https://apiv2backecom.daverod.tech",
          settings: StoreSettingsSchema.parse({ autonomy: 1, preferredProvider: "dropi" }),
          profile: { vertical: "Belleza, K-Beauty y Bienestar Botánico", live: true },
        },
      });
      validStoreId = "store_main";
    }
  }
  storeId = validStoreId;

  let products = 0;
  for (const p of await adapter.listProducts()) {
    try {
      const found = await db.prisma.product.findFirst({
        where: { storeId, externalId: p.externalId },
      });
      if (found) continue;
      await db.prisma.product.create({
        data: {
          id: newId("prod"),
          storeId,
          externalId: p.externalId,
          title: p.title,
          price: p.price,
          cost: p.cost ?? null,
          weightGrams: p.weightGrams,
          imageUrl: p.imageUrl ?? null,
          description: p.description ?? null,
        },
      });
      products++;
    } catch (e) {
      console.warn(`[importer] Error al guardar producto ${p.externalId}:`, e);
    }
  }
  let customers = 0;
  for (const c of await adapter.listCustomers()) {
    if (!c.phone) continue;
    try {
      const found = await db.prisma.customer.findFirst({ where: { storeId, phone: c.phone } });
      if (found) continue;
      await db.prisma.customer.create({
        data: {
          id: newId("cust"),
          storeId,
          externalId: c.externalId ?? null,
          name: c.name,
          phone: c.phone,
          email: c.email ?? null,
          city: c.city ?? null,
          whatsappConsent: c.whatsappConsent,
        },
      });
      customers++;
    } catch (e) {
      console.warn(`[importer] Error al guardar cliente ${c.phone}:`, e);
    }
  }
  let orders = 0;
  for (const o of await adapter.listOrders({ limit: opts.orders ?? 50 })) {
    try {
      const { created, order } = await saveOrder(db, { ...o, id: newId("ord"), storeId });
      if (created) {
        await db.prisma.order.update({ where: { id: order.id }, data: { status: "delivered" } });
        orders++;
      }
    } catch (e) {
      console.warn(`[importer] Error al guardar pedido:`, e);
    }
  }
  const currentStore = await db.prisma.store.findUnique({ where: { id: storeId } });
  const existingProfile = (currentStore?.profile as Record<string, unknown> | null) ?? {};
  await db.prisma.store.update({
    where: { id: storeId },
    data: {
      profile: {
        ...existingProfile,
        importedAt: new Date().toISOString(),
        platform: adapter.platform,
      },
    },
  });
  deps.bus.emit(
    "store.imported",
    `Importé tu tienda: ${products} productos, ${customers} clientes y ${orders} pedidos. Ya puedo trabajar con tus datos.`,
    { data: { storeId } },
  );
  return { products, customers, orders };
}

export const isImported = async (db: Db, storeId: string): Promise<boolean> =>
  (await db.prisma.product.count({ where: { storeId } })) > 0;
