import type { ProductCategory } from "@traxo/db";
import { env } from "../env.ts";
import type {
  ClickToWhatsAppOutput,
  MarketingGenerationOutput,
  MetaAdsOutput,
  TikTokUgcOutput,
} from "./marketing-generator.ts";

export interface DeterministicEngineInput {
  productId: string;
  title: string;
  category: ProductCategory | string;
  price?: number | null; // en centavos USD (ej. 2499 = $24.99)
  description?: string | null;
  keyIngredients?: string[];
  commonObjections?: string[];
  channel: "meta_ads" | "click_to_whatsapp" | "tiktok_ugc";
  angle?: string;
  mode?: "explore" | "refine";
  parentContent?: unknown;
  userInstruction?: string | null;
  bcvRate?: number;
  seed?: string | number;
}

/**
 * Función hash determinista de 32 bits basada en Murmur/DJB2.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generador de números pseudoaleatorios determinista (Mulberry32).
 */
function createPrng(seed: number) {
  let s = seed | 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Selecciona un elemento aleatorio pero determinista de una lista.
 */
function pickOne<T>(list: T[], prng: () => number): T {
  const index = Math.floor(prng() * list.length);
  return list[Math.min(index, list.length - 1)];
}

/**
 * Formatea centavos USD a string con dos decimales.
 */
function formatUsd(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Formatea centavos USD a Bolívares usando la tasa BCV.
 */
function formatVes(cents: number, rate: number): string {
  const ves = (cents / 100) * rate;
  return ves.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generador Determinista Local de Marketing para TraxoAgente.
 * Respaldo inmediato (latencia < 2ms) con consistencia de semillas y guardrails por categoría.
 */
export function generateDeterministicMarketing(
  input: DeterministicEngineInput,
): MarketingGenerationOutput {
  const {
    productId,
    title,
    category,
    price = 2499,
    channel,
    angle = "direct_response_cod",
    mode = "explore",
    userInstruction,
    bcvRate = env.TRAXO_BCV_RATE ?? 880.0,
    seed,
  } = input;

  const rawPriceCents = price && price > 0 ? price : 2499;
  const usdPrice = formatUsd(rawPriceCents);
  const vesPrice = formatVes(rawPriceCents, bcvRate);
  const pack2Price = formatUsd(Math.round(rawPriceCents * 2 * 0.9));
  const pack3Price = formatUsd(Math.round(rawPriceCents * 3 * 0.8));

  const seedString = `${productId}:${channel}:${angle}:${mode}:${seed ?? ""}:${userInstruction ?? ""}`;
  const prng = createPrng(hashString(seedString));

  if (channel === "meta_ads") {
    return generateMetaAds({
      title,
      category,
      usdPrice,
      angle,
      prng,
      userInstruction,
    });
  }

  if (channel === "click_to_whatsapp") {
    return generateClickToWhatsApp({
      title,
      category,
      usdPrice,
      vesPrice,
      pack2Price,
      pack3Price,
      prng,
      userInstruction,
    });
  }

  return generateTikTokUgc({
    title,
    category,
    usdPrice,
    prng,
    userInstruction,
  });
}

// -------------------------------------------------------------------------
// Generación Meta Ads (CBO / Advantage+)
// -------------------------------------------------------------------------
function generateMetaAds(params: {
  title: string;
  category: ProductCategory | string;
  usdPrice: string;
  angle: string;
  prng: () => number;
  userInstruction?: string | null;
}): MetaAdsOutput {
  const { title, category, usdPrice, angle, prng } = params;

  let hooks: string[];
  let primaryTexts: string[];
  let visualPrompts: { ratio4x5: string; ratio9x16: string; safeZoneText: string };

  if (category === "oral_supplement") {
    // GUARDRAIL ESTRICTO: CERO vocabulario tópico (nada de cremas, absorción en piel, cutis, maquillaje, #kbeautyve)
    hooks = [
      `¿Cansada de soluciones superficiales? La verdadera vitalidad empieza desde adentro con ${title}.`,
      `El secreto de la constancia: una cápsula al día de ${title} para recargar tu bienestar celular.`,
      `Nutrición funcional comprobada: despierta con energía renovada y apoya tu salud interna con ${title}.`,
      `No son promesas vacías: es nutrición celular avanzada disponible con Pago Contra Entrega en Venezuela.`,
    ];

    primaryTexts = [
      `¿Sientes que el cansancio diario no te deja rendir al 100%?\n\nLa verdadera salud y vitalidad no se logran con productos superficiales; se construyen desde el interior. ${title} fue formulado para nutrir tu organismo con ingredientes de máxima pureza y asimilación digestiva.\n\n🍃 100% Ingesta Oral y Asimilación Celular\n💧 Solo un vaso de agua al día\n🇻🇪 Pago Contra Entrega disponible en toda Venezuela (efectivo o Pago Móvil BCV)\n\nHaz clic abajo para recibir el tuyo sin pagar por adelantado.`,
      `El bienestar que tu cuerpo te pide desde hace meses.\n\n${title} combina activos botánicos seleccionados para apoyar tus niveles de energía, metabolismo y equilibrio interno. Con solo incorporarlo a tu rutina matutina, notas la diferencia en digestión y vitalidad.\n\n✅ Envío rápido y seguro a toda Venezuela\n✅ Paga al recibir en tus manos por solo $${usdPrice}\n\nOrdena el tuyo hoy antes de agotar existencias.`,
      `Alimentar tu bienestar desde la raíz nunca fue tan sencillo.\n\nOlvídate de rutinas complicadas. ${title} te aporta la dosis exacta de nutrientes diarios esenciales para que tu cuerpo rinda en su máximo potencial.\n\n📦 Pídelo hoy y paga cómodamente cuando llegue a tu casa.`,
    ];

    visualPrompts = {
      ratio4x5: `Fotografía limpia de estudio del envase de suplemento ${title} sobre mesa de mármol blanco, vaso de agua cristalina y hojas verdes frescas al fondo. Iluminación natural suave y estética botánica limpia.`,
      ratio9x16: `Video vertical estilo UGC en cocina luminosa: una persona venezolana abriendo el envase de ${title}, tomando una cápsula con un vaso de agua sonriendo, mostrando el frasco en primer plano nítido.`,
      safeZoneText:
        "Texto principal centrado verticalmente entre 250px superior y 250px inferior para evitar solapamientos de UI.",
    };
  } else if (category === "haircare") {
    hooks = [
      `¿Cabello quebradizo y sin vida? Recupera la fuerza y el brillo desde la raíz con ${title}.`,
      `El tratamiento capilar intensivo que frena el daño diario y devuelve la sedosidad.`,
      `Dile adiós al frizz y a las puntas abiertas con la fórmula botánica de ${title}.`,
      `Tu melena más densa, brillante y resistente desde las primeras semanas.`,
    ];

    primaryTexts = [
      `¿Notas tu cabello débil cada vez que te peinas?\n\n${title} actúa profundamente sobre cada hebra capilar, restaurando los enlaces de queratina y devolviéndole la hidratación y nutrición que el sol y el agua dura le quitan.\n\n✨ Brillo espejo y control total del frizz\n🌿 Libre de sulfatos agresivos\n🚚 Envíos a toda Venezuela con Pago Contra Entrega\n\nToca el botón y pide tu tratamiento hoy mismo.`,
      `La solución definitiva para devolverle la vida a tu cabello.\n\n${title} nutre el folículo y sella la cutícula para un acabado suave, sedoso y visiblemente más fuerte.\n\n📦 Paga al recibir en tu puerta por solo $${usdPrice}.`,
    ];

    visualPrompts = {
      ratio4x5: `Primer plano de botella de ${title} rodeada de gotas de agua cristalina y textura sedosa brillante, reflejos dorados y fondo editorial de alta cosmética capilar.`,
      ratio9x16: `UGC vertical con toma antes/después del cabello: movimiento fluido de melena brillante y sedosa tras usar ${title}, frasco sostenido en mano frente al espejo.`,
      safeZoneText:
        "Respetar márgenes superior e inferior de 250px para controles de TikTok e Instagram Reels.",
    };
  } else {
    // Facial Skincare / General Skincare
    hooks = [
      `El efecto porcelana y luminosidad natural que tu cutis pedía a gritos: ${title}.`,
      `¿Poros dilatados y textura irregular? Transforma tu piel con la fórmula ligera de ${title}.`,
      `La rutina de skincare que se adapta al clima de Venezuela: absorción rápida sin sensación grasa.`,
      `Piel radiante, hidratada y protegida desde la primera semana con ${title}.`,
    ];

    primaryTexts = [
      `¿Cansada de cremas pesadas que te dejan la piel grasosa a las pocas horas?\n\n${title} tiene una textura ultraligera diseñada para penetrar profundamente, hidratar tu rostro y restaurar la barrera cutánea sin obstruir tus poros ni dejar residuos.\n\n🌸 Textura ligera de rápida absorción\n💧 Hidratación duradera y luminosidad efecto glass skin\n🇻🇪 Recibe en tu hogar y paga al recibir en mano\n\nHaz clic y pide el tuyo con garantía Davebeauty.`,
      `Tu piel merece un cuidado premium pensado para ti.\n\n${title} combina extractos botánicos y activos dermatológicos para un cutis uniforme, fresco y rejuvenecido.\n\nPídelo hoy por solo $${usdPrice} con Pago Móvil o Divisas al recibir.`,
    ];

    visualPrompts = {
      ratio4x5: `Fotografía macro elegante de la textura ligera de ${title} extendiéndose suavemente con gotas de rocío sobre fondo pastel rosado y botánico.`,
      ratio9x16: `Toma vertical en primer plano de aplicación suave de unas gotas de ${title} sobre mejilla limpia, mostrando el brillo natural inmediato y el envase premium.`,
      safeZoneText:
        "Mantener contenido visual y textos clave dentro del área segura central de 1080x1420px.",
    };
  }

  const headlines = [
    "🇻🇪 Paga al Recibir en Tu Puerta (COD)",
    "🚚 Envíos Rápidos a Toda Venezuela",
    `⚡ ${title} con Descuento Especial`,
    "📦 Stock Disponible para Envío Inmediato",
  ];

  return {
    channel: "meta_ads",
    campaignName: `[CBO] ${title} - Advantage+ Conversión VE (${angle})`,
    hooks,
    primaryTexts,
    headlines,
    visualPrompts,
    utmTemplate: `utm_source=meta&utm_medium=cbo&utm_campaign=${encodeURIComponent(
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    )}&utm_content={{ad.id}}&utm_term={{placement}}`,
  };
}

// -------------------------------------------------------------------------
// Generación Click-to-WhatsApp (COD Venezuela)
// -------------------------------------------------------------------------
function generateClickToWhatsApp(params: {
  title: string;
  category: ProductCategory | string;
  usdPrice: string;
  vesPrice: string;
  pack2Price: string;
  pack3Price: string;
  prng: () => number;
  userInstruction?: string | null;
}): ClickToWhatsAppOutput {
  const { title, category, usdPrice, vesPrice, pack2Price, pack3Price } = params;

  let adCopy: string;

  if (category === "oral_supplement") {
    adCopy = `🌿 ${title} | Nutrición Celular y Bienestar Diario en Venezuela\n\n¿Buscas revitalizar tu organismo desde adentro con ingredientes puros y de alta asimilación?\n\n✅ 100% Ingesta Oral y Biodisponibilidad Óptima\n✅ Pago Contra Entrega (pagas en efectivo USD o Pago Móvil BCV al recibir en tu casa)\n✅ Envíos con Flash Courier en Caracas y MRW / Zoom a nivel nacional\n\n👇 Toca el botón de WhatsApp para chatear con una asesora y agendar tu pedido en 1 minuto.`;
  } else {
    adCopy = `✨ ${title} | Cuidado y Resultados Visibles en Venezuela\n\nDale a tu rutina el tratamiento de calidad que transforma tus días con resultados garantizados.\n\n✅ Fórmula de rápida absorción y alta efectividad\n✅ Pago Contra Entrega (COD) en divisas o Pago Móvil a tasa oficial BCV\n✅ Entregas express en Caracas y envíos asegurados a todo el país\n\n👇 Chatea con nosotras por WhatsApp y recibe tu pedido en la puerta de tu casa.`;
  }

  const prefilledWhatsAppMessage = `¡Hola Davebeauty! 👋 Vi su anuncio de ${title} y deseo información para pedir con Pago Contra Entrega en mi ciudad.`;

  const closingScript = {
    step1Greeting: `¡Hola! Bienvenida a Davebeauty 🌸 Es un gusto atenderte. Con mucho gusto te asesoramos con tu pedido de ${title}. ¿En qué ciudad o municipio te encuentras para confirmar la cobertura de entrega directa en tu zona?`,
    step2PricingBimoneda: `Excelente. El ${title} tiene un valor individual de $${usdPrice} (o en Bolívares a la tasa oficial BCV de hoy: Bs. ${vesPrice}).\n\nAdemás tenemos nuestras promociones por volumen para que aproveches al máximo:\n📦 Pack 1 unidad: $${usdPrice}\n📦📦 Pack 2 unidades: $${pack2Price} (¡Ahorras 10%!)\n📦📦📦 Pack 3 unidades: $${pack3Price} (¡20% OFF + Envío Totalmente GRATIS!)\n\n¿Cuál de estas opciones te gustaría apartar hoy?`,
    step3LogisticsConfirm: `¡Perfecto! Para agendar tu entrega con Pago Contra Entrega (pagas en efectivo USD o Pago Móvil al momento de recibir):\n🛵 Si estás en Caracas: entrega en 24-48 horas con nuestro motorizado Flash Courier.\n📦 En el resto del país: despacho asegurado por MRW o Zoom con número de guía.\n\nPor favor compártenos:\n1. Nombre y Apellido\n2. Número de teléfono de contacto\n3. Dirección exacta de entrega o agencia de retiro de tu preferencia`,
  };

  return {
    channel: "click_to_whatsapp",
    adCopy,
    prefilledWhatsAppMessage,
    closingScript,
  };
}

// -------------------------------------------------------------------------
// Generación TikTok Spark / UGC (Guion 30s)
// -------------------------------------------------------------------------
function generateTikTokUgc(params: {
  title: string;
  category: ProductCategory | string;
  usdPrice: string;
  prng: () => number;
  userInstruction?: string | null;
}): TikTokUgcOutput {
  const { title, category, usdPrice } = params;

  let hooks0to3s: string[];
  let script30s: Array<{
    timestamp: string;
    cameraCue: string;
    audioVoiceover: string;
    onScreenText: string;
  }>;
  let soundSuggestion: string;

  if (category === "oral_supplement") {
    hooks0to3s = [
      `Si sigues intentando arreglar tu energía con cremas, este video es para ti.`,
      `El hábito de 10 segundos que transformó cómo me siento todo el día en Caracas.`,
      `Lo que nadie te dice sobre cuidar tu cuerpo desde el interior con ${title}.`,
    ];

    script30s = [
      {
        timestamp: "00:00 - 00:05",
        cameraCue:
          "Toma frontal en cocina luminosa. Creador mirando a cámara con expresión de intriga, mostrando el frasco de ${title}.",
        audioVoiceover:
          "¿Sabías que el 80% de lo que refleja tu cuerpo depende de cómo lo nutres por dentro?",
        onScreenText: "La salud real empieza POR DENTRO 🍃",
      },
      {
        timestamp: "00:05 - 00:12",
        cameraCue:
          "Corte rápido a rutina cotidiana apresurada, bostezando o sintiendo pesadez a media tarde.",
        audioVoiceover:
          "Yo vivía con cansancio constante y probando soluciones que solo duraban un par de horas.",
        onScreenText: "¿Cansancio que no se quita? 🥱",
      },
      {
        timestamp: "00:12 - 00:22",
        cameraCue:
          "Plano detalle sirviendo un vaso con agua fresca, destapando el frasco de ${title} y tomando la dosis diaria.",
        audioVoiceover:
          "Hasta que incorporé ${title}. Son nutrientes esenciales de asimilación pura. Un solo vaso de agua cada mañana y mi digestión y vitalidad cambiaron por completo.",
        onScreenText: "Solo 1 dosis diaria con agua 💧",
      },
      {
        timestamp: "00:22 - 00:30",
        cameraCue:
          "Creador sonriendo con el paquete sellado recibido en mano en la puerta de su casa.",
        audioVoiceover:
          "Y lo mejor: me lo trajeron hasta la casa y pagué al recibir en mano por solo $${usdPrice}. Pide el tuyo en el botón de abajo.",
        onScreenText: "PAGA AL RECIBIR EN CASA 🇻🇪🚚",
      },
    ];

    soundSuggestion =
      "Trending lofi chill hop beat con ritmo constante y voz nítida en primer plano.";
  } else {
    // Skincare / General
    hooks0to3s = [
      `Por favor NO compres ${title} si no quieres que te pregunten qué te hiciste en la piel.`,
      `El producto coreano que está agotándose en Venezuela por esta razón.`,
      `Probé ${title} durante 7 días en el calor de Venezuela y esto fue lo que pasó.`,
    ];

    script30s = [
      {
        timestamp: "00:00 - 00:05",
        cameraCue:
          "Primer plano espejo de baño bien iluminado. Aplicando unas gotas sobre la mejilla con textura ultraligera.",
        audioVoiceover:
          "Si vives en Venezuela y odias sentir la cara grasosa con el calor, quédate aquí.",
        onScreenText: "¿Piel pesada con el calor? Mira esto ✨",
      },
      {
        timestamp: "00:05 - 00:12",
        cameraCue:
          "Movimiento de cabeza mostrando textura previa apagada o con exceso de brillo en zona T.",
        audioVoiceover:
          "Siempre me pasaba que los productos normales me dejaban la piel pesada o me brotaban los poros.",
        onScreenText: "Adiós a los poros tapados 🚫",
      },
      {
        timestamp: "00:12 - 00:22",
        cameraCue:
          "Plano macro de absorción inmediata en la piel, dejando un brillo saludable satinado efecto porcelana.",
        audioVoiceover:
          "Con ${title} la absorción es casi instantánea. Te deja la piel hidratada, fresca y con ese efecto porcelana que tanto nos gusta.",
        onScreenText: "Absorción ultra rápida 💧✨",
      },
      {
        timestamp: "00:22 - 00:30",
        cameraCue:
          "Creadora mostrando la cajita con sticker de Davebeauty y guiñando el ojo a cámara.",
        audioVoiceover:
          "Llega directo a tu casa con Pago Contra Entrega en divisas o Pago Móvil. ¡Toca el link y pide el tuyo!",
        onScreenText: "Pide por WhatsApp y paga al recibir 📦🇻🇪",
      },
    ];

    soundSuggestion =
      "Sonido viral estético de TikTok (ritmo soft pop optimista de 120 BPM con claridad vocal).";
  }

  return {
    channel: "tiktok_ugc",
    hooks0to3s,
    script30s,
    soundSuggestion,
  };
}
