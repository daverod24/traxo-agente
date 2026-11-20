import type { PrismaClient, ProductCategory } from "@traxo/db";
import { z } from "zod";
import { executeAiCascade } from "../ai-provider.ts";
import { env } from "../env.ts";
import { generateDeterministicMarketing } from "./deterministic-engine.ts";

// -------------------------------------------------------------------------
// 1. ESQUEMAS ZOD DE SALIDA POR CANAL
// -------------------------------------------------------------------------

// Output para Meta Ads (CBO / Advantage+)
export const MetaAdsOutputSchema = z.object({
  channel: z.literal("meta_ads"),
  campaignName: z.string().min(1),
  hooks: z.array(z.string().min(1)).min(3).max(5),
  primaryTexts: z.array(z.string().min(1)).min(2).max(4),
  headlines: z.array(z.string().min(1)).min(3).max(5),
  visualPrompts: z.object({
    ratio4x5: z.string().min(1),
    ratio9x16: z.string().min(1),
    safeZoneText: z.string().min(1),
  }),
  utmTemplate: z.string().min(1),
});

// Output para Click-to-WhatsApp (COD Venezuela)
export const ClickToWhatsAppOutputSchema = z.object({
  channel: z.literal("click_to_whatsapp"),
  adCopy: z.string().min(1),
  prefilledWhatsAppMessage: z.string().min(1),
  closingScript: z.object({
    step1Greeting: z.string().min(1),
    step2PricingBimoneda: z.string().min(1), // USD + VES a BCV
    step3LogisticsConfirm: z.string().min(1), // Flash Courier / MRW / Zoom
  }),
});

// Output para TikTok Spark / UGC (Guion de 30s)
export const TikTokUgcOutputSchema = z.object({
  channel: z.literal("tiktok_ugc"),
  hooks0to3s: z.array(z.string().min(1)).min(3),
  script30s: z.array(
    z.object({
      timestamp: z.string().min(1),
      cameraCue: z.string().min(1),
      audioVoiceover: z.string().min(1),
      onScreenText: z.string().min(1),
    }),
  ),
  soundSuggestion: z.string().min(1),
});

// Unión discriminada por canal
export const MarketingGenerationOutputSchema = z.discriminatedUnion("channel", [
  MetaAdsOutputSchema,
  ClickToWhatsAppOutputSchema,
  TikTokUgcOutputSchema,
]);

export type MetaAdsOutput = z.infer<typeof MetaAdsOutputSchema>;
export type ClickToWhatsAppOutput = z.infer<typeof ClickToWhatsAppOutputSchema>;
export type TikTokUgcOutput = z.infer<typeof TikTokUgcOutputSchema>;
export type MarketingGenerationOutput = z.infer<typeof MarketingGenerationOutputSchema>;

// Esquema de entrada para generación
export const GenerateMarketingInputSchema = z.object({
  productId: z.string().min(1, "productId es requerido"),
  channel: z.enum(["meta_ads", "click_to_whatsapp", "tiktok_ugc"]),
  angle: z.string().default("direct_response_cod"),
  mode: z.enum(["explore", "refine"]).default("explore"),
  parentGenerationId: z.string().optional(),
  userInstruction: z.string().optional(),
});

export type GenerateMarketingInput = z.infer<typeof GenerateMarketingInputSchema>;

// -------------------------------------------------------------------------
// 2. GUARDRAILS SERVER-SIDE POR CATEGORÍA
// -------------------------------------------------------------------------

/**
 * Vocabulario tópico prohibido tajantemente para la categoría `oral_supplement`.
 * Suplementos orales nunca deben prometer absorción tópica en piel ni usar términos de maquillaje facial.
 */
export const ORAL_SUPPLEMENT_BANNED_TERMS = [
  "absorción en piel",
  "absorcion en piel",
  "textura ligera",
  "textura en crema",
  "textura en gel",
  "maquillaje",
  "#kbeautyve",
  "aplicar en el rostro",
  "aplicar sobre el rostro",
  "aplicar en la piel",
  "aplicar sobre la piel",
  "suero facial",
  "serum facial",
  "crema facial",
  "rutina de skincare facial",
  "limpieza facial",
  "poros dilatados",
  "acabado mate",
  "acabado satinado en la piel",
];

/**
 * Verifica si un texto infringe las reglas de categoría.
 */
export function checkCategoryGuardrails(
  text: string,
  category: ProductCategory | string,
): { ok: boolean; violatedTerms: string[] } {
  if (category === "oral_supplement") {
    const lower = text.toLowerCase();
    const violations = ORAL_SUPPLEMENT_BANNED_TERMS.filter((term) =>
      lower.includes(term.toLowerCase()),
    );
    return { ok: violations.length === 0, violatedTerms: violations };
  }
  return { ok: true, violatedTerms: [] };
}

