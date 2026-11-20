import { describe, expect, it } from "vitest";
import { loadEnv, ServerEnvSchema } from "../src/env.ts";

describe("Validación de Entorno ServerEnvSchema", () => {
  it("valida con valores por defecto cuando no se pasan variables", () => {
    const parsed = ServerEnvSchema.parse({});
    expect(parsed.NODE_ENV).toBe("production");
    expect(parsed.PORT).toBe(4000);
    expect(parsed.TRAXO_BCV_RATE).toBe(880.0);
    expect(parsed.GEMINI_MODEL).toBe("gemini-2.5-flash");
    expect(parsed.XAI_MODEL).toBe("grok-2-mini");
    expect(parsed.OPENROUTER_MODEL).toBe("anthropic/claude-3.5-sonnet");
    expect(parsed.ANTHROPIC_MODEL).toBe("claude-3-5-sonnet-latest");
    expect(parsed.TRAXO_SESSION_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it("convierte strings vacíos a undefined para campos opcionales", () => {
    const parsed = ServerEnvSchema.parse({
      GEMINI_API_KEY: "",
      DATABASE_URL: "",
      WOOCOMMERCE_URL: "   ",
      GA4_PROPERTY_ID: "",
    });
    expect(parsed.GEMINI_API_KEY).toBeUndefined();
    expect(parsed.DATABASE_URL).toBeUndefined();
    expect(parsed.WOOCOMMERCE_URL).toBeUndefined();
    expect(parsed.GA4_PROPERTY_ID).toBeUndefined();
  });

  it("falla si TRAXO_SESSION_SECRET tiene menos de 32 caracteres", () => {
    expect(() => {
      loadEnv({
        TRAXO_SESSION_SECRET: "demasiado_corta",
      });
    }).toThrow("TRAXO_SESSION_SECRET debe tener al menos 32 caracteres");
  });

  it("valida correctamente variables completas de producción", () => {
    const envData = {
      NODE_ENV: "production",
      PORT: "4500",
      TRAXO_SESSION_SECRET: "un_secreto_seguro_con_mas_de_32_caracteres_12345",
      TRAXO_BCV_RATE: "885.5",
      GEMINI_API_KEY: "AIzaSyFakeKey1234567890FakeKey1234567",
      WOOCOMMERCE_URL: "https://apiv2backecom.daverod.tech",
      N8N_HMAC_SECRET: "clave_secreta_de_al_menos_16_caracteres",
    };

    const env = loadEnv(envData);
    expect(env.PORT).toBe(4500);
    expect(env.TRAXO_BCV_RATE).toBe(885.5);
    expect(env.GEMINI_API_KEY).toBe("AIzaSyFakeKey1234567890FakeKey1234567");
    expect(env.WOOCOMMERCE_URL).toBe("https://apiv2backecom.daverod.tech");
    expect(env.N8N_HMAC_SECRET).toBe("clave_secreta_de_al_menos_16_caracteres");
  });
});
