import { type Customer, newId, type Order, type Product } from "@traxo/core";
import { findCity, normalizePhone, normalizeStreet } from "@traxo/geo-co";
import { normalizePhoneVE } from "@traxo/market-ve";
import { header, hmac, safeEqual } from "./hmac.ts";
import { classifyOrderAnomaly } from "./order-hygiene.ts";
import type {
  CommerceAdapter,
  FulfillmentInput,
  ProductWebhookEvent,
  StockUpdateInput,
} from "./types.ts";

export type RawWooProduct = {
  id: number;
  name: string;
  price?: string;
  regular_price?: string;
  weight?: string;
  images?: Array<{ src: string }>;
  short_description?: string;
  description?: string;
  sku?: string;
  type?: string;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  stock_status?: string;
  variations?: number[];
  meta_data?: Array<{ id?: number; key: string; value: unknown }>;
};

export function normalizeProductFromWoo(
  p: RawWooProduct,
  variationsList?: Array<{ id: number; sku?: string; price: number; name?: string }>,
): Product {
  const metaMap = new Map((p.meta_data ?? []).map((m) => [m.key, m.value]));
  const supplierCostRaw =
    metaMap.get("_supplier_cost") ??
    metaMap.get("_cost") ??
    metaMap.get("cost") ??
    metaMap.get("_wc_cog_cost");
  let cost: number | undefined =
    supplierCostRaw != null && !isNaN(Number(supplierCostRaw)) && Number(supplierCostRaw) > 0
      ? Number(supplierCostRaw)
      : undefined;

  // Soporte canónico SKU para Aceite de orégano (DB-WELL-OREG-60)
  if (
    cost == null &&
    (p.sku?.toUpperCase().includes("OREG") ||
      p.name?.toLowerCase().includes("or\u00e9gano") ||
      p.name?.toLowerCase().includes("oregano"))
  ) {
    cost = 6;
  }

  // Lectura robusta de Dropi ID (_dropi_id, _dropi_product_id, _dropi_product)
  const dropiIdRaw =
    metaMap.get("_dropi_id") ?? metaMap.get("_dropi_product_id") ?? metaMap.get("dropi_id");
  let dropiId =
    dropiIdRaw != null && String(dropiIdRaw).trim() !== "" ? String(dropiIdRaw).trim() : undefined;
  if (!dropiId && metaMap.has("_dropi_product")) {
    const dropiProdRaw = String(metaMap.get("_dropi_product") || "");
    const match = dropiProdRaw.match(/i:(\d+);/);
    if (match?.[1]) dropiId = match[1];
  }

  const rateType = metaMap.get("_rate_type") ? String(metaMap.get("_rate_type")) : undefined;
  const targetMargin = metaMap.get("_target_margin")
    ? Number(metaMap.get("_target_margin"))
    : undefined;

  // Precios seguros para productos simples y variables
  let finalPrice = toInt(p.price);
  if ((finalPrice === 0 || !p.price) && p.regular_price) {
    finalPrice = toInt(p.regular_price);
  }
  if ((finalPrice === 0 || !p.price) && variationsList && variationsList.length > 0) {
    const firstVarPrice = variationsList[0]?.price;
    if (firstVarPrice != null && firstVarPrice > 0) {
      finalPrice = firstVarPrice;
    }
  }

  // Escalera de packs (1x, 2x, 3x) deducida de variaciones
  const packs: { duo?: number; trio?: number } = {};
  if (variationsList && variationsList.length > 0) {
    for (const v of variationsList) {
      const vName = (v.name || "").toLowerCase();
      const vSku = (v.sku || "").toLowerCase();
      if (vName.includes("dúo") || vName.includes("duo") || vSku.endsWith("-2")) {
        packs.duo = v.price;
      } else if (
        vName.includes("trío") ||
        vName.includes("trio") ||
        vName.includes("kit") ||
        vSku.endsWith("-3")
      ) {
        packs.trio = v.price;
      }
    }
  }

  const stockStatus =
    p.stock_status === "instock" ||
    p.stock_status === "outofstock" ||
    p.stock_status === "onbackorder"
      ? p.stock_status
      : undefined;
  const stockQuantity =
    p.stock_quantity === null
      ? null
      : p.stock_quantity !== undefined && Number.isFinite(Number(p.stock_quantity))
        ? Math.trunc(Number(p.stock_quantity))
        : undefined;

  return {
    id: `prod_${p.id}`,
    externalId: String(p.id),
    title: p.name,
    price: finalPrice,
    cost,
    weightGrams: p.weight ? Math.max(1, Math.round(Number.parseFloat(p.weight) * 1000)) : 500,
    imageUrl: p.images?.[0]?.src,
    description: (p.short_description || p.description)?.replace(/<[^>]+>/g, " ").trim(),
    sku: p.sku || undefined,
    manageStock: typeof p.manage_stock === "boolean" ? p.manage_stock : undefined,
    stockQuantity,
    stockStatus,
    dropiProductId: dropiId ?? null,
    variations: variationsList as any,
    metadata: {
      dropiId,
      rateType,
      targetMargin,
      packs,
      wooType: p.type,
    },
  };
}

