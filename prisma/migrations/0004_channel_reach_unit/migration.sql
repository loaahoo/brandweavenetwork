-- "customers / month", "subscribers", "sends / month"… — the unit that makes monthlyReach meaningful.
ALTER TABLE "MarketingChannel" ADD COLUMN "reachUnit" TEXT;
