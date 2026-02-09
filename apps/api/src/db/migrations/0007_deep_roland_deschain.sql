DROP INDEX "api_keys_key_hash_idx";--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "details" SET DATA TYPE text;--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_resource_action_idx" ON "permissions" USING btree ("resource","action");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_type_check" CHECK ("users"."account_type" IN ('user', 'service'));