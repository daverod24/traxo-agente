import { describe, expect, it } from "vitest";
import {
  assertPublicUrl,
  auditUrl,
  isPrivateAddress,
  sampleAudit,
  scoreChecks,
  UnsafeUrlError,
} from "../src/index.ts";

const GOOD = `<!doctype html><html lang="es-CO"><head><title>Café de especialidad colombiano | Café de Origen</title>
<meta name="description" content="Café de especialidad tostado en Bogotá. Envíos a toda Colombia y contraentrega en las principales ciudades del país.">
<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://t.co/">
<meta property="og:title" content="Café"><meta property="og:image" content="https://t.co/i.jpg"><link rel="icon" href="/f.ico">
<script type="application/ld+json">{"@type":"Product","offers":{"@type":"Offer"}}</script></head>
<body><h1>Café colombiano</h1><a href="https://wa.me/573001234567">WhatsApp</a><button>Agregar al carrito</button>
<p>Envío en 3 días, contraentrega disponible. Precio $ 38.000</p>
<img src="a.jpg" alt="Huila" width="10" height="10" loading="lazy"><img src="b.jpg" alt="Nariño" width="10" height="10" loading="lazy"><img src="c.jpg" alt="Sierra" width="10" height="10" loading="lazy"></body></html>`;
const BAD = "<html><head></head><body><h1>a</h1><h1>b</h1><img src='x.jpg'></body></html>";
const pub = async () => ["93.184.216.34"];

function fakeSite(html: string, extras: Record<string, number> = {}) {
  return (async (url: string) => {
    const path = new URL(url).pathname;
    if (path === "/") return new Response(html, { status: 200 });
    const status = extras[path] ?? 404;
    return new Response(path === "/sitemap.xml" && status === 200 ? "<urlset></urlset>" : "x", {
      status,
    });
  }) as unknown as typeof fetch;
}

describe("score", () => {
  it("excluye los N/A del total y dice sobre cuántos checks se calculó", () => {
    const r = scoreChecks([
      { id: "a", group: "g", title: "a", status: "pass", impact: "alto", evidence: "" },
      { id: "b", group: "g", title: "b", status: "fail", impact: "alto", evidence: "" },
      { id: "c", group: "g", title: "c", status: "na", impact: "alto", evidence: "" },
    ]);
    expect(r).toEqual({ score: 50, evaluated: 2, total: 3 });
    expect(
      scoreChecks([{ id: "n", group: "g", title: "n", status: "na", impact: "bajo", evidence: "" }])
        .score,
    ).toBeNull();
  });
  it("el informe de ejemplo está marcado como ejemplo y trae acciones priorizadas", () => {
    for (const k of ["seo", "diseno"] as const) {
      const r = sampleAudit(k);
      expect(r.source).toBe("sample");
      expect(r.score).toBeGreaterThan(40);
      expect(r.evaluated).toBeLessThan(r.total); // hay N/A honestos
      expect(r.quickWins.length).toBeGreaterThan(0);
    }
  });
});

describe("auditoría real sobre HTML", () => {
  it("una página bien hecha saca un score alto", async () => {
    const r = await auditUrl("seo", "https://tienda.co", {
      fetch: fakeSite(GOOD, { "/robots.txt": 200, "/sitemap.xml": 200 }),
      resolve: pub,
    });
    expect(r.source).toBe("live");
    expect(r.checks.find((c) => c.id === "schema")?.status).toBe("pass");
    expect(r.checks.find((c) => c.id === "cwv")?.status).toBe("na");
    expect(r.score).toBeGreaterThan(85);
  });
  it("una página pobre falla donde toca y prioriza lo importante", async () => {
    const r = await auditUrl("seo", "https://tienda.co", { fetch: fakeSite(BAD), resolve: pub });
    const by = Object.fromEntries(r.checks.map((c) => [c.id, c.status]));
    expect(by).toMatchObject({
      title: "fail",
      desc: "fail",
      h1: "warn",
      viewport: "fail",
      schema: "fail",
      alt: "fail",
    });
    expect(r.score).toBeLessThan(45);
    expect(r.quickWins[0]).toMatch(/Título|Meta|viewport|Schema|HTTPS/i);
  });
  it("la auditoría de diseño busca CTA, confianza, WhatsApp y precios en COP", async () => {
    const r = await auditUrl("diseno", "https://tienda.co", {
      fetch: fakeSite(GOOD),
      resolve: pub,
    });
    const by = Object.fromEntries(r.checks.map((c) => [c.id, c.status]));
    expect(by).toMatchObject({
      cta: "pass",
      trust: "pass",
      wa: "pass",
      cop: "pass",
      contrast: "na",
    });
    const bad = await auditUrl("diseno", "https://tienda.co", {
      fetch: fakeSite(BAD),
      resolve: pub,
    });
    expect(bad.checks.find((c) => c.id === "cta")?.status).toBe("fail");
  });
});

