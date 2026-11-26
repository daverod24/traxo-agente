import { useEffect, useRef, useState } from "react";
import { get, post, useResource } from "./api.ts";
import { EmptyState, OrderJourney, Pipeline, QuoteBars, Sheet } from "./components.tsx";
import { copShort, dateTimeVe, phoneEs, plural, timeEs, usd, vesFromUsd } from "./format.ts";
import type {
  Account,
  Approval,
  Campaign,
  Connection,
  Conversation,
  DemoOutcome,
  OrderRow,
  Product,
  State,
} from "./types.ts";
import {
  AgentActivityEntry,
  type AgentEv,
  Banner,
  Button,
  Icon,
  KpiCard,
  Money,
  PaymentBadge,
  ShipmentTimeline,
  StatusBadge,
  ToneBadge,
} from "./ui.tsx";

export type Ctx = {
  tick: number;
  events: AgentEv[];
  fresh: Set<string>;
  toast: (m: string) => void;
  go: (v: string) => void;
  tags: Map<string, string>;
  working: boolean;
  /** Vuelve a pedir lo que muestra el panel (después de cambiar algo). */
  refresh: () => void;
  account: Account;
  settings?: { confirmCod: "off" | "risky" | "all" };
  /** Arranca el recorrido guiado. */
  startTour: () => void;
};

const CITIES: Array<[string, string]> = [
  ["66001", "Pereira"],
  ["76001", "Cali"],
  ["05001", "Medellín"],
  ["11001", "Bogotá"],
  ["08001", "Barranquilla"],
  ["68001", "Bucaramanga"],
  ["13001", "Cartagena"],
];

const outcomeText = (r: DemoOutcome): string =>
  r.outcome.status === "shipped"
    ? `Pedido ${r.number}: guía ${r.outcome.trackingNumber} con ${r.outcome.carrier}`
    : r.outcome.status === "needs_address"
      ? `Pedido ${r.number}: necesito que confirmes la dirección`
      : r.outcome.status === "needs_approval"
        ? `Pedido ${r.number}: dejé la guía lista para tu aprobación`
        : `Pedido ${r.number}: ninguna transportadora llega ahí`;

