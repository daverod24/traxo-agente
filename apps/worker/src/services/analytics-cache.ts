import type { Prisma, PrismaClient } from "@traxo/db";

/**
 * Capa de caché híbrida (Memoria + PostgreSQL/PGlite AnalyticsCache)
 * Proporciona respuesta <100ms para consultas frecuentes y persistencia entre reinicios.
 */

export type CachePrismaClient = Pick<PrismaClient, "analyticsCache">;

const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

/**
 * Limpia la caché en memoria (útil para pruebas unitarias).
 */
export function clearAnalyticsMemoryCache(): void {
  memoryCache.clear();
}

/**
 * Obtiene o calcula un valor de analítica con caché de dos niveles (Memoria + DB).
 */
export async function getOrSetAnalyticsCache<T>(
  prisma: CachePrismaClient | null | undefined,
  storeId: string,
  metricType: string,
  ttlMs: number,
  computeFn: () => Promise<T>,
  forceRefresh = false,
): Promise<T> {
  const cacheKey = `${storeId}:${metricType}`;
  const now = Date.now();

  if (!forceRefresh) {
    // Nivel 1: Memoria RAM (<1ms)
    const mem = memoryCache.get(cacheKey);
    if (mem && mem.expiresAt > now) {
      return mem.data as T;
    }

    // Nivel 2: Tabla AnalyticsCache en PostgreSQL (<20ms)
    if (prisma?.analyticsCache) {
      try {
        const row = await prisma.analyticsCache.findUnique({
          where: { storeId_metricType: { storeId, metricType } },
        });
        if (row && row.expiresAt.getTime() > now) {
          memoryCache.set(cacheKey, { data: row.payloadJson, expiresAt: row.expiresAt.getTime() });
          return row.payloadJson as T;
        }
      } catch {
        // En caso de degradación temporal de BD, computar directamente
      }
    }
  }

  // Computar dato fresco
  const fresh = await computeFn();
  const expiresAt = new Date(now + ttlMs);
  memoryCache.set(cacheKey, { data: fresh, expiresAt: expiresAt.getTime() });

  // Persistir en DB si está disponible
  if (prisma?.analyticsCache) {
    try {
      await prisma.analyticsCache.upsert({
        where: { storeId_metricType: { storeId, metricType } },
        create: {
          id: `ac_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          storeId,
          metricType,
          payloadJson: fresh as Prisma.InputJsonValue,
          expiresAt,
        },
        update: {
          payloadJson: fresh as Prisma.InputJsonValue,
          expiresAt,
        },
      });
    } catch {
      // Ignora fallo de inserción si el entorno de prueba no tiene la tabla montada
    }
  }

  return fresh;
}
