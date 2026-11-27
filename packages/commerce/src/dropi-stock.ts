import type { StockStatus } from "@traxo/core";

export type PackStockEntry = {
  packQty: number;
  stockQuantity: number;
  stockStatus: StockStatus;
  manageStock: boolean;
};

export type ComputePackStocksResult = {
  physicalStock: number;
  parentStockQuantity: number;
  parentStockStatus: StockStatus;
  packs: Record<number, PackStockEntry>;
};

const DEFAULT_PACK_QTYS = [1, 2, 3];

/**
 * Calcula el stock disponible para el producto padre y sus variaciones de pack (1x, 2x, 3x, etc.)
 * a partir del inventario físico real en Dropi.
 */
export function computePackStocks(
  physicalStock: number,
  packQtys: number[] = DEFAULT_PACK_QTYS,
): ComputePackStocksResult {
  const safePhysical =
    typeof physicalStock === "number" && Number.isFinite(physicalStock)
      ? Math.max(0, Math.floor(physicalStock))
      : 0;

  const qtys = packQtys.length > 0 ? packQtys : DEFAULT_PACK_QTYS;
  const packs: Record<number, PackStockEntry> = {};

  for (const qty of qtys) {
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const normalizedQty = Math.floor(qty);
    const stockQuantity = Math.floor(safePhysical / normalizedQty);
    packs[normalizedQty] = {
      packQty: normalizedQty,
      stockQuantity,
      stockStatus: stockQuantity > 0 ? "instock" : "outofstock",
      manageStock: true,
    };
  }

  return {
    physicalStock: safePhysical,
    parentStockQuantity: safePhysical,
    parentStockStatus: safePhysical > 0 ? "instock" : "outofstock",
    packs,
  };
}

export type DropiStockConfig = {
  apiUrl?: string;
  apiKey?: string;
  fetch?: typeof fetch;
};

export type DropiProductStockResult =
  | {
      ok: true;
      configured: true;
      dropiProductId: string;
      physicalStock: number;
    }
  | {
      ok: false;
      configured: boolean;
      reason: string;
    };

const DEFAULT_DROPI_API_URL = "https://api.dropi.ve/api";

/**
 * Consulta el stock físico de un producto en Dropi.
 * Si DROPI_API_KEY no está configurado, retorna cleanly { ok: false, configured: false } sin lanzar ni inventar stock.
 */
export async function fetchDropiProductStock(
  dropiProductId: string,
  config: DropiStockConfig = {},
): Promise<DropiProductStockResult> {
  const apiKey = config.apiKey?.trim();
  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      reason: "DROPI_API_KEY not configured",
    };
  }

  const baseUrl = (config.apiUrl?.trim() || DEFAULT_DROPI_API_URL).replace(/\/$/, "");
  const f = config.fetch ?? fetch;
  const url = `${baseUrl}/products/${encodeURIComponent(dropiProductId)}`;

  try {
    const res = await f(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "dropi-integration-key": apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      return {
        ok: false,
        configured: true,
        reason: `Dropi API responded ${res.status}`,
      };
    }

    const payload = (await res.json()) as Record<string, unknown>;
    const nested = (payload.data ?? payload.object ?? payload) as Record<string, unknown>;
    const rawStock =
      nested.stock ?? nested.quantity ?? nested.available_stock ?? payload.stock ?? payload.quantity;

    const parsed = Number(rawStock);
    if (rawStock == null || !Number.isFinite(parsed)) {
      return {
        ok: false,
        configured: true,
        reason: "Dropi response missing numeric stock field",
      };
    }

    return {
      ok: true,
      configured: true,
      dropiProductId,
      physicalStock: Math.max(0, Math.floor(parsed)),
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      reason: err instanceof Error ? err.message : "Dropi request failed",
    };
  }
}
