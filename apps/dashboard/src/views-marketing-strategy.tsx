import { useEffect, useState } from "react";
import { post, useResource } from "./api.ts";
import { usd, vesFromUsd } from "./format.ts";
import type {
  ClickToWhatsAppOutput,
  MarketingGeneration,
  MetaAdsOutput,
  Product,
  TikTokUgcOutput,
} from "./types.ts";
import { Button, Icon, KpiCard, ToneBadge } from "./ui.tsx";
import type { Ctx } from "./views.tsx";

export interface StrategyItem {
  sku: string;
  name: string;
  category: string;
  priorityTier: string;
  badgeTone: "success" | "progress" | "attention" | "agent";
  budgetPct: number;
  role: string;
  imageUrl: string;
  pricing: {
    pvp: number;
    dropiCost: number;
    grossMargin: number;
    marginPct: number;
    packDuo: number;
    packTrio: number;
  };
  economics: {
    freightAvg: number;
    cogsTotal: number;
    netMarginCod: number;
    breakEvenCpa: number;
    breakEvenRoas: number;
    targetCpa: number;
    targetRoas: number;
  };
  whyPush: string;
  angles: {
    avatarPain: string;
    hook3sVisual: string;
    hook3sAudio: string;
    hookText: string;
    aida: {
      attention: string;
      interest: string;
      desire: string;
      action: string;
    };
    prompts: {
      ratio4x5: string;
      ratio9x16: string;
    };
  };
}

