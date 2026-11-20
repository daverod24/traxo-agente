import { z } from "zod";

export const PackTierSchema = z.object({
  quantity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  badge: z.string().optional(),
  highlight: z.boolean().default(false),
  discountPct: z.number().min(0).max(100),
  freeShipping: z.boolean().default(false),
  unitPriceUsd: z.number(),
  totalPriceUsd: z.number(),
  totalPriceVes: z.number(),
  savingsUsd: z.number(),
  savingsVes: z.number(),
  whatsappMessage: z.string(),
  whatsappUrl: z.string().optional(),
});

export type PackTier = z.infer<typeof PackTierSchema>;

export interface PackLadderConfig {
  productTitle: string;
  basePriceUsd: number; // En dólares (ej. 24.99)
  bcvRate?: number; // En Bs./USD (ej. 880.0)
  whatsappNumber?: string;
  customDiscounts?: {
    duo?: number; // Porcentaje descuento pack dúo (default 10)
    trio?: number; // Porcentaje descuento pack trío (default 20)
  };
}

export const DEFAULT_BCV_RATE = 880.0;

function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Computa los 3 niveles canónicos de la Escalera de Packs (1x, 2x, 3x)
 * con cálculo bimoneda USD y VES a tasa oficial BCV.
 */
export function computePackLadder(config: PackLadderConfig): PackTier[] {
  const {
    productTitle,
    basePriceUsd,
    bcvRate = DEFAULT_BCV_RATE,
    whatsappNumber = "584121234567",
    customDiscounts,
  } = config;

  const cleanWa = whatsappNumber.replace(/\D/g, "") || "584121234567";
  const duoDisc = customDiscounts?.duo ?? 10;
  const trioDisc = customDiscounts?.trio ?? 20;

  // 1x: Unidad individual
  const p1Usd = round2(basePriceUsd);
  const p1Ves = round2(p1Usd * bcvRate);
  const waMsg1 = `¡Hola! Quiero ordenar *1x Unidad* de ${productTitle} por $${p1Usd.toFixed(2)} USD (~Bs. ${p1Ves.toLocaleString("es-VE", { minimumFractionDigits: 2 })} BCV) con Pago Contra Entrega COD.`;

  // 2x: Pack Dúo (10% de descuento)
  const fullDuoUsd = round2(basePriceUsd * 2);
  const duoDiscountAmount = round2(fullDuoUsd * (duoDisc / 100));
  const p2Usd = round2(fullDuoUsd - duoDiscountAmount);
  const p2Ves = round2(p2Usd * bcvRate);
  const savingsDuoVes = round2(duoDiscountAmount * bcvRate);
  const waMsg2 = `¡Hola! Quiero ordenar el *Pack Dúo (2x)* de ${productTitle} con ${duoDisc}% de descuento por $${p2Usd.toFixed(2)} USD (~Bs. ${p2Ves.toLocaleString("es-VE", { minimumFractionDigits: 2 })} BCV). Ahorro: $${duoDiscountAmount.toFixed(2)} USD.`;

  // 3x: Pack Trío (20% de descuento + Envío Gratis COD nacional)
  const fullTrioUsd = round2(basePriceUsd * 3);
  const trioDiscountAmount = round2(fullTrioUsd * (trioDisc / 100));
  const p3Usd = round2(fullTrioUsd - trioDiscountAmount);
  const p3Ves = round2(p3Usd * bcvRate);
  const savingsTrioVes = round2(trioDiscountAmount * bcvRate);
  const waMsg3 = `¡Hola! Quiero ordenar el *Pack Trío (3x)* de ${productTitle} con ${trioDisc}% de descuento y *Envío Gratis COD* por $${p3Usd.toFixed(2)} USD (~Bs. ${p3Ves.toLocaleString("es-VE", { minimumFractionDigits: 2 })} BCV). Ahorro: $${trioDiscountAmount.toFixed(2)} USD.`;

  const tier1: PackTier = {
    quantity: 1,
    id: "pack_1x",
    name: "1 Unidad",
    tagline: "Tratamiento Inicial (30 Días)",
    discountPct: 0,
    freeShipping: false,
    unitPriceUsd: p1Usd,
    totalPriceUsd: p1Usd,
    totalPriceVes: p1Ves,
    savingsUsd: 0,
    savingsVes: 0,
    whatsappMessage: waMsg1,
    whatsappUrl: `https://wa.me/${cleanWa}?text=${encodeURIComponent(waMsg1)}`,
    highlight: false,
  };

  const tier2: PackTier = {
    quantity: 2,
    id: "pack_2x",
    name: "Pack Dúo (2x)",
    tagline: "Tratamiento Recomendado (60 Días)",
    badge: `Ahorra ${duoDisc}% · Más Popular`,
    discountPct: duoDisc,
    freeShipping: false,
    unitPriceUsd: round2(p2Usd / 2),
    totalPriceUsd: p2Usd,
    totalPriceVes: p2Ves,
    savingsUsd: duoDiscountAmount,
    savingsVes: savingsDuoVes,
    whatsappMessage: waMsg2,
    whatsappUrl: `https://wa.me/${cleanWa}?text=${encodeURIComponent(waMsg2)}`,
    highlight: true,
  };

  const tier3: PackTier = {
    quantity: 3,
    id: "pack_3x",
    name: "Pack Trío (3x)",
    tagline: "Máximo Ahorro & Resultados (90 Días)",
    badge: `Ahorra ${trioDisc}% + Envío Gratis`,
    discountPct: trioDisc,
    freeShipping: true,
    unitPriceUsd: round2(p3Usd / 3),
    totalPriceUsd: p3Usd,
    totalPriceVes: p3Ves,
    savingsUsd: trioDiscountAmount,
    savingsVes: savingsTrioVes,
    whatsappMessage: waMsg3,
    whatsappUrl: `https://wa.me/${cleanWa}?text=${encodeURIComponent(waMsg3)}`,
    highlight: false,
  };

  return [tier1, tier2, tier3];
}

