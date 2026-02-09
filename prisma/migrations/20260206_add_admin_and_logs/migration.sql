-- Migration: Add admin user and logs; convert Booking.status to enum
BEGIN;

-- Create booking_status enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('pending','paid','cancelled');
    END IF;
END$$;

-- Convert Booking.status text -> booking_status
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE booking_status USING (
  CASE
    WHEN "status" = 'paid' THEN 'paid'::booking_status
    WHEN "status" = 'cancelled' THEN 'cancelled'::booking_status
    ELSE 'pending'::booking_status
  END
);

-- Create AdminUser table
CREATE TABLE IF NOT EXISTS "AdminUser" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  "hashedPassword" TEXT NOT NULL,
  role TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create EmailLog table
CREATE TABLE IF NOT EXISTS "EmailLog" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "to" TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template TEXT,
  "bookingId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create SmsLog table
CREATE TABLE IF NOT EXISTS "SmsLog" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "to" TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT,
  "bookingId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create NotificationPreference table
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "adminId" TEXT,
  enabled BOOLEAN DEFAULT true,
  events TEXT[],
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;