export const STRATEGY_DATA: StrategyItem[] = [
  {
    sku: "DB-WELL-OREG-60",
    name: "Aceite de Orégano Silvestre + Semilla Negra 6.000 mg",
    category: "Salud Digestiva & Inmunidad",
    priorityTier: "Tier 1 · Máxima Prioridad",
    badgeTone: "success",
    budgetPct: 40,
    role: "Caballo de Batalla (Volumen & Broad Ads)",
    imageUrl:
      "https://davebeauty.daverod.tech/images/products/aceite-de-oregano-semilla-negra/premium-v1.webp",
    pricing: {
      pvp: 24.99,
      dropiCost: 6.0,
      grossMargin: 18.99,
      marginPct: 76.0,
      packDuo: 43.99,
      packTrio: 61.99,
    },
    economics: {
      freightAvg: 5.5,
      cogsTotal: 11.5,
      netMarginCod: 12.9,
      breakEvenCpa: 12.9,
      breakEvenRoas: 1.94,
      targetCpa: 4.5,
      targetRoas: 5.55,
    },
    whyPush:
      "Es el producto con mayor margen porcentual del catálogo (76.0%) y el costo Dropi más económico ($6.00). La inflamación abdominal es un dolor masivo en Venezuela que permite correr audiencias abiertas (Broad) con un CPA muy económico ($3.50–$4.50).",
    angles: {
      avatarPain:
        "Inflamación abdominal constante, pesadez luego de comer, problemas digestivos crónicos, sobrecrecimiento bacteriano y defensas bajas causadas por el estrés y la calidad del agua.",
      hook3sVisual:
        "Toma en cocina venezolana mostrando abdomen inflamado cambiando de golpe a una toma en mano de las cápsulas doradas translúcidas.",
      hook3sAudio:
        "«¿Sientes la barriga hinchada todo el día sin importar lo que comas? Conoce el poder del orégano silvestre con semilla negra.»",
      hookText:
        "🌿 ¿Inflamación constante? La fórmula botánica de orégano + semilla negra (Págalo al recibir en Caracas)",
      aida: {
        attention:
          "¿Vives con pesadez, inflamación estomacal después de cada comida o bajas defensas que no te dejan rendir en tu día a día?",
        interest:
          "Descubre el poder sinérgico del Aceite de Orégano Silvestre + Semilla Negra (6.000 mg equivalencia) de Micro Ingredients. Aporta carvacrol puro y timoquinona activa para equilibrar tu microbiota intestinal y reforzar tus defensas naturales.",
        desire:
          "Olvídate del sabor picante y quemante del aceite líquido. Cápsulas blandas de fácil deglución, suaves con el estómago y listas para devolverte la ligereza estomacal y energía diaria.",
        action:
          "🍃 1 Frasco (60 cápsulas): $24.99 | ⭐ Pack Dúo (2 Frascos): $43.99 (Ahorras $6.00). Despacho Express en Caracas (24-48h) con PAGO CONTRA ENTREGA en efectivo $ o Pago Móvil BCV. Envíos nacionales por Zoom y MRW.",
      },
      prompts: {
        ratio4x5:
          "High-end botanical wellness commercial photography for Davebeauty, 4:5 portrait orientation. Authentic pouch/container of Micro Ingredients Oil of Oregano + Black Seed Oil 60 Softgels placed on a sculptural dark forest green ceramic tile and warm travertine plinth. Flanked by fresh wild oregano sprigs and a ceramic bowl with black cumin seeds. Earthy organic palette, warm ivory plaster, sage green. 35% empty space on right for text overlay. 8k resolution, no floating pills.",
        ratio9x16:
          "Photorealistic UGC wellness lifestyle scene, 9:16 vertical ratio. A relatable Venezuelan professional in their early 30s in a bright, modern Caracas kitchen, pouring a glass of clean water and holding a softgel supplement with a relaxed, relieved expression. Natural daylight, casual and aspirational. Clean top 15% and bottom 20% safe margin for social UI. Editorial documentary realism, no text.",
      },
    },
  },
  {
    sku: "DB-SKIN-MEDICUBE-PDRN",
    name: "Medicube Crema Cápsula Salmón ADN PDRN",
    category: "K-Beauty Skincare Facial",
    priorityTier: "Tier 1 · Core Estandarte",
    badgeTone: "success",
    budgetPct: 30,
    role: "Estandarte K-Beauty (Glass Skin Coreano)",
    imageUrl:
      "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/167/17783019261000614740.webp",
    pricing: {
      pvp: 26.99,
      dropiCost: 7.75,
      grossMargin: 19.24,
      marginPct: 71.3,
      packDuo: 47.99,
      packTrio: 64.99,
    },
    economics: {
      freightAvg: 5.5,
      cogsTotal: 13.25,
      netMarginCod: 13.3,
      breakEvenCpa: 13.3,
      breakEvenRoas: 2.03,
      targetCpa: 4.65,
      targetRoas: 5.8,
    },
    whyPush:
      "Apalanca la tendencia viral mundial del K-Beauty en Latinoamérica. Altísimo valor percibido; un PVP de $26.99 se siente muy competitivo frente a cremas de farmacia de $35+. Empujar el Pack Dúo ($47.99) para elevar el AOV con flete único.",
    angles: {
      avatarPain:
        "Envejecimiento prematuro, piel opaca y deshidratada por el agua dura y el calor de Caracas. Frustración con cremas grasosas que no se absorben y desconfianza en imitaciones cosméticas.",
      hook3sVisual:
        "Primer plano de espátula rompiendo una cápsula rosada de salmón sobre la piel, mostrando cómo se funde en efecto brillante Glass Skin.",
      hook3sAudio:
        "«¿Piel apagada y marchita por el sol y el agua de Caracas? Esto no es otra crema hidratante: es ADN de Salmón coreano en microcápsulas.»",
      hookText:
        "🧬 ADN de Salmón PDRN Coreano: El secreto de la Glass Skin en Caracas (Pagas al recibir)",
      aida: {
        attention:
          "¿Sientes que el estrés, el calor y el agua de Caracas le están quitando la juventud y luminosidad a tu rostro?",
        interest:
          "La tendencia más viral de Seúl llegó a Venezuela: la Crema Cápsula Salmón ADN PDRN de Medicube. Microcápsulas de PDRN puro de salmón y colágeno marino bioasimilable que redensifican la piel.",
        desire:
          "Cada cápsula se funde al instante sin dejar sensación grasosa. Restaura la elasticidad perdida, atenúa líneas de expresión y deja un acabado radiante Glass Skin desde las primeras noches de uso.",
        action:
          "🌸 Tratamiento Individual (1 Tarro): $26.99 | ✨ Pack Dúo Regenerador (2 Tarros): $47.99 (Ahorras $6.00). Despacho Express en Caracas (24-48h) con PAGO CONTRA ENTREGA (efectivo o Pago Móvil BCV). Envíos por MRW y Zoom a todo el país.",
      },
      prompts: {
        ratio4x5:
          "High-end commercial cosmetic product photography for Davebeauty, 4:5 portrait format. Luxury jar of Medicube PDRN Salmon Capsule Cream placed on an organic wet travertine pedestal. A delicate cosmetic spatula rests nearby holding a translucent, gleaming pink salmon-oil microcapsule with subtle pearlescent refraction. Warm ivory plaster background with gentle plum undertones, crisp directional softbox studio lighting, realistic soft contact shadows. Generous negative space on right 35% reserved for typography. 85mm lens, 8k resolution, no AI text.",
        ratio9x16:
          "Cinematic photorealistic beauty scene, 9:16 vertical composition. An attractive Venezuelan woman in her late 30s with healthy, luminous skin, applying a lightweight serum-cream to her cheek in front of a modern sunlit bathroom mirror in Caracas. Modern vanity, soft morning natural sunlight, warm highlights. Upper 15% and bottom 20% safe zones for UI. Editorial quality, no fake plastic smoothing, no text.",
      },
    },
  },
  {
    sku: "DB-WELL-NAD-60",
    name: "Nicotinamide Riboside + Resveratrol 900 mg (NAD+ Booster)",
    category: "Longevidad Celular & Energía",
    priorityTier: "Tier 2 · High-Ticket",
    badgeTone: "progress",
    budgetPct: 20,
    role: "Maximización de Margen ($19.50 ganancia unitaria)",
    imageUrl:
      "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/93/17698802731000454694.webp",
    pricing: {
      pvp: 28.0,
      dropiCost: 8.5,
      grossMargin: 19.5,
      marginPct: 69.6,
      packDuo: 51.99,
      packTrio: 69.99,
    },
    economics: {
      freightAvg: 5.5,
      cogsTotal: 14.0,
      netMarginCod: 13.5,
      breakEvenCpa: 13.5,
      breakEvenRoas: 2.07,
      targetCpa: 4.7,
      targetRoas: 5.95,
    },
    whyPush:
      "Genera la ganancia unitaria neta más alta en dólares ($19.50). Dirigido al segmento de alto poder adquisitivo (ejecutivos, emprendedores, personas 35+). Excelente para campañas de WhatsApp asistidas donde se resuelven dudas sobre biohacking y energía mitocondrial.",
    angles: {
      avatarPain:
        "Fatiga mental extrema a las 3:00 PM, levantarse cansado aún durmiendo 8 horas, pérdida de vitalidad física y dependencia de café que genera nerviosismo.",
      hook3sVisual:
        "Persona frotándose los ojos con cansancio frente a su laptop, cortando a toma enfocada y con energía sosteniendo el frasco de NAD+ Booster.",
      hook3sAudio:
        "«¿A las 3 de la tarde se te apaga el cerebro y el café ya no te hace nada? Tu cuerpo no necesita más cafeína: le falta NAD+ a nivel celular.»",
      hookText:
        "⚡ ¿Agotamiento crónico y niebla mental? La fórmula de longevidad celular NAD+ (Entrega contra entrega en Caracas)",
      aida: {
        attention:
          "¿Te despiertas cansado, sientes niebla mental para concentrarte y sientes que tu cuerpo ya no tiene la energía de antes?",
        interest:
          "La molécula de la energía celular ahora en Venezuela: Nicotinamide Riboside + Resveratrol 900 mg (NAD+ Booster). Activa la producción de ATP en tus mitocondrias y promueve la reparación celular.",
        desire:
          "Energía limpia y sostenida durante todo el día, sin taquicardias ni picos de azúcar. Mayor claridad mental, rendimiento laboral óptimo y apoyo contra el envejecimiento prematuro.",
        action:
          "🧬 1 Frasco (60 Cápsulas): $28.00 | ⚡ Pack Dúo Vitalidad (2 Frascos): $51.99. Recibe en Caracas en 24-48h y PAGA EN LA PUERTA DE TU CASA U OFICINA en divisas o Pago Móvil BCV. Despachos express por Zoom y MRW.",
      },
      prompts: {
        ratio4x5:
          "High-end longevity and cellular wellness product photography for Davebeauty, 4:5 vertical portrait. Container of Micro Ingredients Nicotinamide Riboside + Resveratrol 900 mg on a minimalist slate stone base. Deep midnight navy blue and rich graphite atmosphere with warm amber rim lighting. One clean glass of water beside it. Sophisticated biohacking aesthetic, luxury supplement editorial, tack-sharp focus, natural shadows, no sci-fi DNA graphics, no text.",
        ratio9x16:
          "Dynamic cinematic vertical lifestyle photograph, 9:16 ratio. A sharp Venezuelan professional in their early 40s in a contemporary minimalist Caracas office space, looking energized and focused working on a tablet. Bottle of NAD+ Booster sits subtly on the desk. Warm diffused natural daylight, city view in soft background. Top 15% and bottom 20% safe zones preserved. Photorealistic, 50mm lens.",
      },
    },
  },
  {
    sku: "DB-BODY-MAGIC-OIL",
    name: "Aceite Reafirmante Corporal Magic Oil 100 ml",
    category: "Skincare Corporal Reafirmante",
    priorityTier: "Tier 3 · Impulso Sensorial",
    badgeTone: "attention",
    budgetPct: 10,
    role: "Impulso Sensorial & Cross-Sell (TikTok UGC)",
    imageUrl:
      "https://davebeauty.daverod.tech/images/products/aceite-magico-reafirmante/luxury-v1-1200.webp",
    pricing: {
      pvp: 25.0,
      dropiCost: 6.5,
      grossMargin: 18.5,
      marginPct: 74.0,
      packDuo: 42.99,
      packTrio: 59.99,
    },
    economics: {
      freightAvg: 5.5,
      cogsTotal: 12.0,
      netMarginCod: 12.5,
      breakEvenCpa: 12.5,
      breakEvenRoas: 2.0,
      targetCpa: 4.3,
      targetRoas: 5.81,
    },
    whyPush:
      "Gran producto para demostraciones sensoriales rápidas en TikTok y Reels. Su tecnología de toque seco que no mancha la ropa resuelve la principal queja sobre aceites corporales en el clima cálido de Venezuela.",
    angles: {
      avatarPain:
        "Flacidez en abdomen y brazos tras postparto o pérdida de peso, y rechazo total a cremas o aceites viscosos que manchan la ropa o no se secan con el calor.",
      hook3sVisual:
        "Toma cenital aplicando 2 gotas en antebrazo y mostrando absorción seca en 5 segundos sin manchar una blusa blanca.",
      hook3sAudio:
        "«Si buscas reafirmar abdomen y brazos sin terminar pegajosa en este calor, mira cómo se absorbe este aceite reafirmante de toque seco.»",
      hookText:
        "✨ Piel más firme y tonificada sin sensación grasosa: Aceite Reafirmante Toque Seco (Pagas al recibir en Caracas)",
      aida: {
        attention:
          "¿La flacidez en abdomen, brazos o la piel de naranja te impiden sentirte 100% cómoda con tu ropa favorita?",
        interest:
          "Te presentamos Magic Oil (West Month 100 ml): fórmula botánica intensiva con rosa mosqueta regeneradora, aceite de almendras prensado en frío y activos reafirmantes que tensan la piel.",
        desire:
          "Tecnología exclusiva de toque seco: se absorbe en menos de 60 segundos sin manchar tu ropa ni dejar residuos grasosos. Ideal para masajes reafirmantes diarios tras la ducha.",
        action:
          "🧴 1 Frasco (100 ml): $25.00 | 💖 Pack Dúo (2 Frascos): $42.99 (Ahorras $7.00). Despacho express en Caracas con PAGO CONTRA ENTREGA en efectivo $ o Pago Móvil BCV. Envíos nacionales asegurados vía Zoom y MRW.",
      },
      prompts: {
        ratio4x5:
          "Luxury bodycare cosmetics product photography for Davebeauty, 4:5 vertical portrait. Amber glass pump dispenser bottle of Magic Reafirmante Body Oil 100 ml on a smooth travertine bathroom plinth next to a folded soft ivory towel. Soft sunlight skimming through sheer linen curtains casting diagonal shadows. Warm caramel and ivory tones, spa ambiance. Left 40% empty background for text overlay. 8k resolution, no AI text.",
        ratio9x16:
          "Intimate, photorealistic UGC bodycare scene, 9:16 vertical orientation. A Venezuelan woman in her late 20s in a bright, modern tropical bathroom, wearing an ivory silk robe, gently smoothing a fast-absorbing dry body oil onto her shoulder. Hydrated, radiant skin texture. Warm golden hour light, safe area preserved at top 15% and bottom 20% for UI. Editorial documentary quality, no text.",
      },
    },
  },
];

