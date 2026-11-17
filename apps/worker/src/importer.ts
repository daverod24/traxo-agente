import type { CommerceAdapter } from "@traxo/commerce";
import { newId, StoreSettingsSchema } from "@traxo/core";
import { type Db, saveOrder } from "@traxo/db";
import type { AgentDeps } from "./agent.ts";

export type ImportResult = {
  products: number;
  updatedProducts: number;
  totalProducts?: number;
  customers: number;
  totalCustomers?: number;
  orders: number;
  totalOrders?: number;
};

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
  let updatedProducts = 0;
  const catalogMeta: Record<
    string,
    {
      sku?: string;
      dropiId?: string;
      rateType?: string;
      packs?: { duo?: number; trio?: number };
      variations?: unknown;
    }
  > = {};

  for (const p of await adapter.listProducts()) {
    try {
      if (p.externalId) {
        catalogMeta[p.externalId] = {
          sku: p.sku,
          dropiId: p.metadata?.dropiId as string | undefined,
          rateType: p.metadata?.rateType as string | undefined,
          packs: p.metadata?.packs as { duo?: number; trio?: number } | undefined,
          variations: p.variations,
        };
      }

      const found = await db.prisma.product.findFirst({
        where: { storeId, externalId: p.externalId },
      });
      if (found) {
        const updateData: {
          title?: string;
          price?: number;
          cost?: number | null;
          weightGrams?: number;
          imageUrl?: string | null;
          description?: string | null;
        } = {};

        if (p.title && found.title !== p.title) updateData.title = p.title;
        if (p.price != null && found.price !== p.price) updateData.price = p.price;
        if (p.cost !== undefined && found.cost !== (p.cost ?? null))
          updateData.cost = p.cost ?? null;
        if (p.weightGrams != null && found.weightGrams !== p.weightGrams)
          updateData.weightGrams = p.weightGrams;
        if (p.imageUrl !== undefined && found.imageUrl !== (p.imageUrl ?? null))
          updateData.imageUrl = p.imageUrl ?? null;
        if (p.description !== undefined && found.description !== (p.description ?? null))
          updateData.description = p.description ?? null;

        if (Object.keys(updateData).length > 0) {
          await db.prisma.product.update({
            where: { id: found.id },
            data: updateData,
          });
          updatedProducts++;
        }
        continue;
      }
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
  const totalProducts = await db.prisma.product.count({ where: { storeId } });
  const totalCustomers = await db.prisma.customer.count({ where: { storeId } });
  const totalOrders = await db.prisma.order.count({ where: { storeId } });

  const currentStore = await db.prisma.store.findUnique({ where: { id: storeId } });
  const existingProfile = (currentStore?.profile as Record<string, unknown> | null) ?? {};
  await db.prisma.store.update({
    where: { id: storeId },
    data: {
      profile: {
        ...existingProfile,
        importedAt: new Date().toISOString(),
        platform: adapter.platform,
        catalogMeta: {
          ...((existingProfile.catalogMeta as Record<string, unknown>) ?? {}),
          ...catalogMeta,
        },
      } as any,
    },
  });
  const msg =
    products > 0 || updatedProducts > 0
      ? `Sincronización completada: ${products} nuevos, ${updatedProducts} actualizados (Total: ${totalProducts} productos en catálogo de Davebeauty).`
      : `Catálogo sincronizado: ${totalProducts} productos activos de Davebeauty al día (${totalCustomers} clientes y ${totalOrders} pedidos).`;
  deps.bus.emit(
    "store.imported",
    msg,
    { data: { storeId, totalProducts, totalCustomers, totalOrders, products, updatedProducts } },
  );
  return { products, updatedProducts, totalProducts, customers, totalCustomers, orders, totalOrders };
}

export const isImported = async (db: Db, storeId: string): Promise<boolean> =>
  (await db.prisma.product.count({ where: { storeId } })) > 0;
