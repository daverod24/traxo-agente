import { useEffect, useRef, useState } from "react";
import { del, download, get, getText, post, useResource } from "./api.ts";
import { EmptyState } from "./components.tsx";
import { dateEs } from "./format.ts";
import type { BuiltPage, SiteDesign, SiteProject, StoreStatus } from "./types.ts";
import { Banner, Button, Icon, Tabs, type Tone, ToneBadge } from "./ui.tsx";
import type { Ctx } from "./views.tsx";

type Catalog = {
  styles: Array<{
    id: string;
    label: string;
    text: string;
    palette: SiteDesign["palette"];
    fonts: SiteDesign["fonts"];
  }>;
  sections: Array<{ id: string; label: string }>;
};

const PLATFORMS: Array<[string, string]> = [
  ["shopify", "Shopify"],
  ["tiendanube", "Tiendanube"],
  ["woocommerce", "WooCommerce"],
  ["otra", "Otra"],
];
const STATUS: Record<SiteProject["status"], { tone: Tone; label: string }> = {
  borrador: { tone: "neutral", label: "Borrador" },
  generado: { tone: "progress", label: "Tema descargado" },
  "en-github": { tone: "agent", label: "En GitHub" },
  subido: { tone: "success", label: "Subido a la tienda" },
};
const TOOLS = ["GitHub", "WebKit Builder", "UI/UX Pro Max", "Emil Kowalski"];

function Swatches({ p }: { p: SiteDesign["palette"] }) {
  return (
    <span className="swatches" aria-hidden="true">
      {[p.bg, p.surface, p.text, p.accent].map((c) => (
        <i key={c} style={{ background: c }} />
      ))}
    </span>
  );
}

