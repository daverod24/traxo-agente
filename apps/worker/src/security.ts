import { createHmac, timingSafeEqual } from "node:crypto";
import type { Context, Hono, MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { ipOf } from "./auth.ts";

export const isLoopback = (c: Context): boolean => {
  const host = new URL(c.req.url).hostname;
  return !c.req.header("x-forwarded-for") && (host === "localhost" || host === "127.0.0.1");
};

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4000",
  "http://localhost:3000",
  "http://localhost:4321",
  "https://davebeauty.daverod.tech",
  "https://dashboard.daverod.tech",
];

/**
 * Middleware CORS para el dashboard y storefronts autorizados.
 */
export function createCorsMiddleware(allowedOrigins?: string[]): MiddlewareHandler {
  const origins =
    allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;

  return cors({
    origin: (origin) => {
      if (!origin) return origins[0];
      if (origins.includes(origin)) return origin;
      if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return origin;
      }
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-store-id",
      "x-traxo-signature",
      "x-traxo-timestamp",
      "x-traxo-internal",
    ],
    credentials: true,
    maxAge: 86400,
  });
}

/**
 * Middleware de seguridad server-to-server mediante HMAC-SHA256 con timingSafeEqual y anti-replay (5 min).
 */
export function verifyServerHmacSignature(secret: string): MiddlewareHandler {
  return async (c, next) => {
    const signature = c.req.header("x-traxo-signature") ?? c.req.header("X-Traxo-Signature");
    const timestampStr = c.req.header("x-traxo-timestamp") ?? c.req.header("X-Traxo-Timestamp");

    if (!signature || !timestampStr) {
      return c.json(
        {
          ok: false,
          error: "Cabeceras de firma requeridas ausentes (x-traxo-signature, x-traxo-timestamp).",
        },
        401,
      );
    }

    const timestamp = Number(timestampStr);
    if (isNaN(timestamp) || !Number.isFinite(timestamp)) {
      return c.json({ ok: false, error: "Timestamp de firma inválido." }, 401);
    }

    const now = Date.now();
    const diff = Math.abs(now - timestamp);
    // Ventana máxima de 5 minutos (300,000 ms) para prevenir ataques de replay
    if (diff > 300_000) {
      return c.json(
        { ok: false, error: "Firma expirada: el timestamp difiere por más de 5 minutos." },
        401,
      );
    }

    const rawBody = await c.req.text();
    const payload = `${timestamp}.${rawBody}`;
    const cleanSignature = signature.replace(/^sha256=/, "").trim();

    const expectedHex = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
    const sigBuf = Buffer.from(cleanSignature);
    const expectedHexBuf = Buffer.from(expectedHex);

    let isValid =
      sigBuf.length === expectedHexBuf.length && timingSafeEqual(sigBuf, expectedHexBuf);

    if (!isValid) {
      const expectedB64 = createHmac("sha256", secret).update(payload, "utf8").digest("base64");
      const expectedB64Buf = Buffer.from(expectedB64);
      if (sigBuf.length === expectedB64Buf.length && timingSafeEqual(sigBuf, expectedB64Buf)) {
        isValid = true;
      }
    }

    if (!isValid) {
      return c.json({ ok: false, error: "Firma HMAC inválida." }, 401);
    }

    await next();
  };
}

/**
 * Genera la firma HMAC-SHA256 para llamadas salientes server-to-server (ej. n8n, revalidación).
 */
export function generateServerHmacSignature(
  secret: string,
  body: string,
  timestamp: number = Date.now(),
): { signature: string; timestamp: number; headers: Record<string, string> } {
  const payload = `${timestamp}.${body}`;
  const signature = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  return {
    signature,
    timestamp,
    headers: {
      "x-traxo-signature": signature,
      "x-traxo-timestamp": String(timestamp),
    },
  };
}

/**
 * Endurecimiento de lo que queda expuesto a internet:
 *  - CORS allowlist para frontend y dashboard,
 *  - cabeceras de seguridad en todo,
 *  - límite de peticiones por IP en /api y /mcp,
 *  - tope de tamaño del cuerpo (1 MB; solo la subida de archivos admite más),
 *  - /mcp cerrado salvo con token (o desde tu propio computador),
 *  - una tienda real sin ninguna autenticación solo responde desde tu propio computador.
 */
