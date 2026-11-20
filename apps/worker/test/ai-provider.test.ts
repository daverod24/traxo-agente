import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeAiCascade } from "../src/ai-provider.ts";
import { env } from "../src/env.ts";
import { type MetaAdsOutput, MetaAdsOutputSchema } from "../src/services/marketing-generator.ts";

describe("AI Provider: Cascada de Inferencia Multi-Provider con Cero SDKs", () => {
  const originalEnv = { ...env };

  const validMetaAdsJson: MetaAdsOutput = {
    channel: "meta_ads",
    campaignName: "[CBO] Test Product - Advantage+",
    hooks: ["Hook 1 de prueba", "Hook 2 de prueba", "Hook 3 de prueba"],
    primaryTexts: ["Texto primario AIDA 1", "Texto primario AIDA 2"],
    headlines: ["Titular 1", "Titular 2", "Titular 3"],
    visualPrompts: {
      ratio4x5: "Prompt para formato 4:5",
      ratio9x16: "Prompt para formato 9:16",
      safeZoneText: "Área segura central",
    },
    utmTemplate: "utm_source=meta&utm_medium=cbo",
  };

  const deterministicSample: MetaAdsOutput = {
    channel: "meta_ads",
    campaignName: "[CBO] Deterministic Fallback",
    hooks: ["Gancho local 1", "Gancho local 2", "Gancho local 3"],
    primaryTexts: ["AIDA local 1", "AIDA local 2"],
    headlines: ["Titular local 1", "Titular local 2", "Titular local 3"],
    visualPrompts: {
      ratio4x5: "Visual local 4:5",
      ratio9x16: "Visual local 9:16",
      safeZoneText: "Safe zone local",
    },
    utmTemplate: "utm_source=meta&utm_medium=local",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.assign(env, originalEnv);
    vi.restoreAllMocks();
  });

  it("1. Cuando Gemini tiene API key y responde 200 con JSON válido, se usa Gemini y se envía x-goog-api-key y thinkingBudget: 0", async () => {
    env.GEMINI_API_KEY = "AIzaSyTestGeminiKey123456789";
    env.GEMINI_MODEL = "gemini-2.5-flash";

    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: Record<string, unknown> = {};

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      capturedUrl = String(url);
      capturedHeaders = (init?.headers as Record<string, string>) ?? {};
      capturedBody = JSON.parse(String(init?.body ?? "{}"));

      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(validMetaAdsJson) }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const result = await executeAiCascade({
      systemPrompt: "System instruction prompt",
      userPrompt: "Generate ad copy",
      schema: MetaAdsOutputSchema,
      deterministicFallback: () => deterministicSample,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("gemini-2.5-flash");
    expect(result.data).toEqual(validMetaAdsJson);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);

    // Verificar cabeceras y parámetros específicos de Gemini 2.5 Flash
    expect(capturedUrl).toContain("generativelanguage.googleapis.com");
    expect(capturedUrl).not.toContain("key="); // CERO llaves en query string
    expect(capturedHeaders["x-goog-api-key"]).toBe("AIzaSyTestGeminiKey123456789");

    // Verificar thinkingBudget: 0 para evitar latencias de 30s
    const genConfig = capturedBody.generationConfig as {
      thinkingConfig?: { thinkingBudget?: number };
    };
    expect(genConfig?.thinkingConfig?.thinkingBudget).toBe(0);
  });

  it("2. Si Gemini falla (HTTP 500), conmuta transparentemente a Grok (xAI) sin error", async () => {
    env.GEMINI_API_KEY = "AIzaSyTestGeminiKey123456789";
    env.XAI_API_KEY = "xai-test-grok-key-12345";
    env.XAI_MODEL = "grok-2-mini";

    let callCount = 0;
    let grokHeaders: Record<string, string> = {};

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      callCount++;
      const urlStr = String(url);

      if (urlStr.includes("generativelanguage.googleapis.com")) {
        return new Response("Internal Server Error", { status: 500 });
      }

      if (urlStr.includes("api.x.ai")) {
        grokHeaders = (init?.headers as Record<string, string>) ?? {};
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify(validMetaAdsJson),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response("Not found", { status: 404 });
    });

    const result = await executeAiCascade({
      systemPrompt: "System prompt",
      userPrompt: "User prompt",
      schema: MetaAdsOutputSchema,
      deterministicFallback: () => deterministicSample,
    });

    expect(callCount).toBe(2);
    expect(result.provider).toBe("grok");
    expect(result.model).toBe("grok-2-mini");
    expect(result.data).toEqual(validMetaAdsJson);
    expect(grokHeaders.Authorization).toBe("Bearer xai-test-grok-key-12345");
  });

  it("3. Validación Zod estricta: si Gemini responde 200 pero el JSON NO valida el esquema, salta a Grok", async () => {
    env.GEMINI_API_KEY = "AIzaSyTestGeminiKey123456789";
    env.XAI_API_KEY = "xai-test-grok-key-12345";

    let geminiCalled = false;
    let grokCalled = false;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);

      if (urlStr.includes("generativelanguage.googleapis.com")) {
        geminiCalled = true;
        // Respuesta 200 pero incompleta (viola el esquema Zod)
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    { text: JSON.stringify({ channel: "meta_ads", campaignName: "Incompleto" }) },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        );
      }

      if (urlStr.includes("api.x.ai")) {
        grokCalled = true;
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: { content: JSON.stringify(validMetaAdsJson) },
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response("Not found", { status: 404 });
    });

    const result = await executeAiCascade({
      systemPrompt: "System prompt",
      userPrompt: "User prompt",
      schema: MetaAdsOutputSchema,
      deterministicFallback: () => deterministicSample,
    });

    expect(geminiCalled).toBe(true);
    expect(grokCalled).toBe(true);
    expect(result.provider).toBe("grok");
    expect(result.data).toEqual(validMetaAdsJson);
  });

  it("4. Si Gemini y Grok fallan, conmuta a OpenRouter / Claude", async () => {
    env.GEMINI_API_KEY = "AIzaSyTestGeminiKey123456789";
    env.XAI_API_KEY = "xai-test-grok-key-12345";
    env.OPENROUTER_API_KEY = "sk-or-test-openrouter-key";
    env.OPENROUTER_MODEL = "anthropic/claude-3.5-sonnet";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes("generativelanguage.googleapis.com") || urlStr.includes("api.x.ai")) {
        return new Response("Service Unavailable", { status: 503 });
      }

      if (urlStr.includes("openrouter.ai")) {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(validMetaAdsJson) } }],
          }),
          { status: 200 },
        );
      }

      return new Response("Not found", { status: 404 });
    });

    const result = await executeAiCascade({
      systemPrompt: "System prompt",
      userPrompt: "User prompt",
      schema: MetaAdsOutputSchema,
      deterministicFallback: () => deterministicSample,
    });

    expect(result.provider).toBe("openrouter");
    expect(result.model).toBe("anthropic/claude-3.5-sonnet");
    expect(result.data).toEqual(validMetaAdsJson);
  });

  it("5. Guardrail en cascada: sanitiza respuesta de LLM si incluye vocabulario tópico para oral_supplement", async () => {
    env.GEMINI_API_KEY = "AIzaSyTestGeminiKey123456789";

    const dirtyGeminiResponse = {
      ...validMetaAdsJson,
      hooks: [
        "Increíble textura ligera que amarás",
        "Absorción en piel en segundos",
        "No es maquillaje, es nutrición",
      ],
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(dirtyGeminiResponse) }],
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result = await executeAiCascade({
      systemPrompt: "System prompt",
      userPrompt: "User prompt",
      schema: MetaAdsOutputSchema,
      category: "oral_supplement",
      deterministicFallback: () => deterministicSample,
    });

    expect(result.provider).toBe("gemini");
    const jsonStr = JSON.stringify(result.data).toLowerCase();
    expect(jsonStr).not.toContain("absorción en piel");
    expect(jsonStr).not.toContain("textura ligera");
  });

  it("6. Si todos los proveedores externos fallan o no hay llaves, conmuta al fallback determinista local firmado", async () => {
    env.GEMINI_API_KEY = undefined;
    env.XAI_API_KEY = undefined;
    env.OPENROUTER_API_KEY = undefined;
    env.ANTHROPIC_API_KEY = undefined;

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await executeAiCascade({
      systemPrompt: "System prompt",
      userPrompt: "User prompt",
      schema: MetaAdsOutputSchema,
      deterministicFallback: () => deterministicSample,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.provider).toBe("deterministic");
    expect(result.model).toBe("deterministic-prng");
    expect(result.data).toEqual(deterministicSample);
    expect(result.latencyMs).toBeLessThanOrEqual(10);
  });
});
