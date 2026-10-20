import { VENEZUELA_ADDRESS_FIXTURES } from "./fixtures.ts";

export interface VeFixtureOrderLine {
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  unitPriceDecimal?: string;
  weightGrams?: number;
}

export interface VeFixtureOrder {
  id: string;
  externalId: string;
  number: string;
  storeId: string;
  tenantId: string;
  currency: string;
  customerId?: string;
  email?: string;
  address: {
    name: string;
    phone: string;
    street: string;
    city: string;
    stateCode?: string;
    country: string;
  };
  lines: VeFixtureOrderLine[];
  subtotal: number;
  shippingCharged: number;
  total: number;
  totalDecimal: string;
  payment: "cod" | "prepaid";
  createdAt: string;
}

export interface VeFixtureDropiOrder {
  id: string;
  wooOrderId?: string;
  status: string;
  mappedStatus: "created" | "in_transit" | "delivered" | "unknown";
  trackingNumber?: string;
  carrier?: string;
  recipientName?: string;
  city?: string;
  stateCode?: string;
  placeId?: string;
  total?: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  simulated: boolean;
}

export interface ReconciliationFixtureSuite {
  readonly wooOrders: VeFixtureOrder[];
  readonly dropiOrders: VeFixtureDropiOrder[];
  readonly simulatedErrors?: Record<
    string,
    { status: number; message: string; retryAfter?: number }
  >;
}

/**
 * Suite de 10 casos de aceptación para Gate G3 (Conciliación WooCommerce <-> Dropi VE).
 */
