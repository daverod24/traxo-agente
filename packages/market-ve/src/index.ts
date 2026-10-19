import { z } from "zod";

/**
 * 24 Entidades Federales Oficiales de Venezuela según el Nomenclador del INE.
 * Códigos estándar ISO 3166-2:VE.
 */
export const VenezuelaStateCodeSchema = z.enum([
  "VE-A", // Distrito Capital
  "VE-B", // Anzoátegui
  "VE-C", // Apure
  "VE-D", // Aragua
  "VE-E", // Barinas
  "VE-F", // Bolívar
  "VE-G", // Carabobo
  "VE-H", // Cojedes
  "VE-I", // Delta Amacuro
  "VE-J", // Falcón
  "VE-K", // Guárico
  "VE-L", // Lara
  "VE-M", // Mérida
  "VE-N", // Miranda
  "VE-O", // Monagas
  "VE-P", // Nueva Esparta
  "VE-R", // Sucre
  "VE-S", // Táchira
  "VE-T", // Trujillo
  "VE-U", // Yaracuy
  "VE-V", // Zulia
  "VE-W", // Dependencias Federales
  "VE-X", // La Guaira
  "VE-Y", // Amazonas
]);
export type VenezuelaStateCode = z.infer<typeof VenezuelaStateCodeSchema>;

export interface StateMetadata {
  code: VenezuelaStateCode;
  name: string;
  capital: string;
  region: string;
}

export const VENEZUELA_STATES: Record<VenezuelaStateCode, StateMetadata> = {
  "VE-A": { code: "VE-A", name: "Distrito Capital", capital: "Caracas", region: "Capital" },
  "VE-B": { code: "VE-B", name: "Anzoátegui", capital: "Barcelona", region: "Nororiental" },
  "VE-C": { code: "VE-C", name: "Apure", capital: "San Fernando de Apure", region: "Los Llanos" },
  "VE-D": { code: "VE-D", name: "Aragua", capital: "Maracay", region: "Central" },
  "VE-E": { code: "VE-E", name: "Barinas", capital: "Barinas", region: "Los Andes" },
  "VE-F": { code: "VE-F", name: "Bolívar", capital: "Ciudad Bolívar", region: "Guayana" },
  "VE-G": { code: "VE-G", name: "Carabobo", capital: "Valencia", region: "Central" },
  "VE-H": { code: "VE-H", name: "Cojedes", capital: "San Carlos", region: "Central" },
  "VE-I": { code: "VE-I", name: "Delta Amacuro", capital: "Tucupita", region: "Guayana" },
  "VE-J": { code: "VE-J", name: "Falcón", capital: "Coro", region: "Centroccidental" },
  "VE-K": { code: "VE-K", name: "Guárico", capital: "San Juan de los Morros", region: "Los Llanos" },
  "VE-L": { code: "VE-L", name: "Lara", capital: "Barquisimeto", region: "Centroccidental" },
  "VE-M": { code: "VE-M", name: "Mérida", capital: "Mérida", region: "Los Andes" },
  "VE-N": { code: "VE-N", name: "Miranda", capital: "Los Teques", region: "Capital" },
  "VE-O": { code: "VE-O", name: "Monagas", capital: "Maturín", region: "Nororiental" },
  "VE-P": { code: "VE-P", name: "Nueva Esparta", capital: "La Asunción", region: "Insular" },
  "VE-R": { code: "VE-R", name: "Sucre", capital: "Cumaná", region: "Nororiental" },
  "VE-S": { code: "VE-S", name: "Táchira", capital: "San Cristóbal", region: "Los Andes" },
  "VE-T": { code: "VE-T", name: "Trujillo", capital: "Trujillo", region: "Los Andes" },
  "VE-U": { code: "VE-U", name: "Yaracuy", capital: "San Felipe", region: "Centroccidental" },
  "VE-V": { code: "VE-V", name: "Zulia", capital: "Maracaibo", region: "Zuliana" },
  "VE-W": { code: "VE-W", name: "Dependencias Federales", capital: "Gran Roque", region: "Insular" },
  "VE-X": { code: "VE-X", name: "La Guaira", capital: "La Guaira", region: "Capital" },
  "VE-Y": { code: "VE-Y", name: "Amazonas", capital: "Puerto Ayacucho", region: "Guayana" },
};

/**
 * Normaliza y valida números telefónicos venezolanos según estándar E.164 (+58).
 * Admite móviles (0412, 0414, 0424, 0416, 0426) y fijos de 3 dígitos (ej: 0212, 0241, 0261).
 * Devuelve formato canónico '+58XXXXXXXXXX' o undefined si el número es inválido.
 */
