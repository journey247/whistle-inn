-- Add cancellationToken for guest self-service cancellation
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancellationToken" TEXT UNIQUE;
