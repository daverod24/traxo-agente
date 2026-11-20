export type Address = {
  name: string;
  phone: string;
  street: string;
  city: string;
  dane: string;
  department: string;
};
export type Line = { title: string; quantity: number; unitPrice: number };
export type Quote = {
  id: string;
  provider: string;
  carrier: string;
  service: string;
  freight: number;
  codCommission: number;
  businessDays: number;
  simulated: boolean;
  chosen: boolean;
  score: number | null;
};
export type Shipment = {
  id: string;
  trackingNumber: string;
  carrier: string;
  provider: string;
  status: string;
  simulated: boolean;
  total: number;
  trackUrl: string;
  events: Array<{ id: string; status: string; description: string; at: string }>;
};
export type OrderRow = {
  id: string;
  number: string;
  address: Address;
  lines: Line[];
  total: number;
  payment: "cod" | "prepaid";
  status: string;
  createdAt: string;
  shipments: Shipment[];
  quotes: Quote[];
};
export type Connection = { name: string; kind: string; live: boolean; note: string };
export type State = {
  store: { id: string; name: string };
  settings: Settings;
  db: string;
  demo?: boolean;
  connections: Connection[];
  kpis: {
    orders: number;
    activeOrders?: number;
    cancelledOrders?: number;
    cancelledAmount?: number;
    gmvTotal?: number;
    codPorCobrar?: number;
    pendingReview?: number;
    shipments: number;
    delivered: number;
    inTransit: number;
    incidents: number;
    pendingApprovals: number;
    shippingSpend: number;
    simulatedShipments: number;
  };
};
export type Approval = {
  id: string;
  orderId: string | null;
  kind: string;
  title: string;
  detail: string;
  status: string;
  createdAt: string;
};
export type Channel = "whatsapp" | "instagram" | "messenger";
export type Conversation = {
  id: string;
  channel: Channel;
  customer: {
    name: string;
    phone: string;
    city: string | null;
    whatsappConsent: boolean;
    optOutAt: string | null;
    orders: Array<{ number: string; total: number; status: string; createdAt: string }>;
  };
  messages: Array<{
    id: string;
    direction: "in" | "out";
    text: string;
    simulated: boolean;
    at: string;
    template: string | null;
  }>;
};
export type Product = {
  id: string;
  title: string;
  price: number;
  cost: number | null;
  marginPct: number | null;
  unitsSold: number;
  revenue: number;
  description?: string | null;
  externalId?: string | null;
  imageUrl?: string | null;
  weightGrams?: number | null;
  sku?: string | null;
  dropiId?: string | null;
  packs?: { duo?: number; trio?: number } | null;
};
export type Campaign = {
  id: string;
  platform: string;
  product: string;
  status: string;
  externalId: string | null;
  createdAt: string;
};
export type DemoOutcome = {
  ok: boolean;
  number: string;
  outcome: { status: string; trackingNumber?: string; carrier?: string };
};

export type Account = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "owner";
  storeId: string;
  tourDone: boolean;
};
export type AuthInfo = {
  account: Account | null;
  login: boolean;
  demo: boolean;
  demoAdmin?: { email: string; password: string };
};

export type Check = {
  id: string;
  group: string;
  title: string;
  status: "pass" | "warn" | "fail" | "na";
  impact: "alto" | "medio" | "bajo";
  evidence: string;
  fix?: string;
};
export type AuditReport = {
  id?: string;
  kind: "seo" | "diseno";
  source: "sample" | "live";
  url: string;
  generatedAt: string;
  score: number | null;
  evaluated: number;
  total: number;
  checks: Check[];
  quickWins: string[];
  notes: string[];
};
export type AuditsResp = {
  seo: AuditReport | null;
  diseno: AuditReport | null;
  history: Record<"seo" | "diseno", Array<{ score: number | null; evaluated: number; at: string }>>;
};

export type ShipRow = {
  id: string;
  trackingNumber: string;
  carrier: string;
  provider: string;
  status: string;
  total: number;
  simulated: boolean;
  labelUrl: string;
  trackUrl: string;
  createdAt: string;
  deliveredAt: string | null;
  lastEvent: string | null;
  order: { id: string; number: string; payment: string; total: number; name: string; city: string };
};
export type ShipDetail = {
  trackingNumber: string;
  carrier: string;
  status: string;
  simulated: boolean;
  events: Array<{ id: string; status: string; description: string; at: string }>;
  order: { number: string; address: Address };
};