describe("protección SSRF", () => {
  it("rechaza direcciones internas, esquemas raros y dominios que resuelven a IP privada", async () => {
    for (const u of [
      "http://localhost:3000",
      "http://127.0.0.1",
      "http://169.254.169.254/latest",
      "http://10.0.0.5",
      "http://192.168.1.1",
      "ftp://x.co",
      "http://[::1]/",
      "http://intranet.internal",
    ]) {
      await expect(assertPublicUrl(u, pub), u).rejects.toBeInstanceOf(UnsafeUrlError);
    }
    await expect(
      assertPublicUrl("https://evil.co", async () => ["10.1.2.3"]),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertPublicUrl("https://ok.co", pub)).resolves.toBeInstanceOf(URL);
  });
  it("revalida cada redirección", async () => {
    const f = (async (url: string) =>
      url.startsWith("https://tienda.co")
        ? new Response(null, { status: 302, headers: { location: "http://169.254.169.254/x" } })
        : new Response("secreto")) as unknown as typeof fetch;
    await expect(
      auditUrl("seo", "https://tienda.co", { fetch: f, resolve: pub }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  it("clasifica rangos privados", () => {
    expect(
      ["10.0.0.1", "172.16.5.4", "172.32.0.1", "100.64.1.1", "8.8.8.8", "::1", "fd00::1"].map(
        isPrivateAddress,
      ),
    ).toEqual([true, true, false, true, false, true, true]);
  });
});

describe("auditoría con estándares venezolanos y visibilidad en IA (AEO)", () => {
  const GOOD_VE = `<!doctype html><html lang="es-VE"><head>
<title>Davebeauty | Cosmética coreana y bienestar en Venezuela</title>
<meta name="description" content="Tienda multimarca de belleza y skincare botánico en Venezuela. Envíos rápidos por Flash Courier y pagos por Pago Móvil o Zelle.">
<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://davebeauty.daverod.tech/">
<meta property="og:title" content="Davebeauty"><meta property="og:image" content="https://davebeauty.daverod.tech/og.jpg"><link rel="icon" href="/favicon.ico">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Davebeauty","url":"https://davebeauty.daverod.tech"}</script></head>
<body><h1>Cosmética y cuidado facial en Caracas</h1><a href="https://wa.me/584121234567">WhatsApp</a><button>Comprar ahora</button>
<p>Despacho directo con Flash Courier (Dropi) y MRW. Pagos por Pago Móvil o Zelle. Precio: $ 18.00 USD (Bs. 872,10 BCV).</p>
<img src="p1.jpg" alt="Suero Niacinamida" width="100" height="100" loading="lazy">
<img src="p2.jpg" alt="Crema Hidratante" width="100" height="100" loading="lazy">
<img src="p3.jpg" alt="Protector Solar" width="100" height="100" loading="lazy">
</body></html>`;

  const ROBOTS_VE = `User-agent: *\nAllow: /\nSitemap: https://davebeauty.daverod.tech/sitemap-index.xml\nLLMs-txt: https://davebeauty.daverod.tech/llms.txt`;

  function fakeVeSite() {
    return (async (url: string) => {
      const path = new URL(url).pathname;
      if (path === "/") return new Response(GOOD_VE, { status: 200 });
      if (path === "/robots.txt") return new Response(ROBOTS_VE, { status: 200 });
      if (path === "/sitemap.xml") return new Response("Not found", { status: 404 });
      if (path === "/sitemap-index.xml")
        return new Response("<sitemapindex><sitemap><loc>https://davebeauty.daverod.tech/sitemap-0.xml</loc></sitemap></sitemapindex>", {
          status: 200,
        });
      if (path === "/llms.txt") return new Response("# Davebeauty LLMs", { status: 200 });
      return new Response("Not found", { status: 404 });
    }) as unknown as typeof fetch;
  }

  it("reconoce Schema Organization/WebSite, resuelve sitemap-index y evalúa AEO", async () => {
    const r = await auditUrl("seo", "https://davebeauty.daverod.tech", {
      fetch: fakeVeSite(),
      resolve: pub,
    });
    expect(r.source).toBe("live");
    expect(r.score).toBeGreaterThan(90);

    const by = Object.fromEntries(r.checks.map((c) => [c.id, c.status]));
    expect(by.schema).toBe("pass");
    expect(by.sitemap).toBe("pass");
    expect(by.llms).toBe("pass");
    expect(by.ai_crawlers).toBe("pass");
    expect(by.lang).toBe("pass");
  });

  it("en diseño valida precios bimoneda USD/VES y transportadoras venezolanas", async () => {
    const r = await auditUrl("diseno", "https://davebeauty.daverod.tech", {
      fetch: fakeVeSite(),
      resolve: pub,
    });
    expect(r.source).toBe("live");
    expect(r.score).toBeGreaterThan(90);

    const by = Object.fromEntries(r.checks.map((c) => [c.id, c.status]));
    expect(by.cta).toBe("pass");
    expect(by.trust).toBe("pass");
    expect(by.cop).toBe("pass");
    const copCheck = r.checks.find((c) => c.id === "cop");
    expect(copCheck?.title).toContain("dólares o bimoneda");
    expect(copCheck?.evidence).toContain("USD / Bs. BCV");
  });

  it("evalúa AEO avanzado: BLUF, preguntas PAA, schema @graph con FAQPage y bloqueo de bots de IA", async () => {
    const ADVANCED_AEO_HTML = `<!doctype html><html lang="es-VE"><head>
<title>Davebeauty | K-Beauty y Cosmética en Venezuela</title>
<meta name="description" content="Tienda multimarca de belleza y skincare botánico en Caracas con despacho nacional por MRW y Zoom. Pagos en Pago Móvil y Zelle.">
<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://davebeauty.daverod.tech/">
<meta property="og:title" content="Davebeauty"><meta property="og:image" content="https://davebeauty.daverod.tech/og.jpg"><link rel="icon" href="/favicon.ico">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://davebeauty.daverod.tech/#organization",
      "name": "Davebeauty",
      "url": "https://davebeauty.daverod.tech",
      "sameAs": ["https://instagram.com/davebeauty"]
    },
    {
      "@type": "WebSite",
      "@id": "https://davebeauty.daverod.tech/#website",
      "name": "Davebeauty",
      "url": "https://davebeauty.daverod.tech"
    },
    {
      "@type": "FAQPage",
      "@id": "https://davebeauty.daverod.tech/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "¿Cómo comprar por WhatsApp?",
          "acceptedAnswer": { "@type": "Answer", "text": "Escribe a nuestro WhatsApp para asesoría y confirmación de stock." }
        }
      ]
    }
  ]
}
</script></head>
<body>
<h1>Belleza y bienestar para tu rutina</h1>
<a href="https://wa.me/584121234567">WhatsApp +58</a>
<h2>¿Cómo funciona la compra asistida?</h2>
<p><strong>Comprar en Davebeauty es directo:</strong> seleccionas tu producto, confirmas disponibilidad por WhatsApp y coordinamos tu despacho de inmediato.</p>
<h2>¿Qué métodos de pago aceptan en Venezuela?</h2>
<p>Aceptamos <strong>Pago Móvil</strong>, transferencias en <strong>bolívares a tasa oficial BCV</strong> y <strong>Zelle</strong> para pagos en divisas.</p>
<h2>¿Tienen envíos a nivel nacional?</h2>
<p>Despachamos a todo el país mediante <strong>MRW, Zoom y Tealca</strong>, con entregas en 24 a 48 horas hábiles.</p>
</body></html>`;

    const ROBOTS_BLOCKING = `User-agent: ClaudeBot\nDisallow: /\nUser-agent: GPTBot\nDisallow: /\nUser-agent: *\nAllow: /\nSitemap: https://davebeauty.daverod.tech/sitemap-index.xml`;

    const fSite = (async (url: string) => {
      const path = new URL(url).pathname;
      if (path === "/") return new Response(ADVANCED_AEO_HTML, { status: 200 });
      if (path === "/robots.txt") return new Response(ROBOTS_BLOCKING, { status: 200 });
      if (path === "/sitemap.xml") return new Response("Not found", { status: 404 });
      if (path === "/sitemap-index.xml") return new Response("<sitemapindex></sitemapindex>", { status: 200 });
      if (path === "/llms.txt") return new Response("# Davebeauty LLMs\nResumen del catálogo", { status: 200 });
      return new Response("Not found", { status: 404 });
    }) as unknown as typeof fetch;

    const r = await auditUrl("seo", "https://davebeauty.daverod.tech", { fetch: fSite, resolve: pub });
    const by = Object.fromEntries(r.checks.map((c) => [c.id, c.status]));

    expect(by.bluf).toBe("pass");
    expect(by.paa_questions).toBe("pass");
    expect(by.schema_graph).toBe("pass");
    expect(by.schema_org).toBe("pass");
    expect(by.schema_faq).toBe("pass");
    expect(by.trust_whatsapp).toBe("pass");
    expect(by.trust_payments).toBe("pass");
    expect(by.trust_shipping).toBe("pass");

    // Detecta bots bloqueados
    expect(by.ai_crawlers).toBe("warn");
    const aiCrawlerCheck = r.checks.find((c) => c.id === "ai_crawlers");
    expect(aiCrawlerCheck?.evidence).toContain("ClaudeBot");
    expect(aiCrawlerCheck?.evidence).toContain("GPTBot");
    expect(aiCrawlerCheck?.evidence).toContain("permite PerplexityBot");
  });
});
