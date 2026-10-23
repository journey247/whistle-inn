-- Owner-edited property profile; replaces the code config as the live source.
CREATE TABLE "PropertyProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "data" JSONB NOT NULL,
    "onboardingCompletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PropertyProfile_pkey" PRIMARY KEY ("id")
);
