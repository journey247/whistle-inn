-- Post-stay follow-up email tracking, and marketing-email opt-outs.
ALTER TABLE "Booking" ADD COLUMN "followupSentAt" TIMESTAMP(3);

CREATE TABLE "EmailOptOut" (
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailOptOut_pkey" PRIMARY KEY ("email")
);
