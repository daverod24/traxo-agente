import { hmac, WooCommerce } from "@traxo/commerce";
import { isReachablePhone, type Order } from "@traxo/core";
import { type Db, openDb, orderFromRow, saveOrder, setSettings } from "@traxo/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { handleNewOrder } from "../src/agent.ts";
import { registerApi } from "../src/api.ts";
import { createApp } from "../src/app.ts";
import { fixAddress } from "../src/approvals.ts";
import { prepaidAmount, requestConfirmation } from "../src/confirmation.ts";
import { registerGrowthApi } from "../src/growth.ts";
import { createRuntime } from "../src/runtime.ts";

let db: Db;
const prevDemo = process.env.TRAXO_DEMO;
const prevMarket = process.env.MARKET;

beforeEach(async () => {
  db = await openDb({ dataDir: "memory://" });
});

afterEach(async () => {
  if (prevDemo === undefined) delete process.env.TRAXO_DEMO;
  else process.env.TRAXO_DEMO = prevDemo;
  if (prevMarket === undefined) delete process.env.MARKET;
  else process.env.MARKET = prevMarket;
  await db.close();
});

function buildVeOrder(over: Partial<Order> = {}): Order {
  return {
    id: `ord_${Math.random().toString(36).slice(2, 10)}`,
    externalId: `woo_${Math.random().toString(36).slice(2, 8)}`,
    number: "#501",
    storeId: "store_main",
    currency: "USD",
    email: "cliente.real@gmail.com",
    address: {
      name: "Gabriela Morales",
      phone: "+584141112233",
      street: "Av. Principal de La Castellana, Edificio Torre, Piso 2",
      city: "Chacao",
      department: "Miranda",
      stateCode: "VE-N",
      country: "VE",
      zone: "La Castellana",
      cedula: "V-20111222",
    },
    lines: [
      {
        productId: "45",
        title: "Medicube Zero Pore Pad 2.0",
        quantity: 1,
        unitPrice: 43,
        unitPriceExact: 42.99,
        lineTotal: 42.99,
        weightGrams: 300,
      },
    ],
    subtotal: 43,
    subtotalExact: 42.99,
    shippingCharged: 0,
    shippingChargedExact: 0,
    total: 43,
    totalExact: 42.99,
    payment: "cod",
    status: "pending",
    rawStatus: "on-hold",
    origin: "storefront",
    isTest: false,
    meta: { _origin: "storefront", _bcv_rate: 905.5, _cedula: "V-20111222" },
    createdAt: "2026-11-26T01:30:00.000Z", // 21:30 VET del 25 nov
    ...over,
  };
}

