import { describe, expect, it } from "vitest";
import { mockProviders } from "../src/mock.ts";
import { selectQuote } from "../src/selector.ts";
import type { ShipmentDraft } from "@traxo/core";

describe("transportadoras y logística para Venezuela (Dropi, Flash Courier, MRW, Zoom)", () => {
  it("carga las vías de envío venezolanas cuando MARKET=VE", () => {
    const providers = mockProviders("VE");
    const ids = providers.map((p) => p.id);
    expect(ids).toEqual(["dropi", "mrw", "zoom", "tealca", "caracas-express"]);
  });

  it("Flash Courier en Dropi VE cotiza en USD y admite contraentrega", async () => {
    const [dropi] = mockProviders("VE");
    expect(dropi.label).toContain("Dropi");

    const draft: ShipmentDraft = {
      orderId: "ord_ve_1",
      origin: { dane: "VE-A" },
      destination: {
        name: "Valeria Mendoza",
        street: "Calle París, Las Mercedes",
        city: "Caracas",
        dane: "VE-A",
        phone: "+584121234567",
      },
      weightGrams: 500,
      declaredValue: 55,
      codAmount: 55,
    };

    const quotes = await dropi.quote(draft);
    expect(quotes.length).toBeGreaterThan(0);
    const flash = quotes.find((q) => q.carrier.includes("Flash"));
    expect(flash).toBeDefined();
    expect(flash?.supportsCod).toBe(true);
    expect(flash?.freight).toBeLessThan(10); // En USD (e.g. ~$4.50)
  });

  it("el selector de cotizaciones explica la decisión con bimoneda cuando se trabaja en USD", async () => {
    process.env.MARKET = "VE";
    process.env.TRAXO_CURRENCY = "USD";
    process.env.TRAXO_BCV_RATE = "48.45";

    const providers = mockProviders("VE");
    const draft: ShipmentDraft = {
      orderId: "ord_ve_2",
      origin: { dane: "VE-A" },
      destination: {
        name: "Carlos Villalobos",
        street: "Bella Vista",
        city: "Maracaibo",
        dane: "VE-V",
        phone: "+584149876543",
      },
      weightGrams: 300,
      declaredValue: 34,
      codAmount: 0,
    };

    const quotes = (await Promise.all(providers.map((p) => p.quote(draft)))).flat();
    expect(quotes.length).toBeGreaterThan(0);

    const sel = selectQuote(quotes, {
      codAmount: 0,
      settings: {
        preferredProvider: "dropi",
        weights: { cost: 0.6, speed: 0.3, reliability: 0.1 },
      },
    });

    expect(sel).toBeDefined();
    expect(sel?.winner).toBeDefined();
    expect(sel?.explanation).toContain("BCV");
    expect(sel?.explanation).toContain("$");

    delete process.env.MARKET;
    delete process.env.TRAXO_CURRENCY;
  });
});
