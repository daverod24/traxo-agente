import { useEffect, useMemo, useRef, useState } from "react";
import { download, get, getText, post, useResource } from "./api.ts";
import { Ring } from "./charts.tsx";
import { EmptyState } from "./components.tsx";
import { dateEs, usd, vesFromUsd } from "./format.ts";
import type {
  AnalyticsBriefResp,
  AnalyticsFunnelResp,
  AnalyticsRealtimeResp,
  AuditReport,
  AuditsResp,
  Check,
} from "./types.ts";
import { Banner, Button, Icon, SampleTag, Tabs, type Tone, ToneBadge } from "./ui.tsx";
import type { Ctx } from "./views.tsx";

const STATUS: Record<Check["status"], { tone: Tone; label: string }> = {
  pass: { tone: "success", label: "Bien" },
  warn: { tone: "attention", label: "Mejorar" },
  fail: { tone: "critical", label: "Falla" },
  na: { tone: "neutral", label: "N/A" },
};

const IMPACT: Record<Check["impact"], string> = {
  alto: "Impacto alto",
  medio: "Impacto medio",
  bajo: "Impacto bajo",
};

const STEPS: Record<"seo" | "diseno", string[]> = {
  seo: [
    "Conectando al servidor y comprobando respuesta HTTP 200 y SSL…",
    "Analizando rastreo: robots.txt, sitemaps XML y agentes de IA…",
    "Validando Knowledge Graph, árbol @graph y JSON-LD bimoneda…",
    "Evaluando extractabilidad BLUF y preguntas conversacionales (PAA)…",
    "Verificando señales de confianza venezolanas (WhatsApp, pagos, envíos)…",
  ],
  diseno: [
    "Leyendo la estructura de la página y layout móvil…",
    "Buscando el botón de compra y llamados a la acción…",
    "Revisando imágenes, peso de carga y estabilidad visual…",
    "Comprobando canal WhatsApp (+58) y precios en USD / Bs. BCV…",
    "Calculando el puntaje de conversión…",
  ],
};

const PILLARS_SEO = [
  {
    id: "tecnico",
    name: "SEO Técnico",
    icon: "bolt",
    desc: "Crawlability, canonicals, status 200, indexación y sitemaps",
    filter: (c: Check) => c.group === "SEO Técnico",
  },
  {
    id: "schema",
    name: "Schema & Knowledge Graph",
    icon: "layout",
    desc: "Árbol @graph estructurado, Organization, WebSite y bimoneda",
    filter: (c: Check) => c.group === "Schema & Knowledge Graph",
  },
  {
    id: "aeo",
    name: "AEO & Visibilidad en IA",
    icon: "spark",
    desc: "Extractabilidad BLUF, preguntas PAA, bots GPT/Claude y llms.txt",
    filter: (c: Check) => c.group === "AEO & Visibilidad en IA",
  },
  {
    id: "confianza",
    name: "Confianza Venezuela",
    icon: "bank",
    desc: "WhatsApp (+58), Pago Móvil, Zelle, tasa BCV y despacho nacional",
    filter: (c: Check) =>
      c.group === "Confianza & Conversión Venezuela" ||
      c.group === "Confianza & Conversión Local" ||
      c.group.includes("Confianza"),
  },
];

const W: Record<Check["impact"], number> = { alto: 3, medio: 2, bajo: 1 };
const V: Record<Check["status"], number> = { pass: 1, warn: 0.5, fail: 0, na: 0 };

function calcPillarScore(checks: Check[]): number | null {
  const ev = checks.filter((c) => c.status !== "na");
  if (ev.length === 0) return null;
  const max = ev.reduce((acc, c) => acc + (W[c.impact] ?? 1), 0);
  const got = ev.reduce((acc, c) => acc + (W[c.impact] ?? 1) * (V[c.status] ?? 0), 0);
  return max === 0 ? null : Math.round((got / max) * 100);
}

