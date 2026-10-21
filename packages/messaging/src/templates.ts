import { formatBimoneda, formatCOP } from "@traxo/core";
import type { TemplateName } from "./types.ts";

export type Vars = {
  nombre: string;
  guia?: string;
  transportadora?: string;
  url?: string;
  monto?: number;
  tienda: string;
  dias?: number;
  /** Descuento por pagar ahora y el monto que quedaría. */
  descuentoPct?: number;
  montoPrepago?: number;
  /** Datos bancarios y pagos en Venezuela */
  banco?: string;
  telefono?: string;
  cedula?: string;
  montoBs?: string | number;
  tasaBcv?: number;
  emailZelle?: string;
  titular?: string;
  redUsdt?: string;
  billeteraUsdt?: string;
  referencia?: string;
};

const first = (n: string): string => n.split(" ")[0] ?? n;

const isVe = () => process.env.MARKET === "VE" || process.env.TRAXO_CURRENCY === "USD";
const BCV = () => Number(process.env.TRAXO_BCV_RATE) || 880.0;

const fmtMonto = (m: number | undefined, rate?: number): string => {
  if (m == null) return "";
  if (isVe() || m < 1000) return formatBimoneda(m, rate ?? BCV());
  return formatCOP(m);
};

/** Textos en español adaptados a Venezuela y Colombia, tuteo, claros. */
export const TEMPLATES: Record<TemplateName, (v: Vars) => string> = {
  pedido_en_camino: (v) =>
    `Hola ${first(v.nombre)}, tu pedido de ${v.tienda} ya va en camino con ${v.transportadora ?? (isVe() ? "Flash Courier" : "la transportadora")}. Guía ${v.guia}. Llega en ${v.dias ?? (isVe() ? 2 : 3)} días hábiles. Rastréalo aquí: ${v.url}`,
  llega_hoy: (v) =>
    `Hola ${first(v.nombre)}, tu pedido llega hoy. ${v.monto ? `Ten listos ${fmtMonto(v.monto, v.tasaBcv)} para pagar al recibir. ` : ""}Guía ${v.guia}.`,
  novedad_entrega: (v) =>
    `Hola ${first(v.nombre)}, la transportadora no pudo entregar tu pedido (guía ${v.guia}). ¿Quieres que lo reprogramemos para mañana? Responde SÍ o dime otra dirección.`,
  confirmar_contraentrega: (v) =>
    `Hola ${first(v.nombre)}, recibimos tu pedido en ${v.tienda}. Pagas ${fmtMonto(v.monto ?? 0, v.tasaBcv)} al recibir con ${v.transportadora ?? (isVe() ? "Flash Courier" : "la transportadora")}. ¿Confirmas tu dirección y que estarás para recibirlo?${v.descuentoPct && v.montoPrepago ? ` Si prefieres pagar ahora tienes ${v.descuentoPct} % de descuento: ${fmtMonto(v.montoPrepago, v.tasaBcv)}.` : ""}`,
  pago_recibido: (v) =>
    `Recibimos tu pago, ${first(v.nombre)}. Preparamos tu pedido de ${v.tienda} y te avisamos cuando salga.`,
  pedido_cancelado: (v) =>
    `Listo, ${first(v.nombre)}, cancelamos tu pedido de ${v.tienda}. Cuando quieras volver a pedir, aquí estamos.`,
  datos_pago_movil: (v) =>
    `Hola ${first(v.nombre)}, para procesar tu pedido en ${v.tienda}, realiza tu Pago Móvil por ${fmtMonto(v.monto, v.tasaBcv)}:\n• Banco: ${v.banco ?? "Bancrecer / Banesco"}\n• Teléfono: ${v.telefono ?? "0412-1234567"}\n• Cédula/RIF: ${v.cedula ?? "V-12345678"}\nPor favor responde con el comprobante o los últimos 4 dígitos de la referencia.`,
  datos_zelle: (v) =>
    `Hola ${first(v.nombre)}, datos para tu pago vía Zelle ($ ${v.monto ? v.monto.toFixed(2) : "0.00"} USD) para ${v.tienda}:\n• Correo Zelle: ${v.emailZelle ?? "pagos@davebeauty.ve"}\n• Titular: ${v.titular ?? "Davebeauty C.A."}\nEnvíanos captura y nombre del titular al transferir.`,
  datos_usdt: (v) =>
    `Hola ${first(v.nombre)}, datos para pagar vía USDT (${v.monto ? v.monto.toFixed(2) : "0.00"} USDT) para ${v.tienda}:\n• Red: ${v.redUsdt ?? "TRC20"}\n• Billetera: ${v.billeteraUsdt ?? "TXdavebeauty2026trc20official"}\nO Binance Pay ID: 28491823.\nEnvíanos el Hash (TxID) o captura una vez realizado.`,
  datos_transferencia_bs: (v) =>
    `Hola ${first(v.nombre)}, datos para tu transferencia bancaria en Bolívares (${fmtMonto(v.monto, v.tasaBcv)}) para ${v.tienda}:\n• Banco: ${v.banco ?? "Banesco Banco Universal"}\n• Cuenta: ${v.telefono ?? "0134-0000-00-0000000000"}\n• Titular: ${v.titular ?? "Davebeauty C.A."}\n• RIF: ${v.cedula ?? "J-50000000-0"}\nRespóndenos con el número de referencia al realizarla.`,
  pago_conciliado: (v) =>
    `¡Excelente, ${first(v.nombre)}! Tu pago de ${fmtMonto(v.monto, v.tasaBcv)} (Ref: ${v.referencia ?? "verificada"}) fue conciliado exitosamente. Tu pedido en ${v.tienda} ya está en preparación para despacho con ${v.transportadora ?? "Flash Courier"}.`,
};

export function render(name: TemplateName, vars: Vars): string {
  return TEMPLATES[name](vars);
}
