-- Card on file for damage charges, and the charges made against it.
-- IF NOT EXISTS: production already had an unused "stripeCustomerId" column
-- from outside the migration history (found 2026-11-26).
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "stripePaymentMethodId" TEXT;

CREATE TABLE "DamageCharge" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "failureMessage" TEXT,
    "stripePaymentIntentId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DamageCharge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DamageCharge_bookingId_idx" ON "DamageCharge"("bookingId");

ALTER TABLE "DamageCharge" ADD CONSTRAINT "DamageCharge_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
