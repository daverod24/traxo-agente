import { useState } from "react";
import { cop, vesFromUsd } from "./format.ts";
import { Banner, Button, Icon, Tabs } from "./ui.tsx";
import type { Ctx } from "./views.tsx";

export interface DolaCreativeKit {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  priceUsd: number;
  badge: string;
  origin: string;
  delivery: string;
  keyIngredients: string;
  imagePrompt: string;
  ugcScript: {
    hook: string;
    problem: string;
    solution: string;
    demo: string;
    offer: string;
    cta: string;
  };
  copyMeta: string;
  copyTiktok: string;
  audiencesVe: {
    target: string;
    interests: string[];
    locations: string;
  };
}

export const DAVEBEAUTY_KITS: DolaCreativeKit[] = [
  {
    id: "oregano",
    name: "Aceite de orégano con semilla negra",
    subtitle: "Micro Ingredients · 60 Cápsulas Blandas (6.000 mg Herbal)",
    category: "Bienestar & Inmunidad",
    priceUsd: 22.99,
    badge: "Bestseller Salud",
    origin: "Estados Unidos (Micro Ingredients)",
    delivery: "Entrega inmediata Caracas / 24-48h Nacional",
    keyIngredients: "Aceite concentrado de orégano salvaje (Carvacrol) + Aceite virgen de semilla negra (Nigella sativa)",
    imagePrompt:
      "Fotografía publicitaria de producto estilo editorial hiperrealista e-commerce para redes sociales. Un frasco de suplemento ámbar translúcido etiquetado 'Oil of Oregano + Black Seed Oil, 6000 mg Herbal Equivalent, 60 Softgels' de Micro Ingredients sobre un pedestal de mármol blanco mate y madera clara. Al lado del frasco descansan hojas frescas de orégano verde con pequeñas gotas de agua cristalinas y semillas negras de Nigella sativa esparcidas artísticamente. Una cápsula blanda dorada y translúcida brilla en primer plano reflejando una luz cálida suave de estudio. Fondo difuminado de spa botánico y cocina moderna luminosa. Estilo publicitario de alta gama, iluminación cinematográfica suave, textura 8K nítida, ultra detallado, sin distorsión de texto.",
    ugcScript: {
      hook: "¡Por favor deja de tomar aceite de orégano en gotas que te quema la garganta! 🛑 Mira esta solución.",
      problem: "¿Sientes pesadez e inflamación después de cada comida o te enfermas con cualquier cambio de clima en Venezuela?",
      solution: "Este es el secreto mejor guardado: cápsulas blandas de Aceite de Orégano salvaje con Semilla Negra. Tienen 6.000 mg de concentración botánica pura, pero en softgels que NO saben a nada ni arden al tragar.",
      demo: "Te tomas una cápsula con agua al día y dile adiós a la hinchazón estomacal; apoya la digestión, combate bacterias y te blinda las defensas al 100%.",
      offer: "100% original americano en Davebeauty por solo $23 USD o su equivalente oficial en Bolívares a tasa oficial BCV. Puedes pagar con Pago Móvil o Zelle.",
      cta: "Tenemos delivery en Caracas y envíos rápidos por MRW y Zoom a toda Venezuela. Toca el botón y escríbenos al WhatsApp antes de que se agoten.",
    },
    copyMeta: `🌿 ¿Sabías que el Aceite de Orégano y la Semilla Negra forman el escudo antibacteriano y digestivo más potente de la naturaleza? 🛡️✨

Si sufres de hinchazón después de comer, pesadez estomacal o defensas bajas, esta fórmula botánica de Micro Ingredients es para ti:

✅ 6.000 mg de equivalencia herbal concentrada en cápsulas blandas (softgels).
✅ Sin el sabor fuerte ni el ardor del aceite de orégano líquido en gotas.
✅ Apoya el equilibrio digestivo, flora intestinal y defensas inmunológicas.
✅ Máxima absorción celular y pureza garantizada.

📍 Disponible en Davebeauty con entrega coordinada.
💵 Precio: $22.99 USD (o en Bolívares al cambio oficial BCV).
📲 Paga cómodo con Pago Móvil, Zelle o Binance Pay (USDT).
🛵 Delivery en Caracas y despachos nacionales por MRW, Zoom y Tealca.

👉 ¡Haz clic en 'Enviar mensaje' y asegura tu frasco hoy por WhatsApp!`,
    copyTiktok: `¡Dile adiós al sabor amargo del aceite de orégano! 🙅‍♀️🌿 Estas cápsulas blandas de orégano + semilla negra desinflaman tu abdomen y blindan tus defensas en minutos. 6.000 mg de pura salud botánica sin ardor. ✨ Solo $23 USD / Pago Móvil tasa BCV. Delivery en Caracas y envíos MRW en toda Venezuela 🇻🇪📦 Pídelo al WhatsApp en el link del perfil. #aceitedeoregano #bienestarvenezuela #caracas #saludnatural #pagomovil #davebeauty`,
    audiencesVe: {
      target: "Hombres y mujeres de 25 a 55 años interesados en bienestar, salud digestiva, fitoterapia y medicina preventiva.",
      interests: ["Suplementos dietéticos", "Salud digestiva", "Vida saludable", "Nutrición holística"],
      locations: "Caracas (delivery prioritario) + Grandes ciudades (Valencia, Maracaibo, Barquisimeto, Maracay, Lechería).",
    },
  },
  {
    id: "melaxin",
    name: "Dr. Melaxin Calcium Volume Multi Balm",
    subtitle: "K-Beauty · Barra Stick Giratoria de 9g Antiedad & Firmeza",
    category: "Skincare K-Beauty",
    priceUsd: 22.0,
    badge: "Viral K-Beauty",
    origin: "Corea del Sur (Dr. Melaxin)",
    delivery: "Entrega inmediata Caracas / 24-48h Nacional",
    keyIngredients: "Bio-calcio dérmico patentado, Péptidos voluminizadores, Fitoceramidas",
    imagePrompt:
      "Fotografía cosmética comercial de lujo estilo K-Beauty coreano para anuncio de Instagram. En primer plano, la barra stick giratoria elegante de Dr. Melaxin 'Calcium Volume Multi Balm 9g' destapada mostrando la textura suave y translúcida del bálsamo color marfil perlado. El envase reposa sobre un bloque de cuarzo rosa con sutiles reflejos de luz y gotas de rocío fresco. Al fondo, un halo de luz dorada sutil y pétalos de flores de loto coreanas desenfocadas. Iluminación limpia de belleza de alta costura, piel coreana de porcelana sugerida en el reflejo, estilo premium, estética sofisticada, 8k ultra nítida.",
    ugcScript: {
      hook: "Si tienes más de 30 años y no quieres inyectarte nada en el cuello o la frente... tienes que ver esto.",
      problem: "A partir de los 30 la piel pierde calcio y elasticidad. Y las cremas pesadas en el calor de Venezuela solo te ponen la cara grasosa y arruinan el maquillaje.",
      solution: "Este es el famoso Calcium Volume Multi Balm de Dr. Melaxin, K-Beauty 100% original de Corea del Sur. Contiene bio-calcio dérmico y péptidos voluminizadores en un stick ultra portátil.",
      demo: "Te lo pasas en 3 segundos por el cuello, patas de gallo y pómulos, incluso sobre el maquillaje. Rellena visualmente las líneas y te da ese efecto 'Glass Skin' coreano sin residuo pegajoso.",
      offer: "En Davebeauty lo tienes por solo $22 USD o en Bolívares al cambio oficial BCV. Pagas seguro con Pago Móvil, Zelle o USDT.",
      cta: "Envío exprés en Caracas y a toda Venezuela por Tealca, Zoom y MRW. Toca el botón y pide el tuyo al WhatsApp.",
    },
    copyMeta: `✨ ¿Líneas de expresión en cuello, frente o contorno de ojos? Conoce el secreto de belleza coreano que está revolucionando el skincare en Venezuela 🇰🇷💆‍♀️

El Dr. Melaxin Calcium Volume Multi Balm aporta bio-calcio concentrado y péptidos directamente a las zonas que más pierden firmeza:

🌸 Formato stick retráctil ultra cómodo de 9g (cabe en cualquier cartera).
🌸 Relleno visible e hidratación profunda al instante.
🌸 Efecto 'Glass Skin' radiante sin dejar residuo pegajoso ni pesado.
🌸 Ideal para reaplicar durante el día, incluso sobre el maquillaje.

📦 100% K-Beauty Original importado directamente.
💲 Solo $22.00 USD (equivalente en Bs. a tasa oficial BCV).
💳 Métodos de pago: Pago Móvil, Zelle y Binance Pay (USDT).
🚚 Despachos diarios en Caracas y envíos nacionales por MRW, Zoom y Tealca.

👉 ¡Escríbenos por WhatsApp tocando el botón y luce una piel más firme hoy mismo!`,
    copyTiktok: `¡El botox coreano en barra que todas están usando! 😍🇰🇷 Desliza el stick de Dr. Melaxin en cuello, frente y patas de gallo para un glow y firmeza instantáneos. No es grasoso, cabe en tu cartera y cuesta solo $22 USD (Pago Móvil a tasa oficial BCV). Envíos a toda Venezuela 🇻🇪✨ Pide el tuyo en el enlace del perfil. #skincarecoreano #kbeautyvenezuela #drmelaxin #caracas #antiedad #pagomovil`,
    audiencesVe: {
      target: "Mujeres de 28 a 55 años interesadas en antiedad, skincare coreano, colágeno y rejuvenecimiento facial.",
      interests: ["Cosmética coreana", "Antienvejecimiento", "Cuidado de la piel", "Rutina facial"],
      locations: "Toda Venezuela: Caracas, San Cristóbal, Valencia, Maracaibo, Maracay, Barquisimeto.",
    },
  },
  {
    id: "botalab",
    name: "Botalab Deserticola Water Treatment Shampoo",
    subtitle: "RIMAN Korea · 300ml · Microalgas del Desierto & Anticaída",
    category: "Cuidado Capilar Biotecnológico",
    priceUsd: 55.0,
    badge: "Alta Gama K-Beauty",
    origin: "Corea del Sur (RIMAN Botalab)",
    delivery: "7 a 10 días bajo demanda (Caracas / Nacional)",
    keyIngredients: "Microalgas extremófilas Deserticola, Biotina vegetal, Pantenol provitamina B5",
    imagePrompt:
      "Fotografía publicitaria de lujo para producto capilar premium de alta gama. Una botella estilizada y moderna de Botalab 'Deserticola Water Treatment Shampoo 300ml' de RIMAN Korea centrada sobre una superficie de piedra pizarra oscura pulida con reflejos de agua cristalina y burbujas microscópicas de espuma sedosa. De fondo, una iluminación botánica futurista color verde esmeralda y tonos ámbar cálidos que simbolizan las microalgas extremófilas del desierto. Una hebra de cabello sedoso, brillante y perfecto cruza elegantemente la composición. Atmósfera de spa capilar coreano de prestigio, 8k, enfoque nítido, calidad publicitaria de revista Vogue.",
    ugcScript: {
      hook: "¿Ves mechones de cabello en tu cepillo y en la ducha todos los días? Esto fue lo único que me lo detuvo.",
      problem: "El agua pesada, los tintes y el estrés debilitan la raíz hasta que el cabello se vuelve finito, quebradizo y sin vida.",
      solution: "Este es el shampoo Deserticola de Botalab RIMAN, biotecnología capilar coreana de lujo. Utiliza una microalga del desierto capaz de regenerarse en condiciones extremas, combinada con biotina vegetal.",
      demo: "Desde la primera semana notas cómo la caída se frena en seco y el cabello recupera ese brillo espejo, suavidad y grosor de salón de belleza en Seúl.",
      offer: "Tratamiento de lujo disponible en Davebeauty a $55 USD o su equivalente oficial en Bolívares BCV. Aceptamos Pago Móvil, Zelle y USDT.",
      cta: "Entregas coordinadas en Caracas y envíos por Zoom, Tealca y MRW a toda Venezuela. Escríbenos al WhatsApp y dale vida a tu cabello.",
    },
    copyMeta: `💇‍♀️ ¿Cabello débil, quebradizo o con caída constante? Descubre el poder de las microalgas Deserticola de RIMAN Korea 🇰🇷🌿

El shampoo terapéutico Botalab Deserticola Water Treatment combina biotecnología avanzada y botánica marina para transformar tu melena desde la raíz:

✨ Estimula la microcirculación y fortalece los folículos pilosos.
✨ Reduce drásticamente la caída capilar y el quiebre.
✨ Con Biotina vegetal y Pantenol para máxima sedosidad y brillo espejo.
✨ Libre de sulfatos agresivos: ideal para cabellos tinturados o con keratina.

💎 Gama de lujo K-Beauty en Davebeauty bajo demanda garantizada.
💵 Inversión: $55.00 USD (disponible en Bolívares a tasa oficial BCV).
💳 Pago seguro: Pago Móvil, Transferencia bancaria, Zelle y USDT.
📦 Envíos asegurados por MRW, Zoom y Tealca o entrega personal en Caracas.

📲 ¡Toca 'Más información' y consulta disponibilidad directa en nuestro WhatsApp!`,
    copyTiktok: `¿Se te cae el cabello a montones? 😱 Probé el shampoo coreano de microalgas Botalab Deserticola y mi cabello cambió por completo. Más grueso, cero caída y brillo de salón coreano ✨🇰🇷 $55 USD / Bolívares a tasa oficial BCV. Envíos a toda Venezuela por Zoom y MRW 🇻🇪📦 Escríbenos al WhatsApp en el link del perfil para coordinar tu pedido. #caidadelcabello #botalab #kbeautyve #cabellosanovenezuela #caracas #davebeauty`,
    audiencesVe: {
      target: "Mujeres de 25 a 55 años con caída capilar, cabello fino, decolorado o en recuperación post-tratamiento químico.",
      interests: ["Pérdida de cabello", "Cuidado capilar de lujo", "Salón de belleza", "K-Beauty"],
      locations: "Caracas (Altamira, Las Mercedes, La Castellana) y ciudades principales a nivel nacional.",
    },
  },
  {
    id: "incellderm",
    name: "INCELLDERM Aqua Protection Sunscreen SPF 50+",
    subtitle: "RIMAN Incellderm · 50ml · Centella de Jeju & Acabado Glow",
    category: "Fotoprotección Celular & Glow",
    priceUsd: 55.0,
    badge: "Nº 1 Glow Coreano",
    origin: "Corea del Sur (RIMAN Incellderm)",
    delivery: "7 a 10 días bajo demanda (Caracas / Nacional)",
    keyIngredients: "Agua de Centella Asiática de la isla de Jeju, Péptidos botánicos, Filtros UV fotocalmantes SPF 50+ PA++++",
    imagePrompt:
      "Fotografía publicitaria de protector solar coreano premium de alta gama. El tubo estilizado blanco y plateado de INCELLDERM 'Aqua Protection Sunscreen SPF 50+ PA++++' de RIMAN Korea emerge de una suave ondulación de agua pura y cristalina. A un lado, hojas frescas de Centella Asiática de Jeju con gotas de rocío iluminadas por un rayo de sol suave de mañana. La textura ligera y transparente en gotas acuosas resalta sobre una placa de vidrio pulido. Estilo luminoso 'Glass Skin', estética limpia y dermatológica de lujo, iluminación solar radiante pero difusa, resolución 8k ultra detallada, digno de campaña oficial de K-Beauty.",
    ugcScript: {
      hook: "Si odias el protector solar porque te deja la cara como un fantasma o te arden los ojos con el sol... quédate a ver esto.",
      problem: "En Venezuela el sol mancha la piel todo el año, pero la mayoría de protectores son pesados, grasosos y arruinan tu maquillaje.",
      solution: "Este es el Aqua Protection Sunscreen SPF 50+ de RIMAN Incellderm. Es el protector solar número 1 de Corea porque está formulado con agua pura de Centella Asiática de la isla de Jeju.",
      demo: "¡Miren esto! Desaparece en 3 segundos, cero capa blanca, no arde en los ojos y deja ese glow coreano hermoso como si no tuvieras nada puesto.",
      offer: "Disponible en Davebeauty original de Corea por $55 USD o en Bolívares a tasa oficial BCV. Aceptamos Pago Móvil, Zelle y USDT.",
      cta: "Envíos a toda Venezuela por MRW, Zoom y Tealca o entrega en Caracas. ¡Pide el tuyo por WhatsApp antes de que se agote la reserva!",
    },
    copyMeta: `☀️ ¿Buscas un protector solar que de verdad quieras usar todos los días? Te presentamos el secreto del glow coreano: INCELLDERM Aqua Protection SPF 50+ PA++++ 🇰🇷💧

Olvídate de la piel pesada, el efecto fantasma y el ardor en los ojos. Esta fórmula celular de RIMAN Korea protege tu piel mientras la hidrata como un sérum de lujo:

🛡️ Máxima fotoprotección SPF 50+ PA++++ de amplio espectro.
🌿 Infundido con agua pura de Centella Asiática de la isla de Jeju (calma rojeces y previene manchas solares).
💦 Textura acuosa ultraligera de absorción inmediata.
✨ Acabado 'Glass Skin' radiante, transparente y cero grasoso.
👁️ Seguro para el contorno de ojos (no pica ni arde con el sudor).

📍 Davebeauty Venezuela: K-Beauty original garantizado.
💲 $55.00 USD (o en Bolívares al cambio oficial BCV del día).
💳 Pagos en Bs. vía Pago Móvil / Transferencia, o USD vía Zelle y USDT.
🚚 Despachos a toda Venezuela por MRW, Zoom y Tealca / Entrega coordinada Caracas.

📲 ¡Toca 'Enviar mensaje' y adquiere tu protector solar coreano hoy mismo!`,
    copyTiktok: `¡El protector solar que no parece protector solar! 😍🇰🇷 Desaparece en 3 segundos, cero rastro blanco, no arde en los ojos y te deja la piel luminosa todo el día con SPF 50+ PA++++. Infundido con Centella de Jeju ✨ Solo en Davebeauty por $55 USD (tasa oficial BCV con Pago Móvil). Envíos a toda Venezuela 🇻🇪📦 Enlace al WhatsApp en el perfil. #protectorsolar #incellderm #kbeautyvenezuela #caracas #glassskin #skincareve`,
    audiencesVe: {
      target: "Hombres y mujeres de 20 a 50 años que buscan fotoprotección diaria antiedad con acabado no grasoso y efecto buena cara.",
      interests: ["Protección solar", "Skincare coreano", "Glass Skin", "Manchas solares"],
      locations: "Venezuela a nivel nacional (ciudades de alta radiación solar como Maracaibo, Lechería, Caracas, Margarita).",
    },
  },
];

