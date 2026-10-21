import type { StoreDesign } from "./design.ts";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Genera el patrón de bloques Gutenberg nativos de WordPress con `templateLock: "contentOnly"`.
 *
 * El bloqueo `contentOnly` garantiza que el operador en `wp-admin` pueda editar libremente los textos,
 * botones e imágenes, pero previene que rompa la estructura de columnas, los espacios o el diseño visual.
 */
export function buildGutenbergPattern(d: StoreDesign): string {
  const sections: string[] = [];

  for (const s of d.sections) {
    switch (s) {
      case "hero":
        sections.push(`<!-- wp:group {"templateLock":"contentOnly","metadata":{"name":"Hero - Portada"},"align":"full","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull">
  <!-- wp:heading {"level":1,"textAlign":"center"} -->
  <h1 class="wp-block-heading has-text-align-center">${escapeHtml(d.copy.headline)}</h1>
  <!-- /wp:heading -->
  <!-- wp:paragraph {"align":"center"} -->
  <p class="has-text-align-center">${escapeHtml(d.copy.sub)}</p>
  <!-- /wp:paragraph -->
  <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
  <div class="wp-block-buttons">
    <!-- wp:button {"style":{"color":{"background":"${d.palette.accent}","text":"${d.palette.accentText}"}}} -->
    <div class="wp-block-button"><a class="wp-block-button__link wp-element-button">${escapeHtml(d.copy.cta)}</a></div>
    <!-- /wp:button -->
  </div>
  <!-- /wp:buttons -->
</div>
<!-- /wp:group -->`);
        break;

      case "beneficios":
        sections.push(`<!-- wp:group {"templateLock":"contentOnly","metadata":{"name":"Beneficios y Confianza VE"},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:columns -->
  <div class="wp-block-columns">
    <!-- wp:column -->
    <div class="wp-block-column">
      <!-- wp:heading {"level":4} -->
      <h4 class="wp-block-heading">Pagos en Bolívares y Dólares</h4>
      <!-- /wp:heading -->
      <!-- wp:paragraph -->
      <p>Pago Móvil a tasa oficial BCV, Zelle y USDT sin comisiones ocultas.</p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->
    <!-- wp:column -->
    <div class="wp-block-column">
      <!-- wp:heading {"level":4} -->
      <h4 class="wp-block-heading">Envíos Flash Courier &amp; MRW</h4>
      <!-- /wp:heading -->
      <!-- wp:paragraph -->
      <p>Despacho directo desde almacén con número de guía inmediato nacional.</p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->
    <!-- wp:column -->
    <div class="wp-block-column">
      <!-- wp:heading {"level":4} -->
      <h4 class="wp-block-heading">Atención y Garantía</h4>
      <!-- /wp:heading -->
      <!-- wp:paragraph -->
      <p>Atención personalizada por WhatsApp y reemplazo garantizado en novedades.</p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->
  </div>
  <!-- /wp:columns -->
</div>
<!-- /wp:group -->`);
        break;

      case "productos":
        sections.push(`<!-- wp:group {"templateLock":"contentOnly","metadata":{"name":"Productos Destacados"},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:heading {"level":2,"textAlign":"center"} -->
  <h2 class="wp-block-heading has-text-align-center">Productos Destacados</h2>
  <!-- /wp:heading -->
  <!-- wp:columns -->
  <div class="wp-block-columns">
${d.products
  .slice(0, 4)
  .map(
    (p) => `    <!-- wp:column -->
    <div class="wp-block-column">
      ${p.image ? `<!-- wp:image --><figure class="wp-block-image"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}"/></figure><!-- /wp:image -->` : ""}
      <!-- wp:heading {"level":3} -->
      <h3 class="wp-block-heading">${escapeHtml(p.title)}</h3>
      <!-- /wp:heading -->
      <!-- wp:paragraph -->
      <p><strong>$ ${p.price.toFixed(2)} USD</strong> (Bs. ${(p.price * 48.45).toFixed(2)} BCV)</p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->`,
  )
  .join("\n")}
  </div>
  <!-- /wp:columns -->
</div>
<!-- /wp:group -->`);
        break;

      case "historia":
        sections.push(`<!-- wp:group {"templateLock":"contentOnly","metadata":{"name":"Historia de la Marca"},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:heading {"level":2} -->
  <h2 class="wp-block-heading">Nuestra Historia</h2>
  <!-- /wp:heading -->
  <!-- wp:paragraph -->
  <p>${escapeHtml(d.copy.story || "Pasión por la autenticidad, la calidad botánica y el servicio cercano.")}</p>
  <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->`);
        break;

      case "prueba-social":
        sections.push(`<!-- wp:group {"templateLock":"contentOnly","metadata":{"name":"Reseñas de Clientes"},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:heading {"level":2,"textAlign":"center"} -->
  <h2 class="wp-block-heading has-text-align-center">Lo que opinan nuestros clientes</h2>
  <!-- /wp:heading -->
  <!-- wp:columns -->
  <div class="wp-block-columns">
    <!-- wp:column -->
    <div class="wp-block-column">
      <!-- wp:paragraph -->
      <p>«Excelente atención, el pedido llegó súper rápido a Valencia y los productos son 100 % originales.»</p>
      <!-- /wp:paragraph -->
      <!-- wp:paragraph -->
      <p><strong>— Mariana R., Valencia</strong></p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->
    <!-- wp:column -->
    <div class="wp-block-column">
      <!-- wp:paragraph -->
      <p>«Pagué por Pago Móvil en segundos a tasa BCV y la guía de Flash Courier llegó al instante.»</p>
      <!-- /wp:paragraph -->
      <!-- wp:paragraph -->
      <p><strong>— Carlos M., Caracas</strong></p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->
  </div>
  <!-- /wp:columns -->
</div>
<!-- /wp:group -->`);
        break;

      case "contraentrega":
        sections.push(`<!-- wp:group {"templateLock":"contentOnly","metadata":{"name":"Banner Contraentrega"},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:heading {"level":3,"textAlign":"center"} -->
  <h3 class="wp-block-heading has-text-align-center">Paga al recibir en zonas con cobertura</h3>
  <!-- /wp:heading -->
  <!-- wp:paragraph {"align":"center"} -->
  <p class="has-text-align-center">Recibe tu paquete antes de pagar o aprovecha 5 % de descuento pagando por adelantado con Pago Móvil o Zelle.</p>
  <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->`);
        break;

      case "faq":
        sections.push(`<!-- wp:group {"templateLock":"contentOnly","metadata":{"name":"Preguntas Frecuentes"},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:heading {"level":2} -->
  <h2 class="wp-block-heading">Preguntas Frecuentes</h2>
  <!-- /wp:heading -->
  <!-- wp:heading {"level":4} -->
  <h4 class="wp-block-heading">¿Qué métodos de pago aceptan?</h4>
  <!-- /wp:heading -->
  <!-- wp:paragraph -->
  <p>Aceptamos Pago Móvil (Banesco/Mercantil) a tasa oficial BCV, Zelle, USDT Binance Pay y pagos en divisas efectivo según zona.</p>
  <!-- /wp:paragraph -->
  <!-- wp:heading {"level":4} -->
  <h4 class="wp-block-heading">¿Cuánto tarda el despacho?</h4>
  <!-- /wp:heading -->
  <!-- wp:paragraph -->
  <p>En Caracas entregamos en 24–48 h vía Flash Courier o mensajero directo; al resto del país en 2–4 días hábiles con Zoom o MRW.</p>
  <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->`);
        break;

      case "whatsapp":
        sections.push(`<!-- wp:group {"templateLock":"contentOnly","metadata":{"name":"WhatsApp Flotante"},"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
  <!-- wp:paragraph {"align":"center"} -->
  <p class="has-text-align-center">¿Dudas con tu pedido o necesitas asesoría? <a href="https://wa.me/${d.contact.whatsapp?.replace(/[^0-9]/g, "") || "584121234567"}">Escríbenos directamente por WhatsApp</a></p>
  <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->`);
        break;
    }
  }

  return sections.join("\n\n");
}

