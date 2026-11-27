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

  it("POST /api/products/stock-sync actualiza DB + WooCommerce (producto y variaciones) y falla limpio sin DROPI_API_KEY", async () => {
    const wooCalls: Array<{ url: string; method?: string; body?: any }> = [];
    const mockFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      wooCalls.push({
        url: String(url),
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return { ok: true, json: async () => ({}) } as Response;
    });

    const woo = new WooCommerce({
      storeId: "store_demo_beauty",
      url: "https://apiv2backecom.daverod.tech",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "whsec_test",
      fetch: mockFetch as any,
    });

    const store = await db.prisma.store.findUnique({ where: { id: "store_demo_beauty" } });
    const prevProfile = (store?.profile as Record<string, unknown> | null) ?? {};
    await db.prisma.store.update({
      where: { id: "store_demo_beauty" },
      data: {
        profile: {
          ...prevProfile,
          catalogMeta: {
            "55": {
              dropiId: "196",
              variations: [
                { id: 5501, sku: "DB-SKIN-NECK-LIFT-1", name: "Individual (1x)" },
                { id: 5502, sku: "DB-SKIN-NECK-LIFT-2", name: "Dúo (2x)" },
                { id: 5503, sku: "DB-SKIN-NECK-LIFT-3", name: "Trío (3x)" },
              ],
            },
          },
        },
      },
    });

    const rt: any = {
      db,
      bus: new EventBus(),
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

    // 1. Con physicalStock explícito
    const res = await app.request("/api/products/stock-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-traxo-store-id": "store_demo_beauty",
      },
      body: JSON.stringify({
        productId: "55",
        dropiId: "196",
        physicalStock: 7,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.physicalStock).toBe(7);
    expect(body.stockStatus).toBe("instock");
    expect(body.packs["1"].stockQuantity).toBe(7);
    expect(body.packs["2"].stockQuantity).toBe(3);
    expect(body.packs["3"].stockQuantity).toBe(2);
    expect(body.wooSynced).toBe(true);
    expect(body.variationsSynced).toBe(3);

    expect(wooCalls).toHaveLength(4);
    expect(wooCalls[0].url).toContain("/wp-json/wc/v3/products/55");
    expect(wooCalls[0].body).toEqual({
      manage_stock: true,
      stock_quantity: 7,
      stock_status: "instock",
    });
    expect(wooCalls[2].url).toContain("/wp-json/wc/v3/products/55/variations/5502");
    expect(wooCalls[2].body.stock_quantity).toBe(3);

    const dbProd = await db.prisma.product.findFirst({
      where: { storeId: "store_demo_beauty", externalId: "55" },
    });
    expect(dbProd?.manageStock).toBe(true);
    expect(dbProd?.stockQuantity).toBe(7);
    expect(dbProd?.stockStatus).toBe("instock");
    expect(dbProd?.dropiProductId).toBe("196");

    // 2. Sin physicalStock y sin DROPI_API_KEY
    const resNoKey = await app.request("/api/products/stock-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-traxo-store-id": "store_demo_beauty",
      },
      body: JSON.stringify({ productId: "55" }),
    });
    expect(resNoKey.status).toBe(400);
    const noKeyBody = await resNoKey.json();
    expect(noKeyBody).toEqual({
      ok: false,
      configured: false,
      reason: "DROPI_API_KEY not configured",
    });
  });
});
