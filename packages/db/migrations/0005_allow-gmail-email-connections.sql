ALTER TABLE "email_connections" DROP CONSTRAINT "email_connections_provider";--> statement-breakpoint
ALTER TABLE "email_connections" ALTER COLUMN "imap_host" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "email_connections" ALTER COLUMN "imap_host" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "email_connections" ALTER COLUMN "smtp_host" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "email_connections" ALTER COLUMN "smtp_host" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_provider_hosts" CHECK (("email_connections"."provider" = 'zoho' AND "email_connections"."imap_host" IS NOT NULL AND "email_connections"."smtp_host" IS NOT NULL) OR ("email_connections"."provider" = 'gmail' AND "email_connections"."imap_host" IS NULL AND "email_connections"."smtp_host" IS NULL));--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_provider" CHECK ("email_connections"."provider" IN ('zoho', 'gmail'));