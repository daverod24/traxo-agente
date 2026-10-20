import {
  DEMO_BEAUTY_PRODUCTS,
  DEMO_BEAUTY_STORE,
  DEMO_CAFE_PRODUCTS,
  DEMO_CAFE_STORE,
  DEMO_PRODUCTS,
  DEMO_STORE,
  demoCustomers,
  demoHistory,
} from "@traxo/commerce";
import { type Customer, type Order, type Product, StoreSettingsSchema } from "@traxo/core";
import type { Db } from "./client.ts";

export type SeedResult = { storeId: string; products: number; customers: number; orders: number };

type StoreSeedSpec = {
  id: string;
  name: string;
  url: string;
  vertical: string;
  shipsWith: string;
  products: Product[];
  customers: Customer[];
  orders: Order[];
};

export async function seedSingleStore(db: Db, spec: StoreSeedSpec): Promise<SeedResult> {
  const { prisma } = db;
  const settings = StoreSettingsSchema.parse({
    autonomy: 1,
    preferredProvider: spec.shipsWith.includes("Dropi") ? "dropi" : "zoom",
  });

  await prisma.store.upsert({
    where: { id: spec.id },
    update: {},
    create: {
      id: spec.id,
      name: spec.name,
      platform: "mock",
      url: spec.url,
      settings,
      profile: { vertical: spec.vertical, shipsWith: spec.shipsWith, codShare: 0.6 },
    },
  });

  for (const p of spec.products) {
    await prisma.product.upsert({
      where: { id: `${spec.id}_${p.id}` },
      update: {},
      create: {
        id: `${spec.id}_${p.id}`,
        storeId: spec.id,
        externalId: p.externalId,
        title: p.title,
        price: p.price,
        cost: p.cost ?? null,
        weightGrams: p.weightGrams,
        imageUrl: p.imageUrl ?? null,
        description: p.description ?? null,
      },
    });
  }

  for (const c of spec.customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        storeId: spec.id,
        externalId: c.externalId ?? null,
        name: c.name,
        phone: c.phone,
        email: c.email ?? null,
        city: c.city ?? null,
        whatsappConsent: c.whatsappConsent,
      },
    });
  }

  for (const o of spec.orders) {
    await prisma.order.upsert({
      where: { storeId_externalId: { storeId: spec.id, externalId: o.externalId } },
      update: {},
      create: {
        id: `${spec.id}_${o.id}`,
        storeId: spec.id,
        externalId: o.externalId,
        number: o.number,
        address: o.address,
        lines: o.lines,
        subtotal: o.subtotal,
        shippingCharged: o.shippingCharged,
        total: o.total,
        payment: o.payment,
        utm: o.utm ?? undefined,
        status: "delivered",
        createdAt: new Date(o.createdAt),
      },
    });
  }

  return {
    storeId: spec.id,
    products: spec.products.length,
    customers: spec.customers.length,
    orders: spec.orders.length,
  };
}

/** Carga las tiendas demo venezolanas (Belleza & Bienestar + Café de Especialidad). */
export async function seedDemo(db: Db, opts?: { all?: boolean }): Promise<SeedResult> {
  if (opts?.all) {
    // 1. Tienda Demo 1: Davebeauty Sandbox VE
    await seedSingleStore(db, {
      id: DEMO_BEAUTY_STORE.id,
      name: DEMO_BEAUTY_STORE.name,
      url: DEMO_BEAUTY_STORE.url,
      vertical: DEMO_BEAUTY_STORE.vertical,
      shipsWith: "Flash Courier (Dropi VE)",
      products: DEMO_BEAUTY_PRODUCTS,
      customers: demoCustomers(DEMO_BEAUTY_STORE.id),
      orders: demoHistory(DEMO_BEAUTY_STORE.id),
    });

    // 2. Tienda Demo 2: Café de Especialidad VE
    await seedSingleStore(db, {
      id: DEMO_CAFE_STORE.id,
      name: DEMO_CAFE_STORE.name,
      url: DEMO_CAFE_STORE.url,
      vertical: DEMO_CAFE_STORE.vertical,
      shipsWith: "Grupo Zoom / MRW",
      products: DEMO_CAFE_PRODUCTS,
      customers: demoCustomers(DEMO_CAFE_STORE.id),
      orders: demoHistory(DEMO_CAFE_STORE.id),
    });
  }

  // 3. Tienda Demo Legacy (store_demo para tests y compatibilidad existente)
  return seedSingleStore(db, {
    id: DEMO_STORE.id,
    name: DEMO_STORE.name,
    url: DEMO_STORE.url,
    vertical: DEMO_STORE.vertical,
    shipsWith: "Flash Courier (Dropi VE)",
    products: DEMO_PRODUCTS,
    customers: demoCustomers(DEMO_STORE.id),
    orders: demoHistory(DEMO_STORE.id),
  });
}