/** Constructor de tienda: diseña el tema, míralo, descárgalo y llévalo a tu tienda sin publicar nada solo. */
export function Constructor({ ctx }: { ctx: Ctx }) {
  const list = useResource<SiteProject[]>("/api/builder", ctx.tick);
  const cat = useResource<Catalog>("/api/builder/catalog", 0).data;
  const store = useResource<StoreStatus>("/api/store/status", ctx.tick).data;
  const [sel, setSel] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const rows = list.data ?? [];
  const current = rows.find((r) => r.id === sel) ?? null;
  const showCreate = creating || (list.data && rows.length === 0);

  const head = (
    <div className="topbar">
      <div>
        <h1>Constructor de tienda</h1>
        <p className="lead">
          Diseña una tienda lista para vender con tu catálogo real. Te entrego un tema completo para
          Shopify (o un sitio para otras plataformas); nada se publica solo.
        </p>
      </div>
      {!showCreate && (
        <Button variant="primary" icon="layout" onClick={() => setCreating(true)}>
          Nuevo diseño
        </Button>
      )}
    </div>
  );

  return (
    <div className="stack">
      {head}
      {store && !store.connected && !store.demo && (
        <Banner tone="agent">
          Aún no conectaste tu tienda: diseñaré con el nombre y los productos que tengas. Conéctala
          en Conexiones para usar tu catálogo real.
        </Banner>
      )}
      {showCreate && cat && (
        <Nuevo
          cat={cat}
          platform={store?.platform}
          onCancel={rows.length ? () => setCreating(false) : undefined}
          onDone={(id) => {
            setCreating(false);
            setSel(id);
            list.reload();
            ctx.toast("Diseño creado. Míralo a la derecha.");
          }}
        />
      )}
      {!showCreate && rows.length > 0 && (
        <div className="builder-list" role="list">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              role="listitem"
              className="seg"
              aria-pressed={r.id === (current?.id ?? rows[0]?.id)}
              onClick={() => setSel(r.id)}
            >
              <span className="row between">
                <strong className="break">{r.name}</strong>
                <ToneBadge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</ToneBadge>
              </span>
              <span className="row" style={{ gap: 8 }}>
                <Swatches p={r.design.palette} />
                <span className="caption">
                  {r.platform} · {dateEs(r.updatedAt)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {!showCreate && cat && (current ?? rows[0]) && (
        <Detalle
          key={(current ?? rows[0])?.id}
          project={(current ?? rows[0]) as SiteProject}
          cat={cat}
          ctx={ctx}
          onChanged={list.reload}
          onDeleted={() => {
            setSel(null);
            list.reload();
          }}
        />
      )}
      <PaginasConstruidas ctx={ctx} />
      {!list.data && !list.error && <div className="skel" style={{ height: 240 }} />}
      {list.error && (
        <section className="card">
          <EmptyState
            icon="alert"
            title="No pude cargar los diseños"
            text="Intenta de nuevo en un momento."
          />
        </section>
      )}
    </div>
  );
}

function Nuevo({
  cat,
  platform,
  onDone,
  onCancel,
}: {
  cat: Catalog;
  platform?: string;
  onDone: (id: string) => void;
  onCancel?: () => void;
}) {
  const [style, setStyle] = useState("limpio");
  const [tone, setTone] = useState("cercano");
  const [plat, setPlat] = useState(
    PLATFORMS.some(([id]) => id === platform) ? (platform as string) : "shopify",
  );
  const [sections, setSections] = useState<string[]>(cat.sections.map((s) => s.id));
  const [cod, setCod] = useState(true);
  const [wa, setWa] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await post<{ ok: boolean; message?: string; project?: SiteProject }>(
        "/api/builder",
        {
          style,
          tone,
          platform: plat,
          sections,
          cod,
          whatsapp: wa.replace(/\D/g, "") || undefined,
        },
      );
      if (r.ok && r.project) onDone(r.project.id);
      else setErr(r.message ?? "No pude crear el diseño.");
    } catch {
      setErr("No pude crear el diseño. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack" aria-labelledby="nb-h">
      <h2 id="nb-h">Nuevo diseño</h2>
      <fieldset className="plain">
        <legend className="label">1 · Estilo</legend>
        <div className="seg-grid style-grid">
          {cat.styles.map((s) => (
            <button
              key={s.id}
              type="button"
              className="seg"
              aria-pressed={style === s.id}
              onClick={() => setStyle(s.id)}
            >
              <Swatches p={s.palette} />
              <strong>{s.label}</strong>
              <span className="caption">{s.text}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="two eq">
        <div className="field">
          <span id="tn">2 · Tono de los textos</span>
          <Tabs
            label="Tono"
            value={tone}
            onChange={setTone}
            items={[
              ["cercano", "Cercano"],
              ["profesional", "Profesional"],
              ["divertido", "Divertido"],
            ]}
          />
        </div>
        <label className="field">
          <span>3 · ¿Dónde está tu tienda?</span>
          <select className="input" value={plat} onChange={(e) => setPlat(e.target.value)}>
            {PLATFORMS.map(([id, l]) => (
              <option key={id} value={id}>
                {l}
              </option>
            ))}
          </select>
          <span className="caption">
            {plat === "shopify"
              ? "Genero un tema completo para subir a Shopify."
              : plat === "woocommerce"
                ? "Genero patrones Gutenberg con templateLock: contentOnly y componentes Astro Headless."
                : "Genero un sitio estático y el diseño en JSON."}
          </span>
        </label>
      </div>
      <fieldset className="plain">
        <legend className="label">4 · Secciones de la portada</legend>
        <div className="checks">
          {cat.sections.map((s) => (
            <label key={s.id} className="chk">
              <input
                type="checkbox"
                checked={sections.includes(s.id)}
                onChange={(e) =>
                  setSections((cur) =>
                    e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id),
                  )
                }
              />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="two eq">
        <label className="chk">
          <input type="checkbox" checked={cod} onChange={(e) => setCod(e.target.checked)} />
          Ofrezco pago contraentrega
        </label>
        <label className="field">
          <span>WhatsApp (opcional)</span>
          <input
            className="input"
            inputMode="numeric"
            placeholder="573001112233"
            value={wa}
            onChange={(e) => setWa(e.target.value)}
          />
        </label>
      </div>
      {err && <Banner tone="critical">{err}</Banner>}
      <div className="row" style={{ gap: 12 }}>
        <Button
          variant="primary"
          icon="spark"
          onClick={go}
          disabled={busy || sections.length === 0}
        >
          {busy ? "Diseñando…" : "Diseñar mi tienda"}
        </Button>
        {onCancel && <Button onClick={onCancel}>Cancelar</Button>}
      </div>
      <p className="caption">
        Uso tus productos reales. Las reseñas no se inventan: quedan vacías para que pegues las de
        tus clientes. Si tienes la IA activada, Claude pule los textos.
      </p>
    </section>
  );
}

function Detalle({
  project,
  cat,
  ctx,
  onChanged,
  onDeleted,
}: {
  project: SiteProject;
  cat: Catalog;
  ctx: Ctx;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const d = project.design;
  const [html, setHtml] = useState<string>();
  const [device, setDevice] = useState("pc");
  const [form, setForm] = useState({
    headline: d.copy.headline,
    sub: d.copy.sub,
    cta: d.copy.cta,
    story: d.copy.story,
    tagline: d.tagline,
    whatsapp: d.contact.whatsapp ?? "",
    style: d.style,
    sections: d.sections as string[],
    cod: d.cod,
  });
  const [github, setGithub] = useState(project.githubUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const dirty =
    form.headline !== d.copy.headline ||
    form.sub !== d.copy.sub ||
    form.cta !== d.copy.cta ||
    form.story !== d.copy.story ||
    form.tagline !== d.tagline ||
    form.whatsapp !== (d.contact.whatsapp ?? "") ||
    form.style !== d.style ||
    form.cod !== d.cod ||
    form.sections.join() !== d.sections.join();

  useEffect(() => {
    let off = false;
    getText(`/api/builder/${project.id}/preview`)
      .then((t) => !off && setHtml(t))
      .catch(() => !off && setHtml(undefined));
    return () => {
      off = true;
    };
  }, [project.id, project.updatedAt]);

  const save = async (patch: Record<string, unknown>, ok = "Guardado.") => {
    setBusy(true);
    setErr("");
    try {
      const r = await post<{ ok: boolean; message?: string }>(`/api/builder/${project.id}`, patch);
      if (r.ok) {
        ctx.toast(ok);
        onChanged();
      } else setErr(r.message ?? "No pude guardar.");
    } catch (e) {
      setErr(
        (e as Error).message.includes("400")
          ? "Revisa los datos: algo no es válido."
          : "No pude guardar.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveDesign = () => {
    const st = cat.styles.find((s) => s.id === form.style);
    const order = cat.sections.map((s) => s.id).filter((id) => form.sections.includes(id));
    void save({
      design: {
        tagline: form.tagline,
        style: form.style,
        ...(form.style !== d.style && st ? { palette: st.palette, fonts: st.fonts } : {}),
        sections: order,
        cod: form.cod,
        contact: { whatsapp: form.whatsapp.replace(/\D/g, "") || undefined },
        copy: { headline: form.headline, sub: form.sub, cta: form.cta, story: form.story },
      },
    });
  };

  const [publishing, setPublishing] = useState(false);
  const [publishingHeadless, setPublishingHeadless] = useState(false);
  const [exportingAstro, setExportingAstro] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);
  const [headlessResult, setHeadlessResult] = useState<{
    slug: string;
    publicApiUrl: string;
  } | null>(null);

  const [publishedPage, setPublishedPage] = useState<{
    id?: number;
    link?: string;
    slug?: string;
    title?: string;
  } | null>(null);
  const defaultFunnelSlug = `${(d.brand || "funnel")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${project.id.slice(-6)}`;
  const store = useResource<StoreStatus>("/api/store/status", ctx.tick).data;
  const storeUrl =
    store?.url && !store.url.includes("nginx")
      ? store.url.replace(/\/$/, "")
      : typeof window !== "undefined" && window.location.hostname !== "localhost"
        ? `${window.location.protocol}//${window.location.hostname.replace(/^traxo\./, "api.")}`
        : "http://localhost:8080";

  // Estado del Editor de la Escalera de Packs
  const primaryProductPrice = d.products[0]?.price
    ? d.products[0].price > 1000
      ? d.products[0].price / 100
      : d.products[0].price
    : 24.99;

  const [packBasePrice, setPackBasePrice] = useState(primaryProductPrice);
  const [duoDiscount, setDuoDiscount] = useState(10);
  const [trioDiscount, setTrioDiscount] = useState(20);
  const bcvRate = 880.0;

  // Precios computados en tiempo real
  const p1Usd = packBasePrice;
  const p1Ves = p1Usd * bcvRate;

  const p2Full = packBasePrice * 2;
  const p2Save = p2Full * (duoDiscount / 100);
  const p2Usd = p2Full - p2Save;
  const p2Ves = p2Usd * bcvRate;

  const p3Full = packBasePrice * 3;
  const p3Save = p3Full * (trioDiscount / 100);
  const p3Usd = p3Full - p3Save;
  const p3Ves = p3Usd * bcvRate;

  const getZip = async () => {
    try {
      await download(`/api/builder/${project.id}/theme.zip`, "paquete-headless-astro.zip");
      onChanged();
    } catch {
      ctx.toast("No pude descargar el archivo zip.");
    }
  };

  const publishHeadless = async () => {
    setPublishingHeadless(true);
    try {
      const res = await post<{
        ok: boolean;
        published: boolean;
        slug: string;
        publicApiUrl: string;
        message?: string;
      }>(`/api/builder/${project.id}/publish-headless`, {});
      if (res.ok) {
        setHeadlessResult({ slug: res.slug, publicApiUrl: res.publicApiUrl });
        ctx.toast(res.message ?? "Funnel publicado en la API Headless.");
        onChanged();
      } else {
        ctx.toast("No se pudo publicar en la API Headless.");
      }
    } catch {
      ctx.toast("Error de red al publicar en la API.");
    } finally {
      setPublishingHeadless(false);
    }
  };

  const handleExportAstro = async () => {
    setExportingAstro(true);
    try {
      const fileSlug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await download(`/api/builder/${project.id}/export-astro`, `${fileSlug}-landing.astro`);
      ctx.toast("Descarga de paquete Astro completada.");
    } catch {
      ctx.toast("Error al descargar paquete Astro.");
    } finally {
      setExportingAstro(false);
    }
  };

  const handleExportHtml = async () => {
    setExportingHtml(true);
    try {
      const fileSlug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await download(`/api/builder/${project.id}/export-html`, `${fileSlug}-landing.html`);
      ctx.toast("Descarga de landing HTML autónoma completada.");
    } catch {
      ctx.toast("Error al descargar landing HTML autónoma.");
    } finally {
      setExportingHtml(false);
    }
  };

  const publishToWp = async () => {
    setPublishing(true);
    try {
      const res = await post<{
        ok: boolean;
        message?: string;
        page?: { id?: number; link?: string; slug?: string; title?: string };
      }>(`/api/builder/${project.id}/publish-wp`, {});
      if (res.ok) {
        if (res.page) setPublishedPage(res.page);
        ctx.toast(res.message ?? "Página publicada con éxito en WordPress.");
        onChanged();
      } else {
        ctx.toast(res.message ?? "No se pudo publicar en WordPress.");
      }
    } catch {
      ctx.toast("Error de conexión al publicar en WordPress.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="builder-grid">
      <section className="card preview-card" aria-labelledby="pv-h">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2 id="pv-h">Vista previa en Vivo</h2>
          <Tabs
            label="Dispositivo"
            value={device}
            onChange={setDevice}
            items={[
              ["pc", "Computador"],
              ["phone", "Celular"],
            ]}
          />
        </div>
        <div className={`preview-stage ${device}`}>
          {html ? (
            <iframe
              title={`Vista previa de ${d.brand}`}
              className="preview-frame"
              sandbox=""
              srcDoc={html}
            />
          ) : (
            <div className="skel" style={{ height: 520 }} />
          )}
        </div>
        <p className="caption" style={{ marginTop: 8 }}>
          Vista previa interactiva responsiva. En Astro Storefront se consumen los tokens y
          componentes nativos.
        </p>
      </section>

      <div className="stack" style={{ gap: 16 }}>
        {/* =========================================================================
            SECCIÓN: ACCIONES UNIVERSAL DUAL-MODE BUILDER
        ========================================================================= */}
        <section className="card stack" aria-labelledby="pb-h" style={{ padding: 20 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <div>
              <h2 id="pb-h" style={{ margin: 0, fontSize: 17 }}>
                Publicación & Exportación
              </h2>
              <span className="caption">Universal Headless API & Standalone Landing Generator</span>
            </div>
            <ToneBadge tone={STATUS[project.status].tone}>{STATUS[project.status].label}</ToneBadge>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <Button
              variant="primary"
              icon="spark"
              sm
              disabled={publishingHeadless}
              onClick={publishHeadless}
            >
              {publishingHeadless ? "Publicando..." : "Publicar en API Headless"}
            </Button>
            <Button
              variant="agent"
              icon="layout"
              sm
              disabled={exportingAstro}
              onClick={handleExportAstro}
            >
              {exportingAstro ? "Descargando..." : "Descargar Paquete Astro"}
            </Button>
            <Button variant="" icon="device" sm disabled={exportingHtml} onClick={handleExportHtml}>
              {exportingHtml ? "Descargando..." : "Exportar Landing HTML Autónoma"}
            </Button>
            <Button variant="ghost" icon="upload" sm onClick={getZip}>
              Descargar .zip
            </Button>
            {project.platform === "woocommerce" && (
              <Button variant="ghost" icon="upload" sm disabled={publishing} onClick={publishToWp}>
                {publishing ? "Publicando en WP..." : "Publicar en WordPress"}
              </Button>
            )}
          </div>

          {/* Información de Publicación Headless Activa */}
          {(headlessResult || project.status === "subido") && (
            <div
              style={{
                marginTop: 12,
                padding: "12px 14px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: 8,
              }}
            >
              <div className="row between" style={{ alignItems: "center", marginBottom: 6 }}>
                <strong style={{ fontSize: 13, color: "#10b981" }}>
                  ✓ Funnel Activo en API Headless:
                </strong>
                <span className="badge tone-success">Listo para Storefront</span>
              </div>
              <div className="mono" style={{ fontSize: 12, wordBreak: "break-all" }}>
                GET {headlessResult?.publicApiUrl ?? `/api/public/funnels/${defaultFunnelSlug}`}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <a
                  className="btn sm ghost"
                  href={headlessResult?.publicApiUrl ?? `/api/public/funnels/${defaultFunnelSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11 }}
                >
                  Probar API en vivo (JSON)
                </a>
              </div>
            </div>
          )}

          {project.platform === "woocommerce" && (publishedPage || project.status === "subido") && (
            <div
              className="card"
              style={{
                marginTop: 10,
                padding: 12,
                background: "var(--surface-sunken, #f8fafc)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="row between" style={{ marginBottom: 6 }}>
                <strong style={{ fontSize: 13 }}>📍 Ubicación en WordPress:</strong>
                <ToneBadge tone="success">Publicado en WordPress</ToneBadge>
              </div>
              <ul className="caption" style={{ margin: "0 0 8px 16px", padding: 0 }}>
                <li>
                  <strong>Base de Datos Traxo:</strong> Tabla <code>SiteProject</code> (ID:{" "}
                  {project.id})
                </li>
                <li>
                  <strong>WordPress CMS:</strong> Tabla <code>wp_posts</code> (Página Gutenberg con{" "}
                  <code>templateLock="contentOnly"</code>)
                </li>
              </ul>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <a
                  className="btn primary sm"
                  href={publishedPage?.link || `${storeUrl}/inicio/`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🌐 Ver página en vivo
                </a>
                <a
                  className="btn ghost sm"
                  href={
                    publishedPage?.id
                      ? `${storeUrl}/wp-admin/post.php?post=${publishedPage.id}&action=edit`
                      : `${storeUrl}/wp-admin/edit.php?post_type=page`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ✏️ Editar en wp-admin
                </a>
              </div>
            </div>
          )}
        </section>

        {/* =========================================================================
            SECCIÓN: EDITOR VISUAL DE LA ESCALERA DE PACKS (1X, 2X, 3X)
        ========================================================================= */}
        <section className="card stack" style={{ padding: 20 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>Editor Visual de Escalera de Packs</h2>
              <span className="caption">
                Reglas canónicas de AOV (1x PVP, 2x -10%, 3x -20% + Envío Gratis COD)
              </span>
            </div>
            <span className="badge tone-progress">Tasa BCV {bcvRate} Bs./USD</span>
          </div>

          {/* Controles de Configuración */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 10,
              marginTop: 8,
            }}
          >
            <label className="field">
              <span className="caption" style={{ fontWeight: 600 }}>
                PVP Base ($ USD)
              </span>
              <input
                type="number"
                step="0.5"
                min="1"
                className="input"
                style={{ fontSize: 13 }}
                value={packBasePrice}
                onChange={(e) => setPackBasePrice(Math.max(1, Number(e.target.value)))}
              />
            </label>
            <label className="field">
              <span className="caption" style={{ fontWeight: 600 }}>
                Descuento Dúo (%)
              </span>
              <input
                type="number"
                min="0"
                max="50"
                className="input"
                style={{ fontSize: 13 }}
                value={duoDiscount}
                onChange={(e) => setDuoDiscount(Math.max(0, Number(e.target.value)))}
              />
            </label>
            <label className="field">
              <span className="caption" style={{ fontWeight: 600 }}>
                Descuento Trío (%)
              </span>
              <input
                type="number"
                min="0"
                max="60"
                className="input"
                style={{ fontSize: 13 }}
                value={trioDiscount}
                onChange={(e) => setTrioDiscount(Math.max(0, Number(e.target.value)))}
              />
            </label>
          </div>

          {/* Tarjetas de Previsualización de Packs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginTop: 10,
            }}
          >
            {/* 1x */}
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                textAlign: "center",
              }}
            >
              <div className="caption" style={{ fontWeight: 700 }}>
                1x Unidad
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, margin: "4px 0" }}>
                ${p1Usd.toFixed(2)}
              </div>
              <div className="caption" style={{ fontSize: 11 }}>
                ≈ Bs. {p1Ves.toLocaleString("es-VE")}
              </div>
              <span
                className="caption"
                style={{ color: "var(--ink-muted)", display: "block", marginTop: 4 }}
              >
                PVP Estándar
              </span>
            </div>

            {/* 2x Dúo */}
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.05)",
                border: "1.5px solid #10b981",
                textAlign: "center",
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: -8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#10b981",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 999,
                }}
              >
                -{duoDiscount}%
              </span>
              <div className="caption" style={{ fontWeight: 700, color: "#10b981" }}>
                Pack Dúo (2x)
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, margin: "4px 0" }}>
                ${p2Usd.toFixed(2)}
              </div>
              <div className="caption" style={{ fontSize: 11 }}>
                ≈ Bs. {p2Ves.toLocaleString("es-VE")}
              </div>
              <div className="caption" style={{ color: "#059669", fontWeight: 600, marginTop: 4 }}>
                Ahorra ${p2Save.toFixed(2)}
              </div>
            </div>

            {/* 3x Trío */}
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "rgba(245, 158, 11, 0.05)",
                border: "1.5px solid #f59e0b",
                textAlign: "center",
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: -8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#f59e0b",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 999,
                }}
              >
                Envío Gratis
              </span>
              <div className="caption" style={{ fontWeight: 700, color: "#b45309" }}>
                Pack Trío (3x)
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, margin: "4px 0" }}>
                ${p3Usd.toFixed(2)}
              </div>
              <div className="caption" style={{ fontSize: 11 }}>
                ≈ Bs. {p3Ves.toLocaleString("es-VE")}
              </div>
              <div className="caption" style={{ color: "#b45309", fontWeight: 600, marginTop: 4 }}>
                Ahorra ${p3Save.toFixed(2)}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECCIÓN: REPOSITORIO GITHUB (OPCIONAL)
        ========================================================================= */}
        <section className="card stack" style={{ padding: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>Repositorio GitHub (Opcional)</h2>
          <span className="caption">
            Guarda la URL del repositorio donde sincronizaste el paquete Astro o la landing
            autónoma.
          </span>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <label className="sr-only" htmlFor="gh">
              Enlace del repositorio en GitHub
            </label>
            <input
              id="gh"
              className="input"
              placeholder="https://github.com/tu-usuario/tu-tienda"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <Button
              sm
              disabled={busy || !github}
              onClick={() =>
                save({ githubUrl: github, status: "en-github" }, "Anotado: está en GitHub.")
              }
            >
              Guardar enlace
            </Button>
            <Button
              sm
              disabled={busy || project.status === "subido"}
              onClick={() => save({ status: "subido" }, "Anotado: ya está en tu tienda.")}
            >
              Ya lo subí
            </Button>
          </div>
        </section>

        <section className="card stack" aria-labelledby="ed-h">
          <h2 id="ed-h">Textos y estilo</h2>
          <label className="field">
            <span>Título de la portada</span>
            <input
              className="input"
              maxLength={90}
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Frase corta de la marca</span>
            <input
              className="input"
              maxLength={120}
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Descripción</span>
            <textarea
              className="input"
              rows={2}
              maxLength={220}
              value={form.sub}
              onChange={(e) => setForm({ ...form, sub: e.target.value })}
              style={{ padding: 12 }}
            />
          </label>
          <label className="field">
            <span>Texto del botón</span>
            <input
              className="input"
              maxLength={28}
              value={form.cta}
              onChange={(e) => setForm({ ...form, cta: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Historia de la marca</span>
            <textarea
              className="input"
              rows={3}
              maxLength={600}
              value={form.story}
              placeholder="Cuenta quién está detrás y por qué lo haces. Solo escribe lo que es cierto."
              onChange={(e) => setForm({ ...form, story: e.target.value })}
              style={{ padding: 12 }}
            />
          </label>
          <fieldset className="plain">
            <legend className="label">Estilo</legend>
            <div className="seg-grid style-grid">
              {cat.styles.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="seg"
                  aria-pressed={form.style === s.id}
                  onClick={() => setForm({ ...form, style: s.id })}
                >
                  <Swatches p={s.palette} />
                  <strong>{s.label}</strong>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="plain">
            <legend className="label">Secciones</legend>
            <div className="checks">
              {cat.sections.map((s) => (
                <label key={s.id} className="chk">
                  <input
                    type="checkbox"
                    checked={form.sections.includes(s.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sections: e.target.checked
                          ? [...form.sections, s.id]
                          : form.sections.filter((x) => x !== s.id),
                      })
                    }
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="two eq">
            <label className="chk">
              <input
                type="checkbox"
                checked={form.cod}
                onChange={(e) => setForm({ ...form, cod: e.target.checked })}
              />
              Pago contraentrega
            </label>
            <label className="field">
              <span>WhatsApp</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="573001112233"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </label>
          </div>
          {err && <Banner tone="critical">{err}</Banner>}
          <div className="row between">
            <Button
              variant="primary"
              icon="check"
              disabled={busy || !dirty || form.sections.length === 0}
              onClick={saveDesign}
            >
              Guardar cambios
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                if (!confirm("¿Borrar este diseño? No afecta lo que ya subiste a tu tienda."))
                  return;
                await del(`/api/builder/${project.id}`);
                onDeleted();
              }}
            >
              <Icon name="x" size={14} /> Borrar
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Marco con la página publicada. Si no carga en unos segundos (o el sitio no permite iframe), deja la captura y el enlace. */
function PageViewer({ page, device }: { page: BuiltPage; device: string }) {
  const [state, setState] = useState<"cargando" | "listo" | "falla">("cargando");
  const timer = useRef<number | undefined>(undefined);
  // Chromium dispara «load» aunque el sitio rechace el marco: por eso se le pregunta antes al servidor.
  useEffect(() => {
    let off = false;
    get<{ embeddable: boolean }>(`/api/builder/pages/${page.id}/embeddable`)
      .then((r) => !off && !r.embeddable && setState("falla"))
      .catch(() => {});
    fetch(page.url, { mode: "no-cors", referrerPolicy: "no-referrer" }).catch(
      () => !off && setState("falla"),
    );
    return () => {
      off = true;
    };
  }, [page.id, page.url]);
  useEffect(() => {
    setState("cargando");
    timer.current = window.setTimeout(() => setState((s) => (s === "listo" ? s : "falla")), 8000);
    return () => window.clearTimeout(timer.current);
  }, [page.url]);
  return (
    <div className={`preview-stage ${device}`}>
      {state === "falla" ? (
        <div className="page-fallback">
          <img
            src={device === "phone" ? page.shots.mobile : page.shots.pc}
            alt={`Captura de ${page.name}`}
            loading="lazy"
          />
          <p className="caption">
            No pude mostrar la página aquí. Esta es una captura;{" "}
            <a href={page.url} target="_blank" rel="noopener noreferrer">
              ábrela en una pestaña nueva
            </a>
            .
          </p>
        </div>
      ) : (
        <iframe
          title={`Vista previa de ${page.name}`}
          className="preview-frame"
          src={page.url}
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          onLoad={() => {
            window.clearTimeout(timer.current);
            setState((s) => (s === "falla" ? s : "listo"));
          }}
        />
      )}
    </div>
  );
}

/** Páginas ya construidas y publicadas. En la demo trae una de referencia; en una cuenta nueva sale vacío. */
function PaginasConstruidas({ ctx }: { ctx: Ctx }) {
  const pages = useResource<BuiltPage[]>("/api/builder/pages", ctx.tick).data;
  const [open, setOpen] = useState<string | null>(null);
  const [device, setDevice] = useState("pc");
  if (!pages) return null;
  const current = pages.find((p) => p.id === open);
  return (
    <section className="card stack" aria-labelledby="pc-h" data-tour="built-pages">
      <div className="row between">
        <h2 id="pc-h">Páginas construidas</h2>
        <span className="caption">
          {pages.length} {pages.length === 1 ? "página" : "páginas"}
        </span>
      </div>
      {pages.length === 0 ? (
        <EmptyState
          icon="layout"
          title="Aún no has construido páginas"
          text="Cuando construyas una landing o una tienda con el Constructor y Claude, la verás aquí con su vista previa."
        />
      ) : (
        <div className="built-list">
          {pages.map((p) => (
            <article key={p.id} className="built-card">
              <img
                className="built-shot"
                src={p.shots.pc}
                alt={`Captura de ${p.name}`}
                loading="lazy"
              />
              <div className="stack tight">
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0 }}>{p.name}</h3>
                  <ToneBadge tone="agent">Referencia</ToneBadge>
                </div>
                <p style={{ margin: 0 }}>{p.description}</p>
                <span className="chips-static" aria-label="Herramientas usadas">
                  {p.tools.map((t) => (
                    <span key={t} className="tool">
                      {t}
                    </span>
                  ))}
                </span>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <a className="btn primary" href={p.url} target="_blank" rel="noopener noreferrer">
                    Abrir página
                  </a>
                  <Button onClick={() => setOpen(open === p.id ? null : p.id)}>
                    {open === p.id ? "Ocultar vista previa" : "Ver vista previa"}
                  </Button>
                  {p.repo && (
                    <a
                      className="btn ghost"
                      href={p.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Código
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {current && (
        <div className="stack tight">
          <div className="row between">
            <h3 style={{ margin: 0 }}>Vista previa · {current.name}</h3>
            <Tabs
              label="Dispositivo"
              value={device}
              onChange={setDevice}
              items={[
                ["pc", "Computador"],
                ["phone", "Celular"],
              ]}
            />
          </div>
          <PageViewer page={current} device={device} />
        </div>
      )}
    </section>
  );
}