describe("Refactor Pedidos: seguridad de datos, higiene, API y soporte VE", () => {
  it("runtime.ts NO borra pedidos reales en store_main cuando hay más de 5 pedidos", async () => {
    delete process.env.TRAXO_DEMO;
    await db.prisma.store.create({
      data: {
        id: "store_main",
        name: "Davebeauty",
        platform: "woocommerce",
        url: "https://davebeauty.daverod.tech",
        settings: {},
      },
    });
    for (let i = 1; i <= 8; i++) {
      await saveOrder(
        db,
        buildVeOrder({
          id: `ord_real_${i}`,
          externalId: `real_${i}`,
          number: `#50${i}`,
          storeId: "store_main",
        }),
      );
    }
    expect(await db.prisma.order.count({ where: { storeId: "store_main" } })).toBe(8);

    // Simular arranque con WOOCOMMERCE_KEY sin llamar red (solo validamos store_main con > 5 órdenes)
    const rt = await createRuntime({}, { db });
    expect(rt).toBeDefined();
    expect(await db.prisma.order.count({ where: { storeId: "store_main" } })).toBe(8);
  });

  it("POST /api/orders/clean-dummy devuelve 403 en tienda real y solo corre en demo", async () => {
    delete process.env.TRAXO_DEMO;
    const rt = await createRuntime({}, { db });
    const app = createApp({ db, bus: rt.bus, commerce: rt.commerceMap });
    registerApi(app, rt);

    // Tienda real (store_main)
    const liveRes = await app.request("/api/orders/clean-dummy", {
      method: "POST",
      headers: { "x-store-id": "store_main" },
    });
    expect(liveRes.status).toBe(403);
    const liveBody = (await liveRes.json()) as { ok: boolean; error: string };
    expect(liveBody.ok).toBe(false);
    expect(liveBody.error).toContain("bloqueada");
  });

  it("GET /api/orders devuelve decimales exactos, GET /api/state excluye pruebas en live y endpoints test-flag / mark-e2e-tests son no destructivos", async () => {
    delete process.env.TRAXO_DEMO;
    const rt = await createRuntime({}, { db });
    const app = createApp({ db, bus: rt.bus, commerce: rt.commerceMap });
    registerApi(app, rt);

    const realOrder = buildVeOrder({
      id: "ord_real_4299",
      externalId: "woo_4299",
      number: "#901",
      total: 43,
      totalExact: 42.99,
      isTest: false,
    });
    const e2eOrder = buildVeOrder({
      id: "ord_e2e_pw",
      externalId: "woo_e2e_1",
      number: "#902",
      email: "carlos@davebeauty.ve",
      total: 50,
      totalExact: 50,
      isTest: false, // simula pedido antiguo guardado antes del clasificador
      address: {
        name: "Carlos Pérez",
        phone: "+584128889900",
        street: "Av. Francisco de Miranda",
        city: "Chacao",
        department: "Miranda",
        country: "VE",
        cedula: "V-55667788",
      },
    });
    await saveOrder(db, realOrder);
    await saveOrder(db, e2eOrder);

    // 1. Escanear y marcar E2E sin borrar
    const markRes = await app.request("/api/orders/mark-e2e-tests", {
      method: "POST",
      headers: { "x-store-id": "store_main" },
    });
    expect(markRes.status).toBe(200);
    const markBody = (await markRes.json()) as { marked: number; orderIds: string[] };
    expect(markBody.marked).toBe(1);
    expect(markBody.orderIds).toContain("ord_e2e_pw");
    expect(await db.prisma.order.count({ where: { storeId: "store_main" } })).toBe(2);

    // 2. GET /api/state en live excluye ord_e2e_pw de los KPIs productivos
    const stateRes = await app.request("/api/state", {
      headers: { "x-store-id": "store_main" },
    });
    const stateJson = (await stateRes.json()) as {
      kpis: { orders: number; gmvTotal: number; testOrders: number };
    };
    expect(stateJson.kpis.orders).toBe(1);
    expect(stateJson.kpis.gmvTotal).toBe(42.99);
    expect(stateJson.kpis.testOrders).toBe(1);

    // 3. GET /api/orders incluye ambos pedidos con totalExact=42.99
    const ordersRes = await app.request("/api/orders", {
      headers: { "x-store-id": "store_main" },
    });
    const ordersJson = (await ordersRes.json()) as Array<{
      id: string;
      total: number;
      totalExact: number;
      isTest: boolean;
    }>;
    expect(ordersJson).toHaveLength(2);
    const realRow = ordersJson.find((o) => o.id === "ord_real_4299");
    expect(realRow?.total).toBe(42.99);
    expect(realRow?.totalExact).toBe(42.99);

    // 4. POST /api/orders/:key/test-flag alterna manualmente sin borrar
    const flagRes = await app.request("/api/orders/ord_real_4299/test-flag", {
      method: "POST",
      headers: { "x-store-id": "store_main", "content-type": "application/json" },
      body: JSON.stringify({ isTest: true, reason: "Prueba manual" }),
    });
    expect(flagRes.status).toBe(200);
    const flagJson = (await flagRes.json()) as { ok: boolean; isTest: boolean };
    expect(flagJson.ok).toBe(true);
    expect(flagJson.isTest).toBe(true);
  });

  it("webhook order.updated actualiza un pedido existente sin ser bloqueado por dedupe de order.created", async () => {
    const rt = await createRuntime({}, { db });
    const secret = "wh_secret_ve";
    const woo = new WooCommerce({
      storeId: "store_main",
      url: "https://apiv2backecom.daverod.tech",
      consumerKey: "ck",
      consumerSecret: "cs",
      webhookSecret: secret,
    });
    const app = createApp({ db, bus: rt.bus, commerce: { woocommerce: woo } });

    const payloadCreated = {
      id: 777,
      number: "777",
      status: "on-hold",
      currency: "USD",
      date_created_gmt: "2026-11-26T02:00:00",
      total: "42.99",
      payment_method: "cod",
      shipping: {
        first_name: "Ana",
        last_name: "López",
        address_1: "Av. Bolívar, Edificio Sol",
        city: "Valencia",
        state: "VE-G",
        country: "VE",
        phone: "04125556677",
      },
      line_items: [{ product_id: 17, name: "Aceite de Orégano", quantity: 1, price: "42.99" }],
    };

    const raw1 = JSON.stringify(payloadCreated);
    const res1 = await app.request("/webhooks/commerce/woocommerce", {
      method: "POST",
      body: raw1,
      headers: {
        "x-wc-webhook-signature": hmac(secret, raw1, "base64"),
        "x-wc-webhook-topic": "order.created",
        "x-wc-webhook-delivery-id": "deliv_777",
      },
    });
    expect(res1.status).toBe(200);
    expect(((await res1.json()) as { created: boolean }).created).toBe(true);

    const payloadUpdated = {
      ...payloadCreated,
      status: "processing",
      total: "39.99",
    };
    const raw2 = JSON.stringify(payloadUpdated);
    const res2 = await app.request("/webhooks/commerce/woocommerce", {
      method: "POST",
      body: raw2,
      headers: {
        "x-wc-webhook-signature": hmac(secret, raw2, "base64"),
        "x-wc-webhook-topic": "order.updated",
        "x-wc-webhook-delivery-id": "deliv_777",
      },
    });
    expect(res2.status).toBe(200);
    const body2 = (await res2.json()) as { created: boolean; duplicate?: boolean };
    expect(body2.duplicate).toBeUndefined();
    expect(body2.created).toBe(false);

    const updatedRow = await db.prisma.order.findFirstOrThrow({
      where: { storeId: "store_main", externalId: "777" },
    });
    expect(updatedRow.status).toBe("confirmed");
    expect(updatedRow.rawStatus).toBe("processing");
    expect(updatedRow.totalExact).toBe(39.99);
  });

  it("soporta teléfonos +58, direcciones VE sin DANE, prepaidAmount USD en centavos y /api/reports/overview en America/Caracas", async () => {
    process.env.MARKET = "VE";
    delete process.env.TRAXO_DEMO;

    expect(isReachablePhone("+584141112233", "VE")).toBe(true);
    expect(isReachablePhone("+573001112233", "CO")).toBe(true);
    expect(isReachablePhone("12345", "VE")).toBe(false);

    expect(
      prepaidAmount({ total: 43, totalExact: 42.99, currency: "USD" }, { prepaidDiscountPct: 5 }),
    ).toBe(40.84);
    expect(prepaidAmount({ total: 100000, currency: "COP" }, { prepaidDiscountPct: 5 })).toBe(
      95000,
    );

    const rt = await createRuntime({ MARKET: "VE" }, { db });
    await setSettings(db, rt.storeId, { confirmCod: "all", prepaidDiscountPct: 5 });

    const veOrder = buildVeOrder({
      id: "ord_ve_msg",
      externalId: "woo_ve_msg",
      storeId: rt.storeId,
      createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    });
    await saveOrder(db, veOrder);

    // requestConfirmation debe enviar WhatsApp a +58 sin pedir "otro medio"
    const confOut = await requestConfirmation(
      rt,
      veOrder,
      await (await import("@traxo/db")).getSettings(db, rt.storeId),
      {
        score: 50,
        level: "medio",
        reasons: ["Cliente nuevo"],
      },
    );
    expect(confOut.status).toBe("awaiting_confirmation");
    const sent = (rt.messaging as unknown as { sent: Array<{ to: string }> }).sent;
    expect(sent.some((m) => m.to === "+584141112233")).toBe(true);

    // handleNewOrder con dirección venezolana válida NO la bloquea por falta de DANE
    const veReady = buildVeOrder({
      id: "ord_ve_ready",
      externalId: "woo_ve_ready",
      storeId: rt.storeId,
      payment: "prepaid",
    });
    await saveOrder(db, veReady);
    const out = await handleNewOrder(rt, veReady, { skipConfirmation: true });
    expect(out.status).not.toBe("needs_address");

    // POST /api/messages acepta +58
    const app = createApp({ db, bus: rt.bus, commerce: rt.commerceMap });
    registerApi(app, rt);
    registerGrowthApi(app, rt);

    const msgRes = await app.request("/api/messages", {
      method: "POST",
      headers: { "x-store-id": rt.storeId, "content-type": "application/json" },
      body: JSON.stringify({ orderKey: veOrder.id, text: "Hola, tu pedido está confirmado" }),
    });
    expect(msgRes.status).toBe(200);

    // /api/reports/overview agrupa pedidos de las 9:30 p.m. VET en el día VET, no al día siguiente UTC
    // Buscar una fecha reciente a las 01:30 UTC (21:30 VET del día anterior)
    const now = new Date();
    const yesterdayUtc130 = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 1, 30, 0),
    );
    const vetDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(yesterdayUtc130);

    await saveOrder(
      db,
      buildVeOrder({
        id: "ord_ve_night",
        externalId: "woo_ve_night",
        storeId: "store_main",
        total: 100,
        totalExact: 99.5,
        createdAt: yesterdayUtc130.toISOString(),
      }),
    );

    const repRes = await app.request("/api/reports/overview?days=7", {
      headers: { "x-store-id": "store_main" },
    });
    expect(repRes.status).toBe(200);
    const repJson = (await repRes.json()) as {
      series: Array<{ date: string; orders: number; revenue: number }>;
    };
    const vetBucket = repJson.series.find((b) => b.date === vetDay);
    expect(vetBucket).toBeDefined();
    expect(vetBucket?.orders).toBeGreaterThanOrEqual(1);
    expect(vetBucket?.revenue).toBeGreaterThanOrEqual(99.5);
  });

  it("orderFromRow hidrata todos los campos nuevos y approve/fixAddress soporta VE", async () => {
    const rt = await createRuntime({ MARKET: "VE" }, { db });
    const badVe = buildVeOrder({
      id: "ord_ve_short",
      externalId: "woo_ve_short",
      storeId: rt.storeId,
      address: {
        name: "Luis",
        phone: "+584121234567",
        street: "Casa",
        city: "Valencia",
        department: "Carabobo",
        country: "VE",
      },
    });
    await saveOrder(db, badVe);
    const row = await db.prisma.order.findUniqueOrThrow({ where: { id: badVe.id } });
    const hydrated = orderFromRow(row);
    expect(hydrated.totalExact).toBe(42.99);
    expect(hydrated.origin).toBe("storefront");
    expect(hydrated.rawStatus).toBe("on-hold");

    const out = await handleNewOrder(rt, hydrated);
    expect(out.status).toBe("needs_address");
    const apr = await db.prisma.approval.findFirstOrThrow({
      where: { orderId: badVe.id, kind: "address" },
    });
    const fixed = await fixAddress(rt, apr.id, {
      street: "Av. Bolívar Norte, Residencias El Parque",
      city: "Valencia",
    });
    expect(fixed.ok).toBe(true);
    const afterRow = await db.prisma.order.findUniqueOrThrow({ where: { id: badVe.id } });
    expect((afterRow.address as { street: string }).street).toBe(
      "Av. Bolívar Norte, Residencias El Parque",
    );
  });
});
