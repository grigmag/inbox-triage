CREATE TABLE "addon_rate_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"pricing_mode" text NOT NULL,
	"price_cents" integer,
	"percentage" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addon_rate_items_name_trimmed" CHECK (btrim("addon_rate_items"."name") = "addon_rate_items"."name"),
	CONSTRAINT "addon_rate_items_name_not_empty" CHECK ("addon_rate_items"."name" <> ''),
	CONSTRAINT "addon_rate_items_pricing_mode" CHECK ("addon_rate_items"."pricing_mode" in ('flat', 'per_day', 'percentage')),
	CONSTRAINT "addon_rate_items_price_cents_non_negative" CHECK ("addon_rate_items"."price_cents" is null or "addon_rate_items"."price_cents" >= 0),
	CONSTRAINT "addon_rate_items_percentage_non_negative" CHECK ("addon_rate_items"."percentage" is null or "addon_rate_items"."percentage" >= 0),
	CONSTRAINT "addon_rate_items_value_columns" CHECK (("addon_rate_items"."pricing_mode" in ('flat', 'per_day') and "addon_rate_items"."price_cents" is not null and "addon_rate_items"."percentage" is null) or ("addon_rate_items"."pricing_mode" = 'percentage' and "addon_rate_items"."price_cents" is null and "addon_rate_items"."percentage" is not null)),
	CONSTRAINT "addon_rate_items_sort_order_non_negative" CHECK ("addon_rate_items"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "company_profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"legal_name" text,
	"tax_id" text,
	"tax_office" text,
	"address" text,
	"postal_code" text,
	"city" text,
	"phone" text,
	"email" text,
	"iban" text,
	"bank_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crew_rate_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"day_rate_cents" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crew_rate_items_name_trimmed" CHECK (btrim("crew_rate_items"."name") = "crew_rate_items"."name"),
	CONSTRAINT "crew_rate_items_name_not_empty" CHECK ("crew_rate_items"."name" <> ''),
	CONSTRAINT "crew_rate_items_day_rate_cents_non_negative" CHECK ("crew_rate_items"."day_rate_cents" >= 0),
	CONSTRAINT "crew_rate_items_sort_order_non_negative" CHECK ("crew_rate_items"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "deliverable_rate_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"pricing_mode" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deliverable_rate_items_name_trimmed" CHECK (btrim("deliverable_rate_items"."name") = "deliverable_rate_items"."name"),
	CONSTRAINT "deliverable_rate_items_name_not_empty" CHECK ("deliverable_rate_items"."name" <> ''),
	CONSTRAINT "deliverable_rate_items_pricing_mode" CHECK ("deliverable_rate_items"."pricing_mode" in ('per_unit', 'per_30')),
	CONSTRAINT "deliverable_rate_items_unit_price_cents_non_negative" CHECK ("deliverable_rate_items"."unit_price_cents" >= 0),
	CONSTRAINT "deliverable_rate_items_sort_order_non_negative" CHECK ("deliverable_rate_items"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "addon_rate_items_name_unique" ON "addon_rate_items" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "company_profile_singleton" ON "company_profile" USING btree ((true));--> statement-breakpoint
CREATE UNIQUE INDEX "crew_rate_items_name_unique" ON "crew_rate_items" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "deliverable_rate_items_name_unique" ON "deliverable_rate_items" USING btree (lower("name"));