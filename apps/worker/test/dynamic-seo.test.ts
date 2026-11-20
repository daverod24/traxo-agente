import { type Db, ensureDemoAdmin, openDb } from "@traxo/db";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { registerGrowthApi } from "../src/growth.ts";
import { createRuntime, type Runtime } from "../src/runtime.ts";
import { generateProductSchema, generateRobotsTxt, slugify } from "../src/services/dynamic-seo.ts";

describe("Dynamic SEO & AEO Engine", () => {
  let db: Db;
  let rt: Runtime;
  let app: Hono;

  beforeEach(async () => {
    db = await openDb({ dataDir: "memory://" });
    rt = await createRuntime({}, { db });
    await ensureDemoAdmin(db, rt.storeId);

    app = createApp({
      db,
      bus: rt.bus,
      commerce: rt.commerceMap,
    });
    registerGrowthApi(app, rt);
  });

  afterEach(async () => {
    await db.close();
  });

  describe("Generador de Slugs Canónicos", () => {
    it("slugify normaliza caracteres con acentos, eñes y caracteres especiales", () => {
      expect(slugify("Sérum Facial Vitamina C 30ml")).toBe("serum-facial-vitamina-c-30ml");
      expect(slugify("Kit Anti-Caída & Regeneración Capilar")).toBe(
        "kit-anti-caida-regeneracion-capilar",
      );
      expect(slugify("¡Oferta 2x1! Envío Gratis")).toBe("oferta-2x1-envio-gratis");
    });
  });

  describe("Schema.org @graph con Ofertas Bimoneda (USD / Bs. BCV)", () => {
    it("generateProductSchema computa correctamente la oferta dual con tasa BCV", async () => {
      // Sembrar un producto de prueba en DB
      await db.prisma.product.create({
        data: {
          id: "prod_serum_c",
          storeId: rt.storeId,
          externalId: "sku-serum-c",
          title: "Sérum Facial Vitamina C Davebeauty",
          price: 25, // $25 USD
          cost: 10,
          description: "Sérum iluminador con ácido hialurónico y vitamina C pura.",
        },
      });

      const bcvRate = 880.0;
      const schema = await generateProductSchema(rt.storeId, "sku-serum-c", db.prisma, bcvRate);

      expect(schema).not.toBeNull();
      expect(schema?.["@context"]).toBe("https://schema.org");
      expect(schema?.["@graph"].length).toBe(3);

      const orgNode = schema?.["@graph"].find((n) => n["@type"] === "Organization");
      expect(orgNode).toBeDefined();

      const productNode = schema?.["@graph"].find((n) => n["@type"] === "Product") as {
        name: string;
        offers: Array<{ priceCurrency: string; price: string }>;
      };
      expect(productNode).toBeDefined();
      expect(productNode.name).toBe("Sérum Facial Vitamina C Davebeauty");
      expect(productNode.offers.length).toBe(2);

      const usdOffer = productNode.offers.find((o) => o.priceCurrency === "USD");
      expect(usdOffer).toBeDefined();
      expect(usdOffer?.price).toBe("25.00");

      const vesOffer = productNode.offers.find((o) => o.priceCurrency === "VES");
      expect(vesOffer).toBeDefined();
      // 25 * 880 = 22000.00
      expect(vesOffer?.price).toBe("22000.00");
    });

    it("generateProductSchema resuelve por slug derivado del título", async () => {
      await db.prisma.product.create({
        data: {
          id: "prod_colageno",
          storeId: rt.storeId,
          externalId: "col-99",
          title: "Colágeno Hidrolizado Marino",
          price: 30,
        },
      });

      const schema = await generateProductSchema(
        rt.storeId,
        "colageno-hidrolizado-marino",
        db.prisma,
        800,
      );

      expect(schema).not.toBeNull();
      const productNode = schema?.["@graph"].find((n) => n["@type"] === "Product") as {
        name: string;
      };
      expect(productNode.name).toBe("Colágeno Hidrolizado Marino");
    });

    it("generateProductSchema devuelve null ante slugs inexistentes", async () => {
      const schema = await generateProductSchema(
        rt.storeId,
        "producto-totalmente-inexistente-xyz-12345",
        db.prisma,
      );
      expect(schema).toBeNull();
    });
  });

  describe("robots.txt AEO Optimizado para Motores de IA", () => {
    it("generateRobotsTxt incluye permisos para GPTBot, PerplexityBot y ClaudeBot", () => {
      const robots = generateRobotsTxt("https://davebeauty.com");

      expect(robots).toContain("User-agent: GPTBot");
      expect(robots).toContain("User-agent: PerplexityBot");
      expect(robots).toContain("User-agent: ClaudeBot");
      expect(robots).toContain("User-agent: ChatGPT-User");
      expect(robots).toContain("Disallow: /api/");
      expect(robots).toContain("Disallow: /admin/");
      expect(robots).toContain("Sitemap: https://davebeauty.com/sitemap.xml");
    });
  });

  describe("Endpoints Públicos de SEO", () => {
    it("GET /api/seo/schema/:slug devuelve JSON-LD 200 con cabecera application/ld+json", async () => {
      await db.prisma.product.create({
        data: {
          id: "prod_crema_noche",
          storeId: rt.storeId,
          externalId: "crema-noche",
          title: "Crema Hidratante Nocturna Botánica",
          price: 18,
        },
      });

      const res = await app.request(`/api/seo/schema/crema-noche?storeId=${rt.storeId}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/ld+json");

      const json = (await res.json()) as { "@graph": Array<{ "@type": string }> };
      expect(json["@graph"].some((n) => n["@type"] === "Product")).toBe(true);
    });

    it("GET /api/seo/schema/:slug responde 404 para productos inexistentes", async () => {
      const res = await app.request("/api/seo/schema/producto-fantasma-no-existe");
      expect(res.status).toBe(404);
      const json = (await res.json()) as { ok: boolean; error: string };
      expect(json.ok).toBe(false);
    });

    it("GET /api/seo/robots.txt responde 200 en texto plano", async () => {
      const res = await app.request("/api/seo/robots.txt");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/plain");
      const text = await res.text();
      expect(text).toContain("User-agent: GPTBot");
      expect(text).toContain("User-agent: PerplexityBot");
      expect(text).toContain("User-agent: ClaudeBot");
    });
  });
});
