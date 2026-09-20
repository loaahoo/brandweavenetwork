-- Brand tile colour (shown where no uploaded logo exists).
ALTER TABLE "BrandProfile" ADD COLUMN "color" TEXT;

-- Team members have a display name before they have signed in.
ALTER TABLE "BrandUser" ADD COLUMN "name" TEXT;

-- Messages carry their author's display name (authors may belong to the partner organization).
-- The table is empty at this point, so a NOT NULL column can be added without a default.
ALTER TABLE "Message" ADD COLUMN "authorName" TEXT NOT NULL;
