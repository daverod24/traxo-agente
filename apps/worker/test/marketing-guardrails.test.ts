import { type Db, ensureDemoAdmin, openDb } from "@traxo/db";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.ts";
import { mountAuth } from "../src/auth.ts";
import { env } from "../src/env.ts";
import { registerGrowthApi } from "../src/growth.ts";
import { createRuntime, type Runtime } from "../src/runtime.ts";
import { generateDeterministicMarketing } from "../src/services/deterministic-engine.ts";
import {
  ClickToWhatsAppOutputSchema,
  checkCategoryGuardrails,
  MetaAdsOutputSchema,
  ORAL_SUPPLEMENT_BANNED_TERMS,
  sanitizeCategoryContent,
  TikTokUgcOutputSchema,
  validateOutputGuardrails,
} from "../src/services/marketing-generator.ts";

describe("Marketing Engine: Guardrails de Categoría y Motor Determinista", () => {
  describe("1. Guardrails Server-Side por Categoría", () => {
    it("detecta violaciones de vocabulario tópico cuando el producto es oral_supplement", () => {
      const dirtyOralCopy =
        "Este producto ofrece una textura ligera con absorción en piel increíble. Ideal para tu maquillaje diario #kbeautyve";

      const check = checkCategoryGuardrails(dirtyOralCopy, "oral_supplement");
      expect(check.ok).toBe(false);
      expect(check.violatedTerms).toContain("absorción en piel");
      expect(check.violatedTerms).toContain("textura ligera");
      expect(check.violatedTerms).toContain("maquillaje");
      expect(check.violatedTerms).toContain("#kbeautyve");
    });

    it("permite vocabulario tópico cuando la categoría es facial_skincare", () => {
      const facialCopy =
        "Suero facial de textura ligera con absorción en piel inmediata. Efecto glass skin y acabado mate.";

      const check = checkCategoryGuardrails(facialCopy, "facial_skincare");
      expect(check.ok).toBe(true);
      expect(check.violatedTerms).toHaveLength(0);
    });

    it("validateOutputGuardrails valida objetos estructurados completos", () => {
      const dirtyPayload = {
        channel: "meta_ads",
        hooks: [
          "Aplica este suero facial en el rostro cada noche",
          "Textura ligera sin sensación grasa",
        ],
      };

      const check = validateOutputGuardrails(dirtyPayload, "oral_supplement");
      expect(check.ok).toBe(false);
      expect(check.violatedTerms.length).toBeGreaterThan(0);
    });

    it("sanitizeCategoryContent reemplaza términos tópicos por equivalentes digestivos/orales", () => {
      const input =
        "Fórmula con absorción en piel rápida y textura ligera. Úsalo antes del maquillaje #kbeautyve";
      const sanitized = sanitizeCategoryContent(input, "oral_supplement");

      for (const banned of ORAL_SUPPLEMENT_BANNED_TERMS) {
        expect(sanitized.toLowerCase()).not.toContain(banned);
      }
      expect(sanitized).toContain("asimilación digestiva");
      expect(sanitized).toContain("fácil ingesta en cápsula");
    });
  });

  describe("2. Motor Determinista (generateDeterministicMarketing)", () => {
    it("genera Meta Ads para oral_supplement con CERO menciones tópicas y validando contra Zod", () => {
      const output = generateDeterministicMarketing({
        productId: "prod_colageno_capsulas",
        title: "Colágeno Marino Hidrolizado en Cápsulas",
        category: "oral_supplement",
        price: 2999,
        channel: "meta_ads",
        angle: "bienestar_celular",
        bcvRate: 880.0,
      });

      const parseResult = MetaAdsOutputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);

      const guardrail = validateOutputGuardrails(output, "oral_supplement");
      expect(guardrail.ok).toBe(true);
      expect(guardrail.violatedTerms).toHaveLength(0);

      if (parseResult.success) {
        expect(parseResult.data.channel).toBe("meta_ads");
        expect(parseResult.data.hooks.length).toBeGreaterThanOrEqual(3);
        expect(parseResult.data.primaryTexts.length).toBeGreaterThanOrEqual(2);
        expect(parseResult.data.headlines.length).toBeGreaterThanOrEqual(3);
        expect(parseResult.data.visualPrompts.ratio4x5).toBeDefined();
        expect(parseResult.data.visualPrompts.ratio9x16).toBeDefined();
        expect(parseResult.data.utmTemplate).toContain("utm_source=meta");

        const stringified = JSON.stringify(parseResult.data);
        expect(stringified).toMatch(/cápsula|agua|ingesta|nutrición|bienestar/i);
      }
    });

    it("genera Click-to-WhatsApp para oral_supplement con precios bimoneda USD/VES", () => {
      const output = generateDeterministicMarketing({
        productId: "prod_omega3",
        title: "Omega 3 Ultra Puro",
        category: "oral_supplement",
        price: 2500,
        channel: "click_to_whatsapp",
        bcvRate: 880.0,
      });

      const parseResult = ClickToWhatsAppOutputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);

      const guardrail = validateOutputGuardrails(output, "oral_supplement");
      expect(guardrail.ok).toBe(true);

      if (parseResult.success) {
        expect(parseResult.data.channel).toBe("click_to_whatsapp");
        expect(parseResult.data.adCopy).toContain("Pago Contra Entrega");
        expect(parseResult.data.prefilledWhatsAppMessage).toContain("Omega 3");

        const script = parseResult.data.closingScript;
        expect(script.step1Greeting).toContain("Davebeauty");
        expect(script.step2PricingBimoneda).toContain("$25.00");
        expect(script.step2PricingBimoneda).toContain("Bs.");
        expect(script.step3LogisticsConfirm).toMatch(/Caracas|MRW|Zoom/i);
      }
    });

    it("genera TikTok UGC (guion 30s) para facial_skincare con timestamps y cues", () => {
      const output = generateDeterministicMarketing({
        productId: "prod_serum_vitc",
        title: "Serum Vitamina C Iluminador",
        category: "facial_skincare",
        price: 2199,
        channel: "tiktok_ugc",
      });

      const parseResult = TikTokUgcOutputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);

      if (parseResult.success) {
        expect(parseResult.data.channel).toBe("tiktok_ugc");
        expect(parseResult.data.hooks0to3s.length).toBeGreaterThanOrEqual(3);
        expect(parseResult.data.script30s.length).toBe(4);

        for (const scene of parseResult.data.script30s) {
          expect(scene.timestamp).toBeDefined();
          expect(scene.cameraCue).toBeDefined();
          expect(scene.audioVoiceover).toBeDefined();
          expect(scene.onScreenText).toBeDefined();
        }

        expect(parseResult.data.soundSuggestion).toBeDefined();
      }
    });

    it("es 100% determinista dado el mismo seed y ejecuta en < 5ms", () => {
      const start = performance.now();
      const run1 = generateDeterministicMarketing({
        productId: "prod_test",
        title: "Crema Hidratante",
        category: "facial_skincare",
        channel: "meta_ads",
        seed: "fixed_seed_12345",
      });
      const duration = performance.now() - start;

      const run2 = generateDeterministicMarketing({
        productId: "prod_test",
        title: "Crema Hidratante",
        category: "facial_skincare",
        channel: "meta_ads",
        seed: "fixed_seed_12345",
      });

      expect(duration).toBeLessThan(10);
      expect(run1).toEqual(run2);
    });
  });

  describe("3. Endpoints de Marketing y Despacho a n8n en apps/worker/src/growth.ts", () => {
    let db: Db;
    let rt: Runtime;
    let app: Hono;
    let cookie: string;
    let userStoreId: string;
    const originalEnv = { ...env };

    beforeEach(async () => {
      db = await openDb({ dataDir: "memory://" });
      rt = await createRuntime({}, { db });
      await ensureDemoAdmin(db, rt.storeId);
      app = createApp({
        db,
        bus: rt.bus,
        commerce: rt.commerceMap,
      });
      mountAuth(app, rt, { demo: true });
      registerGrowthApi(app, rt);

      // Crear cuenta y obtener cookie de sesión
      const r = await app.request("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Operator",
          email: "operator@davebeauty.test",
          password: "password123",
          storeName: "Davebeauty Test Store",
        }),
        headers: { "content-type": "application/json" },
      });
      cookie = (r.headers.get("set-cookie") ?? "").split(";")[0] ?? "";

      const account = await db.prisma.account.findUnique({
        where: { email: "operator@davebeauty.test" },
      });
      userStoreId = account!.storeId;
    });

    afterEach(async () => {
      Object.assign(env, originalEnv);
      await db.close();
      vi.restoreAllMocks();
    });

    it("POST /api/marketing/generate persiste en tabla append-only marketing_generations", async () => {
      // 1. Crear producto en la tienda del usuario logueado
      const product = await db.prisma.product.create({
        data: {
          id: "prod_colageno_test",
          storeId: userStoreId,
          externalId: "ext_colageno_1",
          title: "Colágeno Hidrolizado Polvo",
          price: 2800,
          category: "oral_supplement",
          description: "Colágeno bebible para bienestar articular y vitalidad celular",
        },
      });

      // 2. Invocar endpoint
      const res = await app.request("/api/marketing/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
        },
        body: JSON.stringify({
          productId: product.id,
          channel: "meta_ads",
          angle: "energia_y_vitalidad",
          mode: "explore",
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.generation).toBeDefined();
      expect(json.generation.productId).toBe(product.id);
      expect(json.generation.channel).toBe("meta_ads");
      expect(json.generation.mode).toBe("explore");
      expect(json.generation.status).toBe("generated");

      // 3. Verificar persistencia en base de datos
      const stored = await db.prisma.marketingGeneration.findUnique({
        where: { id: json.generation.id },
      });
      expect(stored).not.toBeNull();
      expect(stored?.channel).toBe("meta_ads");
      expect(stored?.outputJson).toBeDefined();
    });

    it("POST /api/marketing/:id/dispatch-n8n genera payload firmado HMAC y envía webhook a n8n", async () => {
      env.N8N_OUTBOUND_WEBHOOK_URL = "https://n8n.daverod.tech/webhook/test-marketing";
      env.N8N_HMAC_SECRET = "super_secret_hmac_n8n_key_16_chars";

      const product = await db.prisma.product.create({
        data: {
          id: "prod_serum_test",
          storeId: userStoreId,
          externalId: "ext_serum_1",
          title: "Suero Niacinamida 10%",
          price: 2200,
          category: "facial_skincare",
        },
      });

      // Crear generación previa en la tienda del usuario
      const gen = await db.prisma.marketingGeneration.create({
        data: {
          id: "mkt_test_12345",
          storeId: userStoreId,
          productId: product.id,
          channel: "click_to_whatsapp",
          angle: "cierre_rapido_cod",
          mode: "explore",
          outputJson: { channel: "click_to_whatsapp", adCopy: "Test copy" },
          provider: "deterministic",
          model: "deterministic-prng",
          latencyMs: 2,
          status: "generated",
        },
      });

      let capturedWebhookUrl = "";
      let capturedHeaders: Record<string, string> = {};
      let capturedBody: Record<string, unknown> = {};

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        capturedWebhookUrl = String(url);
        capturedHeaders = (init?.headers as Record<string, string>) ?? {};
        capturedBody = JSON.parse(String(init?.body ?? "{}"));

        return new Response(JSON.stringify({ success: true, executionId: "n8n_exec_999" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      });

      const res = await app.request(`/api/marketing/${gen.id}/dispatch-n8n`, {
        method: "POST",
        headers: {
          cookie,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.status).toBe("dispatched_n8n");
      expect(json.generation.status).toBe("dispatched_n8n");

      // Verificar petición saliente a n8n
      expect(capturedWebhookUrl).toBe("https://n8n.daverod.tech/webhook/test-marketing");
      expect(capturedHeaders["X-Traxo-Signature"]).toBeDefined();
      expect(capturedHeaders["X-Traxo-Timestamp"]).toBeDefined();
      expect(capturedBody.generationId).toBe(gen.id);
      expect(capturedBody.event).toBe("traxo.marketing.generation.dispatched");

      // Verificar actualización en BD
      const updatedInDb = await db.prisma.marketingGeneration.findUnique({
        where: { id: gen.id },
      });
      expect(updatedInDb?.status).toBe("dispatched_n8n");
    });
  });
});
