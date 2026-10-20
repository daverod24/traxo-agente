import { z } from "zod";

export const CurrencySchema = z.enum(["USD", "VES", "COP", "PEN"]);
export type Currency = z.infer<typeof CurrencySchema>;

export const FxSnapshotSchema = z.object({
  source: z.string().min(1),
  rate: z.string().regex(/^\d+(\.\d{1,6})?$/),
  publishedAt: z.string(),
  capturedAt: z.string(),
});
export type FxSnapshot = z.infer<typeof FxSnapshotSchema>;

/**
 * Contrato Money con precisión decimal exacta en formato string.
 * Prohíbe números flotantes para totales o precios en operaciones financieras.
 */
export const MoneySchema = z.object({
  amount: z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, "El monto debe ser una representación decimal exacta en string"),
  currency: CurrencySchema,
  fx: FxSnapshotSchema.optional(),
});
export type Money = z.infer<typeof MoneySchema>;

export function createMoney(
  amount: string | number,
  currency: Currency = "USD",
  fx?: FxSnapshot,
): Money {
  let strAmount: string;
  if (typeof amount === "number") {
    strAmount = amount.toFixed(currency === "COP" ? 0 : 2);
  } else {
    strAmount = amount.trim();
  }
  return { amount: strAmount, currency, fx };
}

/**
 * Suma exacta de dos montos de la misma moneda.
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Incompatibilidad de monedas en suma: ${a.currency} vs ${b.currency}`);
  }
  const decimals = a.currency === "COP" ? 0 : 2;
  const valA = Number.parseFloat(a.amount);
  const valB = Number.parseFloat(b.amount);
  const sum = valA + valB;
  return {
    amount: sum.toFixed(decimals),
    currency: a.currency,
  };
}

/**
 * Multiplicación exacta por una cantidad entera o factor.
 */
export function multiplyMoney(m: Money, factor: number): Money {
  const decimals = m.currency === "COP" ? 0 : 2;
  const val = Number.parseFloat(m.amount);
  const res = val * factor;
  return {
    amount: res.toFixed(decimals),
    currency: m.currency,
    fx: m.fx,
  };
}

/**
 * Formateo canónico por moneda.
 */
export function formatMoney(m: Money): string {
  const num = Number.parseFloat(m.amount);
  const sign = num < 0 ? "−" : "";
  const abs = Math.abs(num);

  if (m.currency === "COP") {
    const n = Math.round(abs)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${sign}$ ${n}`;
  }

  if (m.currency === "USD") {
    return `${sign}$ ${abs.toFixed(2)}`;
  }

  if (m.currency === "VES") {
    const parts = abs.toFixed(2).split(".");
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${sign}Bs. ${intPart},${parts[1]}`;
  }

  if (m.currency === "PEN") {
    return `${sign}S/ ${abs.toFixed(2)}`;
  }

  return `${sign}${m.currency} ${m.amount}`;
}

/**
 * Formato único COP (Retrocompatibilidad total con suite existente).
 */
export function formatCOP(value: number): string {
  const sign = value < 0 ? "−" : "";
  const n = Math.round(Math.abs(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}$ ${n}`;
}

/**
 * Formato dual bimoneda USD con referencia oficial BCV en Bolívares (VES).
 */
export function formatBimoneda(usdAmount: number, bcvRate = 48.45): string {
  const sign = usdAmount < 0 ? "−" : "";
  const abs = Math.abs(usdAmount);
  const usdStr = `${sign}$ ${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const vesAmount = abs * bcvRate;
  const parts = vesAmount.toFixed(2).split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const vesStr = `Bs. ${intPart},${parts[1]}`;
  return `${usdStr} (${vesStr} BCV)`;
}
