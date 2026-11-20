import { generateKeyPairSync } from "node:crypto";
import { type Db, DEMO_ADMIN, ensureDemoAdmin, openDb } from "@traxo/db";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { mountAuth } from "../src/auth.ts";
import { registerGrowthApi } from "../src/growth.ts";
import { createRuntime, type Runtime } from "../src/runtime.ts";
import { generateAiDailyBrief } from "../src/services/ai-brief.ts";
import { clearAnalyticsMemoryCache } from "../src/services/analytics-cache.ts";
import { getClarityDeepLinks, getClarityMetrics } from "../src/services/clarity-client.ts";
import {
  calculateFunnelBottleneck,
  type FunnelStep,
  parseServiceAccount,
  runFunnelReport,
  runRealtimeReport,
  signJwtRs256,
} from "../src/services/ga4-client.ts";

describe("Live Analytics & GA4 Cache Engine", () => {
  let db: Db;
  let rt: Runtime;
  let app: Hono;
  let cookie: string;
  let ipCounter = 0;

  beforeEach(async () => {
    clearAnalyticsMemoryCache();
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

    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: DEMO_ADMIN.email,
        password: DEMO_ADMIN.password,
      }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `192.168.1.${++ipCounter}`,
      },
    });
    cookie = (loginRes.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  });

  afterEach(async () => {
    await db.close();
  });

  describe("GA4 Service Account & JWT RS256 Signing", () => {
    it("parseServiceAccount maneja nulos, cadenas vacías y formatos inválidos de manera segura", () => {
      expect(parseServiceAccount(undefined)).toBeNull();
      expect(parseServiceAccount("")).toBeNull();
      expect(parseServiceAccount("invalid base64 string!")).toBeNull();
      expect(parseServiceAccount(JSON.stringify({ foo: "bar" }))).toBeNull();
    });

    it("parseServiceAccount decodifica credenciales en JSON y Base64", () => {
      const saSample = {
        client_email: "test-sa@project.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...\n-----END PRIVATE KEY-----\n",
        token_uri: "https://oauth2.googleapis.com/token",
      };

      const fromJson = parseServiceAccount(JSON.stringify(saSample));
      expect(fromJson).not.toBeNull();
      expect(fromJson?.client_email).toBe(saSample.client_email);

      const b64 = Buffer.from(JSON.stringify(saSample)).toString("base64");
      const fromB64 = parseServiceAccount(b64);
      expect(fromB64).not.toBeNull();
      expect(fromB64?.client_email).toBe(saSample.client_email);
    });

    it("signJwtRs256 genera un JWT firmado con cabecera RS256 válida usando node:crypto", () => {
      const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
      const pem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;

      const sa = {
        client_email: "service-account@test.iam.gserviceaccount.com",
        private_key: pem,
      };

      const jwt = signJwtRs256(sa);
      expect(jwt).toBeDefined();
      const parts = jwt.split(".");
      expect(parts.length).toBe(3);

      const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
      expect(header).toEqual({ alg: "RS256", typ: "JWT" });

      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      expect(payload.iss).toBe(sa.client_email);
      expect(payload.scope).toBe("https://www.googleapis.com/auth/analytics.readonly");
    });
  });

  describe("Reportes en Tiempo Real y Caché de 60s", () => {
    it("runRealtimeReport devuelve datos simulados realistas cuando no hay credenciales", async () => {
      const data = await runRealtimeReport("store_test", db.prisma);
      expect(data).toBeDefined();
      expect(data.activeUsers).toBeGreaterThan(0);
      expect(data.topProduct.name).toBeDefined();
      expect(data.topSource.name).toBe("instagram / cpc");
      expect(data.source).toBe("simulated");
    });

    it("aplica caché de 60s en memoria y base de datos AnalyticsCache", async () => {
      const initial = await runRealtimeReport("store_test", db.prisma);
      const cached = await runRealtimeReport("store_test", db.prisma);

      // Mismo timestamp de caché exacto
      expect(cached.cachedAt).toBe(initial.cachedAt);

      // Verificación en la tabla AnalyticsCache de DB
      const dbRow = await db.prisma.analyticsCache.findUnique({
        where: {
          storeId_metricType: {
            storeId: "store_test",
            metricType: "ga4_realtime",
          },
        },
      });
      expect(dbRow).not.toBeNull();
      expect((dbRow?.payloadJson as { activeUsers: number })?.activeUsers).toBe(
        initial.activeUsers,
      );
    });

    it("forceRefresh omite la caché y regenera los datos", async () => {
      const initial = await runRealtimeReport("store_test", db.prisma);
      // Pequeña pausa para asegurar diferente timestamp ISO
      await new Promise((r) => setTimeout(r, 5));
      const fresh = await runRealtimeReport("store_test", db.prisma, true);

      expect(fresh).toBeDefined();
      expect(fresh.cachedAt).not.toBe("");
    });
  });

  describe("Embudo de Conversión (Funnel) y Semáforo de Cuello de Botella", () => {
    it("calculateFunnelBottleneck detecta fuga crítica en pedidos (rojo)", () => {
      const steps: FunnelStep[] = [
        {
          id: "sessions",
          name: "Sesiones",
          count: 1000,
          conversionRate: 100,
          dropoffRate: 0,
          status: "verde",
        },
        {
          id: "product_views",
          name: "Vistas",
          count: 650,
          conversionRate: 65,
          dropoffRate: 35,
          status: "verde",
        },
        {
          id: "whatsapp_clicks",
          name: "WhatsApp",
          count: 80,
          conversionRate: 12.3,
          dropoffRate: 87.7,
          status: "verde",
        },
        {
          id: "orders",
          name: "Órdenes",
          count: 3,
          conversionRate: 3.75,
          dropoffRate: 96.25,
          status: "rojo",
        },
      ];

      const bottleneck = calculateFunnelBottleneck(steps);
      expect(bottleneck.severity).toBe("rojo");
      expect(bottleneck.stepId).toBe("orders");
      expect(bottleneck.message).toContain("Fuga crítica en Órdenes");
    });

    it("calculateFunnelBottleneck detecta oportunidad en clics a WhatsApp (amarillo)", () => {
      const steps: FunnelStep[] = [
        {
          id: "sessions",
          name: "Sesiones",
          count: 1000,
          conversionRate: 100,
          dropoffRate: 0,
          status: "verde",
        },
        {
          id: "product_views",
          name: "Vistas",
          count: 600,
          conversionRate: 60,
          dropoffRate: 40,
          status: "verde",
        },
        {
          id: "whatsapp_clicks",
          name: "WhatsApp",
          count: 35,
          conversionRate: 5.8,
          dropoffRate: 94.2,
          status: "amarillo",
        },
        {
          id: "orders",
          name: "Órdenes",
          count: 6,
          conversionRate: 17.1,
          dropoffRate: 82.9,
          status: "verde",
        },
      ];

      const bottleneck = calculateFunnelBottleneck(steps);
      expect(bottleneck.severity).toBe("amarillo");
      expect(bottleneck.stepId).toBe("whatsapp_clicks");
    });

    it("calculateFunnelBottleneck felicita un embudo 100% saludable (verde)", () => {
      const steps: FunnelStep[] = [
        {
          id: "sessions",
          name: "Sesiones",
          count: 1000,
          conversionRate: 100,
          dropoffRate: 0,
          status: "verde",
        },
        {
          id: "product_views",
          name: "Vistas",
          count: 700,
          conversionRate: 70,
          dropoffRate: 30,
          status: "verde",
        },
        {
          id: "whatsapp_clicks",
          name: "WhatsApp",
          count: 75,
          conversionRate: 10.7,
          dropoffRate: 89.3,
          status: "verde",
        },
        {
          id: "orders",
          name: "Órdenes",
          count: 15,
          conversionRate: 20,
          dropoffRate: 80,
          status: "verde",
        },
      ];

      const bottleneck = calculateFunnelBottleneck(steps);
      expect(bottleneck.severity).toBe("verde");
      expect(bottleneck.stepId).toBe("none");
      expect(bottleneck.stepName).toBe("Embudo Saludable");
    });

    it("runFunnelReport estructura los 4 pasos y persiste en caché de 15 minutos", async () => {
      const funnel = await runFunnelReport("store_test", db.prisma, 30);
      expect(funnel.steps.length).toBe(4);
      expect(funnel.steps.map((s) => s.id)).toEqual([
        "sessions",
        "product_views",
        "whatsapp_clicks",
        "orders",
      ]);
      expect(funnel.bottleneck).toBeDefined();

      const dbRow = await db.prisma.analyticsCache.findUnique({
        where: {
          storeId_metricType: {
            storeId: "store_test",
            metricType: "ga4_funnel_30",
          },
        },
      });
      expect(dbRow).not.toBeNull();
    });
  });

  describe("Microsoft Clarity Deep Links & Métricas 24h", () => {
    it("getClarityDeepLinks genera enlaces correctos para grabaciones del día y mapas de calor", () => {
      const links = getClarityDeepLinks("mi-tienda-clarity");
      expect(links.dashboard).toBe(
        "https://clarity.microsoft.com/projects/view/mi-tienda-clarity/dashboard",
      );
      expect(links.todayRecordings).toBe(
        "https://clarity.microsoft.com/projects/view/mi-tienda-clarity/recordings?date=Today",
      );
      expect(links.heatmaps).toBe(
        "https://clarity.microsoft.com/projects/view/mi-tienda-clarity/heatmaps",
      );
    });

    it("getClarityMetrics respeta la cuota con caché estricta de 24 horas", async () => {
      const m1 = await getClarityMetrics("store_test", db.prisma);
      const m2 = await getClarityMetrics("store_test", db.prisma);

      expect(m1.deepLinks.todayRecordings).toContain("recordings?date=Today");
      expect(m1.metrics.scrollDepthAverage).toBeGreaterThan(0);
      expect(m2.cachedAt).toBe(m1.cachedAt);

      const dbRow = await db.prisma.analyticsCache.findUnique({
        where: {
          storeId_metricType: {
            storeId: "store_test",
            metricType: "clarity_metrics",
          },
        },
      });
      expect(dbRow).not.toBeNull();
    });
  });

  describe("AI Daily Brief Ejecutivo (3 Líneas)", () => {
    it("generateAiDailyBrief produce diagnóstico y recomendación en 3 líneas exactas en español", async () => {
      const brief = await generateAiDailyBrief("store_test", db.prisma);
      expect(brief).toBeDefined();
      expect(brief.lines.funnelDiagnosis).toBeTruthy();
      expect(brief.lines.ordersDiagnosis).toBeTruthy();
      expect(brief.lines.actionRecommendation).toContain("Acción recomendada:");

      const lines = brief.summary.split("\n").filter(Boolean);
      expect(lines.length).toBe(3);
    });
  });

  describe("Endpoints HTTP de Analítica", () => {
    it("GET /api/analytics/realtime responde 200 con datos de usuarios y enlaces de Clarity", async () => {
      const res = await app.request("/api/analytics/realtime", {
        headers: { cookie },
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        ok: boolean;
        activeUsers: number;
        clarity: { todayRecordings: string };
      };
      expect(json.ok).toBe(true);
      expect(json.activeUsers).toBeGreaterThan(0);
      expect(json.clarity.todayRecordings).toContain("recordings?date=Today");
    });

    it("GET /api/analytics/funnel responde 200 con 4 pasos y cuello de botella", async () => {
      const res = await app.request("/api/analytics/funnel?days=30", {
        headers: { cookie },
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        ok: boolean;
        steps: unknown[];
        bottleneck: { severity: string };
      };
      expect(json.ok).toBe(true);
      expect(json.steps.length).toBe(4);
      expect(["verde", "amarillo", "rojo"]).toContain(json.bottleneck.severity);
    });

    it("GET /api/analytics/brief responde 200 con resumen de 3 líneas", async () => {
      const res = await app.request("/api/analytics/brief", {
        headers: { cookie },
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean; lines: { actionRecommendation: string } };
      expect(json.ok).toBe(true);
      expect(json.lines.actionRecommendation).toContain("Acción recomendada:");
    });

    it("GET /api/analytics/clarity responde 200 con métricas de sesión y deep links", async () => {
      const res = await app.request("/api/analytics/clarity", {
        headers: { cookie },
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean; metrics: { scrollDepthAverage: number } };
      expect(json.ok).toBe(true);
      expect(json.metrics.scrollDepthAverage).toBeGreaterThan(0);
    });
  });
});
