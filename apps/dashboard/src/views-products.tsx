import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { patch, post, useResource } from "./api.ts";
import { EmptyState, Sheet } from "./components.tsx";
import { plural, usd, vesFromUsd } from "./format.ts";
import type { Product, StoreStatus } from "./types.ts";
import { Button, Icon, KpiCard, ToneBadge } from "./ui.tsx";
import { type Ctx, getProductImage } from "./views.tsx";
import { PricingCockpit } from "./views-pricing-cockpit.tsx";

export function CatalogoProductos({ ctx }: { ctx: Ctx }) {
  const { data: productsData, reload, loading } = useResource<Product[]>("/api/products", ctx.tick);
  const store = useResource<StoreStatus>("/api/store/status", ctx.tick).data;
  const [filter, setFilter] = useState("");
  const [syncing, setSyncing] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const syncBadgeRef = useRef<HTMLSpanElement>(null);

  // Animación de pulso vivo en el indicador de sincronización (respetando prefers-reduced-motion)
  useEffect(() => {
    if (!syncBadgeRef.current) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const ctxMm = gsap.context(() => {
      if (syncing) {
        gsap.to(syncBadgeRef.current, {
          scale: 1.05,
          opacity: 0.7,
          repeat: -1,
          yoyo: true,
          duration: 0.6,
          ease: "power1.inOut",
        });
      } else {
        gsap.killTweensOf(syncBadgeRef.current);
        gsap.to(syncBadgeRef.current, { scale: 1, opacity: 1, duration: 0.3 });
      }
    });

    return () => ctxMm.revert();
  }, [syncing]);

  // Entrada animada fluida de las tarjetas de productos
  useEffect(() => {
    if (!gridRef.current || (productsData ?? []).length === 0) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const cards = gridRef.current.querySelectorAll(".product-card-item");
    if (!cards.length) return;

    const ctxMm = gsap.context(() => {
      gsap.from(cards, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        stagger: 0.05,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    }, gridRef);

    return () => ctxMm.revert();
  }, [(productsData ?? []).length]);

  // Estado para el Cockpit Financiero
  const [showCockpit, setShowCockpit] = useState(false);
  const [cockpitProductId, setCockpitProductId] = useState<string | undefined>(undefined);

  // Estado para la administración / edición del producto
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    imageUrl: string;
    price: number;
    cost: number | string;
    weightGrams: number;
  }>({
    title: "",
    description: "",
    imageUrl: "",
    price: 0,
    cost: "",
    weightGrams: 500,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const products = productsData ?? [];
  const filtered = useMemo(() => {
    if (!filter.trim()) return products;
    const q = filter.toLowerCase();
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.externalId && String(p.externalId).toLowerCase().includes(q)) ||
        (p.dropiId && String(p.dropiId).toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)),
    );
  }, [products, filter]);

  const handleSyncStore = async () => {
    setSyncing(true);
    try {
      const res = await post<{
        ok: boolean;
        total: number;
        added: number;
        updated: number;
        message?: string;
      }>("/api/products/sync", {});
      if (res.ok) {
        ctx.toast(
          res.message ??
            `Catálogo sincronizado: ${res.added} nuevos, ${res.updated} actualizados (Total: ${res.total}).`,
        );
        reload();
      } else {
        ctx.toast(res.message ?? "Error al sincronizar con WooCommerce.");
      }
    } catch (e: any) {
      ctx.toast(e.message ?? "Error de red al sincronizar con WooCommerce.");
    } finally {
      setSyncing(false);
    }
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description ?? "",
      imageUrl: p.imageUrl ?? "",
      price: p.price,
      cost: p.cost ?? "",
      weightGrams: p.weightGrams ?? 500,
    });
    setError(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const res = await patch<{ ok: boolean; product: Product; message?: string }>(
        `/api/products/${editing.id}`,
        {
          title: form.title,
          description: form.description,
          imageUrl: form.imageUrl,
          price: form.price,
          cost: form.cost === "" ? null : Number(form.cost),
          weightGrams: form.weightGrams,
        },
      );
      if (res.ok) {
        ctx.toast(`Producto "${form.title}" actualizado con éxito.`);
        setEditing(null);
        reload();
      } else {
        setError(res.message ?? "No se pudo actualizar el producto.");
      }
    } catch (e: any) {
      setError(e.message ?? "Error al actualizar el producto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <h1>Catálogo de Productos</h1>
            <span
              ref={syncBadgeRef}
              className={`badge ${syncing ? "tone-agent" : "tone-success"}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.8rem",
                transition: "background 0.3s ease",
              }}
            >
              <Icon name={syncing ? "refresh" : "check"} size={14} />
              {syncing ? "Sincronizando con WooCommerce HPOS..." : "WooCommerce HPOS Sincronizado"}
            </span>
          </div>
          <p className="lead">
            Productos activos sincronizados en vivo con {store?.name ?? "Davebeauty"}. Disponibles
            para la gestión agéntica, cotizaciones automatizadas, campañas y creación de pedidos.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button
            variant="agent"
            icon="chart"
            onClick={() => {
              setCockpitProductId(undefined);
              setShowCockpit(true);
            }}
          >
            Simulador Financiero & Cockpit
          </Button>
          <Button icon="refresh" onClick={reload} disabled={loading || syncing}>
            {loading ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button
            icon="plug"
            variant="primary"
            onClick={handleSyncStore}
            disabled={syncing || loading}
          >
            {syncing ? "Sincronizando..." : "Sincronizar tienda"}
          </Button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
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
        <KpiCard label="Bimoneda nativa" value="USD / VES" hint="Tasa oficial BCV referencial" />
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
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "inherit",
              fontSize: "0.9rem",
            }}
          />
        </div>
        <div className="caption" style={{ fontWeight: 500 }}>
          Mostrando {filtered.length} de {products.length}{" "}
          {plural(products.length, "producto", "productos")}
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="card">
          <EmptyState
            icon="tag"
            title={
              products.length === 0 ? "Aún no hay productos en el catálogo" : "No hay resultados"
            }
            text={
              products.length === 0
                ? "Conecta tu tienda WooCommerce en la sección Conexiones para sincronizar tus productos en vivo."
                : "Intenta con otro término de búsqueda."
            }
          />
        </section>
      ) : (
        <div
          ref={gridRef}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((p) => {
            const displayImg = getProductImage(p);

            return (
              <div
                key={p.id}
                className="card product-card-item"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: 16,
                  borderRadius: 12,
                  gap: 12,
                  position: "relative",
                }}
              >
                {displayImg ? (
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
                      src={displayImg}
                      alt={p.title}
                      width={280}
                      height={180}
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
                      background:
                        "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(99,102,241,0.12))",
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
                  <div
                    className="row between"
                    style={{ alignItems: "center", flexWrap: "wrap", gap: 6 }}
                  >
                    <div
                      style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
                    >
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
                        WC #{p.externalId ?? p.id}
                      </span>
                      {p.dropiId && (
                        <span
                          className="badge"
                          style={{
                            fontSize: "0.75rem",
                            background: "rgba(37, 99, 235, 0.12)",
                            color: "var(--brand, #2563eb)",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 6,
                          }}
                        >
                          Dropi #{p.dropiId}
                        </span>
                      )}
                      {p.sku && (
                        <span
                          className="badge"
                          style={{
                            fontSize: "0.72rem",
                            background: "rgba(100, 116, 139, 0.08)",
                            color: "inherit",
                            fontFamily: "monospace",
                            padding: "2px 6px",
                            borderRadius: 6,
                          }}
                        >
                          {p.sku}
                        </span>
                      )}
                    </div>
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

                  {/* Escalera de packs (1x, 2x, 3x) */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    <span
                      className="badge"
                      style={{
                        fontSize: "0.72rem",
                        background: "var(--bg-subtle, rgba(0,0,0,0.04))",
                        border: "1px solid var(--line, rgba(100,116,139,0.2))",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      <strong>1x:</strong> {usd(p.price)}
                    </span>
                    {p.packs?.duo && (
                      <span
                        className="badge"
                        style={{
                          fontSize: "0.72rem",
                          background: "rgba(16, 185, 129, 0.08)",
                          color: "var(--success, #16a34a)",
                          border: "1px solid rgba(16, 185, 129, 0.25)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        <strong>2x Dúo:</strong> {usd(p.packs.duo)}
                      </span>
                    )}
                    {p.packs?.trio && (
                      <span
                        className="badge"
                        style={{
                          fontSize: "0.72rem",
                          background: "rgba(99, 102, 241, 0.08)",
                          color: "var(--brand, #4f46e5)",
                          border: "1px solid rgba(99, 102, 241, 0.25)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        <strong>3x Trío:</strong> {usd(p.packs.trio)}
                      </span>
                    )}
                  </div>
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
                    <div
                      style={{
                        fontSize: "1.3rem",
                        fontWeight: 700,
                        color: "var(--brand, #2563eb)",
                      }}
                    >
                      {usd(p.price)}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 500 }}>
                      {vesFromUsd(p.price)} BCV
                    </div>
                  </div>

                  {p.marginPct != null ? (
                    <div style={{ textAlign: "right" }}>
                      <div className="caption">Margen</div>
                      <span className="badge tone-success" style={{ fontWeight: 600 }}>
                        {p.marginPct}%
                      </span>
                    </div>
                  ) : p.unitsSold > 0 ? (
                    <div style={{ textAlign: "right" }}>
                      <div className="caption">Ventas</div>
                      <div style={{ fontWeight: 600 }}>
                        {p.unitsSold} {plural(p.unitsSold, "ud", "uds")}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "right" }}>
                      <div className="caption">Disponibilidad</div>
                      <span
                        className="caption"
                        style={{ color: "var(--success, #16a34a)", fontWeight: 600 }}
                      >
                        En inventario
                      </span>
                    </div>
                  )}
                </div>

                <div className="row" style={{ marginTop: 6, gap: 8 }}>
                  <Button
                    variant="agent"
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      fontSize: "0.82rem",
                      padding: "6px 8px",
                    }}
                    icon="chart"
                    onClick={() => {
                      setCockpitProductId(p.id);
                      setShowCockpit(true);
                    }}
                  >
                    Cockpit Financiero
                  </Button>
                  <Button
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      fontSize: "0.82rem",
                      padding: "6px 8px",
                    }}
                    icon="edit"
                    onClick={() => openEdit(p)}
                  >
                    Administrar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sheet modal para editar producto */}
      {editing && (
        <Sheet title={`Administrar: ${editing.title}`} onClose={() => setEditing(null)}>
          <div className="stack" style={{ gap: 16 }}>
            {error && (
              <div className="auth-error" role="alert">
                <Icon name="alert" size={16} />
                {error}
              </div>
            )}

            {/* Vista previa de imagen y campo de URL */}
            <div
              className="card compact"
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                background: "var(--bg-subtle, rgba(0,0,0,0.02))",
              }}
            >
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 8,
                  overflow: "hidden",
                  backgroundColor: "var(--surface-sunken)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid var(--line)",
                }}
              >
                {form.imageUrl.trim() ? (
                  <img
                    src={form.imageUrl}
                    alt="Vista previa"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Icon name="tag" size={28} />
                )}
              </div>
              <label className="field" style={{ flex: 1, margin: 0 }}>
                <span>URL de la Imagen</span>
                <input
                  className="input"
                  type="url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
                <span className="caption">
                  Enlace directo a la imagen del producto (CDN, WordPress o web)
                </span>
              </label>
            </div>

            {/* Título del producto */}
            <label className="field">
              <span>Título del Producto</span>
              <input
                className="input"
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>

            {/* Descripción / Copy comercial */}
            <label className="field">
              <span>Descripción y Copy Comercial</span>
              <textarea
                className="input"
                rows={4}
                placeholder="Beneficios, modo de uso, notas para clientes o detalles que el agente usará en WhatsApp..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ resize: "vertical" }}
              />
              <span className="caption">
                Esta descripción la utiliza el agente autónomo para responder dudas en mensajes y
                generar creativos.
              </span>
            </label>

            {/* Precios y Margen */}
            <div className="row" style={{ gap: 12 }}>
              <label className="field" style={{ flex: 1 }}>
                <span>Precio de Venta (USD)</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
                <span
                  className="caption"
                  style={{ color: "var(--brand, #2563eb)", fontWeight: 600, marginTop: 4 }}
                >
                  ~ {vesFromUsd(form.price)} (Tasa oficial BCV)
                </span>
              </label>

              <label className="field" style={{ flex: 1 }}>
                <span>Costo Unitario (USD)</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Ej: 12"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
                <span className="caption" style={{ marginTop: 4 }}>
                  {form.cost !== "" && Number(form.cost) > 0 && form.price > 0 ? (
                    <strong style={{ color: "var(--success, #16a34a)" }}>
                      Margen: {Math.round(((form.price - Number(form.cost)) / form.price) * 100)}%
                      (${(form.price - Number(form.cost)).toFixed(2)} ganancia)
                    </strong>
                  ) : (
                    "Opcional para cálculo de margen"
                  )}
                </span>
              </label>
            </div>

            {/* Peso */}
            <label className="field">
              <span>Peso Estimado (gramos)</span>
              <input
                className="input"
                type="number"
                min={1}
                value={form.weightGrams}
                onChange={(e) => setForm({ ...form, weightGrams: Number(e.target.value) })}
              />
              <span className="caption">
                Utilizado para cotizaciones automáticas de flete con Zoom, MRW y Tealca.
              </span>
            </label>

            {/* Enlace WooCommerce */}
            {editing.externalId && (
              <div
                className="card compact"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(37, 99, 235, 0.04)",
                  padding: "12px 16px",
                  borderRadius: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    WooCommerce HPOS ID #{editing.externalId}
                  </div>
                  <span className="caption">
                    Gestiona inventario avanzado o variaciones en WordPress
                  </span>
                </div>
                <a
                  href={`https://apiv2backecom.daverod.tech/wp-admin/post.php?post=${editing.externalId}&action=edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn ghost sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Icon name="external" size={14} />
                  Abrir en WooCommerce Admin
                </a>
              </div>
            )}

            {/* Botones de acción */}
            <div className="row end" style={{ gap: 8, marginTop: 12 }}>
              <Button type="button" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button
                variant="agent"
                icon="check"
                disabled={saving || !form.title.trim()}
                onClick={handleSave}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </Sheet>
      )}

      {/* Sheet para el Cockpit Financiero & Simulador de Unit Economics */}
      {showCockpit && (
        <Sheet
          wide
          title="Cockpit Financiero & Simulador de Rentabilidad"
          onClose={() => setShowCockpit(false)}
        >
          <PricingCockpit
            ctx={ctx}
            products={products}
            initialProductId={cockpitProductId}
            onClose={() => setShowCockpit(false)}
          />
        </Sheet>
      )}
    </div>
  );
}
