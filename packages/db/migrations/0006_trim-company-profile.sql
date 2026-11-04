ALTER TABLE "company_profile" RENAME COLUMN "legal_name" TO "name";--> statement-breakpoint
ALTER TABLE "company_profile" DROP COLUMN "tax_id";--> statement-breakpoint
ALTER TABLE "company_profile" DROP COLUMN "tax_office";--> statement-breakpoint
ALTER TABLE "company_profile" DROP COLUMN "iban";--> statement-breakpoint
ALTER TABLE "company_profile" DROP COLUMN "bank_name";