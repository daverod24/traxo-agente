import { describe, expect, it } from "vitest";
import { dateEs, dateTimeVe, timeEs } from "../src/format.ts";

describe("format VE (America/Caracas)", () => {
  it("formatea fechas y horas en zona horaria America/Caracas (UTC-4)", () => {
    // 2026-11-26T02:15:00Z = 2026-11-25 22:15 (10:15 p. m.) en America/Caracas
    const iso = "2026-11-26T02:15:00.000Z";
    const d = dateEs(iso);
    const t = timeEs(iso);
    const dt = dateTimeVe(iso);

    expect(d).toContain("25");
    expect(d.toLowerCase()).toContain("nov");
    expect(d).toContain("2026");
    expect(t).toContain("10:15");
    expect(dt).toContain("25");
    expect(dt).toContain("10:15");
    expect(dt).toContain("VET");
  });

  it("maneja fechas inválidas o nulas devolviendo '—'", () => {
    expect(dateEs("fecha-invalida")).toBe("—");
    expect(timeEs("")).toBe("—");
    expect(dateTimeVe(null)).toBe("—");
    expect(dateTimeVe(undefined)).toBe("—");
  });
});
