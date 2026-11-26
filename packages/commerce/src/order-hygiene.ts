import { normalizePhone } from "@traxo/geo-co";
import { normalizePhoneVE } from "@traxo/market-ve";

export type OrderHygieneInput = {
  number?: string;
  email?: string | null;
  origin?: string | null;
  currency?: string | null;
  total?: number | null;
  totalExact?: number | null;
  cedula?: string | null;
  meta?: Record<string, unknown> | null;
  address?: {
    name?: string | null;
    phone?: string | null;
    street?: string | null;
    city?: string | null;
    dane?: string | null;
    country?: string | null;
    cedula?: string | null;
    zone?: string | null;
  } | null;
};

export type OrderAnomalyClassification = {
  isTest: boolean;
  anomalyReason?: string;
  flags: string[];
};

export type ClassifyOrderOptions = {
  market?: string;
  isDuplicate?: boolean;
  duplicateOfNumber?: string;
};

const normalizeText = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const normalizeCedula = (s?: string | null): string =>
  (s ?? "").replace(/[\s.-]/g, "").toUpperCase();

const PLAYWRIGHT_TEST_PAIRS: Array<{
  name: string;
  cedulaDigits: string;
  phone10: string;
}> = [
  { name: "andres gomez", cedulaDigits: "12345678", phone10: "4145557788" },
  { name: "maria rodriguez", cedulaDigits: "87654321", phone10: "4249991122" },
  { name: "ana martinez", cedulaDigits: "11223344", phone10: "4162223344" },
  { name: "carlos perez", cedulaDigits: "55667788", phone10: "4128889900" },
  { name: "valentina gomez", cedulaDigits: "24567890", phone10: "4128887766" },
  { name: "mariana silva", cedulaDigits: "21345678", phone10: "4143334455" },
  { name: "camila hernandez", cedulaDigits: "21345678", phone10: "4125554321" },
];

/** Ciudades inequívocamente colombianas (excluyendo homónimos reales en Venezuela como Valencia, Barcelona, Mérida, Trujillo). */
const COLOMBIAN_ONLY_CITIES = new Set([
  "bogota",
  "bogota d.c.",
  "bogota dc",
  "medellin",
  "cali",
  "barranquilla",
  "bucaramanga",
  "cartagena",
  "cartagena de indias",
  "pereira",
  "manizales",
  "cucuta",
  "ibague",
  "villavicencio",
  "santa marta",
  "monteria",
  "pasto",
  "neiva",
  "popayan",
  "armenia",
  "sincelejo",
  "valledupar",
  "soacha",
  "envigado",
  "itagui",
  "bello",
  "chia",
  "zipaquira",
  "tunja",
  "riohacha",
  "florencia",
  "yopal",
  "quibdo",
  "leticia",
  "dosquebradas",
  "floridablanca",
  "giron",
  "palmira",
  "buenaventura",
  "tulua",
  "duitama",
  "sogamoso",
]);

/**
 * Clasifica de forma pura y no destructiva si un pedido corresponde a una prueba E2E
 * inequívoca o si presenta anomalías operativas que requieren atención del operador.
 */