/**
 * Valida recursivamente un objeto generado contra los guardrails de categoría.
 */
export function validateOutputGuardrails(
  output: unknown,
  category: ProductCategory | string,
): { ok: boolean; violatedTerms: string[] } {
  const text = typeof output === "string" ? output : JSON.stringify(output);
  return checkCategoryGuardrails(text, category);
}

/**
 * Sanitiza texto reemplazando términos tópicos por equivalentes digestivos/orales
 * en caso de que un LLM externo desobedezca las instrucciones.
 */
export function sanitizeCategoryContent(text: string, category: ProductCategory | string): string {
  if (category !== "oral_supplement") return text;

  let cleaned = text;
  cleaned = cleaned.replace(/absorci[oó]n en piel/gi, "asimilación digestiva y biodisponibilidad");
  cleaned = cleaned.replace(/textura ligera/gi, "fácil ingesta en cápsula");
  cleaned = cleaned.replace(/#kbeautyve/gi, "#bienestarve");
  cleaned = cleaned.replace(/maquillaje/gi, "cuidado celular");
  cleaned = cleaned.replace(
    /aplicar (?:en|sobre) (?:el rostro|la piel)/gi,
    "ingerir con un vaso de agua",
  );
  cleaned = cleaned.replace(/suero facial|serum facial|crema facial/gi, "suplemento nutricional");
  cleaned = cleaned.replace(/rutina de skincare facial/gi, "rutina de nutrición diaria");
  cleaned = cleaned.replace(/poros dilatados/gi, "nutrición celular");
  cleaned = cleaned.replace(/acabado mate/gi, "bienestar pleno");
  return cleaned;
}

// -------------------------------------------------------------------------
// 3. CONSTRUCTOR DE PROMPTS Y RESTRICCIONES NEGATIVAS (EXPLORE / REFINE)
// -------------------------------------------------------------------------

export interface ProductContext {
  id: string;
  title: string;
  category: ProductCategory | string;
  price?: number | null;
  description?: string | null;
  keyIngredients?: string[];
  commonObjections?: string[];
  packRules?: unknown;
}

export interface PromptBundle {
  systemPrompt: string;
  userPrompt: string;
}

export function buildMarketingPrompts(params: {
  product: ProductContext;
  channel: "meta_ads" | "click_to_whatsapp" | "tiktok_ugc";
  angle: string;
  mode: "explore" | "refine";
  pastGenerations?: Array<{ angle: string; outputJson: unknown }>;
  parentContent?: unknown;
  userInstruction?: string | null;
}): PromptBundle {
  const {
    product,
    channel,
    angle,
    mode,
    pastGenerations = [],
    parentContent,
    userInstruction,
  } = params;

  const bcvRate = env.TRAXO_BCV_RATE ?? 880.0;
  const priceUsd = ((product.price ?? 2499) / 100).toFixed(2);
  const priceVes = (((product.price ?? 2499) / 100) * bcvRate).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Guardrail de Categoría en el System Prompt
  let categoryGuardrailText = "";
  if (product.category === "oral_supplement") {
    categoryGuardrailText = `
⚠️ REGLA CRÍTICA Y GUARDRAIL OBLIGATORIO:
El producto es de categoría 'oral_supplement' (Suplemento de Ingesta Oral).
PROHIBIDO TERMINANTEMENTE:
- NO usar términos tópicos como "absorción en piel", "textura ligera", "crema", "suero", "cutis", "poros", "maquillaje", o "#kbeautyve".
- Toda la comunicación DEBE enfocarse en ingesta oral, cápsulas, polvo bebible o gomitas, salud digestiva, nutrición celular desde adentro, constancia diaria y toma con un vaso de agua fresca.
- Cualquier mención tópica descalificará tu respuesta inmediatamente.
`;
  } else if (product.category === "facial_skincare") {
    categoryGuardrailText = `
El producto es 'facial_skincare' (Cuidado Facial Tópico).
Enfócate en textura ligera, rápida absorción, hidratación profunda, efecto glow/glass skin, protección de la barrera cutánea y adaptación al clima cálido de Venezuela sin sensación grasa.
`;
  } else if (product.category === "haircare") {
    categoryGuardrailText = `
El producto es 'haircare' (Cuidado Capilar).
Enfócate en fuerza folicular, brillo, control de caída, puntas selladas y nutrición de raíz a puntas.
`;
  }

  // Estructura del canal requerida
  let channelInstructions = "";
  if (channel === "meta_ads") {
    channelInstructions = `
Canal: meta_ads (CBO / Advantage+ Direct Response).
Debes retornar un JSON con:
- "channel": "meta_ads"
- "campaignName": string descriptivo para Meta Ads Manager
- "hooks": array de 3 a 5 ganchos iniciales de alta retención
- "primaryTexts": array de 2 a 4 textos persuasivos usando la metodología AIDA (Atención, Interés, Deseo, Acción) adaptados al consumidor en Venezuela
- "headlines": array de 3 a 5 titulares cortos para los anuncios de Facebook/Instagram
- "visualPrompts": objeto con "ratio4x5", "ratio9x16" y "safeZoneText" para briefs de diseño y video
- "utmTemplate": string con plantilla UTM estándar
`;
  } else if (channel === "click_to_whatsapp") {
    channelInstructions = `
Canal: click_to_whatsapp (Conversión Directa por WhatsApp con Pago Contra Entrega en Venezuela).
Debes retornar un JSON con:
- "channel": "click_to_whatsapp"
- "adCopy": texto publicitario para el anuncio que invita al chat
- "prefilledWhatsAppMessage": mensaje pre-llenado que el cliente envía al abrir el chat
- "closingScript": objeto con:
  - "step1Greeting": saludo cordial confirmando ciudad y producto
  - "step2PricingBimoneda": explicación de precio bimoneda (USD $${priceUsd} y VES a tasa oficial BCV Bs. ${priceVes}) y escalera de packs (1x, 2x con 10% dto, 3x con envío gratis)
  - "step3LogisticsConfirm": confirmación de logística con Pago Contra Entrega (Flash Courier motorizado en Caracas, MRW / Zoom asegurado a nivel nacional)
`;
  } else {
    channelInstructions = `
Canal: tiktok_ugc (TikTok Spark Ads / UGC de 30 segundos).
Debes retornar un JSON con:
- "channel": "tiktok_ugc"
- "hooks0to3s": array de 3 o más ganchos de 0 a 3 segundos con interrupción de patrón
- "script30s": array con 4 escenas distribuidas en 30 segundos, cada una con "timestamp", "cameraCue", "audioVoiceover" y "onScreenText"
- "soundSuggestion": recomendación de estilo de audio o música en tendencia
`;
  }

  const systemPrompt = `Eres el Director de Performance Marketing y Copywriting de TraxoAgente para Davebeauty en Venezuela.
Especializado en Direct Response, comercio conversacional por WhatsApp, Pago Contra Entrega (COD) y contenido nativo para Meta y TikTok.
Tu objetivo es producir copies y briefs que maximicen la tasa de conversión (CR) y reduzcan el costo por adquisición (CPA).
Idioma: Español de Venezuela (es_VE), natural, cercano, profesional y altamente persuasivo.
${categoryGuardrailText}
${channelInstructions}
IMPORTANTE: Tu respuesta DEBE ser únicamente un objeto JSON válido que cumpla estrictamente con el esquema especificado, sin texto introductorio ni bloques de código markdown innecesarios.`;

  // Construcción del User Prompt según el modo
  let userPrompt = `DATOS DEL PRODUCTO:
- Nombre: ${product.title}
- Categoría: ${product.category}
- Precio USD: $${priceUsd}
- Precio Bolívares (Tasa BCV ${bcvRate}): Bs. ${priceVes}
- Descripción: ${product.description ?? "Producto premium disponible en Davebeauty"}
- Ingredientes clave: ${(product.keyIngredients ?? []).join(", ") || "Extractos botánicos certificados"}
- Objeciones comunes: ${(product.commonObjections ?? []).join(", ") || "Duda sobre envíos al interior y formas de pago"}
- Ángulo deseado: ${angle}
`;

  if (mode === "explore") {
    // Modo Explore: inyectar restricciones negativas de no-repetición de las últimas 5 generaciones
    if (pastGenerations.length > 0) {
      const pastAngles = pastGenerations.map((g) => g.angle).filter(Boolean);
      const pastSnippets: string[] = [];
      for (const g of pastGenerations) {
        if (typeof g.outputJson === "object" && g.outputJson !== null) {
          const obj = g.outputJson as Record<string, unknown>;
          if (Array.isArray(obj.hooks)) {
            pastSnippets.push(...(obj.hooks as string[]).slice(0, 2));
          }
          if (Array.isArray(obj.hooks0to3s)) {
            pastSnippets.push(...(obj.hooks0to3s as string[]).slice(0, 2));
          }
        }
      }

      userPrompt += `
MODO EXPLORE ACTIVO:
RESTRICCIONES NEGATIVAS (NO REPETICIÓN):
Para mantener la creatividad fresca y explorar nuevos territorios de conversión, ESTÁ PROHIBIDO repetir los siguientes ángulos y ganchos usados en generaciones previas:
- Ángulos anteriores: ${pastAngles.join(", ") || "N/A"}
- Ganchos anteriores a descartar: ${pastSnippets.slice(0, 8).join(" | ") || "N/A"}

Explora un ángulo completamente novedoso (ej. controversia constructiva, micro-rutina, mito vs realidad, urgencia de inventario COD, etc.).
`;
    } else {
      userPrompt += `\nMODO EXPLORE: Genera el primer set creativo para este producto con enfoque de máxima conversión COD en Venezuela.\n`;
    }
  } else if (mode === "refine") {
    // Modo Refine: tomar la generación previa como base y aplicar instrucción específica del usuario
    userPrompt += `
MODO REFINE ACTIVO:
Contenido previo de referencia:
${JSON.stringify(parentContent, null, 2)}

INSTRUCCIÓN ESPECÍFICA DEL USUARIO PARA EL REFINAMIENTO:
"${userInstruction ?? "Optimiza y haz más persuasivo el llamado a la acción y los primeros 3 segundos."}"

Aplica exactamente la instrucción del usuario manteniendo la misma estructura JSON del canal (${channel}).
`;
  }

  return { systemPrompt, userPrompt };
}

// -------------------------------------------------------------------------
// 4. SERVICIO PRINCIPAL: GENERACIÓN DE MARKETING CON CASCADA Y PERSISTENCIA
// -------------------------------------------------------------------------

export interface GenerateMarketingParams {
  storeId: string;
  product: ProductContext;
  input: GenerateMarketingInput;
  prisma?: PrismaClient;
}

export interface GenerateMarketingResult {
  data: MarketingGenerationOutput;
  provider: "gemini" | "grok" | "openrouter" | "claude" | "deterministic";
  model: string;
  latencyMs: number;
}

/**
 * Genera contenido de marketing con selección de canal, modo (explore/refine),
 * guardrails server-side por categoría y cascada resiliente a motor determinista.
 */
export async function generateMarketingCopy(
  params: GenerateMarketingParams,
): Promise<GenerateMarketingResult> {
  const { storeId, product, input, prisma } = params;
  const { channel, angle, mode, parentGenerationId, userInstruction } = input;

  // 1. Obtener historial previo para restricciones negativas (explore) o referencia (refine)
  let pastGenerations: Array<{ angle: string; outputJson: unknown }> = [];
  let parentContent: unknown = undefined;

  if (prisma) {
    try {
      if (mode === "explore") {
        pastGenerations = await prisma.marketingGeneration.findMany({
          where: {
            storeId,
            productId: product.id,
            channel,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            angle: true,
            outputJson: true,
          },
        });
      } else if (mode === "refine" && parentGenerationId) {
        const parentGen = await prisma.marketingGeneration.findUnique({
          where: { id: parentGenerationId },
          select: { outputJson: true },
        });
        if (parentGen) {
          parentContent = parentGen.outputJson;
        }
      }
    } catch (e) {
      console.warn("⚠️ No se pudo cargar el historial previo de marketing_generations:", e);
    }
  }

  // 2. Construir los prompts con guardrails y restricciones
  const { systemPrompt, userPrompt } = buildMarketingPrompts({
    product,
    channel,
    angle,
    mode,
    pastGenerations,
    parentContent,
    userInstruction,
  });

  // 3. Seleccionar el validador Zod correspondiente al canal
  const targetSchema =
    channel === "meta_ads"
      ? MetaAdsOutputSchema
      : channel === "click_to_whatsapp"
        ? ClickToWhatsAppOutputSchema
        : TikTokUgcOutputSchema;

  // 4. Fallback determinista local en caso de que todos los LLMs fallen
  const deterministicFallback = () =>
    generateDeterministicMarketing({
      productId: product.id,
      title: product.title,
      category: product.category,
      price: product.price,
      description: product.description,
      keyIngredients: product.keyIngredients,
      commonObjections: product.commonObjections,
      channel,
      angle,
      mode,
      parentContent,
      userInstruction,
    });

  // 5. Ejecutar la cascada de inferencia HTTP
  const result = await executeAiCascade({
    systemPrompt,
    userPrompt,
    schema: targetSchema,
    category: product.category,
    deterministicFallback,
  });

  return {
    data: result.data as MarketingGenerationOutput,
    provider: result.provider,
    model: result.model,
    latencyMs: result.latencyMs,
  };
}
