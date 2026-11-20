import { describe, expect, it } from "vitest";
import { DEMO_BEAUTY_STORE, demoHistory } from "@traxo/commerce";
import { openDb } from "@traxo/db";
import { cleanDummyOrders } from "../src/orders-cleanup.ts";
import { getProductImage } from "../src/importer.ts";

describe("Dummy Orders & Cleanup Sanitization (Strictly 5 Orders)", () => {
  it("demoHistory retorna estrictamente 5 pedidos limpios con los números y montos esperados", () => {
    const orders = demoHistory(DEMO_BEAUTY_STORE.id);
    expect(orders).toHaveLength(5);

    const numbers = orders.map((o) => o.number);
    expect(numbers).toEqual(["#82", "#81", "#80", "#79", "#74"]);

    // #82 Carlos Pérez ($43.00, pending)
    expect(orders[0]?.address.name).toBe("Carlos Pérez");
    expect(orders[0]?.total).toBe(43);
    expect(orders[0]?.status).toBe("pending");

    // #81 Ana Martínez ($43.00, pending)
    expect(orders[1]?.address.name).toBe("Ana Martínez");
    expect(orders[1]?.total).toBe(43);
    expect(orders[1]?.status).toBe("pending");

    // #80 María Rodríguez ($65.00, pending)
    expect(orders[2]?.address.name).toBe("María Rodríguez");
    expect(orders[2]?.total).toBe(65);
    expect(orders[2]?.status).toBe("pending");

    // #79 Andrés Gómez ($48.00, delivered)
    expect(orders[3]?.address.name).toBe("Andrés Gómez");
    expect(orders[3]?.total).toBe(48);
    expect(orders[3]?.status).toBe("delivered");

    // #74 QA Dropi Test ($27.00, cancelled)
    expect(orders[4]?.address.name).toBe("QA Dropi Test");
    expect(orders[4]?.total).toBe(27);
    expect(orders[4]?.status).toBe("cancelled");
  });

  it("calcula exactamente los KPIs de facturación activa y contraentrega por cobrar solicitados", () => {
    const orders = demoHistory(DEMO_BEAUTY_STORE.id);

    const activeOrders = orders.filter((o) => !["cancelled", "rejected"].includes(o.status ?? ""));
    const cancelledOrders = orders.filter((o) => ["cancelled", "rejected"].includes(o.status ?? ""));
    const porConfirmarOrders = orders.filter((o) =>
      ["pending", "received", "on_hold", "on-hold"].includes(o.status ?? ""),
    );
    const codPendientes = orders.filter(
      (o) => o.payment === "cod" && !["delivered", "cancelled", "rejected"].includes(o.status ?? ""),
    );
    const entregados = orders.filter((o) => o.status === "delivered");

    const totalGmv = activeOrders.reduce((s, o) => s + o.total, 0);
    const porCobrar = codPendientes.reduce((s, o) => s + o.total, 0);

    // Verificaciones exactas
    expect(totalGmv).toBe(199); // $199 USD GMV activo (#82 $43 + #81 $43 + #80 $65 + #79 $48)
    expect(porCobrar).toBe(151); // $151 USD COD por cobrar (#82 $43 + #81 $43 + #80 $65)
    expect(porConfirmarOrders).toHaveLength(3); // 3 pedidos por confirmar
    expect(entregados).toHaveLength(1); // 1 entregado (#79)
    expect(cancelledOrders).toHaveLength(1); // 1 cancelado (#74)
  });

  it("cleanDummyOrders purga pedidos ficticios y deja estrictamente los 5 pedidos en base de datos", async () => {
    const db = await openDb();
    const storeId = "store_test_cleanup";

    await db.prisma.store.upsert({
      where: { id: storeId },
      update: {},
      create: {
        id: storeId,
        name: "Test Cleanup Store",
        platform: "woocommerce",
        url: "https://test.ve",
        settings: {},
      },
    });

    // Crear un pedido ficticio extra que deba ser eliminado
    await db.prisma.order.upsert({
      where: { storeId_externalId: { storeId, externalId: "ext_dummy_65" } },
      update: {},
      create: {
        id: `${storeId}_ord_dummy_65`,
        storeId,
        externalId: "ext_dummy_65",
        number: "#65",
        address: { name: "Extraneous Order", country: "VE", city: "Caracas", dane: "VE-A" },
        lines: [{ productId: "p1", title: "Dummy", quantity: 1, unitPrice: 50, weightGrams: 200 }],
        subtotal: 50,
        shippingCharged: 0,
        total: 50,
        payment: "cod",
        status: "pending",
      },
    });

    // Ejecutar la limpieza
    const res = await cleanDummyOrders(db, storeId);
    expect(res.ok).toBe(true);
    expect(res.remaining).toBe(5);

    const ordersInDb = await db.prisma.order.findMany({
      where: { storeId },
      orderBy: { number: "desc" },
    });
    expect(ordersInDb).toHaveLength(5);
    const numbers = ordersInDb.map((o) => o.number).sort();
    expect(numbers).toEqual(["#74", "#79", "#80", "#81", "#82"]);

    // Verificar que el entregado #79 tiene guía de envío registrada
    const order79 = ordersInDb.find((o) => o.number === "#79");
    expect(order79).toBeDefined();
    const shipment = await db.prisma.shipment.findFirst({ where: { orderId: order79?.id } });
    expect(shipment).toBeDefined();
    expect(shipment?.status).toBe("delivered");
  });
});

describe("Product Image Resolution (getProductImage)", () => {
  it("resuelve imágenes canónicas por título o externalId", () => {
    const imgOregano = getProductImage({
      title: "Aceite de orégano con semilla negra silvestre",
    });
    expect(imgOregano).toContain("aceite-de-oregano-semilla-negra");

    const imgMelaxin = getProductImage({
      title: "Dr. Melaxin Calcium Volume Multi-Balm",
    });
    expect(imgMelaxin).toContain("dr-melaxin-calcium-volume-multi-balm");

    const imgBotalab = getProductImage({
      title: "Botalab Deserticola Shampoo",
    });
    expect(imgBotalab).toContain("DeserticolaShampoo");

    const imgMedicube = getProductImage({
      title: "Medicube Zero Pore Pad 2.0",
    });
    expect(imgMedicube).toContain("cloudfront.net");

    const imgReafirmante = getProductImage({
      title: "Aceite mágico reafirmante corporal",
    });
    expect(imgReafirmante).toContain("aceite-magico-reafirmante");

    // Conserva imageUrl si ya es un link válido http
    const customImg = getProductImage({
      title: "Producto Genérico",
      imageUrl: "https://example.com/custom.png",
    });
    expect(customImg).toBe("https://example.com/custom.png");
  });
});
