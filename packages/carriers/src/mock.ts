import type {
  CreatedShipment,
  Quote,
  ShipmentDraft,
  TrackingEvent,
  TrackingStatus,
} from "@traxo/core";
import { BASE_DAYS, BASE_FREIGHT, weightFactor, zoneFor } from "./tariffs.ts";
import type { CarrierProvider } from "./types.ts";

export type CarrierProfile = {
  carrier: string;
  service: string;
  /** Multiplicador sobre el flete base. */
  price: number;
  /** Días adicionales sobre el base de la zona. */
  extraDays: number;
  /** Comisión de recaudo (% del valor a cobrar), con mínimo. */
  codRate: number;
  codMin: number;
  supportsCod: boolean;
  /** Municipios (DANE) que NO cubre, para probar la cobertura. */
  uncovered?: string[];
};

/** Perfiles ilustrativos. Los precios del simulador NO son tarifas reales de las transportadoras. */
export const CARRIER_PROFILES: Record<string, CarrierProfile> = {
  coordinadora: {
    carrier: "Coordinadora",
    service: "Entrega estándar",
    price: 1.06,
    extraDays: 0,
    codRate: 0.025,
    codMin: 3500,
    supportsCod: true,
  },
  interrapidisimo: {
    carrier: "Interrapidísimo",
    service: "Paquete",
    price: 0.92,
    extraDays: 1,
    codRate: 0.022,
    codMin: 3000,
    supportsCod: true,
  },
  servientrega: {
    carrier: "Servientrega",
    service: "Mercancía premier",
    price: 1.0,
    extraDays: 0,
    codRate: 0.028,
    codMin: 3800,
    supportsCod: true,
  },
  tcc: {
    carrier: "TCC",
    service: "Paquetería",
    price: 1.12,
    extraDays: 0,
    codRate: 0.03,
    codMin: 4200,
    supportsCod: false,
  },
  deprisa: {
    carrier: "Deprisa",
    service: "Paquete",
    price: 1.03,
    extraDays: 0,
    codRate: 0.03,
    codMin: 4000,
    supportsCod: false,
  },
  envia: {
    carrier: "Envía",
    service: "Entrega estándar",
    price: 0.88,
    extraDays: 1,
    codRate: 0.02,
    codMin: 2800,
    supportsCod: true,
  },
  flash: {
    carrier: "Flash Courier (Dropi)",
    service: "Despacho Dropi VE",
    price: 1.0,
    extraDays: 0,
    codRate: 0.02,
    codMin: 3,
    supportsCod: true,
  },
  mrw: {
    carrier: "MRW Venezuela",
    service: "Nacional Agencia/Puerta",
    price: 0.95,
    extraDays: 1,
    codRate: 0.025,
    codMin: 3.5,
    supportsCod: true,
  },
  zoom: {
    carrier: "Grupo Zoom",
    service: "Casillero y Encomiendas",
    price: 1.05,
    extraDays: 0,
    codRate: 0.02,
    codMin: 4,
    supportsCod: true,
  },
  tealca: {
    carrier: "Tealca",
    service: "Carga y Envíos Asegurados",
    price: 1.1,
    extraDays: 0,
    codRate: 0.03,
    codMin: 4,
    supportsCod: false,
  },
  "caracas-express": {
    carrier: "Caracas Express",
    service: "Entrega El Mismo Día",
    price: 0.9,
    extraDays: 0,
    codRate: 0.015,
    codMin: 2.5,
    supportsCod: true,
  },
};

export type MockProviderOptions = {
  id: string;
  label: string;
  /** Qué transportadoras (claves de CARRIER_PROFILES) alcanza esta vía. */
  carriers: string[];
  /** Margen de la vía: 0 = directa, 0.04 = agregador que cobra 4% de comisión. */
  markup?: number;
};

const STATUS_FLOW: Array<[TrackingStatus, string]> = [
  ["created", "Guía generada"],
  ["picked_up", "Recogido en origen"],
  ["in_transit", "En tránsito"],
  ["out_for_delivery", "En reparto"],
  ["delivered", "Entregado"],
];

type MockShipment = {
  carrier: string;
  step: number;
  status: TrackingStatus;
  events: TrackingEvent[];
};

/** Simulador determinista de un agregador o transportadora. Sirve para la demo y los tests. */
export class MockCarrierProvider implements CarrierProvider {
  readonly live = false;
  readonly id: string;
  readonly label: string;
  private carriers: string[];
  private markup: number;
  private shipments = new Map<string, MockShipment>();
  private seq = 0;
  private lastAt = 0;

  constructor(opts: MockProviderOptions) {
    this.id = opts.id;
    this.label = opts.label;
    this.carriers = opts.carriers;
    this.markup = opts.markup ?? 0;
  }

  /** Hora estrictamente creciente: los eventos del simulador nunca quedan en desorden. */
  private now(): string {
    this.lastAt = Math.max(Date.now(), this.lastAt + 1);
    return new Date(this.lastAt).toISOString();
  }

