CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "targetType" VARCHAR(40) NOT NULL,
    "targetId" VARCHAR(160),
    "idempotencyKey" VARCHAR(160),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditLog_idempotencyKey_key" ON "AuditLog"("idempotencyKey");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_targetType_targetId_createdAt_idx" ON "AuditLog"("targetType", "targetId", "createdAt");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
