import { useMemo, useState } from "react";
import { DEFAULT_BCV_RATE, plural, usd, vesFromUsd } from "./format.ts";
import type { Product } from "./types.ts";
import { Button, Icon, ToneBadge } from "./ui.tsx";
import type { Ctx } from "./views.tsx";

// Tiers canónicos para el Aceite de Orégano (DB-WELL-OREG-60) y productos de alta rotación
interface PackTier {
  id: "pack1" | "pack2" | "pack3";
  name: string;
  units: number;
  badge: string;
  currentPrice: number;
  scalePrice: number;
  baseCostUnit: number;
}

const DEFAULT_TIERS: PackTier[] = [
  {
    id: "pack1",
    name: "1 Unidad (60 softgels)",
    units: 1,
    badge: "Entrada / Prueba",
    currentPrice: 22.99,
    scalePrice: 26.00,
    baseCostUnit: 6.00,
  },
  {
    id: "pack2",
    name: "Pack x2 (120 softgels)",
    units: 2,
    badge: "Ahorro Familiar (+Vendido)",
    currentPrice: 39.99,
    scalePrice: 45.99,
    baseCostUnit: 6.00,
  },
  {
    id: "pack3",
    name: "Pack x3 (180 softgels)",
    units: 3,
    badge: "Tratamiento Completo",
    currentPrice: 54.99,
    scalePrice: 62.99,
    baseCostUnit: 6.00,
  },
];

