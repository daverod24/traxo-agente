import { type Customer, newId, type Order, type Product } from "@traxo/core";
import { findCity, normalizePhone, normalizeStreet } from "@traxo/geo-co";
import { normalizePhoneVE } from "@traxo/market-ve";
import { header, hmac, safeEqual } from "./hmac.ts";
import type { CommerceAdapter, FulfillmentInput, ProductWebhookEvent } from "./types.ts";

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

type WooOrder = {
  id: number;
  number?: string;
  status?: string;
  currency?: string;
  date_created_gmt?: string;
  total?: string;
  shipping_total?: string;
  payment_method?: string;
  meta_data?: Array<{ key: string; value: unknown }>;
  billing?: { email?: string; phone?: string };
  shipping?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
  };
  line_items?: Array<{
    product_id: number;
    name: string;
    quantity: number;
    price: number | string;
  }>;
};

const toInt = (s: string | number | undefined): number =>
  Math.round(Number.parseFloat(String(s ?? "0")) || 0);

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

export function orderFromWoo(o: WooOrder, storeId: string): Order | undefined {
  const a = o.shipping;
  if (!a?.city || !a.address_1 || !o.line_items?.length) return undefined;

  const country = (a.country ?? "CO").toUpperCase();
  const rawPhone = a.phone ?? o.billing?.phone ?? "";
  const isVE = country === "VE" || rawPhone.startsWith("+58") || rawPhone.startsWith("04");

  let phone: string;
  let cityStr: string;
  let departmentStr: string;
  let daneCode: string | undefined = undefined;

  if (isVE) {
    phone = normalizePhoneVE(rawPhone) ?? rawPhone;
    cityStr = a.city;
    departmentStr = a.state ?? "";
  } else {
    const city = findCity(a.city);
    phone = normalizePhone(rawPhone) ?? rawPhone;
    cityStr = city?.name ?? a.city;
    daneCode = city?.dane ?? "00000";
    departmentStr = city?.department ?? a.state ?? "";
  }

  const lines = o.line_items.map((l) => ({
    productId: String(l.product_id),
    title: l.name,
    quantity: l.quantity,
    unitPrice: toInt(l.price),
    unitPriceDecimal: String(l.price),
    weightGrams: 500,
  }));
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  const metaMap = new Map((o.meta_data || []).map((m) => [m.key, m.value]));
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

  return {
    id: newId("ord"),
    externalId: String(o.id),
    number: `#${o.number ?? o.id}`,
    storeId,
    currency: (o.currency as any) ?? (isVE ? "USD" : "COP"),
    email: o.billing?.email,
    address: {
      country: isVE ? "VE" : "CO",
      name: [a.first_name, a.last_name].filter(Boolean).join(" "),
      phone,
      street: normalizeStreet([a.address_1, a.address_2].filter(Boolean).join(" ")),
      city: cityStr,
      dane: daneCode,
      department: departmentStr,
      stateCode: isVE ? a.state : undefined,
    },
    lines,
    subtotal,
    shippingCharged: toInt(o.shipping_total),
    total: toInt(o.total) || subtotal,
    totalDecimal: o.total ? String(o.total) : undefined,
    payment: o.payment_method === "cod" ? "cod" : "prepaid",
    status: mapWooStatus(o.status),
    trackingNumber: trackingNumber ? String(trackingNumber).trim() : undefined,
    carrier: carrier ? String(carrier).trim() : undefined,
    createdAt: o.date_created_gmt ? `${o.date_created_gmt}Z` : new Date().toISOString(),
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
    return (await res.json()) as T;
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
    if (topic && topic !== "order.created") return undefined;
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
