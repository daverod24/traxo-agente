# IMPLEMENTATION PLAN (v2): TraxoAgente — Hardened Refactor & Specialized Sub-Agent Delegation

**Status:** APPROVED FOR EXECUTION  
**Version:** 2.0.0-hardened  
**Target Architecture:** Monorepo (`apps/worker`, `apps/dashboard`, `@traxo/core`, `@traxo/db`, `@traxo/storefront`, `@traxo/audit`)  
**Deployment Target:** Dokploy / Docker (Node 22, 1024MB Memory Limit, 768MB Max Old Space)

---

## 1. ARCHITECTURAL PARADIGM SHIFT (v1 vs v2)

| Dimension | v1 Plan (Flawed) | v2 Plan (Hardened & Enforced) |
|---|---|---|
| **Security & Auth** | HMAC signature in frontend bundle (`UI_Mkt -> HMAC`). | Browser uses **Session/JWT + CORS + Rate Limit**. HMAC-SHA256 (`timingSafeEqual` + 5m anti-replay) strictly reserved for **server-to-server** (Worker <-> n8n / Storefront revalidation). |
| **API Keys & Safe HTTP** | Keys passed in query string (`?key=...`), hardcoded model strings. | Single Zod-validated `apps/worker/src/env.ts`. Gemini via `x-goog-api-key` header. Redacted auth logging. All models configurable via env. |
| **LLM Resilience** | Short 4s timeouts, potential OOM from heavy SDKs. | Native `fetch` only (zero heavy SDKs). 8s timeouts, `thinkingBudget: 0` for Gemini 2.5 Flash, provider cascade + Zod validation fallthrough + deterministic category-aware fallback. |
| **Persistence (SSOT)** | In-memory/static constants; divergent pricing across views. | Single source of truth in PostgreSQL (`Product` schema enriched, append-only `marketing_generations`, `funnels`, `analytics_cache`). |
| **Marketing Engine** | Static JSON copy, generic "dermatologico" for all SKUs. | Dynamic `POST /api/marketing/generate` with `mode: "explore"` (anti-repetition negative constraints) & `mode: "refine"` (lineage). Strict server-side category guardrails (oral supplement vs skincare). 3 distinct channel contracts (`meta_ads`, `click_to_whatsapp`, `tiktok_ugc`). |
| **Store & Analytics** | Static AEO checklists and mock sleep delays. | **"Pulso en Vivo"**: Lightweight GA4 Data API client (node:crypto RS256 JWT, zero heavy SDKs) with 60s/15m cache, 4-step funnel, AI Daily Brief, Clarity deep link + 24h cached API, and dynamic bimoneda Schema.org `@graph` (USD + VES a tasa BCV). |
| **Builder Architecture** | Locked to Shopify Liquid or manual `.zip` Astro download. | **Universal Dual-Mode Builder**: Primary = Headless Live API (`GET /api/public/funnels/:slug`) for dynamic Astro/Next storefronts; Secondary = One-click standalone campaign landing export (`.astro` component + self-contained HTML/CSS single-file). |

---

## 2. DATABASE SCHEMA & PERSISTENCE LAYER (`packages/db`)

### 2.1 Prisma Schema Modifications (`packages/db/prisma/schema.prisma`)