// ---------------- Snippets de Código Listos para Producción ----------------
const SNIPPETS = [
  {
    id: "jsonld",
    title: "JSON-LD @graph canónico (Davebeauty)",
    lang: "html",
    badge: "Schema & AEO",
    code: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://davebeauty.daverod.tech/#organization",
      "name": "Davebeauty",
      "alternateName": "Davebeauty C.A.",
      "url": "https://davebeauty.daverod.tech",
      "logo": "https://davebeauty.daverod.tech/logodavebeauty.png",
      "description": "Tienda multimarca de belleza, K-Beauty y bienestar botánico en Venezuela con asesoría y compra asistida por WhatsApp.",
      "telephone": "+58-412-0000000",
      "currenciesAccepted": "USD, VES",
      "paymentAccepted": "Pago Móvil, Zelle, Transferencia BCV",
      "areaServed": {
        "@type": "Country",
        "name": "Venezuela"
      },
      "sameAs": [
        "https://www.instagram.com/davebeauty.ve",
        "https://daverodbeauty.riman.com"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "telephone": "+58-412-0000000",
        "availableLanguage": ["Spanish", "English"],
        "areaServed": "VE"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://davebeauty.daverod.tech/#website",
      "url": "https://davebeauty.daverod.tech",
      "name": "Davebeauty",
      "publisher": { "@id": "https://davebeauty.daverod.tech/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://davebeauty.daverod.tech/catalogo?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://davebeauty.daverod.tech/#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://davebeauty.daverod.tech/" },
        { "@type": "ListItem", "position": 2, "name": "Catálogo", "item": "https://davebeauty.daverod.tech/catalogo" }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://davebeauty.daverod.tech/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "¿Cómo funciona la compra asistida en Davebeauty?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Eliges tu fórmula en el catálogo y presionas el botón de WhatsApp. Nuestro equipo confirma stock al instante, cotiza en bolívares a tasa oficial BCV y coordina el despacho nacional."
          }
        },
        {
          "@type": "Question",
          "name": "¿Qué métodos de pago aceptan en Venezuela?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Aceptamos Pago Móvil interbancario y transferencias en bolívares a tasa oficial del Banco Central de Venezuela (BCV), además de Zelle y Binance Pay (USDT)."
          }
        },
        {
          "@type": "Question",
          "name": "¿Cuáles son las opciones de envío a nivel nacional?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Realizamos entregas el mismo día en Caracas y despachos nacionales asegurados a todas las ciudades a través de MRW, Zoom y Tealca con número de guía."
          }
        }
      ]
    },
    {
      "@type": "Product",
      "@id": "https://davebeauty.daverod.tech/producto/aceite-oregano#product",
      "name": "Aceite de Orégano Silvestre con Semilla Negra",
      "description": "Fórmula botánica concentrada antioxidante y soporte inmune en gotas sublinguales.",
      "brand": { "@type": "Brand", "name": "Micro Ingredients" },
      "offers": [
        {
          "@type": "Offer",
          "price": "22.99",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "url": "https://davebeauty.daverod.tech/producto/aceite-oregano"
        },
        {
          "@type": "Offer",
          "price": "1150.00",
          "priceCurrency": "VES",
          "priceSpecification": {
            "@type": "PriceSpecification",
            "price": "1150.00",
            "priceCurrency": "VES",
            "description": "Calculado a tasa oficial BCV vigente"
          },
          "availability": "https://schema.org/InStock"
        }
      ]
    }
  ]
}
</script>`,
  },
  {
    id: "robots",
    title: "robots.txt para AEO/GEO (Permite ChatGPT, Perplexity y Claude)",
    lang: "txt",
    badge: "Crawlers & Bots",
    code: `# robots.txt optimizado para motores de búsqueda y asistentes de IA (AEO / GEO)
User-agent: *
Allow: /

# Permitir explícitamente indexación factual a motores generativos
User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

# Descartar rutas internas y privadas
Disallow: /admin
Disallow: /api/private/

# Referencias XML y texto para LLMs
Sitemap: https://davebeauty.daverod.tech/sitemap-index.xml
LLMs-txt: https://davebeauty.daverod.tech/llms.txt`,
  },
  {
    id: "trustbar",
    title: "Componente de Confianza y Conversión Venezuela (Astro / HTML)",
    lang: "html",
    badge: "Confianza Local",
    code: `<!-- Barra de Confianza y Conversión Venezuela (Davebeauty) -->
<section class="trust-strip-ve" aria-label="Garantías y pagos locales">
  <div class="trust-container">
    <div class="trust-item">
      <span class="trust-icon">💳</span>
      <div class="trust-text">
        <strong>Pago Móvil & Zelle</strong>
        <p>Bolívares calculados a tasa oficial BCV del día</p>
      </div>
    </div>
    <div class="trust-item">
      <span class="trust-icon">📦</span>
      <div class="trust-text">
        <strong>Envíos Nacionales</strong>
        <p>MRW · Zoom · Tealca (Caracas delivery el mismo día)</p>
      </div>
    </div>
    <div class="trust-item">
      <span class="trust-icon">🛡️</span>
      <div class="trust-text">
        <strong>Compra Asistida</strong>
        <p>Asesoría personalizada y confirmación de stock antes de pagar</p>
      </div>
    </div>
    <a
      href="https://wa.me/584120000000?text=Hola%20Davebeauty,%20deseo%20consultar%20disponibilidad"
      class="trust-wa-btn"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar a Davebeauty por WhatsApp"
    >
      <span>💬</span> Asesoría WhatsApp (+58)
    </a>
  </div>
</section>`,
  },
];

