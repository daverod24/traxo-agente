import { describe, expect, it } from "vitest";
import { classifyOrderAnomaly } from "../src/order-hygiene.ts";

describe("classifyOrderAnomaly (higiene y detección no destructiva)", () => {
  const validVeOrder = {
    number: "#101",
    email: "lucia.fernandez@gmail.com",
    origin: "storefront",
    currency: "USD",
    total: 43,
    totalExact: 42.99,
    cedula: "V-18456321",
    meta: { _origin: "storefront", _cedula: "V-18456321" },
    address: {
      name: "Lucía Fernández",
      phone: "+584141234567",
      street: "Av. Principal de La Urbina, Res. Avila Piso 4",
      city: "Chacao",
      country: "VE",
    },
  };

  it("no marca un pedido venezolano real y completo como prueba ni anomalía", () => {
    const res = classifyOrderAnomaly(validVeOrder, { market: "VE" });
    expect(res.isTest).toBe(false);
    expect(res.anomalyReason).toBeUndefined();
    expect(res.flags).toEqual([]);
  });

  it("detecta marcadores explícitos de prueba E2E (_is_test, _origin, email, teléfono, QA Dropi)", () => {
    expect(
      classifyOrderAnomaly({ ...validVeOrder, meta: { _is_test: "true" } }, { market: "VE" })
        .isTest,
    ).toBe(true);
    expect(
      classifyOrderAnomaly(
        { ...validVeOrder, origin: "E2E-playwright", meta: { _origin: "E2E" } },
        { market: "VE" },
      ).isTest,
    ).toBe(true);
    expect(
      classifyOrderAnomaly({ ...validVeOrder, email: "qa@davebeauty.ve" }, { market: "VE" }).isTest,
    ).toBe(true);
    expect(
      classifyOrderAnomaly({ ...validVeOrder, email: "test@example.com" }, { market: "VE" }).isTest,
    ).toBe(true);
    expect(
      classifyOrderAnomaly(
        {
          ...validVeOrder,
          address: { ...validVeOrder.address, phone: "+584120000000" },
        },
        { market: "VE" },
      ).isTest,
    ).toBe(true);
    expect(
      classifyOrderAnomaly(
        {
          ...validVeOrder,
          address: { ...validVeOrder.address, name: "QA Dropi Test" },
        },
        { market: "VE" },
      ).isTest,
    ).toBe(true);
  });

  it("detecta los pares exactos de Playwright y no marca homónimos reales sin cédula/teléfono de prueba", () => {
    const e2eCarlos = classifyOrderAnomaly(
      {
        ...validVeOrder,
        cedula: "V-55667788",
        address: { ...validVeOrder.address, name: "Carlos Pérez", phone: "+584128889900" },
      },
      { market: "VE" },
    );
    expect(e2eCarlos.isTest).toBe(true);
    expect(e2eCarlos.flags).toContain("e2e_playwright_fixture");

    const e2eValentina = classifyOrderAnomaly(
      {
        ...validVeOrder,
        cedula: "V-24567890",
        address: { ...validVeOrder.address, name: "Valentina Gomez", phone: "+584128887766" },
      },
      { market: "VE" },
    );
    expect(e2eValentina.isTest).toBe(true);

    // Un cliente real llamado Carlos Pérez con otro teléfono y cédula NO debe marcarse como test
    const realCarlos = classifyOrderAnomaly(
      {
        ...validVeOrder,
        cedula: "V-15987654",
        meta: { _origin: "storefront", _cedula: "V-15987654" },
        address: { ...validVeOrder.address, name: "Carlos Pérez", phone: "+584241112233" },
      },
      { market: "VE" },
    );
    expect(realCarlos.isTest).toBe(false);
    expect(realCarlos.flags).toEqual([]);
  });

  it("detecta anomalías operativas sin marcar como prueba E2E", () => {
    const anomalous = classifyOrderAnomaly(
      {
        ...validVeOrder,
        total: 0,
        totalExact: 0,
        address: {
          name: "Pedro Real",
          phone: "123",
          street: "Centro",
          city: "Bogotá",
          dane: "11001",
          country: "VE",
        },
      },
      { market: "VE", duplicateOfNumber: "#100" },
    );
    expect(anomalous.isTest).toBe(false);
    expect(anomalous.flags).toEqual(
      expect.arrayContaining([
        "invalid_phone",
        "short_address",
        "zero_total_no_coupon",
        "possible_duplicate",
        "co_location_in_ve",
      ]),
    );
    expect(anomalous.anomalyReason).toContain("Bogotá");
  });

  it("permite total 0 cuando hay cupón aplicado y no confunde Valencia/Mérida VE con Colombia", () => {
    const res = classifyOrderAnomaly(
      {
        ...validVeOrder,
        total: 0,
        totalExact: 0,
        meta: { _storefront_coupon: "REGALO100" },
        address: {
          ...validVeOrder.address,
          city: "Valencia",
        },
      },
      { market: "VE" },
    );
    expect(res.isTest).toBe(false);
    expect(res.flags).toEqual([]);
  });
});