```prisma
// Enum de Categoría de Producto para Guardrails Estrictos
enum ProductCategory {
  oral_supplement
  facial_skincare
  body_skincare
  haircare
  general
}

// Enriquecimiento de Product (SSOT)
model Product {
  id                String          @id
  storeId           String
  externalId        String
  title             String
  price             Int             // En centavos USD (ej. 2499 = $24.99)
  cost              Int?            // COGS Dropi en centavos USD
  weightGrams       Int             @default(500)
  imageUrl          String?
  description       String?
  category          ProductCategory @default(general)
  referenceImageUrl String?
  keyIngredients    String[]        @default([])
  commonObjections  String[]        @default([])
  packRules         Json?           // { "1x": { "discountPct": 0 }, "2x": { "discountPct": 10 }, "3x": { "discountPct": 20, "freeShipping": true } }
  
  store             Store           @relation(fields: [storeId], references: [id])
  generations       MarketingGeneration[]
  funnels           Funnel[]

  @@unique([storeId, externalId])
  @@index([storeId])
}

// Tabla Append-Only de Generaciones de Marketing
model MarketingGeneration {
  id                 String   @id
  storeId            String
  productId          String
  channel            String   // "meta_ads" | "click_to_whatsapp" | "tiktok_ugc"
  angle              String   // "ugc" | "clinico" | "escasez_cod" | etc.
  mode               String   // "explore" | "refine"
  parentGenerationId String?  // Referencia a versión previa para refinamiento
  userInstruction    String?  // Instrucción del usuario en caso de refinamiento
  outputJson         Json     // Salida validada por Zod
  provider           String   // "gemini" | "grok" | "openrouter" | "claude" | "deterministic"
  model              String
  latencyMs          Int
  status             String   @default("generated") // "generated" | "dispatched_n8n" | "archived"
  createdAt          DateTime @default(now())

  store              Store    @relation(fields: [storeId], references: [id])
  product            Product  @relation(fields: [productId], references: [id])

  @@index([storeId, productId, channel])
  @@index([parentGenerationId])
}

// Tabla de Funnels / Landings (Dual-Mode Builder)
model Funnel {
  id           String   @id
  storeId      String
  slug         String
  title        String
  productId    String
  sectionsJson Json     // Bloques activos (Hero, Packs, TrustBadges, FAQ, etc.)
  tokensJson   Json     // Paleta de colores, fuentes, espaciados
  published    Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  store        Store    @relation(fields: [storeId], references: [id])
  product      Product  @relation(fields: [productId], references: [id])

  @@unique([storeId, slug])
  @@index([slug])
}

// Caché de Analítica para GA4 y Clarity
model AnalyticsCache {
  id          String   @id
  storeId     String
  metricType  String   // "ga4_realtime" | "ga4_funnel" | "ai_daily_brief" | "clarity_metrics"
  payloadJson Json
  expiresAt   DateTime
  updatedAt   DateTime @updatedAt

  @@unique([storeId, metricType])
  @@index([expiresAt])
}
```

### 2.2 SQL Patches (`packages/db/prisma/patches.sql`)
Actualizaciones idempotentes en SQL puro para sincronizar PGlite y Postgres sin pérdida de datos.

---

## 3. CONTRATOS DE API Y ESQUEMAS ZOD

### 3.1 Entorno Zod Server-Only (`apps/worker/src/env.ts`)
```typescript
import { z } from "zod";

export const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().optional(),
  TRAXO_DATA_DIR: z.string().default(".traxo-data/pg"),
  TRAXO_SESSION_SECRET: z.string().min(32, "TRAXO_SESSION_SECRET debe tener al menos 32 caracteres"),
  
  // LLM Providers (Opcionales con fallback determinista)
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  XAI_API_KEY: z.string().optional(),
  XAI_MODEL: z.string().default("grok-2-mini"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("anthropic/claude-3.5-sonnet"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-latest"),

  // Google Analytics 4 (Data API)
  GA4_PROPERTY_ID: z.string().optional(),
  GA4_SERVICE_ACCOUNT_B64: z.string().optional(), // JSON de cuenta de servicio en Base64

  // Microsoft Clarity
  CLARITY_PROJECT_ID: z.string().optional(),
  CLARITY_API_TOKEN: z.string().optional(),

  // Parámetros de Mercado Venezuela
  TRAXO_BCV_RATE: z.coerce.number().default(880.0),
  N8N_OUTBOUND_WEBHOOK_URL: z.string().url().optional(),
  N8N_HMAC_SECRET: z.string().min(16).optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;
export let env: ServerEnv;

export function loadEnv(): ServerEnv {
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Error fatal en variables de entorno del Worker:", parsed.error.format());
    throw new Error("Configuración inválida de variables de entorno");
  }
  env = parsed.data;
  return env;
}
```

### 3.2 Esquemas de Generación de Marketing

```typescript
// Output para Meta Ads (CBO / Advantage+)
export const MetaAdsOutputSchema = z.object({
  channel: z.literal("meta_ads"),
  campaignName: z.string(),
  hooks: z.array(z.string()).min(3).max(5),
  primaryTexts: z.array(z.string()).min(2).max(4),
  headlines: z.array(z.string()).min(3).max(5),
  visualPrompts: z.object({
    ratio4x5: z.string(),
    ratio9x16: z.string(),
    safeZoneText: z.string(),
  }),
  utmTemplate: z.string(),
});

// Output para Click-to-WhatsApp (COD Venezuela)
export const ClickToWhatsAppOutputSchema = z.object({
  channel: z.literal("click_to_whatsapp"),
  adCopy: z.string(),
  prefilledWhatsAppMessage: z.string(),
  closingScript: z.object({
    step1Greeting: z.string(),
    step2PricingBimoneda: z.string(), // USD + VES a BCV
    step3LogisticsConfirm: z.string(), // Flash Courier / MRW / Zoom
  }),
});

// Output para TikTok Spark / UGC
export const TikTokUgcOutputSchema = z.object({
  channel: z.literal("tiktok_ugc"),
  hooks0to3s: z.array(z.string()).min(3),
  script30s: z.array(
    z.object({
      timestamp: z.string(),
      cameraCue: z.string(),
      audioVoiceover: z.string(),
      onScreenText: z.string(),
    })
  ),
  soundSuggestion: z.string(),
});

export const MarketingGenerationOutputSchema = z.discriminatedUnion("channel", [
  MetaAdsOutputSchema,
  ClickToWhatsAppOutputSchema,
  TikTokUgcOutputSchema,
]);
```

