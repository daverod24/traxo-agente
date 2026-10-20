import { describe, expect, it } from "vitest";
import {
  BCV_RATE_FIXTURES,
  isBcvRateStale,
  VENEZUELA_ADDRESS_FIXTURES,
  VenezuelaAddressSchema,
} from "../src/index.ts";

describe("L2-A4: Fixtures de Direcciones y Cobertura VE", () => {
  it("valida todas las fixtures urbanas contra VenezuelaAddressSchema", () => {
    const urbanKeys = [
      "caracas_davebeauty",
      "maracaibo_norte",
      "valencia_central",
      "barquisimeto_este",
      "puerto_la_cruz_lecheria",
    ];

    for (const key of urbanKeys) {
      const fixture = VENEZUELA_ADDRESS_FIXTURES[key];
      const parsed = VenezuelaAddressSchema.safeParse(fixture);
      expect(parsed.success, `Fallo en fixture ${key}`).toBe(true);
      expect(fixture.providerPlace?.provider).toBe("dropi");
    }
  });

  it("reconoce correctamente direcciones sin cobertura en Dropi (fail-safe)", () => {
    const remote = VENEZUELA_ADDRESS_FIXTURES.zona_remota_sin_cobertura;
    expect(remote.providerPlace).toBeUndefined();
    const parsed = VenezuelaAddressSchema.safeParse(remote);
    expect(parsed.success).toBe(true);
  });

  it("comprueba el comportamiento de caducidad en snapshots BCV", () => {
    expect(isBcvRateStale(BCV_RATE_FIXTURES.vigente)).toBe(false);
    expect(isBcvRateStale(BCV_RATE_FIXTURES.caducada_hace_48h)).toBe(true);
  });
});
