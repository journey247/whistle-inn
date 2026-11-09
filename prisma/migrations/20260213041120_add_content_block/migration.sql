-- This migration repeats 20260212212439_add_pricing_and_coupons (Booking.couponId,
-- Booking.discount, Coupon, SpecialRate, Coupon_code_key, Booking_couponId_fkey) and
-- 20260212064654_add_content_block_cms (ContentBlock). As first written it used plain
-- CREATE/ADD statements, so it failed on any database built from the history
-- ("column couponId already exists", 42701). Every statement is now guarded so it is a
-- no-op for objects that already exist, and the last block brings the earlier,
-- slightly different definitions to the shape this migration intended (and that
-- schema.prisma has): SpecialRate.label nullable, ContentBlock.type with no default,
-- ContentBlock.section required.
--
-- Databases that already recorded this migration as applied never run it again.

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "couponId" TEXT,
ADD COLUMN IF NOT EXISTS "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SpecialRate" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "pricePerNight" DOUBLE PRECISION,
    "multiplier" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContentBlock" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_couponId_fkey') THEN
        ALTER TABLE "Booking" ADD CONSTRAINT "Booking_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Converge the definitions created by the two earlier migrations.
ALTER TABLE "SpecialRate" ALTER COLUMN "label" DROP NOT NULL;
ALTER TABLE "ContentBlock" ALTER COLUMN "type" DROP DEFAULT;
UPDATE "ContentBlock" SET "section" = '' WHERE "section" IS NULL;
ALTER TABLE "ContentBlock" ALTER COLUMN "section" SET NOT NULL;
