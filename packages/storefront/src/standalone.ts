import { BASE_CSS } from "./css.ts";
import type { StoreDesign } from "./design.ts";
import { computePackLadder, DEFAULT_BCV_RATE } from "./pack-ladder.ts";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface StandaloneOptions {
  bcvRate?: number;
  ga4PropertyId?: string;
  clarityProjectId?: string;
  slug?: string;
  primaryProductIndex?: number;
}

/**
 * Genera un archivo HTML/CSS autónomo single-file listo para publicar o alojar en cualquier CDN/S3/Vercel.
 *
 * Características:
 * - Estilos modernos embebidos (CSS variables, paleta WCAG, tipografía responsiva).
 * - Escalera de packs interactiva (1x, 2x, 3x) con cálculo bimoneda en tiempo real.
 * - Checkout directo asistido por WhatsApp con mensaje pre-rellenado y tracking.
 * - Etiquetas analíticas embebidas (GA4 gtag + Microsoft Clarity + dataLayer).
 * - Schema.org JSON-LD @graph estructurado bimoneda.
 */
export function generateStandaloneHtmlLanding(
  d: StoreDesign,
  options: StandaloneOptions = {},
): string {
  const bcvRate = options.bcvRate ?? (Number(process.env.TRAXO_BCV_RATE) || DEFAULT_BCV_RATE);
  const prod = d.products[options.primaryProductIndex ?? 0] ?? {
    title: d.brand,
    price: 24.99,
  };
  const unitPriceUsd = prod.price > 1000 ? prod.price / 100 : prod.price; // Centavos a dólares si aplica
  const packs = computePackLadder({
    productTitle: prod.title,
    basePriceUsd: unitPriceUsd,
    bcvRate,
    whatsappNumber: d.contact.whatsapp,
  });

  const p = d.palette;
  const fontHeading = d.fonts.heading;
  const fontBody = d.fonts.body;
  const cleanWa = (d.contact.whatsapp ?? "584121234567").replace(/\D/g, "");

  // Analytics scripts
  const ga4Snippet = options.ga4PropertyId
    ? `
  <!-- Google tag (gtag.js) GA4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${options.ga4PropertyId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${options.ga4PropertyId}', { send_page_view: true });
  </script>`
    : "";

  const claritySnippet = options.clarityProjectId
    ? `
  <!-- Microsoft Clarity -->
  <script type="text/javascript">
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${options.clarityProjectId}");
  </script>`
    : "";

  const schemaJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: prod.title,
        description: d.copy.sub || d.tagline || prod.title,
        image: prod.image || undefined,
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: packs[0].totalPriceUsd.toFixed(2),
          highPrice: packs[2].totalPriceUsd.toFixed(2),
          offerCount: 3,
          priceSpecification: [
            {
              "@type": "UnitPriceSpecification",
              price: packs[0].totalPriceUsd.toFixed(2),
              priceCurrency: "USD",
              name: "1 Unidad (PVP Estándar)",
            },
            {
              "@type": "UnitPriceSpecification",
              price: packs[1].totalPriceUsd.toFixed(2),
              priceCurrency: "USD",
              name: "Pack Dúo 2x (10% Descuento)",
            },
            {
              "@type": "UnitPriceSpecification",
              price: packs[2].totalPriceUsd.toFixed(2),
              priceCurrency: "USD",
              name: "Pack Trío 3x (20% Descuento + Envío Gratis)",
            },
          ],
        },
      },
      {
        "@type": "Organization",
        name: d.brand,
        telephone: `+${cleanWa}`,
        currenciesAccepted: "USD, VES",
        paymentAccepted: "Cash, Pago Móvil, Zelle",
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="es-VE">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(d.brand)} — ${escapeHtml(prod.title)}</title>
  <meta name="description" content="${escapeHtml(d.tagline || d.copy.sub)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontHeading)}:wght@700;800&family=${encodeURIComponent(fontBody)}:wght@400;500;600;700&display=swap" rel="stylesheet" />
  ${ga4Snippet}
  ${claritySnippet}
  <script type="application/ld+json">
