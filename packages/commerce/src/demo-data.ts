import { type Customer, newId, type Order, type Product } from "@traxo/core";
import { cityByDane, findCity } from "@traxo/geo-co";
import { type VenezuelaStateCode, VENEZUELA_STATES } from "@traxo/market-ve";
export { type VenezuelaStateCode, VENEZUELA_STATES };

/* ==============================================================================
   TIENDA DEMO 1: DAVEBEAUTY SANDBOX VE (BELLEZA, K-BEAUTY & BIENESTAR)
   ============================================================================== */
export const DEMO_BEAUTY_STORE = {
  id: "store_demo_beauty",
  name: "Davebeauty Sandbox VE",
  url: "davebeauty.daverod.tech",
  vertical: "Belleza, K-Beauty y Bienestar Botánico",
  stateCode: "VE-A" as VenezuelaStateCode,
  city: "Caracas",
};

export const DEMO_BEAUTY_PRODUCTS: Product[] = [
  {
    id: "prod_mag_pack",
    externalId: "254",
    title: "Pack Trío Magnesio Quelado (Citrato + Bisglicinato + Malato)",
    price: 34,
    cost: 14,
    weightGrams: 450,
    imageUrl: "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/254/magnesio-trio.webp",
    description: "Fórmula de máxima absorción para descanso profundo, balance muscular y energía mitocondrial.",
  },
  {
    id: "prod_serum_nia",
    externalId: "255",
    title: "Suero Niacinamida 10% + Zinc 1% Despigmentante",
    price: 18,
    cost: 7,
    weightGrams: 120,
    imageUrl: "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/255/niacinamide.webp",
    description: "Regula la producción de sebo, minimiza la apariencia de poros y atenúa manchas oscuras.",
  },
  {
    id: "prod_crema_cer",
    externalId: "256",
    title: "Crema Reparadora Ceramidas & Centella Asiática K-Beauty",
    price: 26,
    cost: 11,
    weightGrams: 200,
    imageUrl: "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/256/ceramide-cream.webp",
    description: "Restauración intensiva de la barrera cutánea debilitada con fitoceramidas botánicas de Corea.",
  },
  {
    id: "prod_protector",
    externalId: "260",
    title: "Protector Solar Fluido Invisible SPF 50+ PA++++",
    price: 22,
    cost: 9,
    weightGrams: 150,
    imageUrl: "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/260/sunscreen-fluid.webp",
    description: "Fotoprotección biotecnológica de amplio espectro, absorción instantánea y acabado mate transparente.",
  },
  {
    id: "prod_colageno",
    externalId: "261",
    title: "Colágeno Marino Hidrolizado + Biotina y Vitamina C",
    price: 29,
    cost: 12,
    weightGrams: 350,
    imageUrl: "https://d39ru7awumhhs2.cloudfront.net/venezuela/products/261/collagen.webp",
    description: "Péptidos bioactivos marinos tipo I y III para firmeza dérmica, salud articular y fortalecimiento capilar.",
  },
];

/* ==============================================================================
   TIENDA DEMO 2: CAFÉ DE ESPECIALIDAD VE (REGIONES HISTÓRICAS DE VENEZUELA)
   ============================================================================== */
export const DEMO_CAFE_STORE = {
  id: "store_demo_cafe",
  name: "Café de Especialidad VE",
  url: "cafeespecialidad.ve",
  vertical: "Café de Especialidad & Origen Venezolano",
  stateCode: "VE-T" as VenezuelaStateCode,
  city: "Boconó",
};

