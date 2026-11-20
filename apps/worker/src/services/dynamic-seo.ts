/**
 * Generador dinámico de SEO y AEO (Answer Engine Optimization) para TraxoAgente.
 * - Schema.org @graph JSON-LD para productos y funnels con ofertas bimoneda (USD y VES a tasa oficial BCV).
 * - robots.txt dinámico optimizado para rastreadores de IA (GPTBot, PerplexityBot, ClaudeBot).
 */

import { env } from "../env.ts";

export interface SchemaOrgOffer {
  "@type": "Offer";
  "@id": string;
  priceCurrency: "USD" | "VES";
  price: string;
  priceSpecification?: {
    "@type": "UnitPriceSpecification";
    price: string;
    priceCurrency: "VES";
    referenceQuantity: {
      "@type": "QuantitativeValue";
      value: "1";
      unitCode: "C62";
    };
  };
  priceValidUntil: string;
  availability: "https://schema.org/InStock" | "https://schema.org/OutOfStock";
  url: string;
  itemCondition: "https://schema.org/NewCondition";
  seller: {
    "@id": string;
  };
}

export interface SchemaOrgProduct {
  "@type": "Product";
  "@id": string;
  name: string;
  description: string;
  sku: string;
  image: string[];
  brand: {
    "@type": "Brand";
    name: string;
  };
  offers: SchemaOrgOffer[];
}

export interface SchemaOrgGraph {
  "@context": "https://schema.org";
  "@graph": Array<Record<string, unknown>>;
}

export interface SeoPrismaClient {
  funnel?: {
    findFirst(args: {
      where: { slug: string; storeId?: string };
      include?: { product?: boolean; store?: boolean };
    }): Promise<{
      slug: string;
      title: string;
      product?: {
        id: string;
        externalId: string;
        title: string;
        price: number;
        description: string | null;
        imageUrl: string | null;
      } | null;
      store?: {
        id: string;
        name: string;
        url: string;
      } | null;
    } | null>;
  };
  product?: {
    findFirst(args: {
      where: {
        OR?: Array<{ id?: string; externalId?: string }>;
        storeId?: string;
      };
      include?: { store?: boolean };
    }): Promise<{
      id: string;
      externalId: string;
      title: string;
      price: number;
      description: string | null;
      imageUrl: string | null;
      store?: {
        id: string;
        name: string;
        url: string;
      } | null;
    } | null>;
    findMany(args?: { where?: { storeId?: string }; include?: { store?: boolean } }): Promise<
      Array<{
        id: string;
        externalId: string;
        title: string;
        price: number;
        description: string | null;
        imageUrl: string | null;
        store?: {
          id: string;
          name: string;
          url: string;
        } | null;
      }>
    >;
  };
  store?: {
    findUnique(args: { where: { id: string } }): Promise<{
      id: string;
      name: string;
      url: string;
    } | null>;
  };
}

/**
 * Convierte un título en slug canónico URL.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

interface ResolvedProductInfo {
  id: string;
  sku: string;
  title: string;
  description: string;
  imageUrl: string;
  priceUsd: number;
  storeName: string;
  storeUrl: string;
}

/**
 * Resuelve la información del producto o funnel consultando Prisma o el catálogo de respaldo.
 */
async function resolveProductInfo(
  storeId: string,
  slug: string,
  prisma?: SeoPrismaClient | null,
): Promise<ResolvedProductInfo | null> {
  const normSlug = slug.toLowerCase().trim();

  // 1. Buscar en funnels
  if (prisma?.funnel) {
    try {
      const funnel = await prisma.funnel.findFirst({
        where: { slug: normSlug },
        include: { product: true, store: true },
      });
      if (funnel?.product) {
        return {
          id: funnel.product.id,
          sku: funnel.product.externalId || funnel.product.id,
          title: funnel.title || funnel.product.title,
          description: funnel.product.description || funnel.title,
          imageUrl: funnel.product.imageUrl || "",
          priceUsd: Number(funnel.product.price),
          storeName: funnel.store?.name || env.TRAXO_STORE_NAME || "Davebeauty",
          storeUrl: funnel.store?.url || env.TRAXO_STORE_URL || "https://davebeauty.com",
        };
      }
    } catch {
      // Ignorar y continuar con búsqueda de producto directo
    }
  }

  // 2. Buscar en productos por ID o externalId
  if (prisma?.product) {
    try {
      const prod = await prisma.product.findFirst({
        where: {
          OR: [{ externalId: normSlug }, { id: normSlug }],
        },
        include: { store: true },
      });
      if (prod) {
        return {
          id: prod.id,
          sku: prod.externalId || prod.id,
          title: prod.title,
          description: prod.description || prod.title,
          imageUrl: prod.imageUrl || "",
          priceUsd: Number(prod.price),
          storeName: prod.store?.name || env.TRAXO_STORE_NAME || "Davebeauty",
          storeUrl: prod.store?.url || env.TRAXO_STORE_URL || "https://davebeauty.com",
        };
      }

      // 3. Buscar por slug derivado del título
      const allProds = await prisma.product.findMany({
        include: { store: true },
      });
      for (const p of allProds) {
        if (slugify(p.title) === normSlug || slugify(p.externalId) === normSlug) {
          return {
            id: p.id,
            sku: p.externalId || p.id,
            title: p.title,
            description: p.description || p.title,
            imageUrl: p.imageUrl || "",
            priceUsd: Number(p.price),
            storeName: p.store?.name || env.TRAXO_STORE_NAME || "Davebeauty",
            storeUrl: p.store?.url || env.TRAXO_STORE_URL || "https://davebeauty.com",
          };
        }
      }
    } catch {
      // Fallback a catálogo demo
    }
  }

  // 4. Catálogo demo / respaldo estándar si coincide con Davebeauty o Magnesio
  if (
    normSlug.includes("magnesio") ||
    normSlug.includes("serum") ||
    normSlug === "254" ||
    normSlug === "prod_mag_pack"
  ) {
    return {
      id: "prod_mag_pack",
      sku: "254",
      title: "Pack Trío Magnesio Quelado (Citrato + Bisglicinato + Malato)",
      description:
        "Fórmula de máxima absorción para descanso profundo, balance muscular y energía mitocondrial.",
      imageUrl: "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/254/magnesio-trio.webp",
      priceUsd: 34,
      storeName: env.TRAXO_STORE_NAME || "Davebeauty",
      storeUrl: env.TRAXO_STORE_URL || "https://davebeauty.com",
    };
  }

  return null;
}

