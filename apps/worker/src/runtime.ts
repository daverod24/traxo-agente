import { carriersFromEnv, type MockCarrierProvider } from "@traxo/carriers";
import { type CommerceAdapter, commerceFromEnv, MockCommerce } from "@traxo/commerce";
import { EventBus, StoreSettingsSchema } from "@traxo/core";
import {
  type Db,
  loadOrderStoreIndex,
  logEvent,
  openDb,
  orderStoreIndex,
  RICH_VERSION,
  seedDemo,
  seedRich,
} from "@traxo/db";
import { messagingFromEnv } from "@traxo/messaging";
import { paymentsFromEnv } from "@traxo/payments";
import type { AgentDeps } from "./agent.ts";
import { isDemo } from "./mode.ts";
import { attachUsage } from "./usage.ts";

export type Runtime = AgentDeps & {
  /** Restaura los datos de ejemplo de la tienda demo (solo cuando hay semilla rica). */
  reseed?: () => Promise<void>;
  storeId: string;
  commerceMap: Record<string, CommerceAdapter>;
  mocks: MockCarrierProvider[];
  connections: Array<{
    name: string;
    kind: "tienda" | "envios" | "mensajeria" | "anuncios";
    live: boolean;
    note: string;
  }>;
};

type Env = Record<string, string | undefined>;

export async function createRuntime(
  env: Env = process.env,
  opts: { db?: Db; rich?: boolean } = {},
): Promise<Runtime> {
  const db = opts.db ?? (await openDb());
  attachUsage(db);

  // Asegurar la tienda principal en vivo (Davebeauty WooCommerce)
  const mainExists = await db.prisma.store.findUnique({ where: { id: "store_main" } });
  if (!mainExists) {
    await db.prisma.store.create({
      data: {
        id: "store_main",
        name: env.TRAXO_STORE_NAME || "Davebeauty (WooCommerce en Vivo)",
        platform: env.WOOCOMMERCE_KEY ? "woocommerce" : "pending",
        url: env.TRAXO_STORE_URL || "http://nginx",
        settings: StoreSettingsSchema.parse({ autonomy: 1, preferredProvider: "dropi" }),
        profile: { vertical: "Belleza, K-Beauty y Bienestar Botánico", live: Boolean(env.WOOCOMMERCE_KEY) },
      },
    });
  }

  // Si está en modo demo o local, sembrar las tiendas demo venezolanas
  if (isDemo()) {
    await seedDemo(db, { all: true });
  }

  // Datos de ejemplo ricos (90 días de operación) para las tiendas demo
  let reseed: (() => Promise<void>) | undefined;
  if (opts.rich) {
    const demoStores = await db.prisma.store.findMany({
      where: { id: { in: ["store_demo_beauty", "store_demo_cafe", "store_demo"] } },
    });
    for (const demoStore of demoStores) {
      const prof = demoStore.profile as { rich?: boolean; richVersion?: number } | null;
      if (!prof?.rich || (prof.richVersion ?? 1) < RICH_VERSION) {
        await seedRich(db, { storeId: demoStore.id });
      }
    }
    reseed = async () => {
      for (const demoStore of demoStores) {
        await seedRich(db, { storeId: demoStore.id });
      }
    };
  }

  // La tienda por defecto del runtime es store_main si hay credenciales WooCommerce, o store_demo
  const store = (env.WOOCOMMERCE_KEY ? await db.prisma.store.findUnique({ where: { id: "store_main" } }) : null) ??
    (await db.prisma.store.findFirst({ orderBy: { createdAt: "asc" } })) as NonNullable<
      Awaited<ReturnType<Db["prisma"]["store"]["findFirst"]>>
    >;

  const bus = new EventBus();
  await loadOrderStoreIndex(db);
  // Cada evento pertenece a la tienda de su pedido; los que no tienen pedido caen en la tienda por defecto.
  bus.resolveStore = (e) =>
    (e.data?.storeId as string | undefined) ??
    (e.orderId ? orderStoreIndex.get(e.orderId) : undefined);
  bus.subscribe((e) => {
    logEvent(db, e.storeId ?? store.id, e).catch(() => {});
  });

  const commerceMap = commerceFromEnv(env, store.id);
  const commerce = Object.values(commerceMap)[0] as CommerceAdapter;
  if (store.platform === "pending" && commerce.platform !== "mock")
    await db.prisma.store.update({
      where: { id: store.id },
      data: { platform: commerce.platform },
    });
  const { providers, notes, mocks } = carriersFromEnv(env);
  const messaging = messagingFromEnv(env, store.id);

  const connections: Runtime["connections"] = [
    {
      name:
        commerce.platform === "mock"
          ? isDemo()
            ? "Tienda demo (Café de Origen)"
            : "Sin tienda conectada"
          : commerce.platform,
      kind: "tienda",
      live: commerce.platform !== "mock",
      note:
        commerce.platform === "mock"
          ? "Conecta Shopify, Tiendanube o WooCommerce con las variables de .env (o corre /traxo:instalar)."
          : "Conectada.",
    },
    ...providers.map((p) => ({
      name: p.label,
      kind: "envios" as const,
      live: p.live,
      note: notes.find((n) => n.startsWith(p.label)) ?? "",
    })),
    ...[
      ["WhatsApp (Zernio)", "Mensajes simulados."],
      ["Instagram (Zernio)", "Mensajes directos simulados."],
      ["Messenger (Zernio)", "Mensajes simulados."],
    ].map(([name, note]) => ({
      name: name as string,
      kind: "mensajeria" as const,
      live: Boolean(env.ZERNIO_API_KEY),
      note: env.ZERNIO_API_KEY ? "Conectado por Zernio." : `${note} Falta ZERNIO_API_KEY.`,
    })),
    {
      name: "Meta Ads",
      kind: "anuncios",
      live: false,
      note: "Borradores en pausa. Vía Zernio o con el conector de Meta en Claude.",
    },
    {
      name: "Google Ads",
      kind: "anuncios",
      live: false,
      note: "Borrador exportable. Vía Zernio o la API de Google Ads.",
    },
    {
      name: "TikTok Ads",
      kind: "anuncios",
      live: false,
      note: "Borrador exportable. Vía Zernio o el MCP de TikTok for Business.",
    },
  ];

  // Si la tienda principal está conectada a WooCommerce y aún no tiene productos, auto-importar catálogo
  if (commerce.platform === "woocommerce") {
    const prodCount = await db.prisma.product.count({ where: { storeId: "store_main" } });
    if (prodCount === 0) {
      try {
        const { importStore } = await import("./importer.ts");
        await importStore({ db, bus, commerce, carriers: providers, messaging } as never, "store_main", commerce);
      } catch (e) {
        console.warn("No se pudo auto-importar catálogo de WooCommerce al iniciar:", e);
      }
    }
  }

  return {
    db,
    bus,
    commerce,
    commerceMap,
    carriers: providers,
    mocks,
    messaging,
    payments: paymentsFromEnv(env),
    storeName: store.name,
    storeId: store.id,
    connections,
    reseed,
  };
}

export const isMockCommerce = (c: CommerceAdapter): c is MockCommerce => c instanceof MockCommerce;