export function classifyOrderAnomaly(
  order: OrderHygieneInput,
  opts: ClassifyOrderOptions = {},
): OrderAnomalyClassification {
  const flags: string[] = [];
  const reasons: string[] = [];
  let isTest = false;

  const meta = (order.meta ?? {}) as Record<string, unknown>;
  const addr = order.address ?? {};
  const rawName = (addr.name ?? "").trim();
  const normName = normalizeText(rawName);
  const rawPhone = (addr.phone ?? "").trim();
  const phoneDigits = rawPhone.replace(/\D/g, "");
  const phone10 = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "";
  const email = (order.email ?? "").trim().toLowerCase();
  const originStr = String(meta._origin ?? order.origin ?? "").trim();
  const rawCedula =
    order.cedula ??
    addr.cedula ??
    (typeof meta._cedula === "string" ? meta._cedula : undefined) ??
    (typeof meta._billing_full_identification === "string"
      ? meta._billing_full_identification
      : undefined);
  const normCedula = normalizeCedula(rawCedula);
  const cedulaDigits = normCedula.replace(/^[VEJP]/, "");

  // 1. Detección estricta de pruebas E2E
  if (meta._is_test === "true" || meta._is_test === true) {
    isTest = true;
    flags.push("e2e_marker");
    reasons.push("Marcador explícito _is_test");
  }

  if (originStr && /(e2e|test)/i.test(originStr)) {
    isTest = true;
    flags.push("e2e_origin");
    reasons.push(`Origen de prueba (${originStr})`);
  }

  if (email && (email.endsWith("@davebeauty.ve") || email.endsWith("@example.com"))) {
    isTest = true;
    flags.push("e2e_email");
    reasons.push(`Correo de prueba (${email})`);
  }

  if (
    rawPhone === "+584120000000" ||
    phoneDigits === "584120000000" ||
    phoneDigits === "04120000000" ||
    phoneDigits === "4120000000"
  ) {
    isTest = true;
    flags.push("e2e_phone");
    reasons.push("Teléfono ficticio de prueba (+584120000000)");
  }

  if (rawName && (/^qa\s*dropi/i.test(rawName) || /\bqa\s+dropi\b/i.test(rawName))) {
    isTest = true;
    flags.push("e2e_name_qa");
    reasons.push(`Nombre de prueba QA (${rawName})`);
  }

  const matchedPair = PLAYWRIGHT_TEST_PAIRS.find(
    (p) =>
      normName === p.name &&
      ((cedulaDigits !== "" && cedulaDigits === p.cedulaDigits) ||
        (phone10 !== "" && phone10 === p.phone10)),
  );
  if (matchedPair) {
    isTest = true;
    flags.push("e2e_playwright_fixture");
    reasons.push(`Firma E2E conocida (${rawName})`);
  }

  // 2. Detección de anomalías operativas (NUNCA marca isTest = true por sí sola)
  const country = (addr.country ?? "").trim().toUpperCase();
  const market = (opts.market ?? process.env.MARKET ?? "").trim().toUpperCase();
  const isVeContext =
    market === "VE" || country === "VE" || (order.currency ?? "").toUpperCase() === "USD";

  if (!rawPhone) {
    flags.push("missing_phone");
    reasons.push("Falta teléfono del cliente");
  } else if (country === "VE" || (isVeContext && country !== "CO")) {
    if (!normalizePhoneVE(rawPhone)) {
      flags.push("invalid_phone");
      reasons.push("Teléfono inválido para Venezuela");
    }
  } else if (country === "CO") {
    if (!normalizePhone(rawPhone)) {
      flags.push("invalid_phone");
      reasons.push("Teléfono inválido para Colombia");
    }
  }

  const street = (addr.street ?? "").trim();
  const city = (addr.city ?? "").trim();
  if (street.length < 8) {
    flags.push("short_address");
    reasons.push("Dirección muy corta (<8 caracteres)");
  }
  if (city.length < 2) {
    flags.push("missing_city");
    reasons.push("Falta ciudad de destino");
  }

  const effectiveTotal = order.totalExact ?? order.total ?? 0;
  const hasCoupon =
    Boolean(meta._storefront_coupon && String(meta._storefront_coupon).trim()) ||
    Boolean(Array.isArray(meta.coupon_lines) && meta.coupon_lines.length > 0);
  if (effectiveTotal <= 0 && !hasCoupon) {
    flags.push("zero_total_no_coupon");
    reasons.push("Total en $0 o negativo sin cupón");
  }

  if (opts.isDuplicate || opts.duplicateOfNumber) {
    flags.push("possible_duplicate");
    reasons.push(
      opts.duplicateOfNumber
        ? `Posible duplicado de ${opts.duplicateOfNumber}`
        : "Posible pedido duplicado",
    );
  }

  if (market === "VE" || country === "VE") {
    const dane = (addr.dane ?? "").trim();
    const hasCoDane = /^\d{5}$/.test(dane) && dane !== "00000";
    const normCity = normalizeText(city);
    if (hasCoDane || country === "CO" || (normCity !== "" && COLOMBIAN_ONLY_CITIES.has(normCity))) {
      flags.push("co_location_in_ve");
      const detail = city || dane;
      reasons.push(
        detail
          ? `Ciudad o DANE colombiano en tienda VE (${detail})`
          : "Ciudad o DANE colombiano en tienda VE",
      );
    }
  }

  return {
    isTest,
    anomalyReason: reasons.length > 0 ? reasons.join(" · ") : undefined,
    flags,
  };
}
