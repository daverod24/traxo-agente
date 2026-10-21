import { type Customer, newId, type Order, type Product } from "@traxo/core";
import { findCity, normalizePhone, normalizeStreet } from "@traxo/geo-co";
import { normalizePhoneVE } from "@traxo/market-ve";
import { header, hmac, safeEqual } from "./hmac.ts";
import type { CommerceAdapter, FulfillmentInput } from "./types.ts";

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
    const rows = await this.call<
      Array<{
        id: number;
        name: string;
        price: string;
        weight?: string;
        images?: Array<{ src: string }>;
        short_description?: string;
      }>
    >(`/products?page=${page}&per_page=${perPage}`);
    return rows.map((p) => ({
      id: `prod_${p.id}`,
      externalId: String(p.id),
      title: p.name,
      price: toInt(p.price),
      weightGrams: p.weight ? Math.max(1, Math.round(Number.parseFloat(p.weight) * 1000)) : 500,
      imageUrl: p.images?.[0]?.src,
      description: p.short_description?.replace(/<[^>]+>/g, " ").trim(),
    }));
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
}
