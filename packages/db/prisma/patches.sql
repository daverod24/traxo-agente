-- Parches idempotentes: se aplican en cada arranque, sobre bases creadas con versiones anteriores del esquema.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "confirmAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "optOutAt" TIMESTAMP(3);
ALTER TABLE "CampaignDraft" ADD COLUMN IF NOT EXISTS "metrics" JSONB;
ALTER TABLE "CampaignDraft" ADD COLUMN IF NOT EXISTS "sample" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'owner',
  "storeId" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "tourDone" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Account_email_key" ON "Account"("email");
CREATE TABLE IF NOT EXISTS "Audience" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "segment" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Audience_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Audience_storeId_createdAt_idx" ON "Audience"("storeId", "createdAt");
CREATE TABLE IF NOT EXISTS "StoreAudit" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "score" INTEGER,
  "evaluated" INTEGER NOT NULL,
  "total" INTEGER NOT NULL,
  "url" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StoreAudit_storeId_kind_createdAt_idx" ON "StoreAudit"("storeId", "kind", "createdAt");
CREATE TABLE IF NOT EXISTS "MediaAsset" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'producto',
  "product" TEXT,
  "seed" TEXT,
  "file" TEXT,
  "mime" TEXT,
  "bytes" INTEGER,
  "durationS" INTEGER,
  "sample" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MediaAsset_storeId_createdAt_idx" ON "MediaAsset"("storeId", "createdAt");
ALTER TABLE "MediaAsset" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentLinkId" TEXT;
CREATE TABLE IF NOT EXISTS "UsageEvent" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "tokensIn" INTEGER NOT NULL DEFAULT 0,
  "tokensOut" INTEGER NOT NULL DEFAULT 0,
  "credits" INTEGER NOT NULL DEFAULT 0,
  "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UsageEvent_storeId_at_idx" ON "UsageEvent"("storeId", "at");
CREATE TABLE IF NOT EXISTS "SiteProject" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'borrador',
  "design" JSONB NOT NULL,
  "githubUrl" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteProject_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SiteProject_storeId_updatedAt_idx" ON "SiteProject"("storeId", "updatedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductCategory') THEN
    CREATE TYPE "ProductCategory" AS ENUM ('oral_supplement', 'facial_skincare', 'body_skincare', 'haircare', 'general');
  END IF;
END $$;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "category" "ProductCategory" NOT NULL DEFAULT 'general';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "referenceImageUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "keyIngredients" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "commonObjections" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packRules" JSONB;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "manageStock" BOOLEAN;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stockStatus" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "dropiProductId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Product_storeId_externalId_key" ON "Product"("storeId", "externalId");

CREATE TABLE IF NOT EXISTS "MarketingGeneration" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "angle" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "parentGenerationId" TEXT,
  "userInstruction" TEXT,
  "outputJson" JSONB NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "latencyMs" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'generated',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingGeneration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketingGeneration_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MarketingGeneration_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MarketingGeneration_storeId_productId_channel_idx" ON "MarketingGeneration"("storeId", "productId", "channel");
CREATE INDEX IF NOT EXISTS "MarketingGeneration_parentGenerationId_idx" ON "MarketingGeneration"("parentGenerationId");

CREATE TABLE IF NOT EXISTS "Funnel" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sectionsJson" JSONB NOT NULL,
  "tokensJson" JSONB NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Funnel_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Funnel_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Funnel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Funnel_storeId_slug_key" ON "Funnel"("storeId", "slug");
CREATE INDEX IF NOT EXISTS "Funnel_slug_idx" ON "Funnel"("slug");

CREATE TABLE IF NOT EXISTS "AnalyticsCache" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "metricType" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsCache_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsCache_storeId_metricType_key" ON "AnalyticsCache"("storeId", "metricType");
CREATE INDEX IF NOT EXISTS "AnalyticsCache_expiresAt_idx" ON "AnalyticsCache"("expiresAt");

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "subtotalExact" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingChargedExact" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "totalExact" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "rawStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "origin" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "anomalyReason" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "meta" JSONB;
UPDATE "Order" SET "subtotalExact" = "subtotal", "totalExact" = "total", "shippingChargedExact" = "shippingCharged" WHERE "totalExact" IS NULL;
