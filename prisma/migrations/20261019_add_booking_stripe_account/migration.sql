-- Stripe Connect: the connected account a booking was charged on (NULL = platform).
ALTER TABLE "Booking" ADD COLUMN "stripeAccountId" TEXT;
