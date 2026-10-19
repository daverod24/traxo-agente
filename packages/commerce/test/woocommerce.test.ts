import { describe, expect, it, vi } from "vitest";
import { WooCommerce, orderFromWoo } from "../src/woocommerce.ts";

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
});
