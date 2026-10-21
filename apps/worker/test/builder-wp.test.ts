import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDb } from "@traxo/db";
import { Hono } from "hono";
import { registerBuilderApi } from "../src/builder.ts";
import { createRuntime } from "../src/runtime.ts";

describe("Store Builder: Gutenberg patterns y publicación en WordPress", () => {
  let rt: Awaited<ReturnType<typeof createRuntime>>;
  let app: Hono;

  beforeEach(async () => {
    const db = await openDb({ dataDir: "memory://" });
    rt = await createRuntime(
      {
        TRAXO_DEMO: "1",
        MARKET: "VE",
        TRAXO_CURRENCY: "USD",
        TRAXO_SECONDARY_CURRENCY: "VES",
        TRAXO_BCV_RATE: "48.45",
      },
      { db },
    );
    app = new Hono();
    registerBuilderApi(app, rt);
  });

  afterEach(() => {
    delete process.env.MARKET;
  });

  it("el catálogo incluye el estilo botanico para Davebeauty", async () => {
    const res = await app.request("/api/builder/catalog");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { styles: Array<{ id: string; label: string }> };
    const botanico = json.styles.find((s) => s.id === "botanico");
    expect(botanico).toBeDefined();
    expect(botanico?.label).toContain("Botánico y Cosmética");
  });

  it("crea un proyecto WooCommerce y exporta bloques Gutenberg con templateLock contentOnly", async () => {
    // 1. Crear proyecto
    const createRes = await app.request("/api/builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: "Davebeauty K-Beauty",
        platform: "woocommerce",
        style: "botanico",
        tone: "profesional",
        tagline: "Cosmética coreana y bienestar botánico en Venezuela",
        ai: false,
      }),
    });
    expect(createRes.status).toBe(200);
    const created = (await createRes.json()) as { ok: boolean; project: { id: string } };
    expect(created.ok).toBe(true);
    const projId = created.project.id;

    // 2. Consultar bloques Gutenberg
    const gbRes = await app.request(`/api/builder/${projId}/gutenberg`);
    expect(gbRes.status).toBe(200);
    const gbJson = (await gbRes.json()) as { ok: boolean; html: string; templateLock: string };
    expect(gbJson.ok).toBe(true);
    expect(gbJson.templateLock).toBe("contentOnly");
    expect(gbJson.html).toContain('<!-- wp:group {"templateLock":"contentOnly"');
    expect(gbJson.html).toContain("Davebeauty K-Beauty");
    expect(gbJson.html).toContain("Pago Móvil");
    expect(gbJson.html).toContain("BCV");

    // 3. Consultar bundle de archivos para Astro Headless
    const bundleRes = await app.request(`/api/builder/${projId}/bundle`);
    expect(bundleRes.status).toBe(200);
    const bundleJson = (await bundleRes.json()) as {
      files: Record<string, string>;
      platform: string;
    };
    expect(bundleJson.platform).toBe("woocommerce");
    expect(bundleJson.files["gutenberg-pattern.html"]).toBeDefined();
    expect(bundleJson.files["src/theme/tokens.json"]).toBeDefined();
    expect(bundleJson.files["src/pages/index.astro"]).toBeDefined();

    // 4. Publicación en WordPress (simulada sin credenciales en prueba unitaria)
    const pubRes = await app.request(`/api/builder/${projId}/publish-wp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Landing K-Beauty" }),
    });
    expect(pubRes.status).toBe(200);
    const pubJson = (await pubRes.json()) as {
      ok: boolean;
      simulated: boolean;
      page: { title: string; status: string };
    };
    expect(pubJson.ok).toBe(true);
    expect(pubJson.page.title).toBe("Landing K-Beauty");

    // 5. Verificar que el proyecto pasó a estado 'subido'
    const projInDb = await rt.db.prisma.siteProject.findUniqueOrThrow({ where: { id: projId } });
    expect(projInDb.status).toBe("subido");
  });
});
