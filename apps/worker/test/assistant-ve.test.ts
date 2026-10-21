import { type Db, ensureDemoAdmin, openDb } from "@traxo/db";
import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerApi } from "../src/api.ts";
import { createApp } from "../src/app.ts";
import { answer, registerAssistantApi, snapshot, systemPromptForStore } from "../src/assistant.ts";
import { mountAuth } from "../src/auth.ts";
import { createRuntime, type Runtime } from "../src/runtime.ts";
import { ingestCarrierEvent } from "../src/tracking.ts";

let db: Db;
let rt: Runtime;
let app: Hono;
let cookie = "";

beforeAll(async () => {
  db = await openDb({ dataDir: "memory://" });
  rt = await createRuntime({ MARKET: "VE", TRAXO_CURRENCY: "USD" }, { db, rich: true });
  await ensureDemoAdmin(db, rt.storeId);
  app = createApp({
    db,
    bus: rt.bus,
    commerce: rt.commerceMap,
    onCarrierEvent: (tn, e) => ingestCarrierEvent(rt, tn, e),
  });
  mountAuth(app, rt, { demo: true });
  registerApi(app, rt);
  registerAssistantApi(app, rt);

  const r = await app.request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@traxo.demo", password: "traxo-demo" }),
    headers: { "content-type": "application/json" },
  });
  cookie = (r.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
}, 60_000);

afterAll(async () => db.close());

describe("asistente conversacional venezolanizado (Fase 8)", () => {
  it("responde sobre la tasa oficial BCV con tabla de conversión y KPIs", async () => {
    const s = await snapshot(db, "store_demo_beauty");
    const reply = answer(s, "¿Cuál es la tasa oficial del BCV hoy?");
    expect(reply.answer).toContain("Banco Central de Venezuela (BCV)");
    expect(reply.answer).toContain("48.45");
    expect(reply.answer).toMatch(/10\.00.*Bs\./);
    expect(reply.kpis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Tasa Oficial BCV", value: "Bs. 48.45" }),
        expect.objectContaining({ label: "Moneda Base", value: "USD ($)" }),
      ]),
    );
    expect(reply.sources).toContain("bcv");
  });

  it("responde sobre pagos pendientes de Pago Móvil, Zelle o USDT", async () => {
    const s = await snapshot(db, "store_demo_beauty");
    const reply = answer(s, "¿Cómo van los pagos móviles por conciliar?");
    expect(reply.sources).toContain("pagos");
    expect(reply.links).toEqual(expect.arrayContaining([expect.objectContaining({ view: "aprobaciones" })]));
    if (s.approvals.some((a) => /pago m[oó]vil|zelle|usdt/i.test(a.title))) {
      expect(reply.answer).toMatch(/pagos venezolanos esperando conciliación/);
      expect(reply.answer).toMatch(/processing/);
      expect(reply.answer).toMatch(/\+58/);
    } else {
      expect(reply.answer).toMatch(/No tienes pagos/);
    }
  });

  it("informa transportadoras locales de Venezuela (Flash Courier Dropi, MRW, Zoom, Tealca)", async () => {
    const s = await snapshot(db, "store_demo_beauty");
    const reply = answer(s, "¿Qué transportadoras uso en Venezuela?");
    expect(reply.answer).toMatch(/Flash Courier|Zoom|MRW|Tealca|paquetes/);
    expect(reply.sources).toContain("guías");
  });

  it("formatea métricas de ventas en bimoneda USD y Bolívares BCV", async () => {
    const s = await snapshot(db, "store_demo_cafe");
    const reply = answer(s, "¿Cuánto vendí esta semana?");
    expect(reply.answer).toMatch(/Café de Especialidad VE/);
    expect(reply.answer).toMatch(/\$ [\d.]+/);
    expect(reply.answer).toMatch(/Bs\. [\d.,]+ BCV/);
  });

  it("genera un system prompt adaptado a Venezuela con bimoneda y couriers locales", async () => {
    const sVe = await snapshot(db, "store_demo_beauty");
    const promptVe = systemPromptForStore(sVe);
    expect(promptVe).toContain("agente de Traxo para Venezuela");
    expect(promptVe).toContain("48.45 Bs./USD");
    expect(promptVe).toContain("Flash Courier (Dropi VE)");
    expect(promptVe).toContain("Pago Móvil, Zelle, USDT y contraentrega");
  });

  it("responde vía endpoint HTTP /api/assistant/ask respetando el storeId del header X-Store-Id", async () => {
    const askStore = async (storeId: string, question: string) => {
      const res = await app.request("/api/assistant/ask", {
        method: "POST",
        body: JSON.stringify({ question }),
        headers: {
          "content-type": "application/json",
          cookie,
          "x-store-id": storeId,
        },
      });
      expect(res.status).toBe(200);
      return res.json() as Promise<{ answer: string; mode: string }>;
    };

    // Pregunta a tienda de belleza
    const resBeauty = await askStore("store_demo_beauty", "¿Qué es lo que más se vende?");
    expect(resBeauty.answer).toMatch(/Davebeauty Sandbox VE/);

    // Pregunta a tienda de café
    const resCafe = await askStore("store_demo_cafe", "¿Qué es lo que más se vende?");
    expect(resCafe.answer).toMatch(/Café de Especialidad VE/);

    // Pregunta de tasa BCV en endpoint
    const resBcv = await askStore("store_demo_beauty", "tasa bcv");
    expect(resBcv.answer).toMatch(/48\.45/);
  });

  it("endpoint /api/assistant/suggestions retorna sugerencias venezolanas y tasa BCV", async () => {
    const res = await app.request("/api/assistant/suggestions", {
      headers: { cookie, "x-store-id": "store_demo_beauty" },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { suggestions: string[]; bcvRate?: number; currency?: string };
    expect(data.bcvRate).toBe(48.45);
    expect(data.currency).toBe("USD/VES");
    expect(data.suggestions).toContain("¿Cuál es la tasa oficial BCV hoy?");
  });
});