  async quote(draft: ShipmentDraft): Promise<Quote[]> {
    const isVe =
      draft.destination.dane?.startsWith("VE") ||
      draft.origin.dane?.startsWith("VE") ||
      process.env.MARKET === "VE" ||
      process.env.TRAXO_CURRENCY === "USD";
    const zone = isVe ? 1 : zoneFor(draft.origin.dane, draft.destination.dane);
    const out: Quote[] = [];
    for (const key of this.carriers) {
      const p = CARRIER_PROFILES[key];
      if (!p || p.uncovered?.includes(draft.destination.dane)) continue;
      if (draft.destination.dane === "00000") continue;
      const baseFreightUSD = 4.5;
      const freight = isVe
        ? Number(
            (baseFreightUSD * weightFactor(draft.weightGrams) * p.price * (1 + this.markup)).toFixed(
              2,
            ),
          )
        : Math.round(
            (BASE_FREIGHT[zone] * weightFactor(draft.weightGrams) * p.price * (1 + this.markup)) /
              100,
          ) * 100;
      const cod =
        draft.codAmount > 0
          ? isVe
            ? Number(Math.max(p.codMin, draft.codAmount * p.codRate).toFixed(2))
            : Math.max(p.codMin, Math.round((draft.codAmount * p.codRate) / 100) * 100)
          : 0;
      out.push({
        provider: this.id,
        carrier: p.carrier,
        service: p.service,
        freight,
        codCommission: p.supportsCod ? cod : 0,
        supportsCod: p.supportsCod,
        businessDays: (isVe ? 2 : BASE_DAYS[zone]) + p.extraDays,
        currency: isVe ? "USD" : "COP",
        simulated: true,
      });
    }
    return out;
  }

  async createShipment(draft: ShipmentDraft, chosen: Quote): Promise<CreatedShipment> {
    this.seq += 1;
    const number = `${240000000000 + (Math.abs(hash(draft.orderId)) % 99999999) + this.seq}`;
    this.shipments.set(number, {
      carrier: chosen.carrier,
      step: 0,
      status: "created",
      events: [
        { status: "created", description: STATUS_FLOW[0]?.[1] ?? "Guía generada", at: this.now() },
      ],
    });
    return {
      provider: this.id,
      carrier: chosen.carrier,
      service: chosen.service,
      trackingNumber: number,
      labelUrl: `https://traxo.invalid/etiquetas/${number}.pdf`,
      trackUrl: `https://traxo.invalid/rastreo/${number}`,
      total: chosen.freight + chosen.codCommission,
      simulated: true,
    };
  }

  /** Para la demo: avanza la guía un paso (o dispara una novedad). */
  advance(trackingNumber: string, opts: { incident?: boolean } = {}): TrackingStatus {
    const s = this.shipments.get(trackingNumber);
    if (!s) throw new Error(`Guía ${trackingNumber} no existe`);
    if (opts.incident) {
      s.status = "incident";
      s.events.push({
        status: "incident",
        description: "Novedad: el cliente no estaba en la dirección",
        at: this.now(),
      });
      return s.status;
    }
    s.step = Math.min(s.step + 1, STATUS_FLOW.length - 1);
    const [status, description] = STATUS_FLOW[s.step] as [TrackingStatus, string];
    s.status = status;
    s.events.push({ status, description, at: this.now() });
    return s.status;
  }

  async track(trackingNumber: string): Promise<TrackingEvent[]> {
    return [...(this.shipments.get(trackingNumber)?.events ?? [])];
  }

  async cancel(trackingNumber: string): Promise<void> {
    const s = this.shipments.get(trackingNumber);
    if (!s) throw new Error(`Guía ${trackingNumber} no existe`);
    s.status = "cancelled";
    s.events.push({ status: "cancelled", description: "Guía cancelada", at: this.now() });
  }
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

/** Las vías del plan, simuladas: por defecto Colombia (14 transportadoras) o Venezuela si MARKET=VE. */
export function mockProviders(market?: string): MockCarrierProvider[] {
  const isVe = (market ?? process.env.MARKET) === "VE";
  if (isVe) {
    return [
      new MockCarrierProvider({
        id: "dropi",
        label: "Dropi Logística VE",
        carriers: ["flash", "mrw", "zoom"],
        markup: 0.02,
      }),
      new MockCarrierProvider({
        id: "mrw",
        label: "MRW Venezuela (directa)",
        carriers: ["mrw"],
      }),
      new MockCarrierProvider({
        id: "zoom",
        label: "Grupo Zoom (directa)",
        carriers: ["zoom"],
      }),
      new MockCarrierProvider({
        id: "tealca",
        label: "Tealca (directa)",
        carriers: ["tealca"],
      }),
      new MockCarrierProvider({
        id: "caracas-express",
        label: "Caracas Express (Bajo Demanda)",
        carriers: ["caracas-express"],
      }),
    ];
  }
  return [
    new MockCarrierProvider({
      id: "envia-com",
      label: "Envia.com",
      carriers: ["coordinadora", "servientrega", "interrapidisimo", "tcc", "deprisa"],
      markup: 0.04,
    }),
    new MockCarrierProvider({
      id: "99envios",
      label: "99envios",
      carriers: ["tcc", "coordinadora", "interrapidisimo", "servientrega", "envia"],
      markup: 0.03,
    }),
    new MockCarrierProvider({
      id: "coordinadora",
      label: "Coordinadora (directa)",
      carriers: ["coordinadora"],
    }),
    new MockCarrierProvider({
      id: "interrapidisimo",
      label: "Interrapidísimo (directa)",
      carriers: ["interrapidisimo"],
    }),
    new MockCarrierProvider({
      id: "servientrega",
      label: "Servientrega (directa)",
      carriers: ["servientrega"],
    }),
    new MockCarrierProvider({ id: "envia-co", label: "Envía (directa)", carriers: ["envia"] }),
  ];
}
