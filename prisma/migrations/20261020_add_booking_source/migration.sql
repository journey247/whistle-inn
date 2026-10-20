-- Booking attribution: where the guest came from, and the provider's fee on paid-ad bookings.
ALTER TABLE "Booking" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE "Booking" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "Booking" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "Booking" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "Booking" ADD COLUMN "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
CREATE INDEX "Booking_source_idx" ON "Booking"("source");