/* ============================== DEMO GUIADA ============================== */
function DemoGuide({
  ctx,
  orders,
  openOrder,
}: {
  ctx: Ctx;
  orders: OrderRow[];
  openOrder: (id: string) => void;
}) {
  const [dane, setDane] = useState("66001");
  const [busy, setBusy] = useState<string>();
  const sim = orders.find(
    (o) => o.shipments[0]?.simulated && o.shipments[0]?.status !== "delivered",
  );
  const ship = sim?.shipments[0];
  const awaiting = orders.find((o) => o.status === "awaiting_confirmation");
  const confirmCod = ctx.settings?.confirmCod ?? "off";
  const has = (kind: string, text?: string) =>
    ctx.events.some((e) => e.kind === kind && (!text || e.summary.includes(text)));
  const statuses = new Set(orders.flatMap((o) => o.shipments.map((s) => s.status)));
  const [viewed, setViewed] = useState(false);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(undefined);
    }
  };
  const steps = [
    {
      k: "pedido",
      t: "Llega un pedido",
      d: "Contraentrega de $ 38.000, con el destino que elijas",
      done: orders.some((o) => o.shipments[0]?.simulated),
      label: "Simular pedido",
      run: () =>
        run("pedido", async () =>
          ctx.toast(
            outcomeText(await post<DemoOutcome>("/api/demo/order", { dane, scenario: "safe" })),
          ),
        ),
    },
    {
      k: "ver",
      t: "Mira cómo eligió",
      d: "Cotizó en 6 vías y explica su decisión",
      done: viewed,
      label: "Ver pedido",
      off: !sim,
      run: async () => {
        if (sim) {
          setViewed(true);
          openOrder(sim.id);
        }
      },
    },
    {
      k: "avanzar",
      t: "La guía avanza",
      d: "Hasta que sale a reparto, le avisa al cliente",
      done: ["out_for_delivery", "delivered"].some((s) => statuses.has(s)),
      label: "Avanzar guía",
      off: !ship || ship.status === "incident",
      run: () =>
        run("avanzar", async () => {
          if (!ship) return;
          await post("/api/demo/advance", { trackingNumber: ship.trackingNumber });
          ctx.toast("Avancé la guía un paso");
        }),
    },
    {
      k: "novedad",
      t: "Algo sale mal",
      d: "El cliente no estaba: el agente le escribe",
      done: has("incident.detected"),
      label: "Provocar novedad",
      off: !ship || ship.status === "incident" || ship.status === "delivered",
      run: () =>
        run("novedad", async () => {
          if (!ship) return;
          await post("/api/demo/advance", { trackingNumber: ship.trackingNumber, incident: true });
          ctx.toast("Provoqué una novedad: ya le escribí al cliente");
        }),
    },
    {
      k: "responder",
      t: "El cliente responde",
      d: "«Sí, mañana estoy» → reprograma solo",
      done: has("incident.resolved"),
      label: "Responder como cliente",
      off: !sim || ship?.status !== "incident",
      run: () =>
        run("responder", async () => {
          if (!sim) return;
          await post("/api/demo/reply", { phone: sim.address.phone, text: "Sí, mañana estoy" });
          ctx.toast("Atendí la respuesta del cliente");
        }),
    },
    {
      k: "riesgo",
      t: "Contraentrega de riesgo",
      d: "Cliente nuevo y $ 294.000 por cobrar: antes de la guía, confirma",
      done: has("confirmation.requested"),
      label: "Simular pedido riesgoso",
      run: () =>
        run("riesgo", async () => {
          if (confirmCod === "off") await post("/api/settings", { confirmCod: "risky" });
          const r = await post<DemoOutcome>("/api/demo/order", { dane, scenario: "risky" });
          ctx.toast(outcomeText(r));
          ctx.refresh();
        }),
    },
    {
      k: "confirmar",
      t: "El cliente confirma",
      d: "«Confirmo» → recién ahí genero la guía",
      done: has("confirmation.received"),
      label: "Responder «Confirmo»",
      off: !awaiting,
      run: () =>
        run("confirmar", async () => {
          if (!awaiting) return;
          await post("/api/demo/reply", { phone: awaiting.address.phone, text: "Confirmo" });
          ctx.toast("El cliente confirmó: genero la guía");
        }),
    },
    {
      k: "dir",
      t: "Dirección incompleta",
      d: "No cotiza: te pide confirmarla",
      done: has("approval.requested", "dirección"),
      label: "Probar",
      run: () =>
        run("dir", async () => {
          await post("/api/demo/order", { dane, badAddress: true });
          ctx.go("aprobaciones");
        }),
    },
  ];
  const next = steps.findIndex((s) => !s.done);
  return (
    <section className="card" aria-labelledby="guide-h" style={{ gridArea: "guide" }}>
      <div className="row between" style={{ marginBottom: 4 }}>
        <h2 id="guide-h">Recorrido de la demo</h2>
        <span className="caption num">
          {steps.filter((s) => s.done).length}/{steps.length}
        </span>
      </div>
      <p className="muted" style={{ margin: "0 0 12px" }}>
        Sigue los pasos y mira al agente trabajar. Todo es simulado.
      </p>
      <label className="row" style={{ marginBottom: 12 }}>
        <span className="label">Destino</span>
        <select
          className="input"
          value={dane}
          onChange={(e) => setDane(e.target.value)}
          aria-label="Destino del pedido de ejemplo"
        >
          {CITIES.map(([d, c]) => (
            <option key={d} value={d}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <ol className="guide" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {steps.map((s, i) => (
          <li key={s.k} className={`gstep ${s.done ? "done" : i === next ? "next" : ""}`}>
            <span className="no" aria-hidden="true">
              {s.done ? <Icon name="check" size={16} /> : i + 1}
            </span>
            <div>
              <strong>{s.t}</strong>
              <span className="d">{s.d}</span>
            </div>
            <Button
              sm
              data-tour={`guide-${s.k}`}
              variant={i === next ? "agent" : ""}
              onClick={s.run}
              disabled={Boolean(s.off) || busy !== undefined}
              icon={i === next ? "play" : undefined}
            >
              {busy === s.k ? "Procesando…" : s.label}
            </Button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ============================== INICIO ============================== */
export const CANONICAL_PRODUCT_IMAGES: Record<string, string> = {
  "17": "https://davebeauty.daverod.tech/images/products/aceite-de-oregano-semilla-negra/premium-v1.webp",
  "21": "https://davebeauty.daverod.tech/images/products/dr-melaxin-calcium-volume-multi-balm/premium-v1.webp",
  "13": "https://cdn.rimanbuild.com/Botalab/EX/DeserticolaShampoo/TL_DeserticolaShampoo_DFLT.png",
  "9": "https://cdn.rimanbuild.com/Incellderm/EX/DailyAquaBB/TL_DailyAquaBB_DFLT.png",
  "50": "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/167/17783019261000614740.webp",
  "45": "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/93/17698802731000454694.webp",
  "55": "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/196/17827922041000704956.jpg",
  "59": "https://davebeauty.daverod.tech/images/products/aceite-magico-reafirmante/luxury-v1-1200.webp",
};

export function getProductImage(p: {
  id?: string;
  externalId?: string | null;
  title: string;
  imageUrl?: string | null;
}): string | undefined {
  if (p.imageUrl && p.imageUrl.startsWith("http")) return p.imageUrl;
  if (p.externalId && CANONICAL_PRODUCT_IMAGES[p.externalId])
    return CANONICAL_PRODUCT_IMAGES[p.externalId];
  const t = p.title.toLowerCase();
  if (t.includes("orégano") || t.includes("oregano"))
    return "https://davebeauty.daverod.tech/images/products/aceite-de-oregano-semilla-negra/premium-v1.webp";
  if (t.includes("melaxin"))
    return "https://davebeauty.daverod.tech/images/products/dr-melaxin-calcium-volume-multi-balm/premium-v1.webp";
  if (t.includes("botalab") || t.includes("deserticola"))
    return "https://cdn.rimanbuild.com/Botalab/EX/DeserticolaShampoo/TL_DeserticolaShampoo_DFLT.png";
  if (t.includes("incellderm") || t.includes("aqua"))
    return "https://cdn.rimanbuild.com/Incellderm/EX/DailyAquaBB/TL_DailyAquaBB_DFLT.png";
  if (t.includes("medicube"))
    return "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/93/17698802731000454694.webp";
  if (
    t.includes("reafirmante") ||
    t.includes("lifting") ||
    t.includes("mágico") ||
    t.includes("magic")
  )
    return "https://davebeauty.daverod.tech/images/products/aceite-magico-reafirmante/luxury-v1-1200.webp";
  if (t.includes("nicotinamide") || t.includes("resveratrol") || t.includes("nad"))
    return "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/196/17827922041000704956.jpg";
  return undefined;
}

const orderTotal = (o: OrderRow): number => o.totalExact ?? o.total;

const orderBcvRate = (o: OrderRow): number | undefined => {
  const n = Number(o.meta?._bcv_rate);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const orderCedula = (o: OrderRow): string =>
  (
    o.address.cedula ||
    (o.meta?._cedula as string | undefined) ||
    (o.meta?._billing_full_identification as string | undefined) ||
    ""
  ).trim();

const orderOriginLabel = (o: OrderRow): string => {
  const raw = String(o.origin || o.meta?._origin || "").trim();
  const low = raw.toLowerCase();
  if (!raw || low === "woocommerce") return "WooCommerce";
  if (low.includes("storefront") || low.includes("astro")) return "Storefront";
  return raw;
};

const orderProductSummary = (o: OrderRow): string => {
  if (!o.lines?.length) return "Sin productos";
  const first = o.lines[0]!;
  const pack = o.meta?._pack_label ? ` (${String(o.meta._pack_label)})` : "";
  const extra = o.lines.length > 1 ? ` +${o.lines.length - 1}` : "";
  return `${first.quantity}× ${first.title}${pack}${extra}`;
};

const orderZoneInfo = (o: OrderRow): string => {
  const zone = (o.address.zone || (o.meta?._customer_zone as string | undefined) || "").trim();
  const city = ((o.meta?._dropi_city as string | undefined) || o.address.city || "").trim();
  const dept = (
    (o.meta?._dropi_department as string | undefined) ||
    o.address.department ||
    ""
  ).trim();
  const cityDept = [city, dept].filter(Boolean).join(", ");
  if (zone && city && zone.toLowerCase() !== city.toLowerCase()) {
    return `${zone} → ${cityDept}`;
  }
  return cityDept || zone || "—";
};

const whatsappHref = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "#";
};

export function Inicio({
  ctx,
  orders,
  state,
  openOrder,
  imported,
}: {
  ctx: Ctx;
  orders: OrderRow[];
  state: State;
  openOrder: (id: string) => void;
  imported: boolean;
}) {
  const k = state.kpis;
  const products = useResource<Product[]>("/api/products", ctx.tick).data ?? [];
  const demo = Boolean(state.demo);

  const visibleOrders = demo ? orders : orders.filter((o) => !o.isTest);
  const activeOrders = visibleOrders.filter((o) => !["cancelled", "rejected"].includes(o.status));
  const cancelledOrders = visibleOrders.filter((o) => ["cancelled", "rejected"].includes(o.status));
  const porConfirmarOrders = visibleOrders.filter((o) =>
    ["pending", "received", "on_hold", "on-hold"].includes(o.status),
  );
  const codPendientes = visibleOrders.filter(
    (o) => o.payment === "cod" && !["delivered", "cancelled", "rejected"].includes(o.status),
  );

  const totalGmv = activeOrders.reduce((s, o) => s + orderTotal(o), 0);
  const porCobrar = codPendientes.reduce((s, o) => s + orderTotal(o), 0);
  const cancelledAmount = cancelledOrders.reduce((s, o) => s + orderTotal(o), 0);
  const enCaminoCount =
    k.inTransit || visibleOrders.filter((o) => ["shipped", "in_transit"].includes(o.status)).length;
  const entregadosCount =
    k.delivered || visibleOrders.filter((o) => o.status === "delivered").length;

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Panel de Control de Operaciones</h1>
          <p className="lead">
            {activeOrders.length} {plural(activeOrders.length, "pedido activo", "pedidos activos")}{" "}
            por {usd(totalGmv)}
            {porConfirmarOrders.length > 0
              ? ` · ${porConfirmarOrders.length} por confirmar COD`
              : " · Todo confirmado"}
            {enCaminoCount > 0 ? ` · ${enCaminoCount} en camino` : ""}
            {cancelledOrders.length > 0
              ? ` · ${cancelledOrders.length} cancelados ($${cancelledAmount.toFixed(2)})`
              : ""}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button
            variant="agent"
            icon="refresh"
            onClick={async () => {
              try {
                await post("/api/store/import");
                ctx.refresh();
                ctx.toast("Tienda sincronizada con WooCommerce HPOS");
              } catch (e) {
                ctx.toast("Error al sincronizar");
              }
            }}
          >
            Sincronizar tienda
          </Button>
        </div>
      </div>

      {demo && (
        <Banner tone="neutral">
          Estás en la <strong>demo</strong>: la tienda y los envíos son simulados. Ninguna guía
          mueve un paquete ni sale un WhatsApp real.
        </Banner>
      )}

      {!imported && (
        <section className="proposal" aria-labelledby="first-h">
          <div className="row" style={{ gap: 8 }}>
            <Icon name="spark" size={18} />
            <h2 id="first-h">Empieza aquí: conecta tu tienda</h2>
          </div>
          <p style={{ margin: 0 }}>
            Importo tu catálogo, tus clientes y tu historial de pedidos. Con eso ya sé qué vendes, a
            quién y cuánto te deja cada producto.
          </p>
          <div className="row">
            <Button variant="agent" icon="plug" onClick={() => ctx.go("conexiones")}>
              Conectar mi tienda
            </Button>
            {demo && (
              <Button icon="play" onClick={ctx.startTour}>
                Ver el recorrido guiado
              </Button>
            )}
          </div>
        </section>
      )}

      <div className="grid-kpi-v2">
        <KpiCard
          label="Facturación Activa (GMV)"
          value={usd(totalGmv)}
          hint={`${activeOrders.length} ${plural(activeOrders.length, "orden activa", "órdenes activas")}`}
        />
        <KpiCard
          tone="amber"
          label="Contraentrega por cobrar"
          value={usd(porCobrar)}
          hint={`${codPendientes.length} ${plural(codPendientes.length, "pedido COD", "pedidos COD")} en proceso`}
        />
        <KpiCard
          label="Por confirmar (COD)"
          value={porConfirmarOrders.length}
          unit={plural(porConfirmarOrders.length, "orden", "órdenes")}
          hint="En espera de guía Dropi"
        />
        <KpiCard
          tone="blue"
          label="En camino / Tránsito"
          value={enCaminoCount}
          unit={plural(enCaminoCount, "guía", "guías")}
          hint="Flaash Express / MRW / Zoom"
        />
        <KpiCard
          tone="emerald"
          label="Entregados"
          value={entregadosCount}
          unit={plural(entregadosCount, "pedido", "pedidos")}
          hint={
            activeOrders.length
              ? `${Math.round((entregadosCount / activeOrders.length) * 100)}% efectividad COD`
              : undefined
          }
        />
        <KpiCard
          tone="rose"
          label="Cancelados / Rollback"
          value={cancelledOrders.length}
          unit={plural(cancelledOrders.length, "orden", "órdenes")}
          hint={
            cancelledAmount > 0 ? `$${cancelledAmount.toFixed(2)} sin despacho` : "0 cancelaciones"
          }
        />
      </div>

      {products.length > 0 && (
        <section
          className="card"
          style={{
            background:
              "linear-gradient(135deg, rgba(37, 99, 235, 0.04), rgba(99, 102, 241, 0.07))",
            border: "1px solid rgba(37, 99, 235, 0.18)",
          }}
        >
          <div className="row between" style={{ alignItems: "center", marginBottom: 12 }}>
            <div className="row" style={{ gap: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "var(--brand, #2563eb)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="tag" size={20} />
              </div>
              <div>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
                    Catálogo activo: {products.length}{" "}
                    {plural(products.length, "producto sincronizado", "productos sincronizados")}
                  </h2>
                  <ToneBadge tone="success">WooCommerce HPOS</ToneBadge>
                </div>
                <span className="caption">
                  {state.store.name} · Sincronizado en tiempo real con precios en USD y VES
                </span>
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Button
                variant="agent"
                icon="refresh"
                onClick={async () => {
                  try {
                    await post("/api/products/sync");
                    ctx.refresh();
                    ctx.toast("Catálogo actualizado desde WooCommerce");
                  } catch (e) {
                    ctx.toast("Error al actualizar catálogo");
                  }
                }}
              >
                Sincronizar catálogo
              </Button>
              <Button icon="tag" onClick={() => ctx.go("productos")}>
                Ver catálogo completo
              </Button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {products.slice(0, 4).map((p) => {
              const displayImg = getProductImage(p);
              return (
                <div
                  key={p.id}
                  onClick={() => ctx.go("productos")}
                  style={{
                    background: "var(--surface)",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                  }}
                >
                  {displayImg ? (
                    <img
                      src={displayImg}
                      alt={p.title}
                      style={{
                        width: 48,
                        height: 48,
                        objectFit: "cover",
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 6,
                        background: "rgba(255, 200, 5, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--brand)",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="tag" size={22} />
                    </div>
                  )}
                  <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        color: "var(--ink)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={p.title}
                    >
                      {p.title}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--brand)", fontWeight: 700 }}>
                      {usd(p.price)}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}>
                      {vesFromUsd(p.price)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="home">
        <div style={{ gridArea: "pipe" }} data-tour="pipeline">
          <Pipeline orders={orders} pending={k.pendingApprovals} working={ctx.working} />
        </div>
        {demo && <DemoGuide ctx={ctx} orders={orders} openOrder={openOrder} />}
        <section className="card" aria-labelledby="feed-h" style={{ gridArea: "feed" }}>
          <div className="row between" style={{ marginBottom: 12 }}>
            <h2 id="feed-h">Últimos pedidos registrados</h2>
            <button type="button" className="btn ghost sm" onClick={() => ctx.go("pedidos")}>
              Ver todos ({orders.length})
            </button>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {visibleOrders.slice(0, 6).map((o) => (
              <div
                key={o.id}
                className="row between click"
                onClick={() => openOrder(o.id)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--line)",
                  alignItems: "center",
                }}
              >
                <div className="row" style={{ gap: 10, alignItems: "center", minWidth: 0 }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {o.number}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 6, alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{o.address.name}</span>
                      {o.anomalyReason && !o.isTest && (
                        <span className="badge tone-attention" title={o.anomalyReason}>
                          Anomalía
                        </span>
                      )}
                    </div>
                    <div className="caption" style={{ whiteSpace: "normal" }}>
                      {dateTimeVe(o.createdAt)} · {orderZoneInfo(o)}
                    </div>
                    <div className="caption" style={{ opacity: 0.85 }}>
                      {orderProductSummary(o)}
                    </div>
                  </div>
                </div>
                <div className="row" style={{ gap: 12, alignItems: "center" }}>
                  <span className="mono num" style={{ fontWeight: 700 }}>
                    {usd(orderTotal(o))}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
            {visibleOrders.length === 0 && (
              <EmptyState
                icon="box"
                title="Sin pedidos todavía"
                text="Los pedidos entrantes de WooCommerce aparecerán aquí con su estado en vivo."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================== ACTIVIDAD ============================== */
export function Actividad({ ctx }: { ctx: Ctx }) {
  return (
    <div className="stack">
      <h1>Actividad del agente</h1>
      <section className="card">
        <div className="feed" role="log" aria-live="polite" aria-label="Actividad del agente">
          {ctx.events
            .slice()
            .reverse()
            .map((e) => (
              <AgentActivityEntry
                key={e.id}
                e={e}
                fresh={ctx.fresh.has(e.id)}
                tag={e.orderId ? ctx.tags.get(e.orderId) : undefined}
              />
            ))}
          {ctx.events.length === 0 && (
            <EmptyState
              icon="activity"
              title="Sin actividad todavía"
              text="Cuando llegue un pedido verás aquí cada paso que doy."
            />
          )}
        </div>
      </section>
    </div>
  );
}

/* ============================== PEDIDOS ============================== */
type OrderStatusFilter = "all" | "pending" | "in_transit" | "delivered" | "cancelled";

const STATUS_PILLS: Array<[OrderStatusFilter, string]> = [
  ["all", "Todos"],
  ["pending", "Por confirmar"],
  ["in_transit", "En tránsito"],
  ["delivered", "Entregados"],
  ["cancelled", "Cancelados"],
];

function matchesStatusFilter(o: OrderRow, filter: OrderStatusFilter): boolean {
  if (filter === "all") return true;
  const st = o.shipments[0]?.status ?? o.status;
  if (filter === "pending") {
    return ["pending", "received", "on_hold", "on-hold", "awaiting_confirmation"].includes(st);
  }
  if (filter === "in_transit") {
    return [
      "confirmed",
      "processing",
      "shipped",
      "in_transit",
      "picked_up",
      "out_for_delivery",
      "pickup_scheduled",
      "created",
    ].includes(st);
  }
  if (filter === "delivered") return st === "delivered";
  if (filter === "cancelled") return ["cancelled", "rejected", "refunded"].includes(st);
  return true;
}

export function Pedidos({
  ctx,
  orders,
  sel,
  setSel,
}: {
  ctx: Ctx;
  orders: OrderRow[];
  sel?: string;
  setSel: (id?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [hideTests, setHideTests] = useState(true);
  const [markingTests, setMarkingTests] = useState(false);

  const testOrders = orders.filter((o) => Boolean(o.isTest));
  const testCount = testOrders.length;
  const q = query.trim().toLowerCase();

  const filteredOrders = orders.filter((o) => {
    if (hideTests && o.isTest) return false;
    if (!matchesStatusFilter(o, statusFilter)) return false;
    if (!q) return true;
    const haystack = [
      o.number,
      o.address.name,
      o.address.phone,
      orderCedula(o),
      o.address.city,
      o.address.department,
      orderZoneInfo(o),
      orderProductSummary(o),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  const markE2eTests = async () => {
    setMarkingTests(true);
    try {
      const r = await post<{ ok: boolean; scanned: number; marked: number }>(
        "/api/orders/mark-e2e-tests",
      );
      ctx.toast(
        r.marked > 0
          ? `Se marcaron ${r.marked} pedidos de prueba E2E (sin borrar datos).`
          : `Escaneados ${r.scanned} pedidos: sin pruebas E2E pendientes de marcar.`,
      );
      ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error)?.message || "No se pudo escanear pedidos de prueba");
    } finally {
      setMarkingTests(false);
    }
  };

  const order = orders.find((o) => o.id === sel);
  return (
    <div className="stack">
      <div className="row between" style={{ alignItems: "center" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Pedidos</h1>
          <span className="caption">
            {filteredOrders.length}{" "}
            {plural(filteredOrders.length, "pedido mostrado", "pedidos mostrados")}
            {hideTests && testCount > 0 ? ` · ${testCount} de prueba ocultos` : ""}
          </span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button sm icon="spark" onClick={markE2eTests} disabled={markingTests}>
            {markingTests ? "Escaneando…" : "Marcar pruebas E2E"}
          </Button>
        </div>
      </div>

      {orders.length === 0 ? (
        <section className="card">
          <EmptyState
            icon="box"
            title="No hay pedidos todavía"
            text="Cuando entre uno, lo cotizo, elijo transportadora y genero la guía."
            action={
              <Button variant="agent" icon="play" onClick={() => ctx.go("inicio")}>
                Probar la demo
              </Button>
            }
          />
        </section>
      ) : (
        <>
          <section className="card compact orders-toolbar">
            <div
              className="row between"
              style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}
            >
              <input
                type="search"
                className="input"
                style={{ flex: "1 1 260px" }}
                placeholder="Buscar por #orden, nombre, teléfono, cédula o zona/ciudad…"
                aria-label="Buscar pedidos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <label className="orders-test-toggle">
                <input
                  type="checkbox"
                  checked={hideTests}
                  onChange={(e) => setHideTests(e.target.checked)}
                />
                <span>
                  Ocultar pruebas / E2E
                  {testCount > 0 ? ` (${testCount})` : ""}
                </span>
              </label>
            </div>
            <div
              className="row"
              style={{ gap: 6, flexWrap: "wrap" }}
              role="group"
              aria-label="Filtrar por estado"
            >
              {STATUS_PILLS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`pill-filter ${statusFilter === id ? "active" : ""}`}
                  onClick={() => setStatusFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {filteredOrders.length === 0 ? (
            <section className="card">
              <EmptyState
                icon="search"
                title="Sin resultados para este filtro"
                text="Prueba cambiando la búsqueda, el estado o mostrando los pedidos de prueba E2E."
                action={
                  hideTests && testCount > 0 ? (
                    <Button sm onClick={() => setHideTests(false)}>
                      Mostrar {testCount} pedidos de prueba
                    </Button>
                  ) : undefined
                }
              />
            </section>
          ) : (
            <>
              <section className="card compact scroll-x only-wide">
                <table className="table orders-table">
                  <caption className="sr-only">Pedidos recientes</caption>
                  <thead>
                    <tr>
                      <th scope="col">Pedido · Fecha VET</th>
                      <th scope="col">Cliente · Teléfono</th>
                      <th scope="col">Producto / Pack</th>
                      <th scope="col">Origen</th>
                      <th scope="col">Zona / Ciudad / Estado</th>
                      <th scope="col">Pago</th>
                      <th scope="col" className="right">
                        Total exacto
                      </th>
                      <th scope="col">Guía / Carrier</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => {
                      const s = o.shipments[0];
                      const carrierLabel =
                        s?.carrier ?? (o.meta?._carrier ? String(o.meta._carrier) : undefined);
                      return (
                        <tr
                          key={o.id}
                          className={`click ${sel === o.id ? "sel" : ""}`}
                          onClick={() => setSel(o.id)}
                          onKeyDown={(e) => e.key === "Enter" && setSel(o.id)}
                          tabIndex={0}
                        >
                          <td>
                            <div className="mono" style={{ fontWeight: 700 }}>
                              {o.number}
                            </div>
                            <div className="caption num" style={{ whiteSpace: "nowrap" }}>
                              {dateTimeVe(o.createdAt)}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{o.address.name}</div>
                            <div className="row" style={{ gap: 6, alignItems: "center" }}>
                              <span className="caption mono">{phoneEs(o.address.phone)}</span>
                              {o.address.phone && (
                                <a
                                  href={whatsappHref(o.address.phone)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="wa-link"
                                  title="Abrir chat en WhatsApp"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  WA
                                </a>
                              )}
                            </div>
                          </td>
                          <td style={{ maxWidth: 230 }}>
                            <span style={{ fontSize: "0.86rem" }}>{orderProductSummary(o)}</span>
                          </td>
                          <td>
                            <div className="stack tight" style={{ gap: 4 }}>
                              <span className="badge tone-neutral">{orderOriginLabel(o)}</span>
                              {o.isTest && (
                                <span
                                  className="badge tone-agent"
                                  title={o.anomalyReason ?? "Pedido de prueba E2E"}
                                >
                                  Prueba E2E
                                </span>
                              )}
                              {!o.isTest && o.anomalyReason && (
                                <span className="badge tone-attention" title={o.anomalyReason}>
                                  Alerta anomalía
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ maxWidth: 210 }}>
                            <span style={{ fontSize: "0.86rem" }}>{orderZoneInfo(o)}</span>
                          </td>
                          <td>
                            <PaymentBadge payment={o.payment} />
                          </td>
                          <td className="right nowrap">
                            <Money value={orderTotal(o)} bcvRate={orderBcvRate(o)} />
                          </td>
                          <td>
                            <div className="mono" style={{ fontSize: "0.84rem" }}>
                              {s ? s.trackingNumber : "—"}
                            </div>
                            {carrierLabel && <div className="caption">{carrierLabel}</div>}
                          </td>
                          <td>
                            <StatusBadge status={s?.status ?? o.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
              <div className="only-narrow">
                {filteredOrders.map((o) => {
                  const s = o.shipments[0];
                  const carrierLabel =
                    s?.carrier ?? (o.meta?._carrier ? String(o.meta._carrier) : undefined);
                  return (
                    <button key={o.id} type="button" className="ocard" onClick={() => setSel(o.id)}>
                      <span className="l1">
                        <span>
                          <span className="mono" style={{ fontWeight: 700 }}>
                            {o.number}
                          </span>
                          <span className="caption" style={{ marginLeft: 8 }}>
                            {dateTimeVe(o.createdAt)}
                          </span>
                        </span>
                        <StatusBadge status={s?.status ?? o.status} />
                      </span>
                      <span>
                        <span className="name">{o.address.name}</span>
                        <span className="caption" style={{ display: "block", marginTop: 2 }}>
                          {phoneEs(o.address.phone)}
                        </span>
                        <span className="caption" style={{ display: "block", marginTop: 2 }}>
                          {orderProductSummary(o)}
                        </span>
                        <span className="caption" style={{ display: "block", marginTop: 2 }}>
                          {orderZoneInfo(o)}
                          {carrierLabel ? ` · ${carrierLabel}` : ""}
                          {s?.trackingNumber ? ` (${s.trackingNumber})` : ""}
                        </span>
                      </span>
                      <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <span className="badge tone-neutral">{orderOriginLabel(o)}</span>
                        {o.isTest && <span className="badge tone-agent">Prueba E2E</span>}
                        {!o.isTest && o.anomalyReason && (
                          <span className="badge tone-attention">Alerta anomalía</span>
                        )}
                      </span>
                      <span className="l3">
                        <PaymentBadge payment={o.payment} />
                        <Money value={orderTotal(o)} bcvRate={orderBcvRate(o)} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
      {order && <OrderSheet ctx={ctx} order={order} onClose={() => setSel(undefined)} />}
    </div>
  );
}

export function OrderSheet({
  ctx,
  order,
  onClose,
}: {
  ctx: Ctx;
  order: OrderRow;
  onClose: () => void;
}) {
  const s = order.shipments[0];
  const [togglingTest, setTogglingTest] = useState(false);
  const cedula = orderCedula(order);
  const bcvRate = orderBcvRate(order);
  const coupon = order.meta?._storefront_coupon ? String(order.meta._storefront_coupon) : undefined;
  const discountUsd = order.meta?._storefront_discount_usd
    ? Number(order.meta._storefront_discount_usd)
    : undefined;
  const customerNote =
    order.address.notes ||
    (order.meta?.customer_note ? String(order.meta.customer_note) : undefined);
  const realZone = order.address.zone || (order.meta?._customer_zone as string | undefined);
  const dropiCity = (order.meta?._dropi_city as string | undefined) || order.address.city;
  const dropiDept =
    (order.meta?._dropi_department as string | undefined) || order.address.department;
  const shippingAmt = order.shippingChargedExact ?? order.shippingCharged ?? 0;

  const act = async (incident: boolean) => {
    if (!s) return;
    const r = await post<{ ok: boolean; message?: string }>("/api/demo/advance", {
      trackingNumber: s.trackingNumber,
      incident,
    });
    ctx.toast(
      r.ok
        ? incident
          ? "Provoqué una novedad: ya le escribí al cliente"
          : "Avancé la guía un paso"
        : (r.message ?? "No se pudo"),
    );
  };

  const toggleTestFlag = async () => {
    setTogglingTest(true);
    try {
      const res = await post<{ ok: boolean; isTest: boolean }>(
        `/api/orders/${encodeURIComponent(order.id)}/test-flag`,
        { isTest: !order.isTest },
      );
      ctx.toast(
        res.isTest
          ? `Pedido ${order.number} marcado como prueba E2E`
          : `Pedido ${order.number} restaurado como pedido real`,
      );
      ctx.refresh();
    } catch (e) {
      ctx.toast((e as Error)?.message || "No se pudo actualizar el estado de prueba");
    } finally {
      setTogglingTest(false);
    }
  };

  const copyForDropi = async () => {
    const linesTxt = order.lines.map((l) => `${l.quantity}x ${l.title}`).join(", ");
    const text = [
      `Pedido: ${order.number}`,
      `Nombre: ${order.address.name}`,
      cedula ? `Cédula: ${cedula}` : null,
      `Teléfono: ${order.address.phone}`,
      `Estado/Ciudad Dropi: ${[dropiCity, dropiDept].filter(Boolean).join(", ")}`,
      realZone ? `Zona Cliente: ${realZone}` : null,
      `Dirección: ${order.address.street}`,
      `Productos: ${linesTxt}`,
      `Pago: ${order.payment}`,
      `Total: ${usd(orderTotal(order))}`,
      customerNote ? `Nota: ${customerNote}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      ctx.toast("Datos formateados para Dropi copiados al portapapeles");
    } catch {
      ctx.toast("No se pudo copiar al portapapeles");
    }
  };

  return (
    <Sheet title={`Pedido ${order.number}`} onClose={onClose}>
      {(order.isTest || order.anomalyReason) && (
        <Banner tone={order.isTest ? "agent" : "attention"}>
          <strong>{order.isTest ? "Pedido de prueba E2E" : "Alerta operativa"}:</strong>{" "}
          {order.anomalyReason ?? "Marcado como prueba"}
        </Banner>
      )}
      <div className="card compact stack tight">
        <div className="row between" style={{ alignItems: "center" }}>
          <strong className="break">{order.address.name}</strong>
          <div className="row" style={{ gap: 6 }}>
            <span className="badge tone-neutral">{orderOriginLabel(order)}</span>
            <PaymentBadge payment={order.payment} />
          </div>
        </div>
        <div className="caption">
          {dateTimeVe(order.createdAt)}
          {order.rawStatus ? ` · Woo: ${order.rawStatus}` : ""}
        </div>
        {cedula && (
          <div className="caption">
            Cédula: <strong className="mono">{cedula}</strong>
          </div>
        )}
        <div className="muted break">
          {order.address.street}, {order.address.city}
          {order.address.department ? ` (${order.address.department})` : ""}
        </div>
        {Boolean(realZone || order.meta?._zone_remapped) && (
          <div className="caption">
            Zona real: <strong>{realZone || "—"}</strong> · Dropi:{" "}
            <strong>{[dropiCity, dropiDept].filter(Boolean).join(", ")}</strong>
          </div>
        )}
        <div className="row" style={{ gap: 10, alignItems: "center" }}>
          <span className="mono">{phoneEs(order.address.phone)}</span>
          {order.address.phone && (
            <a
              href={whatsappHref(order.address.phone)}
              target="_blank"
              rel="noreferrer"
              className="wa-link"
            >
              Abrir WhatsApp
            </a>
          )}
        </div>
        {order.email && <div className="caption">{order.email}</div>}
        {coupon && (
          <div className="caption">
            Cupón aplicado: <strong className="mono">{coupon}</strong>
            {discountUsd ? ` (−${usd(discountUsd)})` : ""}
          </div>
        )}
        {customerNote && (
          <div className="caption" style={{ fontStyle: "italic" }}>
            Nota del cliente: «{customerNote}»
          </div>
        )}
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%", margin: 0 }} />
        {order.lines.map((l, idx) => {
          const lineAmt = l.lineTotal ?? (l.unitPriceExact ?? l.unitPrice) * l.quantity;
          return (
            <div
              key={`${l.title}-${idx}`}
              className="row between"
              style={{ flexWrap: "nowrap", alignItems: "flex-start" }}
            >
              <span className="break">
                {l.quantity} x {l.title}
              </span>
              <span className="num nowrap">{usd(lineAmt)}</span>
            </div>
          );
        })}
        {shippingAmt > 0 && (
          <div className="row between">
            <span className="caption">Envío</span>
            <span className="num caption">{usd(shippingAmt)}</span>
          </div>
        )}
        <div className="row between">
          <span className="label">{order.payment === "cod" ? "Recaudo" : "Total"}</span>
          <Money value={orderTotal(order)} bcvRate={bcvRate} />
        </div>
        <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <Button sm icon="copy" onClick={copyForDropi}>
            Copiar datos Dropi
          </Button>
          <Button sm onClick={toggleTestFlag} disabled={togglingTest}>
            {togglingTest
              ? "Actualizando…"
              : order.isTest
                ? "Desmarcar como prueba"
                : "Marcar como prueba E2E"}
          </Button>
        </div>
      </div>

      <section aria-label="Recorrido del pedido" data-tour="journey">
        <h3 style={{ marginBottom: 12 }}>Recorrido</h3>
        <OrderJourney order={order} />
      </section>

      {order.quotes.length > 0 && (
        <section className="card compact" aria-label="Cotizaciones" data-tour="quotes">
          <h3 style={{ marginBottom: 12 }}>Cómo elegí la transportadora</h3>
          <QuoteBars quotes={order.quotes} />
        </section>
      )}

      {s ? (
        <section className="card compact" data-tour="tracking">
          <div className="row between" style={{ marginBottom: 12 }}>
            <div>
              <div className="label">Guía</div>
              <div className="mono">{s.trackingNumber}</div>
              <div className="caption">
                {s.carrier}
                {s.simulated ? " · simulada" : ""}
              </div>
            </div>
            <StatusBadge status={s.status} />
          </div>
          <ShipmentTimeline events={s.events} />
          {s.simulated && s.status !== "delivered" && (
            <div className="row" style={{ marginTop: 8 }}>
              <Button sm onClick={() => act(false)} icon="play">
                Avanzar guía
              </Button>
              <Button sm onClick={() => act(true)} icon="alert">
                Provocar novedad
              </Button>
            </div>
          )}
        </section>
      ) : (
        <Banner tone="attention">
          Este pedido todavía no tiene guía. Revisa si hay una aprobación pendiente.
        </Banner>
      )}
    </Sheet>
  );
}

/* ============================== APROBACIONES ============================== */
export function Aprobaciones({ ctx }: { ctx: Ctx }) {
  const { data, reload } = useResource<Approval[]>("/api/approvals", ctx.tick);
  const [street, setStreet] = useState<Record<string, string>>({});
  const pending = (data ?? []).filter((a) => a.status === "pending");
  const done = (data ?? []).filter((a) => a.status !== "pending").slice(0, 8);
  const run = async (path: string, body?: unknown) => {
    const r = await post<{ ok: boolean; message: string }>(path, body);
    ctx.toast(r.message);
    reload();
  };
  return (
    <div className="stack">
      <h1>Necesita tu atención</h1>
      {pending.length === 0 && (
        <section className="card">
          <EmptyState icon="check" title="Todo al día" text="No hay nada esperando tu decisión." />
        </section>
      )}
      {pending.map((a) => (
        <article key={a.id} className="proposal" aria-label={a.title}>
          <div className="row between">
            <div className="row" style={{ minWidth: 0 }}>
              <Icon name="spark" size={18} />
              <h3 className="break">{a.title}</h3>
            </div>
            <ToneBadge tone="attention">Esperando tu aprobación</ToneBadge>
          </div>
          <div className="break">{a.detail}</div>
          {a.kind === "address" ? (
            <div className="row">
              <input
                className="input"
                style={{ flex: "1 1 220px" }}
                placeholder="Dirección completa (vía y número)"
                aria-label="Dirección completa"
                value={street[a.id] ?? ""}
                onChange={(e) => setStreet({ ...street, [a.id]: e.target.value })}
              />
              <Button
                variant="primary"
                onClick={() => run(`/api/approvals/${a.id}/address`, { street: street[a.id] })}
                disabled={!street[a.id]}
              >
                Corregir y enviar
              </Button>
              <Button onClick={() => run(`/api/approvals/${a.id}/reject`)}>Descartar</Button>
            </div>
          ) : (
            <div className="row">
              <Button variant="primary" onClick={() => run(`/api/approvals/${a.id}/approve`)}>
                Aprobar
              </Button>
              <Button onClick={() => run(`/api/approvals/${a.id}/reject`)}>Rechazar</Button>
            </div>
          )}
        </article>
      ))}
      {done.length > 0 && (
        <section className="card">
          <div className="label" style={{ marginBottom: 8 }}>
            Resueltas
          </div>
          {done.map((a) => (
            <div
              key={a.id}
              className="row between"
              style={{ padding: "6px 0", flexWrap: "nowrap" }}
            >
              <span className="break">{a.title}</span>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

/* ============================== CONVERSACIONES ============================== */
export function Conversaciones({ ctx }: { ctx: Ctx }) {
  const { data } = useResource<Conversation[]>("/api/conversations", ctx.tick);
  const [open, setOpen] = useState<string>();
  const [text, setText] = useState("");
  const narrow = typeof matchMedia === "function" && matchMedia("(max-width: 720px)").matches;
  const conv = (data ?? []).find((c) => c.id === (open ?? (narrow ? undefined : data?.[0]?.id)));
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setText("");
  }, [conv?.id]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "end" });
  }, [conv?.messages.length]);
  const reply = async () => {
    if (!conv || !text.trim()) return;
    const r = await post<{ result: { intent: string } }>("/api/demo/reply", {
      phone: conv.customer.phone,
      text,
    });
    setText("");
    ctx.toast(
      r.result.intent === "no_context"
        ? "Esa persona no tiene una novedad abierta: no hice nada"
        : "Atendí la respuesta del cliente",
    );
  };
  const list = (
    <section
      className="card compact"
      aria-label="Conversaciones"
      style={conv && narrow ? { display: "none" } : undefined}
    >
      {(data ?? []).map((c) => (
        <button
          key={c.id}
          type="button"
          className="convitem"
          aria-current={c.id === conv?.id}
          onClick={() => setOpen(c.id)}
        >
          <span className="avatar" aria-hidden="true">
            {c.customer.name.slice(0, 1)}
          </span>
          <span style={{ minWidth: 0 }}>
            <strong className="break">{c.customer.name}</strong>
            <br />
            <span className="caption">{phoneEs(c.customer.phone)}</span>
          </span>
        </button>
      ))}
      {(data ?? []).length === 0 && (
        <EmptyState
          icon="chat"
          title="Aún no hay conversaciones"
          text="Aparecen cuando le aviso a un cliente que su pedido va en camino."
        />
      )}
    </section>
  );
  return (
    <div className="stack">
      <h1>Conversaciones</h1>
      <div className="two">
        {list}
        {conv && (
          <section className="card" aria-label={`Chat con ${conv.customer.name}`}>
            <div className="stack tight">
              <div className="row between" style={{ flexWrap: "nowrap" }}>
                <div className="row" style={{ flexWrap: "nowrap", minWidth: 0 }}>
                  {narrow && (
                    <Button variant="ghost" sm icon="back" onClick={() => setOpen(undefined)}>
                      Atrás
                    </Button>
                  )}
                  <h3 className="break">{conv.customer.name}</h3>
                </div>
                <span className="mono nowrap">{phoneEs(conv.customer.phone)}</span>
              </div>
              <div className="chat" role="log" aria-live="polite">
                {conv.messages.map((m) => (
                  <div key={m.id} className={`bubble ${m.direction}`}>
                    {m.text}
                    <div className="meta">
                      {m.direction === "out" ? "Traxo" : conv.customer.name} · {timeEs(m.at)}
                      {m.simulated ? " · simulado" : ""}
                    </div>
                  </div>
                ))}
                <div ref={chatEnd} />
              </div>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  placeholder="Responder como el cliente (demo)…"
                  aria-label="Responder como el cliente"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && reply()}
                />
                <Button variant="primary" icon="send" onClick={reply} disabled={!text.trim()}>
                  Enviar
                </Button>
              </div>
              <p className="caption" style={{ margin: 0 }}>
                Prueba con «Sí, mañana estoy», «No lo quiero» o una dirección nueva.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
