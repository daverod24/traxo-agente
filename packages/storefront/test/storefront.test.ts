import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildGutenbergPattern,
  buildHeadlessAstroPackage,
  buildUniversalFunnel,
  computePackLadder,
  contrast,
  defaultDesign,
  generatePacksLadderAstroComponent,
  generateStandaloneAstroLanding,
  generateStandaloneHtmlLanding,
  lintTheme,
  paletteProblems,
  previewHtml,
  STYLE_IDS,
  STYLES,
  StoreDesignSchema,
  zipFiles,
} from "../src/index.ts";

const products = [
  { title: "Café de Huila 500 g", price: 38000, imageUrl: "https://cdn.test/a.jpg" },
  { title: "Kit degustación", price: 89900 },
];

describe("diseño", () => {
  it("todos los estilos cumplen contraste AA (4,5:1)", () => {
    for (const id of STYLE_IDS) expect(paletteProblems(STYLES[id].palette), id).toEqual([]);
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("rechaza una paleta ilegible con un mensaje en español", () => {
    const d = defaultDesign({ brand: "Café", products });
    const bad = StoreDesignSchema.safeParse({
      ...d,
      palette: { ...d.palette, text: "#EEEEEE", bg: "#FFFFFF" },
    });
    expect(bad.success).toBe(false);
    expect(JSON.stringify(bad.error?.issues)).toContain("Poco contraste");
  });

  it("parte del catálogo real y no inventa reseñas ni cifras", () => {
    const d = defaultDesign({
      brand: "  Café   de Origen ",
      products,
      whatsapp: "+57 300 111 2233",
    });
    expect(d.brand).toBe("Café de Origen");
    expect(d.products[0]?.image).toBe("https://cdn.test/a.jpg");
    expect(d.products[1]?.image).toBeUndefined();
    expect(d.contact.whatsapp).toBe("573001112233");
    expect(JSON.stringify(d)).not.toMatch(/\d+ ?%|estrellas|★/);
  });

  it("sin contraentrega quita el banner y la pregunta de pago", () => {
    const d = defaultDesign({ brand: "X", cod: false });
    expect(d.sections).not.toContain("contraentrega");
    expect(d.copy.faq.some((f) => /pagar al recibir/i.test(f.q))).toBe(false);
  });
});

describe("Escalera de Packs (1x, 2x, 3x) y Motor Bimoneda", () => {
  it("computa correctamente 1x, 2x (10%) y 3x (20% + Envío Gratis) a tasa BCV", () => {
    const ladder = computePackLadder({
      productTitle: "Suero de Niacinamida",
      basePriceUsd: 20.0,
      bcvRate: 880.0,
      whatsappNumber: "+58 412 111 2233",
    });

    expect(ladder).toHaveLength(3);

    // 1x Unidad al PVP estándar
    const p1 = ladder[0];
    expect(p1.quantity).toBe(1);
    expect(p1.discountPct).toBe(0);
    expect(p1.freeShipping).toBe(false);
    expect(p1.totalPriceUsd).toBe(20.0);
    expect(p1.totalPriceVes).toBe(17600.0);
    expect(p1.savingsUsd).toBe(0);
    expect(p1.whatsappMessage).toContain("1x Unidad");

    // 2x Pack Dúo con 10% descuento
    const p2 = ladder[1];
    expect(p2.quantity).toBe(2);
    expect(p2.discountPct).toBe(10);
    expect(p2.freeShipping).toBe(false);
    expect(p2.totalPriceUsd).toBe(36.0); // 40 - 4
    expect(p2.totalPriceVes).toBe(31680.0);
    expect(p2.savingsUsd).toBe(4.0);
    expect(p2.savingsVes).toBe(3520.0);
    expect(p2.highlight).toBe(true);

    // 3x Pack Trío con 20% descuento y Envío Gratis
    const p3 = ladder[2];
    expect(p3.quantity).toBe(3);
    expect(p3.discountPct).toBe(20);
    expect(p3.freeShipping).toBe(true);
    expect(p3.totalPriceUsd).toBe(48.0); // 60 - 12
    expect(p3.totalPriceVes).toBe(42240.0);
    expect(p3.savingsUsd).toBe(12.0);
    expect(p3.savingsVes).toBe(10560.0);
    expect(p3.whatsappMessage).toContain("Envío Gratis COD");
  });

  it("genera el componente Astro de la Escalera de Packs con enlaces prellenados a WhatsApp", () => {
    const astroComp = generatePacksLadderAstroComponent({
      productTitle: "Aceite de Orégano Silvestre",
      basePriceUsd: 25.0,
      bcvRate: 900.0,
    });

    expect(astroComp).toContain("Escalera de Packs de Ahorro");
    expect(astroComp).toContain("Aceite de Orégano Silvestre");
    expect(astroComp).toContain("wa.me");
    expect(astroComp).toContain("900");
    expect(astroComp).toContain("Envío GRATIS nacional");
  });
});

describe("Generador de Landing Autónoma (Astro & HTML)", () => {
  it("genera un archivo HTML single-file completo, bimoneda, interactivo y con etiquetas analíticas", () => {
    const d = defaultDesign({
      brand: "Davebeauty",
      products: [{ title: "Aceite de Orégano", price: 25 }],
      whatsapp: "+58 412 999 8877",
    });

    const html = generateStandaloneHtmlLanding(d, {
      bcvRate: 880.0,
      ga4PropertyId: "G-TEST1234",
      clarityProjectId: "clarity5678",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Davebeauty");
    expect(html).toContain("Aceite de Orégano");
    expect(html).toContain("googletagmanager.com/gtag/js?id=G-TEST1234");
    expect(html).toContain("clarity5678");
    expect(html).toContain("application/ld+json");
    expect(html).toContain("wa-checkout-btn");
    expect(html).toContain("pack-selector");
  });

  it("genera un componente Astro single-file limpio para pauta", () => {
    const d = defaultDesign({
      brand: "Kaffelito",
      products: [{ title: "Café Boconó", price: 15 }],
    });

    const astro = generateStandaloneAstroLanding(d, { bcvRate: 880.0 });
    expect(astro).toContain("---");
    expect(astro).toContain("Kaffelito");
    expect(astro).toContain("Café Boconó");
    expect(astro).toContain("define:vars");
  });
});

describe("Funnels Desacoplados y Paquete Astro Headless", () => {
  it("construye un Funnel universal desacoplado listo para la API pública", () => {
    const d = defaultDesign({
      brand: "Davebeauty",
      style: "botanico",
      products: [{ title: "Serum C", price: 22 }],
    });

    const funnel = buildUniversalFunnel({
      id: "fnl_123",
      slug: "serum-c",
      productId: "prod_1",
      design: d,
      bcvRate: 880.0,
      published: true,
    });

    expect(funnel.id).toBe("fnl_123");
    expect(funnel.slug).toBe("serum-c");
    expect(funnel.published).toBe(true);
    expect(funnel.sections.some((s) => s.type === "packs_ladder")).toBe(true);
    expect(funnel.tokens.brand).toBe("Davebeauty");
    expect(funnel.packsLadder).toHaveLength(3);
  });

  it("genera el paquete completo para Astro Headless con PacksLadder y Gutenberg", () => {
    const d = defaultDesign({
      brand: "Davebeauty",
      style: "botanico",
      products: [{ title: "Serum", price: 20 }],
    });

    const pkg = buildHeadlessAstroPackage(d);
    expect(pkg["gutenberg-pattern.html"]).toBeDefined();
    expect(pkg["src/theme/tokens.json"]).toBeDefined();
    expect(pkg["src/pages/index.astro"]).toBeDefined();
    expect(pkg["src/pages/landing.astro"]).toBeDefined();
    expect(pkg["src/components/Hero.astro"]).toBeDefined();
    expect(pkg["src/components/PacksLadder.astro"]).toBeDefined();
    expect(pkg["src/components/TrustBadges.astro"]).toBeDefined();
    expect(pkg["standalone.html"]).toBeDefined();

    expect(lintTheme(pkg)).toEqual([]);
  });

  it("el zip empaqueta de forma determinista el paquete headless", () => {
    const d = defaultDesign({ brand: "Davebeauty", products });
    const pkg = buildHeadlessAstroPackage(d);
    const dir = mkdtempSync(join(tmpdir(), "traxo-zip-"));
    try {
      const zip = join(dir, "tema.zip");
      writeFileSync(zip, zipFiles(pkg));
      const list = execFileSync("unzip", ["-l", zip]).toString();
      expect(list).toContain("src/components/PacksLadder.astro");
      expect(list).toContain("standalone.html");
      const test = execFileSync("unzip", ["-t", zip]).toString();
      expect(test).toContain("No errors detected");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("la vista previa escapa el texto de la persona", () => {
    const d = defaultDesign({
      brand: "Tienda <script>alert(1)</script>",
      products: [{ title: '"><img src=x onerror=1>', price: 1000 }],
    });
    const html = previewHtml(d, { preview: true });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain('"><img src=x');
    expect(html).toContain("&lt;script&gt;");
  });
});