---

## 4. DELEGACIÓN DE SUB-AGENTES ESPECIALIZADOS

```mermaid
graph TD
    Coord["Lead Orchestrator (Antigravity Coordinator)"]
    SA1["Sub-Agent 1: Backend Core, Security & DB"]
    SA2["Sub-Agent 2: AI Marketing Engine & n8n"]
    SA3["Sub-Agent 3: Live Analytics & Dynamic SEO"]
    SA4["Sub-Agent 4: Universal Builder & Dashboard UI"]
    SA5["Sub-Agent 5: QA & Verification Engineer"]

    Coord --> SA1
    Coord --> SA2
    Coord --> SA3
    Coord --> SA4
    Coord --> SA5

    SA1 -.->|P0 DB & Env Ready| SA2
    SA1 -.->|P0 DB & Env Ready| SA3
    SA2 -.->|API Contracts Locked| SA4
    SA3 -.->|Analytics Ready| SA4
    SA5 -.->|Validates Gates| SA1
    SA5 -.->|Validates Gates| SA2
    SA5 -.->|Validates Gates| SA3
    SA5 -.->|Validates Gates| SA4
```

### 4.1 Sub-Agent 1: Backend Core, Security & DB Architect
* **Propiedad de Archivos:**
  - `apps/worker/src/env.ts` [NEW]
  - `packages/db/prisma/schema.prisma` [MODIFY]
  - `packages/db/prisma/patches.sql` [MODIFY]
  - `packages/db/src/client.ts` [MODIFY]
  - `apps/worker/src/security.ts` [MODIFY] (server-to-server HMAC con `timingSafeEqual`, 5m anti-replay, sin HMAC en browser)
  - `apps/worker/src/auth.ts` [MODIFY] (JWT session validation para dashboard + CORS)
* **Definición de Terminado (DoD):**
  - `pnpm --filter @traxo/db generate` compila sin errores.
  - Migración idempotente en `patches.sql` probada en PGlite y Postgres.
  - Middleware HMAC rechaza firmas inválidas y timestamps expirados (>300s).

### 4.2 Sub-Agent 2: AI Marketing Engine & n8n Integrator
* **Propiedad de Archivos:**
  - `apps/worker/src/ai-provider.ts` [NEW] (Fetch nativo, cascade Gemini 8s -> Grok 8s -> OpenRouter 8s -> Determinista 2ms)
  - `apps/worker/src/services/marketing-generator.ts` [NEW] (Modos `explore`/`refine`, guardrails por categoría)
  - `apps/worker/src/services/deterministic-engine.ts` [NEW] (Generador de respaldo con semillas PRNG y guardrails de suplemento vs skincare)
  - `apps/worker/src/growth.ts` [MODIFY] (Endpoint `POST /api/marketing/generate` y `POST /api/marketing/:id/dispatch-n8n`)
* **Definición de Terminado (DoD):**
  - Si Gemini/Grok fallan o no tienen API key, conmuta transparentemente al fallback determinista sin error 500.
  - Guardrails activos: `oral_supplement` nunca genera menciones a aplicación tópica o k-beauty facial.
  - Webhook a n8n firmado con `X-Traxo-Signature`.

### 4.3 Sub-Agent 3: Live Analytics ("Pulso en Vivo") & Dynamic SEO Specialist
* **Propiedad de Archivos:**
  - `apps/worker/src/services/ga4-client.ts` [NEW] (RS256 JWT con `node:crypto` + native `fetch`, 60s realtime cache, 15m funnel cache)
  - `apps/worker/src/services/clarity-client.ts` [NEW] (Link directo + 24h cached API export adapter)
  - `apps/worker/src/services/ai-brief.ts` [NEW] (Insight de 3 líneas en español combinando GA4 y órdenes Traxo)
  - `apps/worker/src/services/dynamic-seo.ts` [NEW] (Generador dinámico de `@graph` JSON-LD con precios USD y VES a tasa oficial BCV)
  - `apps/worker/src/growth.ts` [MODIFY] (Exposición de endpoints de analítica y SEO)