/**
 * Normaliza una URL asegurando protocolo https:// y sin barra final.
 */
function cleanUrl(rawUrl: string): string {
  let u = rawUrl.trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    u = `https://${u}`;
  }
  return u.replace(/\/$/, "");
}

/**
 * Genera el JSON-LD canónico Schema.org @graph para un producto con ofertas bimoneda (USD y VES a tasa oficial BCV).
 */
export async function generateProductSchema(
  storeId: string,
  slug: string,
  prisma?: SeoPrismaClient | null,
  customBcvRate?: number,
): Promise<SchemaOrgGraph | null> {
  const prod = await resolveProductInfo(storeId, slug, prisma);
  if (!prod) return null;

  const storeUrl = cleanUrl(prod.storeUrl);
  const productUrl = `${storeUrl}/producto/${slug}`;
  const usdPrice = prod.priceUsd;
  const bcvRate = customBcvRate ?? env.TRAXO_BCV_RATE ?? 880.0;
  const vesPrice = Number((usdPrice * bcvRate).toFixed(2));
  const validUntil = new Date(Date.now() + 365 * 86_400_000).toISOString().split("T")[0];

  const graph: SchemaOrgGraph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${storeUrl}/#organization`,
        name: prod.storeName,
        url: storeUrl,
        logo: `${storeUrl}/logo.png`,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "Customer Service",
          availableLanguage: ["es", "es-VE"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${storeUrl}/#website`,
        url: storeUrl,
        name: prod.storeName,
        publisher: {
          "@id": `${storeUrl}/#organization`,
        },
      },
      {
        "@type": "Product",
        "@id": `${productUrl}#product`,
        name: prod.title,
        description: prod.description,
        sku: prod.sku,
        image: prod.imageUrl ? [prod.imageUrl] : [],
        brand: {
          "@type": "Brand",
          name: prod.storeName,
        },
        offers: [
          {
            "@type": "Offer",
            "@id": `${productUrl}#offer-usd`,
            priceCurrency: "USD",
            price: usdPrice.toFixed(2),
            priceValidUntil: validUntil,
            availability: "https://schema.org/InStock",
            url: productUrl,
            itemCondition: "https://schema.org/NewCondition",
            seller: {
              "@id": `${storeUrl}/#organization`,
            },
          },
          {
            "@type": "Offer",
            "@id": `${productUrl}#offer-ves`,
            priceCurrency: "VES",
            price: vesPrice.toFixed(2),
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: vesPrice.toFixed(2),
              priceCurrency: "VES",
              referenceQuantity: {
                "@type": "QuantitativeValue",
                value: "1",
                unitCode: "C62",
              },
            },
            priceValidUntil: validUntil,
            availability: "https://schema.org/InStock",
            url: productUrl,
            itemCondition: "https://schema.org/NewCondition",
            seller: {
              "@id": `${storeUrl}/#organization`,
            },
          },
        ],
      },
    ],
  };

  return graph;
}

/**
 * Genera el archivo robots.txt optimizado para motores de búsqueda conversacionales (AEO / GEO).
 * Permite explicitamente a GPTBot, PerplexityBot y ClaudeBot mientras protege rutas administrativas.
 */
export function generateRobotsTxt(customStoreUrl?: string): string {
  const storeUrl = cleanUrl(customStoreUrl || env.TRAXO_STORE_URL || "https://davebeauty.com");

  return `# TraxoAgente AEO & Search Engine Robots Configuration
# Storefront: Davebeauty Venezuela (Bimoneda USD / Bs. BCV)

User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /checkout/
Disallow: /private/

# AI Search & Answer Engine Crawlers (AEO / GEO Permitted)
User-agent: GPTBot
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: ClaudeBot
Allow: /
Disallow: /api/
Disallow: /admin/

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: ${storeUrl}/sitemap.xml
`;
}