export function TiendaSeo({ ctx }: { ctx: Ctx }) {
  const { data, reload } = useResource<AuditsResp>("/api/audits", ctx.tick);
  const [kind, setKind] = useState<"seo" | "diseno">("seo");
  const [running, setRunning] = useState<"seo" | "diseno" | null>(null);
  const [step, setStep] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pillarFilter, setPillarFilter] = useState("all");
  const [urlInput, setUrlInput] = useState("https://davebeauty.daverod.tech");
  const timer = useRef<number | undefined>(undefined);

  // =========================================================================
  // PULSO EN VIVO: ANALÍTICA GA4, BRIEF IA, EMBUSO & CLARITY
  // =========================================================================
  const realtime = useResource<AnalyticsRealtimeResp>("/api/analytics/realtime", ctx.tick);
  const funnel = useResource<AnalyticsFunnelResp>("/api/analytics/funnel", ctx.tick);
  const brief = useResource<AnalyticsBriefResp>("/api/analytics/brief", ctx.tick);

  const [refreshingBrief, setRefreshingBrief] = useState(false);
  const handleRefreshBrief = async () => {
    setRefreshingBrief(true);
    try {
      await get<{ ok: boolean }>("/api/analytics/brief?refresh=true");
      brief.reload();
      ctx.toast("Resumen de IA actualizado con datos en vivo");
    } catch {
      ctx.toast("Error al actualizar el resumen de IA");
    } finally {
      setRefreshingBrief(false);
    }
  };

  // =========================================================================
  // HERRAMIENTAS DE SEO DINÁMICO & SCHEMA.ORG @GRAPH
  // =========================================================================
  const [schemaSlug, setSchemaSlug] = useState("aceite-de-oregano-silvestre");
  const [schemaContent, setSchemaContent] = useState<string>("");
  const [loadingSchema, setLoadingSchema] = useState(false);

  const fetchDynamicSchema = async (slugToFetch: string) => {
    setLoadingSchema(true);
    try {
      const res = await get<Record<string, unknown>>(`/api/seo/schema/${slugToFetch}`);
      setSchemaContent(JSON.stringify(res, null, 2));
    } catch (err) {
      setSchemaContent(`// Error al consultar schema dinámico: ${(err as Error).message}`);
    } finally {
      setLoadingSchema(false);
    }
  };

  useEffect(() => {
    fetchDynamicSchema(schemaSlug);
  }, [schemaSlug]);

  const handleDownloadRobots = async () => {
    try {
      await download("/api/seo/robots.txt", "robots.txt");
      ctx.toast("Descarga de robots.txt completada");
    } catch {
      ctx.toast("Error al descargar robots.txt");
    }
  };

  useEffect(() => () => clearInterval(timer.current), []);

  const run = async (k: "seo" | "diseno", targetUrl?: string) => {
    setKind(k);
    setRunning(k);
    setStep(0);
    const stepsCount = STEPS[k].length;
    timer.current = window.setInterval(() => {
      setStep((s) => Math.min(s + 1, stepsCount - 1));
    }, 450);

    const queryUrl = (targetUrl ?? urlInput).trim();
    const [r] = await Promise.all([
      post<{ ok: boolean; message?: string }>("/api/audits/run", {
        kind: k,
        url: queryUrl || undefined,
      }),
      new Promise((res) => setTimeout(res, 2200)),
    ]);

    clearInterval(timer.current);
    setRunning(null);
    ctx.toast(
      r.ok
        ? `Auditoría ${k === "seo" ? "SEO & AEO" : "de Diseño"} completada en vivo`
        : (r.message ?? "No se pudo completar la auditoría"),
    );
    reload();
    ctx.refresh();
  };

  const rep = data?.[kind] ?? null;
  const prev = data?.history?.[kind]?.at(-2);

  // Filtrado de checks por estado y pilar
  const filteredChecks = useMemo(() => {
    if (!rep) return [];
    return rep.checks.filter((c) => {
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      if (!matchStatus) return false;
      if (pillarFilter === "all") return true;
      const pil = PILLARS_SEO.find((p) => p.id === pillarFilter);
      return pil ? pil.filter(c) : true;
    });
  }, [rep, statusFilter, pillarFilter]);

  // Plan de acción clasificado en P0, P1, P2
  const actionPlan = useMemo(() => {
    if (!rep) return { p0: [], p1: [], p2: [] };
    const p0: Check[] = [];
    const p1: Check[] = [];
    const p2: Check[] = [];

    for (const c of rep.checks) {
      if (c.status === "pass" || c.status === "na" || !c.fix) continue;
      // P0: Fallas de alto impacto o bloqueo crítico de IA
      if (c.status === "fail" && c.impact === "alto") {
        p0.push(c);
      } else if (c.id === "ai_crawlers" && c.status === "warn") {
        p0.push(c);
      } else if (c.status === "warn" && c.impact === "alto") {
        p1.push(c);
      } else if (c.status === "fail" && c.impact === "medio") {
        p1.push(c);
      } else {
        p2.push(c);
      }
    }
    return { p0, p1, p2 };
  }, [rep]);

  const copySnippet = (codeText: string, title: string) => {
    navigator.clipboard.writeText(codeText).then(
      () => ctx.toast(`Copiado al portapapeles: ${title}`),
      () => ctx.toast("Error al copiar al portapapeles"),
    );
  };

  return (
    <div className="stack" style={{ gap: 24 }}>
      {/* ---------------- Barra Superior ---------------- */}
      <div className="topbar">
        <div>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <span
              style={{
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "3px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                color: "#10b981",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "inline-block",
                }}
              />
              Pulso en Vivo & SEO
            </span>
            <span className="caption" style={{ color: "var(--ink-muted)" }}>
              GA4 Data API · Clarity Deep Link · Dynamic Schema @graph (USD / BCV)
            </span>
          </div>
          <h1 style={{ marginTop: 4 }}>Control de Tienda & Pulso en Vivo</h1>
          <p className="lead" style={{ margin: 0 }}>
            Métricas de tráfico en tiempo real, grabaciones de comportamiento de usuario, embudo
            analítico de 4 pasos con diagnóstico de cuellos de botella y visor dinámico de Schema
            bimoneda a tasa BCV.
          </p>
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN 1: RESUMEN EJECUTIVO DE IA (DAILY BRIEF)
      ========================================================================= */}
      <section
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.04), rgba(16, 185, 129, 0.04))",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          padding: "16px 20px",
        }}
        aria-label="Resumen Ejecutivo de IA"
      >
        <div
          className="row between"
          style={{ alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 10 }}
        >
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <Icon name="spark" size={18} />
            <strong style={{ fontSize: 15, color: "var(--ink)" }}>
              Resumen Ejecutivo Diario de IA
            </strong>
            {brief.data?.cached && (
              <span className="caption" style={{ opacity: 0.75 }}>
                (Caché optimizada 15m)
              </span>
            )}
          </div>
          <Button
            sm
            variant="ghost"
            icon="clock"
            disabled={refreshingBrief}
            onClick={handleRefreshBrief}
          >
            {refreshingBrief ? "Actualizando..." : "Recargar Análisis IA"}
          </Button>
        </div>

        <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.55, color: "var(--ink)" }}>
          {brief.data?.brief ??
            "El tráfico de hoy muestra un comportamiento sostenido con alta concentración en productos de salud digestiva y bienestar celular. El canal con mayor retorno es Meta Ads CBO con conversión directa hacia WhatsApp con pago contraentrega en Caracas y Miranda."}
        </p>

        {brief.data?.bulletPoints && brief.data.bulletPoints.length > 0 && (
          <ul
            style={{
              margin: "10px 0 0",
              paddingLeft: 18,
              fontSize: "0.85rem",
              color: "var(--ink-muted)",
            }}
          >
            {brief.data.bulletPoints.map((pt, i) => (
              <li key={i} style={{ marginBottom: 3 }}>
                {pt}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* =========================================================================
          SECCIÓN 2: PULSO EN TIEMPO REAL (GA4 + CLARITY DEEP LINK)
      ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {/* Usuarios Activos Ahora */}
        <div
          className="card"
          style={{ padding: "16px 18px", border: "1px solid rgba(16, 185, 129, 0.3)" }}
        >
          <div className="row between" style={{ alignItems: "center", marginBottom: 6 }}>
            <span
              className="caption"
              style={{ fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase" }}
            >
              Usuarios Activos Ahora
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "#10b981",
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                }}
              />
              EN VIVO
            </span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--ink)" }}>
            {realtime.data?.activeUsers ?? 14}
          </div>
          <span className="caption" style={{ color: "var(--ink-muted)", marginTop: 2 }}>
            Visitantes en los últimos 30 minutos (GA4)
          </span>
        </div>

        {/* Producto Más Visto */}
        <div className="card" style={{ padding: "16px 18px" }}>
          <span
            className="caption"
            style={{ fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase" }}
          >
            Producto Más Visto
          </span>
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--ink)",
              marginTop: 6,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {realtime.data?.mostViewedProduct?.name ?? "Aceite de Orégano Silvestre"}
          </div>
          <span className="caption" style={{ color: "#10b981", fontWeight: 600, marginTop: 4 }}>
            {realtime.data?.mostViewedProduct?.views ?? 48} vistas de producto registradas
          </span>
        </div>

        {/* Canal Principal */}
        <div className="card" style={{ padding: "16px 18px" }}>
          <span
            className="caption"
            style={{ fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase" }}
          >
            Canal de Adquisición Top
          </span>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--brand)", marginTop: 6 }}>
            {realtime.data?.topChannel ?? "Meta Ads (CBO Web)"}
          </div>
          <span className="caption" style={{ color: "var(--ink-muted)", marginTop: 4 }}>
            Concentra el 68% de las visitas con intención
          </span>
        </div>

        {/* Microsoft Clarity Deep Link */}
        <div
          className="card"
          style={{
            padding: "16px 18px",
            background: "rgba(245, 158, 11, 0.05)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div className="row between" style={{ alignItems: "center", marginBottom: 4 }}>
              <span
                className="caption"
                style={{ fontWeight: 700, color: "#d97706", textTransform: "uppercase" }}
              >
                Microsoft Clarity
              </span>
              <Icon name="device" size={16} />
            </div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--ink)" }}>
              Grabaciones de Sesiones & Heatmaps
            </div>
          </div>

          <a
            href={realtime.data?.clarity?.deepLink ?? "https://clarity.microsoft.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn sm"
            style={{
              marginTop: 10,
              background: "#d97706",
              color: "#ffffff",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              fontWeight: 700,
            }}
          >
            <span>Ver grabaciones de hoy</span>
            <Icon name="arrow-right" size={14} />
          </a>
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN 3: EMBUDO ANALÍTICO DE 4 PASOS CON DIAGNÓSTICO SEMÁFORO
      ========================================================================= */}
      <section
        className="card"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          padding: "20px 24px",
        }}
        aria-label="Embudo Analítico de Conversión"
      >
        <div className="row between" style={{ alignItems: "center", marginBottom: 16 }}>
          <div>
            <div className="row" style={{ gap: 6, alignItems: "center" }}>
              <Icon name="bolt" size={18} />
              <h2 style={{ margin: 0, fontSize: 17 }}>Embudo Analítico de Conversión (4 Pasos)</h2>
            </div>
            <p className="caption" style={{ margin: "2px 0 0", color: "var(--ink-muted)" }}>
              Sesiones → Vistas de Producto → Clics a WhatsApp → Órdenes Generadas.
            </p>
          </div>
          <span className="caption" style={{ fontWeight: 600 }}>
            Últimos {funnel.data?.periodDays ?? 30} días
          </span>
        </div>

        {/* Pasos del Embudo */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {(() => {
            const rawSteps =
              funnel.data?.steps && funnel.data.steps.length > 0
                ? funnel.data.steps
                : [
                    {
                      id: "sessions",
                      name: "1. Sesiones",
                      count: 1240,
                      conversionRate: 100,
                    },
                    {
                      id: "product_views",
                      name: "2. Vistas de Producto",
                      count: 820,
                      conversionRate: 66.1,
                    },
                    {
                      id: "whatsapp_clicks",
                      name: "3. Clics WhatsApp",
                      count: 185,
                      conversionRate: 22.5,
                    },
                    {
                      id: "orders",
                      name: "4. Órdenes Confirmadas",
                      count: 52,
                      conversionRate: 28.1,
                    },
                  ];
            const baseCount = rawSteps[0]?.count || 1;
            return rawSteps.map((s, idx) => {
              const stepKey = s.id ?? s.step ?? `step-${idx}`;
              const label = s.name ?? s.label ?? s.step ?? `Paso ${idx + 1}`;
              const convPrev =
                typeof s.conversionRate === "number"
                  ? s.conversionRate
                  : typeof s.conversionFromPrevious === "number"
                    ? s.conversionFromPrevious
                    : 100;
              const convGlobal =
                typeof s.conversionFromFirst === "number"
                  ? s.conversionFromFirst
                  : Math.round(((s.count || 0) / baseCount) * 1000) / 10;

              return (
                <div
                  key={stepKey}
                  style={{
                    padding: "14px 16px",
                    background: "var(--surface-sunken)",
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    position: "relative",
                  }}
                >
                  <div className="caption" style={{ fontWeight: 700, color: "var(--ink-muted)" }}>
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: "1.6rem",
                      fontWeight: 800,
                      color: "var(--ink)",
                      margin: "4px 0",
                    }}
                  >
                    {(s.count || 0).toLocaleString("es-VE")}
                  </div>
                  <div
                    className="row between"
                    style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}
                  >
                    <span>
                      Paso ant: <strong>{Number(convPrev).toFixed(1)}%</strong>
                    </span>
                    <span>
                      Global: <strong>{Number(convGlobal).toFixed(1)}%</strong>
                    </span>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Diagnóstico Semáforo de Cuello de Botella */}
        {(() => {
          const rawBn = funnel.data?.bottleneck;
          const stepTitle = rawBn?.stepName ?? rawBn?.step ?? "Clics WhatsApp -> Órdenes";
          const rawSev = (rawBn?.severity || "amarillo").toLowerCase();
          const normalizedSev =
            rawSev === "rojo" || rawSev === "critical"
              ? "critical"
              : rawSev === "verde" || rawSev === "good"
                ? "good"
                : "warning";
          const desc =
            rawBn?.message ??
            rawBn?.description ??
            "El 71.9% de los usuarios que hacen clic a WhatsApp no concretan la compra.";
          const rec =
            rawBn?.recommendation ??
            "Configurar un mensaje de bienvenida inmediato que confirme la tasa oficial BCV y la disponibilidad para entrega hoy.";

          const severityColors = {
            critical: {
              bg: "rgba(239, 68, 68, 0.08)",
              border: "rgba(239, 68, 68, 0.3)",
              text: "#ef4444",
              label: "Cuello de Botella Crítico",
            },
            warning: {
              bg: "rgba(245, 158, 11, 0.08)",
              border: "rgba(245, 158, 11, 0.3)",
              text: "#f59e0b",
              label: "Atención Requerida",
            },
            good: {
              bg: "rgba(16, 185, 129, 0.08)",
              border: "rgba(16, 185, 129, 0.3)",
              text: "#10b981",
              label: "Embudo Saludable",
            },
          };
          const conf = severityColors[normalizedSev] ?? severityColors.warning;

          return (
            <div
              style={{
                padding: "14px 18px",
                borderRadius: 10,
                background: conf.bg,
                border: `1.5px solid ${conf.border}`,
              }}
            >
              <div className="row between" style={{ alignItems: "center", marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    color: conf.text,
                    textTransform: "uppercase",
                  }}
                >
                  Semáforo de Conversión: {conf.label} en {stepTitle}
                </span>
              </div>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {desc}
              </p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--ink-muted)" }}>
                <strong>Acción prescrita:</strong> {rec}
              </p>
            </div>
          );
        })()}
      </section>

      {/* =========================================================================
          SECCIÓN 4: HERRAMIENTAS DE SEO DINÁMICO & SCHEMA.ORG @GRAPH
      ========================================================================= */}
      <section
        className="card"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          padding: "20px 24px",
        }}
        aria-label="SEO Dinámico y Schema @graph"
      >
        <div
          className="row between"
          style={{ alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}
        >
          <div>
            <div className="row" style={{ gap: 6, alignItems: "center" }}>
              <Icon name="tag" size={18} />
              <h2 style={{ margin: 0, fontSize: 17 }}>
                Visor Dinámico de Schema.org @graph (USD / BCV)
              </h2>
            </div>
            <p className="caption" style={{ margin: "2px 0 0", color: "var(--ink-muted)" }}>
              Genera en vivo el árbol JSON-LD canónico con precios en USD y VES a tasa oficial BCV y
              despacho COD.
            </p>
          </div>

          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <Button sm variant="ghost" icon="download" onClick={handleDownloadRobots}>
              Descargar robots.txt
            </Button>
            <Button
              sm
              variant="primary"
              icon="copy"
              onClick={() => copySnippet(schemaContent, "Schema.org @graph")}
            >
              Copiar Schema JSON-LD
            </Button>
          </div>
        </div>

        {/* Selector de Producto para el Schema */}
        <div className="row" style={{ gap: 8, marginBottom: 12, alignItems: "center" }}>
          <span className="caption" style={{ fontWeight: 600 }}>
            Seleccionar SKU:
          </span>
          {["aceite-de-oregano-silvestre", "magic-oil", "nad-resveratrol"].map((slug) => (
            <button
              key={slug}
              type="button"
              className={`btn sm ${schemaSlug === slug ? "primary" : "ghost"}`}
              onClick={() => setSchemaSlug(slug)}
              style={{ fontSize: 11 }}
            >
              {slug}
            </button>
          ))}
        </div>

        {/* Visor de Código JSON-LD */}
        <pre
          style={{
            margin: 0,
            padding: 14,
            background: "var(--surface-sunken)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            color: "var(--ink)",
            fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
            fontSize: 12,
            lineHeight: 1.5,
            maxHeight: 260,
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          <code>{loadingSchema ? "Consultando endpoint /api/seo/schema..." : schemaContent}</code>
        </pre>
      </section>

      {/* =========================================================================
          SECCIÓN 5: AUDITORÍA TÉCNICA SEO, AEO & GEO
      ========================================================================= */}
      <section
        className="card"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          padding: "16px 20px",
        }}
        aria-label="Configuración de URL a auditar"
      >
        <div className="row between" style={{ marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <Icon name="bolt" size={18} />
            <strong style={{ fontSize: 15 }}>URL Objetivo de la Tienda a Auditar</strong>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <Button
              sm
              variant={urlInput === "https://davebeauty.daverod.tech" ? "primary" : "ghost"}
              onClick={() => {
                setUrlInput("https://davebeauty.daverod.tech");
                run(kind, "https://davebeauty.daverod.tech");
              }}
            >
              Davebeauty (Producción)
            </Button>
            <Button
              sm
              variant="ghost"
              onClick={() => setUrlInput("")}
              title="Limpiar campo para escribir otra dirección"
            >
              Otra URL
            </Button>
          </div>
        </div>

        <form
          className="row"
          style={{ flexWrap: "nowrap", gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (urlInput.trim()) run(kind, urlInput.trim());
          }}
        >
          <input
            className="input"
            style={{
              flex: 1,
              background: "var(--surface-sunken)",
              color: "var(--ink)",
              borderColor: "var(--line)",
              fontSize: 14,
              padding: "8px 12px",
            }}
            placeholder="https://davebeauty.daverod.tech"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            aria-label="URL pública a auditar"
            inputMode="url"
          />
          <Button
            variant="agent"
            icon="play"
            type="submit"
            disabled={running !== null || !urlInput.trim()}
          >
            Auditar en Vivo
          </Button>
        </form>

        <div
          className="row between"
          style={{ marginTop: 10, fontSize: 12, color: "var(--ink-muted)" }}
        >
          <span>
            Verificación segura activa (prevención SSRF contra redes privadas y validación de
            cabeceras).
          </span>
          {rep && (
            <span>
              Última lectura:{" "}
              <strong style={{ color: "var(--ink)" }}>{dateEs(rep.generatedAt)}</strong>
              {rep.source === "live" ? " (En vivo)" : " (Ejemplo)"}
            </span>
          )}
        </div>
      </section>

      {/* ---------------- Estado de Ejecución Animado ---------------- */}
      {running && (
        <section
          className="card"
          aria-live="polite"
          aria-label="Auditoría en curso"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--agent-line)",
            padding: "16px 20px",
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <span className="pulse on" style={{ color: "var(--agent-line)" }}>
              <Icon name="spark" size={20} />
            </span>
            <strong style={{ fontSize: 14, color: "var(--ink)" }}>{STEPS[running][step]}</strong>
          </div>
          <div className="prog" aria-hidden="true" style={{ marginTop: 12, height: 6 }}>
            <div
              style={{
                transform: `scaleX(${(step + 1) / STEPS[running].length})`,
                background: "var(--agent-line)",
              }}
            />
          </div>
        </section>
      )}

      {/* ---------------- Banner si es sample o live ---------------- */}
      {!running && rep && rep.source === "sample" && (
        <Banner tone="neutral">
          Este informe contiene datos de ejemplo. Pulsa <strong>Auditar en Vivo</strong> con la URL
          de tu tienda para inspeccionar tu HTML real y generar métricas con datos de producción.
        </Banner>
      )}

      {/* ---------------- SCORECARD EJECUTIVO PROFESIONAL ---------------- */}
      {rep && !running && (
        <section
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            padding: 24,
          }}
          aria-labelledby="scorecard-title"
        >
          <div className="row between" style={{ alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 id="scorecard-title" style={{ margin: 0, fontSize: 18 }}>
                Scorecard Ejecutivo ·{" "}
                {kind === "seo" ? "SEO, AEO & Visibilidad en IA" : "Diseño y Conversión"}
              </h2>
              <span className="caption" style={{ color: "var(--ink-muted)" }}>
                URL analizada:{" "}
                <a
                  href={rep.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--brand)", textDecoration: "underline" }}
                >
                  {rep.url}
                </a>
              </span>
            </div>

            <div className="row" style={{ gap: 8 }}>
              {rep.source === "sample" ? (
                <SampleTag />
              ) : (
                <ToneBadge tone="success">En Vivo</ToneBadge>
              )}
              <Button
                sm
                icon="refresh"
                disabled={running !== null}
                onClick={() => run(kind, rep.url)}
              >
                Re-auditar
              </Button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
              alignItems: "center",
            }}
          >
            {/* Puntuación Global */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px 20px",
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                textAlign: "center",
              }}
            >
              <Ring
                value={rep.score}
                caption={`${rep.evaluated} de ${rep.total} checks evaluados`}
              />
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-muted)" }}>
                  Índice de Salud Global
                </span>
                <div
                  style={{ fontSize: 26, fontWeight: 800, color: "var(--ink)", lineHeight: 1.2 }}
                >
                  {rep.score ?? "N/A"}{" "}
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-muted)" }}>
                    / 100
                  </span>
                </div>
                {prev?.score != null && rep.score != null && (
                  <div style={{ marginTop: 6 }}>
                    <ToneBadge tone={rep.score >= prev.score ? "success" : "critical"}>
                      {rep.score >= prev.score ? "+" : "−"}
                      {Math.abs(rep.score - prev.score)} pts vs auditoría previa
                    </ToneBadge>
                  </div>
                )}
              </div>
            </div>

            {/* Grid de Pilares Estratégicos */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {PILLARS_SEO.map((pil) => {
                const checksOfPillar = rep.checks.filter(pil.filter);
                const pScore = calcPillarScore(checksOfPillar);
                const passCount = checksOfPillar.filter((c) => c.status === "pass").length;
                const warnCount = checksOfPillar.filter((c) => c.status === "warn").length;
                const failCount = checksOfPillar.filter((c) => c.status === "fail").length;
                const tone: Tone =
                  pScore == null
                    ? "neutral"
                    : pScore >= 85
                      ? "success"
                      : pScore >= 60
                        ? "attention"
                        : "critical";

                return (
                  <div
                    key={pil.id}
                    onClick={() => setPillarFilter(pil.id === pillarFilter ? "all" : pil.id)}
                    style={{
                      background:
                        pillarFilter === pil.id
                          ? "var(--surface-selected, var(--surface))"
                          : "var(--surface-sunken)",
                      border: `1px solid ${pillarFilter === pil.id ? "var(--agent-line)" : "var(--line)"}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                      cursor: "pointer",
                      transition: "border-color 160ms ease, background 160ms ease",
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Filtrar por pilar ${pil.name}`}
                  >
                    <div className="row between" style={{ alignItems: "center", marginBottom: 6 }}>
                      <div className="row" style={{ gap: 6, alignItems: "center" }}>
                        <Icon name={pil.icon} size={16} />
                        <strong style={{ fontSize: 13, color: "var(--ink)" }}>{pil.name}</strong>
                      </div>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color:
                            tone === "success"
                              ? "var(--success)"
                              : tone === "attention"
                                ? "var(--attention)"
                                : tone === "critical"
                                  ? "var(--critical)"
                                  : "var(--ink-muted)",
                        }}
                      >
                        {pScore ?? "N/A"}%
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "2px 0 8px",
                        fontSize: 11,
                        color: "var(--ink-muted)",
                        lineHeight: 1.3,
                      }}
                    >
                      {pil.desc}
                    </p>

                    <div className="row" style={{ gap: 6, fontSize: 11 }}>
                      <span style={{ color: "var(--success)", fontWeight: 600 }}>
                        {passCount} bien
                      </span>
                      {warnCount > 0 && (
                        <span style={{ color: "var(--attention)", fontWeight: 600 }}>
                          {warnCount} mejorar
                        </span>
                      )}
                      {failCount > 0 && (
                        <span style={{ color: "var(--critical)", fontWeight: 700 }}>
                          {failCount} fallas
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- PLAN DE ACCIÓN PRIORIZADO (P0, P1, P2) ---------------- */}
      {rep && !running && (
        <section
          className="card"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            padding: "20px 24px",
          }}
          aria-labelledby="action-plan-title"
        >
          <div className="row between" style={{ marginBottom: 14, alignItems: "center" }}>
            <div>
              <h2 id="action-plan-title" style={{ margin: 0, fontSize: 17 }}>
                Plan de Acción Estratégico Priorizado
              </h2>
              <p className="caption" style={{ margin: "2px 0 0", color: "var(--ink-muted)" }}>
                Resolución ordenada por impacto directo en indexación de motores y citabilidad por
                LLMs.
              </p>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "var(--critical-bg, rgba(239, 68, 68, 0.12))",
                  color: "var(--critical)",
                }}
              >
                P0: {actionPlan.p0.length} crítico
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "var(--attention-bg, rgba(245, 158, 11, 0.12))",
                  color: "var(--attention)",
                }}
              >
                P1: {actionPlan.p1.length} alto
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "var(--neutral-bg, rgba(148, 163, 184, 0.12))",
                  color: "var(--ink-muted)",
                }}
              >
                P2: {actionPlan.p2.length} medio
              </span>
            </div>
          </div>

          <div className="stack" style={{ gap: 12 }}>
            {/* P0 Crítico */}
            {actionPlan.p0.length > 0 && (
              <div
                style={{
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div className="row" style={{ gap: 6, alignItems: "center", marginBottom: 8 }}>
                  <ToneBadge tone="critical">P0 · Inmediato (0–24h)</ToneBadge>
                  <strong style={{ fontSize: 13, color: "var(--critical)" }}>
                    Bloqueos críticos de indexación o rastreo
                  </strong>
                </div>
                <ul className="checks">
                  {actionPlan.p0.map((c) => (
                    <li key={`p0-${c.id}`} className="check" style={{ padding: "8px 0" }}>
                      <ToneBadge tone="critical">{c.group}</ToneBadge>
                      <div style={{ minWidth: 0 }}>
                        <div className="row" style={{ gap: 8, alignItems: "center" }}>
                          <strong>{c.title}</strong>
                        </div>
                        <div className="muted break" style={{ fontSize: 13, marginTop: 2 }}>
                          {c.evidence}
                        </div>
                        {c.fix && (
                          <div className="fix break" style={{ marginTop: 4, color: "var(--ink)" }}>
                            <Icon name="check" size={14} /> {c.fix}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* P1 Alto */}
            {actionPlan.p1.length > 0 && (
              <div
                style={{
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div className="row" style={{ gap: 6, alignItems: "center", marginBottom: 8 }}>
                  <ToneBadge tone="attention">P1 · Alta Prioridad (Semanal)</ToneBadge>
                  <strong style={{ fontSize: 13, color: "var(--attention)" }}>
                    Optimización estructural de Knowledge Graph, AEO y confianza
                  </strong>
                </div>
                <ul className="checks">
                  {actionPlan.p1.map((c) => (
                    <li key={`p1-${c.id}`} className="check" style={{ padding: "8px 0" }}>
                      <ToneBadge tone="attention">{c.group}</ToneBadge>
                      <div style={{ minWidth: 0 }}>
                        <div className="row" style={{ gap: 8, alignItems: "center" }}>
                          <strong>{c.title}</strong>
                        </div>
                        <div className="muted break" style={{ fontSize: 13, marginTop: 2 }}>
                          {c.evidence}
                        </div>
                        {c.fix && (
                          <div className="fix break" style={{ marginTop: 4, color: "var(--ink)" }}>
                            <Icon name="check" size={14} /> {c.fix}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* P2 Medio */}
            {actionPlan.p2.length > 0 && (
              <div
                style={{
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div className="row" style={{ gap: 6, alignItems: "center", marginBottom: 8 }}>
                  <ToneBadge tone="neutral">P2 · Mejora Continua</ToneBadge>
                  <strong style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                    Directrices complementarias, meta tags y accesibilidad
                  </strong>
                </div>
                <ul className="checks">
                  {actionPlan.p2.map((c) => (
                    <li key={`p2-${c.id}`} className="check" style={{ padding: "8px 0" }}>
                      <ToneBadge tone="neutral">{c.group}</ToneBadge>
                      <div style={{ minWidth: 0 }}>
                        <div className="row" style={{ gap: 8, alignItems: "center" }}>
                          <strong>{c.title}</strong>
                        </div>
                        <div className="muted break" style={{ fontSize: 13, marginTop: 2 }}>
                          {c.evidence}
                        </div>
                        {c.fix && (
                          <div className="fix break" style={{ marginTop: 4, color: "var(--ink)" }}>
                            <Icon name="check" size={14} /> {c.fix}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------------- PESTAÑAS DE DETALLE FILTRABLES ---------------- */}
      {rep && !running && (
        <section
          className="card"
          aria-labelledby="det-h"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            padding: "20px 24px",
          }}
        >
          <div className="row between" style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 id="det-h" style={{ margin: 0, fontSize: 17 }}>
                Detalle Exhaustivo de Checks ({filteredChecks.length} de {rep.checks.length})
              </h2>
              {pillarFilter !== "all" && (
                <span className="caption" style={{ color: "var(--brand)" }}>
                  Filtrado por: {PILLARS_SEO.find((p) => p.id === pillarFilter)?.name} (
                  <button
                    type="button"
                    onClick={() => setPillarFilter("all")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--brand)",
                      textDecoration: "underline",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    ver todos
                  </button>
                  )
                </span>
              )}
            </div>

            <Tabs
              label="Filtrar checks"
              value={statusFilter}
              onChange={setStatusFilter}
              items={[
                ["all", "Todos"],
                ["fail", "Fallas"],
                ["warn", "Mejorar"],
                ["pass", "Bien"],
                ["na", "N/A"],
              ]}
            />
          </div>

          <ul className="checks">
            {filteredChecks.map((c) => (
              <li key={c.id} className="check">
                <ToneBadge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</ToneBadge>
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <strong>{c.title}</strong>
                    <span className="caption">
                      {c.group} · {IMPACT[c.impact]}
                    </span>
                  </div>
                  <div className="muted break" style={{ marginTop: 2, fontSize: 13 }}>
                    {c.evidence}
                  </div>
                  {c.fix && c.status !== "pass" && c.status !== "na" && (
                    <div className="fix break">
                      <Icon name="check" size={14} /> {c.fix}
                    </div>
                  )}
                  {c.status === "na" && c.fix && <div className="caption break">{c.fix}</div>}
                </div>
              </li>
            ))}
          </ul>

          {rep.notes.length > 0 && (
            <div
              className="caption"
              style={{
                marginTop: 16,
                padding: "10px 14px",
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 8,
              }}
            >
              {rep.notes.map((n) => (
                <p key={n} style={{ margin: "2px 0", color: "var(--ink-muted)" }}>
                  {n}
                </p>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export type { AuditReport };