export function normalizePhoneVE(input: string | null | undefined): string | undefined {
  if (!input) return undefined;

  // Remover todo caracter que no sea dígito ni '+'
  let digits = input.trim().replace(/[^\d+]/g, "");

  // Si viene con 0058, convertir a 58
  if (digits.startsWith("0058")) {
    digits = digits.slice(2);
  }

  // Quitar el '+' inicial si existe
  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  // Si empieza con 58 y tiene 12 dígitos en total
  if (digits.startsWith("58") && digits.length === 12) {
    const local = digits.slice(2);
    if (isValidLocalAreaCode(local)) {
      return `+58${local}`;
    }
    return undefined;
  }

  // Si empieza con 0 (formato local, ej: 04121234567) y tiene 11 dígitos
  if (digits.startsWith("0") && digits.length === 11) {
    const local = digits.slice(1);
    if (isValidLocalAreaCode(local)) {
      return `+58${local}`;
    }
    return undefined;
  }

  // Si tiene 10 dígitos directos sin el 0 inicial (ej: 4121234567)
  if (digits.length === 10) {
    if (isValidLocalAreaCode(digits)) {
      return `+58${digits}`;
    }
  }

  return undefined;
}

/**
 * Comprueba si los primeros dígitos corresponden a un código de área válido venezolano.
 * Móviles: 412 (Digitel), 414/424 (Movistar), 416/426 (Movilnet).
 * Fijos principales: 212 (Caracas/Miranda/La Guaira), 241/242/243/244/245 (Centro), 261/262 (Occidente), etc.
 */
function isValidLocalAreaCode(tenDigits: string): boolean {
  if (tenDigits.length !== 10) return false;
  const prefix3 = tenDigits.slice(0, 3);

  // Móviles autorizados por CONATEL
  const mobilePrefixes = ["412", "414", "424", "416", "426"];
  if (mobilePrefixes.includes(prefix3)) return true;

  // Fijos nacionales (código empieza en 2)
  if (prefix3.startsWith("2")) return true;

  return false;
}

/**
 * Esquema de Dirección Estricto para Venezuela (VenezuelaAddress).
 */
export const VenezuelaAddressSchema = z.object({
  country: z.literal("VE"),
  stateCode: VenezuelaStateCodeSchema,
  municipalityCode: z.string().optional(),
  municipalityName: z.string().optional(),
  parishCode: z.string().optional(),
  parishName: z.string().optional(),
  city: z.string().min(2, "La ciudad o localidad es requerida"),
  urbanization: z.string().optional(),
  street: z.string().min(3, "La calle o avenida debe tener al menos 3 caracteres"),
  reference: z.string().optional(),
  recipientName: z.string().min(2, "El nombre del destinatario es requerido"),
  phoneE164: z.string().regex(/^\+58(412|414|424|416|426|2\d{2})\d{7}$/, {
    message: "El teléfono debe cumplir con el formato internacional E.164 venezolano (+58...)",
  }),
  postalCode: z.string().optional(),
  providerPlace: z
    .object({
      provider: z.literal("dropi"),
      id: z.string(),
      checkedAt: z.string(),
    })
    .optional(),
});
export type VenezuelaAddress = z.infer<typeof VenezuelaAddressSchema>;

/**
 * Esquema de Tasa Oficial BCV con Auditoría Temporal y Procedencia.
 */
export const BcvRateSnapshotSchema = z.object({
  source: z.literal("https://www.bcv.org.ve"),
  rate: z.string().regex(/^\d+(\.\d{1,6})?$/, "La tasa debe ser un decimal exacto en formato string"),
  currency: z.literal("VES"),
  baseCurrency: z.literal("USD"),
  publishedAt: z.string().datetime({ message: "publishedAt debe ser una fecha ISO válida" }),
  capturedAt: z.string().datetime({ message: "capturedAt debe ser una fecha ISO válida" }),
  staleThresholdHours: z.number().int().positive().default(24),
});
export type BcvRateSnapshot = z.infer<typeof BcvRateSnapshotSchema>;

/**
 * Determina si una tasa BCV ha caducado según su umbral de vigencia (por defecto 24h).
 */
export function isBcvRateStale(snapshot: BcvRateSnapshot, now = new Date()): boolean {
  const publishedDate = new Date(snapshot.publishedAt);
  const diffMs = now.getTime() - publishedDate.getTime();
  const maxMs = snapshot.staleThresholdHours * 60 * 60 * 1000;
  return diffMs > maxMs;
}
