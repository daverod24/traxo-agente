import { useEffect, useMemo, useState } from "react";
import { useResource } from "./api.ts";
import { DEFAULT_BCV_RATE, usd, vesFromUsd } from "./format.ts";
import type { Product } from "./types.ts";
import { Button, Icon, Tabs, ToneBadge, type Tone } from "./ui.tsx";
import type { Ctx } from "./views.tsx";

export type MarketingAngle =
  | "problema_solucion"
  | "ugc_testimonial"
  | "autoridad_kbeauty"
  | "oferta_escasez";

export interface AngleInfo {
  id: MarketingAngle;
  title: string;
  badge: string;
  tone: Tone;
  summary: string;
  hookStyle: string;
}

export const MARKETING_ANGLES: Record<MarketingAngle, AngleInfo> = {
  problema_solucion: {
    id: "problema_solucion",
    title: "Problema - Solución Urgente (Dolor / Alivio Rápido)",
    badge: "Dolor & Alivio",
    tone: "critical",
    summary:
      "Ataca directamente la molestia, dolor o frustración del cliente en Venezuela y presenta el producto como el rescate inmediato y comprobado.",
    hookStyle: "Advertencia, error común o agitación de un dolor físico o estético frustrante.",
  },
  ugc_testimonial: {
    id: "ugc_testimonial",
    title: "UGC / Testimonial Natural (Recomendación genuina)",
    badge: "UGC Viral",
    tone: "attention",
    summary:
      "Estilo creador de contenido confesional, honesto y sin poses ('chicas, tienen que ver esto'), con altísima empatía y credibilidad orgánica.",
    hookStyle: "Descubrimiento personal, secreto compartido o confesión 'antes y después'.",
  },
  autoridad_kbeauty: {
    id: "autoridad_kbeauty",
    title: "Autoridad Científica & Dermatológica (K-Beauty / Pureza)",
    badge: "Biotecnología & Pureza",
    tone: "success",
    summary:
      "Resalta formulaciones bio-celulares, patentes coreanas o botánicas de USA, pureza de ingredientes y resultados clínicos demostrados.",
    hookStyle: "Dato científico revelador, recomendación dermatológica o activo celular superior.",
  },
  oferta_escasez: {
    id: "oferta_escasez",
    title: "Oferta & Escasez (Cupón 5% PRIMERACOMPRA5 / Entrega Inmediata)",
    badge: "Escasez & Descuento",
    tone: "agent",
    summary:
      "Incentivo de compra inmediata: lotes limitados en Caracas, cupón de bienvenida PRIMERACOMPRA5 y despacho el mismo día.",
    hookStyle: "Alerta de stock limitado, descuento temporal y garantía de entrega inmediata.",
  },
};

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
    delivery: "Entrega inmediata Caracas / 24-48h Nacional por MRW y Zoom",
    keyIngredients:
      "Aceite concentrado de orégano salvaje (Carvacrol) + Aceite virgen de semilla negra (Nigella sativa)",
    imagePrompt:
      "Fotografía publicitaria de producto estilo editorial hiperrealista e-commerce. Un frasco ámbar translúcido etiquetado 'Oil of Oregano + Black Seed Oil, 6000 mg Herbal Equivalent, 60 Softgels' de Micro Ingredients sobre un pedestal de mármol blanco mate y madera de roble claro. Hojas frescas de orégano verde con pequeñas gotas de agua cristalinas y semillas de Nigella sativa esparcidas artísticamente. Una cápsula blanda dorada y translúcida brilla en primer plano reflejando luz cálida de estudio. Fondo difuminado de spa botánico y cocina moderna luminosa. Estilo de alta gama, iluminación cinematográfica suave, textura 8K nítida, ultra detallado, sin distorsión de texto ni artefactos.",
    ugcScript: {
      hook: "¡Por favor deja de tomar aceite de orégano en gotas que te quema la garganta y daña el estómago! 🛑 Mira esta solución.",
      problem:
        "¿Sientes pesadez e inflamación después de cada comida o te enfermas con cualquier cambio de clima en Venezuela?",
      solution:
        "Este es el secreto mejor guardado: cápsulas blandas de Aceite de Orégano salvaje con Semilla Negra. Tienen 6.000 mg de concentración botánica pura, pero en softgels que NO saben a nada ni arden al tragar.",
      demo:
        "Te tomas una cápsula con agua al día y dile adiós a la hinchazón estomacal; apoya la digestión, combate bacterias y te blinda las defensas al 100%.",
      offer:
        "100% original americano en Davebeauty por solo $23 USD o su equivalente oficial en Bolívares a tasa oficial BCV. Puedes pagar cómodo con Pago Móvil o Zelle.",
      cta:
        "Tenemos delivery en Caracas y envíos rápidos por MRW, Zoom y Tealca a toda Venezuela. Toca el botón y escríbenos al WhatsApp antes de que se agoten.",
    },
    copyMeta: `🌿 ¿Sabías que el Aceite de Orégano y la Semilla Negra forman el escudo antibacteriano y digestivo más potente de la naturaleza? 🛡️✨

Si sufres de hinchazón después de comer, pesadez estomacal o defensas bajas, esta fórmula botánica de Micro Ingredients es para ti:

✅ 6.000 mg de equivalencia herbal concentrada en cápsulas blandas (softgels).
✅ Sin el sabor fuerte ni el ardor del aceite de orégano líquido en gotas.
✅ Apoya el equilibrio digestivo, flora intestinal y defensas inmunológicas.
✅ Máxima absorción celular y pureza garantizada.

📍 Disponible en Davebeauty con entrega garantizada.
💵 Precio: $22.99 USD (o en Bolívares al cambio oficial BCV).
📲 Paga cómodo con Pago Móvil, Zelle o Binance Pay (USDT).
🛵 Delivery en Caracas y despachos nacionales por MRW, Zoom y Tealca.

👉 ¡Haz clic en 'Enviar mensaje' y asegura tu frasco hoy por WhatsApp!`,
    copyTiktok: `¡Dile adiós al sabor amargo del aceite de orégano! 🙅‍♀️🌿 Estas cápsulas blandas de orégano + semilla negra desinflaman tu abdomen y blindan tus defensas en minutos. 6.000 mg de pura salud botánica sin ardor. ✨ Solo $23 USD / Pago Móvil tasa BCV. Delivery en Caracas y envíos MRW en toda Venezuela 🇻🇪📦 Pídelo al WhatsApp en el link del perfil. #aceitedeoregano #bienestarvenezuela #caracas #saludnatural #pagomovil #davebeauty`,
    audiencesVe: {
      target:
        "Hombres y mujeres de 25 a 55 años interesados en bienestar, salud digestiva, fitoterapia y medicina preventiva.",
      interests: ["Suplementos dietéticos", "Salud digestiva", "Vida saludable", "Nutrición holística"],
      locations:
        "Caracas (delivery prioritario) + Grandes ciudades (Valencia, Maracaibo, Barquisimeto, Maracay, Lechería).",
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
    delivery: "Entrega inmediata Caracas / 24-48h Nacional por MRW, Zoom y Tealca",
    keyIngredients: "Bio-calcio dérmico patentado, Péptidos voluminizadores, Fitoceramidas",
    imagePrompt:
      "Fotografía cosmética comercial de lujo estilo K-Beauty coreano para anuncio de Instagram. En primer plano, la barra stick giratoria elegante de Dr. Melaxin 'Calcium Volume Multi Balm 9g' destapada mostrando la textura suave y translúcida del bálsamo color marfil perlado. El envase reposa sobre un bloque de cuarzo rosa con sutiles reflejos de luz y gotas de rocío fresco. Al fondo, un halo de luz dorada sutil y pétalos de flores de loto desenfocadas. Iluminación limpia de belleza de alta costura, piel de porcelana sugerida en el reflejo, estilo premium, 8K ultra nítido, sin distorsión tipográfica.",
    ugcScript: {
      hook: "Si tienes más de 30 años y no quieres inyectarte nada en el cuello o la frente... tienes que ver esto.",
      problem:
        "A partir de los 30 la piel pierde calcio y elasticidad. Y las cremas pesadas en el calor de Venezuela solo te ponen la cara grasosa y arruinan el maquillaje.",
      solution:
        "Este es el famoso Calcium Volume Multi Balm de Dr. Melaxin, K-Beauty 100% original de Corea del Sur. Contiene bio-calcio dérmico y péptidos voluminizadores en un stick ultra portátil.",
      demo:
        "Te lo pasas en 3 segundos por el cuello, patas de gallo y pómulos, incluso sobre el maquillaje. Rellena visualmente las líneas y te da ese efecto 'Glass Skin' coreano sin residuo pegajoso.",
      offer:
        "En Davebeauty lo tienes por solo $22 USD o en Bolívares al cambio oficial BCV. Pagas seguro con Pago Móvil, Zelle o USDT.",
      cta:
        "Envío exprés en Caracas y a toda Venezuela por Tealca, Zoom y MRW. Toca el botón y pide el tuyo al WhatsApp.",
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
      target:
        "Mujeres de 28 a 55 años interesadas en antiedad, skincare coreano, colágeno y rejuvenecimiento facial.",
      interests: ["Cosmética coreana", "Antienvejecimiento", "Cuidado de la piel", "Rutina facial"],
      locations:
        "Toda Venezuela: Caracas, San Cristóbal, Valencia, Maracaibo, Maracay, Barquisimeto.",
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
    delivery: "Entrega inmediata Caracas / 24-48h Nacional por MRW, Zoom y Tealca",
    keyIngredients:
      "Microalgas extremófilas Deserticola, Biotina vegetal pura, Pantenol provitamina B5",
    imagePrompt:
      "Fotografía publicitaria de lujo para producto capilar premium. Una botella estilizada y moderna de Botalab 'Deserticola Water Treatment Shampoo 300ml' de RIMAN Korea centrada sobre una superficie de piedra pizarra oscura pulida con reflejos de agua cristalina y microburbujas microscópicas de espuma sedosa. De fondo, iluminación botánica color verde esmeralda y tonos ámbar cálidos que simbolizan las microalgas extremófilas. Hebra de cabello sedoso y brillante cruzando la composición. Atmósfera de spa capilar coreano de prestigio, 8K ultra nítido, calidad editorial Vogue.",
    ugcScript: {
      hook: "¿Ves mechones de cabello en tu cepillo y en la ducha todos los días? Esto fue lo único que me lo detuvo.",
      problem:
        "El agua pesada, los tintes y el estrés debilitan la raíz hasta que el cabello se vuelve finito, quebradizo y sin vida.",
      solution:
        "Este es el shampoo Deserticola de Botalab RIMAN, biotecnología capilar coreana de lujo. Utiliza una microalga del desierto capaz de regenerarse en condiciones extremas, combinada con biotina vegetal.",
      demo:
        "Desde la primera semana notas cómo la caída se frena en seco y el cabello recupera ese brillo espejo, suavidad y grosor de salón de belleza en Seúl.",
      offer:
        "Tratamiento de lujo disponible en Davebeauty a $55 USD o su equivalente oficial en Bolívares BCV. Aceptamos Pago Móvil, Zelle y USDT.",
      cta:
        "Entregas coordinadas en Caracas y envíos por Zoom, Tealca y MRW a toda Venezuela. Escríbenos al WhatsApp y dale vida a tu cabello.",
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
      target:
        "Mujeres de 25 a 55 años con caída capilar, cabello fino, decolorado o en recuperación post-tratamiento químico.",
      interests: ["Pérdida de cabello", "Cuidado capilar de lujo", "Salón de belleza", "K-Beauty"],
      locations:
        "Caracas (Altamira, Las Mercedes, La Castellana) y ciudades principales a nivel nacional.",
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
    delivery: "Entrega inmediata Caracas / 24-48h Nacional por MRW, Zoom y Tealca",
    keyIngredients:
      "Agua de Centella Asiática de la isla de Jeju, Péptidos botánicos, Filtros UV fotocalmantes SPF 50+ PA++++",
    imagePrompt:
      "Fotografía publicitaria de protector solar coreano premium de alta gama. El tubo estilizado blanco y plateado de INCELLDERM 'Aqua Protection Sunscreen SPF 50+ PA++++' de RIMAN Korea emerge de una suave ondulación de agua pura y cristalina. A un lado, hojas frescas de Centella Asiática de Jeju con gotas de rocío iluminadas por luz suave de mañana. La textura ligera y transparente en gotas acuosas resalta sobre una placa de vidrio pulido. Estilo luminoso 'Glass Skin', estética limpia y dermatológica de lujo, 8K ultra nítido, sin distorsión de texto.",
    ugcScript: {
      hook: "Si odias el protector solar porque te deja la cara como un fantasma o te arden los ojos con el sol... quédate a ver esto.",
      problem:
        "En Venezuela el sol mancha la piel todo el año, pero la mayoría de protectores son pesados, grasosos y arruinan tu maquillaje.",
      solution:
        "Este es el Aqua Protection Sunscreen SPF 50+ de RIMAN Incellderm. Es el protector solar número 1 de Corea porque está formulado con agua pura de Centella Asiática de la isla de Jeju.",
      demo:
        "¡Miren esto! Desaparece en 3 segundos, cero capa blanca, no arde en los ojos y deja ese glow coreano hermoso como si no tuvieras nada puesto.",
      offer:
        "Disponible en Davebeauty original de Corea por $55 USD o en Bolívares a tasa oficial BCV. Aceptamos Pago Móvil, Zelle y USDT.",
      cta:
        "Envíos a toda Venezuela por MRW, Zoom y Tealca o entrega en Caracas. ¡Pide el tuyo por WhatsApp antes de que se agote la reserva!",
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
      target:
        "Hombres y mujeres de 20 a 50 años que buscan fotoprotección diaria antiedad con acabado no grasoso y efecto buena cara.",
      interests: ["Protección solar", "Skincare coreano", "Glass Skin", "Manchas solares"],
      locations:
        "Venezuela a nivel nacional (ciudades de alta radiación solar como Maracaibo, Lechería, Caracas, Margarita).",
    },
  },
];

export interface CustomProductInput {
  name: string;
  category: string;
  priceUsd: number;
  keyIngredients: string;
  origin: string;
  delivery: string;
  subtitle: string;
}

export interface CreativeSeedParams {
  keywords: string;
  targetAudience: string;
  objection: string;
  promoCode: string;
}

/** Motor Inteligente de Generación Creativa (Dola AI & Copywriting Multiproducto) */
export function buildDynamicCreativeKit({
  product,
  angle,
  seed,
  objective,
  variationSeed = 0,
}: {
  product: {
    id: string;
    name: string;
    subtitle: string;
    category: string;
    priceUsd: number;
    badge: string;
    origin: string;
    delivery: string;
    keyIngredients: string;
  };
  angle: MarketingAngle;
  seed: CreativeSeedParams;
  objective: string;
  variationSeed?: number;
}) {
  const priceFormattedUsd = usd(product.priceUsd);
  const priceFormattedVes = vesFromUsd(product.priceUsd, DEFAULT_BCV_RATE);
  const promoCodeTag = seed.promoCode ? seed.promoCode.trim().toUpperCase() : "PRIMERACOMPRA5";
  const kw = seed.keywords.trim();
  const audience = seed.targetAudience.trim();
  const obj = seed.objection.trim();

  // 1. GENERACIÓN DE PROMPTS PARA DOLA AI
  let imagePromptMain = "";
  let imagePromptVertical = "";

  if (angle === "problema_solucion") {
    imagePromptMain = `Fotografía publicitaria de producto estilo editorial hiperrealista e-commerce. Primer plano centrado y ultra nítido de '${product.name}' (${product.subtitle}) colocado con elegancia sobre un bloque de pizarra volcánica negra pulida y madera de nogal claro. Alrededor del frasco se aprecian gotas de agua cristalina y elementos botánicos frescos (${product.keyIngredients || "activos botánicos puros"}) suavemente iluminados. Iluminación cinematográfica de estudio comercial con luz suave perimetral y bokeh cálido desenfocado al fondo. Textura impecable del envase y etiqueta en alta definición, sin distorsión tipográfica, sin artefactos, renderizado 8K ultra nítido estilo revista Vogue.`;
    imagePromptVertical = `Formato vertical 9:16 para TikTok y Reels. Fotografía de producto estilo anuncio comercial de alta conversión de '${product.name}'. El envase reposa sobre un tocador minimalista iluminado por luz solar matutina difusa que entra a través de una ventana. En primer plano, gotas microscópicas de textura fresca (${product.keyIngredients || "fórmula hidratante pura"}). Atmósfera aspiracional de cuidado personal, hiperrealista, 8K, calidad fotográfica profesional.`;
  } else if (angle === "ugc_testimonial") {
    imagePromptMain = `Fotografía de estilo de vida auténtica UGC de alta gama. Una mano femenina natural y cuidada sostiene con elegancia el envase de '${product.name}' frente a un espejo de baño moderno y luminoso con repisa de mármol blanco. Luz diurna suave y cálida, gotas de rocío sutiles y toalla de lino beige desenfocada al fondo. Estética 'clean girl' orgánica de TikTok y K-Beauty, 8K ultra detallado, iluminación natural sin sombras duras, sin distorsión de manos ni de texto.`;
    imagePromptVertical = `Formato vertical 9:16 estilo UGC video grabador. Perspectiva en primera persona (POV) mostrando el frasco destapado de '${product.name}' sostenido a la altura de la cámara en un ambiente casero luminoso y acogedor. Al fondo, luz cálida de ventana y planta decorativa desenfocada. Textura del producto visible y nítida, estética viral de TikTok, hiperrealista, resolución 8K.`;
  } else if (angle === "autoridad_kbeauty") {
    imagePromptMain = `Fotografía cosmecéutica de laboratorio de alta gama estilo K-Beauty coreano. El envase de '${product.name}' (${product.origin}) colocado majestuosamente sobre una base de cuarzo translúcido y placa de vidrio mineral con ondas microscópicas de agua pura y cristalina. Iluminación blanca suave de softbox de estudio que destaca la pureza de los ingredientes (${product.keyIngredients || "complejo bio-activo celular"}). Atmósfera clínica de prestigio de Seúl, enfoque macro nítido f/2.8, hiperrealismo 8K, sin distorsión tipográfica.`;
    imagePromptVertical = `Formato vertical 9:16 editorial dermatológico. '${product.name}' fotografiado sobre pedestal de vidrio flotante con reflejos prismáticos suaves y gotas acuosas puras. Estética de biotecnología celular avanzada, fondo degradado suave en tonos blanco marfil y esmeralda sutil, ultra limpio, 8K, calidad de catálogo oficial de cosmética de lujo.`;
  } else {
    // oferta_escasez
    imagePromptMain = `Fotografía comercial de campaña e-commerce de alto impacto. El empaque original de '${product.name}' presentado junto a una elegante caja de envío de Davebeauty con lazo de satén dorado y tarjeta de agradecimiento personalizada. Fondo en tonos arena y cálidos de estudio con reflector dorado que crea un destello suave de exclusividad. Envase sellado con brillo comercial, composición dinámica de conversión para redes sociales, 8K ultra nítido.`;
    imagePromptVertical = `Formato vertical 9:16 anuncio de entrega express. Un paquete elegante recién desempacado mostrando '${product.name}' sobre una mesa de mármol con luz brillante de estudio publicitario. Sello de garantía de autenticidad en primer plano, composición orientada a stories de Instagram y anuncios de TikTok, hiperrealista 8K.`;
  }

  // 2. GUIÓN UGC CON TIEMPOS EXACTOS (0-30s)
  let hookText = "";
  let problemText = "";
  let solutionText = "";
  let demoText = "";
  let offerText = "";
  let ctaText = "";

  if (angle === "problema_solucion") {
    hookText = kw
      ? `¡Por favor deja de gastar en cosas que no te resuelven ${kw}! 🛑 Mira esta solución definitiva.`
      : `¡Por favor deja de gastar en productos que te prometen maravillas y no hacen nada! 🛑 Mira esto.`;
    problemText =
      "En Venezuela el estrés, el clima y los productos de dudosa calidad te hacen perder dinero y dañan tu bienestar sin darte resultados reales.";
    solutionText = `Descubrí '${product.name}', importado directamente de ${product.origin}. Su fórmula con ${product.keyIngredients || "activos de máxima concentración"} actúa desde la primera aplicación.`;
    demoText = obj
      ? `Y si te preocupaba ${obj.toLowerCase()}, miren esto: es de absorción inmediata, textura ligera y cero sensación pesada.`
      : "Miren la textura: se absorbe en segundos, no deja residuos molestos y sientes el alivio y la frescura al instante.";
    offerText = `En Davebeauty lo consigues original por ${priceFormattedUsd} USD o su equivalente oficial en Bolívares a tasa oficial BCV. Pagas seguro con Pago Móvil o Zelle.`;
    ctaText =
      "Tenemos delivery en Caracas y despachos por MRW, Zoom y Tealca a toda Venezuela. Toca el botón de WhatsApp y asegura el tuyo antes de que se agote.";
  } else if (angle === "ugc_testimonial") {
    hookText =
      "Amiga, te lo digo de corazón: ojalá me hubieran recomendado esto hace meses... ¡Miren este cambio real!";
    problemText =
      "Estaba cansada de probar opciones carísimas que solo me dejaban la piel/salud peor o con residuos grasosos que arruinaban mi día.";
    solutionText = `Una amiga me recomendó '${product.name}' de Davebeauty (${product.origin}). Viene con ${product.keyIngredients || "ingredientes botánicos de primera"} y el cambio se nota de verdad.`;
    demoText =
      "Miren cómo queda: se siente súper sedoso, cómodo y natural. Literalmente se volvió mi paso favorito e infaltable todos los días.";
    offerText = `Cuesta solo ${priceFormattedUsd} USD (o en Bolívares a tasa oficial BCV). Y con el cupón ${promoCodeTag} tienes 5% de descuento en tu primer pedido con Pago Móvil o Zelle.`;
    ctaText =
      "Hacen envíos a toda Venezuela y delivery en Caracas. Escríbeles al WhatsApp en el enlace del perfil, responden al instante.";
  } else if (angle === "autoridad_kbeauty") {
    hookText = `¿Por qué los expertos prefieren ${product.keyIngredients ? product.keyIngredients.split(",")[0] : "este activo"} sobre los tratamientos convencionales? No es casualidad, es ciencia.`;
    problemText =
      "La mayoría de productos comerciales usan rellenos inertes que no penetran la barrera cutánea o digestiva y no logran regeneración celular.";
    solutionText = `'${product.name}' cuenta con biotecnología celular avanzada de ${product.origin}, formulado con ${product.keyIngredients || "ingredientes puros de grado farmacéutico"}.`;
    demoText =
      "Estudios clínicos y dermatológicos avalan su máxima absorción y tolerancia en todo tipo de piel o metabolismo sin causar efectos adversos.";
    offerText = `Tratamiento de alta gama garantizado en Davebeauty por ${priceFormattedUsd} USD o en Bolívares a tasa oficial BCV. Puedes pagar vía Pago Móvil, Zelle o Binance USDT.`;
    ctaText =
      "Despachos express en Caracas y envíos nacionales asegurados por Tealca, Zoom y MRW. Toca el botón y consulta disponibilidad por WhatsApp.";
  } else {
    // oferta_escasez
    hookText = `¡Alerta en Caracas! 🚨 Solo nos quedan pocas unidades de '${product.name}' y este lote se agota hoy.`;
    problemText =
      "Las importaciones de este producto tardan semanas en llegar al país y con la alta demanda casi nunca dura disponible en tienda.";
    solutionText = `En Davebeauty tenemos stock limitado 100% original de ${product.origin} con ${product.keyIngredients || "fórmula exclusiva"} listo para entrega inmediata.`;
    demoText = `Viene en su empaque original sellado, con garantía de autenticidad y número de lote verificado para tu total tranquilidad.`;
    offerText = `Llévatelo hoy por solo ${priceFormattedUsd} USD (o en Bolívares al BCV). Usa el cupón especial ${promoCodeTag} para 5% de descuento adicional pagando con Pago Móvil o Zelle.`;
    ctaText =
      "Tenemos delivery express en Caracas para hoy mismo y envíos por MRW, Zoom y Tealca al interior. ¡Escribe ya al WhatsApp antes de que se acabe el lote!";
  }

  // 3. COPY META ADS (Facebook e Instagram)
  const copyMeta = `✨ ${angle === "problema_solucion" ? "¡Dile adiós a la frustración y recupera tu bienestar!" : angle === "ugc_testimonial" ? "El secreto que todas se están recomendando en Venezuela 💆‍♀️💖" : angle === "autoridad_kbeauty" ? "Biotecnología y pureza de alta gama para resultados reales 🔬✨" : "¡Últimas unidades disponibles con entrega inmediata en Caracas! 📦⚡"}

Conoce '${product.name}' (${product.subtitle}):

🌿 ${product.keyIngredients ? `Fórmula con ${product.keyIngredients}.` : "Ingredientes activos concentrados de máxima pureza."}
🛡️ 100% Original importado directamente (${product.origin}).
💧 Resultados visibles, rápida absorción y fórmula no pesada.
${obj ? `✅ ¿Dudas sobre ${obj}? Tranquila/o: cuenta con total garantía de autenticidad y satisfacción.` : "✅ Calidad comprobada con más de cientos de clientes satisfechos en Venezuela."}

📍 Disponible en Davebeauty con respaldo y confianza garantizada.
💵 Precio: ${priceFormattedUsd} USD (o en Bolívares a la tasa oficial BCV del día).
${seed.promoCode ? `🎁 Aplica el cupón *${promoCodeTag}* y obtén 5% de descuento en tu primera orden.` : ""}
💳 Métodos de pago venezolanos: Pago Móvil, Zelle y Binance Pay (USDT).
🚚 Despachos rápidos: Delivery coordinado en Caracas y envíos asegurados a toda Venezuela por MRW, Zoom y Tealca.

📲 ¡Haz clic en 'Enviar mensaje' y asegura tu pedido hoy mismo por WhatsApp!`;

  // 4. COPY TIKTOK ADS
  const copyTiktok = `${hookText} '${product.name}' original de ${product.origin} con ${product.keyIngredients || "fórmula premium"} ✨ Resultados reales sin arruinar tu presupuesto. Solo ${priceFormattedUsd} USD (o Bolívares tasa oficial BCV con Pago Móvil o Zelle) 🇻🇪📦 Envíos a toda Venezuela y delivery en Caracas. Pídelo al WhatsApp en el enlace del perfil con el cupón ${promoCodeTag} 📲 #davebeauty #caracas #venezuela #pagomovil #kbeautyve #cuidadointegral`;

  // 5. GUIÓN DE CIERRE RÁPIDO PARA WHATSAPP
  const copyWhatsappClosing = `¡Hola! 👋 Qué gusto saludarte. Gracias por escribir a Davebeauty sobre *${product.name}*.

Está disponible con entrega inmediata.
💵 Inversión: *${priceFormattedUsd} USD* (o su equivalente oficial en Bolívares a tasa oficial BCV: *${priceFormattedVes}*).
${seed.promoCode ? `🎁 Con tu cupón *${promoCodeTag}* te queda con 5% de descuento adicional.` : ""}

💳 Puedes pagar cómodamente mediante:
• Pago Móvil (Tasa oficial BCV)
• Zelle
• Binance Pay (USDT)

🛵 Hacemos delivery en Caracas y envíos a todo el país por MRW, Zoom y Tealca con número de guía.
¿En qué ciudad te encuentras para coordinar tu entrega hoy mismo?`;

  // 6. ESTRATEGIA Y SEGMENTACIÓN VENEZUELA
  const audiencesVe = {
    target: audience || (product.category.includes("K-Beauty") || product.category.includes("Skincare")
      ? "Mujeres de 25 a 55 años interesadas en skincare coreano, antiedad, cuidado facial y productos importados originales."
      : product.category.includes("Capilar")
        ? "Hombres y mujeres de 22 a 55 años con caída del cabello, cabello fino o dañado por decoloración y químicos."
        : "Hombres y mujeres de 25 a 60 años enfocados en salud digestiva, bienestar holístico, medicina preventiva y fitoterapia."),
    interests:
      product.category.includes("K-Beauty") || product.category.includes("Skincare")
        ? ["Cosmética coreana", "Cuidado de la piel", "Antienvejecimiento", "Rutina facial", "Belleza"]
        : product.category.includes("Capilar")
          ? ["Pérdida de cabello", "Salón de belleza", "Cuidado capilar", "Shampoo orgánico", "Estilo de vida"]
          : ["Suplementos dietéticos", "Salud digestiva", "Vida saludable", "Nutrición holística", "Medicina natural"],
    locations:
      "Caracas (prioridad entrega express en Chacao, Baruta, El Hatillo, Libertador) + Grandes ciudades (Valencia, Maracaibo, Lechería, Barquisimeto, San Cristóbal, Porlamar).",
    budgetNote: `$ 5.00 a $ 20.00 USD / día (Aproximadamente ${vesFromUsd(10, DEFAULT_BCV_RATE)} a tasa oficial BCV referencial). Empieza con $5 USD/día para testear los primeros 3 días.`,
    objectionHandling: obj
      ? `Para derribar la objeción "${obj}": En el guión de WhatsApp y video se enfatiza de forma transparente que los pagos en Bolívares se calculan a tasa oficial BCV sin recargos ocultos, con fotos del producto real y guías de envío verificables de Zoom/MRW.`
      : "Transparencia absoluta en bimoneda: el cliente puede pagar con Pago Móvil a tasa oficial BCV o con Zelle/USDT. Envíos con foto de guía y despacho garantizado.",
  };

  return {
    product,
    angle,
    prompts: {
      main: imagePromptMain,
      vertical: imagePromptVertical,
    },
    ugcScript: {
      hook: hookText,
      problem: problemText,
      solution: solutionText,
      demo: demoText,
      offer: offerText,
      cta: ctaText,
    },
    copies: {
      metaAds: copyMeta,
      tiktokAds: copyTiktok,
      whatsappClosing: copyWhatsappClosing,
    },
    audiencesVe,
  };
}

export function CreativosDola({ ctx }: { ctx: Ctx }) {
  // Productos de la tienda cargados desde el backend
  const { data: storeProducts } = useResource<Product[]>("/api/products", ctx.tick);

  // Estados de Selección de Producto
  const [productMode, setProductMode] = useState<"bestsellers" | "catalogo" | "custom">("bestsellers");
  const [selectedBestsellerId, setSelectedBestsellerId] = useState<string>("oregano");
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>("");

  // Producto Personalizado / Semilla Libre
  const [customProduct, setCustomProduct] = useState<CustomProductInput>({
    name: "Sérum Facial Niacinamida 10% + Zinc 1%",
    subtitle: "Davebeauty Select · 30ml · Control de Grasa & Poros",
    category: "Skincare Facial",
    priceUsd: 18.0,
    keyIngredients: "Niacinamida pura al 10%, Zinc PCA al 1%, Ácido Hialurónico vegetal",
    origin: "Estados Unidos (Davebeauty Select)",
    delivery: "Entrega inmediata Caracas / 24-48h Nacional por MRW, Zoom y Tealca",
  });

  // Ángulo de Marketing Seleccionado
  const [marketingAngle, setMarketingAngle] = useState<MarketingAngle>("problema_solucion");

  // Parámetros de Semilla Personalizada (Opcionales)
  const [seedParams, setSeedParams] = useState<CreativeSeedParams>({
    keywords: "",
    targetAudience: "",
    objection: "¿Cobran a tasa oficial BCV?",
    promoCode: "PRIMERACOMPRA5",
  });

  // Configuración del Webhook de n8n
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState<string>(() => {
    try {
      return (
        localStorage.getItem("traxo:n8n_webhook_url") ||
        "https://n8n.daverod.tech/webhook/traxo-marketing-creatives"
      );
    } catch {
      return "https://n8n.daverod.tech/webhook/traxo-marketing-creatives";
    }
  });
  const [n8nWebhookToken, setN8nWebhookToken] = useState<string>(() => {
    try {
      return localStorage.getItem("traxo:n8n_webhook_token") || "";
    } catch {
      return "";
    }
  });
  const [showN8nConfig, setShowN8nConfig] = useState<boolean>(false);
  const [showPayloadModal, setShowPayloadModal] = useState<boolean>(false);
  const [n8nLoading, setN8nLoading] = useState<boolean>(false);
  const [n8nStatusMsg, setN8nStatusMsg] = useState<{ tone: Tone; text: string } | null>(null);

  // Overrides dinámicos recibidos desde n8n (si responde con datos procesados)
  const [n8nOverrides, setN8nOverrides] = useState<any | null>(null);

  // Guardar configuración n8n en localStorage
  useEffect(() => {
    try {
      localStorage.setItem("traxo:n8n_webhook_url", n8nWebhookUrl);
      localStorage.setItem("traxo:n8n_webhook_token", n8nWebhookToken);
    } catch {}
  }, [n8nWebhookUrl, n8nWebhookToken]);

  // Formato / Pestañas de salida
  const [tabMode, setTabMode] = useState<string>("imagen");
  const [objective, setObjective] = useState<string>("whatsapp");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [variationCount, setVariationCount] = useState<number>(0);

  // Resolver el producto actual seleccionado
  const currentProduct = useMemo(() => {
    if (productMode === "bestsellers") {
      const found = DAVEBEAUTY_KITS.find((k) => k.id === selectedBestsellerId);
      return (
        found ??
        DAVEBEAUTY_KITS[0] ?? {
          id: "oregano",
          name: "Aceite de orégano con semilla negra",
          subtitle: "Micro Ingredients · 60 Cápsulas Blandas (6.000 mg Herbal)",
          category: "Bienestar & Inmunidad",
          priceUsd: 22.99,
          badge: "Bestseller Salud",
          origin: "Estados Unidos (Micro Ingredients)",
          delivery: "Entrega inmediata Caracas / 24-48h Nacional",
          keyIngredients: "Aceite concentrado de orégano salvaje + semilla negra",
        }
      );
    }

    if (productMode === "catalogo") {
      const items = storeProducts ?? [];
      const found = items.find((p) => p.id === selectedCatalogId) || items[0];
      if (found) {
        return {
          id: found.id,
          name: found.title,
          subtitle: found.description
            ? found.description.slice(0, 70) + (found.description.length > 70 ? "..." : "")
            : "Producto oficial de la tienda Davebeauty",
          category: "Catálogo Tienda",
          priceUsd: found.price,
          badge: "Catálogo Activo",
          origin: "Davebeauty Import / Nacional",
          delivery: "Entrega inmediata Caracas / 24-48h Nacional",
          keyIngredients: found.description || "Fórmula e-commerce activa",
        };
      }
    }

    // custom mode
    return {
      id: "custom-product",
      name: customProduct.name || "Producto Personalizado",
      subtitle: customProduct.subtitle || "Fórmula exclusiva Davebeauty",
      category: customProduct.category || "General",
      priceUsd: Number(customProduct.priceUsd) || 20.0,
      badge: "Lanzamiento Nuevo",
      origin: customProduct.origin || "Davebeauty Venezuela",
      delivery: customProduct.delivery || "Caracas y Envíos Nacionales",
      keyIngredients: customProduct.keyIngredients || "Activos de alta pureza",
    };
  }, [productMode, selectedBestsellerId, selectedCatalogId, customProduct, storeProducts]);

  // Generar el Kit Creativo Base (Local / Autónomo)
  const baseCreativeKit = useMemo(() => {
    return buildDynamicCreativeKit({
      product: currentProduct,
      angle: marketingAngle,
      seed: seedParams,
      objective,
      variationSeed: variationCount,
    });
  }, [currentProduct, marketingAngle, seedParams, objective, variationCount]);

  // Si n8n devolvió creativos generados por workflows externos, los fusionamos limpiamente
  const creativeKit = useMemo(() => {
    if (!n8nOverrides) return baseCreativeKit;

    return {
      ...baseCreativeKit,
      prompts: {
        main: n8nOverrides.imagePrompt || n8nOverrides.prompts?.main || baseCreativeKit.prompts.main,
        vertical:
          n8nOverrides.imagePromptVertical ||
          n8nOverrides.prompts?.vertical ||
          baseCreativeKit.prompts.vertical,
      },
      ugcScript: {
        ...baseCreativeKit.ugcScript,
        ...(n8nOverrides.ugcScript || {}),
      },
      copies: {
        metaAds: n8nOverrides.copyMeta || n8nOverrides.copies?.metaAds || baseCreativeKit.copies.metaAds,
        tiktokAds:
          n8nOverrides.copyTiktok || n8nOverrides.copies?.tiktokAds || baseCreativeKit.copies.tiktokAds,
        whatsappClosing:
          n8nOverrides.whatsappClosing ||
          n8nOverrides.copies?.whatsappClosing ||
          baseCreativeKit.copies.whatsappClosing,
      },
    };
  }, [baseCreativeKit, n8nOverrides]);

  // Construcción del Payload Canónico para n8n
  const canonicalPayload = useMemo(() => {
    return {
      event: "marketing.creative.generate",
      timestamp: new Date().toISOString(),
      store: {
        id: "davebeauty",
        market: "VE",
        currency: "USD",
        bcvRate: DEFAULT_BCV_RATE,
      },
      product: {
        id: currentProduct.id,
        name: currentProduct.name,
        subtitle: currentProduct.subtitle,
        priceUsd: currentProduct.priceUsd,
        category: currentProduct.category,
        origin: currentProduct.origin,
        keyIngredients: currentProduct.keyIngredients,
      },
      strategy: {
        angle: marketingAngle,
        angleTitle: MARKETING_ANGLES[marketingAngle].title,
        targetAudience:
          seedParams.targetAudience || "Público general en Venezuela (Caracas, Valencia, Maracaibo)",
        seedKeywords: seedParams.keywords || "",
        objectionToOvercome: seedParams.objection || "",
        offerDiscount: seedParams.promoCode
          ? `5% con cupón ${seedParams.promoCode.trim().toUpperCase()}`
          : "5% PRIMERACOMPRA5",
        objective,
      },
      localDraft: {
        imagePrompt: baseCreativeKit.prompts.main,
        imagePromptVertical: baseCreativeKit.prompts.vertical,
        ugcScript: baseCreativeKit.ugcScript,
        copyMeta: baseCreativeKit.copies.metaAds,
        copyTiktok: baseCreativeKit.copies.tiktokAds,
        whatsappClosing: baseCreativeKit.copies.whatsappClosing,
      },
      desiredOutputs: [
        "dola_image_prompt",
        "ugc_video_script_capcut",
        "meta_ad_copy",
        "tiktok_ad_copy",
        "whatsapp_closing_script",
      ],
    };
  }, [currentProduct, marketingAngle, seedParams, objective, baseCreativeKit]);

  // Disparar Webhook hacia n8n
  const triggerN8nWebhook = async (isTestPing = false) => {
    if (!n8nWebhookUrl.trim()) {
      setN8nStatusMsg({ tone: "critical", text: "Por favor ingresa una URL válida para el webhook de n8n." });
      return;
    }

    setN8nLoading(true);
    setN8nStatusMsg(null);

    const payload = isTestPing
      ? {
          event: "ping.test",
          timestamp: new Date().toISOString(),
          store: "davebeauty",
          source: "traxo-agente-dashboard",
          message: "Prueba de conectividad exitosa desde Traxo Marketing",
        }
      : canonicalPayload;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (n8nWebhookToken.trim()) {
        headers["Authorization"] = `Bearer ${n8nWebhookToken.trim()}`;
        headers["X-Webhook-Token"] = n8nWebhookToken.trim();
      }

      const res = await fetch(n8nWebhookUrl.trim(), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`n8n respondió con error HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json().catch(() => null);

      if (isTestPing) {
        setN8nStatusMsg({
          tone: "success",
          text: `¡Conexión confirmada! n8n respondió con código ${res.status} (OK).`,
        });
        ctx.toast("¡Test Ping a n8n exitoso!");
      } else {
        if (data && (data.copyMeta || data.imagePrompt || data.ugcScript || data.prompts)) {
          setN8nOverrides(data);
          setN8nStatusMsg({
            tone: "success",
            text: "¡Creativos procesados y actualizados dinámicamente desde el workflow de n8n!",
          });
          ctx.toast("¡Creativos generados y sincronizados desde n8n!");
        } else {
          setN8nStatusMsg({
            tone: "success",
            text: "¡Payload canónico recibido por n8n correctamente! Tu workflow ya está en marcha.",
          });
          ctx.toast("¡Evento enviado a n8n con éxito!");
        }
      }
    } catch (err: any) {
      setN8nStatusMsg({
        tone: "critical",
        text: `Error de envío: ${err?.message || "No se pudo contactar al webhook de n8n. Revisa CORS y la URL."}`,
      });
      ctx.toast(`Error webhook n8n: ${err?.message || "Fallo de conexión"}`);
    } finally {
      setN8nLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      ctx.toast("¡Copiado al portapapeles! Listo para usar.");
      window.setTimeout(() => setCopiedKey(null), 3000);
    }
  };

  const openDola = () => {
    window.open("https://www.dola.com", "_blank", "noopener,noreferrer");
  };

  const handleNextAngle = () => {
    const keys: MarketingAngle[] = [
      "problema_solucion",
      "ugc_testimonial",
      "autoridad_kbeauty",
      "oferta_escasez",
    ];
    const currentIndex = keys.indexOf(marketingAngle);
    const nextKey = keys[(currentIndex + 1) % keys.length] ?? "problema_solucion";
    setMarketingAngle(nextKey);
    setN8nOverrides(null);
    setVariationCount((v) => v + 1);
    ctx.toast(`Ángulo cambiado a: ${MARKETING_ANGLES[nextKey].title}`);
  };

  const getFullUgcScriptText = () => {
    const u = creativeKit.ugcScript;
    return `[GUIÓN DE VIDEO PUBLICITARIO UGC (TikTok / Reels) - ${currentProduct.name.toUpperCase()}]
Ángulo: ${MARKETING_ANGLES[marketingAngle].title}
Objetivo: ${
      objective === "whatsapp"
        ? "Cierre directo por WhatsApp"
        : objective === "ventas"
          ? "Conversión en Tienda Web"
          : "Tráfico y Reconocimiento"
    }
Duración estimada: 30 segundos
Plataforma: Reels / TikTok Ads / Shorts

1. HOOK VISUAL Y VERBAL (0 a 3 seg):
Visual: Creador/a en primer plano con expresión de impacto sosteniendo el producto.
Texto dinámico en pantalla: "${u.hook}"
Audio: "${u.hook}"

2. AGITACIÓN DEL PROBLEMA (3 a 8 seg):
Visual: Muestra de la frustración o problema cotidiano en el clima/rutina de Venezuela.
Audio: "${u.problem}"

3. REVELACIÓN DE LA SOLUCIÓN (8 a 15 seg):
Visual: Destapar el producto, mostrar empaque original de alta gama e ingredientes clave (${currentProduct.keyIngredients}).
Audio: "${u.solution}"

4. DEMOSTRACIÓN PRÁCTICA (15 a 22 seg):
Visual: Aplicación real en piel/cabello mostrando textura inmediata sin residuo pegajoso.
Audio: "${u.demo}"

5. OFERTA Y LOCALIZACIÓN VENEZUELA (22 a 26 seg):
Visual: Texto en pantalla: "${usd(currentProduct.priceUsd)} (o en Bs. al BCV) · Pago Móvil / Zelle".
Audio: "${u.offer}"

6. LLAMADA A LA ACCIÓN (26 a 30 seg):
Visual: Creador/a señalando el enlace al perfil o botón directo de WhatsApp.
Audio: "${u.cta}"`;
  };

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* Banner Principal de Marketing & Orquestación */}
      <div
        className="card"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 200, 5, 0.08) 0%, rgba(31, 95, 173, 0.08) 100%)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: "20px 24px",
        }}
      >
        <div className="row between" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
              <ToneBadge tone="success">100% GRATIS · MODO HÍBRIDO LOCAL & N8N</ToneBadge>
              <span className="caption mono">Dola AI · CapCut · Meta Ads · n8n</span>
            </div>
            <h2 style={{ margin: "4px 0 8px", fontSize: "1.35rem", color: "var(--ink)" }}>
              Generador de Creativos & Orquestación de Marketing (Venezuela)
            </h2>
            <p className="muted" style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5 }}>
              Genera instantáneamente prompts de estudio para <strong>Dola AI</strong>, guiones UGC
              con tiempos exactos para CapCut, copys de alta conversión para Meta Ads y dispara payloads
              a tu <strong>n8n Webhook</strong> para automatizar Midjourney, Claude o Meta Ads API.
              Bimoneda nativa limpia (USD y Bolívares a tasa oficial BCV), Pago Móvil y Zelle.
            </p>
          </div>
          <div className="row" style={{ gap: 10, alignSelf: "center", flexWrap: "wrap" }}>
            <Button
              variant={showN8nConfig ? "primary" : "ghost"}
              icon="settings"
              onClick={() => setShowN8nConfig((v) => !v)}
            >
              {showN8nConfig ? "Ocultar n8n Webhook" : "Conector n8n Webhook"}
            </Button>
            <Button variant="agent" icon="spark" onClick={openDola} style={{ fontWeight: 600 }}>
              Abrir Dola.com ↗
            </Button>
          </div>
        </div>

        {/* Panel Colapsable de Conexión n8n Webhook */}
        {showN8nConfig && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px dashed var(--line)",
            }}
          >
            <div
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "16px 20px",
              }}
            >
              <div className="row between" style={{ alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <span style={{ color: "var(--brand)" }}>
                    <Icon name="bolt" size={20} />
                  </span>
                  <strong style={{ fontSize: "0.98rem", color: "var(--ink)" }}>
                    Conector de Automatización n8n (Sin APIs Rígidas Externas)
                  </strong>
                </div>
                <ToneBadge tone={n8nWebhookUrl ? "agent" : "neutral"}>
                  {n8nWebhookUrl ? "Webhook Configurado" : "Sin Configurar"}
                </ToneBadge>
              </div>

              <p className="caption" style={{ margin: "0 0 14px", color: "var(--ink-muted)", lineHeight: 1.45 }}>
                En vez de acoplar directamente APIs externas (Fal.ai, Midjourney, Higgsfield), Traxo envía el
                payload estructurado a tu servidor n8n para que tus workflows se encarguen de la orquestación.
                Los resultados locales se muestran de inmediato, y si n8n responde con creativos generados por IA,
                la pantalla se actualiza automáticamente.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <label className="caption" style={{ fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
                    URL del Webhook de n8n (Production / Test)
                  </label>
                  <input
                    className="input sm"
                    style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem" }}
                    value={n8nWebhookUrl}
                    onChange={(e) => setN8nWebhookUrl(e.target.value)}
                    placeholder="https://n8n.daverod.tech/webhook/traxo-marketing-creatives"
                  />
                </div>

                <div>
                  <label className="caption" style={{ fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
                    Header / Token de Autenticación (Opcional Bearer)
                  </label>
                  <input
                    className="input sm"
                    type="password"
                    style={{ width: "100%", fontFamily: "monospace", fontSize: "0.85rem" }}
                    value={n8nWebhookToken}
                    onChange={(e) => setN8nWebhookToken(e.target.value)}
                    placeholder="Bearer token-secreto-n8n"
                  />
                </div>
              </div>

              {n8nStatusMsg && (
                <div style={{ marginBottom: 12 }}>
                  <ToneBadge tone={n8nStatusMsg.tone}>{n8nStatusMsg.text}</ToneBadge>
                </div>
              )}

              <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div className="row" style={{ gap: 8 }}>
                  <Button
                    variant="agent"
                    sm
                    icon="bolt"
                    disabled={n8nLoading}
                    onClick={() => triggerN8nWebhook(false)}
                  >
                    {n8nLoading ? "Disparando a n8n..." : "🚀 Disparar a mi n8n Webhook"}
                  </Button>
                  <Button
                    variant="ghost"
                    sm
                    icon="refresh"
                    disabled={n8nLoading}
                    onClick={() => triggerN8nWebhook(true)}
                  >
                    Test Ping a n8n
                  </Button>
                </div>

                <div className="row" style={{ gap: 8 }}>
                  <Button
                    variant="ghost"
                    sm
                    icon="list"
                    onClick={() => setShowPayloadModal((v) => !v)}
                  >
                    {showPayloadModal ? "Ocultar Payload JSON" : "Ver Payload Canónico"}
                  </Button>
                </div>
              </div>

              {/* Visor de Payload Canónico JSON */}
              {showPayloadModal && (
                <div style={{ marginTop: 14 }}>
                  <div className="row between" style={{ marginBottom: 6, alignItems: "center" }}>
                    <span className="caption mono" style={{ fontWeight: 600, color: "var(--ink)" }}>
                      PAYLOAD JSON CANÓNICO QUE RECIBE N8N:
                    </span>
                    <Button
                      variant="ghost"
                      sm
                      icon="copy"
                      onClick={() =>
                        copyToClipboard(JSON.stringify(canonicalPayload, null, 2), "payload-json")
                      }
                    >
                      {copiedKey === "payload-json" ? "¡Copiado!" : "Copiar JSON"}
                    </Button>
                  </div>
                  <pre
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      padding: "12px 14px",
                      fontSize: "0.82rem",
                      color: "var(--ink)",
                      overflowX: "auto",
                      maxHeight: 240,
                    }}
                  >
                    {JSON.stringify(canonicalPayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Guía rápida en 3 pasos */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px dashed var(--line)",
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--brand)",
                color: "var(--on-brand)",
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
            <span className="caption" style={{ lineHeight: 1.4, color: "var(--ink-muted)" }}>
              <strong style={{ color: "var(--ink)" }}>Elige producto y ángulo:</strong> Selecciona un
              bestseller o ingresa tu semilla con ingredientes y objeciones.
            </span>
          </div>
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--brand)",
                color: "var(--on-brand)",
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
            <span className="caption" style={{ lineHeight: 1.4, color: "var(--ink-muted)" }}>
              <strong style={{ color: "var(--ink)" }}>Pégalo en Dola o dispara n8n:</strong> Genera fotos de
              estudio 8K o deja que tus workflows automatizados produzcan variaciones.
            </span>
          </div>
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--brand)",
                color: "var(--on-brand)",
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
            <span className="caption" style={{ lineHeight: 1.4, color: "var(--ink-muted)" }}>
              <strong style={{ color: "var(--ink)" }}>Pasa a CapCut o Meta Ads:</strong> Graba el guión UGC con
              los tiempos sugeridos y cierra clientes por WhatsApp en Bs./USD.
            </span>
          </div>
        </div>
      </div>

      {/* 1. SELECCIÓN DE PRODUCTO / SEMILLA */}
      <section className="card" style={{ padding: "18px 20px" }}>
        <div className="row between" style={{ alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--ink)" }}>
              1. Selecciona el Producto o Semilla del Catálogo
            </h3>
            <p className="caption" style={{ margin: "2px 0 0", color: "var(--ink-muted)" }}>
              Escoge entre los 4 bestsellers confirmados de Davebeauty, los productos sincronizados de tu tienda o escribe una semilla libre.
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className={`btn sm ${productMode === "bestsellers" ? "primary" : ""}`}
              onClick={() => {
                setProductMode("bestsellers");
                setN8nOverrides(null);
              }}
            >
              ⭐ Bestsellers Davebeauty (4)
            </button>
            {storeProducts && storeProducts.length > 0 && (
              <button
                type="button"
                className={`btn sm ${productMode === "catalogo" ? "primary" : ""}`}
                onClick={() => {
                  setProductMode("catalogo");
                  setN8nOverrides(null);
                  if (!selectedCatalogId && storeProducts[0]) {
                    setSelectedCatalogId(storeProducts[0].id);
                  }
                }}
              >
                🏪 Mi Tienda ({storeProducts.length})
              </button>
            )}
            <button
              type="button"
              className={`btn sm ${productMode === "custom" ? "primary" : ""}`}
              onClick={() => {
                setProductMode("custom");
                setN8nOverrides(null);
              }}
            >
              ✨ Producto Semilla Libre
            </button>
          </div>
        </div>

        {/* Modo 1: Bestsellers Davebeauty */}
        {productMode === "bestsellers" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {DAVEBEAUTY_KITS.map((p) => {
              const isSelected = p.id === selectedBestsellerId;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedBestsellerId(p.id);
                    setN8nOverrides(null);
                  }}
                  style={{
                    border: isSelected ? "2px solid var(--brand)" : "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    background: isSelected ? "var(--surface-selected)" : "var(--surface)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div className="row between" style={{ alignItems: "flex-start", marginBottom: 6 }}>
                    <span
                      className={`badge ${isSelected ? "tone-agent" : "tone-neutral"}`}
                      style={{ fontSize: "0.75rem", padding: "2px 6px" }}
                    >
                      {p.badge}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "1.05rem", color: "var(--brand)" }}>
                        {usd(p.priceUsd)}
                      </strong>
                      <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>
                        {vesFromUsd(p.priceUsd, DEFAULT_BCV_RATE)}
                      </div>
                    </div>
                  </div>
                  <h4 style={{ margin: "6px 0 4px", fontSize: "0.95rem", lineHeight: 1.3, color: "var(--ink)" }}>
                    {p.name}
                  </h4>
                  <p className="caption" style={{ margin: 0, color: "var(--ink-muted)", fontSize: "0.78rem" }}>
                    {p.subtitle}
                  </p>
                  <div style={{ marginTop: 8, fontSize: "0.75rem", color: "var(--ink-muted)" }}>
                    📍 {p.delivery}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modo 2: Catálogo de la Tienda */}
        {productMode === "catalogo" && (
          <div className="stack" style={{ gap: 12 }}>
            <label className="caption" style={{ fontWeight: 600, color: "var(--ink)" }}>
              Selecciona un producto del catálogo de tu tienda:
            </label>
            <select
              className="input"
              value={selectedCatalogId}
              onChange={(e) => {
                setSelectedCatalogId(e.target.value);
                setN8nOverrides(null);
              }}
              style={{ width: "100%", padding: "8px 12px", fontSize: "0.9rem" }}
            >
              {(storeProducts ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} — {usd(p.price)} ({vesFromUsd(p.price, DEFAULT_BCV_RATE)} BCV)
                </option>
              ))}
            </select>
            <div
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "12px 16px",
              }}
            >
              <div className="row between" style={{ alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: "0.95rem", color: "var(--ink)" }}>{currentProduct.name}</strong>
                  <p className="caption" style={{ margin: "2px 0 0", color: "var(--ink-muted)" }}>
                    {currentProduct.subtitle}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--brand)" }}>
                    {usd(currentProduct.priceUsd)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>
                    {vesFromUsd(currentProduct.priceUsd, DEFAULT_BCV_RATE)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modo 3: Producto Personalizado / Semilla Libre */}
        {productMode === "custom" && (
          <div
            style={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "14px 16px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <label className="caption" style={{ fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
                Nombre del Producto *
              </label>
              <input
                className="input sm"
                style={{ width: "100%" }}
                value={customProduct.name}
                onChange={(e) => {
                  setCustomProduct({ ...customProduct, name: e.target.value });
                  setN8nOverrides(null);
                }}
                placeholder="Ej. Sérum Facial Niacinamida 10%"
              />
            </div>

            <div>
              <label className="caption" style={{ fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
                Categoría
              </label>
              <select
                className="input sm"
                style={{ width: "100%" }}
                value={customProduct.category}
                onChange={(e) => {
                  setCustomProduct({ ...customProduct, category: e.target.value });
                  setN8nOverrides(null);
                }}
              >
                <option value="Skincare K-Beauty">Skincare K-Beauty</option>
                <option value="Skincare Facial">Skincare Facial</option>
                <option value="Cuidado Capilar">Cuidado Capilar</option>
                <option value="Bienestar & Inmunidad">Bienestar & Inmunidad</option>
                <option value="Maquillaje">Maquillaje</option>
                <option value="Suplementos Salud">Suplementos Salud</option>
              </select>
            </div>

            <div>
              <label className="caption" style={{ fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
                Precio en USD ($) *
              </label>
              <input
                className="input sm"
                type="number"
                step="0.01"
                style={{ width: "100%" }}
                value={customProduct.priceUsd}
                onChange={(e) => {
                  setCustomProduct({ ...customProduct, priceUsd: parseFloat(e.target.value) || 0 });
                  setN8nOverrides(null);
                }}
                placeholder="20.00"
              />
            </div>

            <div>
              <label className="caption" style={{ fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
                Origen / Marca
              </label>
              <input
                className="input sm"
                style={{ width: "100%" }}
                value={customProduct.origin}
                onChange={(e) => {
                  setCustomProduct({ ...customProduct, origin: e.target.value });
                  setN8nOverrides(null);
                }}
                placeholder="Ej. Corea del Sur / USA / Davebeauty"
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label className="caption" style={{ fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
                Ingredientes Activos o Beneficio Clave *
              </label>
              <input
                className="input sm"
                style={{ width: "100%" }}
                value={customProduct.keyIngredients}
                onChange={(e) => {
                  setCustomProduct({ ...customProduct, keyIngredients: e.target.value });
                  setN8nOverrides(null);
                }}
                placeholder="Ej. Niacinamida 10% pura, Zinc PCA al 1%, Ácido Hialurónico vegetal sin fragancias"
              />
            </div>
          </div>
        )}
      </section>

      {/* 2. SELECCIÓN DE ÁNGULO DE MARKETING */}
      <section className="card" style={{ padding: "18px 20px" }}>
        <div className="row between" style={{ alignItems: "center", marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--ink)" }}>
              2. Selecciona el Ángulo de Marketing
            </h3>
            <p className="caption" style={{ margin: "2px 0 0", color: "var(--ink-muted)" }}>
              El ángulo psicológico reformula los ganchos de retención (Hook), los prompts visuales de Dola AI y los copys de venta.
            </p>
          </div>
          <Button variant="ghost" icon="refresh" sm onClick={handleNextAngle}>
            Alternar Ángulo
          </Button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 12,
          }}
        >
          {(Object.values(MARKETING_ANGLES) as AngleInfo[]).map((ang) => {
            const isSelected = ang.id === marketingAngle;
            return (
              <div
                key={ang.id}
                onClick={() => {
                  setMarketingAngle(ang.id);
                  setN8nOverrides(null);
                }}
                style={{
                  border: isSelected ? "2px solid var(--brand)" : "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  background: isSelected ? "var(--surface-selected)" : "var(--surface)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <ToneBadge tone={ang.tone}>{ang.badge}</ToneBadge>
                    {isSelected && (
                      <span className="caption mono" style={{ color: "var(--brand)", fontWeight: 700 }}>
                        ACTIVO
                      </span>
                    )}
                  </div>
                  <strong style={{ fontSize: "0.92rem", color: "var(--ink)", display: "block", marginBottom: 6 }}>
                    {ang.title}
                  </strong>
                  <p className="caption" style={{ margin: 0, color: "var(--ink-muted)", lineHeight: 1.4 }}>
                    {ang.summary}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. ESPECIFICACIONES DE LA SEMILLA PERSONALIZADA */}
      <section className="card stack" style={{ padding: "18px 20px", gap: 14 }}>
        <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--ink)" }}>
              3. Semilla & Especificaciones del Anuncio (Opcional)
            </h3>
            <p className="caption" style={{ margin: "2px 0 0", color: "var(--ink-muted)" }}>
              Ajusta palabras clave, objeciones específicas o cupones de descuento para afinar la puntería publicitaria.
            </p>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Button
              variant="primary"
              icon="spark"
              onClick={() => {
                setVariationCount((v) => v + 1);
                setN8nOverrides(null);
                ctx.toast("¡Nueva variación creativa generada con éxito!");
              }}
            >
              ⚡ Generar Variación Local
            </Button>
            <Button
              variant="agent"
              icon="bolt"
              disabled={n8nLoading}
              onClick={() => triggerN8nWebhook(false)}
            >
              {n8nLoading ? "Enviando a n8n..." : "🚀 Disparar a n8n Webhook"}
            </Button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            background: "var(--surface-sunken)",
            padding: "14px 16px",
            borderRadius: 8,
            border: "1px solid var(--line)",
          }}
        >
          <div>
            <label className="caption" style={{ fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
              Foco / Dolor Específico (Keywords)
            </label>
            <input
              className="input sm"
              style={{ width: "100%" }}
              value={seedParams.keywords}
              onChange={(e) => {
                setSeedParams({ ...seedParams, keywords: e.target.value });
                setN8nOverrides(null);
              }}
              placeholder="Ej. manchas solares, arrugas, hinchazón, etc."
            />
          </div>

          <div>
            <label className="caption" style={{ fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
              Público Objetivo Específico
            </label>
            <input
              className="input sm"
              style={{ width: "100%" }}
              value={seedParams.targetAudience}
              onChange={(e) => {
                setSeedParams({ ...seedParams, targetAudience: e.target.value });
                setN8nOverrides(null);
              }}
              placeholder="Ej. Mujeres 30-55 años en Caracas y Valencia"
            />
          </div>

          <div>
            <label className="caption" style={{ fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
              Objeción Principal a Derribar
            </label>
            <select
              className="input sm"
              style={{ width: "100%" }}
              value={seedParams.objection}
              onChange={(e) => {
                setSeedParams({ ...seedParams, objection: e.target.value });
                setN8nOverrides(null);
              }}
            >
              <option value="¿Cobran a tasa oficial BCV?">¿Cobran a tasa oficial BCV?</option>
              <option value="¿Es 100% original importado o réplica?">¿Es 100% original importado o réplica?</option>
              <option value="¿Llega seguro a mi estado por MRW o Zoom?">¿Llega seguro a mi estado por MRW o Zoom?</option>
              <option value="¿No me dejará la cara grasosa ni pesada?">¿No me dejará la cara grasosa ni pesada?</option>
              <option value="¿Realmente funciona rápido?">¿Realmente funciona rápido?</option>
            </select>
          </div>

          <div>
            <label className="caption" style={{ fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 4 }}>
              Cupón de Descuento
            </label>
            <input
              className="input sm"
              style={{ width: "100%" }}
              value={seedParams.promoCode}
              onChange={(e) => {
                setSeedParams({ ...seedParams, promoCode: e.target.value });
                setN8nOverrides(null);
              }}
              placeholder="PRIMERACOMPRA5"
            />
          </div>
        </div>

        {/* Configuración de Objetivo de Campaña */}
        <div className="row between" style={{ gap: 16, alignItems: "center", flexWrap: "wrap", paddingTop: 4 }}>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <label className="caption" style={{ fontWeight: 600, color: "var(--ink)" }}>
              Objetivo del Creativo:
            </label>
            <select
              className="input"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              style={{ width: "auto", minWidth: 220, padding: "6px 12px", fontSize: "0.85rem" }}
            >
              <option value="whatsapp">📲 WhatsApp Directo (Cierre 1 a 1 en Bs./USD)</option>
              <option value="ventas">🛒 Ventas en Tienda Web (Checkout Headless)</option>
              <option value="trafico">👀 Tráfico & Reconocimiento (Glow / Viral)</option>
            </select>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <span className="caption" style={{ color: "var(--ink-muted)" }}>
              Producto activo: <strong style={{ color: "var(--ink)" }}>{currentProduct.name}</strong> ({usd(currentProduct.priceUsd)} / {vesFromUsd(currentProduct.priceUsd, DEFAULT_BCV_RATE)})
            </span>
          </div>
        </div>
      </section>

      {/* 4. TABS DE CONTENIDO GENERADO */}
      <Tabs
        label="Formato de Creativo Generado"
        value={tabMode}
        onChange={setTabMode}
        items={[
          ["imagen", "📸 Prompt Imagen (Dola AI)"],
          ["ugc", "🎬 Guión UGC Video (TikTok/Reels)"],
          ["copys", "📝 Copys para Anuncios (Meta / TikTok / WhatsApp)"],
          ["estrategia", "🇻🇪 Estrategia & Segmentación Venezuela"],
        ]}
      />

      {/* PESTAÑA 1: PROMPTS PARA DOLA AI */}
      {tabMode === "imagen" && (
        <section className="card stack" style={{ gap: 16 }}>
          <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--ink)" }}>
                Prompt de Fotografía Comercial para Dola AI
              </h3>
              <p className="caption" style={{ margin: "4px 0 0", color: "var(--ink-muted)" }}>
                Adaptado al ángulo <strong>{MARKETING_ANGLES[marketingAngle].title}</strong>. Formulado para generar fotos comerciales con iluminación de lujo y empaque hiperrealista en Dola.
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Button
                variant={copiedKey === "img-main" ? "primary" : "agent"}
                icon={copiedKey === "img-main" ? "check" : "copy"}
                onClick={() => copyToClipboard(creativeKit.prompts.main, "img-main")}
              >
                {copiedKey === "img-main" ? "¡Copiado para Dola!" : "Copiar Prompt Cuadrado 1:1"}
              </Button>
              <Button variant="ghost" icon="external" onClick={openDola}>
                Abrir Dola.com ↗
              </Button>
            </div>
          </div>

          {/* Prompt Principal 1:1 */}
          <div className="stack" style={{ gap: 8 }}>
            <div className="row between" style={{ alignItems: "center" }}>
              <span className="caption mono" style={{ fontWeight: 600, color: "var(--ink)" }}>
                FORMATO 1:1 · FEED INSTAGRAM / CATÁLOGO TIENDA:
              </span>
              <Button
                variant="ghost"
                sm
                icon={copiedKey === "img-main" ? "check" : "copy"}
                onClick={() => copyToClipboard(creativeKit.prompts.main, "img-main")}
              >
                {copiedKey === "img-main" ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <div
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "16px 18px",
                fontFamily: "monospace",
                fontSize: "0.88rem",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                color: "var(--ink)",
              }}
            >
              {creativeKit.prompts.main}
            </div>
          </div>

          {/* Prompt Secundario Vertical 9:16 */}
          <div className="stack" style={{ gap: 8 }}>
            <div className="row between" style={{ alignItems: "center" }}>
              <span className="caption mono" style={{ fontWeight: 600, color: "var(--ink)" }}>
                FORMATO VERTICAL 9:16 · STORIES & TIKTOK ADS:
              </span>
              <Button
                variant="ghost"
                sm
                icon={copiedKey === "img-vert" ? "check" : "copy"}
                onClick={() => copyToClipboard(creativeKit.prompts.vertical, "img-vert")}
              >
                {copiedKey === "img-vert" ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <div
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "16px 18px",
                fontFamily: "monospace",
                fontSize: "0.88rem",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                color: "var(--ink)",
              }}
            >
              {creativeKit.prompts.vertical}
            </div>
          </div>

          {/* Consejos para Dola AI */}
          <div
            className="row"
            style={{
              gap: 12,
              background: "var(--agent-soft)",
              border: "1px solid var(--agent-line)",
              borderRadius: 8,
              padding: "12px 16px",
              alignItems: "flex-start",
            }}
          >
            <span style={{ color: "var(--brand)" }}>
              <Icon name="spark" size={20} />
            </span>
            <div className="caption" style={{ lineHeight: 1.5, color: "var(--ink)" }}>
              <strong style={{ color: "var(--ink)" }}>Consejos de Oro para Dola AI:</strong>
              <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                <li>Puedes escribirle en español a Dola: <em>"Crea una versión con fondo de mármol blanco y luz cálida de atardecer"</em>.</li>
                <li>Si el texto del producto se deforma, pídele a Dola: <em>"Mantén el envase minimalista y el etiquetado ultra nítido sin distorsiones"</em>.</li>
                <li>Para anuncios de TikTok y Stories, descarga la imagen vertical 9:16 o añade subtítulos encima en CapCut.</li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* PESTAÑA 2: GUIÓN UGC VIDEO (TikTok / Reels 0-30s) */}
      {tabMode === "ugc" && (
        <section className="card stack" style={{ gap: 16 }}>
          <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--ink)" }}>
                Guión UGC de Video TikTok / Reels (0 a 30s)
              </h3>
              <p className="caption" style={{ margin: "4px 0 0", color: "var(--ink-muted)" }}>
                Estructura de alta retención dividida en 6 tarjetas sin bordes agresivos, con tiempos exactos y badges tonales.
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Button
                variant={copiedKey === "ugc-all" ? "primary" : "agent"}
                icon={copiedKey === "ugc-all" ? "check" : "copy"}
                onClick={() => copyToClipboard(getFullUgcScriptText(), "ugc-all")}
              >
                {copiedKey === "ugc-all" ? "¡Guión Completo Copiado!" : "Copiar Guión Completo"}
              </Button>
              <Button variant="ghost" icon="external" onClick={openDola}>
                Refinar en Dola ↗
              </Button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {/* 1. Hook */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row between" style={{ marginBottom: 6 }}>
                <ToneBadge tone="critical">0 - 3s · Hook Visual & Verbal</ToneBadge>
                <Button
                  variant="ghost"
                  sm
                  icon={copiedKey === "ugc-1" ? "check" : "copy"}
                  onClick={() => copyToClipboard(creativeKit.ugcScript.hook, "ugc-1")}
                >
                  {copiedKey === "ugc-1" ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "var(--ink)" }}>
                "{creativeKit.ugcScript.hook}"
              </p>
              <div className="caption" style={{ marginTop: 6, color: "var(--ink-muted)" }}>
                🎥 <strong>Cámara:</strong> Creador/a en primer plano con rostro de sorpresa o fastidio, sosteniendo el producto frente al lente.
              </div>
            </div>

            {/* 2. Problema */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row between" style={{ marginBottom: 6 }}>
                <ToneBadge tone="attention">3 - 8s · Agitación del Dolor Cotidiano</ToneBadge>
                <Button
                  variant="ghost"
                  sm
                  icon={copiedKey === "ugc-2" ? "check" : "copy"}
                  onClick={() => copyToClipboard(creativeKit.ugcScript.problem, "ugc-2")}
                >
                  {copiedKey === "ugc-2" ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--ink)" }}>
                "{creativeKit.ugcScript.problem}"
              </p>
              <div className="caption" style={{ marginTop: 6, color: "var(--ink-muted)" }}>
                🎥 <strong>Cámara:</strong> B-roll rápido mostrando el dolor o la molestia (hinchazón, calor, maquillaje derretido o cabello débil).
              </div>
            </div>

            {/* 3. Solución */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row between" style={{ marginBottom: 6 }}>
                <ToneBadge tone="success">8 - 15s · Presentación de la Solución ({currentProduct.origin})</ToneBadge>
                <Button
                  variant="ghost"
                  sm
                  icon={copiedKey === "ugc-3" ? "check" : "copy"}
                  onClick={() => copyToClipboard(creativeKit.ugcScript.solution, "ugc-3")}
                >
                  {copiedKey === "ugc-3" ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--ink)" }}>
                "{creativeKit.ugcScript.solution}"
              </p>
              <div className="caption" style={{ marginTop: 6, color: "var(--ink-muted)" }}>
                🎥 <strong>Cámara:</strong> Destapar el producto, mostrar la etiqueta nítida y los ingredientes activos principales.
              </div>
            </div>

            {/* 4. Demostración */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row between" style={{ marginBottom: 6 }}>
                <ToneBadge tone="progress">15 - 22s · Demostración en Vivo & Sensación</ToneBadge>
                <Button
                  variant="ghost"
                  sm
                  icon={copiedKey === "ugc-4" ? "check" : "copy"}
                  onClick={() => copyToClipboard(creativeKit.ugcScript.demo, "ugc-4")}
                >
                  {copiedKey === "ugc-4" ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--ink)" }}>
                "{creativeKit.ugcScript.demo}"
              </p>
              <div className="caption" style={{ marginTop: 6, color: "var(--ink-muted)" }}>
                🎥 <strong>Cámara:</strong> Aplicación real en piel/cabello o toma de cápsula con agua. Mostrar absorción inmediata sin residuos.
              </div>
            </div>

            {/* 5. Oferta Bimoneda */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row between" style={{ marginBottom: 6 }}>
                <ToneBadge tone="agent">22 - 26s · Oferta Bimoneda (USD / BCV) & Pagos</ToneBadge>
                <Button
                  variant="ghost"
                  sm
                  icon={copiedKey === "ugc-5" ? "check" : "copy"}
                  onClick={() => copyToClipboard(creativeKit.ugcScript.offer, "ugc-5")}
                >
                  {copiedKey === "ugc-5" ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <p style={{ margin: 0, fontSize: "0.92rem", fontWeight: 600, color: "var(--ink)" }}>
                "{creativeKit.ugcScript.offer}"
              </p>
              <div className="caption" style={{ marginTop: 6, color: "var(--ink-muted)" }}>
                🎥 <strong>Texto dinámico en pantalla:</strong> "{usd(currentProduct.priceUsd)} (o en Bs. a tasa BCV) · Pago Móvil / Zelle".
              </div>
            </div>

            {/* 6. CTA WhatsApp */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row between" style={{ marginBottom: 6 }}>
                <ToneBadge tone="neutral">26 - 30s · Cierre Directo a WhatsApp & Delivery</ToneBadge>
                <Button
                  variant="ghost"
                  sm
                  icon={copiedKey === "ugc-6" ? "check" : "copy"}
                  onClick={() => copyToClipboard(creativeKit.ugcScript.cta, "ugc-6")}
                >
                  {copiedKey === "ugc-6" ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--ink)" }}>
                "{creativeKit.ugcScript.cta}"
              </p>
              <div className="caption" style={{ marginTop: 6, color: "var(--ink-muted)" }}>
                🎥 <strong>Cámara:</strong> Creador/a señalando hacia abajo o al sticker de WhatsApp con sonrisa de confianza.
              </div>
            </div>
          </div>

          {/* Tips de Edición en CapCut */}
          <div
            className="row between"
            style={{
              alignItems: "center",
              background: "var(--surface-sunken)",
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <span className="caption" style={{ color: "var(--ink-muted)" }}>
              🎬 <strong>Edición rápida en CapCut:</strong> Usa la herramienta 'Subtítulos automáticos' con plantilla amarilla/blanca, cortes de salto cada 1.5s y música en tendencia al 12% de volumen.
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

      {/* PESTAÑA 3: COPYS PARA ANUNCIOS (Meta, TikTok y WhatsApp) */}
      {tabMode === "copys" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 16 }}>
          {/* Copy Meta Ads */}
          <section className="card stack" style={{ gap: 12 }}>
            <div className="row between" style={{ alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--ink)" }}>Meta Ads (Instagram / Facebook)</h3>
                <span className="caption" style={{ color: "var(--ink-muted)" }}>
                  Formato persuasivo largo con viñetas, emojis y oferta bimoneda
                </span>
              </div>
              <Button
                variant={copiedKey === "meta" ? "primary" : "agent"}
                icon={copiedKey === "meta" ? "check" : "copy"}
                sm
                onClick={() => copyToClipboard(creativeKit.copies.metaAds, "meta")}
              >
                {copiedKey === "meta" ? "¡Copiado!" : "Copiar"}
              </Button>
            </div>

            <div
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px",
                fontSize: "0.85rem",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                maxHeight: 380,
                overflowY: "auto",
                color: "var(--ink)",
              }}
            >
              {creativeKit.copies.metaAds}
            </div>
          </section>

          {/* Copy TikTok Ads */}
          <section className="card stack" style={{ gap: 12 }}>
            <div className="row between" style={{ alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--ink)" }}>TikTok Ads / Reels Cortos</h3>
                <span className="caption" style={{ color: "var(--ink-muted)" }}>
                  Ágil, dinámico y con hashtags de alta conversión en Venezuela
                </span>
              </div>
              <Button
                variant={copiedKey === "tiktok" ? "primary" : "agent"}
                icon={copiedKey === "tiktok" ? "check" : "copy"}
                sm
                onClick={() => copyToClipboard(creativeKit.copies.tiktokAds, "tiktok")}
              >
                {copiedKey === "tiktok" ? "¡Copiado!" : "Copiar"}
              </Button>
            </div>

            <div
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px",
                fontSize: "0.85rem",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                maxHeight: 380,
                overflowY: "auto",
                color: "var(--ink)",
              }}
            >
              {creativeKit.copies.tiktokAds}
            </div>
          </section>

          {/* Guión de Cierre en WhatsApp */}
          <section className="card stack" style={{ gap: 12 }}>
            <div className="row between" style={{ alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--ink)" }}>Cierre Rápido en WhatsApp</h3>
                <span className="caption" style={{ color: "var(--ink-muted)" }}>
                  Listo para que el agente confirme pedido y pago en 1 minuto
                </span>
              </div>
              <Button
                variant={copiedKey === "wa-closing" ? "primary" : "agent"}
                icon={copiedKey === "wa-closing" ? "check" : "copy"}
                sm
                onClick={() => copyToClipboard(creativeKit.copies.whatsappClosing, "wa-closing")}
              >
                {copiedKey === "wa-closing" ? "¡Copiado!" : "Copiar"}
              </Button>
            </div>

            <div
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px",
                fontSize: "0.85rem",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                maxHeight: 380,
                overflowY: "auto",
                color: "var(--ink)",
              }}
            >
              {creativeKit.copies.whatsappClosing}
            </div>
          </section>
        </div>
      )}

      {/* PESTAÑA 4: ESTRATEGIA Y SEGMENTACIÓN VENEZUELA */}
      {tabMode === "estrategia" && (
        <section className="card stack" style={{ gap: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--ink)" }}>
              Estrategia Publicitaria y Segmentación en Venezuela para {currentProduct.name}
            </h3>
            <p className="caption" style={{ margin: "4px 0 0", color: "var(--ink-muted)" }}>
              Recomendaciones operativas para lanzar campañas en Meta Ads Manager y TikTok Ads con pagos en Bolívares y USD.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {/* Presupuesto */}
            <div
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "var(--brand)" }}>
                  <Icon name="coin" size={18} />
                </span>
                <strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>Presupuesto Diario Sugerido</strong>
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--brand)" }}>
                $ 5.00 a $ 20.00 USD / día
              </div>
              <p className="caption" style={{ margin: "4px 0 0", color: "var(--ink-muted)" }}>
                {creativeKit.audiencesVe.budgetNote}
              </p>
            </div>

            {/* Público Objetivo */}
            <div
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "var(--brand)" }}>
                  <Icon name="users" size={18} />
                </span>
                <strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>Audiencia & Segmentación</strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4, color: "var(--ink)" }}>
                {creativeKit.audiencesVe.target}
              </p>
              <div style={{ marginTop: 6 }}>
                <span className="caption" style={{ fontWeight: 600, color: "var(--ink)" }}>Intereses en Ads Manager: </span>
                <span className="caption" style={{ color: "var(--ink-muted)" }}>
                  {creativeKit.audiencesVe.interests.join(", ")}
                </span>
              </div>
            </div>

            {/* Logística */}
            <div
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "var(--brand)" }}>
                  <Icon name="truck" size={18} />
                </span>
                <strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>Logística y Despacho</strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.4, color: "var(--ink)" }}>
                <strong>Caracas:</strong> Delivery express coordinado (mismo día o 24h).
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", lineHeight: 1.4, color: "var(--ink)" }}>
                <strong>Interior:</strong> MRW, Zoom o Tealca con guía y seguro activo.
              </p>
            </div>

            {/* Pasarelas de Pago */}
            <div
              style={{
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "var(--brand)" }}>
                  <Icon name="bank" size={18} />
                </span>
                <strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>Pasarelas Bimoneda</strong>
              </div>
              <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: "0.85rem", lineHeight: 1.5, color: "var(--ink)" }}>
                <li><strong>Pago Móvil:</strong> En Bolívares (VES) a tasa oficial BCV.</li>
                <li><strong>Zelle:</strong> En USD directo sin comisión.</li>
                <li><strong>USDT / Cripto:</strong> Binance Pay sin fee de red.</li>
                <li><strong>Transferencias:</strong> Banesco, Mercantil, BDV.</li>
              </ul>
            </div>
          </div>

          {/* Derribo de Objeción */}
          <div
            style={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "14px 16px",
            }}
          >
            <strong style={{ fontSize: "0.9rem", color: "var(--ink)", display: "block", marginBottom: 4 }}>
              🛡️ Argumentario contra la objeción: "{seedParams.objection}"
            </strong>
            <p className="caption" style={{ margin: 0, color: "var(--ink-muted)", lineHeight: 1.5 }}>
              {creativeKit.audiencesVe.objectionHandling}
            </p>
          </div>

          {/* Footer Callout */}
          <div
            className="row between"
            style={{
              background: "var(--agent-soft)",
              border: "1px solid var(--agent-line)",
              borderRadius: 8,
              padding: "14px 18px",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <strong style={{ color: "var(--ink)", fontSize: "0.92rem" }}>
                ¿Listo para crear la campaña en Meta o TikTok?
              </strong>
              <p className="caption" style={{ margin: "2px 0 0", color: "var(--ink-muted)" }}>
                Pega tus prompts en Dola.com para generar los visuales, o dispara el webhook de n8n para automatizar toda la producción publicitaria.
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