export type WooConfig = {
  storeId: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  webhookSecret: string;
  fetch?: typeof fetch;
};

type WooAddress = {
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  email?: string;
};

type WooOrder = {
  id: number;
  number?: string;
  status?: string;
  currency?: string;
  date_created_gmt?: string;
  date_created?: string;
  total?: string;
  shipping_total?: string;
  payment_method?: string;
  payment_method_title?: string;
  customer_note?: string;
  coupon_lines?: Array<{ code?: string; discount?: string }>;
  meta_data?: Array<{ key: string; value: unknown }>;
  billing?: WooAddress;
  shipping?: WooAddress;
  line_items?: Array<{
    product_id: number;
    name: string;
    quantity: number;
    price: number | string;
    total?: number | string;
    subtotal?: number | string;
  }>;
};

const toInt = (s: string | number | undefined): number =>
  Math.round(Number.parseFloat(String(s ?? "0")) || 0);

const parseFloatSafe = (s: string | number | undefined): number => {
  const n = Number.parseFloat(String(s ?? "0"));
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

const strMeta = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
};

const numMeta = (v: unknown): number | undefined => {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function parseWooDate(gmt?: string, local?: string): string {
  const tryParse = (raw: string | undefined, assumeUtc: boolean): string | undefined => {
    if (!raw || !raw.trim()) return undefined;
    let s = raw.trim().replace(" ", "T");
    if (assumeUtc && !/[zZ]$/.test(s) && !/[+-]\d{2}:?\d{2}$/.test(s)) {
      s = `${s}Z`;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  };
  return tryParse(gmt, true) ?? tryParse(local, false) ?? new Date().toISOString();
}

export function mapWooPayment(
  method?: string,
  title?: string,
  metaMap?: Map<string, unknown>,
): Order["payment"] {
  const raw = [method, title, metaMap?.get("_payment_method")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (
    method?.toLowerCase() === "cod" ||
    raw.includes("cash_on_delivery") ||
    raw.includes("contraentrega") ||
    raw.includes("contra entrega") ||
    raw.includes("cobro en destino")
  ) {
    return "cod";
  }
  if (
    raw.includes("pago_movil") ||
    raw.includes("pagomovil") ||
    raw.includes("pago móvil") ||
    raw.includes("pago movil") ||
    raw.includes("pago-movil")
  ) {
    return "pago_movil";
  }
  if (raw.includes("zelle")) {
    return "zelle";
  }
  if (raw.includes("usdt") || raw.includes("binance") || raw.includes("trc20")) {
    return "usdt";
  }
  if (raw.includes("transferencia") || method?.toLowerCase() === "bacs") {
    return "transferencia_bs";
  }
  return "prepaid";
}

const EXTRACTED_META_KEYS = [
  "_origin",
  "_cedula",
  "_billing_full_identification",
  "_bcv_rate",
  "_pack_label",
  "_pack_qty",
  "_storefront_coupon",
  "_storefront_discount_usd",
  "_dropi_department",
  "_dropi_city",
  "_customer_zone",
  "_zone_remapped",
  "_carrier",
  "_carrier_id",
  "_client_ref",
  "_is_test",
] as const;

export function mapWooStatus(s?: string): string {
  switch (s) {
    case "on-hold":
    case "pending":
      return "pending";
    case "processing":
      return "confirmed";
    case "completed":
      return "delivered";
    case "cancelled":
      return "cancelled";
    case "refunded":
      return "refunded";
    case "failed":
      return "rejected";
    default:
      return s || "pending";
  }
}

export function parseJsonWithHtmlPrefix<T = unknown>(rawText: string, source: string): T {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error(`WooCommerce devolvió una respuesta vacía en ${source}.`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    let pos = 0;
    let attempts = 0;
    while (pos < trimmed.length && attempts < 40) {
      const objIdx = trimmed.indexOf("{", pos);
      const arrIdx = trimmed.indexOf("[", pos);
      const candidates = [objIdx, arrIdx].filter((i) => i >= 0);
      if (candidates.length === 0) break;
      const startIdx = Math.min(...candidates);
      attempts++;
      try {
        const parsed = JSON.parse(trimmed.slice(startIdx)) as T;
        const prefixPreview = trimmed.slice(0, Math.min(startIdx, 120)).replace(/\s+/g, " ").trim();
        console.warn(
          `[woocommerce] Respuesta con prefijo no-JSON en ${source}; limpiando ${startIdx} bytes (${prefixPreview}).`,
        );
        return parsed;
      } catch {
        pos = startIdx + 1;
      }
    }
    const snippet = trimmed.slice(0, 160).replace(/\s+/g, " ");
    console.error(`[woocommerce] Respuesta no-JSON irrecuperable en ${source}: ${snippet}`);
    throw new Error(`WooCommerce devolvió respuesta no-JSON en ${source}: ${snippet}`);
  }
}

export function orderFromWoo(o: WooOrder, storeId: string): Order | undefined {
  if (!o || o.id == null) return undefined;

  const s = o.shipping;
  const b = o.billing;
  const firstName = s?.first_name?.trim() || b?.first_name?.trim() || "";
  const lastName = s?.last_name?.trim() || b?.last_name?.trim() || "";
  const address1 = s?.address_1?.trim() || b?.address_1?.trim() || "";
  const address2 = s?.address_2?.trim() || b?.address_2?.trim() || "";
  const metaMap = new Map((o.meta_data || []).map((m) => [m.key, m.value]));
  const cityRaw = s?.city?.trim() || b?.city?.trim() || strMeta(metaMap.get("_dropi_city")) || "";
  const stateRaw = s?.state?.trim() || b?.state?.trim() || "";
  const countryRaw = (s?.country?.trim() || b?.country?.trim() || "CO").toUpperCase();
  const rawPhone = s?.phone?.trim() || b?.phone?.trim() || "";
  const email = b?.email?.trim() || s?.email?.trim() || undefined;

  if (!cityRaw || !address1 || !o.line_items?.length) {
    console.warn(
      `[woocommerce] Pedido #${o.number ?? o.id} con datos incompletos (city=${Boolean(cityRaw)}, address=${Boolean(address1)}, items=${o.line_items?.length ?? 0}); se importa igual para no perder el registro.`,
    );
  }

  const isVE = countryRaw === "VE" || rawPhone.startsWith("+58") || rawPhone.startsWith("04");

  const meta: Record<string, unknown> = {};
  for (const key of EXTRACTED_META_KEYS) {
    if (metaMap.has(key)) {
      meta[key] = metaMap.get(key);
    }
  }
  if (o.customer_note?.trim()) {
    meta.customer_note = o.customer_note.trim();
  }
  if (o.coupon_lines?.length) {
    meta.coupon_lines = o.coupon_lines;
    if (!meta._storefront_coupon && o.coupon_lines[0]?.code) {
      meta._storefront_coupon = o.coupon_lines[0].code;
    }
  }

  let phone: string;
  let cityStr: string;
  let departmentStr: string;
  let daneCode: string | undefined;
  let streetStr: string;

  if (isVE) {
    phone = normalizePhoneVE(rawPhone) ?? rawPhone;
    cityStr = cityRaw || strMeta(metaMap.get("_dropi_city")) || "";
    departmentStr = stateRaw || strMeta(metaMap.get("_dropi_department")) || "";
    streetStr = [address1, address2].filter(Boolean).join(", ").trim();
  } else {
    const city = findCity(cityRaw);
    phone = normalizePhone(rawPhone) ?? rawPhone;
    cityStr = city?.name ?? cityRaw;
    daneCode = city?.dane ?? "00000";
    departmentStr = city?.department ?? stateRaw;
    streetStr = normalizeStreet([address1, address2].filter(Boolean).join(" "));
  }

  const lines = (o.line_items ?? []).map((l) => {
    const unitPriceExact = round2(parseFloatSafe(l.price));
    const lineTotal =
      l.total != null && l.total !== ""
        ? round2(parseFloatSafe(l.total))
        : round2(unitPriceExact * l.quantity);
    return {
      productId: String(l.product_id),
      title: l.name,
      quantity: l.quantity,
      unitPrice: toInt(l.price),
      unitPriceExact,
      lineTotal,
      unitPriceDecimal: String(l.price),
      weightGrams: 500,
    };
  });

  const subtotalExact = round2(
    lines.reduce((sum, l) => sum + (l.lineTotal ?? l.unitPriceExact * l.quantity), 0),
  );
  const subtotal = Math.round(subtotalExact);
  const shippingChargedExact = round2(parseFloatSafe(o.shipping_total));
  const shippingCharged = toInt(o.shipping_total);
  const hasExplicitTotal = o.total != null && String(o.total).trim() !== "";
  const totalExact = hasExplicitTotal ? round2(parseFloatSafe(o.total)) : subtotalExact;
  const total = hasExplicitTotal ? toInt(o.total) : subtotal;

  const trackingNumber = (metaMap.get("_traxo_tracking_number") ||
    metaMap.get("_tracking_number") ||
    metaMap.get("_shipping_tracking_number") ||
    metaMap.get("_dropi_tracking_number") ||
    metaMap.get("_dropi_guide") ||
    metaMap.get("tracking_number")) as string | undefined;
  const carrier = (metaMap.get("_traxo_carrier") ||
    metaMap.get("_carrier") ||
    metaMap.get("_dropi_carrier") ||
    metaMap.get("carrier") ||
    undefined) as string | undefined;

  const origin = strMeta(metaMap.get("_origin")) ?? "woocommerce";
  const cedula =
    strMeta(metaMap.get("_cedula")) ?? strMeta(metaMap.get("_billing_full_identification"));
  const bcvRate = numMeta(metaMap.get("_bcv_rate"));
  const zone = strMeta(metaMap.get("_customer_zone"));
  const rawStatus = o.status?.trim() || undefined;

  const baseOrder: Order = {
    id: newId("ord"),
    externalId: String(o.id),
    number: `#${o.number ?? o.id}`,
    storeId,
    currency: (o.currency as any) ?? (isVE ? "USD" : "COP"),
    email,
    address: {
      country: isVE ? "VE" : "CO",
      name: [firstName, lastName].filter(Boolean).join(" "),
      phone,
      street: streetStr,
      city: cityStr,
      dane: daneCode,
      department: departmentStr,
      stateCode: isVE ? stateRaw || undefined : undefined,
      zone,
      cedula,
      notes: o.customer_note?.trim() || undefined,
    },
    lines,
    subtotal,
    subtotalExact,
    shippingCharged,
    shippingChargedExact,
    total,
    totalExact,
    totalDecimal: hasExplicitTotal ? String(o.total) : undefined,
    payment: mapWooPayment(o.payment_method, o.payment_method_title, metaMap),
    status: mapWooStatus(o.status),
    rawStatus,
    origin,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
    bcvRate,
    zone,
    cedula,
    trackingNumber: trackingNumber ? String(trackingNumber).trim() : undefined,
    carrier: carrier ? String(carrier).trim() : undefined,
    createdAt: parseWooDate(o.date_created_gmt, o.date_created),
  };

  const hygiene = classifyOrderAnomaly(baseOrder, { market: isVE ? "VE" : undefined });
  return {
    ...baseOrder,
    isTest: hygiene.isTest,
    anomalyReason: hygiene.anomalyReason,
  };
}

export class WooCommerce implements CommerceAdapter {
  readonly platform = "woocommerce" as const;
  readonly storeId: string;
  private f: typeof fetch;

  constructor(private cfg: WooConfig) {
    this.storeId = cfg.storeId;
    this.f = cfg.fetch ?? fetch;
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const auth = Buffer.from(`${this.cfg.consumerKey}:${this.cfg.consumerSecret}`).toString(
      "base64",
    );
    const res = await this.f(`${this.cfg.url.replace(/\/$/, "")}/wp-json/wc/v3${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    });
    if (!res.ok)
      throw new Error(
        `WooCommerce respondió ${res.status} en ${path}. Revisa las claves y que la tienda use HTTPS.`,
      );
    if (typeof res.text !== "function") {
      return (await res.json()) as T;
    }
    const rawText = await res.text();
    return parseJsonWithHtmlPrefix<T>(rawText, path);
  }

  async listProducts(opts: { page?: number; limit?: number } = {}): Promise<Product[]> {
    const page = opts.page ?? 1;
    const perPage = opts.limit ?? 100;
    const rows = await this.call<RawWooProduct[]>(`/products?page=${page}&per_page=${perPage}`);

    const result: Product[] = [];

    for (const p of rows) {
      // Variaciones si existen
      let variationsList:
        | Array<{ id: number; sku?: string; price: number; name?: string }>
        | undefined = undefined;
      if (Array.isArray(p.variations) && p.variations.length > 0) {
        try {
          const varRows = await this.call<
            Array<{
              id: number;
              sku?: string;
              price: string;
              attributes?: Array<{ name: string; option: string }>;
            }>
          >(`/products/${p.id}/variations?per_page=20`);

          variationsList = varRows.map((v) => ({
            id: v.id,
            sku: v.sku || undefined,
            price: toInt(v.price),
            name: v.attributes?.map((a) => `${a.name}: ${a.option}`).join(", ") || undefined,
          }));
        } catch (e) {
          console.warn(`[woocommerce] No se pudieron cargar variaciones para producto ${p.id}:`, e);
        }
      }

      result.push(normalizeProductFromWoo(p, variationsList));
    }

    return result;
  }

  async listCustomers(opts: { page?: number; limit?: number } = {}): Promise<Customer[]> {
    const page = opts.page ?? 1;
    const perPage = opts.limit ?? 100;
    const rows = await this.call<
      Array<{
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        billing?: { phone?: string; city?: string };
      }>
    >(`/customers?page=${page}&per_page=${perPage}`);
    return rows.map((c) => {
      const rawPhone = c.billing?.phone ?? "";
      const isVE = rawPhone.startsWith("+58") || rawPhone.startsWith("04");
      const phone = isVE
        ? (normalizePhoneVE(rawPhone) ?? rawPhone)
        : (normalizePhone(rawPhone) ?? rawPhone);
      return {
        id: `cust_${c.id}`,
        externalId: String(c.id),
        name: `${c.first_name} ${c.last_name}`.trim(),
        phone,
        email: c.email,
        city: c.billing?.city,
        whatsappConsent: false,
      };
    });
  }

  async listOrders(opts: { page?: number; limit?: number } = {}): Promise<Order[]> {
    const page = opts.page ?? 1;
    const perPage = opts.limit ?? 50;
    const rows = await this.call<WooOrder[]>(`/orders?page=${page}&per_page=${perPage}`);
    return rows.map((o) => orderFromWoo(o, this.storeId)).filter((o): o is Order => Boolean(o));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return orderFromWoo(await this.call<WooOrder>(`/orders/${id}`), this.storeId);
  }

  /**
   * Registra fulfillment en WooCommerce: agrega nota para el cliente y actualiza metadata de guía.
   * NO marca el estado como "completed" prematuramente para preservar el ciclo de vida en Dropi y entregas COD.
   */
  async addFulfillment(orderId: string, input: FulfillmentInput): Promise<void> {
    await this.call(`/orders/${orderId}/notes`, {
      method: "POST",
      body: JSON.stringify({
        note: `Tu pedido va con ${input.carrier}. Guía ${input.trackingNumber}. Rastréalo: ${input.url}`,
        customer_note: input.notifyCustomer ?? false,
      }),
    });
    await this.call(`/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify({
        meta_data: [
          { key: "_traxo_tracking_number", value: input.trackingNumber },
          { key: "_traxo_carrier", value: input.carrier },
        ],
      }),
    });
  }

  async addNote(orderId: string, note: string): Promise<void> {
    await this.call(`/orders/${orderId}/notes`, { method: "POST", body: JSON.stringify({ note }) });
  }

  async updateOrderStatus(orderId: string, status: string, note?: string): Promise<void> {
    await this.call(`/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    if (note) {
      await this.addNote(orderId, note);
    }
  }

  async updateProductStock(productId: string, stock: StockUpdateInput): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (stock.manageStock !== undefined) payload.manage_stock = stock.manageStock;
    if (stock.stockQuantity !== undefined) payload.stock_quantity = stock.stockQuantity;
    if (stock.stockStatus !== undefined) payload.stock_status = stock.stockStatus;
    if (Object.keys(payload).length === 0) return;

    await this.call(`/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async updateVariationStock(
    productId: string,
    variationId: string,
    stock: StockUpdateInput,
  ): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (stock.manageStock !== undefined) payload.manage_stock = stock.manageStock;
    if (stock.stockQuantity !== undefined) payload.stock_quantity = stock.stockQuantity;
    if (stock.stockStatus !== undefined) payload.stock_status = stock.stockStatus;
    if (Object.keys(payload).length === 0) return;

    await this.call(`/products/${productId}/variations/${variationId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  verifyWebhook(headers: Record<string, string | undefined>, rawBody: string): boolean {
    const sig = header(headers, "x-wc-webhook-signature");
    return (
      Boolean(sig) && safeEqual(sig as string, hmac(this.cfg.webhookSecret, rawBody, "base64"))
    );
  }

  normalizeOrderWebhook(
    headers: Record<string, string | undefined>,
    payload: unknown,
  ): Order | undefined {
    const topic = header(headers, "x-wc-webhook-topic");
    if (topic && topic !== "order.created" && topic !== "order.updated") return undefined;
    return orderFromWoo(payload as WooOrder, this.storeId);
  }

  normalizeProductWebhook(
    headers: Record<string, string | undefined>,
    payload: unknown,
  ): ProductWebhookEvent | undefined {
    const topic = header(headers, "x-wc-webhook-topic");
    const p = payload as RawWooProduct & { action?: string };
    if (!p || (!topic && !p.action)) return undefined;

    let action: "created" | "updated" | "deleted" = "updated";
    if (
      topic === "product.deleted" ||
      p.action === "deleted" ||
      (payload as any).status === "trash"
    ) {
      action = "deleted";
    } else if (topic === "product.created" || p.action === "created") {
      action = "created";
    } else if (
      topic === "product.updated" ||
      topic === "product.restored" ||
      p.action === "updated"
    ) {
      action = "updated";
    } else if (!topic?.startsWith("product.")) {
      return undefined;
    }

    const productId = String(p.id);
    if (!productId || productId === "undefined") return undefined;

    if (action === "deleted") {
      return { action, productId };
    }

    const product = normalizeProductFromWoo(p);
    return { action, productId, product };
  }
}