export const DEMO_CAFE_PRODUCTS: Product[] = [
  {
    id: "prod_cafe_bocono",
    externalId: "301",
    title: "Café Boconó Honey de Altura 340g (Trujillo)",
    price: 12,
    cost: 5,
    weightGrams: 360,
    description: "Altura 1.650 msnm. Proceso honey con fragancia a miel silvestre, caña de azúcar y chocolate con leche.",
  },
  {
    id: "prod_cafe_sanare",
    externalId: "302",
    title: "Café Sanare Lavado Artesanal 340g (Lara)",
    price: 11,
    cost: 4.5,
    weightGrams: 360,
    description: "Cultivado a 1.500 msnm en Sanare. Acidez cítrica brillante, notas florales a jazmín y caramelo suave.",
  },
  {
    id: "prod_cafe_merida",
    externalId: "303",
    title: "Micro-lote Santa Cruz de Mora Anaeróbico 250g (Mérida)",
    price: 16,
    cost: 7,
    weightGrams: 270,
    description: "Fermentación anaeróbica 72h a 1.800 msnm. Perfil exótico con notas a frutas rojas, licor y cacao fino.",
  },
  {
    id: "prod_cafe_biscucuy",
    externalId: "304",
    title: "Café Caturra Biscucuy 500g (Portuguesa)",
    price: 14,
    cost: 6,
    weightGrams: 520,
    description: "Cuna cafetalera andina venezolana. Tueste medio con cuerpo sedoso, acidez media y regusto a nuez.",
  },
  {
    id: "prod_cafe_miranda",
    externalId: "305",
    title: "Café de Niebla Altos Mirandinos 340g (Miranda)",
    price: 12,
    cost: 5,
    weightGrams: 360,
    description: "Micro-clima de niebla costera de montaña. Proceso lavado con notas dulces a panela y frutos secos.",
  },
  {
    id: "prod_cafe_tachira",
    externalId: "306",
    title: "Café Tradicional Rubio 500g (Táchira)",
    price: 13,
    cost: 5.5,
    weightGrams: 520,
    description: "Herencia cafetalera tachirense centenaria. Sabor clásico y robusto a chocolate amargo y especias dulces.",
  },
];

/* ==============================================================================
   TIENDA DEMO LEGACY (store_demo para compatibilidad de tests existentes)
   ============================================================================== */
export const DEMO_STORE = {
  id: "store_demo",
  name: "Café de Origen",
  url: "cafe-de-origen.myshopify.com",
  vertical: "Café de especialidad",
  originDane: "11001",
};

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "prod_huila",
    externalId: "9001",
    title: "Café Huila 340 g (grano)",
    price: 38000,
    cost: 19000,
    weightGrams: 380,
    description: "Notas a panela y cítricos.",
  },
  {
    id: "prod_nariño",
    externalId: "9002",
    title: "Café Nariño 340 g (molido)",
    price: 42000,
    cost: 21000,
    weightGrams: 380,
    description: "Floral, acidez brillante.",
  },
  {
    id: "prod_sierra",
    externalId: "9003",
    title: "Café Sierra Nevada 340 g",
    price: 45000,
    cost: 22500,
    weightGrams: 380,
    description: "Chocolate y frutos secos.",
  },
  {
    id: "prod_kit",
    externalId: "9004",
    title: "Kit degustación x3",
    price: 98000,
    cost: 52000,
    weightGrams: 1200,
    description: "Tres orígenes, 150 g c/u.",
  },
  {
    id: "prod_prensa",
    externalId: "9005",
    title: "Prensa francesa 600 ml",
    price: 89000,
    cost: 41000,
    weightGrams: 900,
  },
  {
    id: "prod_suscripcion",
    externalId: "9006",
    title: "Suscripción mensual 2 bolsas",
    price: 79000,
    cost: 40000,
    weightGrams: 800,
  },
];

/* ==============================================================================
   DATA VENEZOLANA DE PRUEBA: CLIENTES, CIUDADES Y DIRECCIONES
   ============================================================================== */
export const FIRST_VE = [
  "Valentina",
  "Carlos",
  "Mariana",
  "Andrés",
  "Gabriela",
  "Alejandro",
  "Isabella",
  "Diego",
  "Daniela",
  "Sebastián",
  "Camila",
  "Eduardo",
];
export const LAST_VE = [
  "Mendoza",
  "Rodríguez",
  "Castillo",
  "Silva",
  "Páez",
  "Rivas",
  "Morales",
  "Colmenares",
  "García",
  "Pérez",
  "Alvarado",
  "Bermúdez",
];

