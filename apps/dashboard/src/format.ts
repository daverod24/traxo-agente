/**
 * Formatos del sistema para Venezuela (Davebeauty y Headless Multi-Tienda) y LatAm.
 * Bimoneda nativa: USD (`$ 55.00`) y VES (`Bs. 48.458,65` a tasa oficial BCV).
 */

export const money = (n: number, currency: string = "USD"): string => {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (currency === "VES") {
    return `${sign}Bs. ${abs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${sign}$ ${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/** Formateador principal en USD con decimales */
export const usd = (n: number): string => money(n, "USD");

export const usdShort = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `$ ${(n / 1_000_000).toFixed(1).replace(".", ",")} M`;
  return usd(n);
};

/** Alias compatible para código existente */
export const cop = usd;
export const copShort = usdShort;

export const DEFAULT_BCV_RATE = 880.0;

/** Conversión referencial a Bolívares usando la tasa BCV */
export const vesFromUsd = (usd: number, rate: number = DEFAULT_BCV_RATE): string => {
  return money(usd * rate, "VES");
};

/** Formateo bimoneda completo: USD principal con equivalente oficial en Bolívares */
export const bimoneda = (usd: number, rate: number = DEFAULT_BCV_RATE): string => {
  return `${money(usd, "USD")} (${money(usd * rate, "VES")})`;
};

const VE_TZ = "America/Caracas";

function parseDateSafe(iso: string | Date | null | undefined): Date | null {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const veDateFmt = new Intl.DateTimeFormat("es-VE", {
  timeZone: VE_TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const veTimeFmt = new Intl.DateTimeFormat("es-VE", {
  timeZone: VE_TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export const dateEs = (iso: string | Date | null | undefined): string => {
  const d = parseDateSafe(iso);
  if (!d) return "—";
  return veDateFmt.format(d).replace(/\./g, "").trim();
};

export const timeEs = (iso: string | Date | null | undefined): string => {
  const d = parseDateSafe(iso);
  if (!d) return "—";
  return veTimeFmt.format(d).trim();
};

export const dateTimeVe = (iso: string | Date | null | undefined): string => {
  const d = parseDateSafe(iso);
  if (!d) return "—";
  return `${dateEs(d)} · ${timeEs(d)} VET`;
};

/** Formato telefónico E.164: +58 Venezuela (predeterminado) o +57 Colombia */
export const phoneEs = (e164: string): string => {
  const ve = /^\+58(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (ve) return `+58 ${ve[1]} ${ve[2]} ${ve[3]}`;
  const co = /^\+57(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (co) return `+57 ${co[1]} ${co[2]} ${co[3]}`;
  return e164;
};

export const days = (n: number): string => `${n} ${n === 1 ? "día hábil" : "días hábiles"}`;

export const score = (n: number | null): string =>
  n == null ? "—" : n.toFixed(2).replace(".", ",");
export const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** Transportadoras y rutas de despacho (Venezuela y regionales) */
const VIA: Record<string, string> = {
  dropi: "Flash Courier (Dropi VE)",
  flash: "Flash Courier (Dropi VE)",
  mrw: "MRW Venezuela",
  zoom: "Grupo Zoom",
  tealca: "Tealca",
  "caracas-express": "Caracas Bajo Demanda (Entrega coordinada)",
  "envia-com": "Envia.com",
  "99envios": "99envios",
  coordinadora: "Coordinadora",
  interrapidisimo: "Interrapidísimo",
  servientrega: "Servientrega",
  "envia-co": "Envía",
};
export const viaLabel = (provider: string): string => VIA[provider] ?? provider;

/** Etiquetas cortas para tablas y badges */
export const viaShort = (provider: string): string =>
  provider === "dropi" || provider === "flash"
    ? "Flash Courier"
    : provider === "mrw"
      ? "MRW"
      : provider === "zoom"
        ? "Zoom"
        : provider === "tealca"
          ? "Tealca"
          : provider === "caracas-express"
            ? "Caracas"
            : (VIA[provider] ?? provider);

/** Métodos de pago venezolanos e internacionales */
export const paymentLabel = (p: string): string => {
  const map: Record<string, string> = {
    pago_movil: "Pago Móvil",
    usdt: "USDT (Binance Pay / TRC20)",
    transferencia_bs: "Transferencia Bancaria en Bs.",
    zelle: "Zelle USD",
    cod: "Cobro en Destino (COD)",
    prepaid: "Prepagado",
  };
  return map[p] ?? p;
};
