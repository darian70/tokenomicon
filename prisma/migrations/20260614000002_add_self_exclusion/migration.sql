-- Responsible gaming: self-exclusion field on UserProfile.
-- Null = not excluded. Set by the user via the responsible gaming UI.
-- Checked at session creation to block play for the exclusion duration.
ALTER TABLE "UserProfile" ADD COLUMN "selfExcludedUntil" TIMESTAMP(3);