export const VE_DESTINATIONS: Array<{
  stateCode: VenezuelaStateCode;
  city: string;
  street: string;
}> = [
  { stateCode: "VE-A", city: "Caracas", street: "Av. Francisco de Miranda, Los Palos Grandes, Res. Parque Cristal" },
  { stateCode: "VE-N", city: "Caracas (El Hatillo)", street: "Calle La Lagunita, Quinta Los Samanes" },
  { stateCode: "VE-G", city: "Valencia", street: "Urb. Las Chimeneas, Calle Los Robles, Res. Altamira" },
  { stateCode: "VE-V", city: "Maracaibo", street: "Av. Bella Vista con Calle 72, Sector Tierra Negra" },
  { stateCode: "VE-L", city: "Barquisimeto", street: "Urb. Nueva Segovia, Carrera 1 con Calle 4" },
  { stateCode: "VE-B", city: "Lechería", street: "Av. Principal de Lechería, CC Plaza Mayor, Edif. Cumaná" },
  { stateCode: "VE-D", city: "Maracay", street: "Av. Las Delicias, Urb. El Bosque, Res. Cantaclaro" },
  { stateCode: "VE-M", city: "Mérida", street: "Av. Urdaneta, Conjunto Residencial El Rodeo" },
  { stateCode: "VE-S", city: "San Cristóbal", street: "Urb. Pirineos II, Carrera 18 con Calle 5" },
  { stateCode: "VE-P", city: "Porlamar", street: "Av. Santiago Mariño, Sector Bella Vista" },
  { stateCode: "VE-T", city: "Boconó", street: "Calle Jáuregui con Av. Miranda, Sector Centro" },
  { stateCode: "VE-O", city: "Maturín", street: "Av. Alirio Ugarte Pelayo, Sector Tipuro" },
];

const FIRST = [
  "Camila",
  "Andrés",
  "Valentina",
  "Juan",
  "Laura",
  "Santiago",
  "Daniela",
  "Felipe",
  "Mariana",
  "Sebastián",
  "Natalia",
  "Carlos",
];
const LAST = [
  "Ramírez",
  "Gómez",
  "Rodríguez",
  "Martínez",
  "López",
  "Hernández",
  "Vargas",
  "Castro",
  "Ospina",
  "Mejía",
  "Torres",
  "Zapata",
];
const STREETS = [
  "Calle 45 # 12-30",
  "Carrera 7 # 80-21 apto 402",
  "Avenida 6N # 25-10",
  "Carrera 43A # 1 Sur-50",
  "Calle 72 # 10-34",
  "Transversal 5 # 20-15 casa 3",
  "Carrera 15 # 100-25",
  "Calle 10 # 4-45",
];
const DESTINATIONS = [
  "66001",
  "76001",
  "08001",
  "05001",
  "13001",
  "68001",
  "47001",
  "54001",
  "11001",
  "17001",
  "73001",
  "63001",
];

/** PRNG determinista para que la demo sea reproducible. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)] as T;

/** Genera clientes demo deterministas */
export function demoCustomers(storeId = DEMO_STORE.id): Customer[] {
  const isBeauty = storeId === "store_demo_beauty";
  const isCafe = storeId === "store_demo_cafe";
  const isVe = isBeauty || isCafe;

  if (isVe) {
    const r = rng(isCafe ? 42 : 7);
    const prefixes = ["412", "414", "424"];
    return Array.from({ length: 12 }, (_, i) => {
      const name = `${pick(r, FIRST_VE)} ${pick(r, LAST_VE)}`;
      const dest = pick(r, VE_DESTINATIONS);
      const prefix = pick(r, prefixes);
      const phone = `+58${prefix}${String(1000000 + Math.floor(r() * 8999999)).slice(0, 7)}`;
      return {
        id: `cust_demo_${storeId}_${i + 1}`,
        externalId: String(7000 + i),
        name,
        phone,
        email: `${name.split(" ")[0]?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}${i}@davebeauty.ve`,
        city: dest.city,
        whatsappConsent: r() > 0.2,
      };
    });
  }

  const r = rng(7);
  return Array.from({ length: 12 }, (_, i) => {
    const name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
    const dane = pick(r, DESTINATIONS);
    return {
      id: `cust_demo_${i + 1}`,
      externalId: String(7000 + i),
      name,
      phone: `+573${String(100000000 + Math.floor(r() * 99999999)).slice(0, 9)}`,
      email: `${name.split(" ")[0]?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}${i}@correo.co`,
      city: cityByDane(dane)?.name,
      whatsappConsent: r() > 0.25,
    };
  });
}

