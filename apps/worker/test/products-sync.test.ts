import { WooCommerce } from "@traxo/commerce";
import { EventBus } from "@traxo/core";
import { type Db, openDb, seedDemo } from "@traxo/db";
import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { registerApi } from "../src/api.ts";
import { createApp } from "../src/app.ts";

describe("Catálogo Headless: Sincronización WooCommerce HPOS y Traxo Agente", () => {
  let db: Db;

  beforeAll(async () => {
    db = await openDb({ dataDir: "memory://" });
    await seedDemo(db, { all: true });
  });

  afterAll(async () => db.close());

  it("POST /api/products/sync sincroniza el catálogo e importa productos ganadores", async () => {
    const mockProducts = [
      {
        id: 45,
        name: "Nicotinamide Riboside + Resveratrol 900 mg (NAD+ Booster)",
        price: "29.99",
        regular_price: "",
        type: "variable",
        sku: "DB-WELL-NAD-60",
        images: [{ src: "https://apiv2backecom.daverod.tech/uploads/nad.webp" }],
        short_description: "NAD+ Booster",
        meta_data: [
          { key: "_dropi_product_id", value: "93" },
          { key: "_rate_type", value: "bcv" },
          { key: "_supplier_cost", value: "10.73" },
        ],
      },
      {
        id: 50,
        name: "Medicube Crema Cápsula Salmón ADN PDRN",
        price: "26.99",
        regular_price: "",
        type: "variable",
        sku: "DB-SKIN-MEDICUBE-PDRN",
        images: [{ src: "https://apiv2backecom.daverod.tech/uploads/medicube.webp" }],
        meta_data: [
          { key: "_dropi_product_id", value: "167" },
          { key: "_rate_type", value: "bcv" },
          { key: "_supplier_cost", value: "7.75" },
        ],
      },
      {
        id: 55,
        name: "Crema Reafirmante Lifting para Cuello y Escote",
        price: "22.99",
        regular_price: "",
        type: "variable",
        sku: "DB-SKIN-NECK-LIFT",
        images: [{ src: "https://apiv2backecom.daverod.tech/uploads/neck.jpg" }],
        meta_data: [
          { key: "_dropi_product_id", value: "196" },
          { key: "_rate_type", value: "bcv" },
          { key: "_supplier_cost", value: "4.77" },
        ],
      },
    ];

    const mockFetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/products?")) {
        return { ok: true, json: async () => mockProducts } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    });

    const woo = new WooCommerce({
      storeId: "store_demo_beauty",
      url: "https://apiv2backecom.daverod.tech",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "whsec_test",
      fetch: mockFetch as any,
    });

    const bus = new EventBus();
    const rt: any = {
      db,
      bus,
      commerce: woo,
      commerceMap: { store_demo_beauty: woo },
      storeId: "store_demo_beauty",
      storeName: "Davebeauty Demo",
      carriers: [],
      mocks: [],
      messaging: undefined,
      connections: [],
    };

    const app = new Hono();
    registerApi(app, rt);

    const res = await app.request("/api/products/sync", {
      method: "POST",
      headers: { "x-traxo-store-id": "store_demo_beauty" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(3);

    // Verificar en GET /api/products que los productos 45, 50, 55 vienen enriquecidos
    const listRes = await app.request("/api/products", {
      headers: { "x-traxo-store-id": "store_demo_beauty" },
    });
    expect(listRes.status).toBe(200);
    const products = await listRes.json();
    const p45 = products.find((p: any) => p.externalId === "45");
    const p50 = products.find((p: any) => p.externalId === "50");
    const p55 = products.find((p: any) => p.externalId === "55");

    expect(p45).toBeDefined();
    expect(p45.sku).toBe("DB-WELL-NAD-60");
    expect(p45.dropiId).toBe("93");
    expect(p45.packs?.duo).toBe(52);
    expect(p45.packs?.trio).toBe(70);

    expect(p50).toBeDefined();
    expect(p50.sku).toBe("DB-SKIN-MEDICUBE-PDRN");
    expect(p50.dropiId).toBe("167");

    expect(p55).toBeDefined();
    expect(p55.sku).toBe("DB-SKIN-NECK-LIFT");
    expect(p55.dropiId).toBe("196");
  });

  it("webhook de producto en tiempo real sincroniza altas y actualizaciones", async () => {
    const bus = new EventBus();
    const events: string[] = [];
    bus.subscribe((e) => events.push(e.kind));

    const woo = new WooCommerce({
      storeId: "store_demo_beauty",
      url: "https://apiv2backecom.daverod.tech",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "whsec_test",
    });

    const app = createApp({
      db,
      bus,
      commerce: {
        woocommerce: woo,
      },
    });

    // Simular webhook de producto actualizado con firma válida
    const { hmac } = await import("@traxo/commerce");
    const rawPayload = JSON.stringify({
      id: 55,
      name: "Crema Reafirmante Lifting para Cuello y Escote - Edición Especial",
      price: "24.99",
      sku: "DB-SKIN-NECK-LIFT",
      meta_data: [{ key: "_dropi_product_id", value: "196" }],
    });
    const sig = hmac("whsec_test", rawPayload, "base64");

    const res = await app.request("/webhooks/commerce/woocommerce", {
      method: "POST",
      body: rawPayload,
      headers: {
        "x-wc-webhook-signature": sig,
        "x-wc-webhook-topic": "product.updated",
        "x-wc-webhook-delivery-id": "del_12345",
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(["created", "updated"]).toContain(body.action);
    expect(events).toContain("product.synced");

    const updatedInDb = await db.prisma.product.findFirst({
      where: { storeId: "store_demo_beauty", externalId: "55" },
    });
    expect(updatedInDb?.title).toBe(
      "Crema Reafirmante Lifting para Cuello y Escote - Edición Especial",
    );
  });
});
