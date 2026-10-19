import type { BcvRateSnapshot, VenezuelaAddress } from "./index.ts";

/**
 * Fixtures representativas para pruebas de checkout y conciliación logística en Venezuela.
 */
export const VENEZUELA_ADDRESS_FIXTURES: Record<string, VenezuelaAddress> = {
  caracas_davebeauty: {
    country: "VE",
    stateCode: "VE-A",
    city: "Caracas",
    municipalityName: "Baruta",
    urbanization: "Las Mercedes",
    street: "Calle París, Centro Comercial Tolón, Nivel PB",
    reference: "Sede Principal Davebeauty Venezuela",
    recipientName: "Valeria Mendoza",
    phoneE164: "+584121234567",
    postalCode: "1060",
    providerPlace: {
      provider: "dropi",
      id: "dropi_loc_caracas_baruta",
      checkedAt: "2026-10-18T12:00:00Z",
    },
  },
  maracaibo_norte: {
    country: "VE",
    stateCode: "VE-V",
    city: "Maracaibo",
    municipalityName: "Maracaibo",
    urbanization: "Bella Vista",
    street: "Calle 72 con Av. 4 (Bella Vista), Edif. San José",
    reference: "A 100m de la plaza",
    recipientName: "Carlos Villalobos",
    phoneE164: "+584149876543",
    postalCode: "4001",
    providerPlace: {
      provider: "dropi",
      id: "dropi_loc_maracaibo_01",
      checkedAt: "2026-10-18T12:00:00Z",
    },
  },
  valencia_central: {
    country: "VE",
    stateCode: "VE-G",
    city: "Valencia",
    municipalityName: "Valencia",
    urbanization: "El Parral",
    street: "Av. Principal El Parral, Residencia Los Samanes",
    recipientName: "Andrea Sequera",
    phoneE164: "+584245551122",
    postalCode: "2001",
    providerPlace: {
      provider: "dropi",
      id: "dropi_loc_valencia_02",
      checkedAt: "2026-10-18T12:00:00Z",
    },
  },
  barquisimeto_este: {
    country: "VE",
    stateCode: "VE-L",
    city: "Barquisimeto",
    municipalityName: "Iribarren",
    urbanization: "Nueva Segovia",
    street: "Carrera 1 con Calle 4",
    recipientName: "Héctor Rodríguez",
    phoneE164: "+584163334455",
    postalCode: "3001",
    providerPlace: {
      provider: "dropi",
      id: "dropi_loc_barquisimeto_01",
      checkedAt: "2026-10-18T12:00:00Z",
    },
  },
  puerto_la_cruz_lecheria: {
    country: "VE",
    stateCode: "VE-B",
    city: "Lechería",
    municipalityName: "Diego Bautista Urbaneja",
    urbanization: "Playa Mansa",
    street: "Av. Octavio Camejo",
    recipientName: "Sofía Arreaza",
    phoneE164: "+584267778899",
    postalCode: "6016",
    providerPlace: {
      provider: "dropi",
      id: "dropi_loc_lecheria_01",
      checkedAt: "2026-10-18T12:00:00Z",
    },
  },
  zona_remota_sin_cobertura: {
    country: "VE",
    stateCode: "VE-Y",
    city: "San Fernando de Atabapo",
    municipalityName: "Atabapo",
    street: "Calle Comercio s/n",
    recipientName: "Maikel Yanomami",
    phoneE164: "+584120001122",
    // Sin providerPlace: localidad no cubierta ni confirmada en Dropi
  },
};

/**
 * Snapshots de tasa BCV para pruebas de dual currency y caducidad.
 */
export const BCV_RATE_FIXTURES: Record<string, BcvRateSnapshot> = {
  vigente: {
    source: "https://www.bcv.org.ve",
    rate: "44.5201",
    currency: "VES",
    baseCurrency: "USD",
    publishedAt: new Date().toISOString(),
    capturedAt: new Date().toISOString(),
    staleThresholdHours: 24,
  },
  caducada_hace_48h: {
    source: "https://www.bcv.org.ve",
    rate: "42.8500",
    currency: "VES",
    baseCurrency: "USD",
    publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    capturedAt: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
    staleThresholdHours: 24,
  },
};