export const RECONCILIATION_FIXTURES: ReconciliationFixtureSuite = {
  wooOrders: [
    // 1. Sincronizado en tránsito
    {
      id: "woo_1001",
      externalId: "1001",
      number: "1001",
      storeId: "davebeauty_staging",
      tenantId: "tenant_davebeauty_ve",
      currency: "USD",
      customerId: "cust_01",
      email: "valeria@davebeauty.test",
      address: {
        name: VENEZUELA_ADDRESS_FIXTURES.caracas_davebeauty.recipientName,
        phone: VENEZUELA_ADDRESS_FIXTURES.caracas_davebeauty.phoneE164,
        street: VENEZUELA_ADDRESS_FIXTURES.caracas_davebeauty.street,
        city: VENEZUELA_ADDRESS_FIXTURES.caracas_davebeauty.city,
        stateCode: VENEZUELA_ADDRESS_FIXTURES.caracas_davebeauty.stateCode,
        country: "VE",
      },
      lines: [
        {
          productId: "prod_labial_01",
          title: "Labial Hidratante Rosa",
          quantity: 2,
          unitPrice: 22,
          unitPriceDecimal: "22.50",
          weightGrams: 100,
        },
      ],
      subtotal: 45,
      shippingCharged: 0,
      total: 45,
      totalDecimal: "45.00",
      payment: "cod",
      createdAt: "2026-10-18T10:00:00Z",
    },
    // 2. Sincronizado entregado
    {
      id: "woo_1002",
      externalId: "1002",
      number: "1002",
      storeId: "davebeauty_staging",
      tenantId: "tenant_davebeauty_ve",
      currency: "USD",
      customerId: "cust_02",
      email: "carlos@davebeauty.test",
      address: {
        name: VENEZUELA_ADDRESS_FIXTURES.maracaibo_norte.recipientName,
        phone: VENEZUELA_ADDRESS_FIXTURES.maracaibo_norte.phoneE164,
        street: VENEZUELA_ADDRESS_FIXTURES.maracaibo_norte.street,
        city: VENEZUELA_ADDRESS_FIXTURES.maracaibo_norte.city,
        stateCode: VENEZUELA_ADDRESS_FIXTURES.maracaibo_norte.stateCode,
        country: "VE",
      },
      lines: [
        {
          productId: "prod_serum_01",
          title: "Serum Facial Vitamina C",
          quantity: 1,
          unitPrice: 30,
          unitPriceDecimal: "30.00",
          weightGrams: 150,
        },
      ],
      subtotal: 30,
      shippingCharged: 0,
      total: 30,
      totalDecimal: "30.00",
      payment: "prepaid",
      createdAt: "2026-10-17T14:00:00Z",
    },
    // 3. Faltante en Dropi
    {
      id: "woo_1003",
      externalId: "1003",
      number: "1003",
      storeId: "davebeauty_staging",
      tenantId: "tenant_davebeauty_ve",
      currency: "USD",
      customerId: "cust_03",
      email: "andrea@davebeauty.test",
      address: {
        name: VENEZUELA_ADDRESS_FIXTURES.valencia_central.recipientName,
        phone: VENEZUELA_ADDRESS_FIXTURES.valencia_central.phoneE164,
        street: VENEZUELA_ADDRESS_FIXTURES.valencia_central.street,
        city: VENEZUELA_ADDRESS_FIXTURES.valencia_central.city,
        stateCode: VENEZUELA_ADDRESS_FIXTURES.valencia_central.stateCode,
        country: "VE",
      },
      lines: [
        {
          productId: "prod_crema_01",
          title: "Crema Rejuvenecedora Noche",
          quantity: 1,
          unitPrice: 65,
          unitPriceDecimal: "65.00",
          weightGrams: 200,
        },
      ],
      subtotal: 65,
      shippingCharged: 0,
      total: 65,
      totalDecimal: "65.00",
      payment: "cod",
      createdAt: "2026-10-19T08:00:00Z",
    },
    // 4. (No existe en Woo, solo en Dropi -> dropi_ve_5004)
    // 5. Conflicto: Cancelado en Woo pero en tránsito en Dropi
    {
      id: "woo_1005",
      externalId: "1005",
      number: "1005",
      storeId: "davebeauty_staging",
      tenantId: "tenant_davebeauty_ve",
      currency: "USD",
      customerId: "cust_05",
      email: "hector@davebeauty.test",
      address: {
        name: VENEZUELA_ADDRESS_FIXTURES.barquisimeto_este.recipientName,
        phone: VENEZUELA_ADDRESS_FIXTURES.barquisimeto_este.phoneE164,
        street: VENEZUELA_ADDRESS_FIXTURES.barquisimeto_este.street,
        city: VENEZUELA_ADDRESS_FIXTURES.barquisimeto_este.city,
        stateCode: VENEZUELA_ADDRESS_FIXTURES.barquisimeto_este.stateCode,
        country: "VE",
      },
      lines: [
        {
          productId: "prod_perfume_01",
          title: "Perfume Floral Rose 50ml",
          quantity: 1,
          unitPrice: 50,
          unitPriceDecimal: "50.00",
          weightGrams: 250,
        },
      ],
      subtotal: 50,
      shippingCharged: 0,
      total: 50,
      totalDecimal: "50.00",
      payment: "cod",
      createdAt: "2026-10-18T16:00:00Z",
    },
    // 6. Conflicto: Pendiente en Woo pero entregado en Dropi
    {
      id: "woo_1006",
      externalId: "1006",
      number: "1006",
      storeId: "davebeauty_staging",
      tenantId: "tenant_davebeauty_ve",
      currency: "USD",
      customerId: "cust_06",
      email: "sofia@davebeauty.test",
      address: {
        name: VENEZUELA_ADDRESS_FIXTURES.puerto_la_cruz_lecheria.recipientName,
        phone: VENEZUELA_ADDRESS_FIXTURES.puerto_la_cruz_lecheria.phoneE164,
        street: VENEZUELA_ADDRESS_FIXTURES.puerto_la_cruz_lecheria.street,
        city: VENEZUELA_ADDRESS_FIXTURES.puerto_la_cruz_lecheria.city,
        stateCode: VENEZUELA_ADDRESS_FIXTURES.puerto_la_cruz_lecheria.stateCode,
        country: "VE",
      },
      lines: [
        {
          productId: "prod_shampoo_01",
          title: "Shampoo Botánico Reparador",
          quantity: 2,
          unitPrice: 18,
          unitPriceDecimal: "18.00",
          weightGrams: 500,
        },
      ],
      subtotal: 36,
      shippingCharged: 0,
      total: 36,
      totalDecimal: "36.00",
      payment: "cod",
      createdAt: "2026-10-17T11:00:00Z",
    },
    // 7A. Guía duplicada (orden A)
    {
      id: "woo_1007",
      externalId: "1007",
      number: "1007",
      storeId: "davebeauty_staging",
      tenantId: "tenant_davebeauty_ve",
      currency: "USD",
      customerId: "cust_07",
      email: "dup1@davebeauty.test",
      address: {
        name: "Cliente Duplicado Uno",
        phone: "+584121112233",
        street: "Av. Las Delicias",
        city: "Maracay",
        stateCode: "VE-D",
        country: "VE",
      },
      lines: [
        {
          productId: "prod_tonico_01",
          title: "Tónico Facial Rosa",
          quantity: 1,
          unitPrice: 15,
          unitPriceDecimal: "15.00",
          weightGrams: 100,
        },
      ],
      subtotal: 15,
      shippingCharged: 0,
      total: 15,
      totalDecimal: "15.00",
      payment: "cod",
      createdAt: "2026-10-19T09:00:00Z",
    },
    // 7B. Guía duplicada (orden B)
    {
      id: "woo_1008",
      externalId: "1008",
      number: "1008",
      storeId: "davebeauty_staging",
      tenantId: "tenant_davebeauty_ve",
      currency: "USD",
      customerId: "cust_08",
      email: "dup2@davebeauty.test",
      address: {
        name: "Cliente Duplicado Dos",
        phone: "+584122223344",
        street: "Av. Fuerzas Armadas",
        city: "Maracay",
        stateCode: "VE-D",
        country: "VE",
      },
      lines: [
        {
          productId: "prod_tonico_01",
          title: "Tónico Facial Rosa",
          quantity: 1,
          unitPrice: 15,
          unitPriceDecimal: "15.00",
          weightGrams: 100,
        },
      ],
      subtotal: 15,
      shippingCharged: 0,
      total: 15,
      totalDecimal: "15.00",
      payment: "cod",
      createdAt: "2026-10-19T09:15:00Z",
    },
    // 8. Error Dropi API 500
    {
      id: "woo_1009",
      externalId: "1009",
      number: "1009",
      storeId: "davebeauty_staging",
      tenantId: "tenant_davebeauty_ve",
      currency: "USD",
      customerId: "cust_09",
      email: "error500@davebeauty.test",
      address: {
        name: "Cliente Error Servidor",
        phone: "+584145556677",
        street: "Calle 10",
        city: "San Cristóbal",
        stateCode: "VE-S",
        country: "VE",
      },
      lines: [
        {
          productId: "prod_pack_01",
          title: "Pack Belleza Total",
          quantity: 1,
          unitPrice: 85,
          unitPriceDecimal: "85.00",
          weightGrams: 800,
        },
      ],
      subtotal: 85,
      shippingCharged: 0,
      total: 85,
      totalDecimal: "85.00",
      payment: "cod",
      createdAt: "2026-10-19T09:30:00Z",
    },
    // 9. Rate Limit Dropi 429
    {
      id: "woo_1010",
      externalId: "1010",
      number: "1010",
      storeId: "davebeauty_staging",
      tenantId: "tenant_davebeauty_ve",
      currency: "USD",
      customerId: "cust_10",
      email: "ratelimit@davebeauty.test",
      address: {
        name: "Cliente Rate Limit",
        phone: "+584167778899",
        street: "Av. 5 de Julio",
        city: "Maturín",
        stateCode: "VE-N",
        country: "VE",
      },
      lines: [
        {
          productId: "prod_gel_01",
          title: "Gel Limpiador Purificante",
          quantity: 1,
          unitPrice: 20,
          unitPriceDecimal: "20.00",
          weightGrams: 150,
        },
      ],
      subtotal: 20,
      shippingCharged: 0,
      total: 20,
      totalDecimal: "20.00",
      payment: "prepaid",
      createdAt: "2026-10-19T09:45:00Z",
    },
    // 10. Localidad remota sin cobertura Dropi
    {
      id: "woo_1011",
      externalId: "1011",
      number: "1011",
      storeId: "davebeauty_staging",
      tenantId: "tenant_davebeauty_ve",
      currency: "USD",
      customerId: "cust_11",
      email: "remoto@davebeauty.test",
      address: {
        name: VENEZUELA_ADDRESS_FIXTURES.zona_remota_sin_cobertura.recipientName,
        phone: VENEZUELA_ADDRESS_FIXTURES.zona_remota_sin_cobertura.phoneE164,
        street: VENEZUELA_ADDRESS_FIXTURES.zona_remota_sin_cobertura.street,
        city: VENEZUELA_ADDRESS_FIXTURES.zona_remota_sin_cobertura.city,
        stateCode: VENEZUELA_ADDRESS_FIXTURES.zona_remota_sin_cobertura.stateCode,
        country: "VE",
      },
      lines: [
        {
          productId: "prod_aceite_01",
          title: "Aceite de Rosa Mosqueta",
          quantity: 2,
          unitPrice: 40,
          unitPriceDecimal: "40.00",
          weightGrams: 120,
        },
      ],
      subtotal: 80,
      shippingCharged: 0,
      total: 80,
      totalDecimal: "80.00",
      payment: "cod",
      createdAt: "2026-10-19T10:00:00Z",
    },
  ],
  dropiOrders: [
    // 1. Sincronizado en tránsito (corresponde a woo_1001)
    {
      id: "dropi_ve_5001",
      wooOrderId: "woo_1001",
      status: "EN_TRANSITO",
      mappedStatus: "in_transit",
      trackingNumber: "TRK-VE-001",
      carrier: "MRW",
      recipientName: "Valeria Mendoza",
      city: "Caracas",
      stateCode: "VE-A",
      placeId: "dropi_loc_caracas_baruta",
      total: "45.00",
      currency: "USD",
      createdAt: "2026-10-18T10:30:00Z",
      updatedAt: "2026-10-18T12:00:00Z",
      simulated: true,
    },
    // 2. Sincronizado entregado (corresponde a woo_1002)
    {
      id: "dropi_ve_5002",
      wooOrderId: "woo_1002",
      status: "ENTREGADO",
      mappedStatus: "delivered",
      trackingNumber: "TRK-VE-002",
      carrier: "Zoom",
      recipientName: "Carlos Villalobos",
      city: "Maracaibo",
      stateCode: "VE-V",
      placeId: "dropi_loc_maracaibo_01",
      total: "30.00",
      currency: "USD",
      createdAt: "2026-10-17T14:30:00Z",
      updatedAt: "2026-10-18T16:00:00Z",
      simulated: true,
    },
    // 4. Faltante en WooCommerce (solo en Dropi)
    {
      id: "dropi_ve_5004",
      wooOrderId: "woo_9999", // Orden inexistente en Woo
      status: "CREADO",
      mappedStatus: "created",
      trackingNumber: "TRK-VE-004",
      carrier: "Tealca",
      recipientName: "Comprador Huérfano",
      city: "Barquisimeto",
      stateCode: "VE-L",
      placeId: "dropi_loc_barquisimeto_01",
      total: "25.00",
      currency: "USD",
      createdAt: "2026-10-19T07:00:00Z",
      updatedAt: "2026-10-19T07:00:00Z",
      simulated: true,
    },
    // 5. Conflicto: Woo dice cancelado, Dropi dice en tránsito
    {
      id: "dropi_ve_5005",
      wooOrderId: "woo_1005",
      status: "EN_TRANSITO",
      mappedStatus: "in_transit",
      trackingNumber: "TRK-VE-005",
      carrier: "MRW",
      recipientName: "Héctor Rodríguez",
      city: "Barquisimeto",
      stateCode: "VE-L",
      placeId: "dropi_loc_barquisimeto_01",
      total: "50.00",
      currency: "USD",
      createdAt: "2026-10-18T17:00:00Z",
      updatedAt: "2026-10-19T08:00:00Z",
      simulated: true,
    },
    // 6. Conflicto: Woo dice pendiente, Dropi dice entregado
    {
      id: "dropi_ve_5006",
      wooOrderId: "woo_1006",
      status: "ENTREGADO",
      mappedStatus: "delivered",
      trackingNumber: "TRK-VE-006",
      carrier: "Zoom",
      recipientName: "Sofía Arreaza",
      city: "Lechería",
      stateCode: "VE-B",
      placeId: "dropi_loc_lecheria_01",
      total: "36.00",
      currency: "USD",
      createdAt: "2026-10-17T11:30:00Z",
      updatedAt: "2026-10-18T15:00:00Z",
      simulated: true,
    },
    // 7A. Guía duplicada (orden A)
    {
      id: "dropi_ve_5007",
      wooOrderId: "woo_1007",
      status: "EN_TRANSITO",
      mappedStatus: "in_transit",
      trackingNumber: "TRK-VE-DUP-999", // Duplicado intencional
      carrier: "MRW",
      recipientName: "Cliente Duplicado Uno",
      city: "Maracay",
      stateCode: "VE-D",
      total: "15.00",
      currency: "USD",
      createdAt: "2026-10-19T09:10:00Z",
      updatedAt: "2026-10-19T09:10:00Z",
      simulated: true,
    },
    // 7B. Guía duplicada (orden B)
    {
      id: "dropi_ve_5008",
      wooOrderId: "woo_1008",
      status: "EN_TRANSITO",
      mappedStatus: "in_transit",
      trackingNumber: "TRK-VE-DUP-999", // Duplicado intencional
      carrier: "MRW",
      recipientName: "Cliente Duplicado Dos",
      city: "Maracay",
      stateCode: "VE-D",
      total: "15.00",
      currency: "USD",
      createdAt: "2026-10-19T09:20:00Z",
      updatedAt: "2026-10-19T09:20:00Z",
      simulated: true,
    },
    // 10. Localidad remota sin cobertura en Dropi (placeId no disponible)
    {
      id: "dropi_ve_5011",
      wooOrderId: "woo_1011",
      status: "PENDIENTE_COBERTURA",
      mappedStatus: "unknown",
      carrier: "MRW",
      recipientName: "Maikel Yanomami",
      city: "San Fernando de Atabapo",
      stateCode: "VE-Y",
      placeId: undefined, // Sin cobertura verificada
      total: "80.00",
      currency: "USD",
      createdAt: "2026-10-19T10:05:00Z",
      updatedAt: "2026-10-19T10:05:00Z",
      simulated: true,
    },
  ],
  simulatedErrors: {
    woo_1009: {
      status: 500,
      message: "Dropi API Gateway Timeout / Internal Server Error al consultar orden",
    },
    woo_1010: {
      status: 429,
      message: "Dropi API Rate Limit Exceeded: Máximo 60 peticiones/minuto",
      retryAfter: 30,
    },
  },
};
