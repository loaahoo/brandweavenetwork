-- Campaigns are addressed by (partnership, name) when creating tracking links.
CREATE UNIQUE INDEX "Campaign_partnershipId_name_key" ON "Campaign"("partnershipId", "name");

-- A flat fee can be part of the agreed terms before any FlatFee ledger row is scheduled.
ALTER TABLE "CommissionRule" ADD COLUMN "flatFeeCents" BIGINT;
ALTER TABLE "CommissionRule" ADD COLUMN "flatFeeLabel" TEXT;

-- Adjustments record which direction they belong to.
ALTER TABLE "Adjustment" ADD COLUMN "promoterOrganizationId" TEXT;
ALTER TABLE "Adjustment" ADD COLUMN "payerOrganizationId" TEXT;

-- API keys are looked up by the hash of the presented key.
CREATE UNIQUE INDEX "ApiKey_hash_key" ON "ApiKey"("hash");
