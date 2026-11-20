import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import {
  createCorsMiddleware,
  generateServerHmacSignature,
  redactPii,
  sanitizeLogData,
  verifyServerHmacSignature,
} from "../src/security.ts";

describe("Seguridad Server-to-Server HMAC y Redacción de Secretos", () => {
  const SECRET = "test_super_secret_key_hmac_16_chars_min";

  function createTestApp() {
    const app = new Hono();
    app.post("/webhook/secure", verifyServerHmacSignature(SECRET), async (c) => {
      const body = await c.req.json();
      return c.json({ ok: true, data: body });
    });
    return app;
  }

  it("acepta una petición con firma HMAC-SHA256 válida y timestamp fresco", async () => {
    const app = createTestApp();
    const payload = JSON.stringify({ event: "order.created", id: "ord_123" });
    const { signature, timestamp } = generateServerHmacSignature(SECRET, payload);

    const res = await app.request("http://localhost/webhook/secure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-traxo-signature": signature,
        "x-traxo-timestamp": String(timestamp),
      },
      body: payload,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, data: { event: "order.created", id: "ord_123" } });
  });

  it("rechaza si falta la cabecera x-traxo-signature", async () => {
    const app = createTestApp();
    const payload = JSON.stringify({ test: 1 });

    const res = await app.request("http://localhost/webhook/secure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-traxo-timestamp": String(Date.now()),
      },
      body: payload,
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("rechaza si falta la cabecera x-traxo-timestamp", async () => {
    const app = createTestApp();
    const payload = JSON.stringify({ test: 1 });
    const { signature } = generateServerHmacSignature(SECRET, payload);

    const res = await app.request("http://localhost/webhook/secure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-traxo-signature": signature,
      },
      body: payload,
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("rechaza si el timestamp es inválido o no numérico", async () => {
    const app = createTestApp();
    const payload = JSON.stringify({ test: 1 });

    const res = await app.request("http://localhost/webhook/secure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-traxo-signature": "abcdef",
        "x-traxo-timestamp": "not-a-number",
      },
      body: payload,
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Timestamp de firma inválido");
  });

  it("rechaza peticiones con timestamp vencido (> 5 minutos en el pasado / anti-replay)", async () => {
    const app = createTestApp();
    const payload = JSON.stringify({ action: "drain_funds" });
    const sixMinutesAgo = Date.now() - 360_000;
    const { signature } = generateServerHmacSignature(SECRET, payload, sixMinutesAgo);

    const res = await app.request("http://localhost/webhook/secure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-traxo-signature": signature,
        "x-traxo-timestamp": String(sixMinutesAgo),
      },
      body: payload,
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("5 minutos");
  });

  it("rechaza peticiones con timestamp en el futuro lejano (> 5 minutos)", async () => {
    const app = createTestApp();
    const payload = JSON.stringify({ action: "future_event" });
    const sixMinutesFuture = Date.now() + 360_000;
    const { signature } = generateServerHmacSignature(SECRET, payload, sixMinutesFuture);

    const res = await app.request("http://localhost/webhook/secure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-traxo-signature": signature,
        "x-traxo-timestamp": String(sixMinutesFuture),
      },
      body: payload,
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("5 minutos");
  });

  it("rechaza si el cuerpo fue alterado después de firmar", async () => {
    const app = createTestApp();
    const originalPayload = JSON.stringify({ price: 1000 });
    const tamperedPayload = JSON.stringify({ price: 1 });
    const { signature, timestamp } = generateServerHmacSignature(SECRET, originalPayload);

    const res = await app.request("http://localhost/webhook/secure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-traxo-signature": signature,
        "x-traxo-timestamp": String(timestamp),
      },
      body: tamperedPayload,
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("inválida");
  });

  it("rechaza si la firma fue generada con una clave incorrecta", async () => {
    const app = createTestApp();
    const payload = JSON.stringify({ data: "secret" });
    const { signature, timestamp } = generateServerHmacSignature(
      "wrong_key_16_chars_long",
      payload,
    );

    const res = await app.request("http://localhost/webhook/secure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-traxo-signature": signature,
        "x-traxo-timestamp": String(timestamp),
      },
      body: payload,
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("inválida");
  });

  describe("Redactor y Sanitizador de Logs (PII y Secretos)", () => {
    it("enmascara Bearer tokens, cookies y credenciales", () => {
      const input =
        "Authorization: Bearer sk-1234567890abcdef and Cookie: traxo_session=sometoken123";
      const redacted = redactPii(input);
      expect(redacted).not.toContain("sk-1234567890abcdef");
      expect(redacted).not.toContain("sometoken123");
      expect(redacted).toContain("Bearer [REDACTED]");
      expect(redacted).toContain("traxo_session=[REDACTED]");
    });

    it("enmascara API keys de Gemini, Anthropic y xAI", () => {
      const gemini = "Gemini Key: AIzaSyD9876543210123456789012345678901";
      const anthropic = "Anthropic Key: sk-ant-api03-abcdefghijklmnop12345";
      const xai = "xAI Key: xai-1234567890abcdefghijklmnop";

      expect(redactPii(gemini)).toContain("AIzaSy[REDACTED]");
      expect(redactPii(gemini)).not.toContain("AIzaSyD9876543210123456789012345678901");
      expect(redactPii(anthropic)).toContain("sk-[REDACTED]");
      expect(redactPii(xai)).toContain("xai-[REDACTED]");
    });

    it("enmascara correos electrónicos y teléfonos de Venezuela", () => {
      const text = "Cliente maria.perez@example.com con teléfono +584121234567 y 04147654321";
      const redacted = redactPii(text);
      expect(redacted).toContain("m***z@example.com");
      expect(redacted).toContain("+58412***4567");
      expect(redacted).toContain("0414***4321");
    });

    it("sanitizeLogData enmascara claves sensibles en objetos anidados", () => {
      const logObj = {
        user: "admin",
        password: "SuperSecretPassword123",
        apiKey: "AIzaSyABCDEF123456789012345678901234567",
        config: {
          sessionSecret: "super_secret_session_key_32_chars_1234",
          nestedToken: "tok_secret_value",
        },
        payload: {
          email: "test@domain.com",
        },
      };

      const sanitized = sanitizeLogData(logObj) as typeof logObj;
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.apiKey).toBe("[REDACTED]");
      expect(sanitized.config.sessionSecret).toBe("[REDACTED]");
      expect(sanitized.config.nestedToken).toBe("[REDACTED]");
      expect(sanitized.payload.email).toBe("t***t@domain.com");
    });
  });

  describe("CORS Allowlist", () => {
    it("permite orígenes de la lista blanca", async () => {
      const app = new Hono();
      app.use("*", createCorsMiddleware(["https://davebeauty.daverod.tech"]));
      app.get("/api/test", (c) => c.json({ ok: true }));

      const res = await app.request("http://localhost/api/test", {
        headers: { Origin: "https://davebeauty.daverod.tech" },
      });

      expect(res.headers.get("access-control-allow-origin")).toBe(
        "https://davebeauty.daverod.tech",
      );
      expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    });

    it("bloquea o no incluye cabeceras de origen para dominios no autorizados", async () => {
      const app = new Hono();
      app.use("*", createCorsMiddleware(["https://davebeauty.daverod.tech"]));
      app.get("/api/test", (c) => c.json({ ok: true }));

      const res = await app.request("http://localhost/api/test", {
        headers: { Origin: "https://malicious-site.com" },
      });

      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });
  });
});
