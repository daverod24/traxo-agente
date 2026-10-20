import type { DropiOrder } from "@traxo/core";

export interface DropiCoverageResult {
  hasCoverage: boolean;
  provider: "dropi";
  placeId?: string;
  stateCode: string;
  city: string;
  verifiedAt: string;
}

export interface DropiReaderOptions {
  apiKey?: string;
  tenantId: string;
  simulated?: boolean;
  simulatedOrders?: DropiOrder[];
}

/**
 * Cliente de Solo Lectura para Dropi Venezuela.
 * NON-NEGOTIABLE: Prohibición absoluta de escrituras o mutaciones hacia Dropi.
 */
export class DropiReadOnlyClient {
  readonly tenantId: string;
  readonly isReadOnly = true;
  private readonly simulated: boolean;
  private readonly orders: Map<string, DropiOrder> = new Map();

  constructor(options: DropiReaderOptions) {
    this.tenantId = options.tenantId;
    this.simulated = options.simulated ?? true;

    if (options.simulatedOrders) {
      for (const order of options.simulatedOrders) {
        this.orders.set(order.id, order);
      }
    }
  }

  /**
   * Obtiene una orden de Dropi por ID.
   */
  async getOrder(id: string): Promise<DropiOrder | undefined> {
    return this.orders.get(id);
  }

  /**
   * Obtiene una orden de Dropi buscando por el ID de WooCommerce correspondiente.
   */
  async getOrderByWooId(wooOrderId: string): Promise<DropiOrder | undefined> {
    for (const order of this.orders.values()) {
      if (order.wooOrderId === wooOrderId) {
        return order;
      }
    }
    return undefined;
  }

  /**
   * Lista órdenes registradas en Dropi.
   */
  async listOrders(): Promise<DropiOrder[]> {
    return Array.from(this.orders.values());
  }

  /**
   * Consulta cobertura de envío para un estado y ciudad en Venezuela.
   */
  async checkCoverage(stateCode: string, city: string): Promise<DropiCoverageResult> {
    // Si la ciudad es conocida en nuestras fixtures con placeId
    const normalizedCity = city.toLowerCase().trim();
    if (normalizedCity.includes("atabapo") || stateCode === "VE-Y") {
      // Zona remota sin cobertura
      return {
        hasCoverage: false,
        provider: "dropi",
        stateCode,
        city,
        verifiedAt: new Date().toISOString(),
      };
    }

    return {
      hasCoverage: true,
      provider: "dropi",
      placeId: `dropi_place_${stateCode.toLowerCase()}_${normalizedCity.replace(/\s+/g, "_")}`,
      stateCode,
      city,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Guardián de seguridad: Cualquier intento de escritura es abortado.
   */
  createOrder(): never {
    throw new Error(
      "[FAIL-CLOSED] DropiReadOnlyClient es estrictamente de solo lectura. No se permiten escrituras ni creación de órdenes en Dropi.",
    );
  }

  generateGuide(): never {
    throw new Error(
      "[FAIL-CLOSED] DropiReadOnlyClient es estrictamente de solo lectura. No se permiten generación de guías en Dropi.",
    );
  }
}