export function CreativosDola({ ctx }: { ctx: Ctx }) {
  const [selectedId, setSelectedId] = useState<string>("oregano");
  const [tabMode, setTabMode] = useState<string>("imagen");
  const [objective, setObjective] = useState<string>("whatsapp");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const kit = DAVEBEAUTY_KITS.find((k) => k.id === selectedId) ?? DAVEBEAUTY_KITS[0]!;

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      ctx.toast("¡Prompt copiado al portapapeles! Ahora pégalo en Dola.com");
      window.setTimeout(() => setCopiedKey(null), 3000);
    }
  };

  const openDola = () => {
    window.open("https://www.dola.com", "_blank", "noopener,noreferrer");
  };

  const getFullUgcScriptText = () => {
    return `[GUIÓN DE VIDEO PUBLICITARIO UGC - ${kit.name.toUpperCase()}]
Objetivo: ${objective === "whatsapp" ? "Cierre directo por WhatsApp" : objective === "ventas" ? "Conversión en Tienda Web" : "Tráfico y Reconocimiento"}
Duración: 30 segundos
Plataforma: Reels / TikTok Ads

1. HOOK VISUAL Y VERBAL (0 a 3 seg):
Visual: Creador/a en primer plano con expresión de impacto sosteniendo el producto.
Texto en pantalla: "${kit.ugcScript.hook}"
Audio: "${kit.ugcScript.hook}"

2. AGITACIÓN DEL PROBLEMA (3 a 8 seg):
Visual: Muestra de la frustración común o necesidad en la piel/salud en clima de Venezuela.
Texto en pantalla: "¿Te pasa esto?"
Audio: "${kit.ugcScript.problem}"

3. REVELACIÓN DE LA SOLUCIÓN (8 a 15 seg):
Visual: Destapar el producto, mostrar empaque de alta gama e ingredientes clave (${kit.keyIngredients}).
Texto en pantalla: "${kit.name}"
Audio: "${kit.ugcScript.solution}"

4. DEMOSTRACIÓN PRÁCTICA (15 a 22 seg):
Visual: Aplicación real o uso del producto mostrando textura inmediata y resultado visible.
Audio: "${kit.ugcScript.demo}"

5. OFERTA Y LOCALIZACIÓN VENEZUELA (22 a 26 seg):
Visual: Texto destacado: "$ ${kit.priceUsd.toFixed(2)} USD (o Bs. al BCV) · Pago Móvil / Zelle".
Audio: "${kit.ugcScript.offer}"

6. LLAMADA A LA ACCIÓN (26 a 30 seg):
Visual: Creador/a señalando el enlace al perfil o botón de WhatsApp.
Texto en pantalla: "¡Pide el tuyo al WhatsApp! Delivery Caracas y Envíos Nacionales".
Audio: "${kit.ugcScript.cta}"`;
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* Banner Principal de Dola AI */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: 12,
          padding: "20px 24px",
        }}
      >
        <div className="row between" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span
                className="badge tone-success"
                style={{ fontWeight: 600, fontSize: "0.8rem", padding: "4px 8px" }}
              >
                100% GRATIS · SIN GASTAR CRÉDITOS
              </span>
              <span className="caption mono">Dola AI (dola.com)</span>
            </div>
            <h2 style={{ margin: "4px 0 8px", fontSize: "1.35rem" }}>
              Generador de Creativos y Guiones con Dola AI
            </h2>
            <p className="muted" style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5 }}>
              Genera imágenes de producto de estudio, guiones UGC de video (TikTok/Reels) y copys persuasivos sin
              consumir créditos de Higgsfield. Diseñado específicamente para el mercado de <strong>Venezuela</strong> (USD,
              Bolívares a tasa oficial BCV, Pago Móvil, Zelle y envíos nacionales).
            </p>
          </div>
          <div className="row" style={{ gap: 10, alignSelf: "center" }}>
            <Button
              variant="agent"
              icon="spark"
              onClick={openDola}
              style={{ fontWeight: 600 }}
            >
              Abrir Dola.com ↗
            </Button>
          </div>
        </div>

        {/* Guía en 3 pasos */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px dashed var(--border)",
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--brand, #3b82f6)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              1
            </span>
            <span className="caption" style={{ lineHeight: 1.4 }}>
              <strong>Elige tu producto y formato:</strong> Copia el prompt optimizado con 1 clic.
            </span>
          </div>
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--brand, #3b82f6)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              2
            </span>
            <span className="caption" style={{ lineHeight: 1.4 }}>
              <strong>Pégalo en Dola.com:</strong> La IA generará la imagen o ajustará el guión al instante y gratis.
            </span>
          </div>
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--brand, #3b82f6)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              3
            </span>
            <span className="caption" style={{ lineHeight: 1.4 }}>
              <strong>Pasa a CapCut o Meta Ads:</strong> Edita el video con subtítulos automáticos y lánzalo hoy mismo.
            </span>
          </div>
        </div>
      </div>

      {/* Selector de los 4 Productos de Davebeauty */}
      <section className="card" style={{ padding: "18px 20px" }}>
        <div className="row between" style={{ alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
            1. Selecciona el Producto Activo de Davebeauty
          </h3>
          <span className="caption" style={{ color: "var(--muted)" }}>
            4 productos con logística y precios confirmados
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {DAVEBEAUTY_KITS.map((p) => {
            const isSelected = p.id === selectedId;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{
                  border: isSelected ? "2px solid var(--brand, #3b82f6)" : "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  background: isSelected ? "rgba(59, 130, 246, 0.05)" : "var(--card-bg, #fff)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div className="row between" style={{ alignItems: "flex-start", marginBottom: 6 }}>
                  <span
                    className={`badge ${isSelected ? "tone-brand" : "tone-neutral"}`}
                    style={{ fontSize: "0.75rem", padding: "2px 6px" }}
                  >
                    {p.badge}
                  </span>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "1.05rem", color: "var(--brand, #1e40af)" }}>
                      {cop(p.priceUsd)}
                    </strong>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      {vesFromUsd(p.priceUsd)}
                    </div>
                  </div>
                </div>
                <h4 style={{ margin: "6px 0 4px", fontSize: "0.95rem", lineHeight: 1.3 }}>
                  {p.name}
                </h4>
                <p className="caption" style={{ margin: 0, color: "var(--muted)", fontSize: "0.78rem" }}>
                  {p.subtitle}
                </p>
                <div style={{ marginTop: 8, fontSize: "0.75rem", color: "var(--muted)" }}>
                  📍 {p.delivery}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Configuración de Objetivo y Formato */}
      <div className="row between" style={{ gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <label className="caption" style={{ fontWeight: 600 }}>
            Objetivo de Campaña:
          </label>
          <select
            className="input"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            style={{ width: "auto", minWidth: 200, padding: "6px 12px", fontSize: "0.85rem" }}
          >
            <option value="whatsapp">📲 WhatsApp Directo (Cierre 1 a 1 en Bs./USD)</option>
            <option value="ventas">🛒 Ventas en Tienda Web (Checkout)</option>
            <option value="trafico">👀 Tráfico & Reconocimiento (Glow / UGC)</option>
          </select>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <Button
            variant="ghost"
            icon="external"
            onClick={openDola}
            sm
          >
            Ir a Dola.com
          </Button>
        </div>
      </div>

      {/* Tabs de Formato de Creativo */}
      <Tabs
        label="Formato de Creativo"
        value={tabMode}
        onChange={setTabMode}
        items={[
          ["imagen", "📸 Prompt Imagen (Dola AI)"],
          ["ugc", "🎬 Guión UGC Video (TikTok/Reels)"],
          ["copys", "📝 Copys para Anuncios (Meta / TikTok)"],
          ["estrategia", "🇻🇪 Estrategia & Segmentación Venezuela"],
        ]}
      />

      {/* Pestaña 1: Prompt de Imagen para Dola AI */}
      {tabMode === "imagen" && (
        <section className="card stack" style={{ gap: 14 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                Prompt de Imagen de Alta Conversión para Dola AI
              </h3>
              <p className="caption" style={{ margin: "4px 0 0" }}>
                Optimizado para generar fotografía de estudio e-commerce, iluminación de lujo y empaque hiperrealista en Dola.
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Button
                variant={copiedKey === "img" ? "primary" : "agent"}
                icon={copiedKey === "img" ? "check" : "copy"}
                onClick={() => copyToClipboard(kit.imagePrompt, "img")}
              >
                {copiedKey === "img" ? "¡Copiado para Dola!" : "Copiar Prompt de Imagen"}
              </Button>
              <Button variant="ghost" icon="external" onClick={openDola}>
                Abrir Dola.com ↗
              </Button>
            </div>
          </div>

          <div
            style={{
              background: "var(--bg, #f8fafc)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "16px 18px",
              fontFamily: "monospace",
              fontSize: "0.88rem",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {kit.imagePrompt}
          </div>

          <div
            className="row"
            style={{
              gap: 12,
              background: "rgba(59, 130, 246, 0.04)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: 8,
              padding: "12px 16px",
            }}
          >
            <Icon name="spark" size={20} />
            <div className="caption" style={{ lineHeight: 1.5 }}>
              <strong>Tip para Dola:</strong> Puedes pedirle a Dola:{" "}
              <em>"Genera esta imagen en formato vertical 9:16 para historia de Instagram con iluminación cálida de atardecer"</em> o{" "}
              <em>"Crea una variación mostrando una mano femenina sosteniendo el producto frente a un espejo"</em>.
            </div>
          </div>
        </section>
      )}

      {/* Pestaña 2: Guión UGC Video (TikTok / Reels 0-30s) */}
      {tabMode === "ugc" && (
        <section className="card stack" style={{ gap: 16 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                Guión UGC de Video TikTok / Reels (0 a 30s)
              </h3>
              <p className="caption" style={{ margin: "4px 0 0" }}>
                Estructura de alta retención: Hook visual (0-3s), problema, solución, demo, oferta en Bolívares/USD y CTA a WhatsApp.
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Button
                variant={copiedKey === "ugc" ? "primary" : "agent"}
                icon={copiedKey === "ugc" ? "check" : "copy"}
                onClick={() => copyToClipboard(getFullUgcScriptText(), "ugc")}
              >
                {copiedKey === "ugc" ? "¡Guión Copiado!" : "Copiar Guión Completo"}
              </Button>
              <Button variant="ghost" icon="external" onClick={openDola}>
                Refinar en Dola ↗
              </Button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                borderLeft: "4px solid #ef4444",
                background: "var(--bg, #f8fafc)",
                padding: "10px 14px",
                borderRadius: "0 8px 8px 0",
              }}
            >
              <div className="row between" style={{ marginBottom: 4 }}>
                <strong style={{ fontSize: "0.85rem", color: "#ef4444" }}>
                  1. HOOK VISUAL & AUDITIVO (0 - 3s)
                </strong>
                <span className="caption">Retención inicial</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.92rem", fontWeight: 600 }}>
                "{kit.ugcScript.hook}"
              </p>
            </div>

            <div
              style={{
                borderLeft: "4px solid #f59e0b",
                background: "var(--bg, #f8fafc)",
                padding: "10px 14px",
                borderRadius: "0 8px 8px 0",
              }}
            >
              <div className="row between" style={{ marginBottom: 4 }}>
                <strong style={{ fontSize: "0.85rem", color: "#d97706" }}>
                  2. AGITACIÓN DEL PROBLEMA (3 - 8s)
                </strong>
                <span className="caption">Empatía con el dolor del cliente en Venezuela</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                "{kit.ugcScript.problem}"
              </p>
            </div>

            <div
              style={{
                borderLeft: "4px solid #10b981",
                background: "var(--bg, #f8fafc)",
                padding: "10px 14px",
                borderRadius: "0 8px 8px 0",
              }}
            >
              <div className="row between" style={{ marginBottom: 4 }}>
                <strong style={{ fontSize: "0.85rem", color: "#059669" }}>
                  3. REVELACIÓN DE LA SOLUCIÓN (8 - 15s)
                </strong>
                <span className="caption">{kit.origin}</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                "{kit.ugcScript.solution}"
              </p>
            </div>

            <div
              style={{
                borderLeft: "4px solid #3b82f6",
                background: "var(--bg, #f8fafc)",
                padding: "10px 14px",
                borderRadius: "0 8px 8px 0",
              }}
            >
              <div className="row between" style={{ marginBottom: 4 }}>
                <strong style={{ fontSize: "0.85rem", color: "#2563eb" }}>
                  4. DEMOSTRACIÓN PRÁCTICA & BENEFICIOS (15 - 22s)
                </strong>
                <span className="caption">Textura y sensación en vivo</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                "{kit.ugcScript.demo}"
              </p>
            </div>

            <div
              style={{
                borderLeft: "4px solid #8b5cf6",
                background: "var(--bg, #f8fafc)",
                padding: "10px 14px",
                borderRadius: "0 8px 8px 0",
              }}
            >
              <div className="row between" style={{ marginBottom: 4 }}>
                <strong style={{ fontSize: "0.85rem", color: "#7c3aed" }}>
                  5. OFERTA & PAGO MÓVIL / TASA BCV (22 - 26s)
                </strong>
                <span className="caption">Bimoneda USD / VES</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>
                "{kit.ugcScript.offer}"
              </p>
            </div>

            <div
              style={{
                borderLeft: "4px solid #06b6d4",
                background: "var(--bg, #f8fafc)",
                padding: "10px 14px",
                borderRadius: "0 8px 8px 0",
              }}
            >
              <div className="row between" style={{ marginBottom: 4 }}>
                <strong style={{ fontSize: "0.85rem", color: "#0891b2" }}>
                  6. LLAMADA A LA ACCIÓN (CTA) (26 - 30s)
                </strong>
                <span className="caption">WhatsApp / Delivery</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                "{kit.ugcScript.cta}"
              </p>
            </div>
          </div>

          <div className="row between" style={{ alignItems: "center", paddingTop: 8 }}>
            <span className="caption">
              🎥 <strong>Herramienta gratuita recomendada:</strong> Graba con tu celular y usa <strong>CapCut</strong> (gratis) para generar subtítulos dinámicos de colores en 1 minuto.
            </span>
            <Button
              variant="agent"
              sm
              icon="copy"
              onClick={() => copyToClipboard(getFullUgcScriptText(), "ugc-bottom")}
            >
              {copiedKey === "ugc-bottom" ? "¡Copiado!" : "Copiar Guión Completo"}
            </Button>
          </div>
        </section>
      )}

      {/* Pestaña 3: Copys para Anuncios (Meta y TikTok) */}
      {tabMode === "copys" && (
        <div className="two" style={{ gap: 16 }}>
          {/* Copy Meta Ads */}
          <section className="card stack" style={{ gap: 12 }}>
            <div className="row between" style={{ alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Copy para Meta Ads (Instagram / Facebook)</h3>
                <span className="caption">Formato persuasivo con emojis, viñetas y oferta en Bs./USD</span>
              </div>
              <Button
                variant={copiedKey === "meta" ? "primary" : "agent"}
                icon={copiedKey === "meta" ? "check" : "copy"}
                sm
                onClick={() => copyToClipboard(kit.copyMeta, "meta")}
              >
                {copiedKey === "meta" ? "¡Copiado!" : "Copiar"}
              </Button>
            </div>

            <div
              style={{
                background: "var(--bg, #f8fafc)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "14px",
                fontSize: "0.85rem",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                maxHeight: 380,
                overflowY: "auto",
              }}
            >
              {kit.copyMeta}
            </div>
          </section>

          {/* Copy TikTok Ads */}
          <section className="card stack" style={{ gap: 12 }}>
            <div className="row between" style={{ alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>Copy para TikTok Ads / Reels Cortos</h3>
                <span className="caption">Ágil, directo al punto con hashtags venezolanos virales</span>
              </div>
              <Button
                variant={copiedKey === "tiktok" ? "primary" : "agent"}
                icon={copiedKey === "tiktok" ? "check" : "copy"}
                sm
                onClick={() => copyToClipboard(kit.copyTiktok, "tiktok")}
              >
                {copiedKey === "tiktok" ? "¡Copiado!" : "Copiar"}
              </Button>
            </div>

            <div
              style={{
                background: "var(--bg, #f8fafc)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "14px",
                fontSize: "0.85rem",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                maxHeight: 380,
                overflowY: "auto",
              }}
            >
              {kit.copyTiktok}
            </div>
          </section>
        </div>
      )}

      {/* Pestaña 4: Estrategia y Segmentación Venezuela */}
      {tabMode === "estrategia" && (
        <section className="card stack" style={{ gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
            Estrategia de Campaña y Segmentación en Venezuela para {kit.name}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            <div
              style={{
                background: "var(--bg, #f8fafc)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
                <Icon name="coin" size={18} />
                <strong style={{ fontSize: "0.9rem" }}>Presupuesto Diario Recomendado</strong>
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--brand, #1e40af)" }}>
                $ 5.00 a $ 20.00 USD / día
              </div>
              <p className="caption" style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                Equivalente aproximado: {vesFromUsd(10)} / día (a tasa oficial BCV referencial). Empieza con $5 USD/día para testear los primeros 3 días.
              </p>
            </div>

            <div
              style={{
                background: "var(--bg, #f8fafc)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
                <Icon name="users" size={18} />
                <strong style={{ fontSize: "0.9rem" }}>Público Objetivo</strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4 }}>
                {kit.audiencesVe.target}
              </p>
              <div style={{ marginTop: 6 }}>
                <span className="caption" style={{ fontWeight: 600 }}>Intereses: </span>
                <span className="caption">{kit.audiencesVe.interests.join(", ")}</span>
              </div>
            </div>

            <div
              style={{
                background: "var(--bg, #f8fafc)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
                <Icon name="truck" size={18} />
                <strong style={{ fontSize: "0.9rem" }}>Logística y Despacho</strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4 }}>
                <strong>Caracas:</strong> Delivery express coordinado (mismo día o bajo demanda).
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", lineHeight: 1.4 }}>
                <strong>Nacional:</strong> MRW, Zoom o Tealca con número de guía inmediato.
              </p>
            </div>

            <div
              style={{
                background: "var(--bg, #f8fafc)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
                <Icon name="bank" size={18} />
                <strong style={{ fontSize: "0.9rem" }}>Pasarelas y Métodos de Pago</strong>
              </div>
              <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: "0.85rem", lineHeight: 1.5 }}>
                <li><strong>Pago Móvil:</strong> En Bolívares (VES) a tasa oficial BCV.</li>
                <li><strong>Zelle:</strong> En USD directo.</li>
                <li><strong>USDT / Cripto:</strong> Binance Pay sin comisiones.</li>
                <li><strong>Transferencia bancaria:</strong> Banesco, Mercantil, BDV.</li>
              </ul>
            </div>
          </div>

          <div
            className="row between"
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: 8,
              padding: "14px 18px",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <strong style={{ color: "var(--brand, #059669)", fontSize: "0.92rem" }}>
                ¿Listo para crear la campaña en Meta o TikTok?
              </strong>
              <p className="caption" style={{ margin: "2px 0 0" }}>
                Pega tus creativos generados en Dola en la biblioteca de anuncios de Traxo o ve a la pestaña "Nueva campaña".
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Button variant="agent" icon="spark" onClick={openDola}>
                Abrir Dola.com ↗
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