export type Overview = {
  days: number;
  series: Array<{ date: string; orders: number; revenue: number }>;
  totals: {
    orders: number;
    revenue: number;
    avgTicket: number | null;
    codShare: number | null;
    deliveredPct: number | null;
    returnedPct: number | null;
    cancelled: number;
  };
};
export type Attribution = {
  sources: Array<{
    source: string;
    orders: number;
    revenue: number;
    deliveredPct: number | null;
    avgTicket: number | null;
  }>;
  campaigns: Array<{
    id: string;
    product: string;
    platform: string;
    status: string;
    utmCampaign: string | null;
    sample: boolean;
    orders: number;
    revenue: number;
    spend: number | null;
    roas: number | null;
    costPerOrder: number | null;
  }>;
};
export type Logistics = {
  carriers: Array<{
    carrier: string;
    shipments: number;
    deliveredPct: number;
    incidentPct: number;
    returnedPct: number;
    avgCost: number;
    avgDays: number | null;
    codCollected: number;
    codInTransit: number;
  }>;
  cod: { collected: number; inTransit: number };
  note: string;
};

export type CampaignFull = {
  id: string;
  platform: "meta" | "google" | "tiktok";
  product: string;
  status: string;
  externalId: string | null;
  createdAt: string;
  sample: boolean;
  metrics: { spend: number; impressions: number; clicks: number; ctr: number; cpc: number } | null;
  payload: {
    dailyBudget: number;
    utmCampaign?: string;
    copy: { headlines: string[]; primaryTexts: string[]; descriptions: string[]; cta: string };
    audience: { cities: string[]; ageMin: number; ageMax: number; interests: string[] };
    creatives: Array<{
      kind: "image" | "video";
      prompt: string;
      generated?: boolean;
      seed?: string;
      assetId?: string;
    }>;
  };
};
export type MediaAsset = {
  id: string;
  kind: "image" | "video";
  title: string;
  source: "subido" | "higgsfield" | "generado";
  role: "ugc" | "producto" | "lifestyle" | "referencia";
  product: string | null;
  seed: string | null;
  url: string | null;
  mime: string | null;
  bytes: number | null;
  durationS: number | null;
  sample: boolean;
  createdAt: string;
};
export type Suggestion = {
  ok: boolean;
  productId: string;
  productTitle: string;
  platform: "meta" | "google" | "tiktok";
  objective: string;
  dailyBudget: number;
  copy: { headlines: string[]; primaryTexts: string[]; descriptions: string[]; cta: string };
  audience: { cities: string[]; ageMin: number; ageMax: number; interests: string[] };
  creatives: Array<{
    kind: "image" | "video";
    prompt: string;
    assetId?: string;
    generated?: boolean;
    seed?: string;
  }>;
  utmCampaign: string;
  credits: { image: number; video: number; total: number };
  rationale: string[];
};
export type AudienceRow = {
  id: string;
  name: string;
  segment: string;
  size: number;
  status: string;
  createdAt: string;
};
export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  whatsappConsent: boolean;
  optOut?: boolean;
  orders: number;
  spent: number;
  lastOrderAt: string | null;
  segments: string[];
};
export type CustomersResp = {
  total: number;
  segments: Record<string, number>;
  customers: CustomerRow[];
};
export type StoreStatus = {
  imported: boolean;
  products: number;
  customers: number;
  orders: number;
  platform: string;
  name?: string;
  url?: string;
  demo?: boolean;
  connected?: boolean;
  profile: { sample?: boolean; rich?: boolean } | null;
};
export type TemplateRow = { name: string; text: string };
export type Settings = {
  autonomy: 0 | 1;
  maxAutoShipmentCost: number;
  preferredProvider?: string;
  weights: { cost: number; speed: number; reliability: number };
  originDane: string;
  confirmCod: "off" | "risky" | "all";
  riskThreshold: number;
  prepaidDiscountPct: number;
};

export type UsageReport = {
  days: number;
  orders: number;
  cost: {
    totalCop: number;
    aiCop: number;
    creditsCop: number;
    perOrderCop: number | null;
    budgetCop: number | null;
    budgetUsedPct: number | null;
  };
  value: {
    automatedActions: number;
    hoursSaved: number;
    savedCop: number;
    returnPerPeso: number | null;
    automationPct: number | null;
    humanSteps: number;
    approvals: number;
    withoutAiPct: number | null;
  };
  ai: {
    calls: number;
    tokensIn: number;
    tokensOut: number;
    byFeature: Array<{ feature: string; calls: number; tokens: number; cop: number }>;
    today: {
      enabled: boolean;
      usedToday: number;
      perStoreDay: number;
      perStoreMinute: number;
      globalDay: number;
    };
  };
  messages: {
    total: number;
    simulated: number;
    byChannel: Array<{ channel: string; sent: number; simulated: number }>;
  };
  creatives: { imagenes: number; videos: number; credits: number; cop: number };
  actions: Array<{ kind: string; label: string; count: number; minutes: number }>;
  assumptions: { hourCop: number; minutesPerAction: Record<string, number> };
  series: Array<{ date: string; ai: number; actions: number; messages: number; costCop: number }>;
  tips: string[];
};

