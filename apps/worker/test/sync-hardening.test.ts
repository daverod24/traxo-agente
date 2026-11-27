import { hmac, WooCommerce } from "@traxo/commerce";
import { EventBus } from "@traxo/core";
import { type Db, openDb, seedDemo } from "@traxo/db";
import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { protectApi, registerApi } from "../src/api.ts";
import { createApp } from "../src/app.ts";
import { importStore } from "../src/importer.ts";

describe("WooCommerce <-> TraxoAgente Sync Hardening", () => {
  let db: Db;

  beforeAll(async () => {
    db = await openDb({ dataDir: "memory://" });
    await seedDemo(db, { all: true });
  });

  afterAll(async () => db.close());

  it("importStore es estrictamente idempotente: re-sincronizar no duplica pedidos, preserva estado shipped y no despacha a Dropi", async () => {
    const wooOrder = {
      id: 88101,
      number: "88101",
      status: "processing",
      currency: "USD",
      total: "39.99",
      shipping_total: "0.00",
      payment_method: "cod",
      billing: {
        first_name: "Carlos",
        last_name: "Pérez",
        address_1: "Av. Francisco de Miranda, Edif. Parque Cristal",
        city: "Caracas",
        state: "Miranda",
        country: "VE",
        phone: "04125551234",
      },
      line_items: [
        {
          product_id: 17,
          name: "Aceite de Orégano",
          quantity: 1,
          price: "39.99",
          total: "39.99",
        },
      ],
    };

    const mockFetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/products")) return { ok: true, text: async () => "[]" } as Response;
      if (u.includes("/customers")) return { ok: true, text: async () => "[]" } as Response;
      if (u.includes("/orders"))
        return { ok: true, text: async () => JSON.stringify([wooOrder]) } as Response;
      return { ok: true, text: async () => "[]" } as Response;
    });

    const woo = new WooCommerce({
      storeId: "store_demo_beauty",
      url: "https://apiv2backecom.daverod.tech",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "whsec_test",
      fetch: mockFetch as any,
    });

    const createShipmentSpy = vi.fn();
    const deps: any = {
      db,
      bus: new EventBus(),
      commerce: woo,
      carriers: [{ id: "dropi", label: "Dropi", createShipment: createShipmentSpy }],
      messaging: undefined,
      storeName: "Davebeauty Demo",
    };

    // Primera importación
    const first = await importStore(deps, "store_demo_beauty", woo);
    expect(first.orders).toBe(1);
    expect(createShipmentSpy).not.toHaveBeenCalled();

    // Simular que el pedido ya fue despachado manualmente / en Traxo
    await db.prisma.order.update({
      where: { storeId_externalId: { storeId: "store_demo_beauty", externalId: "88101" } },
      data: { status: "shipped" },
    });

    // Segunda importación: NO debe duplicar ni revertir status a confirmed
    const second = await importStore(deps, "store_demo_beauty", woo);
    expect(second.orders).toBe(0);
    expect(createShipmentSpy).not.toHaveBeenCalled();

    const count = await db.prisma.order.count({
      where: { storeId: "store_demo_beauty", externalId: "88101" },
    });
    expect(count).toBe(1);

    const row = await db.prisma.order.findUnique({
      where: { storeId_externalId: { storeId: "store_demo_beauty", externalId: "88101" } },
    });
    expect(row?.status).toBe("shipped");
  });

  it("webhook /webhooks/commerce/woocommerce limpia prefijo HTML, evita duplicados y NO auto-despacha pedidos ya con guía Dropi", async () => {
    const bus = new EventBus();
    const onOrder = vi.fn();
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
      commerce: { woocommerce: woo },
      onOrder,
    });

    const payloadWithDropiTracking = {
      id: 88202,
      number: "88202",
      status: "processing",
      currency: "USD",
      total: "45.00",
      payment_method: "cod",
      billing: {
        first_name: "María",
        last_name: "López",
        address_1: "Calle 2, Urb. Las Mercedes",
        city: "Caracas",
        country: "VE",
        phone: "04245559988",
      },
      meta_data: [
        { key: "_dropi_tracking_number", value: "DRP-MANUAL-777" },
        { key: "_dropi_carrier", value: "Zoom" },
      ],
      line_items: [{ product_id: 17, name: "Aceite de Orégano", quantity: 1, price: "45.00" }],
    };

    const rawWithHtmlPrefix = `<div class="notice"><p>Notice [php]</p></div>${JSON.stringify(payloadWithDropiTracking)}`;
    const sig = hmac("whsec_test", rawWithHtmlPrefix, "base64");

    const res = await app.request("/webhooks/commerce/woocommerce", {
      method: "POST",
      body: rawWithHtmlPrefix,
      headers: {
        "x-wc-webhook-signature": sig,
        "x-wc-webhook-topic": "order.created",
        "x-wc-webhook-delivery-id": "del_dropi_manual_1",
      },
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; created: boolean; orderId: string };
    expect(json.ok).toBe(true);
    expect(json.created).toBe(true);
    // NO debe disparar onOrder porque ya trae guía manual de Dropi
    expect(onOrder).not.toHaveBeenCalled();

    const shipment = await db.prisma.shipment.findFirst({
      where: { orderId: json.orderId },
    });
    expect(shipment?.trackingNumber).toBe("DRP-MANUAL-777");
    expect(shipment?.carrier).toBe("Zoom");

    // Reintento con otro delivery-id (order.updated) tampoco duplica ni dispara onOrder
    const rawJson = JSON.stringify(payloadWithDropiTracking);
    const res2 = await app.request("/webhooks/commerce/woocommerce", {
      method: "POST",
      body: rawJson,
      headers: {
        "x-wc-webhook-signature": hmac("whsec_test", rawJson, "base64"),
        "x-wc-webhook-topic": "order.updated",
        "x-wc-webhook-delivery-id": "del_dropi_manual_2",
      },
    });
    expect(res2.status).toBe(200);
    const json2 = (await res2.json()) as { ok: boolean; created: boolean };
    expect(json2.created).toBe(false);
    expect(onOrder).not.toHaveBeenCalled();
  });

  it("GET /api/sync/status devuelve salud de sincronización, conteos, reachability de WooCommerce y respeta TRAXO_API_TOKEN", async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      text: async () => "[]",
    })) as unknown as typeof fetch;

    const woo = new WooCommerce({
      storeId: "store_demo_beauty",
      url: "https://apiv2backecom.daverod.tech",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "whsec_test",
      fetch: mockFetch,
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
    protectApi(app, "secret-token-123");
    registerApi(app, rt);

    const unauth = await app.request("/api/sync/status");
    expect(unauth.status).toBe(401);

    const res = await app.request("/api/sync/status", {
      headers: {
        Authorization: "Bearer secret-token-123",
        "x-store-id": "store_demo_beauty",
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.ok).toBe(true);
    expect(body.storeId).toBe("store_demo_beauty");
    expect(body.healthy).toBe(true);
    expect(body.woocommerce.configured).toBe(true);
    expect(body.woocommerce.reachable).toBe(true);
    expect(typeof body.counts.products).toBe("number");
    expect(typeof body.counts.orders).toBe("number");
  });
});
