-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'PARTNERSHIP_MANAGER', 'MARKETING_MANAGER', 'FINANCE', 'ANALYST', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INVITED');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('B2C', 'B2B', 'B2B2C');

-- CreateEnum
CREATE TYPE "Presence" AS ENUM ('ONLINE', 'OFFLINE', 'OMNICHANNEL');

-- CreateEnum
CREATE TYPE "BrandSize" AS ENUM ('STARTUP', 'GROWTH', 'MID_MARKET', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ChannelCategory" AS ENUM ('WEBSITE', 'EMAIL', 'MESSAGING', 'APP', 'LOYALTY', 'SOCIAL_CONTENT', 'PHYSICAL', 'EVENTS', 'PRODUCT');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('AVAILABLE', 'LIMITED', 'WAITLIST', 'PAUSED');

-- CreateEnum
CREATE TYPE "CompensationModel" AS ENUM ('COMMISSION', 'CPA', 'CPL', 'CPC', 'REVENUE_SHARE', 'FLAT_FEE', 'HYBRID', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'QUESTION');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('DISCUSSION', 'PROPOSAL', 'TERMS', 'INTEGRATION', 'LIVE');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('NONE', 'DRAFT', 'SENT', 'COUNTERED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('MESSAGE', 'NOTE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AttributionMethod" AS ENUM ('LAST_CLICK', 'FIRST_CLICK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CustomerRule" AS ENUM ('NEW_ONLY', 'EXISTING_OK', 'ALL');

-- CreateEnum
CREATE TYPE "PaymentTerms" AS ENUM ('NET15', 'NET30', 'NET45', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FlatFeeStatus" AS ENUM ('SCHEDULED', 'PAYABLE', 'PAID');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'LIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "LinkKind" AS ENUM ('STANDARD', 'CAMPAIGN', 'PLACEMENT', 'PRODUCT', 'DEEP_LINK', 'QR_CODE');

-- CreateEnum
CREATE TYPE "ConversionSource" AS ENUM ('API', 'PIXEL');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'LOCKED', 'PAYABLE', 'PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('DRAFT', 'PAYABLE', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('LOGO', 'PRODUCT_IMAGE', 'VIDEO', 'GUIDELINES', 'BANNER', 'COPY', 'LANDING_PAGE', 'OFFER', 'PROMO_CODE');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'AVAILABLE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandUser" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "organizationId" TEXT NOT NULL,
    "tagline" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "industry" TEXT NOT NULL,
    "subcategory" TEXT,
    "headquarters" TEXT,
    "markets" TEXT[],
    "description" TEXT,
    "productCategories" TEXT[],
    "averageOrderValueCents" BIGINT,
    "businessModel" TEXT,
    "businessType" "BusinessType" NOT NULL DEFAULT 'B2C',
    "presence" "Presence" NOT NULL DEFAULT 'ONLINE',
    "size" "BrandSize",
    "lifecycleStages" TEXT[],
    "lookingFor" TEXT[],
    "partnershipModels" "CompensationModel"[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "primaryAudience" TEXT,
    "ageRanges" TEXT[],
    "audienceGeography" TEXT[],
    "interests" TEXT[],
    "segments" TEXT[],
    "householdIncome" TEXT,
    "customerType" TEXT,
    "purchaseBehavior" TEXT,
    "loyaltyMembers" INTEGER,
    "monthlyCustomers" INTEGER,
    "monthlyTraffic" INTEGER,
    "appUsers" INTEGER,
    "emailSubscribers" INTEGER,
    "socialFollowing" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "MarketingChannel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ChannelCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "monthlyReach" INTEGER,
    "geography" TEXT[],
    "segment" TEXT,
    "placementExamples" TEXT[],
    "imageUrls" TEXT[],
    "partnershipTypes" "CompensationModel"[],
    "compensationPreference" TEXT,
    "minimumCommitment" TEXT,
    "restrictions" TEXT[],
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "ChannelStatus" NOT NULL DEFAULT 'AVAILABLE',
    "desiredPartnerCategories" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "lookingFor" TEXT[],
    "offering" TEXT[],
    "channelsWanted" TEXT[],
    "models" "CompensationModel"[],
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectionRequest" (
    "id" TEXT NOT NULL,
    "fromOrganizationId" TEXT NOT NULL,
    "toOrganizationId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "intro" TEXT NOT NULL,
    "idea" TEXT NOT NULL,
    "channelIds" TEXT[],
    "proposedModel" "CompensationModel",
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "partnershipId" TEXT,

    CONSTRAINT "ConnectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partnership" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" "DealStage" NOT NULL DEFAULT 'DISCUSSION',
    "summary" TEXT,
    "nextStep" TEXT,
    "proposalStatus" "ProposalStatus" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipMember" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerName" TEXT,

    CONSTRAINT "PartnershipMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorOrganizationId" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL DEFAULT 'MESSAGE',
    "body" TEXT NOT NULL,
    "mentions" TEXT[],
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "proposedByOrganizationId" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'SENT',
    "terms" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "promoterOrganizationId" TEXT NOT NULL,
    "payerOrganizationId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "attributionWindowDays" INTEGER NOT NULL DEFAULT 30,
    "attributionMethod" "AttributionMethod" NOT NULL DEFAULT 'LAST_CLICK',
    "clickAttribution" BOOLEAN NOT NULL DEFAULT true,
    "promoCodeAttribution" BOOLEAN NOT NULL DEFAULT false,
    "eligibleProducts" TEXT[],
    "excludedSkus" TEXT[],
    "customerRule" "CustomerRule" NOT NULL DEFAULT 'ALL',
    "geoRestrictions" TEXT[],
    "returnsPeriodDays" INTEGER NOT NULL DEFAULT 30,
    "lockingPeriodDays" INTEGER NOT NULL DEFAULT 15,
    "paymentTerms" "PaymentTerms" NOT NULL DEFAULT 'NET30',
    "customPaymentDays" INTEGER,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementChannel" (
    "agreementId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "AgreementChannel_pkey" PRIMARY KEY ("agreementId","channelId")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "model" "CompensationModel" NOT NULL,
    "commissionBps" INTEGER,
    "cpaCents" BIGINT,
    "cplCents" BIGINT,
    "cpcCents" BIGINT,
    "tierFromCents" BIGINT,
    "notes" TEXT,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlatFee" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "FlatFeeStatus" NOT NULL DEFAULT 'SCHEDULED',
    "payoutId" TEXT,

    CONSTRAINT "FlatFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "promoterOrganizationId" TEXT NOT NULL,
    "payerOrganizationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "channelId" TEXT,
    "placement" TEXT NOT NULL,
    "creative" TEXT,
    "kind" "LinkKind" NOT NULL DEFAULT 'STANDARD',
    "destination" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "TrackingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Click" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "Click_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversion" (
    "id" TEXT NOT NULL,
    "payerOrganizationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "clickId" TEXT,
    "revenueCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "customerType" TEXT NOT NULL,
    "country" TEXT,
    "items" JSONB,
    "source" "ConversionSource" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attributed" BOOLEAN NOT NULL,
    "rejectionReasons" TEXT[],

    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "conversionId" TEXT NOT NULL,
    "payoutId" TEXT,
    "saleCents" BIGINT NOT NULL,
    "commissionCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "reversedReason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "payableAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "partnershipId" TEXT NOT NULL,
    "promoterOrganizationId" TEXT NOT NULL,
    "payerOrganizationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "commissionCents" BIGINT NOT NULL DEFAULT 0,
    "flatFeeCents" BIGINT NOT NULL DEFAULT 0,
    "adjustmentCents" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paidAt" TIMESTAMP(3),
    "externalRef" TEXT,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adjustment" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT,
    "partnershipId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "storageKey" TEXT,
    "detail" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'AVAILABLE',
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_externalId_key" ON "User"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "BrandUser_userId_idx" ON "BrandUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandUser_organizationId_email_key" ON "BrandUser"("organizationId", "email");

-- CreateIndex
CREATE INDEX "BrandProfile_industry_idx" ON "BrandProfile"("industry");

-- CreateIndex
CREATE INDEX "MarketingChannel_organizationId_idx" ON "MarketingChannel"("organizationId");

-- CreateIndex
CREATE INDEX "MarketingChannel_category_status_idx" ON "MarketingChannel"("category", "status");

-- CreateIndex
CREATE INDEX "Opportunity_organizationId_idx" ON "Opportunity"("organizationId");

-- CreateIndex
CREATE INDEX "Opportunity_status_createdAt_idx" ON "Opportunity"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectionRequest_partnershipId_key" ON "ConnectionRequest"("partnershipId");

-- CreateIndex
CREATE INDEX "ConnectionRequest_toOrganizationId_status_idx" ON "ConnectionRequest"("toOrganizationId", "status");

-- CreateIndex
CREATE INDEX "ConnectionRequest_fromOrganizationId_idx" ON "ConnectionRequest"("fromOrganizationId");

-- CreateIndex
CREATE INDEX "PartnershipMember_organizationId_idx" ON "PartnershipMember"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipMember_partnershipId_organizationId_key" ON "PartnershipMember"("partnershipId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_partnershipId_key" ON "Conversation"("partnershipId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_partnershipId_version_key" ON "Proposal"("partnershipId", "version");

-- CreateIndex
CREATE INDEX "Agreement_payerOrganizationId_idx" ON "Agreement"("payerOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_partnershipId_promoterOrganizationId_endedAt_key" ON "Agreement"("partnershipId", "promoterOrganizationId", "endedAt");

-- CreateIndex
CREATE INDEX "CommissionRule_agreementId_idx" ON "CommissionRule"("agreementId");

-- CreateIndex
CREATE INDEX "FlatFee_agreementId_idx" ON "FlatFee"("agreementId");

-- CreateIndex
CREATE INDEX "Campaign_partnershipId_idx" ON "Campaign"("partnershipId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingLink_code_key" ON "TrackingLink"("code");

-- CreateIndex
CREATE INDEX "TrackingLink_promoterOrganizationId_idx" ON "TrackingLink"("promoterOrganizationId");

-- CreateIndex
CREATE INDEX "TrackingLink_partnershipId_idx" ON "TrackingLink"("partnershipId");

-- CreateIndex
CREATE INDEX "Click_linkId_occurredAt_idx" ON "Click"("linkId", "occurredAt");

-- CreateIndex
CREATE INDEX "Conversion_clickId_idx" ON "Conversion"("clickId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversion_payerOrganizationId_orderId_key" ON "Conversion"("payerOrganizationId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_conversionId_key" ON "Transaction"("conversionId");

-- CreateIndex
CREATE INDEX "Transaction_agreementId_status_idx" ON "Transaction"("agreementId", "status");

-- CreateIndex
CREATE INDEX "Transaction_partnershipId_occurredAt_idx" ON "Transaction"("partnershipId", "occurredAt");

-- CreateIndex
CREATE INDEX "Payout_payerOrganizationId_status_idx" ON "Payout"("payerOrganizationId", "status");

-- CreateIndex
CREATE INDEX "Payout_promoterOrganizationId_status_idx" ON "Payout"("promoterOrganizationId", "status");

-- CreateIndex
CREATE INDEX "Asset_organizationId_idx" ON "Asset"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_organizationId_provider_key" ON "Integration"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_prefix_key" ON "ApiKey"("prefix");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "BrandUser" ADD CONSTRAINT "BrandUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandUser" ADD CONSTRAINT "BrandUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingChannel" ADD CONSTRAINT "MarketingChannel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_fromOrganizationId_fkey" FOREIGN KEY ("fromOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_toOrganizationId_fkey" FOREIGN KEY ("toOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipMember" ADD CONSTRAINT "PartnershipMember_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipMember" ADD CONSTRAINT "PartnershipMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_promoterOrganizationId_fkey" FOREIGN KEY ("promoterOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_payerOrganizationId_fkey" FOREIGN KEY ("payerOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementChannel" ADD CONSTRAINT "AgreementChannel_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementChannel" ADD CONSTRAINT "AgreementChannel_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "MarketingChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlatFee" ADD CONSTRAINT "FlatFee_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlatFee" ADD CONSTRAINT "FlatFee_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlatFee" ADD CONSTRAINT "FlatFee_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingLink" ADD CONSTRAINT "TrackingLink_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingLink" ADD CONSTRAINT "TrackingLink_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingLink" ADD CONSTRAINT "TrackingLink_promoterOrganizationId_fkey" FOREIGN KEY ("promoterOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingLink" ADD CONSTRAINT "TrackingLink_payerOrganizationId_fkey" FOREIGN KEY ("payerOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingLink" ADD CONSTRAINT "TrackingLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingLink" ADD CONSTRAINT "TrackingLink_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "MarketingChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Click" ADD CONSTRAINT "Click_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "TrackingLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_clickId_fkey" FOREIGN KEY ("clickId") REFERENCES "Click"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_conversionId_fkey" FOREIGN KEY ("conversionId") REFERENCES "Conversion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- At most one live (endedAt IS NULL) agreement per direction of a partnership.
-- A plain unique on (…, endedAt) doesn't enforce this because Postgres treats NULLs as distinct.
CREATE UNIQUE INDEX "agreement_one_live_per_direction"
  ON "Agreement" ("partnershipId", "promoterOrganizationId") WHERE "endedAt" IS NULL;
