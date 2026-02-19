-- Add expiresAt field to Booking for pending booking TTL
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP WITH TIME ZONE;

-- Index for fast date-range conflict queries
CREATE INDEX IF NOT EXISTS "Booking_startDate_endDate_idx" ON "Booking"("startDate", "endDate");

-- Index for fast expired-pending cleanup queries
CREATE INDEX IF NOT EXISTS "Booking_status_expiresAt_idx" ON "Booking"("status", "expiresAt");
