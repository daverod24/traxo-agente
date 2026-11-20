import { useState } from "react";
import { useResource } from "./api.ts";
import { usd, vesFromUsd } from "./format.ts";
import type { Product } from "./types.ts";
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
    imageUrl: "https://davebeauty.daverod.tech/images/products/aceite-de-oregano-semilla-negra/premium-v1.webp",
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
      hookText: "🌿 ¿Inflamación constante? La fórmula botánica de orégano + semilla negra (Págalo al recibir en Caracas)",
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
    imageUrl: "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/167/17783019261000614740.webp",
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
      hookText: "🧬 ADN de Salmón PDRN Coreano: El secreto de la Glass Skin en Caracas (Pagas al recibir)",
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
    imageUrl: "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/93/17698802731000454694.webp",
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
      hookText: "⚡ ¿Agotamiento crónico y niebla mental? La fórmula de longevidad celular NAD+ (Entrega contra entrega en Caracas)",
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
    imageUrl: "https://davebeauty.daverod.tech/images/products/aceite-magico-reafirmante/luxury-v1-1200.webp",
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
      hookText: "✨ Piel más firme y tonificada sin sensación grasosa: Aceite Reafirmante Toque Seco (Pagas al recibir en Caracas)",
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
   COMPONENTE: CAMPAÑAS ESTRATÉGICAS (META ADS & WHATSAPP)
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
  const [platform, setPlatform] = useState<"meta" | "whatsapp" | "tiktok">("meta");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const item = STRATEGY_DATA.find((s) => s.sku === selectedSku) || STRATEGY_DATA[0];

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    ctx.toast(`Copiado: ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const fullCopyText = `${item.angles.aida.attention}\n\n${item.angles.aida.interest}\n\n${item.angles.aida.desire}\n\n${item.angles.aida.action}`;

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* Selector de Producto */}
      <div className="card" style={{ padding: 16 }}>
        <div className="caption" style={{ marginBottom: 8, fontWeight: 600 }}>
          Selecciona el producto estratégico a pautar:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {STRATEGY_DATA.map((p) => {
            const isSel = p.sku === item.sku;
            return (
              <button
                key={p.sku}
                type="button"
                onClick={() => onSelectSku(p.sku)}
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
                  style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
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
            className={`btn sm ${platform === "meta" ? "primary" : "ghost"}`}
            onClick={() => setPlatform("meta")}
          >
            <Icon name="spark" size={16} />
            Meta Ads (Advantage+ / CBO Web)
          </button>
          <button
            type="button"
            className={`btn sm ${platform === "whatsapp" ? "primary" : "ghost"}`}
            onClick={() => setPlatform("whatsapp")}
          >
            <Icon name="device" size={16} />
            Click-to-WhatsApp Funnel (COD)
          </button>
          <button
            type="button"
            className={`btn sm ${platform === "tiktok" ? "primary" : "ghost"}`}
            onClick={() => setPlatform("tiktok")}
          >
            <Icon name="play" size={16} />
            TikTok Ads (UGC / Spark)
          </button>
        </div>

        <ToneBadge tone={item.badgeTone}>{item.priorityTier}</ToneBadge>
      </div>

      {/* Grid de Rendimiento Financiero y Target CPA */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
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

      {/* Bloque Central de Creatividades y Copies */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        {/* Columna Izquierda: Hook y Copy AIDA */}
        <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Ángulo Publicitario & Copywriting</h2>
            <Button sm variant="ghost" icon="spark" onClick={() => copyToClipboard(fullCopyText, "Copy AIDA Completo")}>
              {copiedField === "Copy AIDA Completo" ? "¡Copiado!" : "Copiar Copy"}
            </Button>
          </div>

          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase" }}>
              Hook Primeros 3 Segundos (Video UGC o Imagen)
            </div>
            <div style={{ marginTop: 6, fontSize: "0.9rem", fontStyle: "italic", color: "var(--ink)" }}>
              {item.angles.hook3sAudio}
            </div>
            <div style={{ marginTop: 6, fontSize: "0.78rem", color: "var(--ink-muted)" }}>
              <strong>Visual:</strong> {item.angles.hook3sVisual}
            </div>
            <div style={{ marginTop: 4, fontSize: "0.78rem", color: "var(--ink-muted)" }}>
              <strong>Texto en pantalla:</strong> {item.angles.hookText}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.88rem" }}>
            <div>
              <span className="caption" style={{ fontWeight: 700, color: "var(--brand)" }}>
                [A - Atención]
              </span>
              <p style={{ margin: "2px 0 0" }}>{item.angles.aida.attention}</p>
            </div>
            <div>
              <span className="caption" style={{ fontWeight: 700, color: "var(--brand)" }}>
                [I - Interés]
              </span>
              <p style={{ margin: "2px 0 0" }}>{item.angles.aida.interest}</p>
            </div>
            <div>
              <span className="caption" style={{ fontWeight: 700, color: "var(--brand)" }}>
                [D - Deseo]
              </span>
              <p style={{ margin: "2px 0 0" }}>{item.angles.aida.desire}</p>
            </div>
            <div>
              <span className="caption" style={{ fontWeight: 700, color: "var(--brand)" }}>
                [A - Acción & Oferta COD]
              </span>
              <p style={{ margin: "2px 0 0" }}>{item.angles.aida.action}</p>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Prompts DALL-E & Generación */}
        <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Prompts para Anuncios de Alta Conversión</h2>
            {onGoDola && (
              <Button sm variant="primary" icon="spark" onClick={onGoDola}>
                Abrir en DALL-E
              </Button>
            )}
          </div>

          {/* Prompt 4:5 Feed */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--line)",
            }}
          >
            <div className="row between" style={{ alignItems: "center", marginBottom: 6 }}>
              <span className="badge tone-progress">Formato 4:5 · Feed Instagram & Meta Ads</span>
              <Button sm variant="ghost" onClick={() => copyToClipboard(item.angles.prompts.ratio4x5, "Prompt 4:5")}>
                {copiedField === "Prompt 4:5" ? "¡Copiado!" : "Copiar"}
              </Button>
            </div>
            <p className="mono" style={{ fontSize: "0.8rem", color: "var(--ink-muted)", margin: 0, lineHeight: 1.4 }}>
              {item.angles.prompts.ratio4x5}
            </p>
          </div>

          {/* Prompt 9:16 Stories/TikTok */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 8,
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--line)",
            }}
          >
            <div className="row between" style={{ alignItems: "center", marginBottom: 6 }}>
              <span className="badge tone-progress">Formato 9:16 · Stories, Reels & TikTok</span>
              <Button sm variant="ghost" onClick={() => copyToClipboard(item.angles.prompts.ratio9x16, "Prompt 9:16")}>
                {copiedField === "Prompt 9:16" ? "¡Copiado!" : "Copiar"}
              </Button>
            </div>
            <p className="mono" style={{ fontSize: "0.8rem", color: "var(--ink-muted)", margin: 0, lineHeight: 1.4 }}>
              {item.angles.prompts.ratio9x16}
            </p>
          </div>

          {/* Tips de Distribución para Venezuela */}
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(16, 185, 129, 0.06)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              fontSize: "0.82rem",
            }}
          >
            <strong style={{ color: "#10b981" }}>Táctica de Pauta en Venezuela:</strong>
            <p style={{ margin: "4px 0 0", color: "var(--ink-muted)" }}>
              Segmenta mujeres/hombres según avatar en Caracas, Miranda, Carabobo y Aragua. Destaca siempre{" "}
              <strong>«Pago al recibir con entrega en 24-48h»</strong> en la primera línea para romper el 100% de la
              objeción de desconfianza.
            </p>
          </div>
        </div>
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
            Priorización financiera basada en margen bruto Dropi, tolerancia ante fletes y elasticidad de AOV con packs.
          </p>
        </div>
      </div>

      {/* Cards de Productos Prioritarios */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
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
                  style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
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
                <span className="mono" style={{ fontWeight: 800, fontSize: "1.1rem", color: "#10b981" }}>
                  {p.budgetPct}%
                </span>
                <div className="caption">Pauta sug.</div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--ink-muted)", lineHeight: 1.45 }}>
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
                <div style={{ fontWeight: 700, color: "#10b981", fontSize: "0.95rem" }}>{p.pricing.marginPct}%</div>
              </div>
              <div>
                <div className="caption">Break-even</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>${p.economics.breakEvenCpa.toFixed(2)}</div>
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
                      <small style={{ color: "var(--muted)", fontSize: "0.75rem", display: "block" }}>
                        {vesFromUsd(p.price)}
                      </small>
                    </td>
                    <td className="right num">{p.unitsSold}</td>
                    <td className="right num">
                      <div>{usd(p.revenue)}</div>
                      <small style={{ color: "var(--muted)", fontSize: "0.75rem", display: "block" }}>
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
