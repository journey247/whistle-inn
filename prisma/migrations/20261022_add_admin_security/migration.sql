-- Admin security: session revocation, authenticator-app 2FA, audit log and
-- shared rate-limit counters.
ALTER TABLE "AdminUser" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AdminUser" ADD COLUMN "totpSecret" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN "totpPendingSecret" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN "totpLastStep" INTEGER;
ALTER TABLE "AdminUser" ADD COLUMN "recoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "details" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");
