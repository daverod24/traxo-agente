import { useEffect, useState } from "react";
import { post, useResource } from "./api.ts";
import { EmptyState } from "./components.tsx";
import { cop } from "./format.ts";
import type { Connection, Settings, State, StoreStatus, TemplateRow } from "./types.ts";
import { Banner, Button, ChannelMark, Icon, SampleTag, ToneBadge } from "./ui.tsx";
import type { Ctx } from "./views.tsx";

const CITIES: Array<[string, string]> = [
  ["VE-A", "Caracas (Distrito Capital)"],
  ["VE-M", "Mérida (Los Andes)"],
  ["VE-G", "Valencia (Carabobo)"],
  ["VE-L", "Barquisimeto (Lara)"],
  ["VE-V", "Maracaibo (Zulia)"],
  ["VE-B", "Barcelona / Lechería (Anzoátegui)"],
  ["VE-D", "Maracay (Aragua)"],
  ["VE-P", "Porlamar (Nueva Esparta)"],
  ["VE-T", "San Cristóbal (Táchira)"],
  ["VE-F", "Ciudad Guayana / Pto. Ordaz (Bolívar)"],
];
const PROVIDERS: Array<[string, string]> = [
  ["", "Sin preferencia (Costo / Tiempo)"],
  ["mrw", "MRW Venezuela (Agencia / Nacional)"],
  ["zoom", "Grupo Zoom (Nacional)"],
  ["tealca", "Tealca (Envíos asegurados)"],
  ["caracas-express", "Caracas Bajo Demanda (Entrega coordinada)"],
  ["dropi", "Dropi Logística Oficial"],
  ["envia-com", "Envia.com"],
  ["99envios", "99envios"],
];

/* ============================== CONEXIONES ============================== */
const HUB: Array<[string, string, string]> = [
  ["whatsapp", "WhatsApp Business", "Compra asistida y confirmaciones (+58)"],
  [
    "pago-movil",
    "Pago Móvil / Bancrecer / MisPidi / AvilaPay",
    "Conciliación automática y referencias en Bs. BCV",
  ],
  ["crypto", "USDT (Binance Pay / TRC20)", "Cobro en stablecoins sin comisiones"],
  ["dropi", "Dropi Venezuela MCP", "Catálogo y logística nacional"],
  ["instagram", "Instagram DM", "Venta conversacional"],
  ["facebook", "Meta Ads", "Campañas de belleza y bienestar"],
  ["tiktok", "TikTok Ads", "Videos virales de K-Beauty y reseñas"],
  ["api", "WooCommerce REST / MCP", "Sincronización con tienda Headless"],
];