/* =========================================================================
   COMPONENTE: CAMPAÑAS ESTRATÉGICAS (META ADS, WHATSAPP & TIKTOK COCKPIT)
========================================================================= */
export function CampanasEstrategicas({
  ctx,
  selectedSku,
  onSelectSku,
  onGoDola,
}: {
  ctx: Ctx;
  selectedSku: string;
  onSelectSku: (sku: string) => void;
  onGoDola?: () => void;
}) {
  const [channel, setChannel] = useState<"meta_ads" | "click_to_whatsapp" | "tiktok_ugc">(
    "meta_ads",
  );
  const [mode, setMode] = useState<"explore" | "refine">("explore");
  const [userInstruction, setUserInstruction] = useState("");
  const [generating, setGenerating] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const item = STRATEGY_DATA.find((s) => s.sku === selectedSku) || STRATEGY_DATA[0];

  // Catálogo sincronizado desde el worker
  const products = useResource<Product[]>("/api/products", ctx.tick).data ?? [];
  const matchedProduct =
    products.find(
      (p) =>
        p.sku === item.sku || p.title.toLowerCase().includes(item.name.toLowerCase().slice(0, 15)),
    ) ?? products[0];

  // Historial de generaciones persistidas
  const generationsRes = useResource<{ ok: boolean; generations: MarketingGeneration[] }>(
    `/api/marketing/generations?channel=${channel}${matchedProduct ? `&productId=${matchedProduct.id}` : ""}`,
    ctx.tick,
  );
  const generations = generationsRes.data?.generations ?? [];

  const [selectedGenId, setSelectedGenId] = useState<string | null>(null);

  // Mantener sincronizado el selectedGenId con la última generación si cambia la lista
  useEffect(() => {
    if (
      generations.length > 0 &&
      (!selectedGenId || !generations.some((g) => g.id === selectedGenId))
    ) {
      setSelectedGenId(generations[0].id);
    }
  }, [generations, selectedGenId]);

  const activeGen = generations.find((g) => g.id === selectedGenId) ?? generations[0] ?? null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    ctx.toast(`Copiado: ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Acción: Generar Variación Fresca o Refinamiento
  const handleGenerate = async () => {
    if (!matchedProduct) {
      ctx.toast("Esperando sincronización de producto...");
      return;
    }
    setGenerating(true);
    try {
      const res = await post<{ ok: boolean; generation?: MarketingGeneration; error?: string }>(
        "/api/marketing/generate",
        {
          productId: matchedProduct.id,
          channel,
          angle: "ugc",
          mode,
          userInstruction: mode === "refine" ? userInstruction.trim() : undefined,
          parentGenerationId: mode === "refine" && activeGen ? activeGen.id : undefined,
        },
      );
      if (res.ok && res.generation) {
        ctx.toast(
          mode === "explore"
            ? "Variación fresca generada exitosamente"
            : "Refinamiento de copy completado",
        );
        if (mode === "refine") setUserInstruction("");
        generationsRes.reload();
        setSelectedGenId(res.generation.id);
        ctx.refresh();
      } else {
        ctx.toast(res.error ?? "No se pudo generar la variación de marketing");
      }
    } catch (err) {
      ctx.toast(`Error de conexión: ${(err as Error).message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Acción: Despachar a n8n con Firma HMAC
  const handleDispatchN8n = async () => {
    if (!activeGen) return;
    setDispatching(true);
    try {
      const res = await post<{ ok: boolean; message?: string; error?: string }>(
        `/api/marketing/${activeGen.id}/dispatch-n8n`,
        {},
      );
      if (res.ok) {
        ctx.toast("Campaña despachada hacia el pipeline n8n con firma HMAC");
        generationsRes.reload();
      } else {
        ctx.toast(res.error ?? "Error al despachar a n8n");
      }
    } catch (err) {
      ctx.toast(`Error al conectar con n8n: ${(err as Error).message}`);
    } finally {
      setDispatching(false);
    }
  };

  // Textos y datos para renderizar según la generación activa o el fallback estratégico
  const metaOutput =
    activeGen?.channel === "meta_ads" ? (activeGen.outputJson as MetaAdsOutput) : null;
  const waOutput =
    activeGen?.channel === "click_to_whatsapp"
      ? (activeGen.outputJson as ClickToWhatsAppOutput)
      : null;
  const tiktokOutput =
    activeGen?.channel === "tiktok_ugc" ? (activeGen.outputJson as TikTokUgcOutput) : null;

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* Selector de Producto Estratégico */}
      <div className="card" style={{ padding: 16 }}>
        <div className="caption" style={{ marginBottom: 8, fontWeight: 600 }}>
          Selecciona el producto estratégico a pautar:
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          {STRATEGY_DATA.map((p) => {
            const isSel = p.sku === item.sku;
            return (
              <button
                key={p.sku}
                type="button"
                onClick={() => {
                  onSelectSku(p.sku);
                  setSelectedGenId(null);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: isSel ? "rgba(16, 185, 129, 0.12)" : "var(--surface)",
                  border: isSel ? "1.5px solid #10b981" : "1px solid var(--line)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: isSel ? "#10b981" : "var(--ink)",
                    }}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>
                    {p.priorityTier.split("·")[0]} · {p.budgetPct}% Pauta
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selector de Canal / Objetivo */}
      <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className={`btn sm ${channel === "meta_ads" ? "primary" : "ghost"}`}
            onClick={() => {
              setChannel("meta_ads");
              setSelectedGenId(null);
            }}
          >
            <Icon name="spark" size={16} />
            Meta Ads (Advantage+ / CBO Web)
          </button>
          <button
            type="button"
            className={`btn sm ${channel === "click_to_whatsapp" ? "primary" : "ghost"}`}
            onClick={() => {
              setChannel("click_to_whatsapp");
              setSelectedGenId(null);
            }}
          >
            <Icon name="device" size={16} />
            Click-to-WhatsApp Funnel (COD)
          </button>
          <button
            type="button"
            className={`btn sm ${channel === "tiktok_ugc" ? "primary" : "ghost"}`}
            onClick={() => {
              setChannel("tiktok_ugc");
              setSelectedGenId(null);
            }}
          >
            <Icon name="play" size={16} />
            TikTok Ads (UGC / Spark)
          </button>
        </div>

        <ToneBadge tone={item.badgeTone}>{item.priorityTier}</ToneBadge>
      </div>

      {/* Barra de Control de IA: Modo Explore vs Refine y Despacho */}
      <div
        className="card"
        style={{
          padding: "14px 18px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <span className="caption" style={{ fontWeight: 700, color: "var(--ink)" }}>
              Modo de Generación:
            </span>
            <div className="row" style={{ gap: 6 }}>
              <button
                type="button"
                className={`btn sm ${mode === "explore" ? "primary" : "ghost"}`}
                onClick={() => setMode("explore")}
              >
                Variación Fresca (Anti-repetición)
              </button>
              <button
                type="button"
                className={`btn sm ${mode === "refine" ? "primary" : "ghost"}`}
                onClick={() => setMode("refine")}
              >
                Refinar con Instrucción
              </button>
            </div>
          </div>

          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <Button
              variant="primary"
              icon="spark"
              sm
              disabled={generating}
              onClick={handleGenerate}
            >
              {generating
                ? "Generando..."
                : mode === "explore"
                  ? "Generar Variación Fresca"
                  : "Aplicar Refinamiento"}
            </Button>

            {activeGen && (
              <Button
                variant={activeGen.status === "dispatched_n8n" ? "ghost" : "primary"}
                icon="arrow-right"
                sm
                disabled={dispatching || activeGen.status === "dispatched_n8n"}
                onClick={handleDispatchN8n}
              >
                {activeGen.status === "dispatched_n8n"
                  ? "✓ Despachado a n8n"
                  : dispatching
                    ? "Despachando..."
                    : "Despachar a n8n (Firma HMAC)"}
              </Button>
            )}
          </div>
        </div>

        {/* Input de instrucción para Modo Refine */}
        {mode === "refine" && (
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <input
              type="text"
              className="input"
              style={{ flex: 1, fontSize: "0.85rem" }}
              placeholder="Ej: Destacar que el delivery en Caracas se paga al recibir en efectivo $ o Pago Móvil BCV sin recargo..."
              value={userInstruction}
              onChange={(e) => setUserInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !generating && userInstruction.trim()) {
                  handleGenerate();
                }
              }}
            />
          </div>
        )}

        {/* Historial de Versiones */}
        {generations.length > 0 && (
          <div
            className="row between"
            style={{ alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 10 }}
          >
            <div className="row" style={{ gap: 6, alignItems: "center", overflowX: "auto" }}>
              <span className="caption" style={{ fontWeight: 600 }}>
                Versiones guardadas:
              </span>
              {generations.map((g, idx) => {
                const isSel = g.id === activeGen?.id;
                const vNum = generations.length - idx;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGenId(g.id)}
                    style={{
                      padding: "3px 9px",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      fontWeight: isSel ? 700 : 500,
                      background: isSel ? "var(--brand)" : "var(--surface-sunken)",
                      color: isSel ? "#ffffff" : "var(--ink)",
                      border: isSel ? "1px solid var(--brand)" : "1px solid var(--line)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>v{vNum}</span>
                    <span style={{ opacity: 0.75, fontSize: "0.7rem" }}>({g.provider})</span>
                  </button>
                );
              })}
            </div>

            {activeGen && (
              <div className="row" style={{ gap: 6, alignItems: "center" }}>
                <span className="badge tone-progress" style={{ fontSize: "0.7rem" }}>
                  {activeGen.model} · {(activeGen.latencyMs / 1000).toFixed(2)}s
                </span>
                {activeGen.status === "dispatched_n8n" && (
                  <span className="badge tone-success" style={{ fontSize: "0.7rem" }}>
                    Despachado a n8n
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid de Rendimiento Financiero y Target CPA */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <KpiCard
          hero
          label="Margen Bruto Unitario"
          value={`$${item.pricing.grossMargin.toFixed(2)}`}
          unit={`(${item.pricing.marginPct}%)`}
          hint={`PVP $${item.pricing.pvp.toFixed(2)} · Dropi $${item.pricing.dropiCost.toFixed(2)}`}
        />
        <KpiCard
          tone="amber"
          label="Break-Even CPA (COD Real)"
          value={`$${item.economics.breakEvenCpa.toFixed(2)}`}
          hint={`ROAS mínimo de equilibrio: ${item.economics.breakEvenRoas}x`}
        />
        <KpiCard
          tone="emerald"
          label="CPA Objetivo Escala (35%)"
          value={`$${item.economics.targetCpa.toFixed(2)}`}
          hint={`ROAS objetivo saludable: ${item.economics.targetRoas}x`}
        />
        <KpiCard
          tone="blue"
          label="Packs de Ahorro AOV"
          value={`Dúo $${item.pricing.packDuo.toFixed(2)}`}
          hint={`Trío $${item.pricing.packTrio.toFixed(2)} con Envío Gratis`}
        />
      </div>

      {/* Bloque Central de Creatividades y Copies Dinámicos */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 16,
        }}
      >
        {/* ================= CANAL 1: META ADS ================= */}
        {channel === "meta_ads" && (
          <>
            <div
              className="card"
              style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div className="row between" style={{ alignItems: "center" }}>
                <h2 style={{ fontSize: "1.05rem", margin: 0 }}>
                  Ganchos (Hooks) & Textos Principales
                </h2>
                <Button
                  sm
                  variant="ghost"
                  icon="spark"
                  onClick={() =>
                    copyToClipboard(
                      metaOutput
                        ? metaOutput.primaryTexts.join("\n\n")
                        : `${item.angles.aida.attention}\n\n${item.angles.aida.interest}\n\n${item.angles.aida.desire}\n\n${item.angles.aida.action}`,
                      "Copy Completo",
                    )
                  }
                >
                  {copiedField === "Copy Completo" ? "¡Copiado!" : "Copiar Textos"}
                </Button>
              </div>

              {/* Lista de Hooks */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#f59e0b",
                    textTransform: "uppercase",
                  }}
                >
                  Ganchos de 3 Segundos para Meta Ads
                </div>
                {(metaOutput
                  ? metaOutput.hooks
                  : [item.angles.hook3sAudio, item.angles.hookText]
                ).map((hook, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", fontStyle: "italic", flex: 1 }}>
                      {hook}
                    </span>
                    <Button
                      sm
                      variant="ghost"
                      onClick={() => copyToClipboard(hook, `Hook #${i + 1}`)}
                    >
                      {copiedField === `Hook #${i + 1}` ? "✓" : "Copiar"}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Textos Principales (Primary Texts) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "var(--brand)",
                    textTransform: "uppercase",
                  }}
                >
                  Textos Principales para Feed / Reels (CBO)
                </div>
                {(metaOutput
                  ? metaOutput.primaryTexts
                  : [
                      `${item.angles.aida.attention} ${item.angles.aida.interest}`,
                      `${item.angles.aida.desire} ${item.angles.aida.action}`,
                    ]
                ).map((text, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "var(--surface-sunken)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div className="row between" style={{ marginBottom: 4 }}>
                      <span className="caption" style={{ fontWeight: 700 }}>
                        Variación de Texto #{i + 1}
                      </span>
                      <Button
                        sm
                        variant="ghost"
                        onClick={() => copyToClipboard(text, `Texto #${i + 1}`)}
                      >
                        {copiedField === `Texto #${i + 1}` ? "✓" : "Copiar"}
                      </Button>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.83rem",
                        lineHeight: 1.45,
                        color: "var(--ink)",
                      }}
                    >
                      {text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Titulares (Headlines) */}
              {metaOutput && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "var(--ink-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Titulares de Botón (Headlines)
                  </div>
                  {metaOutput.headlines.map((hl, i) => (
                    <div
                      key={i}
                      className="row between"
                      style={{
                        alignItems: "center",
                        padding: "6px 10px",
                        background: "var(--bg)",
                        border: "1px solid var(--line)",
                        borderRadius: 6,
                      }}
                    >
                      <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{hl}</span>
                      <Button
                        sm
                        variant="ghost"
                        onClick={() => copyToClipboard(hl, `Titular #${i + 1}`)}
                      >
                        {copiedField === `Titular #${i + 1}` ? "✓" : "Copiar"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prompts Visuales Meta Ads */}
            <div
              className="card"
              style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div className="row between" style={{ alignItems: "center" }}>
                <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Prompts Creativos (4:5 y 9:16)</h2>
                {onGoDola && (
                  <Button sm variant="primary" icon="spark" onClick={onGoDola}>
                    Abrir en DALL-E
                  </Button>
                )}
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--line)",
                }}
              >
                <div className="row between" style={{ alignItems: "center", marginBottom: 6 }}>
                  <span className="badge tone-progress">
                    Formato 4:5 · Feed Instagram & Meta Ads
                  </span>
                  <Button
                    sm
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(
                        metaOutput?.visualPrompts.ratio4x5 || item.angles.prompts.ratio4x5,
                        "Prompt 4:5",
                      )
                    }
                  >
                    {copiedField === "Prompt 4:5" ? "¡Copiado!" : "Copiar"}
                  </Button>
                </div>
                <p
                  className="mono"
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--ink-muted)",
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {metaOutput?.visualPrompts.ratio4x5 || item.angles.prompts.ratio4x5}
                </p>
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--line)",
                }}
              >
                <div className="row between" style={{ alignItems: "center", marginBottom: 6 }}>
                  <span className="badge tone-progress">Formato 9:16 · Stories, Reels & Video</span>
                  <Button
                    sm
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(
                        metaOutput?.visualPrompts.ratio9x16 || item.angles.prompts.ratio9x16,
                        "Prompt 9:16",
                      )
                    }
                  >
                    {copiedField === "Prompt 9:16" ? "¡Copiado!" : "Copiar"}
                  </Button>
                </div>
                <p
                  className="mono"
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--ink-muted)",
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {metaOutput?.visualPrompts.ratio9x16 || item.angles.prompts.ratio9x16}
                </p>
              </div>

              {metaOutput?.visualPrompts.safeZoneText && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(16, 185, 129, 0.06)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    fontSize: "0.8rem",
                  }}
                >
                  <strong style={{ color: "#10b981" }}>Zona Segura & Texto en Imagen:</strong>
                  <p style={{ margin: "4px 0 0", color: "var(--ink-muted)" }}>
                    {metaOutput.visualPrompts.safeZoneText}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ================= CANAL 2: CLICK-TO-WHATSAPP COD ================= */}
        {channel === "click_to_whatsapp" && (
          <>
            <div
              className="card"
              style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div className="row between" style={{ alignItems: "center" }}>
                <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Anuncio Click-to-WhatsApp (COD)</h2>
                <Button
                  sm
                  variant="ghost"
                  onClick={() =>
                    copyToClipboard(
                      waOutput?.adCopy ||
                        `${item.angles.hookText}\n\n${item.angles.aida.attention}\n\n${item.angles.aida.action}`,
                      "Copy Anuncio WhatsApp",
                    )
                  }
                >
                  {copiedField === "Copy Anuncio WhatsApp" ? "¡Copiado!" : "Copiar Anuncio"}
                </Button>
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "rgba(37, 211, 102, 0.08)",
                  border: "1px solid rgba(37, 211, 102, 0.3)",
                }}
              >
                <div
                  className="caption"
                  style={{ fontWeight: 700, color: "#16a34a", marginBottom: 6 }}
                >
                  Copy del Anuncio en Meta (Optimizado para Clic a WhatsApp):
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.88rem",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {waOutput?.adCopy ||
                    `${item.angles.hookText}\n\n${item.angles.aida.attention}\n\nPagas en efectivo o Pago Móvil BCV al recibir en tus manos. Haz clic abajo para pedirlo.`}
                </p>
              </div>

              {/* Mensaje Pre-rellenado de WhatsApp */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--line)",
                }}
              >
                <div className="row between" style={{ alignItems: "center", marginBottom: 6 }}>
                  <span className="caption" style={{ fontWeight: 700 }}>
                    Mensaje Pre-rellenado que envía el cliente:
                  </span>
                  <Button
                    sm
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(
                        waOutput?.prefilledWhatsAppMessage ||
                          `¡Hola! Quiero pedir el producto ${item.name} con Pago Contra Entrega COD.`,
                        "Mensaje WhatsApp",
                      )
                    }
                  >
                    {copiedField === "Mensaje WhatsApp" ? "✓" : "Copiar"}
                  </Button>
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: "0.82rem",
                    background: "var(--bg)",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                  }}
                >
                  {waOutput?.prefilledWhatsAppMessage ||
                    `¡Hola! Vi el anuncio de ${item.name} y quiero aprovechar el descuento con Pago al Recibir. ¿Me dan información?`}
                </div>
              </div>
            </div>

            {/* Guion de Cierre de 3 Pasos */}
            <div
              className="card"
              style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}
            >
              <h2 style={{ fontSize: "1.05rem", margin: 0 }}>
                Guion de Cierre Asistido por WhatsApp
              </h2>
              <p className="caption" style={{ margin: 0 }}>
                Respuestas estandarizadas para el operador o agente Traxo en 3 pasos:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Paso 1: Saludo */}
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface-sunken)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <span className="badge tone-progress">Paso 1 · Saludo & Validación</span>
                    <Button
                      sm
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          waOutput?.closingScript.step1Greeting ||
                            `¡Hola! Con gusto te atiendo. Soy tu asesor de ${item.name}. Para enviarte tu paquete hoy mismo, ¿en qué ciudad y zona te encuentras?`,
                          "Paso 1 Saludo",
                        )
                      }
                    >
                      {copiedField === "Paso 1 Saludo" ? "✓" : "Copiar"}
                    </Button>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--ink)" }}>
                    {waOutput?.closingScript.step1Greeting ||
                      `¡Hola! Excelente decisión. Tenemos disponibilidad inmediata para despacho hoy mismo. ¿Te encuentras en Caracas o en otra ciudad de Venezuela?`}
                  </p>
                </div>

                {/* Paso 2: Presentación Bimoneda */}
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface-sunken)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <span className="badge tone-success">Paso 2 · Oferta Bimoneda (USD + BCV)</span>
                    <Button
                      sm
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          waOutput?.closingScript.step2PricingBimoneda ||
                            `1 Unidad: $${item.pricing.pvp} | Pack Dúo: $${item.pricing.packDuo} (Ahorras $${(item.pricing.pvp * 2 - item.pricing.packDuo).toFixed(2)}). Pagas al recibir en divisas o Pago Móvil a tasa oficial BCV.`,
                          "Paso 2 Precios",
                        )
                      }
                    >
                      {copiedField === "Paso 2 Precios" ? "✓" : "Copiar"}
                    </Button>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--ink)" }}>
                    {waOutput?.closingScript.step2PricingBimoneda ||
                      `1 Frasco: $${item.pricing.pvp} | ⭐ Pack Dúo: $${item.pricing.packDuo} (Recomendado). Aceptamos Pago Móvil a tasa BCV sin recargo o dólares en efectivo al recibir.`}
                  </p>
                </div>

                {/* Paso 3: Confirmación Logística */}
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface-sunken)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div className="row between" style={{ marginBottom: 4 }}>
                    <span className="badge tone-attention">
                      Paso 3 · Confirmación Logística Flash/MRW
                    </span>
                    <Button
                      sm
                      variant="ghost"
                      onClick={() =>
                        copyToClipboard(
                          waOutput?.closingScript.step3LogisticsConfirm ||
                            `Por favor indícanos: Nombre completo, teléfono, dirección exacta y punto de referencia. Te asignamos guía de inmediato.`,
                          "Paso 3 Logística",
                        )
                      }
                    >
                      {copiedField === "Paso 3 Logística" ? "✓" : "Copiar"}
                    </Button>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--ink)" }}>
                    {waOutput?.closingScript.step3LogisticsConfirm ||
                      `Para generar tu orden con Pago Contra Entrega, por favor facilítanos: Nombre, Teléfono, Dirección de entrega y Punto de referencia.`}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ================= CANAL 3: TIKTOK SPARK UGC ================= */}
        {channel === "tiktok_ugc" && (
          <div
            className="card"
            style={{
              padding: 18,
              gridColumn: "1 / -1",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div className="row between" style={{ alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.05rem", margin: 0 }}>
                  Guion TikTok UGC (30 Segundos con Marcas de Tiempo)
                </h2>
                <span className="caption">
                  Estructurado para máxima retención en los primeros 3 segundos.
                </span>
              </div>
              <Button
                sm
                variant="ghost"
                icon="spark"
                onClick={() => {
                  const scriptText = tiktokOutput
                    ? tiktokOutput.script30s
                        .map(
                          (s) =>
                            `[${s.timestamp}] (${s.cameraCue}) Audio: ${s.audioVoiceover} | Texto: ${s.onScreenText}`,
                        )
                        .join("\n\n")
                    : `[0:00-0:03] ${item.angles.hook3sVisual} - Audio: ${item.angles.hook3sAudio}\n\n[0:03-0:15] Demostración - Audio: ${item.angles.aida.interest}\n\n[0:15-0:30] Cierre y COD - Audio: ${item.angles.aida.action}`;
                  copyToClipboard(scriptText, "Guion Completo TikTok");
                }}
              >
                {copiedField === "Guion Completo TikTok" ? "¡Copiado!" : "Copiar Guion Completo"}
              </Button>
            </div>

            {/* Ganchos 0-3s */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#f59e0b",
                  textTransform: "uppercase",
                }}
              >
                Ganchos Visuales y Auditivos (0-3 segundos)
              </div>
              {(tiktokOutput
                ? tiktokOutput.hooks0to3s
                : [item.angles.hook3sAudio, item.angles.hook3sVisual]
              ).map((hook, i) => (
                <div
                  key={i}
                  className="row between"
                  style={{
                    padding: "8px 12px",
                    background: "rgba(245, 158, 11, 0.08)",
                    borderRadius: 8,
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", fontStyle: "italic" }}>{hook}</span>
                  <Button
                    sm
                    variant="ghost"
                    onClick={() => copyToClipboard(hook, `Gancho UGC #${i + 1}`)}
                  >
                    {copiedField === `Gancho UGC #${i + 1}` ? "✓" : "Copiar"}
                  </Button>
                </div>
              ))}
            </div>

            {/* Tabla de Guion 30s */}
            <div className="scroll-x">
              <table className="table" style={{ fontSize: "0.85rem" }}>
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Tiempo</th>
                    <th>Cámara & Acción Visual</th>
                    <th>Voz en Off (Audio)</th>
                    <th>Texto en Pantalla</th>
                  </tr>
                </thead>
                <tbody>
                  {(tiktokOutput
                    ? tiktokOutput.script30s
                    : [
                        {
                          timestamp: "0:00-0:03",
                          cameraCue: item.angles.hook3sVisual,
                          audioVoiceover: item.angles.hook3sAudio,
                          onScreenText: item.angles.hookText,
                        },
                        {
                          timestamp: "0:03-0:12",
                          cameraCue: "Primer plano del producto y modo de uso",
                          audioVoiceover: item.angles.aida.interest,
                          onScreenText: "Fórmula concentrada",
                        },
                        {
                          timestamp: "0:12-0:22",
                          cameraCue: "UGC mostrando beneficio y comodidad",
                          audioVoiceover: item.angles.aida.desire,
                          onScreenText: "Resultados reales",
                        },
                        {
                          timestamp: "0:22-0:30",
                          cameraCue: "Mano recibiendo paquete y pagando en puerta",
                          audioVoiceover: item.angles.aida.action,
                          onScreenText: "PAGA AL RECIBIR",
                        },
                      ]
                  ).map((step, idx) => (
                    <tr key={idx}>
                      <td className="mono" style={{ fontWeight: 700, color: "#10b981" }}>
                        {step.timestamp}
                      </td>
                      <td>{step.cameraCue}</td>
                      <td style={{ fontStyle: "italic" }}>"{step.audioVoiceover}"</td>
                      <td style={{ fontWeight: 600 }}>{step.onScreenText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {tiktokOutput?.soundSuggestion && (
              <div
                className="caption"
                style={{
                  padding: "8px 12px",
                  background: "var(--surface-sunken)",
                  borderRadius: 8,
                }}
              >
                🎵 <strong>Sugerencia de Audio / Tendencia:</strong> {tiktokOutput.soundSuggestion}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   COMPONENTE: RADAR QUÉ EMPUJAR (MÁRGENES Y ASIGNACIÓN DROPI)
========================================================================= */
export function RadarQueEmpujar({
  ctx,
  onSelectToCampaign,
}: {
  ctx: Ctx;
  onSelectToCampaign?: (sku: string) => void;
}) {
  const products = useResource<Product[]>("/api/products", ctx.tick).data ?? [];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row between" style={{ alignItems: "center" }}>
        <div>
          <h2>Matriz Estratégica de Asignación de Presupuesto</h2>
          <p className="caption" style={{ margin: "4px 0 0" }}>
            Priorización financiera basada en margen bruto Dropi, tolerancia ante fletes y
            elasticidad de AOV con packs.
          </p>
        </div>
      </div>

      {/* Cards de Productos Prioritarios */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {STRATEGY_DATA.map((p) => (
          <div
            key={p.sku}
            className="card"
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              border: p.priorityTier.includes("Tier 1")
                ? "1px solid rgba(16, 185, 129, 0.35)"
                : "1px solid var(--line)",
            }}
          >
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div className="row" style={{ gap: 12 }}>
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div>
                  <ToneBadge tone={p.badgeTone}>{p.priorityTier.split("·")[0]}</ToneBadge>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", marginTop: 4 }}>{p.name}</div>
                  <div className="caption">{p.category}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  className="mono"
                  style={{ fontWeight: 800, fontSize: "1.1rem", color: "#10b981" }}
                >
                  {p.budgetPct}%
                </span>
                <div className="caption">Pauta sug.</div>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: "0.83rem",
                color: "var(--ink-muted)",
                lineHeight: 1.45,
              }}
            >
              {p.whyPush}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--line)",
                textAlign: "center",
              }}
            >
              <div>
                <div className="caption">Margen %</div>
                <div style={{ fontWeight: 700, color: "#10b981", fontSize: "0.95rem" }}>
                  {p.pricing.marginPct}%
                </div>
              </div>
              <div>
                <div className="caption">Break-even</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                  ${p.economics.breakEvenCpa.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="caption">Target CPA</div>
                <div style={{ fontWeight: 700, color: "#60a5fa", fontSize: "0.95rem" }}>
                  ${p.economics.targetCpa.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="row between" style={{ alignItems: "center", marginTop: "auto" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--ink-muted)" }}>
                Rol: <strong>{p.role.split("(")[0]}</strong>
              </div>
              {onSelectToCampaign && (
                <Button sm variant="primary" icon="spark" onClick={() => onSelectToCampaign(p.sku)}>
                  Ver Anuncios & Prompts
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Historial de Ventas Reales */}
      {products.length > 0 && (
        <section className="card compact stack" style={{ marginTop: 10 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <h2>Historial de Catálogo Sincronizado ({products.length} productos)</h2>
          </div>
          <div className="scroll-x only-wide">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col" className="right">
                    Precio
                  </th>
                  <th scope="col" className="right">
                    Vendidos
                  </th>
                  <th scope="col" className="right">
                    Ingresos
                  </th>
                  <th scope="col" className="right">
                    Margen
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.title}</td>
                    <td className="right num">
                      <div>{usd(p.price)}</div>
                      <small
                        style={{ color: "var(--muted)", fontSize: "0.75rem", display: "block" }}
                      >
                        {vesFromUsd(p.price)}
                      </small>
                    </td>
                    <td className="right num">{p.unitsSold}</td>
                    <td className="right num">
                      <div>{usd(p.revenue)}</div>
                      <small
                        style={{ color: "var(--muted)", fontSize: "0.75rem", display: "block" }}
                      >
                        {vesFromUsd(p.revenue)}
                      </small>
                    </td>
                    <td className="right num">{p.marginPct != null ? `${p.marginPct}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
