-- CreateTable
CREATE TABLE "ExternalBooking" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalBooking_pkey" PRIMARY KEY ("id")
);
