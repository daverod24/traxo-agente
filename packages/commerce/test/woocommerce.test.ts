import { describe, expect, it, vi } from "vitest";
import { orderFromWoo, WooCommerce } from "../src/woocommerce.ts";

describe("L2-A2: WooCommerce Adapter & VE Support", () => {
  it("parsea pedidos venezolanos con país VE, teléfono +58 y precios decimales sin DANE", () => {
    const rawWooOrder = {
      id: 1042,
      number: "1042",
      currency: "USD",
      total: "29.99",
      shipping_total: "5.00",
      payment_method: "cod",
      billing: {
        email: "valeria@davebeauty.com",
        phone: "04121234567",
      },
      shipping: {
        first_name: "Valeria",
        last_name: "Mendoza",
        address_1: "Calle París, CC Tolón",
        address_2: "PB Local 5",
        city: "Caracas",
        state: "VE-A",
        country: "VE",
        phone: "04121234567",
      },
      line_items: [
        {
          product_id: 501,
          name: "Sérum Facial Davebeauty",
          quantity: 1,
          price: "24.99",
        },
      ],
    };

    const order = orderFromWoo(rawWooOrder as any, "store_davebeauty_01");
    expect(order).toBeDefined();
    if (!order) return;

    expect(order.externalId).toBe("1042");
    expect(order.currency).toBe("USD");
    expect(order.address.country).toBe("VE");
    expect(order.address.phone).toBe("+584121234567");
    expect(order.address.city).toBe("Caracas");
    expect(order.address.stateCode).toBe("VE-A");
    expect(order.address.dane).toBeUndefined(); // Sin código DANE forzado
    expect(order.lines[0].unitPriceDecimal).toBe("24.99");
    expect(order.totalDecimal).toBe("29.99");
  });

  it("mantiene compatibilidad completa con pedidos colombianos (DANE)", () => {
    const rawWooOrder = {
      id: 2001,
      number: "2001",
      currency: "COP",
      total: "125000",
      shipping_total: "15000",
      payment_method: "cod",
      billing: {
        email: "juan@example.co",
        phone: "3001234567",
      },
      shipping: {
        first_name: "Juan",
        last_name: "Pérez",
        address_1: "Carrera 7 # 72-41",
        city: "Bogotá",
        state: "Cundinamarca",
        country: "CO",
        phone: "3001234567",
      },
      line_items: [
        {
          product_id: 101,
          name: "Café Especial 500g",
          quantity: 1,
          price: "110000",
        },
      ],
    };

    const order = orderFromWoo(rawWooOrder as any, "store_co_01");
    expect(order).toBeDefined();
    if (!order) return;

    expect(order.address.country).toBe("CO");
    expect(order.address.dane).toBeDefined();
    expect(order.currency).toBe("COP");
  });

  it("addFulfillment NO marca el pedido como 'completed' prematuramente", async () => {
    const calls: Array<{ url: string; method?: string; body?: any }> = [];

    const mockFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return {
        ok: true,
        json: async () => ({}),
      } as Response;
    });

    const woo = new WooCommerce({
      storeId: "store_davebeauty_01",
      url: "https://staging-davebeauty.local",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "whsec_test",
      fetch: mockFetch as any,
    });

    await woo.addFulfillment("1042", {
      carrier: "Zoom",
      trackingNumber: "ZM-987654321",
      url: "https://zoom.red/tracking/ZM-987654321",
      notifyCustomer: true,
    });

    expect(calls).toHaveLength(2);

    // Llamada 1: Nota al cliente
    expect(calls[0].url).toContain("/orders/1042/notes");
    expect(calls[0].body.customer_note).toBe(true);
    expect(calls[0].body.note).toContain("Zoom");

    // Llamada 2: Actualización de metadata (PUT /orders/1042)
    expect(calls[1].url).toContain("/orders/1042");
    expect(calls[1].method).toBe("PUT");
    // Invariante de seguridad logística: NO debe contener status: "completed"
    expect(calls[1].body.status).toBeUndefined();
    expect(calls[1].body.meta_data).toEqual([
      { key: "_traxo_tracking_number", value: "ZM-987654321" },
      { key: "_traxo_carrier", value: "Zoom" },
    ]);
  });

  it("admite parámetros de paginación en listOrders", async () => {
    let requestedUrl = "";
    const mockFetch = vi.fn(async (url: string | URL | Request) => {
      requestedUrl = String(url);
      return {
        ok: true,
        json: async () => [],
      } as Response;
    });

    const woo = new WooCommerce({
      storeId: "store_davebeauty_01",
      url: "https://staging-davebeauty.local",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "whsec_test",
      fetch: mockFetch as any,
    });

    await woo.listOrders({ page: 2, limit: 25 });
    expect(requestedUrl).toContain("/orders?page=2&per_page=25");
  });

  it("normaliza productos de WooCommerce con lectura robusta de Dropi ID y precio variable", async () => {
    const mockProducts = [
      {
        id: 45,
        name: "Nicotinamide Riboside + Resveratrol 900 mg",
        price: "",
        regular_price: "",
        type: "variable",
        sku: "DB-WELL-NAD-60",
        images: [{ src: "https://apiv2backecom.daverod.tech/uploads/nad.webp" }],
        short_description: "<p>NAD+ Booster longevidad celular</p>",
        variations: [46, 47, 48],
        meta_data: [
          { key: "_dropi_product_id", value: "93" },
          { key: "_rate_type", value: "bcv" },
          { key: "_supplier_cost", value: "10.73" },
        ],
      },
    ];

    const mockVariations = [
      { id: 46, sku: "DB-WELL-NAD-60-1", price: "29.99", attributes: [{ name: "Paquete", option: "Individual" }] },
      { id: 47, sku: "DB-WELL-NAD-60-2", price: "51.99", attributes: [{ name: "Paquete", option: "Dúo (2x)" }] },
      { id: 48, sku: "DB-WELL-NAD-60-3", price: "69.99", attributes: [{ name: "Paquete", option: "Trío (3x)" }] },
    ];

    const mockFetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/products/45/variations")) {
        return { ok: true, json: async () => mockVariations } as Response;
      }
      return { ok: true, json: async () => mockProducts } as Response;
    });

    const woo = new WooCommerce({
      storeId: "store_davebeauty_01",
      url: "https://apiv2backecom.daverod.tech",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "whsec_test",
      fetch: mockFetch as any,
    });

    const products = await woo.listProducts();
    expect(products).toHaveLength(1);
    const prod = products[0]!;
    expect(prod.externalId).toBe("45");
    expect(prod.title).toBe("Nicotinamide Riboside + Resveratrol 900 mg");
    expect(prod.price).toBe(30); // 29.99 redondeado de la primera variación
    expect(prod.cost).toBe(10.73);
    expect(prod.imageUrl).toBe("https://apiv2backecom.daverod.tech/uploads/nad.webp");
    expect(prod.metadata?.dropiId).toBe("93");
    expect(prod.metadata?.rateType).toBe("bcv");
    expect((prod.metadata?.packs as any)?.duo).toBe(52);
    expect((prod.metadata?.packs as any)?.trio).toBe(70);
  });

  it("procesa webhooks de productos (created, updated, deleted)", () => {
    const woo = new WooCommerce({
      storeId: "store_davebeauty_01",
      url: "https://apiv2backecom.daverod.tech",
      consumerKey: "ck_test",
      consumerSecret: "cs_test",
      webhookSecret: "whsec_test",
    });

    // 1. Webhook de producto creado
    const createdPayload = {
      id: 55,
      name: "Crema Reafirmante Lifting para Cuello y Escote",
      price: "22.99",
      sku: "DB-SKIN-NECK-LIFT",
      meta_data: [{ key: "_dropi_product_id", value: "196" }],
    };
    const createdEvent = woo.normalizeProductWebhook(
      { "x-wc-webhook-topic": "product.created" },
      createdPayload,
    );
    expect(createdEvent).toBeDefined();
    expect(createdEvent?.action).toBe("created");
    expect(createdEvent?.productId).toBe("55");
    expect(createdEvent?.product?.title).toBe("Crema Reafirmante Lifting para Cuello y Escote");
    expect(createdEvent?.product?.metadata?.dropiId).toBe("196");

    // 2. Webhook de producto eliminado
    const deletedEvent = woo.normalizeProductWebhook(
      { "x-wc-webhook-topic": "product.deleted" },
      { id: 55 },
    );
    expect(deletedEvent).toBeDefined();
    expect(deletedEvent?.action).toBe("deleted");
    expect(deletedEvent?.productId).toBe("55");

    // 3. Webhook ignorado si es de pedido
    const orderEvent = woo.normalizeProductWebhook(
      { "x-wc-webhook-topic": "order.created" },
      { id: 1042 },
    );
    expect(orderEvent).toBeUndefined();
  });
});
