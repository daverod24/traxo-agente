import { z } from "zod";
import { type Currency, CurrencySchema } from "./money.ts";

export const Platform = z.enum(["shopify", "tiendanube", "woocommerce", "mock"]);
export type Platform = z.infer<typeof Platform>;

/** 0 = todo con aprobación · 1 = logística automática, gasto en anuncios/créditos siempre con aprobación. */
export const Autonomy = z.union([z.literal(0), z.literal(1)]);
export type Autonomy = z.infer<typeof Autonomy>;

export const AddressSchema = z.object({
  name: z.string(),
  phone: z.string(),
  street: z.string(),
  neighborhood: z.string().optional(),
  city: z.string(),
  /** Código DANE de municipio (Colombia) o código territorial nacional. */
  dane: z.string().optional(),
  department: z.string().optional(),
  stateCode: z.string().optional(),
  country: z.string().default("CO"),
  notes: z.string().optional(),
});
export type Address = z.infer<typeof AddressSchema>;

export const PaymentMethod = z.enum(["cod", "prepaid"]);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const OrderLineSchema = z.object({
  productId: z.string(),
  title: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  unitPriceDecimal: z.string().optional(),
  weightGrams: z.number().int().positive().default(500),
});
export type OrderLine = z.infer<typeof OrderLineSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  number: z.string(),
  storeId: z.string(),
  tenantId: z.string().optional(),
  currency: CurrencySchema.default("COP"),
  customerId: z.string().optional(),
  email: z.string().optional(),
  address: AddressSchema,
  lines: z.array(OrderLineSchema).min(1),
  subtotal: z.number().nonnegative(),
  shippingCharged: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  totalDecimal: z.string().optional(),
  payment: PaymentMethod,
  utm: z.record(z.string(), z.string()).optional(),
  createdAt: z.string(),
});
export type Order = z.infer<typeof OrderSchema>;

/**
 * Contrato de Vinculación de Órdenes Multi-Tenant (WooCommerce <-> Dropi).
 */
export const OrderLinkSchema = z.object({
  tenantId: z.string().min(1, "tenantId es requerido"),
  storeId: z.string().min(1, "storeId es requerido"),
  wooOrderId: z.string().min(1, "wooOrderId es requerido"),
  dropiOrderId: z.string().optional(),
  syncOwner: z.enum(["native_dropi_woocommerce", "traxo_outbox"]),
  syncStatus: z.enum(["unlinked", "pending", "linked", "conflict", "error"]),
  updatedAt: z.string(),
});
export type OrderLink = z.infer<typeof OrderLinkSchema>;

/**
 * Estados unificados de fulfillment para normalización de operadores externos.
 */
export const FulfillmentMappedStatusSchema = z.enum([
  "created",
  "confirmed",
  "processing",
  "shipped",
  "in_transit",
  "delivered",
  "incident",
  "returned",
  "cancelled",
  "unknown",
]);
export type FulfillmentMappedStatus = z.infer<typeof FulfillmentMappedStatusSchema>;

/**
 * Esquema de Orden Dropi de Solo Lectura.
 */
export const DropiOrderSchema = z.object({
  id: z.string().min(1, "id de Dropi es requerido"),
  wooOrderId: z.string().optional(),
  status: z.string().min(1, "status es requerido"),
  mappedStatus: FulfillmentMappedStatusSchema,
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  recipientName: z.string().optional(),
  city: z.string().optional(),
  stateCode: z.string().optional(),
  placeId: z.string().optional(),
  total: z.string().optional(),
  currency: CurrencySchema.default("USD"),
  createdAt: z.string(),
  updatedAt: z.string(),
  simulated: z.boolean().default(false),
});
export type DropiOrder = z.infer<typeof DropiOrderSchema>;

/**
 * Tipos de Discrepancia en Conciliación.
 */
export const ReconciliationDiscrepancyTypeSchema = z.enum([
  "synced",
  "missing_in_dropi",
  "missing_in_woo",
  "status_mismatch",
  "duplicate_tracking",
  "unmapped_locality",
  "api_error",
  "rate_limited",
]);
export type ReconciliationDiscrepancyType = z.infer<typeof ReconciliationDiscrepancyTypeSchema>;

/**
 * Elemento de Conciliación individual.
 */
export const ReconciliationItemSchema = z.object({
  wooOrderId: z.string().optional(),
  dropiOrderId: z.string().optional(),
  trackingNumber: z.string().optional(),
  wooStatus: z.string().optional(),
  dropiStatus: z.string().optional(),
  mappedDropiStatus: FulfillmentMappedStatusSchema.optional(),
  discrepancyType: ReconciliationDiscrepancyTypeSchema,
  severity: z.enum(["none", "info", "warning", "critical"]),
  message: z.string(),
  requiresManualReview: z.boolean().default(false),
  timestamp: z.string(),
});
export type ReconciliationItem = z.infer<typeof ReconciliationItemSchema>;

