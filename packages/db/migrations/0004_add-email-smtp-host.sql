ALTER TABLE "email_connections" ADD COLUMN "smtp_host" text DEFAULT 'smtp.zoho.com' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_smtp_host_trimmed" CHECK (btrim("email_connections"."smtp_host") = "email_connections"."smtp_host");--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_smtp_host_not_empty" CHECK ("email_connections"."smtp_host" <> '');