${JSON.stringify(schemaJsonLd, null, 2)}
  </script>
  <style>
    :root {
      --bg: ${p.bg};
      --surface: ${p.surface};
      --text: ${p.text};
      --muted: ${p.muted};
      --accent: ${p.accent};
      --accent-text: ${p.accentText};
      --font-heading: '${fontHeading}', sans-serif;
      --font-body: '${fontBody}', sans-serif;
      --bcv-rate: ${bcvRate};
    }
    ${BASE_CSS}

    /* Estilos específicos de Landing Autónoma */
    .landing-hero {
      padding: clamp(32px, 6vw, 72px) 16px;
      text-align: center;
      background: var(--bg);
    }
    .landing-container {
      max-width: 880px;
      margin: 0 auto;
    }
    .badge-hero {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 999px;
      margin-bottom: 16px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .landing-headline {
      font-family: var(--font-heading);
      font-size: clamp(2rem, 5vw, 3.2rem);
      font-weight: 800;
      line-height: 1.15;
      margin: 0 0 16px;
      color: var(--text);
    }
    .landing-sub {
      font-size: clamp(1rem, 2vw, 1.2rem);
      color: var(--muted);
      max-width: 600px;
      margin: 0 auto 28px;
      line-height: 1.5;
    }
    .product-showcase {
      margin: 24px auto 36px;
      max-width: 480px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.12);
      background: var(--surface);
      border: 1px solid var(--line);
    }
    .product-showcase img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
    }

    /* Escalera de Packs Interactiva */
    .packs-ladder {
      padding: 40px 16px;
      background: var(--surface);
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }
    .ladder-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-top: 24px;
    }
    .pack-option {
      position: relative;
      background: var(--bg);
      border: 2px solid var(--line);
      border-radius: 16px;
      padding: 24px 18px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .pack-option:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
    }
    .pack-option.active {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.03);
      box-shadow: 0 8px 24px -4px rgba(16, 185, 129, 0.15);
    }
    .pack-ribbon {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 3px 12px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .pack-ribbon.gold {
      background: #f59e0b;
    }
    .pack-name {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 4px;
      text-align: center;
    }
    .pack-desc {
      font-size: 0.8rem;
      color: var(--muted);
      text-align: center;
      margin: 0 0 14px;
    }
    .pack-price-row {
      text-align: center;
      margin-bottom: 8px;
    }
    .price-large {
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--text);
    }
    .price-bcv {
      font-size: 0.85rem;
      color: var(--muted);
      font-weight: 600;
    }
    .savings-badge {
      background: #ecfdf5;
      color: #047857;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      text-align: center;
      margin: 8px 0;
    }
    .pack-checklist {
      list-style: none;
      padding: 0;
      margin: 14px 0 0;
      font-size: 0.82rem;
      color: var(--muted);
    }
    .pack-checklist li {
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Checkout Bar Sticky */
    .checkout-cta-wrap {
      margin-top: 32px;
      text-align: center;
    }
    .wa-checkout-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      min-height: 54px;
      padding: 0 32px;
      border-radius: 999px;
      background: #25d366;
      color: #ffffff;
      font-size: 1.05rem;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 10px 20px -5px rgba(37, 211, 102, 0.4);
      transition: transform 0.16s ease, box-shadow 0.16s ease;
    }
    .wa-checkout-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 28px -5px rgba(37, 211, 102, 0.5);
    }
    .wa-checkout-btn:active {
      transform: scale(0.97);
    }
    .trust-guarantee-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      margin-top: 18px;
      font-size: 0.82rem;
      color: var(--muted);
    }
    .trust-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Beneficios de Entrega */
    .trust-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      padding: 48px 16px;
      max-width: 880px;
      margin: 0 auto;
    }
    .trust-box {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .trust-box h3 {
      font-size: 1rem;
      margin: 0 0 6px;
    }
    .trust-box p {
      font-size: 0.85rem;
      color: var(--muted);
      margin: 0;
    }
  </style>
</head>
<body>
  <main>
    <section class="landing-hero">
      <div class="landing-container">
        <span class="badge-hero">🌿 PAGO CONTRA ENTREGA EN VENEZUELA</span>
        <h1 class="landing-headline">${escapeHtml(prod.title)}</h1>
        <p class="landing-sub">${escapeHtml(d.copy.headline || d.tagline || d.copy.sub)}</p>

        ${
          prod.image
            ? `<div class="product-showcase">
          <img src="${escapeHtml(prod.image)}" alt="${escapeHtml(prod.title)}" loading="eager" />
        </div>`
            : ""
        }
      </div>
    </section>

    <!-- Sección de Escalera de Packs -->
    <section id="ofertas" class="packs-ladder">
      <div class="landing-container">
        <h2 style="text-align: center; font-size: clamp(1.5rem, 3.5vw, 2.2rem); margin: 0 0 8px;">
          Selecciona tu Pack de Ahorro
        </h2>
        <p style="text-align: center; color: var(--muted); font-size: 0.95rem; margin: 0 0 24px;">
          Pagas en efectivo en dólares o con Pago Móvil al recibir en tus manos.
        </p>

        <div class="ladder-grid" id="pack-selector">
          ${packs
            .map(
              (p, idx) => `
            <div
              class="pack-option ${p.highlight ? "active" : ""}"
              data-index="${idx}"
              data-wa-url="${escapeHtml(p.whatsappUrl || "")}"
              data-name="${escapeHtml(p.name)}"
              data-price="${p.totalPriceUsd.toFixed(2)}"
            >
              ${
                p.badge
                  ? `<div class="pack-ribbon ${p.quantity === 3 ? "gold" : ""}">${escapeHtml(p.badge)}</div>`
                  : ""
              }
              <h3 class="pack-name">${escapeHtml(p.name)}</h3>
              <p class="pack-desc">${escapeHtml(p.tagline)}</p>
              <div class="pack-price-row">
                <span class="price-large">$${p.totalPriceUsd.toFixed(2)}</span>
                <div class="price-bcv">≈ Bs. ${p.totalPriceVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })} BCV</div>
              </div>
              ${
                p.savingsUsd > 0
                  ? `<div class="savings-badge">Ahorras $${p.savingsUsd.toFixed(2)} USD (~Bs. ${p.savingsVes.toLocaleString("es-VE")})</div>`
                  : ""
              }
              <ul class="pack-checklist">
                <li><span>✓</span> ${p.quantity} Frasco(s)</li>
                <li><span>✓</span> ${p.freeShipping ? "Envío GRATIS nacional" : "Despacho por MRW / Zoom"}</li>
                <li><span>✓</span> Pago Contra Entrega COD</li>
              </ul>
            </div>
          `,
            )
            .join("")}
        </div>

        <div class="checkout-cta-wrap">
          <a
            id="main-checkout-btn"
            href="${escapeHtml(packs[1]?.whatsappUrl || packs[0]?.whatsappUrl || "")}"
            class="wa-checkout-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/>
            </svg>
            <span id="btn-text">Pedir ${escapeHtml(packs[1]?.name || packs[0]?.name)} por WhatsApp</span>
          </a>

          <div class="trust-guarantee-row">
            <span class="trust-item">🔒 Compra 100% Segura</span>
            <span class="trust-item">🚚 Pago Contra Entrega</span>
            <span class="trust-item">🇻🇪 Tasa Oficial BCV</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Beneficios de Confianza -->
    <section class="trust-grid">
      <div class="trust-box">
        <h3>💰 Pagos en Bolívares y Divisas</h3>
        <p>Pago Móvil a tasa BCV sin comisiones o efectivo al recibir.</p>
      </div>
      <div class="trust-box">
        <h3>⚡ Envíos Rápidos con Guía</h3>
        <p>Despacho directo desde almacén por MRW, Zoom o Flash Courier.</p>
      </div>
      <div class="trust-box">
        <h3>🛡️ Garantía de Reemplazo</h3>
        <p>Atención directa por WhatsApp ante cualquier novedad en tu entrega.</p>
      </div>
    </section>
  </main>

  <script>
    (function() {
      var options = document.querySelectorAll('.pack-option');
      var mainBtn = document.getElementById('main-checkout-btn');
      var btnText = document.getElementById('btn-text');

      options.forEach(function(opt) {
        opt.addEventListener('click', function() {
          options.forEach(function(o) { o.classList.remove('active'); });
          opt.classList.add('active');
          var url = opt.getAttribute('data-wa-url');
          var name = opt.getAttribute('data-name');
          var price = opt.getAttribute('data-price');
          if (mainBtn && url) {
            mainBtn.setAttribute('href', url);
          }
          if (btnText && name) {
            btnText.textContent = 'Pedir ' + name + ' ($' + price + ' USD)';
          }
        });
      });

      if (mainBtn) {
        mainBtn.addEventListener('click', function() {
          if (typeof gtag === 'function') {
            gtag('event', 'click_whatsapp_checkout', {
              event_category: 'ecommerce',
              event_label: btnText ? btnText.textContent : 'whatsapp_order'
            });
          }
          if (typeof clarity === 'function') {
            clarity('event', 'whatsapp_checkout_clicked');
          }
        });
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Genera el archivo componente `.astro` autónomo para proyectos Astro Headless.
 */
export function generateStandaloneAstroLanding(
  d: StoreDesign,
  options: StandaloneOptions = {},
): string {
  const bcvRate = options.bcvRate ?? (Number(process.env.TRAXO_BCV_RATE) || DEFAULT_BCV_RATE);
  const prod = d.products[options.primaryProductIndex ?? 0] ?? {
    title: d.brand,
    price: 24.99,
  };
  const unitPriceUsd = prod.price > 1000 ? prod.price / 100 : prod.price;
  const packs = computePackLadder({
    productTitle: prod.title,
    basePriceUsd: unitPriceUsd,
    bcvRate,
    whatsappNumber: d.contact.whatsapp,
  });

  return `---
// Landing autónoma generada automáticamente por TraxoAgente
// Producto: ${escapeHtml(prod.title)}
// Moneda: Bimoneda (USD + VES a tasa BCV ${bcvRate})

interface Props {
  productTitle?: string;
  bcvRate?: number;
}

const {
  productTitle = "${escapeHtml(prod.title)}",
  bcvRate = ${bcvRate},
} = Astro.props;

const packs = ${JSON.stringify(packs, null, 2)};
---

<!DOCTYPE html>
<html lang="es-VE">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(d.brand)} — {productTitle}</title>
  <style define:vars={{
    "color-bg": "${d.palette.bg}",
    "color-surface": "${d.palette.surface}",
    "color-text": "${d.palette.text}",
    "color-muted": "${d.palette.muted}",
    "color-accent": "${d.palette.accent}",
    "color-accent-text": "${d.palette.accentText}",
  }}>
    body {
      margin: 0;
      background: var(--color-bg);
      color: var(--color-text);
      font-family: system-ui, -apple-system, sans-serif;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    .hero {
      text-align: center;
      padding: 3rem 1rem;
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      background: rgba(16, 185, 129, 0.15);
      color: #059669;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }
    .headline {
      font-size: clamp(2rem, 5vw, 3rem);
      font-weight: 800;
      margin: 0 0 1rem;
    }
    .subheadline {
      font-size: 1.15rem;
      color: var(--color-muted);
      max-width: 580px;
      margin: 0 auto 2rem;
    }
    .ladder-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }
    .pack-card {
      background: var(--color-surface);
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 1rem;
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      text-align: center;
      position: relative;
    }
    .pack-card.popular {
      border: 2px solid #10b981;
    }
    .btn-wa {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      border-radius: 999px;
      background: #10b981;
      color: #ffffff;
      font-weight: 700;
      text-decoration: none;
      margin-top: auto;
    }
  </style>
</head>
<body>
  <main class="container">
    <div class="hero">
      <span class="badge">ENVÍOS CON PAGO CONTRA ENTREGA</span>
      <h1 class="headline">{productTitle}</h1>
      <p class="subheadline">${escapeHtml(d.tagline || d.copy.sub)}</p>
    </div>

    <div class="ladder-grid">
      {packs.map((p) => (
        <div class={\`pack-card \${p.highlight ? 'popular' : ''}\`}>
          <h3>{p.name}</h3>
          <p style="color: var(--color-muted); font-size: 0.85rem;">{p.tagline}</p>
          <div style="font-size: 2.2rem; font-weight: 800; margin: 1rem 0 0.25rem;">
            \${p.totalPriceUsd.toFixed(2)} USD
          </div>
          <div style="color: var(--color-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
            ≈ Bs. {p.totalPriceVes.toLocaleString('es-VE')} BCV
          </div>
          <a href={p.whatsappUrl} class="btn-wa" target="_blank" rel="noopener">
            Pedir {p.name}
          </a>
        </div>
      ))}
    </div>
  </main>
</body>
</html>
`;
}