export type SiteDesign = {
  brand: string;
  tagline: string;
  tone: string;
  style: string;
  palette: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    accentText: string;
  };
  fonts: { heading: string; body: string };
  sections: string[];
  copy: {
    headline: string;
    sub: string;
    cta: string;
    story: string;
    benefits: Array<{ title: string; text: string }>;
    faq: Array<{ q: string; a: string }>;
  };
  products: Array<{ title: string; price: number; image?: string }>;
  contact: { whatsapp?: string };
  cod: boolean;
};
export type SiteProject = {
  id: string;
  name: string;
  platform: string;
  status: "borrador" | "generado" | "en-github" | "subido";
  design: SiteDesign;
  githubUrl: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BuiltPage = {
  id: string;
  name: string;
  description: string;
  url: string;
  repo?: string;
  shots: { pc: string; mobile: string };
  tools: string[];
  kind: "referencia";
};

// =========================================================================
// MARKETING ESTRATÉGICO & GENERACIONES
// =========================================================================
export type MetaAdsOutput = {
  channel: "meta_ads";
  campaignName: string;
  hooks: string[];
  primaryTexts: string[];
  headlines: string[];
  visualPrompts: {
    ratio4x5: string;
    ratio9x16: string;
    safeZoneText: string;
  };
  utmTemplate: string;
};

export type ClickToWhatsAppOutput = {
  channel: "click_to_whatsapp";
  adCopy: string;
  prefilledWhatsAppMessage: string;
  closingScript: {
    step1Greeting: string;
    step2PricingBimoneda: string;
    step3LogisticsConfirm: string;
  };
};

export type TikTokUgcOutput = {
  channel: "tiktok_ugc";
  hooks0to3s: string[];
  script30s: Array<{
    timestamp: string;
    cameraCue: string;
    audioVoiceover: string;
    onScreenText: string;
  }>;
  soundSuggestion: string;
};

export type MarketingGenerationOutput = MetaAdsOutput | ClickToWhatsAppOutput | TikTokUgcOutput;

export type MarketingGeneration = {
  id: string;
  storeId: string;
  productId: string;
  channel: "meta_ads" | "click_to_whatsapp" | "tiktok_ugc";
  angle: string;
  mode: "explore" | "refine";
  parentGenerationId: string | null;
  userInstruction: string | null;
  outputJson: MarketingGenerationOutput;
  provider: string;
  model: string;
  latencyMs: number;
  status: "generated" | "dispatched_n8n" | "archived";
  createdAt: string;
  product?: {
    id: string;
    title: string;
    category?: string;
    price: number;
    imageUrl?: string | null;
  };
};

// =========================================================================
// PULSO EN VIVO: ANALÍTICA GA4, FUNNEL, CLARITY Y BRIEF IA
// =========================================================================
export type AnalyticsRealtimeResp = {
  ok: boolean;
  activeUsers: number;
  source?: "live" | "simulated";
  mostViewedProduct: {
    name: string;
    views: number;
  };
  topChannel: string;
  engagement?: {
    averageDuration: string;
    bounceRate: string;
    topCities: Array<{ name: string; percentage: number }>;
  };
  trafficSources?: Array<{ source: string; users: number }>;
  clarity?: {
    deepLink: string;
    projectId?: string;
  };
};

export type AnalyticsFunnelStep = {
  id?: string;
  step?: string;
  name?: string;
  label?: string;
  count: number;
  conversionRate?: number;
  dropoffRate?: number;
  status?: string;
  conversionFromPrevious?: number;
  conversionFromFirst?: number;
};

export type AnalyticsFunnelResp = {
  ok: boolean;
  periodDays: number;
  steps: AnalyticsFunnelStep[];
  bottleneck?: {
    step?: string;
    stepId?: string;
    stepName?: string;
    severity?: "critical" | "warning" | "good" | "rojo" | "amarillo" | "verde";
    description?: string;
    message?: string;
    recommendation?: string;
  };
};

export type AnalyticsBriefResp = {
  ok: boolean;
  brief: string;
  bulletPoints?: string[];
  generatedAt: string;
  cached: boolean;
};

export type ClarityMetricsResp = {
  ok: boolean;
  sessionsCount?: number;
  deadClicksCount?: number;
  rageClicksCount?: number;
  quickBacksCount?: number;
  deepLink: string;
};
