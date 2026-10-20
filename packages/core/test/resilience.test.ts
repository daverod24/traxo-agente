import { describe, expect, it } from "vitest";
import { retryWithBackoff, SloMetricsTracker } from "../src/resilience.ts";

describe("L6-A2: Resiliencia, Reintentos y Métricas SLO (Gate G6)", () => {
  it("retryWithBackoff tiene éxito inmediato si la operación no falla", async () => {
    let calls = 0;
    const result = await retryWithBackoff(async () => {
      calls++;
      return "éxito";
    });

    expect(result).toBe("éxito");
    expect(calls).toBe(1);
  });

  it("retryWithBackoff reintenta ante errores 429 y 500 y se recupera", async () => {
    let calls = 0;
    const result = await retryWithBackoff(
      async () => {
        calls++;
        if (calls === 1) {
          const err: any = new Error("Rate limit");
          err.status = 429;
          throw err;
        }
        if (calls === 2) {
          const err: any = new Error("Gateway timeout");
          err.status = 504;
          throw err;
        }
        return "recuperado";
      },
      { initialDelayMs: 10, maxDelayMs: 50 },
    );

    expect(result).toBe("recuperado");
    expect(calls).toBe(3);
  });

  it("retryWithBackoff no reintenta ante errores 400 o 401 (fail-fast)", async () => {
    let calls = 0;
    await expect(
      retryWithBackoff(
        async () => {
          calls++;
          const err: any = new Error("Unauthorized");
          err.status = 401;
          throw err;
        },
        { initialDelayMs: 10 },
      ),
    ).rejects.toThrow("Unauthorized");

    expect(calls).toBe(1);
  });

  it("SloMetricsTracker calcula disponibilidad, percentiles de latencia y detecta brechas de SLO", () => {
    const tracker = new SloMetricsTracker();

    // Registrar 999 peticiones exitosas (10ms a 50ms)
    for (let i = 0; i < 999; i++) {
      tracker.recordRequest({ success: true, latencyMs: 20 + (i % 30) });
    }

    // Registrar 1 petición fallida (500)
    tracker.recordRequest({ success: false, status: 500, latencyMs: 150 });

    const report = tracker.getReport();
    expect(report.totalRequests).toBe(1000);
    expect(report.successfulRequests).toBe(999);
    expect(report.failedRequests).toBe(1);
    expect(report.serverErrors).toBe(1);
    expect(report.availabilityPercent).toBe(99.9);
    expect(report.isBreached).toBe(false);
    expect(report.p50LatencyMs).toBeGreaterThan(0);
    expect(report.p95LatencyMs).toBeGreaterThan(0);
  });
});