/**
 * Genera el código de componente `PacksLadder.astro` limpio, modular y reactivo.
 */
export function generatePacksLadderAstroComponent(config: PackLadderConfig): string {
  const packs = computePackLadder(config);
  const { productTitle, bcvRate = DEFAULT_BCV_RATE } = config;

  return `---
// PacksLadder.astro — Componente autónomo con Escalera de Packs 1x, 2x, 3x
// Precios bimoneda USD y Bs. a tasa BCV (${bcvRate} Bs./USD)

export interface Props {
  productTitle?: string;
  bcvRate?: number;
  whatsappNumber?: string;
}

const {
  productTitle = "${productTitle.replace(/"/g, '\\"')}",
  bcvRate = ${bcvRate},
  whatsappNumber = "${config.whatsappNumber ?? "584121234567"}",
} = Astro.props;

const packs = ${JSON.stringify(packs, null, 2)};
---

<section id="ofertas-packs" class="packs-ladder-section" aria-label="Escalera de Packs de Ahorro">
  <div class="packs-container">
    <div class="packs-header text-center">
      <span class="packs-pill">OFERTA ESPECIAL CON PAGO CONTRA ENTREGA</span>
      <h2 class="packs-title">Elige tu Pack de Ahorro para {productTitle}</h2>
      <p class="packs-subtitle">Paga al recibir en tu puerta con efectivo en dólares o Pago Móvil a tasa oficial BCV ({bcvRate} Bs./USD).</p>
    </div>

    <div class="packs-grid" role="radiogroup" aria-label="Selección de Packs">
      {packs.map((pack) => (
        <div
          class={\`pack-card \${pack.highlight ? 'pack-card-highlight' : ''}\`}
          data-pack-id={pack.id}
          data-pack-name={pack.name}
          data-pack-price-usd={pack.totalPriceUsd}
          data-pack-price-ves={pack.totalPriceVes}
          data-pack-savings-usd={pack.savingsUsd}
          data-pack-savings-ves={pack.savingsVes}
          data-wa-url={pack.whatsappUrl}
        >
          {pack.badge && (
            <div class="pack-badge">
              <span>{pack.badge}</span>
            </div>
          )}

          <div class="pack-card-header">
            <h3 class="pack-name">{pack.name}</h3>
            <p class="pack-tagline">{pack.tagline}</p>
          </div>

          <div class="pack-pricing">
            <div class="price-usd">
              <span class="currency">$</span>
              <span class="amount">{pack.totalPriceUsd.toFixed(2)}</span>
              <span class="unit">USD</span>
            </div>
            <div class="price-ves">
              <span>≈ Bs. {pack.totalPriceVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <small class="bcv-note">Tasa BCV</small>
            </div>
          </div>

          {pack.savingsUsd > 0 && (
            <div class="pack-savings-chip">
              🎉 Ahorras \${pack.savingsUsd.toFixed(2)} USD (~Bs. {pack.savingsVes.toLocaleString('es-VE')})
            </div>
          )}

          <ul class="pack-features">
            <li>
              <span class="check-icon">✓</span>
              {pack.quantity === 1 && 'Suministro para 30 días'}
              {pack.quantity === 2 && 'Suministro para 60 días (Tratamiento óptimo)'}
              {pack.quantity === 3 && 'Suministro para 90 días (Máxima efectividad)'}
            </li>
            <li>
              <span class="check-icon">✓</span>
              {pack.freeShipping ? 'Envío GRATIS nacional con tracking' : 'Despacho asegurado por Zoom / MRW'}
            </li>
            <li>
              <span class="check-icon">✓</span>
              Pago Contra Entrega en Caracas y ciudades principales
            </li>
          </ul>

          <a
            href={pack.whatsappUrl}
            class={\`pack-cta-btn \${pack.highlight ? 'btn-primary' : 'btn-secondary'}\`}
            target="_blank"
            rel="noopener noreferrer"
            data-wa-button
          >
            <span>Pedir {pack.name}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/>
            </svg>
          </a>
        </div>
      ))}
    </div>
  </div>
</section>

<style>
  .packs-ladder-section {
    padding: 4rem 1rem;
    background: var(--surface, #ffffff);
    color: var(--text, #111827);
  }
  .packs-container {
    max-width: 1100px;
    margin: 0 auto;
  }
  .text-center {
    text-align: center;
  }
  .packs-pill {
    display: inline-block;
    padding: 0.35rem 0.85rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    background: rgba(16, 185, 129, 0.12);
    color: #059669;
    border-radius: 999px;
    margin-bottom: 0.75rem;
  }
  .packs-title {
    font-size: clamp(1.6rem, 3.5vw, 2.4rem);
    font-weight: 800;
    margin-bottom: 0.75rem;
  }
  .packs-subtitle {
    font-size: 1rem;
    color: var(--muted, #4b5563);
    max-width: 620px;
    margin: 0 auto 2.5rem;
  }
  .packs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
    gap: 1.5rem;
    align-items: stretch;
  }
  .pack-card {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 2rem 1.5rem;
    border-radius: 1rem;
    background: var(--bg, #ffffff);
    border: 1px solid var(--line, #e5e7eb);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .pack-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.1);
  }
  .pack-card-highlight {
    border: 2px solid #10b981;
    background: rgba(16, 185, 129, 0.02);
  }
  .pack-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: #10b981;
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    white-space: nowrap;
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
  }
  .pack-card-header {
    margin-bottom: 1.25rem;
    text-align: center;
  }
  .pack-name {
    font-size: 1.35rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }
  .pack-tagline {
    font-size: 0.85rem;
    color: var(--muted, #6b7280);
    margin: 0;
  }
  .pack-pricing {
    text-align: center;
    margin-bottom: 1rem;
  }
  .price-usd {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.25rem;
  }
  .price-usd .currency {
    font-size: 1.5rem;
    font-weight: 700;
  }
  .price-usd .amount {
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1;
  }
  .price-usd .unit {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted, #6b7280);
  }
  .price-ves {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--muted, #4b5563);
    margin-top: 0.25rem;
  }
  .bcv-note {
    font-size: 0.75rem;
    background: #f3f4f6;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    margin-left: 0.25rem;
  }
  .pack-savings-chip {
    text-align: center;
    background: rgba(245, 158, 11, 0.12);
    color: #b45309;
    font-size: 0.82rem;
    font-weight: 700;
    padding: 0.4rem 0.75rem;
    border-radius: 0.5rem;
    margin-bottom: 1.25rem;
  }
  .pack-features {
    list-style: none;
    padding: 0;
    margin: 0 0 1.5rem;
    font-size: 0.88rem;
    color: var(--text, #374151);
  }
  .pack-features li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .check-icon {
    color: #10b981;
    font-weight: 800;
  }
  .pack-cta-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    min-height: 48px;
    padding: 0.75rem 1.25rem;
    border-radius: 999px;
    font-size: 0.95rem;
    font-weight: 700;
    text-decoration: none;
    margin-top: auto;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .pack-cta-btn:active {
    transform: scale(0.98);
  }
  .btn-primary {
    background: #10b981;
    color: #ffffff;
  }
  .btn-secondary {
    background: var(--surface-sunken, #f3f4f6);
    color: var(--text, #111827);
    border: 1px solid var(--line, #e5e7eb);
  }
</style>
`;
}
