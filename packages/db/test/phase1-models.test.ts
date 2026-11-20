import { describe, expect, it } from "vitest";
import { openDb } from "../src/client.ts";
import { ProductCategory } from "../src/index.ts";

describe("Phase 1 DB Models & Relations (SSOT Hardened)", () => {
  it("crea y consulta modelos enriquecidos de Product, MarketingGeneration, Funnel y AnalyticsCache", async () => {
    const db = await openDb({ dataDir: "memory://" });

    try {
      // 1. Crear Tienda
      const store = await db.prisma.store.create({
        data: {
          id: "store_davebeauty_phase1",
          name: "Davebeauty Phase1",
          platform: "woocommerce",
          url: "https://davebeauty.daverod.tech",
          settings: {},
        },
      });
      expect(store.id).toBe("store_davebeauty_phase1");

      // 2. Crear Producto con categoría y campos enriquecidos
      const product = await db.prisma.product.create({
        data: {
          id: "prod_magnesio_p1",
          storeId: store.id,
          externalId: "ext_magnesio_1",
          title: "Citrato de Magnesio Puro",
          price: 2499,
          cost: 1100,
          category: ProductCategory.oral_supplement,
          referenceImageUrl: "https://davebeauty.daverod.tech/magnesio.png",
          keyIngredients: ["Citrato de Magnesio", "Vitamina B6"],
          commonObjections: ["¿Es apto para veganos?", "¿Causa acidez?"],
          packRules: {
            "1x": { discountPct: 0 },
            "2x": { discountPct: 10 },
            "3x": { discountPct: 20, freeShipping: true },
          },
        },
      });
      expect(product.category).toBe(ProductCategory.oral_supplement);
      expect(product.keyIngredients).toEqual(["Citrato de Magnesio", "Vitamina B6"]);

      // 3. Crear MarketingGeneration relacionada a Store y Product
      const gen = await db.prisma.marketingGeneration.create({
        data: {
          id: "gen_mkt_1",
          storeId: store.id,
          productId: product.id,
          channel: "meta_ads",
          angle: "escasez_cod",
          mode: "explore",
          outputJson: {
            channel: "meta_ads",
            hooks: ["¿Cansancio crónico?", "Duerme profundo hoy"],
            headlines: ["Paga al recibir en toda Venezuela"],
          },
          provider: "gemini",
          model: "gemini-2.5-flash",
          latencyMs: 850,
          status: "generated",
        },
      });
      expect(gen.channel).toBe("meta_ads");
      expect(gen.status).toBe("generated");

      // 4. Crear Funnel / Landing
      const funnel = await db.prisma.funnel.create({
        data: {
          id: "funnel_magnesio_promo",
          storeId: store.id,
          slug: "promo-magnesio",
          title: "Oferta Exclusiva Citrato de Magnesio",
          productId: product.id,
          sectionsJson: [
            { id: "hero", active: true },
            { id: "packs", active: true },
          ],
          tokensJson: { primaryColor: "#d97706" },
          published: true,
        },
      });
      expect(funnel.slug).toBe("promo-magnesio");
      expect(funnel.published).toBe(true);

      // 5. Crear AnalyticsCache
      const cache = await db.prisma.analyticsCache.create({
        data: {
          id: "cache_ga4_realtime_1",
          storeId: store.id,
          metricType: "ga4_realtime",
          payloadJson: { activeUsers: 34, topCity: "Caracas" },
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      expect(cache.metricType).toBe("ga4_realtime");

      // 6. Consultar con include relacional
      const queriedProduct = await db.prisma.product.findUniqueOrThrow({
        where: { id: product.id },
        include: {
          generations: true,
          funnels: true,
        },
      });
      expect(queriedProduct.generations).toHaveLength(1);
      expect(queriedProduct.funnels).toHaveLength(1);
      expect(queriedProduct.generations[0]?.id).toBe("gen_mkt_1");
      expect(queriedProduct.funnels[0]?.slug).toBe("promo-magnesio");
    } finally {
      await db.close();
    }
  });
});
