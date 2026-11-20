import { z } from "zod";
import type { Palette, StoreDesign } from "./design.ts";
import { computePackLadder, type PackTier } from "./pack-ladder.ts";

export const FunnelBlockTypeSchema = z.enum([
  "hero",
  "beneficios",
  "packs_ladder",
  "productos",
  "historia",
  "prueba_social",
  "contraentrega",
  "faq",
  "whatsapp",
]);
export type FunnelBlockType = z.infer<typeof FunnelBlockTypeSchema>;

export const FunnelBlockSchema = z.object({
  id: z.string(),
  type: FunnelBlockTypeSchema,
  enabled: z.boolean().default(true),
  props: z.record(z.string(), z.unknown()).default({}),
});
export type FunnelBlock = z.infer<typeof FunnelBlockSchema>;

export const FunnelTokensSchema = z.object({
  brand: z.string(),
  tagline: z.string().optional(),
  style: z.string(),
  tone: z.string(),
  palette: z.object({
    bg: z.string(),
    surface: z.string(),
    text: z.string(),
    muted: z.string(),
    accent: z.string(),
    accentText: z.string(),
  }),
  fonts: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  bcvRate: z.number().default(880.0),
  contact: z.object({
    whatsapp: z.string().optional(),
  }),
});
export type FunnelTokens = z.infer<typeof FunnelTokensSchema>;

export interface UniversalFunnelPayload {
  id: string;
  slug: string;
  title: string;
  productId: string;
  published: boolean;
  sections: FunnelBlock[];
  tokens: FunnelTokens;
  packsLadder: PackTier[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Convierte un diseño de tienda canónico en bloques de funnel desacoplados listos para consumo Headless.
 */
export function designToFunnelBlocks(d: StoreDesign): FunnelBlock[] {
  const blocks: FunnelBlock[] = [];

  for (const s of d.sections) {
    switch (s) {
      case "hero":
        blocks.push({
          id: "block_hero",
          type: "hero",
          enabled: true,
          props: {
            headline: d.copy.headline,
            subheadline: d.copy.sub,
            ctaText: d.copy.cta,
            brand: d.brand,
          },
        });
        // Insertamos el bloque de PacksLadder inmediatamente después del Hero en los funnels de alta conversión
        blocks.push({
          id: "block_packs_ladder",
          type: "packs_ladder",
          enabled: true,
          props: {
            title: d.products[0]?.title ?? d.brand,
            basePrice: d.products[0]?.price ?? 24.99,
          },
        });
        break;

      case "beneficios":
        blocks.push({
          id: "block_beneficios",
          type: "beneficios",
          enabled: true,
          props: {
            benefits: [
              {
                title: "Pagos en Bolívares y Dólares",
                desc: "Pago Móvil a tasa oficial BCV, Zelle y USDT sin complicaciones.",
              },
              {
                title: "Envíos Flash Courier & MRW",
                desc: "Despacho directo desde almacén con guía inmediata nacional.",
              },
              {
                title: "Atención y Garantía",
                desc: "Asistencia directa vía WhatsApp y respaldo total en cada entrega.",
              },
            ],
          },
        });
        break;

      case "productos":
        blocks.push({
          id: "block_productos",
          type: "productos",
          enabled: true,
          props: {
            items: d.products,
          },
        });
        break;

      case "historia":
        blocks.push({
          id: "block_historia",
          type: "historia",
          enabled: Boolean(d.copy.story),
          props: {
            story: d.copy.story,
          },
        });
        break;

      case "prueba-social":
        blocks.push({
          id: "block_prueba_social",
          type: "prueba_social",
          enabled: true,
          props: {
            reviews: [],
          },
        });
        break;

      case "contraentrega":
        blocks.push({
          id: "block_contraentrega",
          type: "contraentrega",
          enabled: d.cod,
          props: {
            bannerText: "Recibe tu pedido en 24-48 horas y paga en la puerta de tu casa u oficina.",
          },
        });
        break;

      case "faq":
        blocks.push({
          id: "block_faq",
          type: "faq",
          enabled: d.copy.faq.length > 0,
          props: {
            items: d.copy.faq,
          },
        });
        break;

      case "whatsapp":
        blocks.push({
          id: "block_whatsapp",
          type: "whatsapp",
          enabled: Boolean(d.contact.whatsapp),
          props: {
            phone: d.contact.whatsapp,
          },
        });
        break;
    }
  }

  return blocks;
}

/**
 * Construye la carga canónica de Funnel para almacenar en PostgreSQL y exponer vía API.
 */
export function buildUniversalFunnel(params: {
  id: string;
  slug: string;
  productId: string;
  design: StoreDesign;
  bcvRate?: number;
  published?: boolean;
}): UniversalFunnelPayload {
  const { id, slug, productId, design, bcvRate = 880.0, published = false } = params;
  const blocks = designToFunnelBlocks(design);
  const primaryProduct = design.products[0] ?? { title: design.brand, price: 24.99 };
  const unitPriceUsd =
    primaryProduct.price > 1000 ? primaryProduct.price / 100 : primaryProduct.price;

  const packsLadder = computePackLadder({
    productTitle: primaryProduct.title,
    basePriceUsd: unitPriceUsd,
    bcvRate,
    whatsappNumber: design.contact.whatsapp,
  });

  const tokens: FunnelTokens = {
    brand: design.brand,
    tagline: design.tagline,
    style: design.style,
    tone: design.tone,
    palette: design.palette,
    fonts: design.fonts,
    bcvRate,
    contact: {
      whatsapp: design.contact.whatsapp,
    },
  };

  return {
    id,
    slug,
    title: design.brand,
    productId,
    published,
    sections: blocks,
    tokens,
    packsLadder,
  };
}
