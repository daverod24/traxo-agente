import { describe, expect, it, vi } from "vitest";
import { computePackStocks, fetchDropiProductStock } from "../src/dropi-stock.ts";

describe("Dropi Stock & Pack Computation", () => {
  it("calcula stock de packs 1x, 2x y 3x por defecto usando división entera", () => {
    const res = computePackStocks(10);
    expect(res.physicalStock).toBe(10);
    expect(res.parentStockQuantity).toBe(10);
    expect(res.parentStockStatus).toBe("instock");
    expect(res.packs[1]).toEqual({
      packQty: 1,
      stockQuantity: 10,
      stockStatus: "instock",
      manageStock: true,
    });
    expect(res.packs[2]).toEqual({
      packQty: 2,
      stockQuantity: 5,
      stockStatus: "instock",
      manageStock: true,
    });
    expect(res.packs[3]).toEqual({
      packQty: 3,
      stockQuantity: 3,
      stockStatus: "instock",
      manageStock: true,
    });
  });

  it("marca outofstock cuando el stock físico es insuficiente para un pack", () => {
    const res = computePackStocks(2, [1, 2, 3]);
    expect(res.parentStockStatus).toBe("instock");
    expect(res.packs[1]?.stockQuantity).toBe(2);
    expect(res.packs[1]?.stockStatus).toBe("instock");
    expect(res.packs[2]?.stockQuantity).toBe(1);
    expect(res.packs[2]?.stockStatus).toBe("instock");
    expect(res.packs[3]?.stockQuantity).toBe(0);
    expect(res.packs[3]?.stockStatus).toBe("outofstock");
  });

  it("normaliza stock negativo o NaN a 0 y marca todo outofstock", () => {
    const res = computePackStocks(-5, [1, 2, 3]);
    expect(res.physicalStock).toBe(0);
    expect(res.parentStockQuantity).toBe(0);
    expect(res.parentStockStatus).toBe("outofstock");
    expect(res.packs[1]?.stockStatus).toBe("outofstock");
    expect(res.packs[2]?.stockStatus).toBe("outofstock");
    expect(res.packs[3]?.stockStatus).toBe("outofstock");
  });

  it("fetchDropiProductStock retorna configured:false limpiamente si falta DROPI_API_KEY", async () => {
    const res = await fetchDropiProductStock("196", {});
    expect(res).toEqual({
      ok: false,
      configured: false,
      reason: "DROPI_API_KEY not configured",
    });
  });

  it("fetchDropiProductStock consulta Dropi cuando está configurado y parsea stock numérico", async () => {
    const mockFetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ data: { id: 196, stock: 14 } }),
      } as Response;
    });

    const res = await fetchDropiProductStock("196", {
      apiUrl: "https://api.dropi.test/api",
      apiKey: "dropi_secret_key",
      fetch: mockFetch as any,
    });

    expect(res).toEqual({
      ok: true,
      configured: true,
      dropiProductId: "196",
      physicalStock: 14,
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
