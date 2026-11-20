import { z } from "zod";

/**
 * Convierte strings vacíos (como variables en .env sin valor "KEY=") en undefined
 * para que los validadores opcionales de Zod funcionen correctamente.
 */
const emptyToUndefined = (v: unknown): unknown =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());
const optionalMin16String = z.preprocess(
  emptyToUndefined,
  z.string().min(16, "Debe tener al menos 16 caracteres").optional(),
);

export const ServerEnvSchema = z.object({
  // Entorno general y servidor
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: optionalString,
  TRAXO_DATA_DIR: z.string().default(".traxo-data/pg"),
  TRAXO_MEDIA_DIR: z.string().default(".traxo-data/media"),
  TRAXO_SESSION_SECRET: z
    .string()
    .min(32, "TRAXO_SESSION_SECRET debe tener al menos 32 caracteres")
    .default("super_secret_session_token_min_32_characters_long_12345"),

  // Moneda y Mercado Venezuela
  TRAXO_BCV_RATE: z.coerce.number().default(880.0),
  TRAXO_STORE_NAME: z.string().default("Davebeauty"),
  TRAXO_STORE_URL: optionalUrl,

  // WooCommerce HPOS
  WOOCOMMERCE_URL: optionalUrl,
  WOOCOMMERCE_KEY: optionalString,
  WOOCOMMERCE_SECRET: optionalString,

  // Proveedores LLM (Inferencia Multi-Provider en Cascada)
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  XAI_API_KEY: optionalString,
  XAI_MODEL: z.string().default("grok-2-mini"),
  OPENROUTER_API_KEY: optionalString,
  OPENROUTER_MODEL: z.string().default("anthropic/claude-3.5-sonnet"),
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-latest"),

  // Frenos de Gasto y Rate Limiting
  TRAXO_AI: z.string().default("on"),
  TRAXO_AI_PER_MIN: z.coerce.number().default(10),
  TRAXO_AI_PER_STORE_DAILY: z.coerce.number().default(100),
  TRAXO_RATE_PER_MIN: z.coerce.number().default(300),

  // Google Analytics 4 (Data API)
  GA4_PROPERTY_ID: optionalString,
  GA4_SERVICE_ACCOUNT_B64: optionalString,

  // Microsoft Clarity
  CLARITY_PROJECT_ID: optionalString,
  CLARITY_API_TOKEN: optionalString,

  // Integraciones de Salida y Webhooks (Server-to-Server HMAC)
  N8N_OUTBOUND_WEBHOOK_URL: optionalUrl,
  N8N_HMAC_SECRET: optionalMin16String,
  TRAXO_HMAC_SECRET: optionalMin16String,

  // Acceso de Administración y Operación
  TRAXO_ADMIN_EMAIL: optionalEmail,
  TRAXO_ADMIN_PASSWORD: optionalString,
  TRAXO_API_TOKEN: optionalString,
  TRAXO_AUDIT_LIVE: optionalString,
  TRAXO_MCP_TOKEN: optionalString,
  TRAXO_AUTH: optionalString,
  TRAXO_DEMO: optionalString,
  TRAXO_RICH_DEMO: optionalString,
  TRACKING_POLL_MS: z.coerce.number().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let _env: ServerEnv | undefined;

export function loadEnv(override?: Record<string, unknown>): ServerEnv {
  const source = override ?? process.env;
  const parsed = ServerEnvSchema.safeParse(source);
  if (!parsed.success) {
    console.error("❌ Error fatal en variables de entorno del Worker:", parsed.error.format());
    throw new Error(
      `Configuración inválida de variables de entorno: ${JSON.stringify(parsed.error.issues)}`,
    );
  }
  _env = parsed.data;
  return _env;
}

/**
 * Singleton de entorno validado.
 * Se inicializa automáticamente en la primera lectura o mediante loadEnv().
 */
export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string | symbol) {
    if (!_env) {
      _env = loadEnv();
    }
    return Reflect.get(_env, prop);
  },
  set(_target, prop: string | symbol, value: unknown) {
    if (!_env) {
      _env = loadEnv();
    }
    return Reflect.set(_env, prop, value);
  },
});
