import { type Fetched, safeGet } from "./safe-fetch.ts";
import { type AuditReport, buildReport, type Check } from "./types.ts";

type Opts = Parameters<typeof safeGet>[1];

const attr = (tag: string, name: string): string | undefined =>
  new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag)?.[1];
const metaContent = (html: string, key: string): string | undefined => {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    if ((attr(tag, "name") ?? attr(tag, "property"))?.toLowerCase() === key)
      return attr(tag, "content");
  }
  return undefined;
};
const tags = (html: string, name: string): string[] =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => m[0]);
const text = (html: string, name: string): string[] =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "gi"))].map((m) =>
    (m[1] ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
const pct = (a: number, b: number): number => (b === 0 ? 0 : Math.round((a / b) * 100));

export const isVeContext = (url: string, html = ""): boolean => {
  if ((process.env.MARKET ?? "").toUpperCase() === "VE") return true;
  if (/davebeauty|\.ve\b|venezuela|cafeespecialidad/i.test(url)) return true;
  if (/pago\s*m[oó]vil|bcv|tasa\s*oficial|bol[ií]vares|caracas|valencia|maracaibo/i.test(html)) return true;
  return false;
};

const mk = (
  id: string,
  group: string,
  title: string,
  status: Check["status"],
  impact: Check["impact"],
  evidence: string,
  fix?: string,
): Check => ({ id, group, title, status, impact, evidence, fix });

export function seoChecks(
  page: Fetched,
  robots: Fetched | undefined,
  sitemap: Fetched | undefined,
  llms: Fetched | undefined,
): Check[] {
  const html = page.body;
  const isVe = isVeContext(page.url, html);
  const out: Check[] = [];
  const gTecnico = "SEO Técnico";
  const gSchema = "Schema & Knowledge Graph";
  const gAeo = "AEO & Visibilidad en IA";
  const gConfianza = isVe ? "Confianza & Conversión Venezuela" : "Confianza & Conversión Local";

  // ==========================================
  // PILAR 1: SEO Técnico
  // ==========================================
  out.push(
    mk(
      "https",
      gTecnico,
      "Conexión segura (HTTPS)",
      page.url.startsWith("https://") ? "pass" : "fail",
      "alto",
      page.url,
      "Activa HTTPS: sin él Google y los navegadores penalizan la tienda.",
    ),
  );
  out.push(
    mk(
      "status",
      gTecnico,
      "La página responde bien",
      page.status === 200 ? "pass" : "fail",
      "alto",
      `HTTP ${page.status}`,
      "La página principal debe responder 200.",
    ),
  );
  const title = text(html, "title")[0];
  out.push(
    !title
      ? mk(
          "title",
          gTecnico,
          "Título de la página",
          "fail",
          "alto",
          "No hay <title>.",
          "Escribe un título de 30 a 65 caracteres con la palabra clave principal.",
        )
      : mk(
          "title",
          gTecnico,
          "Título de la página",
          title.length >= 30 && title.length <= 65 ? "pass" : "warn",
          "alto",
          `${title.length} caracteres: «${title.slice(0, 70)}»`,
          "Ajústalo a 30–65 caracteres.",
        ),
  );
  const desc = metaContent(html, "description");
  out.push(
    !desc
      ? mk(
          "desc",
          gTecnico,
          "Meta descripción",
          "fail",
          "alto",
          "No hay meta description.",
          "Escribe 70–160 caracteres que inviten a hacer clic.",
        )
      : mk(
          "desc",
          gTecnico,
          "Meta descripción",
          desc.length >= 70 && desc.length <= 165 ? "pass" : "warn",
          "alto",
          `${desc.length} caracteres`,
          "Ajústala a 70–160 caracteres.",
        ),
  );
  const h1 = text(html, "h1");
  out.push(
    mk(
      "h1",
      gTecnico,
      "Un solo H1",
      h1.length === 1 ? "pass" : h1.length === 0 ? "fail" : "warn",
      "medio",
      `${h1.length} H1${h1[0] ? `: «${h1[0].slice(0, 50)}»` : ""}`,
      "Deja un único H1 que diga qué vende la página.",
    ),
  );
  const canonicalTag = tags(html, "link").find((t) => /rel=["']canonical["']/i.test(t));
  const canonicalHref = canonicalTag ? attr(canonicalTag, "href") : undefined;
  out.push(
    mk(
      "canonical",
      gTecnico,
      "URL canónica",
      canonicalHref ? (canonicalHref.startsWith("http") ? "pass" : "warn") : "warn",
      "medio",
      canonicalHref ? `Canónica: ${canonicalHref}` : "No se encontró <link rel=\"canonical\">",
      'Añade <link rel="canonical" href="..."> absoluta para evitar contenido duplicado.',
    ),
  );
  const lang = /<html\b[^>]*\blang=["']([^"']+)["']/i.exec(html)?.[1];
  out.push(
    mk(
      "lang",
      gTecnico,
      "Idioma declarado",
      !lang ? "fail" : lang.toLowerCase().startsWith("es") ? "pass" : "warn",
      "bajo",
      lang ? `lang="${lang}"` : "No hay atributo lang",
      isVe ? 'Declara lang="es-VE" (o "es") en <html>.' : 'Declara lang="es-CO" en <html>.',
    ),
  );
  out.push(
    mk(
      "viewport",
      gTecnico,
      "Viewport para móvil",
      metaContent(html, "viewport") ? "pass" : "fail",
      "alto",
      metaContent(html, "viewport") ?? "No hay meta viewport",
      'Añade <meta name="viewport" content="width=device-width, initial-scale=1">.',
    ),
  );
  out.push(
    mk(
      "noindex",
      gTecnico,
      "Indexable (sin noindex)",
      /noindex/i.test(metaContent(html, "robots") ?? "") ? "fail" : "pass",
      "alto",
      metaContent(html, "robots") ?? "Sin etiqueta robots",
      "Quita el noindex si quieres aparecer en Google.",
    ),
  );
  const og = metaContent(html, "og:title") && metaContent(html, "og:image");
  out.push(
    mk(
      "og",
      gTecnico,
      "Vista previa al compartir (Open Graph)",
      og ? "pass" : "warn",
      "medio",
      og ? "og:title y og:image presentes" : "Falta og:title u og:image",
      "Añade og:title y og:image para que el enlace se vea bien en WhatsApp e Instagram.",
    ),
  );
  const imgs = tags(html, "img");
  const withAlt = imgs.filter((t) => (attr(t, "alt") ?? "").trim().length > 0).length;
  out.push(
    imgs.length === 0
      ? mk(
          "alt",
          gTecnico,
          "Imágenes con texto alternativo",
          "na",
          "medio",
          "La página no tiene <img> en el HTML inicial.",
        )
      : mk(
          "alt",
          gTecnico,
          "Imágenes con texto alternativo",
          pct(withAlt, imgs.length) >= 90
            ? "pass"
            : pct(withAlt, imgs.length) >= 60
              ? "warn"
              : "fail",
          "medio",
          `${withAlt} de ${imgs.length} (${pct(withAlt, imgs.length)} %)`,
          "Describe cada imagen de producto en el alt.",
        ),
  );
  out.push(
    mk(
      "robots",
      gTecnico,
      "robots.txt",
      robots?.status === 200 ? "pass" : "warn",
      "medio",
      robots ? `HTTP ${robots.status}` : "No se pudo consultar",
      "Publica /robots.txt en la raíz del dominio.",
    ),
  );
  out.push(
    mk(
      "sitemap",
      gTecnico,
      "sitemap.xml",
      sitemap?.status === 200 && /<urlset|<sitemapindex/i.test(sitemap.body) ? "pass" : "warn",
      "medio",
      sitemap ? `HTTP ${sitemap.status}` : "No se pudo consultar",
      "Publica /sitemap.xml o /sitemap-index.xml y envíalo a Search Console.",
    ),
  );
  out.push(
    mk(
      "cwv",
      gTecnico,
      "Core Web Vitals (LCP, CLS, INP)",
      "na",
      "alto",
      "Requiere medir en un navegador real; esta auditoría solo lee el HTML.",
      "Mídelo con PageSpeed Insights.",
    ),
  );

  // ==========================================
  // PILAR 2: Schema & Knowledge Graph
  // ==========================================
  const ldStrings = [
    ...html.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi),
  ].map((m) => m[1] ?? "");
  const ldParsed: any[] = [];
  for (const s of ldStrings) {
    try {
      ldParsed.push(JSON.parse(s));
    } catch {}
  }
  const allEntities: any[] = [];
  let hasRootGraph = false;
  for (const obj of ldParsed) {
    if (obj && typeof obj === "object") {
      if (Array.isArray(obj["@graph"])) {
        hasRootGraph = true;
        allEntities.push(...obj["@graph"]);
      } else {
        allEntities.push(obj);
      }
    }
  }

  const hasProduct = allEntities.some((e) =>
    /(Product|Offer|IndividualProduct)/i.test(e?.["@type"] ?? ""),
  );
  const hasOrg = allEntities.some((e) =>
    /(Organization|OnlineStore|Store|Brand)/i.test(e?.["@type"] ?? ""),
  );
  const hasWebSite = allEntities.some((e) => /WebSite/i.test(e?.["@type"] ?? ""));
  const hasFaq = allEntities.some((e) => /FAQPage/i.test(e?.["@type"] ?? ""));

  // Check: schema (compatibilidad con tests existentes)
  out.push(
    mk(
      "schema",
      gSchema,
      "Schema de producto y entidad (JSON-LD)",
      hasProduct || hasOrg || hasWebSite ? "pass" : ldParsed.length ? "warn" : "fail",
      "alto",
      hasProduct
        ? "Product/Offer encontrado"
        : hasOrg
          ? "Entidad Organization/WebSite encontrada (Knowledge Graph & IA)"
          : ldParsed.length
            ? `${ldParsed.length} bloque(s) JSON-LD sin Product u Organization`
            : "Sin JSON-LD",
      hasProduct
        ? undefined
        : hasOrg
          ? (isVe
              ? "En fichas de producto, añade schema Product con precios en USD o Bs."
              : "En fichas de producto, añade schema Product con offers.")
          : (isVe
              ? "Añade Organization o Product con ofertas (precio USD o Bs. BCV, disponibilidad)."
              : "Añade Product con offers (precio, moneda COP, disponibilidad)."),
    ),
  );

  // Check: schema_graph (Árbol @graph estructurado)
  const entitiesWithId = allEntities.filter(
    (e) => typeof e?.["@id"] === "string" && e["@id"].trim(),
  );
  const isGraphUnified = hasRootGraph && entitiesWithId.length >= 2;
  const isSingleValidSchema = ldParsed.length === 1 && (hasOrg || hasProduct || hasWebSite);
  out.push(
    mk(
      "schema_graph",
      gSchema,
      "Árbol @graph estructurado con @id",
      isGraphUnified || isSingleValidSchema ? "pass" : ldParsed.length > 1 ? "warn" : "fail",
      "alto",
      isGraphUnified
        ? `Árbol @graph unificado con ${entitiesWithId.length} entidades enlazadas por @id`
        : isSingleValidSchema
          ? "Esquema JSON-LD unificado válido en la página"
          : ldParsed.length > 1
            ? `${ldParsed.length} bloques JSON-LD independientes sin nodo raíz @graph ni @id cruzados`
            : "Sin estructura JSON-LD en la página",
      isGraphUnified || isSingleValidSchema
        ? undefined
        : 'Unifica los esquemas en un único script con "@graph": [...] y asigna URIs deterministas (@id: "...#organization", "...#website").',
    ),
  );

  // Check: schema_org (Organization con sameAs / contactPoint)
  const orgEntity = allEntities.find((e) =>
    /(Organization|OnlineStore|Store|Brand)/i.test(e?.["@type"] ?? ""),
  );
  const hasSameAs = Array.isArray(orgEntity?.sameAs) && orgEntity.sameAs.length > 0;
  const hasContactPoint = Boolean(orgEntity?.contactPoint);
  out.push(
    mk(
      "schema_org",
      gSchema,
      "Entidad Organization y disambiguación (sameAs)",
      orgEntity
        ? "pass"
        : hasProduct
          ? "na"
          : "fail",
      "medio",
      orgEntity
        ? hasSameAs
          ? `Organization «${orgEntity.name ?? "Marca"}» con ${orgEntity.sameAs.length} enlaces sameAs de disambiguación`
          : `Organization «${orgEntity.name ?? "Marca"}» declarada`
        : hasProduct
          ? "Página enfocada en ficha de producto (schema Product)"
          : "No se declaró entidad Organization en JSON-LD",
      orgEntity && !hasSameAs
        ? 'Recomendado: añade sameAs: ["https://instagram.com/..."] en Organization para enriquecer el Knowledge Graph.'
        : !orgEntity && !hasProduct
          ? "Declara la entidad Organization con nombre, logo, descripción y enlaces oficiales."
          : undefined,
    ),
  );

  // Check: schema_faq (FAQPage)
  out.push(
    mk(
      "schema_faq",
      gSchema,
      "Schema FAQPage para Rich Snippets en IA",
      hasFaq ? "pass" : "warn",
      "bajo",
      hasFaq
        ? "FAQPage declarada en JSON-LD con preguntas y respuestas"
        : "No se encontró FAQPage en JSON-LD",
      hasFaq
        ? undefined
        : "Añade un nodo FAQPage en tu @graph con preguntas frecuentes de compra, formas de pago y envíos para alimentar citas de IA.",
    ),
  );

  // Check: schema_product (bimoneda USD / Bs. BCV)
  const productEntity = allEntities.find((e) => /(Product|Offer)/i.test(e?.["@type"] ?? ""));
  const jsonLdRaw = ldStrings.join(" ");
  const hasCurrencyInSchema = /(USD|VES|Bs\.?|COP)/i.test(jsonLdRaw);
  const hasVeBimonedaSchema = /USD/i.test(jsonLdRaw) && /(VES|Bs\.?)/i.test(jsonLdRaw);
  out.push(
    mk(
      "schema_product",
      gSchema,
      isVe
        ? "Ofertas de Producto con bimoneda en Schema (USD / Bs. BCV)"
        : "Ofertas de Producto en Schema (Product / Offer)",
      productEntity
        ? isVe
          ? hasVeBimonedaSchema || hasCurrencyInSchema
            ? "pass"
            : "warn"
          : "pass"
        : hasOrg
          ? "na"
          : "warn",
      "medio",
      productEntity
        ? isVe
          ? hasVeBimonedaSchema
            ? "Offers en Schema con precios bimoneda (USD y VES)"
            : "Offers en Schema con precio y disponibilidad declarados"
          : "Schema Product/Offer con ofertas declaradas"
        : hasOrg
          ? "Página de inicio/marca (schema Organization activo; Product en catálogo)"
          : "Página sin nodo Product/Offer en JSON-LD (recomendado en fichas y catálogo)",
      productEntity && isVe && !hasVeBimonedaSchema
        ? "Declara ofertas complementarias en USD y VES (a tasa oficial BCV) en el array offers de cada producto."
        : undefined,
    ),
  );

  // ==========================================
  // PILAR 3: AEO & Visibilidad en IA
  // ==========================================
  // Extractabilidad BLUF (Bottom Line Up Front)
  const headingMatches = [
    ...html.matchAll(/<(h[23])\b[^>]*>([\s\S]*?)<\/\1>([\s\S]*?)(?=<(?:h[123]|footer|nav)\b|$)/gi),
  ];
  let blufPassed = 0;
  let blufEvaluated = 0;
  const fluffyStarters =
    /^(en\s+el\s+mundo\s+de\s+hoy|como\s+es\s+bien\s+sabido|es\s+importante\s+destacar|a\s+lo\s+largo\s+del\s+tiempo|cuando\s+se\s+trata\s+de|hoy\s+en\s+d[ií]a|en\s+la\s+actualidad)/i;

  for (const hm of headingMatches) {
    const sectionContent = hm[3] ?? "";
    const paras = [...sectionContent.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) =>
        (m[1] ?? "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter((p) => p.length > 15);
    const plainContent = sectionContent
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (plainContent.length < 25) continue;
    blufEvaluated++;
    const firstText = paras[0] || plainContent;
    const wordCount = firstText.split(/\s+/).length;
    const isFluffy = fluffyStarters.test(firstText);

    if (!isFluffy && wordCount <= 120) {
      blufPassed++;
    }
  }

  const blufRatio = blufEvaluated === 0 ? 0 : blufPassed / blufEvaluated;
  out.push(
    mk(
      "bluf",
      gAeo,
      "Extractabilidad BLUF (Bottom Line Up Front)",
      blufEvaluated === 0
        ? "na"
        : blufRatio >= 0.65
          ? "pass"
          : blufRatio >= 0.35
            ? "warn"
            : "fail",
      "alto",
      blufEvaluated === 0
        ? "Sin secciones H2/H3 con párrafos de contenido para evaluar BLUF"
        : `${blufPassed} de ${blufEvaluated} secciones (${pct(blufPassed, blufEvaluated)} %) inician con respuestas directas y concisas (<120 palabras)`,
      blufRatio >= 0.65 || blufEvaluated === 0
        ? undefined
        : "Aplica la regla BLUF: coloca la respuesta directa, cifras y términos clave en las primeras 1–3 frases bajo cada encabezado.",
    ),
  );

  // Preguntas Conversacionales (People Also Ask)
  const h2h3 = [...text(html, "h2"), ...text(html, "h3")];
  const questionRegex =
    /^[¿?]|(\?|\b(c[oó]mo|cu[aá]l|cu[aá]les|d[oó]nde|qu[eé]|por\s*qu[eé]|cu[aá]nto|cu[aá]ntos|cu[aá]ndo|how|what|where|why|can\b))/i;
  const paaQuestions = h2h3.filter((h) => questionRegex.test(h));
  out.push(
    mk(
      "paa_questions",
      gAeo,
      "Preguntas Conversacionales (People Also Ask)",
      h2h3.length === 0
        ? "na"
        : paaQuestions.length >= 2
          ? "pass"
          : "warn",
      "medio",
      h2h3.length === 0
        ? "Sin encabezados H2/H3 para evaluar formato de preguntas"
        : paaQuestions.length > 0
          ? `${paaQuestions.length} de ${h2h3.length} encabezados H2/H3 usan formato de pregunta conversacional («${paaQuestions[0].slice(0, 45)}»...)`
          : `${h2h3.length} encabezados H2/H3 evaluados; ninguno usa formato interrogativo conversacional`,
      h2h3.length === 0 || paaQuestions.length >= 2
        ? undefined
        : 'Reformula al menos 2–3 encabezados H2/H3 como preguntas naturales que los usuarios hacen en Google o ChatGPT (ej. «¿Cómo funciona la compra asistida?», «¿Qué métodos de pago aceptan?»).',
    ),
  );

  // Rastreadores de IA en robots.txt
  const hasRobots = robots?.status === 200;
  const targetAiBots = ["GPTBot", "PerplexityBot", "ClaudeBot", "Google-Extended"];
  const blockedBots: string[] = [];
  const allowedBots: string[] = [];

  if (hasRobots && robots?.body) {
    const rBody = robots.body;
    for (const bot of targetAiBots) {
      const botPattern = new RegExp(
        `User-agent:\\s*${bot}[\\s\\S]*?Disallow:\\s*\\/(?=[\\r\\n]|$)`,
        "i",
      );
      if (botPattern.test(rBody)) {
        blockedBots.push(bot);
      } else {
        allowedBots.push(bot);
      }
    }
  }

  out.push(
    mk(
      "ai_crawlers",
      gAeo,
      "Rastreadores de IA en robots.txt (AEO/GEO)",
      !hasRobots
        ? "na"
        : blockedBots.length === 0
          ? "pass"
          : "warn",
      "alto",
      !hasRobots
        ? "Sin robots.txt para evaluar rastreadores de IA"
        : blockedBots.length === 0
          ? "Permite indexación de asistentes de IA: GPTBot, PerplexityBot, ClaudeBot, Google-Extended"
          : `Bloquea ${blockedBots.join(", ")} en robots.txt; permite ${allowedBots.join(", ") || "ninguno"}`,
      blockedBots.length > 0
        ? `Configura robots.txt (o reglas de Cloudflare AI Scrapers) para permitir ${blockedBots.join(", ")} si deseas aparecer en respuestas de ChatGPT, Claude o Perplexity.`
        : undefined,
    ),
  );

  // Archivo llms.txt para asistentes LLM
  const llmsInRobots = /LLMs-txt:\s*(https?:\/\/[^\s]+|\/[^\s]+)/i.test(robots?.body ?? "");
  const hasLlms200 = llms?.status === 200;
  const isLlmsMarkdown = /^#\s+[^\r\n]+/m.test(llms?.body ?? "");
  out.push(
    mk(
      "llms",
      gAeo,
      "Archivo llms.txt para asistentes de IA",
      hasLlms200 && isLlmsMarkdown ? "pass" : hasLlms200 || llmsInRobots ? "warn" : "warn",
      "bajo",
      hasLlms200
        ? `HTTP 200: /llms.txt presente con formato Markdown (${Math.round((llms?.body?.length ?? 0) / 1024) || 1} KB)${llmsInRobots ? " y declarado en robots.txt" : ""}`
        : llmsInRobots
          ? "Declarado en robots.txt pero no respondió 200 OK"
          : "No se encontró archivo /llms.txt en la raíz",
      hasLlms200 && isLlmsMarkdown
        ? undefined
        : "Publica un archivo /llms.txt en la raíz resumiendo tu catálogo, marcas, cobertura y políticas de compra para agentes de IA.",
    ),
  );

  // ==========================================
  // PILAR 4: Confianza & Conversión Venezuela
  // ==========================================
  const plain = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  // WhatsApp flotante
  const hasWaLink = /(wa\.me|api\.whatsapp\.com|whatsapp:\/\/)/i.test(html);
  const hasWa58 = /(wa\.me\/(?:0058|58|\+58)|\+58\s*4\d{2}|584\d{9})/i.test(html);
  const hasWa57 = /(wa\.me\/(?:0057|57|\+57)|\+57\s*3\d{2})/i.test(html);
  const waPass = isVe ? hasWa58 : hasWa57 || hasWaLink;
  out.push(
    mk(
      "trust_whatsapp",
      gConfianza,
      isVe ? "Canal de contacto WhatsApp (+58)" : "Canal de contacto WhatsApp",
      waPass ? "pass" : hasWaLink ? "warn" : "fail",
      "alto",
      waPass
        ? isVe
          ? "Enlace WhatsApp detectado con formato internacional de Venezuela (+58)"
          : "Enlace WhatsApp de contacto presente"
        : hasWaLink
          ? isVe
            ? "Enlace WhatsApp detectado pero sin código internacional +58 explícito"
            : "Enlace WhatsApp detectado"
          : "Sin enlace ni botón de WhatsApp visible",
      waPass
        ? undefined
        : isVe
          ? "Añade un botón flotante de WhatsApp con formato internacional (+58) para atender dudas y cerrar ventas."
          : "Añade un botón de WhatsApp para atención y soporte directo.",
    ),
  );

  // Métodos de pago locales
  const hasPagoMovil = /pago\s*m[oó]vil|pagomovil/i.test(plain);
  const hasZelle = /zelle/i.test(plain);
  const hasBcv = /bcv|tasa\s*oficial|bol[ií]vares|bs\b/i.test(plain);
  const hasCoPayments =
    /(contraentrega|contra\s*entrega|pago\s*seguro|tarjeta|pse|transferencia|bancolombia)/i.test(
      plain,
    );
  const localPayments: string[] = [];
  if (hasPagoMovil) localPayments.push("Pago Móvil");
  if (hasZelle) localPayments.push("Zelle");
  if (hasBcv) localPayments.push("Tasa BCV / Bs.");

  const passPayments = isVe ? localPayments.length >= 2 : hasCoPayments;
  out.push(
    mk(
      "trust_payments",
      gConfianza,
      isVe
        ? "Métodos de pago locales (Pago Móvil, Zelle, BCV)"
        : "Métodos de pago transparentes",
      passPayments ? "pass" : localPayments.length > 0 || hasCoPayments ? "warn" : "fail",
      "alto",
      isVe
        ? localPayments.length > 0
          ? `Métodos detectados en texto: ${localPayments.join(", ")}`
          : "No se encontraron menciones a Pago Móvil, Zelle o bolívares a tasa oficial BCV"
        : hasCoPayments
          ? "Métodos de pago a la vista (contraentrega / pagos seguros)"
          : "No se encontraron métodos de pago claros",
      passPayments
        ? undefined
        : isVe
          ? "Muestra claramente en la página los métodos de pago aceptados: Pago Móvil, Zelle y bolívares calculados a la tasa oficial BCV."
          : "Muestra claramente los métodos de pago (contraentrega, PSE o tarjetas).",
    ),
  );

  // Logística y despacho
  const localCouriers: string[] = [];
  if (/mrw/i.test(plain)) localCouriers.push("MRW");
  if (/zoom/i.test(plain)) localCouriers.push("Zoom");
  if (/tealca/i.test(plain)) localCouriers.push("Tealca");
  if (/flash\s*courier/i.test(plain)) localCouriers.push("Flash Courier");
  if (/domesa/i.test(plain)) localCouriers.push("Domesa");
  if (/dropi/i.test(plain)) localCouriers.push("Dropi");

  const hasCoShipping =
    /(env[ií]o|despacho|entrega|coordinadora|envia|interrapidisimo|servientrega)/i.test(plain);
  const passShipping = isVe ? localCouriers.length >= 1 : hasCoShipping;

  out.push(
    mk(
      "trust_shipping",
      gConfianza,
      isVe
        ? "Logística y despacho nacional (MRW, Zoom, Tealca)"
        : "Envíos y transportadoras a la vista",
      passShipping ? "pass" : "warn",
      "alto",
      isVe
        ? localCouriers.length > 0
          ? `Transportadoras reconocidas detectadas: ${localCouriers.join(", ")}`
          : "No se mencionan empresas de despacho nacional (MRW, Zoom, Tealca o Flash Courier)"
        : hasCoShipping
          ? "Información de envíos visible en el contenido"
          : "Sin menciones a envíos o transportadoras",
      passShipping
        ? undefined
        : isVe
          ? "Indica las empresas de encomienda con despacho nacional (MRW, Zoom, Tealca) y delivery en Caracas para dar máxima certidumbre de entrega."
          : "Indica tiempos de entrega y transportadoras reconocidas.",
    ),
  );

  return out;
}

export function designChecks(page: Fetched): Check[] {
  const html = page.body;
  const isVe = isVeContext(page.url, html);
  const out: Check[] = [];
  out.push(
    mk(
      "viewport",
      "Móvil",
      "Se adapta al teléfono (viewport)",
      metaContent(html, "viewport") ? "pass" : "fail",
      "alto",
      metaContent(html, "viewport") ?? "No hay meta viewport",
      "Añade el meta viewport.",
    ),
  );
  const imgs = tags(html, "img");
  const lazy = imgs.filter((t) => /loading=["']lazy["']/i.test(t)).length;
  out.push(
    imgs.length < 3
      ? mk(
          "lazy",
          "Rendimiento",
          "Imágenes con carga diferida",
          "na",
          "medio",
          "Hay pocas imágenes en el HTML inicial.",
        )
      : mk(
          "lazy",
          "Rendimiento",
          "Imágenes con carga diferida",
          pct(lazy, imgs.length) >= 60 ? "pass" : "warn",
          "medio",
          `${lazy} de ${imgs.length} usan loading="lazy"`,
          'Añade loading="lazy" a las imágenes bajo el primer pantallazo.',
        ),
  );
  const sized = imgs.filter((t) => attr(t, "width") && attr(t, "height")).length;
  out.push(
    imgs.length === 0
      ? mk(
          "dims",
          "Estabilidad",
          "Imágenes con ancho y alto (evita saltos)",
          "na",
          "medio",
          "Sin imágenes en el HTML inicial.",
        )
      : mk(
          "dims",
          "Estabilidad",
          "Imágenes con ancho y alto (evita saltos)",
          pct(sized, imgs.length) >= 80 ? "pass" : "warn",
          "medio",
          `${sized} de ${imgs.length} traen width y height`,
          "Declara width y height para que la página no se mueva al cargar.",
        ),
  );
  out.push(
    mk(
      "favicon",
      "Marca",
      "Favicon",
      /rel=["'](shortcut )?icon["']/i.test(html) ? "pass" : "warn",
      "bajo",
      /rel=["'](shortcut )?icon["']/i.test(html) ? "Presente" : "No se encontró",
      "Añade un favicon.",
    ),
  );
  const plain = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  out.push(
    mk(
      "cta",
      "Conversión",
      "Botón de compra visible",
      /(comprar|agregar al carrito|añadir al carrito|add to cart|buy now)/i.test(plain)
        ? "pass"
        : "fail",
      "alto",
      /(comprar|agregar al carrito|añadir al carrito|add to cart|buy now)/i.test(plain)
        ? "Se encontró un llamado a comprar"
        : "No se encontró «Comprar» ni «Agregar al carrito»",
      "Pon un botón de compra claro en el primer pantallazo.",
    ),
  );
  const trust = isVe
    ? /(env[ií]o|despacho|devoluci|garant[ií]a|contraentrega|contra entrega|pago seguro|pago m[oó]vil|zelle|usdt|bcv|mrw|zoom|tealca|flash)/i.test(
        plain,
      )
    : /(env[ií]o|devoluci|garant[ií]a|contraentrega|contra entrega|pago seguro)/i.test(plain);
  out.push(
    mk(
      "trust",
      "Confianza",
      "Envío, devoluciones o medios de pago a la vista",
      trust ? "pass" : "warn",
      "alto",
      trust
        ? isVe
          ? "Menciona envíos (MRW/Zoom/Flash) o medios de pago confiables (Pago Móvil/Zelle)"
          : "Menciona envío, devoluciones o contraentrega"
        : "No se mencionan",
      isVe
        ? "Di cuánto tarda el envío (Flash Courier, MRW, Zoom) y si aceptas Pago Móvil, Zelle o contraentrega: en Venezuela genera máxima confianza."
        : "Di cuánto tarda el envío y si hay contraentrega: en Colombia sube la conversión.",
    ),
  );
  out.push(
    mk(
      "wa",
      "Confianza",
      "Contacto por WhatsApp",
      /(wa\.me|api\.whatsapp\.com|whatsapp:\/\/)/i.test(html) ? "pass" : "warn",
      "medio",
      /(wa\.me|api\.whatsapp\.com)/i.test(html)
        ? "Enlace de WhatsApp presente"
        : "Sin enlace de WhatsApp",
      "Añade un botón de WhatsApp: es el canal de soporte que más se usa.",
    ),
  );
  const hasPricingVe = /(\$\s?\d+(\.\d{2})?|USD|Bs\.?|VES|BCV)/i.test(plain);
  const hasPricingCo = /(\$\s?\d{1,3}(\.\d{3})+|COP)/.test(plain);
  const passPricing = isVe ? hasPricingVe : hasPricingCo;
  out.push(
    mk(
      "cop",
      "Precios",
      isVe ? "Precios en dólares o bimoneda (USD / Bs. BCV)" : "Precios en pesos colombianos",
      passPricing ? "pass" : "warn",
      "medio",
      passPricing
        ? isVe
          ? "Precios en formato USD / Bs. BCV detectados"
          : "Precios con formato COP"
        : isVe
          ? "No se encontró un precio claro en USD ni en Bolívares"
          : "No se encontró un precio con formato $ 125.000",
      isVe
        ? "Muestra precios claros en USD y su equivalente en Bolívares (Bs.) a tasa oficial BCV."
        : "Muestra el precio como $ 125.000.",
    ),
  );
  const kb = Math.round(Buffer.byteLength(html) / 1024);
  out.push(
    mk(
      "weight",
      "Rendimiento",
      "Peso del HTML",
      kb <= 300 ? "pass" : "warn",
      "bajo",
      `${kb} KB${page.truncated ? " (leído hasta el tope)" : ""}`,
      "Reduce el HTML: menos de 300 KB.",
    ),
  );
  const ext = tags(html, "script").filter((t) => /\bsrc=/.test(t)).length;
  out.push(
    mk(
      "scripts",
      "Rendimiento",
      "Scripts externos",
      ext <= 15 ? "pass" : "warn",
      "medio",
      `${ext} scripts con src`,
      "Quita apps y píxeles que no uses.",
    ),
  );
  out.push(
    mk(
      "contrast",
      "Accesibilidad",
      "Contraste y legibilidad del texto",
      "na",
      "alto",
      "Requiere renderizar la página; esta auditoría solo lee el HTML.",
      "Revísalo con Lighthouse.",
    ),
  );
  out.push(
    mk(
      "mobilenav",
      "Móvil",
      "Navegación cómoda en el teléfono",
      "na",
      "medio",
      "Requiere probar en un teléfono real.",
      "Abre la tienda en tu celular y compra algo.",
    ),
  );
  return out;
}

/** Audita una URL real. Solo lee HTML público (sin ejecutar JavaScript) y lo dice en las notas. */
export async function auditUrl(
  kind: "seo" | "diseno",
  url: string,
  opts: Opts = {},
): Promise<AuditReport> {
  const page = await safeGet(url, opts);
  const origin = new URL(page.url).origin;
  const side = async (path: string): Promise<Fetched | undefined> =>
    safeGet(`${origin}${path}`, { ...opts, maxBytes: 300_000 }).catch(() => undefined);
  const notes = [
    "Se lee el HTML público de la página principal; no se ejecuta JavaScript ni se mide rendimiento real.",
    ...(page.truncated ? ["La página es muy grande: se leyó hasta el tope de 1,5 MB."] : []),
  ];
  if (kind === "seo") {
    const robots = await side("/robots.txt");
    let sitemapPath = "/sitemap.xml";
    if (robots?.body) {
      const match = /Sitemap:\s*(https?:\/\/[^\s]+|\/[^\s]+)/i.exec(robots.body);
      if (match?.[1]) {
        try {
          const u = new URL(match[1], origin);
          sitemapPath = `${u.pathname}${u.search}`;
        } catch {}
      }
    }
    let sitemap = await side(sitemapPath);
    if (!sitemap || sitemap.status === 404) {
      const alt = sitemapPath === "/sitemap.xml" ? "/sitemap-index.xml" : "/sitemap.xml";
      const altSitemap = await side(alt);
      if (altSitemap && altSitemap.status === 200) {
        sitemap = altSitemap;
      }
    }
    const llms = await side("/llms.txt");
    return buildReport("seo", "live", page.url, seoChecks(page, robots, sitemap, llms), notes);
  }
  return buildReport("diseno", "live", page.url, designChecks(page), notes);
}