/**
 * Reporte Completo de Conciliación Multi-Tenant.
 */
export const ReconciliationReportSchema = z.object({
  reportId: z.string(),
  tenantId: z.string(),
  storeId: z.string(),
  source: z.literal("reconciliation_engine"),
  generatedAt: z.string(),
  totalAudited: z.number().int().nonnegative(),
  summary: z.object({
    synced: z.number().int().nonnegative(),
    missingInDropi: z.number().int().nonnegative(),
    missingInWoo: z.number().int().nonnegative(),
    statusMismatches: z.number().int().nonnegative(),
    duplicateTrackings: z.number().int().nonnegative(),
    unmappedLocalities: z.number().int().nonnegative(),
    apiErrors: z.number().int().nonnegative(),
    requiresAttention: z.number().int().nonnegative(),
  }),
  items: z.array(ReconciliationItemSchema),
});
export type ReconciliationReport = z.infer<typeof ReconciliationReportSchema>;

/**
 * Contrato de Evento Logístico Normalizado.
 */
export const FulfillmentEventSchema = z.object({
  tenantId: z.string().min(1, "tenantId es requerido"),
  storeId: z.string().min(1, "storeId es requerido"),
  wooOrderId: z.string().min(1, "wooOrderId es requerido"),
  dropiOrderId: z.string().optional(),
  externalEventId: z.string().min(1, "externalEventId es requerido"),
  externalStatus: z.string().min(1, "externalStatus es requerido"),
  mappedStatus: FulfillmentMappedStatusSchema,
  occurredAt: z.string().optional(),
  receivedAt: z.string(),
  simulated: z.boolean(),
});
export type FulfillmentEvent = z.infer<typeof FulfillmentEventSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  title: z.string(),
  price: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative().optional(),
  weightGrams: z.number().int().positive().default(500),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
});
export type Product = z.infer<typeof ProductSchema>;

export const CustomerSchema = z.object({
  id: z.string(),
  externalId: z.string().optional(),
  name: z.string(),
  phone: z.string(),
  email: z.string().optional(),
  city: z.string().optional(),
  whatsappConsent: z.boolean().default(false),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const TrackingStatus = z.enum([
  "created",
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "incident",
  "returning",
  "returned",
  "cancelled",
]);
export type TrackingStatus = z.infer<typeof TrackingStatus>;

export const TrackingEventSchema = z.object({
  status: TrackingStatus,
  description: z.string(),
  location: z.string().optional(),
  at: z.string(),
});
export type TrackingEvent = z.infer<typeof TrackingEventSchema>;

export const QuoteSchema = z.object({
  /** Quién cotizó: envia-com, 99envios, coordinadora… */
  provider: z.string(),
  /** Transportadora real que movería el paquete. */
  carrier: z.string(),
  service: z.string(),
  freight: z.number().int().nonnegative(),
  codCommission: z.number().int().nonnegative().default(0),
  supportsCod: z.boolean(),
  businessDays: z.number().int().positive(),
  currency: z.literal("COP").default("COP"),
  simulated: z.boolean().default(false),
});
export type Quote = z.infer<typeof QuoteSchema>;

export const StoreSettingsSchema = z.object({
  autonomy: Autonomy.default(1),
  /** Si el costo total de la guía supera esto, pide aprobación aunque autonomía = 1. */
  maxAutoShipmentCost: z.number().int().positive().default(60000),
  /** Con qué plataforma de envíos trabaja hoy la tienda (se prueba primero). */
  preferredProvider: z.string().optional(),
  weights: z
    .object({ cost: z.number(), speed: z.number(), reliability: z.number() })
    .default({ cost: 0.55, speed: 0.3, reliability: 0.15 }),
  originDane: z
    .string()
    .regex(/^\d{5}$/)
    .default("11001"),
  /** Confirmar la contraentrega por WhatsApp antes de generar la guía: nunca, solo si el riesgo es alto, o siempre. */
  confirmCod: z.enum(["off", "risky", "all"]).default("off"),
  /** Riesgo (0–100) desde el cual se pide confirmación cuando confirmCod = "risky". */
  riskThreshold: z.number().int().min(1).max(100).default(40),
  /** Descuento que se ofrece si el cliente cambia a pagar ahora (prepago). */
  prepaidDiscountPct: z.number().int().min(0).max(30).default(5),
});
export type StoreSettings = z.infer<typeof StoreSettingsSchema>;

export type ShipmentDraft = {
  orderId: string;
  origin: { dane: string };
  destination: Address;
  weightGrams: number;
  declaredValue: number;
  codAmount: number;
  contents: string;
};

export type CreatedShipment = {
  provider: string;
  carrier: string;
  service: string;
  trackingNumber: string;
  labelUrl: string;
  trackUrl: string;
  total: number;
  simulated: boolean;
};
