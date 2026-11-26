-- Write each damage charge before calling Stripe, keyed by the admin panel's
-- requestId, so an interrupted charge can be retried without charging twice.
-- The table is new and empty when this runs (created in the previous migration).
ALTER TABLE "DamageCharge" ADD COLUMN "requestId" TEXT NOT NULL;
ALTER TABLE "DamageCharge" ADD COLUMN "guestEmailed" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "DamageCharge_requestId_key" ON "DamageCharge"("requestId");