export function PricingCockpit({
  ctx,
  products = [],
  initialProductId,
  onClose,
}: {
  ctx?: Ctx;
  products?: Product[];
  initialProductId?: string;
  onClose?: () => void;
}) {
  // 1. Selector de producto
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    if (initialProductId) return initialProductId;
    // Buscar Aceite de orégano preferentemente
    const oreg = products.find(
      (p) =>
        p.title.toLowerCase().includes("or\u00e9gano") ||
        p.title.toLowerCase().includes("oregano") ||
        (p.externalId && String(p.externalId) === "17"),
    );
    return oreg ? oreg.id : products[0]?.id ?? "prod_oregano_canonical";
  });

  const selectedProduct = useMemo(() => {
    return (
      products.find((p) => p.id === selectedProductId) ?? {
        id: "prod_oregano_canonical",
        title: "Aceite de orégano con semilla negra (60 softgels)",
        price: 22.99,
        cost: 6.00,
        externalId: "17",
        unitsSold: 0,
        revenue: 0,
        marginPct: 74,
      }
    );
  }, [products, selectedProductId]);

  // 2. Parámetros interactivos del simulador
  const [pricingMode, setPricingMode] = useState<"current" | "scale">("current");
  const [activeTierId, setActiveTierId] = useState<"pack1" | "pack2" | "pack3">("pack1");
  const [shippingDestination, setShippingDestination] = useState<"caracas" | "nacional">("nacional");
  const [storeAbsorbsShipping, setStoreAbsorbsShipping] = useState<boolean>(true);
  const [applyCoupon, setApplyCoupon] = useState<boolean>(false);
  const [couponCode, setCouponCode] = useState<"PRIMERACOMPRA5" | "BIENESTAR5">("PRIMERACOMPRA5");
  const [expectedOrdersPerDay, setExpectedOrdersPerDay] = useState<number>(10);
  const [targetCpa, setTargetCpa] = useState<number>(6.50);

  // Parámetros de riesgo COD (contraentrega)
  const [codCancellationRate, setCodCancellationRate] = useState<number>(8); // 8%
  const [codReturnRate, setCodReturnRate] = useState<number>(6); // 6%

  // Costo base por unidad
  const baseCostPerUnit = selectedProduct.cost && selectedProduct.cost > 0 ? selectedProduct.cost : 6.00;

  // Tier activo
  const activeTier: PackTier = useMemo(() => {
    const tier = DEFAULT_TIERS.find((t) => t.id === activeTierId) || DEFAULT_TIERS[0]!;
    return {
      ...tier,
      baseCostUnit: baseCostPerUnit,
    };
  }, [activeTierId, baseCostPerUnit]);

  // Cálculos de Unit Economics
  const economics = useMemo(() => {
    // Precio de venta nominal según switch
    const nominalPrice: number = pricingMode === "current" ? activeTier.currentPrice : activeTier.scalePrice;

    // Descuento por cupón (5%)
    const discountAmount: number = applyCoupon ? Number((nominalPrice * 0.05).toFixed(2)) : 0;
    const netRevenue: number = Number((nominalPrice - discountAmount).toFixed(2));

    // Costo del Producto (COGS)
    const totalCogs: number = Number((activeTier.units * activeTier.baseCostUnit).toFixed(2));

    // Flete de ida según destino
    const shippingOutCost = shippingDestination === "caracas" ? 3.50 : 6.70;
    const returnFreightCost = 6.70; // Retorno nacional por MRW / Zoom / Tealca

    // Flete asumido por la tienda
    const effectiveShippingCost = storeAbsorbsShipping ? shippingOutCost : 0;

    // Provisión de Riesgo COD (Devoluciones en puerta)
    // Tasa devolución (ej: 6%) * (flete ida + flete retorno)
    const codRiskProvision = Number(
      ((codReturnRate / 100) * (shippingOutCost + returnFreightCost)).toFixed(2),
    );

    // Costos Directos Totales
    const totalDirectCosts = Number(
      (totalCogs + effectiveShippingCost + codRiskProvision).toFixed(2),
    );

    // Margen Bruto Real en dólares
    const realGrossMarginUsd = Number((netRevenue - totalDirectCosts).toFixed(2));

    // Margen Bruto Real porcentual
    const realGrossMarginPct = netRevenue > 0
      ? Number(((realGrossMarginUsd / netRevenue) * 100).toFixed(1))
      : 0;

    // Break-Even CPA: Monto máximo para gastar en anuncios sin perder dinero
    const breakEvenCpa = Math.max(0, realGrossMarginUsd);

    // Break-Even ROAS: Ingreso Neto / Break-Even CPA
    const breakEvenRoas = breakEvenCpa > 0 ? Number((netRevenue / breakEvenCpa).toFixed(2)) : 0;

    // Presupuesto diario sugerido para testing / escalado inicial (35% del margen bruto x pedidos diarios)
    const suggestedDailyAdSpend = Number(
      Math.max(10, Math.min(50, realGrossMarginUsd * 0.35 * Math.max(1, expectedOrdersPerDay * 0.3))).toFixed(0),
    );

    // Utilidad Neta considerando el CPA objetivo
    const netProfitPerOrder = Number((realGrossMarginUsd - targetCpa).toFixed(2));
    const effectiveDailyOrders = expectedOrdersPerDay * (1 - codCancellationRate / 100);
    const dailyNetProfit = Number((effectiveDailyOrders * netProfitPerOrder).toFixed(2));
    const weeklyNetProfit = Number((dailyNetProfit * 7).toFixed(2));
    const monthlyNetProfit = Number((dailyNetProfit * 30).toFixed(2));
    const monthlyGrossRevenue = Number((effectiveDailyOrders * netRevenue * 30).toFixed(2));

    return {
      nominalPrice,
      discountAmount,
      netRevenue,
      totalCogs,
      shippingOutCost,
      effectiveShippingCost,
      codRiskProvision,
      totalDirectCosts,
      realGrossMarginUsd,
      realGrossMarginPct,
      breakEvenCpa,
      breakEvenRoas,
      suggestedDailyAdSpend,
      netProfitPerOrder,
      dailyNetProfit,
      weeklyNetProfit,
      monthlyNetProfit,
      monthlyGrossRevenue,
    };
  }, [
    pricingMode,
    activeTier,
    shippingDestination,
    storeAbsorbsShipping,
    applyCoupon,
    expectedOrdersPerDay,
    targetCpa,
    codCancellationRate,
    codReturnRate,
  ]);

  // Semáforo de Margen
  const marginTone = useMemo(() => {
    if (economics.realGrossMarginPct >= 50) return "success";
    if (economics.realGrossMarginPct >= 35) return "attention";
    return "critical";
  }, [economics.realGrossMarginPct]);

  // Consejos y Recomendación del Agente Autónomo
  const advisorTips = useMemo(() => {
    const tips: string[] = [];

    if (activeTier.id === "pack1" && storeAbsorbsShipping && shippingDestination === "nacional" && pricingMode === "current") {
      tips.push(
        "⚠️ En Pack 1 con flete nacional gratis ($6.70), el margen bruto se comprime al " +
          economics.realGrossMarginPct +
          "%. Recomendación: Cobrar el envío ($4-$6) en Pack 1 o activar el Precio Objetivo de Escala ($26.00).",
      );
    }

    if (activeTier.id === "pack2" || activeTier.id === "pack3") {
      tips.push(
        "🚀 En " +
          activeTier.name +
          ", el margen bruto supera el " +
          economics.realGrossMarginPct +
          "%. Aquí es ALTAMENTE RENTABLE ofrecer Envío Gratis a toda Venezuela para maximizar la tasa de conversión.",
      );
    }

    if (pricingMode === "scale") {
      tips.push(
        "📈 A Precio Objetivo de Escala ($" +
          economics.nominalPrice +
          "), tu Break-Even CPA sube a $" +
          economics.breakEvenCpa +
          " USD. Esto te da holgura para pujar agresivamente en Meta y TikTok Ads.",
      );
    }

    if (applyCoupon) {
      tips.push(
        "🎟️ Cupón " +
          couponCode +
          " activo (-5% = -$" +
          economics.discountAmount +
          "). Excelente palanca para carritos abandonados en WhatsApp sin erosionar el Unit Economics.",
      );
    }

    if (economics.breakEvenCpa >= 12) {
      tips.push(
        "✅ Break-Even CPA de $" +
          economics.breakEvenCpa +
          " USD permite operar campañas a escala con CPA objetivo de $" +
          targetCpa +
          " dejando $" +
          economics.netProfitPerOrder +
          " netos limpios por entrega.",
      );
    }

    return tips;
  }, [activeTier, storeAbsorbsShipping, shippingDestination, pricingMode, economics, applyCoupon, couponCode, targetCpa]);

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* Top Header con Selector y Cierre */}
      <div className="row between" style={{ alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
        <div>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "linear-gradient(135deg, #10b981, #059669)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Icon name="chart" size={18} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                Cockpit Financiero & Simulador de Unit Economics
              </h2>
              <span className="caption">
                Análisis de rentabilidad real para pauta publicitaria en Venezuela (Meta / TikTok Ads)
              </span>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {onClose && (
            <Button onClick={onClose}>
              Cerrar
            </Button>
          )}
        </div>
      </div>

      {/* Selector de Producto y Estrategia de Precios */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(37,99,235,0.03), rgba(16,185,129,0.05))",
          border: "1px solid rgba(16,185,129,0.25)",
          padding: 16,
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div>
            <label className="field" style={{ margin: 0 }}>
              <span style={{ fontWeight: 600 }}>Producto a Simular</span>
              <select
                className="input"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                {products.length > 0 ? (
                  products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (Costo base: ${p.cost ?? 6.00} | Venta: ${p.price})
                    </option>
                  ))
                ) : (
                  <option value="prod_oregano_canonical">
                    Aceite de orégano con semilla negra (Costo: $6.00 | Venta: $22.99)
                  </option>
                )}
              </select>
            </label>
          </div>

          <div>
            <div className="caption" style={{ fontWeight: 600, marginBottom: 6 }}>
              Estrategia de Precios en Tienda
            </div>
            <div style={{ display: "flex", background: "var(--card-bg, #fff)", padding: 4, borderRadius: 8, border: "1px solid var(--border)" }}>
              <button
                type="button"
                className={`btn sm ${pricingMode === "current" ? "solid" : "ghost"}`}
                style={{ flex: 1, fontSize: "0.82rem", fontWeight: 600 }}
                onClick={() => setPricingMode("current")}
              >
                Precio Actual ($22.99 / $39.99 / $54.99)
              </button>
              <button
                type="button"
                className={`btn sm ${pricingMode === "scale" ? "solid" : "ghost"}`}
                style={{ flex: 1, fontSize: "0.82rem", fontWeight: 600 }}
                onClick={() => setPricingMode("scale")}
              >
                Precio de Escala ($26.00 / $45.99 / $62.99)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Packs / Tiers */}
      <div>
        <div className="caption" style={{ fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          1. Selecciona el Pack / Volumen de Compra
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {DEFAULT_TIERS.map((t) => {
            const isSelected = t.id === activeTierId;
            const price = pricingMode === "current" ? t.currentPrice : t.scalePrice;
            const cogs = t.units * baseCostPerUnit;
            const simpleMargin = Math.round(((price - cogs) / price) * 100);
            return (
              <div
                key={t.id}
                onClick={() => setActiveTierId(t.id)}
                style={{
                  border: isSelected ? "2px solid var(--brand, #2563eb)" : "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  background: isSelected ? "rgba(37,99,235,0.04)" : "var(--card-bg, #fff)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div className="row between" style={{ alignItems: "center" }}>
                  <span
                    className="badge"
                    style={{
                      fontSize: "0.72rem",
                      background: isSelected ? "var(--brand, #2563eb)" : "rgba(100,116,139,0.1)",
                      color: isSelected ? "#fff" : "inherit",
                    }}
                  >
                    {t.badge}
                  </span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--success, #16a34a)" }}>
                    {simpleMargin}% bruto base
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{t.name}</div>
                <div className="row between" style={{ alignItems: "baseline" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--brand, #2563eb)" }}>
                    {usd(price)}
                  </div>
                  <div className="caption" style={{ color: "var(--muted)" }}>
                    COGS: {usd(cogs)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Variables de Fletes, Riesgos COD y Cupones */}
      <div
        className="card"
        style={{
          padding: 16,
          borderRadius: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {/* Fletes en Venezuela */}
        <div>
          <div className="caption" style={{ fontWeight: 700, marginBottom: 8 }}>
            2. Logística y Fletes en Venezuela
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className={`btn sm ${shippingDestination === "caracas" ? "solid" : "ghost"}`}
                style={{ flex: 1 }}
                onClick={() => setShippingDestination("caracas")}
              >
                Local Caracas ($3.50)
              </button>
              <button
                type="button"
                className={`btn sm ${shippingDestination === "nacional" ? "solid" : "ghost"}`}
                style={{ flex: 1 }}
                onClick={() => setShippingDestination("nacional")}
              >
                Nacional ($6.70)
              </button>
            </div>
            <label className="row" style={{ gap: 8, alignItems: "center", cursor: "pointer", marginTop: 4 }}>
              <input
                type="checkbox"
                checked={storeAbsorbsShipping}
                onChange={(e) => setStoreAbsorbsShipping(e.target.checked)}
              />
              <span style={{ fontSize: "0.85rem" }}>
                <strong>Envío Gratis</strong> (Absorbido por la tienda)
              </span>
            </label>
            <span className="caption">
              {storeAbsorbsShipping
                ? `La tienda asume $${economics.shippingOutCost} USD de flete por cada pedido.`
                : "El cliente paga el flete al recibir (cobro a destino)."}
            </span>
          </div>
        </div>

        {/* Absorción de Riesgos COD */}
        <div>
          <div className="caption" style={{ fontWeight: 700, marginBottom: 8 }}>
            3. Absorción de Riesgos COD (Contraentrega)
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <div className="row between" style={{ fontSize: "0.85rem" }}>
              <span>Cancelaciones previas:</span>
              <strong>{codCancellationRate}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={codCancellationRate}
              onChange={(e) => setCodCancellationRate(Number(e.target.value))}
            />
            <div className="row between" style={{ fontSize: "0.85rem" }}>
              <span>Devoluciones en puerta (rechazo):</span>
              <strong>{codReturnRate}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={codReturnRate}
              onChange={(e) => setCodReturnRate(Number(e.target.value))}
            />
            <span className="caption" style={{ color: "var(--muted)" }}>
              Flete retorno nacional: $6.70 · Provisión calculada: <strong>${economics.codRiskProvision} USD/pedido</strong>
            </span>
          </div>
        </div>

        {/* Cupones de Descuento (5%) */}
        <div>
          <div className="caption" style={{ fontWeight: 700, marginBottom: 8 }}>
            4. Cupones de Conversión (5%)
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <label className="row" style={{ gap: 8, alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={applyCoupon}
                onChange={(e) => setApplyCoupon(e.target.checked)}
              />
              <span style={{ fontSize: "0.88rem" }}>
                Activar cupón de descuento (-5%)
              </span>
            </label>
            {applyCoupon && (
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className={`btn sm ${couponCode === "PRIMERACOMPRA5" ? "solid" : "ghost"}`}
                  onClick={() => setCouponCode("PRIMERACOMPRA5")}
                >
                  PRIMERACOMPRA5
                </button>
                <button
                  type="button"
                  className={`btn sm ${couponCode === "BIENESTAR5" ? "solid" : "ghost"}`}
                  onClick={() => setCouponCode("BIENESTAR5")}
                >
                  BIENESTAR5
                </button>
              </div>
            )}
            <span className="caption">
              {applyCoupon
                ? `Descuento aplicado: -$${economics.discountAmount} USD sobre el total del pedido.`
                : "Sin cupón aplicado al pedido."}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Dashboard Principal (Tiempo Real) */}
      <div className="grid-kpi">
        {/* Margen Bruto Real */}
        <div
          className={`kpi-card hero ${marginTone === "success" ? "" : marginTone === "attention" ? "tone-attention" : "tone-critical"}`}
          style={{
            borderLeft: `5px solid ${marginTone === "success" ? "#10b981" : marginTone === "attention" ? "#f59e0b" : "#ef4444"}`,
          }}
        >
          <div className="caption">Margen Bruto Real (Neto de Flete y Riesgos)</div>
          <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
            <div className="num" style={{ fontSize: "2rem", fontWeight: 800 }}>
              {economics.realGrossMarginPct}%
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--brand, #2563eb)" }}>
              (${economics.realGrossMarginUsd} USD)
            </div>
          </div>
          <span className="caption">
            {vesFromUsd(economics.realGrossMarginUsd)} a tasa oficial BCV
          </span>
          <div style={{ marginTop: 6 }}>
            <ToneBadge tone={marginTone}>
              {marginTone === "success"
                ? "🟢 Excelente Rentabilidad (≥50%)"
                : marginTone === "attention"
                ? "🟡 Margen Aceptable (35-49%)"
                : "🔴 Margen Crítico (<35%)"}
            </ToneBadge>
          </div>
        </div>

        {/* Break-Even CPA */}
        <div className="kpi-card">
          <div className="caption">Break-Even CPA (Meta / TikTok Ads)</div>
          <div className="num" style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--brand, #2563eb)" }}>
            {usd(economics.breakEvenCpa)}
          </div>
          <span className="caption">
            CPA Máximo permisible por venta antes de perder dinero
          </span>
        </div>

        {/* Break-Even ROAS */}
        <div className="kpi-card">
          <div className="caption">Break-Even ROAS Mínimo</div>
          <div className="num" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
            {economics.breakEvenRoas}×
          </div>
          <span className="caption">
            Retorno mínimo de pauta publicitaria necesario
          </span>
        </div>

        {/* Presupuesto Diario Sugerido */}
        <div className="kpi-card">
          <div className="caption">Presupuesto Diario Sugerido</div>
          <div className="num" style={{ fontSize: "1.75rem", fontWeight: 700, color: "#10b981" }}>
            ${economics.suggestedDailyAdSpend} USD/día
          </div>
          <span className="caption">
            ~ {vesFromUsd(economics.suggestedDailyAdSpend)} diarios para testing
          </span>
        </div>
      </div>

      {/* Desglose de Unit Economics & Proyección de Ganancias */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* Tabla Cascada de Unit Economics */}
        <section className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "1.05rem", fontWeight: 700 }}>
            Cascada de Unit Economics por Pedido
          </h3>
          <table style={{ width: "100%", fontSize: "0.88rem", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--border-subtle, rgba(0,0,0,0.06))" }}>
                <td style={{ padding: "8px 0" }}>Precio de Venta Nominal</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>
                  {usd(economics.nominalPrice)}
                </td>
              </tr>
              {economics.discountAmount > 0 && (
                <tr style={{ borderBottom: "1px solid var(--border-subtle, rgba(0,0,0,0.06))", color: "#ef4444" }}>
                  <td style={{ padding: "8px 0" }}>Descuento Cupón ({couponCode} -5%)</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>
                    - {usd(economics.discountAmount)}
                  </td>
                </tr>
              )}
              <tr style={{ borderBottom: "1px solid var(--border-subtle, rgba(0,0,0,0.06))", fontWeight: 600 }}>
                <td style={{ padding: "8px 0" }}>Ingreso Neto Facturado</td>
                <td style={{ padding: "8px 0", textAlign: "right", color: "var(--brand, #2563eb)" }}>
                  {usd(economics.netRevenue)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-subtle, rgba(0,0,0,0.06))", color: "var(--muted)" }}>
                <td style={{ padding: "8px 0" }}>
                  Costo de Producto (COGS: {activeTier.units} × ${activeTier.baseCostUnit})
                </td>
                <td style={{ padding: "8px 0", textAlign: "right" }}>- {usd(economics.totalCogs)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-subtle, rgba(0,0,0,0.06))", color: "var(--muted)" }}>
                <td style={{ padding: "8px 0" }}>
                  Flete de Envío ({shippingDestination === "caracas" ? "Caracas" : "Nacional"}
                  {!storeAbsorbsShipping ? " - cobrado a cliente" : ""})
                </td>
                <td style={{ padding: "8px 0", textAlign: "right" }}>
                  {economics.effectiveShippingCost > 0 ? `- ${usd(economics.effectiveShippingCost)}` : "$ 0.00"}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--border-subtle, rgba(0,0,0,0.06))", color: "var(--muted)" }}>
                <td style={{ padding: "8px 0" }}>Provisión Riesgo Retorno COD ({codReturnRate}%)</td>
                <td style={{ padding: "8px 0", textAlign: "right" }}>- {usd(economics.codRiskProvision)}</td>
              </tr>
              <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 800, fontSize: "0.95rem" }}>
                <td style={{ padding: "10px 0" }}>Margen Bruto de Contribución</td>
                <td style={{ padding: "10px 0", textAlign: "right", color: marginTone === "success" ? "#10b981" : "#f59e0b" }}>
                  {usd(economics.realGrossMarginUsd)} ({economics.realGrossMarginPct}%)
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Proyección de Utilidad con Pauta */}
        <section className="card" style={{ padding: 16 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "1.05rem", fontWeight: 700 }}>
            Proyección de Utilidad Neta con Publicidad
          </h3>
          <div className="stack" style={{ gap: 12 }}>
            <div>
              <div className="row between" style={{ fontSize: "0.85rem", marginBottom: 4 }}>
                <span>CPA Objetivo de Pauta (Meta/TikTok):</span>
                <strong>{usd(targetCpa)}</strong>
              </div>
              <input
                type="range"
                min={2.00}
                max={Math.max(15, economics.breakEvenCpa)}
                step={0.50}
                value={targetCpa}
                onChange={(e) => setTargetCpa(Number(e.target.value))}
              />
              <span className="caption">
                Ganancia neta limpia por pedido después de anuncios: <strong>${economics.netProfitPerOrder} USD</strong>
              </span>
            </div>

            <div>
              <div className="row between" style={{ fontSize: "0.85rem", marginBottom: 4 }}>
                <span>Volumen Diario Proyectado:</span>
                <strong>{expectedOrdersPerDay} pedidos/día</strong>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={expectedOrdersPerDay}
                onChange={(e) => setExpectedOrdersPerDay(Number(e.target.value))}
              />
              <span className="caption">
                Efectivos despachados (-{codCancellationRate}% cancelados):{" "}
                <strong>{(expectedOrdersPerDay * (1 - codCancellationRate / 100)).toFixed(1)} pedidos/día</strong>
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
              <div style={{ background: "rgba(16,185,129,0.08)", padding: 10, borderRadius: 8 }}>
                <div className="caption">Utilidad Diaria Neta</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#10b981" }}>
                  {usd(economics.dailyNetProfit)}
                </div>
                <span className="caption">{vesFromUsd(economics.dailyNetProfit)}</span>
              </div>
              <div style={{ background: "rgba(37,99,235,0.08)", padding: 10, borderRadius: 8 }}>
                <div className="caption">Utilidad Mensual Neta</div>
                <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--brand, #2563eb)" }}>
                  {usd(economics.monthlyNetProfit)}
                </div>
                <span className="caption">{vesFromUsd(economics.monthlyNetProfit)}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recomendación Agéntica Automatizada */}
      <section
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(37,99,235,0.04), rgba(16,185,129,0.06))",
          border: "1px solid rgba(37,99,235,0.2)",
          padding: 16,
          borderRadius: 12,
        }}
      >
        <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 8 }}>
          <Icon name="spark" size={18} />
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
            Recomendaciones Agénticas de Rentabilidad (Traxo Intelligence)
          </h3>
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: "0.88rem" }}>
          {advisorTips.map((tip, idx) => (
            <li key={idx} style={{ lineHeight: 1.4 }}>
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
