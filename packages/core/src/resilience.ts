export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Ejecuta una operación asíncrona con reintentos y retroceso exponencial (Exponential Backoff).
 * Cumplimiento: Gate G6 (Manejo de Rate Limits 429 y Errores 5xx).
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 2000;
  const backoffMultiplier = options.backoffMultiplier ?? 2;
  const shouldRetry =
    options.shouldRetry ??
    ((err: any) => {
      const status = err?.status ?? err?.statusCode;
      if (status === 429) return true; // Rate Limit
      if (status >= 500 && status < 600) return true; // Server Error
      return false;
    });

  let lastError: any;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;

      if (attempt === maxRetries || !shouldRetry(err)) {
        throw err;
      }

      // Si el error especifica Retry-After (en segundos), respetarlo
      let waitMs = delay;
      if (err?.retryAfter && typeof err.retryAfter === "number") {
        waitMs = err.retryAfter * 1000;
      }

      await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, maxDelayMs)));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

export interface SloReport {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  serverErrors: number;
  availabilityPercent: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  sloTargetPercent: number;
  isBreached: boolean;
  generatedAt: string;
}

/**
 * Rastreador de Métricas Operativas y Alertas SLO.
 */
export class SloMetricsTracker {
  private total = 0;
  private successful = 0;
  private failed = 0;
  private rateLimited = 0;
  private serverError = 0;
  private readonly latencies: number[] = [];
  private readonly sloTarget = 99.9;

  recordRequest(opts: { success: boolean; status?: number; latencyMs: number }): void {
    this.total++;
    this.latencies.push(opts.latencyMs);

    if (opts.success) {
      this.successful++;
    } else {
      this.failed++;
      if (opts.status === 429) {
        this.rateLimited++;
      } else if (opts.status && opts.status >= 500) {
        this.serverError++;
      }
    }
  }

  getReport(): SloReport {
    const availability = this.total > 0 ? (this.successful / this.total) * 100 : 100;
    const sorted = [...this.latencies].sort((a, b) => a - b);

    const percentile = (p: number) => {
      if (sorted.length === 0) return 0;
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      totalRequests: this.total,
      successfulRequests: this.successful,
      failedRequests: this.failed,
      rateLimitedRequests: this.rateLimited,
      serverErrors: this.serverError,
      availabilityPercent: Number(availability.toFixed(3)),
      p50LatencyMs: percentile(50),
      p95LatencyMs: percentile(95),
      p99LatencyMs: percentile(99),
      sloTargetPercent: this.sloTarget,
      isBreached: availability < this.sloTarget,
      generatedAt: new Date().toISOString(),
    };
  }

  reset(): void {
    this.total = 0;
    this.successful = 0;
    this.failed = 0;
    this.rateLimited = 0;
    this.serverError = 0;
    this.latencies.length = 0;
  }
}