export type DemoOrderOptions = {
  seed?: number;
  dane?: string;
  storeId?: string;
  payment?: "cod" | "prepaid";
  number?: number;
  createdAt?: string;
};

/** Genera pedidos deterministas para entornos venezolanos y tiendas de ejemplo */
export function buildDemoOrder(opts: DemoOrderOptions = {}): Order {
  const storeId = opts.storeId ?? DEMO_STORE.id;
  const isBeauty = storeId === "store_demo_beauty";
  const isCafe = storeId === "store_demo_cafe";
  const isVe = (isBeauty || isCafe) && !opts.dane;

  const catalog = isBeauty
    ? DEMO_BEAUTY_PRODUCTS
    : isCafe
      ? DEMO_CAFE_PRODUCTS
      : DEMO_PRODUCTS;
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const r = rng(seed);

  const nLines = 1 + Math.floor(r() * 2);
  const lines = Array.from({ length: nLines }, () => {
    const p = pick(r, catalog);
    return {
      productId: p.id,
      title: p.title,
      quantity: 1 + Math.floor(r() * 2),
      unitPrice: p.price,
      weightGrams: p.weightGrams,
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const number = opts.number ?? 1000 + Math.floor(r() * 9000);

  if (isVe) {
    const dest = pick(r, VE_DESTINATIONS);
    const stateMeta = VENEZUELA_STATES[dest.stateCode];
    const name = `${pick(r, FIRST_VE)} ${pick(r, LAST_VE)}`;
    const prefixes = ["412", "414", "424"];
    const prefix = pick(r, prefixes);
    const phone = `+58${prefix}${String(1000000 + Math.floor(r() * 8999999)).slice(0, 7)}`;
    return {
      id: newId("ord"),
      externalId: `ext_${seed}`,
      number: `#${number}`,
      storeId,
      email: `${name.split(" ")[0]?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@davebeauty.ve`,
      address: {
        country: "VE",
        name,
        phone,
        street: dest.street,
        city: dest.city,
        stateCode: dest.stateCode,
        department: stateMeta?.name ?? dest.city,
        dane: dest.stateCode,
      },
      lines,
      subtotal,
      shippingCharged: 0,
      total: subtotal,
      payment: opts.payment ?? (r() < 0.6 ? "prepaid" : "cod"),
      utm: {
        utm_source: pick(r, ["instagram", "facebook", "tiktok", "whatsapp-directo"]),
        utm_campaign: isCafe ? "cosecha-venezolana-2026" : "bienestar-magnesio-kbeauty",
      },
      createdAt: opts.createdAt ?? new Date().toISOString(),
    };
  }

  // Tienda legacy o pedido con DANE colombiano
  const dane = opts.dane ?? pick(r, DESTINATIONS);
  const city = cityByDane(dane) ?? findCity("Bogotá");
  if (!city) throw new Error("ciudad demo no encontrada");
  const name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
  return {
    id: newId("ord"),
    externalId: `ext_${seed}`,
    number: `#${number}`,
    storeId,
    email: `${name.split(" ")[0]?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@correo.co`,
    address: {
      name,
      phone: `+573${String(100000000 + Math.floor(r() * 899999999)).slice(0, 9)}`,
      street: pick(r, STREETS),
      city: city.name,
      dane: city.dane,
      department: city.department,
    },
    lines,
    subtotal,
    shippingCharged: 0,
    total: subtotal,
    payment: opts.payment ?? (r() < 0.7 ? "cod" : "prepaid"),
    utm: {
      utm_source: pick(r, ["instagram", "facebook", "tiktok", "directo"]),
      utm_campaign: "lanzamiento-origen",
    },
    createdAt: opts.createdAt ?? new Date().toISOString(),
  };
}

export function demoHistory(storeId = DEMO_STORE.id): Order[] {
  return Array.from({ length: 10 }, (_, i) =>
    buildDemoOrder({
      seed: 100 + i,
      storeId,
      number: 1001 + i,
      createdAt: new Date(Date.UTC(2026, 9, 1 + i, 15, 0)).toISOString(),
    }),
  );
}
