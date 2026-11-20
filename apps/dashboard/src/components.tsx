import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cop, days, vesFromUsd, viaLabel } from "./format.ts";
import type { OrderRow } from "./types.ts";
import { AgentMark, Button, Icon } from "./ui.tsx";

const reducedMotion = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const isNarrow = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(max-width: 720px)").matches;

/* ---------- Hoja: lateral en escritorio, inferior arrastrable en móvil ---------- */
export function Sheet({
  title,
  wide = false,
  onClose,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const el = useRef<HTMLElement>(null);
  const drag = useRef<{ y0: number; t0: number; dy: number } | null>(null);
  const opener = useRef<Element | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(onClose, reducedMotion() ? 0 : 340);
  }, [onClose]);

  useEffect(() => {
    opener.current = document.activeElement;
    const raf = requestAnimationFrame(() => setOpen(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    el.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !el.current) return;
      const f = [
        ...el.current.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ].filter((n) => !n.hasAttribute("disabled"));
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [close]);

  // Arrastre 1:1 con el dedo; al soltar decide por velocidad (no solo por distancia) y continúa desde donde quedó.
  const down = (e: React.PointerEvent) => {
    if (!isNarrow() || !el.current) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, t0: performance.now(), dy: 0 };
    el.current.classList.add("dragging");
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !el.current) return;
    const raw = e.clientY - d.y0;
    // Hacia arriba hay fricción progresiva (rubber-band), hacia abajo sigue al dedo.
    d.dy = raw > 0 ? raw : raw / (1 + Math.abs(raw) / 60);
    el.current.style.transform = `translateY(${Math.max(d.dy, -24)}px)`;
  };
  const up = () => {
    const d = drag.current;
    if (!d || !el.current) return;
    drag.current = null;
    const elapsed = Math.max(performance.now() - d.t0, 1);
    const velocity = d.dy / elapsed;
    const dismiss = d.dy > el.current.offsetHeight / 3 || (velocity > 0.11 && d.dy > 24);
    el.current.classList.remove("dragging");
    el.current.style.transform = "";
    if (dismiss) close();
  };

  return createPortal(
    <>
      <div className={`scrim ${open ? "open" : ""}`} onClick={close} aria-hidden="true" />
      <aside
        ref={el}
        className={`sheet ${wide ? "wide" : ""} ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div
          className="grab"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
        <div
          className="head"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <h2 className="break">{title}</h2>
          <Button variant="ghost" sm onClick={close} icon="x">
            Cerrar
          </Button>
        </div>
        <div className="body">{children}</div>
      </aside>
    </>,
    document.body,
  );
}

/* ---------- Estados vacío y de carga ---------- */
export function EmptyState({
  icon = "spark",
  title,
  text,
  action,
}: {
  icon?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="ic">
        <Icon name={icon} size={22} />
      </span>
      <strong>{title}</strong>
      {text && <span style={{ maxWidth: "42ch" }}>{text}</span>}
      {action}
    </div>
  );
}

export function Skeleton({ h = 120 }: { h?: number }) {
  return <div className="skel" style={{ height: h }} aria-hidden="true" />;
}

export function LoadingShell() {
  return (
    <div className="stack" role="status" aria-label="Cargando">
      <Skeleton h={64} />
      <Skeleton h={150} />
      <Skeleton h={220} />
    </div>
  );
}

/* ---------- Dónde está cada pedido ---------- */
export function Pipeline({
  orders,
  pending,
  working,
}: {
  orders: OrderRow[];
  pending: number;
  working: boolean;
}) {
  const ships = orders.flatMap((o) => o.shipments);
  const nShip = (st: string[]) => ships.filter((s) => st.includes(s.status)).length;
  const nOrd = (st: string[]) => orders.filter((o) => st.includes(o.status)).length;

  const porRevisar = Math.max(pending, nOrd(["pending", "received", "on-hold", "on_hold"]));
  const conGuia =
    nOrd(["confirmed", "processing", "packed"]) + nShip(["created", "pickup_scheduled"]);
  const enCamino =
    nOrd(["shipped", "in_transit"]) + nShip(["picked_up", "in_transit", "out_for_delivery"]);
  const entregados = Math.max(nOrd(["delivered"]), nShip(["delivered"]));

  // Excepciones operativas
  const novedad = nShip(["incident", "returning"]);
  const canceladosOrders = orders.filter((o) =>
    ["cancelled", "rejected", "refunded"].includes(o.status),
  );
  const cancelados = canceladosOrders.length;
  const canceladosTotal = canceladosOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const stages = [
    {
      key: "rev",
      t: "Por confirmar",
      sub: "Validación COD / WhatsApp",
      n: porRevisar,
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.12)",
      borderColor: "rgba(245, 158, 11, 0.35)",
      icon: "alert",
      badgeText: porRevisar > 0 ? "Requiere acción" : "Al día",
    },
    {
      key: "gui",
      t: "Con guía Dropi",
      sub: "Empacado y rotulado",
      n: conGuia,
      color: "#3b82f6",
      bgColor: conGuia > 0 ? "rgba(59, 130, 246, 0.12)" : "rgba(255, 255, 255, 0.03)",
      borderColor: conGuia > 0 ? "rgba(59, 130, 246, 0.35)" : "var(--line)",
      icon: "box",
      badgeText: conGuia > 0 ? "En preparación" : "Sin pedidos",
    },
    {
      key: "cam",
      t: "En camino",
      sub: "Flaash / Zoom / MRW",
      n: enCamino,
      color: "#8b5cf6",
      bgColor: enCamino > 0 ? "rgba(139, 92, 246, 0.12)" : "rgba(255, 255, 255, 0.03)",
      borderColor: enCamino > 0 ? "rgba(139, 92, 246, 0.35)" : "var(--line)",
      icon: "truck",
      badgeText: enCamino > 0 ? "En reparto" : "0 en ruta",
    },
    {
      key: "ent",
      t: "Entregado",
      sub: "Cobro COD recaudado",
      n: entregados,
      color: "#10b981",
      bgColor: entregados > 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.03)",
      borderColor: entregados > 0 ? "rgba(16, 185, 129, 0.35)" : "var(--line)",
      icon: "check",
      badgeText: entregados > 0 ? "Completado" : "0 entregas",
    },
  ];

  return (
    <section className="card" aria-labelledby="pipe-h" style={{ padding: "20px 24px" }}>
      <div className="row between" style={{ alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 id="pipe-h" style={{ margin: 0, fontSize: "1.1rem" }}>
            Dónde está cada pedido
          </h2>
          <span className="caption" style={{ color: "var(--ink-muted)" }}>
            Flujo de despacho activo en tiempo real (Caracas y Envíos Nacionales)
          </span>
        </div>
        <span className="row" style={{ gap: 6, alignItems: "center" }}>
          <AgentMark working={working} />
          <span className="caption" style={{ fontWeight: 600 }}>
            {working ? "Sincronizando..." : "Al día"}
          </span>
        </span>
      </div>

      {/* Flujo de 4 etapas lineales */}
      <div className="pipe-flow-grid">
        {stages.map((s) => (
          <div
            key={s.key}
            className="pipe-step-card"
            style={{ border: `1px solid ${s.borderColor}`, background: s.bgColor }}
          >
            <div
              className="row between"
              style={{ alignItems: "center", width: "100%", marginBottom: 8 }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: s.n > 0 ? s.color : "rgba(255, 255, 255, 0.05)",
                  color: s.n > 0 ? "#ffffff" : "var(--ink-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={s.icon as any} size={16} />
              </div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: s.n > 0 ? s.color : "var(--ink-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                {s.badgeText}
              </span>
            </div>

            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                color: "var(--ink)",
                lineHeight: 1,
              }}
            >
              {s.n}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.92rem",
                color: "var(--ink)",
                marginTop: 6,
              }}
            >
              {s.t}
            </div>
            <div
              className="caption"
              style={{ color: "var(--ink-muted)", fontSize: "0.76rem", marginTop: 2 }}
            >
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Bandeja de Excepciones y Resolución Operativa */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 16,
          borderTop: "1px solid var(--line)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        {/* Novedades en Ruta */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            background:
              novedad > 0 ? "rgba(245, 158, 11, 0.08)" : "rgba(255, 255, 255, 0.02)",
            border: `1px solid ${novedad > 0 ? "rgba(245, 158, 11, 0.3)" : "var(--line)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: novedad > 0 ? "#f59e0b" : "rgba(255, 255, 255, 0.05)",
                color: novedad > 0 ? "#ffffff" : "var(--ink-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="alert" size={14} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)" }}>
                Novedades en Ruta
              </div>
              <div
                className="caption"
                style={{ color: "var(--ink-muted)", fontSize: "0.75rem" }}
              >
                {novedad > 0
                  ? `${novedad} retenciones que requieren reprogramación con el cliente`
                  : "Sin incidencias de entrega reportadas por transportadora"}
              </div>
            </div>
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: "1.1rem",
              color: novedad > 0 ? "#f59e0b" : "var(--ink-muted)",
            }}
          >
            {novedad}
          </span>
        </div>

        {/* Cancelados / Rollback */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            background:
              cancelados > 0 ? "rgba(244, 63, 94, 0.06)" : "rgba(255, 255, 255, 0.02)",
            border: `1px solid ${cancelados > 0 ? "rgba(244, 63, 94, 0.25)" : "var(--line)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background:
                  cancelados > 0 ? "rgba(244, 63, 94, 0.2)" : "rgba(255, 255, 255, 0.05)",
                color: cancelados > 0 ? "#f43f5e" : "var(--ink-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="x" size={14} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--ink)" }}>
                Cancelados / Rollback
              </div>
              <div
                className="caption"
                style={{ color: "var(--ink-muted)", fontSize: "0.75rem" }}
              >
                {cancelados > 0
                  ? `$${canceladosTotal.toFixed(2)} USD anulados · Sin despacho ni cobro flete`
                  : "0 cancelaciones registradas"}
              </div>
            </div>
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: "1.1rem",
              color: cancelados > 0 ? "#f43f5e" : "var(--ink-muted)",
            }}
          >
            {cancelados}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------- Recorrido de un pedido (en el detalle) ---------- */
export function OrderJourney({ order }: { order: OrderRow }) {
  const s = order.shipments[0];
  const chosen = order.quotes.find((q) => q.chosen);
  const hasQuotes = order.quotes.length > 0;
  const status = s?.status;
  const steps: Array<{ t: string; d?: string; st: "done" | "now" | "todo" | "bad" }> = [
    {
      t: "Pedido recibido",
      d: `${order.address.city} · ${order.payment === "cod" ? "contraentrega" : "prepagado"}`,
      st: "done",
    },
    {
      t: "Dirección validada",
      st: hasQuotes || s ? "done" : "bad",
      d: hasQuotes || s ? undefined : "Falta confirmar la dirección",
    },
    {
      t: "Transportadora elegida",
      d: chosen ? `${chosen.carrier} · ${cop(chosen.freight + chosen.codCommission)}` : undefined,
      st: chosen || s ? "done" : "todo",
    },
    { t: "Guía generada", d: s ? s.trackingNumber : undefined, st: s ? "done" : "todo" },
    {
      t:
        status === "incident"
          ? "Novedad en la entrega"
          : status === "delivered"
            ? "Entregado"
            : "En camino",
      d: status === "incident" ? "Esperando al cliente" : undefined,
      st: !s ? "todo" : status === "delivered" ? "done" : status === "incident" ? "bad" : "now",
    },
  ];
  return (
    <ol className="journey" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {steps.map((x) => (
        <li key={x.t} className={`jstep ${x.st}`}>
          <span className="pt">
            <Icon
              name={
                x.st === "done"
                  ? "check"
                  : x.st === "bad"
                    ? "alert"
                    : x.st === "now"
                      ? "truck"
                      : "circle"
              }
              size={14}
            />
          </span>
          <div>
            <div className="tt">{x.t}</div>
            {x.d && <div className="caption break">{x.d}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Cotizaciones en barras ---------- */
export function QuoteBars({ quotes }: { quotes: OrderRow["quotes"] }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(r);
  }, []);
  const rows = [...quotes].sort(
    (a, b) =>
      Number(b.chosen) - Number(a.chosen) ||
      a.freight + a.codCommission - (b.freight + b.codCommission),
  );
  const max = Math.max(...rows.map((q) => q.freight + q.codCommission), 1);
  return (
    <div className="qbars" role="list">
      {rows.map((q) => {
        const total = q.freight + q.codCommission;
        return (
          <div key={q.id} className={`qrow ${q.chosen ? "win" : ""}`} role="listitem">
            <div className="who">
              <strong>
                {q.chosen && (
                  <span title="Elegida por el agente" style={{ marginRight: 4 }}>
                    <Icon name="spark" size={14} />
                  </span>
                )}
                {q.carrier}
              </strong>
              <span className="caption">
                {viaLabel(q.provider)}
                {q.simulated ? " · simulada" : ""} · {days(q.businessDays)}
              </span>
            </div>
            <div className="track" aria-hidden="true">
              <div
                className="fill"
                style={{
                  width: "100%",
                  transform: `scaleX(${on ? Math.max(total / max, 0.12) : 0})`,
                }}
              />
            </div>
            <div className="price num">
              <div>{cop(total)}</div>
              <small style={{ color: "var(--muted)", fontSize: "0.75rem", display: "block" }}>
                {vesFromUsd(total)}
              </small>
            </div>
          </div>
        );
      })}
      <p className="caption" style={{ margin: "4px 0 0" }}>
        El total incluye la comisión de recaudo cuando es contraentrega.
      </p>
    </div>
  );
}
