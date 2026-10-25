import { type AuditReport, buildReport, type Check } from "./types.ts";

const c = (
  id: string,
  group: string,
  title: string,
  status: Check["status"],
  impact: Check["impact"],
  evidence: string,
  fix?: string,
): Check => ({ id, group, title, status, impact, evidence, fix });

/** Informes de EJEMPLO para la demo (tienda "Café de Origen"). Se marcan siempre como `source: "sample"`. */
export function sampleAudit(
  kind: "seo" | "diseno",
  url = "https://cafedeorigen.example",
  at = new Date(),
): AuditReport {
  const isVe =
    (process.env.MARKET ?? "").toUpperCase() === "VE" ||
    /davebeauty|\.ve\b|venezuela|cafeespecialidad/i.test(url);
  const notes = [
    "Informe de ejemplo para la demo: no se midió una tienda real.",
    "Conecta una tienda y lanza la auditoría sobre su URL para ver sus datos.",
  ];
  if (kind === "seo") {
    const gTecnico = "SEO Técnico";
    const gSchema = "Schema & Knowledge Graph";
    const gAeo = "AEO & Visibilidad en IA";
    const gConfianza = isVe ? "Confianza & Conversión Venezuela" : "Confianza & Conversión Local";

    return buildReport(
      "seo",
      "sample",
      url,
      [
        c("https", gTecnico, "Conexión segura (HTTPS)", "pass", "alto", url),
        c("status", gTecnico, "La página responde bien", "pass", "alto", "HTTP 200"),
        c(
          "title",
          gTecnico,
          "Título de la página",
          "warn",
          "alto",
          isVe
            ? "72 caracteres: «Davebeauty | Cosmética coreana y cuidado botánico en Venezuela, envíos»"
            : "72 caracteres: «Café de Origen | Café de especialidad colombiano tostado en Bogotá, envíos»",
          "Ajústalo a 30–65 caracteres.",
        ),
        c(
          "desc",
          gTecnico,
          "Meta descripción",
          "fail",
          "alto",
          "No hay meta description.",
          "Escribe 70–160 caracteres que inviten a hacer clic.",
        ),
        c(
          "h1",
          gTecnico,
          "Un solo H1",
          "pass",
          "medio",
          isVe ? "1 H1: «Cuidado botánico y K-Beauty Venezuela»" : "1 H1: «Café colombiano de origen»",
        ),
        c(
          "canonical",
          gTecnico,
          "URL canónica",
          "warn",
          "medio",
          "No se encontró",
          'Añade <link rel="canonical"> para evitar contenido duplicado.',
        ),
        c("lang", gTecnico, "Idioma declarado", "pass", "bajo", isVe ? 'lang="es-VE"' : 'lang="es-CO"'),
        c(
          "viewport",
          gTecnico,
          "Viewport para móvil",
          "pass",
          "alto",
          "width=device-width, initial-scale=1",
        ),
        c("noindex", gTecnico, "Indexable (sin noindex)", "pass", "alto", "Sin etiqueta robots"),
        c(
          "og",
          gTecnico,
          "Vista previa al compartir (Open Graph)",
          "warn",
          "medio",
          "Falta og:image",
          "Añade og:image para que el enlace se vea bien en WhatsApp e Instagram.",
        ),
        c(
          "alt",
          gTecnico,
          "Imágenes con texto alternativo",
          "fail",
          "medio",
          "9 de 24 (38 %)",
          "Describe cada imagen de producto en el alt.",
        ),
        c("robots", gTecnico, "robots.txt", "pass", "medio", "HTTP 200"),
        c("sitemap", gTecnico, "sitemap.xml", "pass", "medio", "HTTP 200"),
        c(
          "cwv",
          gTecnico,
          "Core Web Vitals (LCP, CLS, INP)",
          "na",
          "alto",
          "Requiere medir en un navegador real.",
          "Mídelo con PageSpeed Insights.",
        ),
        c(
          "schema",
          gSchema,
          "Schema de producto y entidad (JSON-LD)",
          "fail",
          "alto",
          "Sin JSON-LD",
          isVe
            ? "Añade Organization o Product con offers (precio en USD o VES a tasa BCV, disponibilidad)."
            : "Añade Product con offers (precio, moneda COP, disponibilidad).",
        ),
        c(
          "schema_graph",
          gSchema,
          "Árbol @graph estructurado con @id",
          "warn",
          "alto",
          "No se detectó un árbol @graph unificado con @id deterministas.",
          'Unifica los esquemas bajo un único array "@graph" con @id explícitos.',
        ),
        c(
          "schema_org",
          gSchema,
          "Entidad Organization y disambiguación (sameAs)",
          "warn",
          "medio",
          "Sin entidad Organization declarada en el código fuente.",
          "Agrega Organization con logo, descripción, founder y sameAs a redes sociales.",
        ),
        c(
          "schema_faq",
          gSchema,
          "Schema FAQPage para Rich Snippets en IA",
          "warn",
          "medio",
          "No se encontró schema FAQPage.",
          "Añade FAQPage con preguntas frecuentes para respuestas directas en Google y asistentes IA.",
        ),
        c(
          "schema_product",
          gSchema,
          isVe
            ? "Ofertas de Producto con bimoneda en Schema (USD / Bs. BCV)"
            : "Ofertas de Producto en Schema (Product / Offer)",
          "warn",
          "medio",
          isVe
            ? "Precios no estructurados en JSON-LD en ofertas USD / VES"
            : "Precios no estructurados en JSON-LD",
          isVe
            ? "Publica ofertas con priceCurrency USD y VES en los productos."
            : "Publica ofertas con priceCurrency COP en los productos.",
        ),
        c(
          "bluf",
          gAeo,
          "Extractabilidad BLUF (Bottom Line Up Front)",
          "warn",
          "alto",
          "3 de 5 secciones usan introducciones largas antes de dar la respuesta.",
          "Aplica BLUF: responde en la primera o segunda oración bajo cada encabezado.",
        ),
        c(
          "paa_questions",
          gAeo,
          "Preguntas Conversacionales (People Also Ask)",
          "warn",
          "medio",
          "0 de 6 encabezados H2/H3 usan formato de pregunta conversacional.",
          "Reformula encabezados como preguntas de búsqueda (ej. «¿Cómo funciona...?»).",
        ),
        c(
          "ai_crawlers",
          gAeo,
          "Rastreadores de IA en robots.txt (AEO/GEO)",
          "pass",
          "alto",
          "Permite indexación de asistentes de IA: GPTBot, PerplexityBot, ClaudeBot, Google-Extended",
        ),
        c(
          "llms",
          gAeo,
          "Archivo llms.txt para asistentes de IA",
          "warn",
          "medio",
          "HTTP 404: no se encontró /llms.txt",
          "Publica un archivo /llms.txt en la raíz resumiendo el catálogo para LLMs.",
        ),
        c(
          "trust_whatsapp",
          gConfianza,
          "Canal de contacto WhatsApp (+58)",
          "pass",
          "alto",
          isVe
            ? "Botón de WhatsApp activo con número internacional (+58)"
            : "Botón de WhatsApp activo (+57)",
        ),
        c(
          "trust_payments",
          gConfianza,
          isVe
            ? "Métodos de pago locales (Pago Móvil, Zelle, BCV)"
            : "Métodos de pago transparentes",
          "pass",
          "alto",
          isVe
            ? "Menciona Pago Móvil, Zelle y tasa oficial BCV"
            : "Menciona contraentrega y pagos digitales",
        ),
        c(
          "trust_shipping",
          gConfianza,
          isVe
            ? "Logística y despacho nacional (MRW, Zoom, Tealca)"
            : "Envíos y transportadoras a la vista",
          "pass",
          "alto",
          isVe
            ? "Menciona despacho con Flash Courier y envíos nacionales por MRW"
            : "Menciona transportadoras nacionales reconocidas",
        ),
      ],
      notes,
      at,
    );
  }
  return buildReport(
    "diseno",
    "sample",
    url,
    [
      c(
        "viewport",
        "Móvil",
        "Se adapta al teléfono (viewport)",
        "pass",
        "alto",
        "width=device-width, initial-scale=1",
      ),
      c(
        "lazy",
        "Rendimiento",
        "Imágenes con carga diferida",
        "warn",
        "medio",
        '6 de 24 usan loading="lazy"',
        'Añade loading="lazy" a las imágenes bajo el primer pantallazo.',
      ),
      c(
        "dims",
        "Estabilidad",
        "Imágenes con ancho y alto (evita saltos)",
        "pass",
        "medio",
        "22 de 24 traen width y height",
      ),
      c("favicon", "Marca", "Favicon", "pass", "bajo", "Presente"),
      c(
        "cta",
        "Conversión",
        "Botón de compra visible",
        "pass",
        "alto",
        "Se encontró un llamado a comprar",
      ),
      c(
        "trust",
        "Confianza",
        "Envío, devoluciones o medios de pago a la vista",
        "warn",
        "alto",
        isVe
          ? "Menciona envíos, pero no Pago Móvil ni tiempos de entrega"
          : "Menciona envío, pero no la contraentrega ni las devoluciones",
        isVe
          ? "Di cuánto tarda el envío (Flash Courier, MRW, Zoom) y si aceptas Pago Móvil, Zelle o contraentrega: en Venezuela genera máxima confianza."
          : "Di cuánto tarda el envío y si hay contraentrega: en Colombia sube la conversión.",
      ),
      c(
        "wa",
        "Confianza",
        "Contacto por WhatsApp",
        "fail",
        "medio",
        "Sin enlace de WhatsApp",
        "Añade un botón de WhatsApp: es el canal de soporte que más se usa.",
      ),
      c(
        "cop",
        "Precios",
        isVe ? "Precios en dólares o bimoneda (USD / Bs. BCV)" : "Precios en pesos colombianos",
        "pass",
        "medio",
        isVe ? "Precios en formato USD ($ 18.00) y Bs. BCV" : "Precios con formato COP",
      ),
      c("weight", "Rendimiento", "Peso del HTML", "pass", "bajo", "212 KB"),
      c(
        "scripts",
        "Rendimiento",
        "Scripts externos",
        "warn",
        "medio",
        "19 scripts con src",
        "Quita apps y píxeles que no uses.",
      ),
      c(
        "contrast",
        "Accesibilidad",
        "Contraste y legibilidad del texto",
        "na",
        "alto",
        "Requiere renderizar la página.",
        "Revísalo con Lighthouse.",
      ),
      c(
        "mobilenav",
        "Móvil",
        "Navegación cómoda en el teléfono",
        "na",
        "medio",
        "Requiere probar en un teléfono real.",
        "Abre la tienda en tu celular y compra algo.",
      ),
    ],
    notes,
    at,
  );
}