export function Conexiones({ ctx, state }: { ctx: Ctx; state: State }) {
  const st = useResource<StoreStatus>("/api/store/status", ctx.tick);
  const [busy, setBusy] = useState(false);
  const groups: Array<[string, string]> = [
    ["tienda", "Tienda"],
    ["envios", "Plataformas y transportadoras"],
    ["mensajeria", "Mensajería"],
    ["anuncios", "Anuncios"],
  ];
  const s = st.data;
  const zernioLive = state.connections.some((c: Connection) => c.name.includes("Zernio") && c.live);
  const connect = async () => {
    setBusy(true);
    try {
      const r = await post<{
        ok: boolean;
        products?: number;
        customers?: number;
        orders?: number;
        message?: string;
      }>("/api/store/import");
      ctx.toast(
        r.ok
          ? `Importé ${r.products ?? 0} productos, ${r.customers ?? 0} clientes y ${r.orders ?? 0} pedidos`
          : (r.message ?? "No pude importar la tienda"),
      );
      st.reload();
      ctx.refresh();
    } catch (e: any) {
      ctx.toast(e?.message || "No pude importar la tienda");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Conexiones</h1>
          <p className="lead">
            Qué es real y qué es simulado. Las llaves se ponen en <span className="mono">.env</span>{" "}
            o en las variables de tu servidor; Traxo nunca las muestra.
          </p>
        </div>
      </div>

      <section className="card" aria-labelledby="store-h" data-tour="store-card">
        <div className="row between" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
          <div style={{ minWidth: 0 }}>
            <h2 id="store-h">Tu tienda</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {s?.imported
                ? `Conectada · ${s.products} productos, ${s.customers} clientes, ${s.orders} pedidos.`
                : "Todavía no hay datos. Conecta tu tienda y la importo: catálogo, clientes y pedidos."}
            </p>
          </div>
          <ToneBadge tone={s?.imported ? "success" : "attention"}>
            {s?.imported ? "Importada" : "Sin conectar"}
          </ToneBadge>
        </div>
        <div className="plat">
          {(state.demo
            ? [
                ["Davebeauty (Headless WP)", true],
                ["WooCommerce HPOS", true],
                ["Dropi Venezuela MCP", true],
                ["Shopify", false],
              ]
            : [
                ["WooCommerce HPOS", s?.platform === "woocommerce" || true],
                ["Dropi Venezuela MCP", true],
                ["Shopify", s?.platform === "shopify"],
                ["Tiendanube", s?.platform === "tiendanube"],
              ]
          ).map(([name, on]) => (
            <div key={String(name)} className={`plat-i ${on ? "on" : ""}`}>
              <Icon name={on ? "check" : "plug"} size={16} />
              <span>{String(name)}</span>
              {!on && <span className="caption">con .env</span>}
            </div>
          ))}
        </div>
        {state.demo || s?.connected ? (
          <div className="row" style={{ marginTop: 14 }}>
            <Button
              variant="agent"
              icon="plug"
              onClick={connect}
              disabled={busy}
              data-tour="import"
            >
              {busy
                ? "Importando…"
                : s?.imported
                  ? "Volver a importar"
                  : state.demo
                    ? "Conectar e importar la tienda de ejemplo"
                    : "Importar mi tienda"}
            </Button>
            <span className="caption">
              Trae catálogo, clientes y pedidos. Repetirlo no duplica nada.
            </span>
          </div>
        ) : (
          <Banner tone="attention">
            Todavía no hay una tienda conectada. Corre <span className="mono">/traxo:instalar</span>{" "}
            en Claude Code, o define <span className="mono">SHOPIFY_*</span>,{" "}
            <span className="mono">TIENDANUBE_*</span> o <span className="mono">WOOCOMMERCE_*</span>{" "}
            en tu <span className="mono">.env</span> y reinicia.
          </Banner>
        )}
      </section>

      <section className="card" aria-labelledby="zernio-h" data-tour="zernio">
        <div className="row between" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
          <div style={{ minWidth: 0 }}>
            <h2 id="zernio-h">Zernio: un solo conector para todo</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Con una llave de Zernio conecto WhatsApp, Instagram, Messenger y tus cuentas de
              anuncios. Todo lo que llega o sale pasa por aquí.
            </p>
          </div>
          <ToneBadge tone={zernioLive ? "success" : "neutral"}>
            {zernioLive ? "Conectado" : "Simulado"}
          </ToneBadge>
        </div>
        <div className="hub" role="list">
          {HUB.map(([id, name, note]) => (
            <div key={id} className="hub-i" role="listitem">
              <span className={`chbadge hub-mark ch-${id}`} aria-hidden="true">
                {["whatsapp", "instagram", "messenger"].includes(id) ? (
                  <ChannelMark channel={id} size={16} />
                ) : (
                  <Icon name={id === "api" ? "plug" : "megaphone"} size={16} />
                )}
              </span>
              <span style={{ minWidth: 0 }}>
                <strong>{name}</strong>
                <span className="caption" style={{ display: "block" }}>
                  {note}
                </span>
              </span>
            </div>
          ))}
        </div>
        <ol className="why" style={{ marginTop: 14 }}>
          <li>
            Crea tu cuenta en Zernio y conecta tus páginas (WhatsApp, Instagram, Facebook,
            anuncios).
          </li>
          <li>
            Pon <span className="mono">ZERNIO_API_KEY</span> y{" "}
            <span className="mono">ZERNIO_WEBHOOK_SECRET</span> en tu{" "}
            <span className="mono">.env</span> o en las variables de Railway.
          </li>
          <li>
            Apunta el webhook de Zernio a <span className="mono">/webhooks/messaging</span>. Los
            mensajes aparecen en Mensajes y el agente los atiende.
          </li>
        </ol>
        <p className="caption" style={{ margin: "10px 0 0" }}>
          ¿Otra plataforma? Zernio expone una API, y Traxo también es un servidor MCP: Claude puede
          usar cualquier otro conector (Meta, Google Ads, TikTok) junto a Traxo.
        </p>
      </section>

      {groups.map(([kind, title]) => (
        <section key={kind} className="stack tight" aria-label={title}>
          <h3 className="label" style={{ fontFamily: "var(--font-sans)" }}>
            {title}
          </h3>
          {state.connections
            .filter((c: Connection) => c.kind === kind)
            .map((c) => (
              <div
                key={c.name}
                className="card compact row between"
                style={{ flexWrap: "nowrap", alignItems: "flex-start" }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong className="break">{c.name}</strong>
                  <div className="caption break">{c.note}</div>
                </div>
                <ToneBadge tone={c.live ? "success" : "neutral"}>
                  {c.live ? "Conectada" : "Simulada"}
                </ToneBadge>
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}

/* ============================== AJUSTES ============================== */
function Radio<T extends string | number>({
  name,
  value,
  onChange,
  options,
  tour,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<[T, string, string]>;
  tour?: string;
}) {
  return (
    <div className="radios" role="radiogroup" aria-label={name}>
      {options.map(([v, label, d]) => (
        <label
          key={String(v)}
          className={`radio ${value === v ? "on" : ""}`}
          data-tour={tour ? `${tour}-${String(v)}` : undefined}
        >
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} />
          <span>
            <strong>{label}</strong>
            <span className="caption">{d}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function Ajustes({ ctx }: { ctx: Ctx }) {
  const state = useResource<State>("/api/state", ctx.tick).data;
  const tpl = useResource<TemplateRow[]>("/api/templates", 0).data ?? [];
  const [f, setF] = useState<Settings>();
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [aiKeys, setAiKeys] = useState<{
    gemini?: string;
    groq?: string;
    nvidia?: string;
    xai?: string;
  }>({});
  const [aiTestStatus, setAiTestStatus] = useState<
    Record<string, { loading?: boolean; ok?: boolean; message?: string }>
  >({});
  const [cleaningOrders, setCleaningOrders] = useState(false);

  const testAi = async (provider: "gemini" | "groq" | "nvidia" | "xai") => {
    setAiTestStatus((prev) => ({ ...prev, [provider]: { loading: true } }));
    try {
      const res = await post<{ ok: boolean; message: string; model?: string }>(
        "/api/ai/test-connection",
        {
          provider,
          apiKey: aiKeys[provider],
        },
      );
      setAiTestStatus((prev) => ({
        ...prev,
        [provider]: { loading: false, ok: res.ok, message: res.message },
      }));
      ctx.toast(res.ok ? `Conectado: ${res.message}` : `Error: ${res.message}`);
    } catch (e: any) {
      setAiTestStatus((prev) => ({
        ...prev,
        [provider]: { loading: false, ok: false, message: e?.message || "Fallo de conexión" },
      }));
      ctx.toast("Error al probar conexión con IA");
    }
  };

  const cleanOrders = async () => {
    setCleaningOrders(true);
    try {
      const res = await post<{ ok: boolean; remaining: number; message: string }>(
        "/api/orders/clean-dummy",
      );
      ctx.toast(res.message);
      ctx.refresh();
    } catch {
      ctx.toast("Error al limpiar pedidos de prueba");
    } finally {
      setCleaningOrders(false);
    }
  };
  useEffect(() => {
    if (state && !f) setF(state.settings);
  }, [state, f]);
  if (!f || !state) return <div className="skel" style={{ height: 320 }} aria-hidden="true" />;
  const dirty = JSON.stringify(f) !== JSON.stringify(state.settings);
  const sum = f.weights.cost + f.weights.speed + f.weights.reliability || 1;
  const w = (k: "cost" | "speed" | "reliability", v: number) =>
    setF({ ...f, weights: { ...f.weights, [k]: v } });
  const save = async () => {
    setSaving(true);
    const norm = {
      cost: f.weights.cost / sum,
      speed: f.weights.speed / sum,
      reliability: f.weights.reliability / sum,
    };
    const r = await post<Settings & { ok?: boolean }>("/api/settings", {
      ...f,
      weights: norm,
      preferredProvider: f.preferredProvider || undefined,
    });
    setSaving(false);
    ctx.toast(r && "autonomy" in r ? "Guardé tus ajustes" : "No pude guardar los ajustes");
    ctx.refresh();
    setF(undefined);
  };
  const reset = async () => {
    const r = await post<{ ok: boolean; message: string }>("/api/demo/reset");
    setConfirmReset(false);
    ctx.toast(r.message);
    ctx.refresh();
    setF(undefined);
  };
  const acct = ctx.account;

  return (
    <div className="stack">
      <div className="topbar">
        <div>
          <h1>Ajustes</h1>
          <p className="lead">
            Cuánta libertad tiene el agente, cuándo confirma con el cliente y cómo elige
            transportadora.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={save}
          disabled={!dirty || saving}
          data-tour="save-settings"
        >
          {saving ? "Guardando…" : dirty ? "Guardar cambios" : "Sin cambios"}
        </Button>
      </div>

      <div className="two eq">
        <section className="card stack" aria-labelledby="au-h">
          <div>
            <h2 id="au-h">Autonomía</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Gastar en anuncios o créditos siempre pide tu aprobación, en cualquier nivel.
            </p>
          </div>
          <Radio
            name="Autonomía"
            value={f.autonomy}
            onChange={(v) => setF({ ...f, autonomy: v as 0 | 1 })}
            options={[
              [
                1,
                "Nivel 1 · Automático",
                "Genero guías, hago seguimiento y aviso al cliente dentro de tu tope.",
              ],
              [
                0,
                "Nivel 0 · Todo con tu aprobación",
                "Preparo todo, incluida la guía, y tú apruebas con un clic.",
              ],
            ]}
          />
          <label className="field">
            <span>Tope por guía sin pedirte permiso</span>
            <input
              className="input"
              type="number"
              min={5}
              step={5}
              value={f.maxAutoShipmentCost > 500 ? 60 : f.maxAutoShipmentCost}
              onChange={(e) =>
                setF({ ...f, maxAutoShipmentCost: Math.max(5, Number(e.target.value)) })
              }
              disabled={f.autonomy === 0}
            />
            <span className="caption">
              Hoy: ${(f.maxAutoShipmentCost > 500 ? 60 : f.maxAutoShipmentCost).toFixed(2)} USD. Sobre ese valor te pido aprobación.
            </span>
          </label>
        </section>

        <section className="card stack" aria-labelledby="cod-h">
          <div>
            <h2 id="cod-h">Confirmar la contraentrega</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Antes de gastar en una guía, le escribo al cliente por WhatsApp para que confirme (o
              pague ahora con descuento).
            </p>
          </div>
          <Radio
            name="Confirmación"
            tour="cod"
            value={f.confirmCod}
            onChange={(v) => setF({ ...f, confirmCod: v as Settings["confirmCod"] })}
            options={[
              ["off", "Nunca", "Genero la guía sin preguntar."],
              ["risky", "Solo si hay riesgo", "Pregunto cuando el puntaje de riesgo es alto."],
              ["all", "Siempre", "Pregunto en toda contraentrega."],
            ]}
          />
          {f.confirmCod === "risky" && (
            <label className="field">
              <span>Pregunto desde un riesgo de {f.riskThreshold}/100</span>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={f.riskThreshold}
                onChange={(e) => setF({ ...f, riskThreshold: Number(e.target.value) })}
              />
              <span className="caption">
                Cliente nuevo + valor alto + dirección vaga suben el riesgo; un cliente que siempre
                recibe lo baja.
              </span>
            </label>
          )}
          <label className="field">
            <span>Descuento por pagar ahora: {f.prepaidDiscountPct} %</span>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={f.prepaidDiscountPct}
              onChange={(e) => setF({ ...f, prepaidDiscountPct: Number(e.target.value) })}
            />
            <span className="caption">
              Con un pedido prepagado no hay recaudo en riesgo ni comisión de contraentrega.
            </span>
          </label>
        </section>
      </div>

      <div className="two eq">
        <section className="card stack" aria-labelledby="pay-h">
          <div>
            <h2 id="pay-h">Cobranza y Pasarelas (Venezuela)</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Canales de pago habilitados para compra asistida por WhatsApp y checkout online.
            </p>
          </div>
          <div className="grid-two">
            <div className="plat-i on">
              <Icon name="device" size={16} />
              <span>Pago Móvil (Interbancario)</span>
              <span className="caption">Referencia bancaria + Cédula</span>
            </div>
            <div className="plat-i on">
              <Icon name="coin" size={16} />
              <span>USDT (Binance Pay / TRC20)</span>
              <span className="caption">Stablecoins sin comisiones</span>
            </div>
            <div className="plat-i on">
              <Icon name="bank" size={16} />
              <span>Transferencia Bancaria Bs.</span>
              <span className="caption">Banesco, Mercantil, Bancrecer</span>
            </div>
            <div className="plat-i on">
              <Icon name="send" size={16} />
              <span>Zelle USD (Opcional)</span>
              <span className="caption">Comprobante + Correo</span>
            </div>
          </div>
        </section>

        <section className="card stack" aria-labelledby="vert-h">
          <div>
            <h2 id="vert-h">Vertical de Tienda y Catálogo</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Alineación de atributos, unidades y esquema según el nicho de negocio.
            </p>
          </div>
          <div className="grid-two">
            <div className="plat-i on">
              <Icon name="spark" size={16} />
              <span>Belleza y Bienestar (Davebeauty)</span>
              <span className="caption">K-Beauty, Skincare, Goteros, Caps</span>
            </div>
            <div className="plat-i">
              <Icon name="box" size={16} />
              <span>Café de Origen</span>
              <span className="caption">Tostado, Molienda, Variedades</span>
            </div>
            <div className="plat-i">
              <Icon name="bolt" size={16} />
              <span>Repuestos y Autopartes</span>
              <span className="caption">Compatibilidad, Modelo, Año</span>
            </div>
            <div className="plat-i">
              <Icon name="layout" size={16} />
              <span>Perfumería y Moda</span>
              <span className="caption">Fragancias, Tallas, Colores</span>
            </div>
          </div>
        </section>
      </div>

      <section className="card stack" aria-labelledby="car-h">
        <div>
          <h2 id="car-h">Cómo elijo transportadora</h2>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Puntúo cada opción con estos pesos (se normalizan solos) y te explico la decisión.
          </p>
        </div>
        <div className="grid-three">
          {(
            [
              ["cost", "Costo total"],
              ["speed", "Velocidad"],
              ["reliability", "Confiabilidad"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="field">
              <span>
                {label}: {Math.round((f.weights[k] / sum) * 100)} %
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(f.weights[k] * 100)}
                onChange={(e) => w(k, Number(e.target.value) / 100)}
              />
            </label>
          ))}
        </div>
        <div className="grid-three">
          <label className="field">
            <span>Plataforma preferida</span>
            <select
              className="input"
              value={f.preferredProvider ?? ""}
              onChange={(e) => setF({ ...f, preferredProvider: e.target.value || undefined })}
            >
              {PROVIDERS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <span className="caption">Gana en empates.</span>
          </label>
          <label className="field">
            <span>Despachas desde</span>
            <select
              className="input"
              value={f.originDane}
              onChange={(e) => setF({ ...f, originDane: e.target.value })}
            >
              {CITIES.map(([d, c]) => (
                <option key={d} value={d}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="card stack" aria-labelledby="tp-h">
        <div>
          <h2 id="tp-h">Mensajes que le mando al cliente</h2>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Textos cortos, de tú. Con WhatsApp real, los que abren conversación deben estar
            aprobados por Meta como plantillas de utilidad.
          </p>
        </div>
        <div className="tpls">
          {tpl.map((t) => (
            <div key={t.name} className="tpl">
              <span className="caption mono">{t.name}</span>
              <div className="bubble out" style={{ maxWidth: "100%" }}>
                {t.text}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Proveedores de Inteligencia Artificial & LLM */}
      <section className="card stack" aria-labelledby="ai-h">
        <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <Icon name="spark" size={18} />
              <h2 id="ai-h">Proveedores de Inteligencia Artificial & LLM</h2>
            </div>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Cascada de inferencia nativa para generación de copys, briefs ejecutivos y diagnósticos sin SDKs pesados.
            </p>
          </div>
          <ToneBadge tone="agent">Gemini 2.5 + Groq + NVIDIA NIM + xAI</ToneBadge>
        </div>

        <div className="grid-two" style={{ gap: 16 }}>
          {/* Gemini */}
          <div className="card compact stack" style={{ background: "var(--surface-sunken)" }}>
            <div className="row between">
              <strong>Google Gemini (Gemini 2.5 Flash)</strong>
              <span className="caption">Inferencia Principal · Latencia ultrabaja</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input mono"
                type="password"
                placeholder="AIzaSy... (o define GEMINI_API_KEY en Dokploy)"
                value={aiKeys.gemini ?? ""}
                onChange={(e) => setAiKeys({ ...aiKeys, gemini: e.target.value })}
                style={{ flex: 1 }}
              />
              <Button
                sm
                variant="agent"
                disabled={aiTestStatus.gemini?.loading}
                onClick={() => testAi("gemini")}
              >
                {aiTestStatus.gemini?.loading ? "Probando…" : "Probar Conexión"}
              </Button>
            </div>
            {aiTestStatus.gemini?.message && (
              <span
                className="caption"
                style={{ color: aiTestStatus.gemini.ok ? "var(--success)" : "var(--critical)" }}
              >
                {aiTestStatus.gemini.message}
              </span>
            )}
          </div>

          {/* Groq */}
          <div className="card compact stack" style={{ background: "var(--surface-sunken)" }}>
            <div className="row between">
              <strong>Groq Cloud (Llama 3.3 70B Versatile)</strong>
              <span className="caption">Respaldo LPU · Inferencia hiper-veloz</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input mono"
                type="password"
                placeholder="gsk_... (o define GROQ_API_KEY en Dokploy)"
                value={aiKeys.groq ?? ""}
                onChange={(e) => setAiKeys({ ...aiKeys, groq: e.target.value })}
                style={{ flex: 1 }}
              />
              <Button
                sm
                variant="agent"
                disabled={aiTestStatus.groq?.loading}
                onClick={() => testAi("groq")}
              >
                {aiTestStatus.groq?.loading ? "Probando…" : "Probar Conexión"}
              </Button>
            </div>
            {aiTestStatus.groq?.message && (
              <span
                className="caption"
                style={{ color: aiTestStatus.groq.ok ? "var(--success)" : "var(--critical)" }}
              >
                {aiTestStatus.groq.message}
              </span>
            )}
          </div>

          {/* xAI */}
          <div className="card compact stack" style={{ background: "var(--surface-sunken)" }}>
            <div className="row between">
              <strong>xAI (Grok-2 Mini)</strong>
              <span className="caption">Cascada de Respaldo Alternativo</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input mono"
                type="password"
                placeholder="xai-... (o define XAI_API_KEY en Dokploy)"
                value={aiKeys.xai ?? ""}
                onChange={(e) => setAiKeys({ ...aiKeys, xai: e.target.value })}
                style={{ flex: 1 }}
              />
              <Button
                sm
                variant="agent"
                disabled={aiTestStatus.xai?.loading}
                onClick={() => testAi("xai")}
              >
                {aiTestStatus.xai?.loading ? "Probando…" : "Probar Conexión"}
              </Button>
            </div>
            {aiTestStatus.xai?.message && (
              <span
                className="caption"
                style={{ color: aiTestStatus.xai.ok ? "var(--success)" : "var(--critical)" }}
              >
                {aiTestStatus.xai.message}
              </span>
            )}
          </div>

          {/* NVIDIA NIM */}
          <div className="card compact stack" style={{ background: "var(--surface-sunken)" }}>
            <div className="row between">
              <strong>NVIDIA NIM (Llama 3.3 70B Instruct)</strong>
              <span className="caption">Inferencia GPU Enterprise</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input mono"
                type="password"
                placeholder="nvapi-... (o define NVIDIA_API_KEY en Dokploy)"
                value={aiKeys.nvidia ?? ""}
                onChange={(e) => setAiKeys({ ...aiKeys, nvidia: e.target.value })}
                style={{ flex: 1 }}
              />
              <Button
                sm
                variant="agent"
                disabled={aiTestStatus.nvidia?.loading}
                onClick={() => testAi("nvidia")}
              >
                {aiTestStatus.nvidia?.loading ? "Probando…" : "Probar Conexión"}
              </Button>
            </div>
            {aiTestStatus.nvidia?.message && (
              <span
                className="caption"
                style={{ color: aiTestStatus.nvidia.ok ? "var(--success)" : "var(--critical)" }}
              >
                {aiTestStatus.nvidia.message}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Helper Card Dokploy Environment Variables */}
      <section className="card stack" aria-labelledby="dokploy-env-h">
        <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <Icon name="spark" size={18} />
            <h2 id="dokploy-env-h">Variables de Entorno para Dokploy (.env)</h2>
          </div>
          <Button
            sm
            onClick={() => {
              const envText = `GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
XAI_API_KEY=
XAI_MODEL=grok-2-mini
NVIDIA_API_KEY=
GA4_PROPERTY_ID=
GA4_SERVICE_ACCOUNT_B64=
WOOCOMMERCE_URL=https://davebeauty.daverod.tech
WOOCOMMERCE_KEY=
WOOCOMMERCE_SECRET=
TRAXO_BCV_RATE=880.0`;
              navigator.clipboard.writeText(envText);
              ctx.toast("Plantilla de variables copiada al portapapeles");
            }}
          >
            Copiar plantilla .env
          </Button>
        </div>
        <p className="muted" style={{ margin: "4px 0 0" }}>
          Pega estas variables en la pestaña <strong>Environment</strong> de tu aplicación en Dokploy para activar todos los servicios en vivo:
        </p>
        <pre
          className="mono"
          style={{
            background: "var(--surface-sunken)",
            padding: 12,
            borderRadius: 8,
            border: "1px solid var(--line)",
            fontSize: "0.82rem",
            overflowX: "auto",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
{`# Inferencia IA en Cascada (Recomendado)
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
XAI_API_KEY=xai-...
NVIDIA_API_KEY=nvapi-...

# Google Analytics 4 (Data API)
GA4_PROPERTY_ID=123456789
GA4_SERVICE_ACCOUNT_B64=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudC...

# WooCommerce HPOS & Tienda Headless
WOOCOMMERCE_URL=https://davebeauty.daverod.tech
WOOCOMMERCE_KEY=ck_...
WOOCOMMERCE_SECRET=cs_...
TRAXO_BCV_RATE=880.0`}
        </pre>
      </section>

      <div className="two eq">
        <section className="card stack" aria-labelledby="pv-h">
          <h2 id="pv-h">Datos y privacidad (Ley 1581)</h2>
          <ul className="why">
            <li>Solo escribo a clientes con consentimiento; «BAJA» los saca de inmediato.</li>
            <li>En Clientes puedes exportar o borrar los datos personales de cada persona.</li>
            <li>
              Las audiencias de anuncios envían teléfonos cifrados (SHA-256), solo de quienes
              consintieron.
            </li>
            <li>Las llaves nunca se muestran ni salen de tu servidor.</li>
          </ul>
        </section>
        <section className="card stack" aria-labelledby="ac-h">
          <div className="row between">
            <h2 id="ac-h">Tu cuenta</h2>
            <ToneBadge tone={acct.role === "admin" ? "agent" : "neutral"}>
              {state.demo
                ? acct.role === "admin"
                  ? "Admin de ejemplo"
                  : "Cuenta de prueba"
                : "Administrador"}
            </ToneBadge>
          </div>
          <div>
            <strong>{acct.name}</strong>
            <div className="muted break">{acct.email}</div>
          </div>
          {state.demo && <SampleTag />}
          {state.demo && (
            <div className="row">
              <Button icon="play" onClick={ctx.startTour} data-tour="start-tour">
                Ver el recorrido guiado
              </Button>
              {!confirmReset ? (
                <Button onClick={() => setConfirmReset(true)}>Reiniciar datos de ejemplo</Button>
              ) : (
                <>
                  <span className="caption">
                    {acct.role === "admin"
                      ? "Restauro los 90 días de ejemplo."
                      : "Dejo tu espacio vacío otra vez."}
                  </span>
                  <Button variant="primary" onClick={reset}>
                    Sí, reiniciar
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                    No
                  </Button>
                </>
              )}
            </div>
          )}
          <div className="stack tight" style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
            <div className="row" style={{ alignItems: "center", gap: 10 }}>
              <Button
                variant="agent"
                icon="trash"
                onClick={cleanOrders}
                disabled={cleaningOrders}
              >
                {cleaningOrders ? "Limpiando pedidos…" : "Limpiar Pedidos de Prueba (Restaurar 5)"}
              </Button>
            </div>
            <span className="caption">
              Elimina pedidos ficticios y restablece estrictamente los 5 pedidos realistas (#82, #81, #80, #79, #74).
            </span>
          </div>
        </section>
      </div>
      {!state && <EmptyState title="Cargando" />}
      <Banner tone="neutral">Los cambios se aplican a los pedidos que lleguen desde ahora.</Banner>
    </div>
  );
}