* **Definición de Terminado (DoD):**
  - Cero dependencias pesadas de Google/Clarity.
  - Respuesta de analítica en <100ms si está en caché.
  - El Schema `@graph` computa dinámicamente el precio en Bolívares con `TRAXO_BCV_RATE`.

### 4.4 Sub-Agent 4: Universal Headless/Standalone Builder & Dashboard UI Engineer
* **Propiedad de Archivos:**
  - `packages/storefront/src/*` [MODIFY] (Depurar Shopify Liquid; implementar renderizador de funnels, `PacksLadder.astro` y exportador HTML autónomo)
  - `apps/worker/src/builder.ts` [MODIFY] (Endpoints `GET /api/public/funnels/:slug` y `GET /api/builder/:id/export-*`)
  - `apps/dashboard/src/views-marketing-strategy.tsx` [MODIFY] (Cockpit unificado: Regenerar con `explore`, Refinar con `refine`, Historial de versiones, Botón de n8n)
  - `apps/dashboard/src/views-store.tsx` [MODIFY] ("Pulso en Vivo" con métricas GA4/Clarity, resumen de IA y SEO dinámico)
  - `apps/dashboard/src/views-builder.tsx` [MODIFY] (Previsualización en tiempo real vía iframe, editor de escalera de packs y exportador dual)
* **Definición de Terminado (DoD):**
  - Dashboard carga fluidamente sin errores de consola.
  - El constructor permite publicar hacia la API pública o descargar landing autónoma funcional con checkout directo por WhatsApp.

### 4.5 Sub-Agent 5: QA & Verification Engineer
* **Propiedad de Archivos:**
  - `apps/worker/test/ai-provider.test.ts` [NEW]
  - `apps/worker/test/marketing-guardrails.test.ts` [NEW]
  - `apps/worker/test/security-hmac.test.ts` [NEW]
  - `apps/worker/test/ga4-cache.test.ts` [NEW]
  - `packages/storefront/test/builder.test.ts` [NEW]
* **Definición de Terminado (DoD):**
  - Todas las suites de prueba pasan al 100% con código 0.
  - `pnpm -r typecheck` y `pnpm -r lint` limpios.

---

## 5. DOKPLOY RUNTIME CONFIGURATION (`.env.example`)

```env
# ==========================================
# TRAXO AGENTE — ENTORNO DOKPLOY / PRODUCTION
# ==========================================

# Entorno General
NODE_ENV=production
PORT=4000
TRAXO_SESSION_SECRET=super_secret_session_token_min_32_characters_long_12345
DATABASE_URL=postgresql://traxo:secret@postgres:5432/traxo

# Mercado y Moneda Venezuela
TRAXO_BCV_RATE=880.00

# Proveedores LLM (Inferencia Multi-Provider)
# Si se omiten, el sistema opera con el motor determinista local firmado
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash
XAI_API_KEY=xai-...
XAI_MODEL=grok-2-mini
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-latest

# Analítica en Vivo (GA4 & Microsoft Clarity)
GA4_PROPERTY_ID=123456789
GA4_SERVICE_ACCOUNT_B64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6...
CLARITY_PROJECT_ID=abcdef1234
CLARITY_API_TOKEN=

# Integraciones de Salida (n8n & Webhooks)
N8N_OUTBOUND_WEBHOOK_URL=https://n8n.daverod.tech/webhook/traxo-creative-pipeline
N8N_HMAC_SECRET=n8n_hmac_secret_key_16_chars_min
```

---

## 6. PROTOCOLO DE VERIFICACIÓN ESTRICTA (VERIFICATION GATES)

Para dar por concluida cada fase, se debe ejecutar y aprobar sin advertencias:
```bash
# 1. Regenerar cliente Prisma
pnpm --filter @traxo/db generate

# 2. Pruebas unitarias y de integración
pnpm --filter @traxo/core test
pnpm --filter @traxo/worker test

# 3. Verificación de Tipos Estricta en todo el Monorepo
pnpm -r typecheck

# 4. Linting y Formato
pnpm -r lint

# 5. Compilación de Producción
pnpm --filter @traxo/dashboard build
pnpm --filter @traxo/worker build
```
Cero tolerancia a `@ts-ignore`, `any` injustificado o tests comentados.
