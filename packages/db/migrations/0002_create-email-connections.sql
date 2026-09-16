CREATE TABLE "email_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"username" text NOT NULL,
	"encrypted_password" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_connections_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "email_connections_provider" CHECK ("email_connections"."provider" = 'zoho'),
	CONSTRAINT "email_connections_username_trimmed" CHECK (btrim("email_connections"."username") = "email_connections"."username"),
	CONSTRAINT "email_connections_username_not_empty" CHECK ("email_connections"."username" <> ''),
	CONSTRAINT "email_connections_encrypted_password_not_empty" CHECK ("email_connections"."encrypted_password" <> '')
);
--> statement-breakpoint
ALTER TABLE "email_connections" ADD CONSTRAINT "email_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;