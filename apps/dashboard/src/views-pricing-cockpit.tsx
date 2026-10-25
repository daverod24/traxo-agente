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

  // Tiers adaptados
  const baseCostPerUnit = selectedProduct.cost && selectedProduct.cost > 0 ? selectedProduct.cost : 6.00;
  const tiers: PackTier[] = useMemo(() => {
    const isOregano =
      selectedProduct.title.toLowerCase().includes("or\u00e9gano") ||
      selectedProduct.title.toLowerCase().includes("oregano") ||
      selectedProduct.externalId === "17";

    if (isOregano) {
      return DEFAULT_TIERS.map((t) => ({ ...t, baseCostUnit: baseCostPerUnit }));
    }

    const p1 = selectedProduct.price;
    const p2 = Math.round(p1 * 2 * 0.88 * 100) / 100;
    const p3 = Math.round(p1 * 3 * 0.81 * 100) / 100;

    return [
      {
        id: "pack1",
        name: "1 Unidad",
        units: 1,
        badge: "Individual",
        currentPrice: p1,
        scalePrice: Math.round(p1 * 1.13 * 100) / 100,
        baseCostUnit: baseCostPerUnit,
      },
      {
        id: "pack2",
        name: "Pack x2 (Dúo)",
        units: 2,
        badge: "Más Vendido",
        currentPrice: p2,
        scalePrice: Math.round(p2 * 1.15 * 100) / 100,
        baseCostUnit: baseCostPerUnit,
      },
      {
        id: "pack3",
        name: "Pack x3 (Trío)",
        units: 3,
        badge: "Envío Gratis",
        currentPrice: p3,
        scalePrice: Math.round(p3 * 1.14 * 100) / 100,
        baseCostUnit: baseCostPerUnit,
      },
    ];
  }, [selectedProduct, baseCostPerUnit]);

  const activeTier = useMemo(() => {
    return tiers.find((t) => t.id === activeTierId) ?? tiers[0]!;
  }, [tiers, activeTierId]);

  // Cálculos de Unit Economics
  const economics = useMemo(() => {
    const nominalPrice = pricingMode === "current" ? activeTier.currentPrice : activeTier.scalePrice;
    const discountAmount = applyCoupon ? Math.round(nominalPrice * 0.05 * 100) / 100 : 0.0;
    const netRevenue = nominalPrice - discountAmount;
    const totalCogs = activeTier.units * activeTier.baseCostUnit;

    const shippingOutCost = shippingDestination === "caracas" ? 3.50 : 6.70;
    const effectiveShippingCost = storeAbsorbsShipping ? shippingOutCost : 0.0;

    const returnFreight = 6.70;
    const codRiskProvision = Math.round(returnFreight * (codReturnRate / 100) * 100) / 100;

    const realGrossMarginUsd = Math.round((netRevenue - totalCogs - effectiveShippingCost - codRiskProvision) * 100) / 100;
    const realGrossMarginPct = Math.round((realGrossMarginUsd / netRevenue) * 100);

    const breakEvenCpa = Math.max(0, realGrossMarginUsd);
    const breakEvenRoas = realGrossMarginUsd > 0 ? Math.round((nominalPrice / realGrossMarginUsd) * 100) / 100 : 9.99;

    const suggestedDailyAdSpend = Math.max(5, Math.round(realGrossMarginUsd * 0.35 * 10) / 10);

    const dispatchedOrders = expectedOrdersPerDay * (1 - codCancellationRate / 100);
    const deliveredOrders = dispatchedOrders * (1 - codReturnRate / 100);
    const returnedOrders = dispatchedOrders * (codReturnRate / 100);

    const totalProductRevenue = deliveredOrders * netRevenue;
    const totalProductCogs = deliveredOrders * totalCogs;
    const totalShippingCost = dispatchedOrders * effectiveShippingCost;
    const totalReturnFreight = returnedOrders * returnFreight;
    const totalAdSpend = deliveredOrders * targetCpa;

    const dailyNetProfit = Math.round(
      (totalProductRevenue - totalProductCogs - totalShippingCost - totalReturnFreight - totalAdSpend) * 100
    ) / 100;
    const monthlyNetProfit = Math.round(dailyNetProfit * 30 * 100) / 100;
    const netProfitPerOrder = deliveredOrders > 0 ? Math.round((dailyNetProfit / deliveredOrders) * 100) / 100 : 0;

    return {
      nominalPrice,
      discountAmount,
      netRevenue,
      totalCogs,
      shippingOutCost,
      effectiveShippingCost,
      codRiskProvision,
      realGrossMarginUsd,
      realGrossMarginPct,
      breakEvenCpa,
      breakEvenRoas,
      suggestedDailyAdSpend,
      dailyNetProfit,
      monthlyNetProfit,
      netProfitPerOrder,
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
    <div className="stack" style={{ gap: 16 }}>
      {/* Barra de Contexto (Sin duplicar el título del Sheet) */}
      <div className="row between" style={{ alignItems: "center", paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "var(--r-xs)",
              background: "var(--agent-soft)",
              color: "var(--ink)",
              fontSize: "0.78rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Icon name="spark" size={13} />
            Unit Economics Dropshipping COD
          </span>
          <span className="caption" style={{ color: "var(--ink-muted)", fontSize: "0.8rem" }}>
            Fletes Venezuela · Devoluciones · Pauta Meta/TikTok
          </span>
        </div>
      </div>

      {/* Selector de Producto y Estrategia de Precios */}
      <div
        className="card"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          padding: 16,
          borderRadius: "var(--r-md)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            alignItems: "end",
          }}
        >
          <div>
            <label className="field" style={{ margin: 0 }}>
              <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--ink)" }}>Producto a Simular</span>
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
            <div className="caption" style={{ fontWeight: 600, marginBottom: 6, color: "var(--ink)" }}>
              Estrategia de Precios en Tienda
            </div>
            <div
              style={{
                display: "flex",
                background: "var(--surface-sunken)",
                padding: 3,
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--line)",
                gap: 4,
              }}
            >
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  borderRadius: "var(--r-xs)",
                  border: pricingMode === "current" ? "1px solid var(--line-strong)" : "none",
                  background: pricingMode === "current" ? "var(--surface)" : "transparent",
                  color: pricingMode === "current" ? "var(--ink)" : "var(--ink-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onClick={() => setPricingMode("current")}
              >
                Precio Actual ($22.99 / $39.99 / $54.99)
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  borderRadius: "var(--r-xs)",
                  border: pricingMode === "scale" ? "1px solid var(--line-strong)" : "none",
                  background: pricingMode === "scale" ? "var(--surface)" : "transparent",
                  color: pricingMode === "scale" ? "var(--brand)" : "var(--ink-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
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
        <div
          className="caption"
          style={{
            fontWeight: 700,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--ink-muted)",
            fontSize: "0.75rem",
          }}
        >
          1. Selecciona el Pack / Volumen de Compra
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
          {tiers.map((t) => {
            const isSelected = t.id === activeTierId;
            const price = pricingMode === "current" ? t.currentPrice : t.scalePrice;
            const cogs = t.units * baseCostPerUnit;
            const simpleMargin = Math.round(((price - cogs) / price) * 100);
            return (
              <div
                key={t.id}
                onClick={() => setActiveTierId(t.id)}
                style={{
                  border: isSelected ? "2px solid var(--brand)" : "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  padding: "14px 16px",
                  background: isSelected ? "var(--surface-selected)" : "var(--surface)",
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
                      background: isSelected ? "var(--brand)" : "var(--surface-sunken)",
                      color: isSelected ? "var(--on-brand)" : "var(--ink-muted)",
                      fontWeight: 700,
                    }}
                  >
                    {t.badge}
                  </span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--success)" }}>
                    {simpleMargin}% bruto base
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.98rem", color: "var(--ink)" }}>{t.name}</div>
                <div className="row between" style={{ alignItems: "baseline", marginTop: 2 }}>
                  <div style={{ fontSize: "1.35rem", fontWeight: 800, color: isSelected ? "var(--brand)" : "var(--ink)" }}>
                    {usd(price)}
                  </div>
                  <div className="caption" style={{ color: "var(--ink-muted)" }}>
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
          background: "var(--surface)",
          border: "1px solid var(--line)",
          padding: 16,
          borderRadius: "var(--r-md)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
        }}
      >
        {/* Fletes en Venezuela */}
        <div>
          <div className="caption" style={{ fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>
            2. Logística y Fletes en Venezuela
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className={`btn sm ${shippingDestination === "caracas" ? "solid" : "ghost"}`}
                style={{ flex: 1, fontSize: "0.82rem" }}
                onClick={() => setShippingDestination("caracas")}
              >
                Local Caracas ($3.50)
              </button>
              <button
                type="button"
                className={`btn sm ${shippingDestination === "nacional" ? "solid" : "ghost"}`}
                style={{ flex: 1, fontSize: "0.82rem" }}
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
              <span style={{ fontSize: "0.85rem", color: "var(--ink)" }}>
                <strong>Envío Gratis</strong> (Absorbido por la tienda)
              </span>
            </label>
            <span className="caption" style={{ color: "var(--ink-muted)" }}>
              {storeAbsorbsShipping
                ? `La tienda asume $${economics.shippingOutCost} USD de flete por pedido.`
                : "El cliente paga el flete al retirar (cobro en destino)."}
            </span>
          </div>
        </div>

        {/* Absorción de Riesgos COD */}
        <div>
          <div className="caption" style={{ fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>
            3. Absorción de Riesgos COD
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <div className="row between" style={{ fontSize: "0.85rem", color: "var(--ink)" }}>
              <span>Cancelaciones previas:</span>
              <strong>{codCancellationRate}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={codCancellationRate}
              style={{ accentColor: "var(--brand)", width: "100%" }}
              onChange={(e) => setCodCancellationRate(Number(e.target.value))}
            />
            <div className="row between" style={{ fontSize: "0.85rem", color: "var(--ink)" }}>
              <span>Devoluciones en puerta:</span>
              <strong>{codReturnRate}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={codReturnRate}
              style={{ accentColor: "var(--brand)", width: "100%" }}
              onChange={(e) => setCodReturnRate(Number(e.target.value))}
            />
            <span className="caption" style={{ color: "var(--ink-muted)" }}>
              Flete retorno: $6.70 · Provisión: <strong style={{ color: "var(--ink)" }}>${economics.codRiskProvision} USD/pedido</strong>
            </span>
          </div>
        </div>

        {/* Cupones de Descuento (5%) */}
        <div>
          <div className="caption" style={{ fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>
            4. Cupones de Conversión (5%)
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <label className="row" style={{ gap: 8, alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={applyCoupon}
                onChange={(e) => setApplyCoupon(e.target.checked)}
              />
              <span style={{ fontSize: "0.88rem", color: "var(--ink)" }}>
                Activar cupón de descuento (-5%)
              </span>
            </label>
            {applyCoupon && (
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className={`btn sm ${couponCode === "PRIMERACOMPRA5" ? "solid" : "ghost"}`}
                  style={{ flex: 1, fontSize: "0.78rem" }}
                  onClick={() => setCouponCode("PRIMERACOMPRA5")}
                >
                  PRIMERACOMPRA5
                </button>
                <button
                  type="button"
                  className={`btn sm ${couponCode === "BIENESTAR5" ? "solid" : "ghost"}`}
                  style={{ flex: 1, fontSize: "0.78rem" }}
                  onClick={() => setCouponCode("BIENESTAR5")}
                >
                  BIENESTAR5
                </button>
              </div>
            )}
            <span className="caption" style={{ color: "var(--ink-muted)" }}>
              {applyCoupon
                ? `Descuento aplicado: -$${economics.discountAmount} USD sobre el total.`
                : "Sin cupón aplicado al pedido."}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Dashboard Principal (Diseño Limpio, Anti-Desbordamiento y Alta Legibilidad) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
        }}
      >
        {/* Card 1: Margen Bruto Real */}
        <div
          className="card"
          style={{
            padding: "16px",
            borderRadius: "var(--r-md)",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div className="caption" style={{ color: "var(--ink-muted)", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Margen Bruto Real
          </div>
          <div className="row" style={{ alignItems: "baseline", gap: 6, margin: "4px 0" }}>
            <span style={{ fontSize: "1.55rem", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {economics.realGrossMarginPct}%
            </span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--brand)" }}>
              (${economics.realGrossMarginUsd})
            </span>
          </div>
          <span className="caption" style={{ color: "var(--ink-muted)", fontSize: "0.75rem" }}>
            ~ {vesFromUsd(economics.realGrossMarginUsd)} (BCV)
          </span>
          <div style={{ marginTop: 6 }}>
            <ToneBadge tone={marginTone}>
              {marginTone === "success" ? "🟢 Zona Verde (≥50%)" : marginTone === "attention" ? "🟡 Margen Ajustado" : "🔴 Crítico (<35%)"}
            </ToneBadge>
          </div>
        </div>

        {/* Card 2: Break-Even CPA */}
        <div
          className="card"
          style={{
            padding: "16px",
            borderRadius: "var(--r-md)",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div className="caption" style={{ color: "var(--ink-muted)", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Break-Even CPA (Meta / TikTok)
          </div>
          <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "var(--brand)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "4px 0" }}>
            {usd(economics.breakEvenCpa)}
          </div>
          <span className="caption" style={{ color: "var(--ink-muted)", fontSize: "0.75rem" }}>
            Tope de costo por venta antes de margen negativo
          </span>
        </div>

        {/* Card 3: Break-Even ROAS */}
        <div
          className="card"
          style={{
            padding: "16px",
            borderRadius: "var(--r-md)",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div className="caption" style={{ color: "var(--ink-muted)", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Break-Even ROAS Mínimo
          </div>
          <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1.1, margin: "4px 0" }}>
            {economics.breakEvenRoas}×
          </div>
          <span className="caption" style={{ color: "var(--ink-muted)", fontSize: "0.75rem" }}>
            Retorno mínimo sobre presupuesto en anuncios
          </span>
        </div>

        {/* Card 4: Presupuesto Diario Sugerido */}
        <div
          className="card"
          style={{
            padding: "16px",
            borderRadius: "var(--r-md)",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div className="caption" style={{ color: "var(--ink-muted)", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Presupuesto Diario Sugerido
          </div>
          <div className="row" style={{ alignItems: "baseline", gap: 6, margin: "4px 0" }}>
            <span style={{ fontSize: "1.55rem", fontWeight: 800, color: "var(--success)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              ${economics.suggestedDailyAdSpend}
            </span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink-muted)" }}>
              USD / día
            </span>
          </div>
          <span className="caption" style={{ color: "var(--ink-muted)", fontSize: "0.75rem" }}>
            ~ {vesFromUsd(economics.suggestedDailyAdSpend)} diarios (35% margen)
          </span>
        </div>
      </div>

      {/* Desglose de Unit Economics & Proyección de Ganancias */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* Tabla Cascada de Unit Economics */}
        <section className="card" style={{ padding: 16, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>
            Cascada de Unit Economics por Pedido
          </h3>
          <table style={{ width: "100%", fontSize: "0.88rem", borderCollapse: "collapse", color: "var(--ink)" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "8px 0", color: "var(--ink-muted)" }}>Precio de Venta Nominal</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>
                  {usd(economics.nominalPrice)}
                </td>
              </tr>
              {economics.discountAmount > 0 && (
                <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--critical)" }}>
                  <td style={{ padding: "8px 0" }}>Descuento Cupón ({couponCode} -5%)</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>
                    - {usd(economics.discountAmount)}
                  </td>
                </tr>
              )}
              <tr style={{ borderBottom: "1px solid var(--line)", fontWeight: 600 }}>
                <td style={{ padding: "8px 0", color: "var(--ink)" }}>Ingreso Neto Facturado</td>
                <td style={{ padding: "8px 0", textAlign: "right", color: "var(--brand)" }}>
                  {usd(economics.netRevenue)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--ink-muted)" }}>
                <td style={{ padding: "8px 0" }}>
                  Costo de Producto (COGS: {activeTier.units} × ${activeTier.baseCostUnit})
                </td>
                <td style={{ padding: "8px 0", textAlign: "right" }}>- {usd(economics.totalCogs)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--ink-muted)" }}>
                <td style={{ padding: "8px 0" }}>
                  Flete de Envío ({shippingDestination === "caracas" ? "Caracas" : "Nacional"}
                  {!storeAbsorbsShipping ? " - cobrado a cliente" : ""})
                </td>
                <td style={{ padding: "8px 0", textAlign: "right" }}>
                  {economics.effectiveShippingCost > 0 ? `- ${usd(economics.effectiveShippingCost)}` : "$ 0.00"}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--ink-muted)" }}>
                <td style={{ padding: "8px 0" }}>Provisión Riesgo Retorno COD ({codReturnRate}%)</td>
                <td style={{ padding: "8px 0", textAlign: "right" }}>- {usd(economics.codRiskProvision)}</td>
              </tr>
              <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 800, fontSize: "0.95rem" }}>
                <td style={{ padding: "10px 0", color: "var(--ink)" }}>Margen Bruto de Contribución</td>
                <td style={{ padding: "10px 0", textAlign: "right", color: marginTone === "success" ? "var(--success)" : "var(--attention)" }}>
                  {usd(economics.realGrossMarginUsd)} ({economics.realGrossMarginPct}%)
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Proyección de Utilidad con Pauta */}
        <section className="card" style={{ padding: 16, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 700, color: "var(--ink)" }}>
            Proyección de Utilidad Neta con Publicidad
          </h3>
          <div className="stack" style={{ gap: 12 }}>
            <div>
              <div className="row between" style={{ fontSize: "0.85rem", marginBottom: 4, color: "var(--ink)" }}>
                <span>CPA Objetivo de Pauta (Meta/TikTok):</span>
                <strong>{usd(targetCpa)}</strong>
              </div>
              <input
                type="range"
                min={2.00}
                max={Math.max(15, economics.breakEvenCpa)}
                step={0.50}
                value={targetCpa}
                style={{ accentColor: "var(--brand)", width: "100%" }}
                onChange={(e) => setTargetCpa(Number(e.target.value))}
              />
              <span className="caption" style={{ color: "var(--ink-muted)" }}>
                Ganancia neta limpia por pedido después de anuncios: <strong style={{ color: "var(--ink)" }}>${economics.netProfitPerOrder} USD</strong>
              </span>
            </div>

            <div>
              <div className="row between" style={{ fontSize: "0.85rem", marginBottom: 4, color: "var(--ink)" }}>
                <span>Volumen Diario Proyectado:</span>
                <strong>{expectedOrdersPerDay} pedidos/día</strong>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={expectedOrdersPerDay}
                style={{ accentColor: "var(--brand)", width: "100%" }}
                onChange={(e) => setExpectedOrdersPerDay(Number(e.target.value))}
              />
              <span className="caption" style={{ color: "var(--ink-muted)" }}>
                Efectivos despachados (-{codCancellationRate}% cancelados):{" "}
                <strong style={{ color: "var(--ink)" }}>{(expectedOrdersPerDay * (1 - codCancellationRate / 100)).toFixed(1)} pedidos/día</strong>
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
              <div style={{ background: "var(--surface-sunken)", border: "1px solid var(--line)", padding: 12, borderRadius: "var(--r-sm)" }}>
                <div className="caption" style={{ color: "var(--ink-muted)" }}>Utilidad Diaria Neta</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--success)", margin: "2px 0" }}>
                  {usd(economics.dailyNetProfit)}
                </div>
                <span className="caption" style={{ color: "var(--ink-muted)", fontSize: "0.75rem" }}>{vesFromUsd(economics.dailyNetProfit)}</span>
              </div>
              <div style={{ background: "var(--surface-sunken)", border: "1px solid var(--line)", padding: 12, borderRadius: "var(--r-sm)" }}>
                <div className="caption" style={{ color: "var(--ink-muted)" }}>Utilidad Mensual Neta</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--brand)", margin: "2px 0" }}>
                  {usd(economics.monthlyNetProfit)}
                </div>
                <span className="caption" style={{ color: "var(--ink-muted)", fontSize: "0.75rem" }}>{vesFromUsd(economics.monthlyNetProfit)}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recomendación Agéntica Automatizada */}
      <section
        className="card"
        style={{
          background: "var(--agent-soft)",
          border: "1px solid var(--agent-line)",
          padding: 16,
          borderRadius: "var(--r-md)",
        }}
      >
        <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 8 }}>
          <Icon name="spark" size={18} />
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--ink)" }}>
            Recomendaciones Agénticas de Rentabilidad (Traxo Intelligence)
          </h3>
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: "0.85rem", color: "var(--ink)" }}>
          {advisorTips.map((tip, idx) => (
            <li key={idx} style={{ lineHeight: 1.45 }}>
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
