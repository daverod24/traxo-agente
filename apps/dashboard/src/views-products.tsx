import { useMemo, useState } from "react";
import { useResource } from "./api.ts";
import { EmptyState } from "./components.tsx";
import { cop, plural, vesFromUsd } from "./format.ts";
import type { Product, StoreStatus } from "./types.ts";
import { Button, Icon, KpiCard, ToneBadge } from "./ui.tsx";
import type { Ctx } from "./views.tsx";

export function CatalogoProductos({ ctx }: { ctx: Ctx }) {
  const { data: productsData, reload, loading } = useResource<Product[]>("/api/products", ctx.tick);
  const store = useResource<StoreStatus>("/api/store/status", ctx.tick).data;
  const [filter, setFilter] = useState("");

  const products = productsData ?? [];
  const filtered = useMemo(() => {
    if (!filter.trim()) return products;
    const q = filter.toLowerCase();
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.externalId && String(p.externalId).toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)),
    );
  }, [products, filter]);

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <h1>Catálogo de Productos</h1>
            <span
              className="badge tone-success"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}
            >
              <Icon name="check" size={14} />
              WooCommerce HPOS Sincronizado
            </span>
          </div>
          <p className="lead">
            Productos activos sincronizados en vivo con {store?.name ?? "Davebeauty"}.
            Disponibles para la gestión agéntica, cotizaciones automatizadas y creación de pedidos.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button icon="refresh" onClick={reload} disabled={loading}>
            {loading ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button variant="agent" icon="plug" onClick={() => ctx.go("conexiones")}>
            Sincronizar tienda
          </Button>
        </div>
      </div>

      <div className="grid-kpi">
        <KpiCard
          hero
          label="Total en catálogo"
          value={products.length}
          unit={plural(products.length, "producto activo", "productos activos")}
          hint="Sincronizados en tiempo real"
        />
        <KpiCard
          label="Plataforma origen"
          value={store?.platform?.toUpperCase() ?? "WOOCOMMERCE"}
          hint="WooCommerce HPOS REST API"
        />
        <KpiCard
          label="Bimoneda nativa"
          value="USD / VES"
          hint="Tasa oficial BCV referencial"
        />
      </div>

      <div className="row between" style={{ alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, maxWidth: 420 }}>
          <input
            type="search"
            placeholder="Buscar por nombre, SKU o ID..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--card-bg, #fff)",
              color: "inherit",
              fontSize: "0.9rem",
            }}
          />
        </div>
        <div className="caption" style={{ fontWeight: 500 }}>
          Mostrando {filtered.length} de {products.length} {plural(products.length, "producto", "productos")}
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="card">
          <EmptyState
            icon="tag"
            title={products.length === 0 ? "Aún no hay productos en el catálogo" : "No hay resultados"}
            text={
              products.length === 0
                ? "Conecta tu tienda WooCommerce en la sección Conexiones para sincronizar tus productos en vivo."
                : "Intenta con otro término de búsqueda."
            }
          />
        </section>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((p) => (
            <div
              key={p.id}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                padding: 16,
                borderRadius: 12,
                gap: 12,
                position: "relative",
              }}
            >
              {p.imageUrl ? (
                <div
                  style={{
                    width: "100%",
                    height: 180,
                    borderRadius: 8,
                    overflow: "hidden",
                    backgroundColor: "var(--bg-subtle, rgba(0,0,0,0.03))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 140,
                    borderRadius: 8,
                    background: "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(99,102,241,0.12))",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    color: "var(--brand, #2563eb)",
                  }}
                >
                  <Icon name="tag" size={32} />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Davebeauty</span>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <div className="row between" style={{ alignItems: "center" }}>
                  <span
                    className="badge"
                    style={{
                      fontSize: "0.75rem",
                      background: "rgba(100, 116, 139, 0.12)",
                      color: "inherit",
                      padding: "2px 8px",
                      borderRadius: 6,
                    }}
                  >
                    WooCommerce #{p.externalId ?? p.id}
                  </span>
                  <ToneBadge tone="success">Activo</ToneBadge>
                </div>

                <h3
                  style={{
                    margin: "4px 0",
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}
                >
                  {p.title}
                </h3>

                {p.description && (
                  <p
                    className="caption"
                    style={{
                      margin: 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      lineHeight: 1.4,
                    }}
                  >
                    {p.description.replace(/<[^>]*>?/gm, "").trim()}
                  </p>
                )}
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--border-subtle, rgba(100,116,139,0.15))",
                  paddingTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                }}
              >
                <div>
                  <div className="caption">Precio de venta</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--brand, #2563eb)" }}>
                    {cop(p.price)}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    {vesFromUsd(p.price)}
                  </div>
                </div>

                {p.unitsSold > 0 ? (
                  <div style={{ textAlign: "right" }}>
                    <div className="caption">Ventas registradas</div>
                    <div style={{ fontWeight: 600 }}>
                      {p.unitsSold} {plural(p.unitsSold, "ud", "uds")}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "right" }}>
                    <div className="caption">Disponibilidad</div>
                    <span className="caption" style={{ color: "var(--success, #16a34a)", fontWeight: 600 }}>
                      En inventario
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
