import { describe, expect, it } from "vitest";
import {
  BcvRateSnapshotSchema,
  VENEZUELA_STATES,
  VenezuelaAddressSchema,
  isBcvRateStale,
  normalizePhoneVE,
} from "../src/index.ts";

describe("Market VE: Teléfonos E.164 (+58)", () => {
  it("normaliza números móviles locales de 11 dígitos con prefijo 0", () => {
    expect(normalizePhoneVE("04121234567")).toBe("+584121234567");
    expect(normalizePhoneVE("04149876543")).toBe("+584149876543");
    expect(normalizePhoneVE("04245551122")).toBe("+584245551122");
    expect(normalizePhoneVE("04163334455")).toBe("+584163334455");
    expect(normalizePhoneVE("04267778899")).toBe("+584267778899");
  });

  it("normaliza números con separadores comunes (guiones, espacios, puntos)", () => {
    expect(normalizePhoneVE("0412-123.45.67")).toBe("+584121234567");
    expect(normalizePhoneVE("+58 414 123 4567")).toBe("+584141234567");
    expect(normalizePhoneVE("0058-424-999-88-77")).toBe("+584249998877");
  });

  it("normaliza números fijos venezolanos", () => {
    expect(normalizePhoneVE("0212-9876543")).toBe("+582129876543"); // Caracas
    expect(normalizePhoneVE("0241-1234567")).toBe("+582411234567"); // Valencia
  });

  it("rechaza números inválidos o de otros países en modo Fail-Closed", () => {
    expect(normalizePhoneVE("12345")).toBeUndefined();
    expect(normalizePhoneVE("+573001234567")).toBeUndefined(); // Colombia
    expect(normalizePhoneVE("04181234567")).toBeUndefined(); // Prefijo inexistente
    expect(normalizePhoneVE("")).toBeUndefined();
    expect(normalizePhoneVE(null)).toBeUndefined();
  });
});

describe("Market VE: Catálogo Territorial (24 Entidades Federales)", () => {
  it("contiene exactamente las 24 entidades federales oficiales", () => {
    const keys = Object.keys(VENEZUELA_STATES);
    expect(keys).toHaveLength(24);
    expect(VENEZUELA_STATES["VE-A"].name).toBe("Distrito Capital");
    expect(VENEZUELA_STATES["VE-V"].name).toBe("Zulia");
    expect(VENEZUELA_STATES["VE-M"].name).toBe("Mérida");
  });
});

describe("Market VE: Esquema VenezuelaAddress", () => {
  it("valida una dirección completa de Davebeauty en Caracas", () => {
    const validAddr = {
      country: "VE" as const,
      stateCode: "VE-A" as const,
      city: "Caracas",
      urbanization: "Las Mercedes",
      street: "Calle París con Mucuchíes, Edif. Torre Victoria",
      recipientName: "María Gómez",
      phoneE164: "+584121234567",
      reference: "Frente a la panadería",
    };

    const parsed = VenezuelaAddressSchema.safeParse(validAddr);
    expect(parsed.success).toBe(true);
  });

  it("rechaza direcciones con teléfono que no sea E.164 +58", () => {
    const invalidAddr = {
      country: "VE" as const,
      stateCode: "VE-A" as const,
      city: "Caracas",
      street: "Av. Principal",
      recipientName: "Juan Pérez",
      phoneE164: "04121234567", // No tiene formato E.164 internacional
    };

    const parsed = VenezuelaAddressSchema.safeParse(invalidAddr);
    expect(parsed.success).toBe(false);
  });
});

describe("Market VE: Snapshot BCV y Detección de Caducidad", () => {
  it("valida un snapshot oficial del BCV", () => {
    const snapshot = {
      source: "https://www.bcv.org.ve" as const,
      rate: "44.5201",
      currency: "VES" as const,
      baseCurrency: "USD" as const,
      publishedAt: new Date().toISOString(),
      capturedAt: new Date().toISOString(),
      staleThresholdHours: 24,
    };

    const parsed = BcvRateSnapshotSchema.safeParse(snapshot);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isBcvRateStale(parsed.data)).toBe(false);
    }
  });

  it("detecta tasas con más de 24 horas como stale", () => {
    const oldPublished = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(); // 30h atrás
    const snapshot = {
      source: "https://www.bcv.org.ve" as const,
      rate: "43.1000",
      currency: "VES" as const,
      baseCurrency: "USD" as const,
      publishedAt: oldPublished,
      capturedAt: new Date().toISOString(),
      staleThresholdHours: 24,
    };

    const parsed = BcvRateSnapshotSchema.safeParse(snapshot);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isBcvRateStale(parsed.data)).toBe(true);
    }
  });
});