export function hardenApp(
  app: Hono,
  opts: {
    authConfigured: boolean;
    live: boolean;
    mcpToken?: string;
    allowedOrigins?: string[];
  },
): void {
  // 1. CORS allowlist
  app.use("*", createCorsMiddleware(opts.allowedOrigins));

  // 2. Cabeceras de seguridad HTTP
  app.use("*", async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
    // La vista previa del constructor se muestra en un marco del mismo sitio y fija su propia regla.
    if (!c.res.headers.has("X-Frame-Options")) c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    c.header("Cross-Origin-Opener-Policy", "same-origin");
    if (new URL(c.req.url).protocol === "https:" || c.req.header("x-forwarded-proto") === "https")
      c.header("Strict-Transport-Security", "max-age=31536000");
  });

  const hits = new Map<string, { n: number; t: number }>();
  const perMinute = Number(process.env.TRAXO_RATE_PER_MIN ?? 300);
  app.use("*", async (c, next) => {
    const path = new URL(c.req.url).pathname;
    if (!path.startsWith("/api/") && path !== "/mcp") return next();
    if (path === "/api/stream") return next();
    const k = ipOf(c);
    const now = Date.now();
    const h = hits.get(k);
    if (!h || now - h.t > 60_000) hits.set(k, { n: 1, t: now });
    else if (++h.n > perMinute)
      return c.json({ ok: false, message: "Demasiadas peticiones. Espera un minuto." }, 429);
    if (hits.size > 5000) for (const [key, v] of hits) if (now - v.t > 60_000) hits.delete(key);
    return next();
  });

  const small = bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) => c.json({ ok: false, message: "La petición es demasiado grande." }, 413),
  });
  app.use("/api/*", async (c, next) => {
    const path = new URL(c.req.url).pathname;
    return path === "/api/media/upload" ? next() : small(c, next);
  });

  app.use("/mcp", async (c, next) => {
    if (!opts.mcpToken && !isLoopback(c))
      return c.json(
        { error: "/mcp está cerrado: define TRAXO_MCP_TOKEN para usarlo fuera de tu computador." },
        401,
      );
    return next();
  });

  if (opts.live && !opts.authConfigured)
    app.use("/api/*", async (c, next) => {
      if (isLoopback(c)) return next();
      return c.json(
        {
          ok: false,
          message:
            "Esta instalación tiene una tienda real y no tiene acceso configurado. Define TRAXO_ADMIN_EMAIL y TRAXO_ADMIN_PASSWORD (o TRAXO_API_TOKEN).",
        },
        403,
      );
    });
}

/**
 * Sanitiza texto eliminando o enmascarando Información de Identificación Personal (PII)
 * y secretos (Bearer tokens, API keys, cookies, passwords, teléfonos E.164, correos).
 */
export function redactPii(text: string): string {
  if (!text) return text;

  let redacted = text;

  // 1. Redactar Tokens Bearer
  redacted = redacted.replace(/Bearer\s+([A-Za-z0-9_\-\.]{8,})/gi, "Bearer [REDACTED]");

  // 2. Redactar API Keys conocidas (Gemini, Anthropic, OpenAI, xAI)
  redacted = redacted.replace(/AIza[A-Za-z0-9_\-]{30,45}/g, "AIzaSy[REDACTED]");
  redacted = redacted.replace(/sk-(?:ant-)?[A-Za-z0-9_\-]{16,}/g, "sk-[REDACTED]");
  redacted = redacted.replace(/xai-[A-Za-z0-9_\-]{16,}/g, "xai-[REDACTED]");

  // 3. Redactar Cookies específicas y sesión
  redacted = redacted.replace(/(traxo_session)=([^;\s\r\n]+)/gi, "$1=[REDACTED]");

  // 4. Redactar campos JSON o pares clave:valor de credenciales
  redacted = redacted.replace(
    /(token|secret|password|apiKey|api_key|wc_sec)["']?\s*[:=]\s*["']?([^"'\s,;]+)/gi,
    '$1: "[REDACTED]"',
  );

  // 5. Redactar correos electrónicos: valeria@davebeauty.test -> v***a@davebeauty.test
  redacted = redacted.replace(
    /([a-zA-Z0-9_\.\-]+)@([a-zA-Z0-9_\.\-]+\.[a-zA-Z]{2,})/g,
    (_, user, domain) => {
      if (user.length <= 2) return `*@${domain}`;
      return `${user[0]}***${user[user.length - 1]}@${domain}`;
    },
  );

  // 6. Redactar números de teléfono (+58... y 04...)
  redacted = redacted.replace(/\+58(412|414|424|416|426|2\d{2})\d{7}/g, (match) => {
    return `${match.slice(0, 6)}***${match.slice(-4)}`;
  });
  redacted = redacted.replace(/0(412|414|424|416|426)\d{7}/g, (match) => {
    return `${match.slice(0, 4)}***${match.slice(-4)}`;
  });

  return redacted;
}

/**
 * Registra logs estructurados garantizando la ausencia de PII o secretos en texto plano.
 */
export function sanitizeLogData(data: unknown): unknown {
  if (typeof data === "string") {
    return redactPii(data);
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }
  if (data !== null && typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("secret") ||
        lower.includes("token") ||
        lower.includes("password") ||
        lower.includes("auth") ||
        lower.includes("cookie") ||
        lower.includes("apikey") ||
        lower.includes("api_key") ||
        lower === "key" ||
        lower.includes("session")
      ) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }
  return data;
}