/**
 * Genera el paquete completo de Astro Headless + WordPress Gutenberg Block Patterns.
 */
export function buildHeadlessAstroPackage(d: StoreDesign): Record<string, string> {
  const gutenberg = buildGutenbergPattern(d);
  const tokens = JSON.stringify(
    {
      brand: d.brand,
      tagline: d.tagline,
      style: d.style,
      tone: d.tone,
      palette: d.palette,
      fonts: d.fonts,
      sections: d.sections,
      contact: d.contact,
      currency: "USD",
      secondaryCurrency: "VES",
      bcvRate: 48.45,
    },
    null,
    2,
  );

  const heroAstro = `---
interface Props {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
}
const {
  headline = "${escapeHtml(d.copy.headline)}",
  subheadline = "${escapeHtml(d.copy.sub)}",
  ctaText = "${escapeHtml(d.copy.cta)}"
} = Astro.props;
---
<section class="hero-section" style="background-color: var(--color-bg); color: var(--color-text);">
  <div class="container mx-auto px-4 py-16 text-center">
    <h1 class="text-4xl md:text-6xl font-bold mb-4 font-heading">{headline}</h1>
    <p class="text-lg md:text-xl text-muted mb-8 max-w-2xl mx-auto">{subheadline}</p>
    <a href="#catalogo" class="inline-block px-8 py-3 rounded-full font-medium shadow-md transition" style="background-color: var(--color-accent); color: var(--color-accent-text);">{ctaText}</a>
  </div>
</section>
`;

  const trustBadgesAstro = `---
---
<section class="trust-badges py-12" style="background-color: var(--color-surface);">
  <div class="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
    <div class="badge-card p-6 rounded-lg">
      <h3 class="text-xl font-bold mb-2">Pagos Bimoneda</h3>
      <p class="text-muted">Pago Móvil a tasa oficial BCV, Zelle y USDT sin enredos.</p>
    </div>
    <div class="badge-card p-6 rounded-lg">
      <h3 class="text-xl font-bold mb-2">Envíos Flash Courier & MRW</h3>
      <p class="text-muted">Despacho nacional inmediato con tracking activo.</p>
    </div>
    <div class="badge-card p-6 rounded-lg">
      <h3 class="text-xl font-bold mb-2">Compra Asistida WhatsApp</h3>
      <p class="text-muted">Atención directa con asesores de la marca.</p>
    </div>
  </div>
</section>
`;

  const indexAstro = `---
import Hero from "../components/Hero.astro";
import TrustBadges from "../components/TrustBadges.astro";
import tokens from "../theme/tokens.json";
---
<!DOCTYPE html>
<html lang="es-VE">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(d.brand)} - Catálogo Oficial</title>
    <meta name="description" content="${escapeHtml(d.tagline || d.copy.sub)}" />
    <style define:vars={{
      "color-bg": tokens.palette.bg,
      "color-surface": tokens.palette.surface,
      "color-text": tokens.palette.text,
      "color-muted": tokens.palette.muted,
      "color-accent": tokens.palette.accent,
      "color-accent-text": tokens.palette.accentText,
    }}>
      body {
        background-color: var(--color-bg);
        color: var(--color-text);
        font-family: system-ui, sans-serif;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <main>
      <Hero />
      <TrustBadges />
    </main>
  </body>
</html>
`;

  const readme = `# ${d.brand} — Plantilla Headless (Astro + WordPress Gutenberg)

Generado automáticamente por **Traxo Agente**.

## Contenido del Paquete

1. \`gutenberg-pattern.html\`:
   - Bloques nativos de WordPress formateados con \`templateLock: "contentOnly"\`.
   - Puedes copiar y pegar este contenido directamente en el editor Gutenberg de WordPress, o publicarlo con 1 clic desde Traxo.
   - En \`wp-admin\`, la estructura y columnas quedan bloqueadas; el operador puede modificar textos, imágenes y botones con total seguridad.

2. \`src/theme/tokens.json\`:
   - Design tokens desacoplados (paleta, tipografías, orden de secciones, tasa BCV y datos de contacto).

3. \`src/pages/index.astro\` y \`src/components/\`:
   - Componentes Astro listos para renderizar la tienda de forma ultrarrápida.

4. \`diseno.json\`:
   - Especificación completa del diseño para Traxo.
`;

  return {
    "gutenberg-pattern.html": gutenberg,
    "src/theme/tokens.json": tokens,
    "src/pages/index.astro": indexAstro,
    "src/components/Hero.astro": heroAstro,
    "src/components/TrustBadges.astro": trustBadgesAstro,
    "diseno.json": `${JSON.stringify(d, null, 2)}\n`,
    "LEEME.md": readme,
  };
}
