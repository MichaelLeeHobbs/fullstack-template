CREATE TABLE "sso_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"protocol" varchar(10) NOT NULL,
	"config" jsonb NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"allowed_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auto_create_users" boolean DEFAULT true NOT NULL,
	"default_role_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sso_providers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "sso_providers_protocol_check" CHECK ("sso_providers"."protocol" IN ('oidc', 'saml'))
);
--> statement-breakpoint
CREATE TABLE "sso_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"external_id" varchar(500) NOT NULL,
	"email" varchar(255),
	"profile" jsonb,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sso_auth_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sso_auth_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "sso_providers" ADD CONSTRAINT "sso_providers_default_role_id_roles_id_fk" FOREIGN KEY ("default_role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_identities" ADD CONSTRAINT "sso_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_identities" ADD CONSTRAINT "sso_identities_provider_id_sso_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."sso_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_auth_codes" ADD CONSTRAINT "sso_auth_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sso_providers_is_enabled_idx" ON "sso_providers" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "sso_identities_user_id_idx" ON "sso_identities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sso_identities_provider_id_idx" ON "sso_identities" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sso_identities_user_provider_idx" ON "sso_identities" USING btree ("user_id","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sso_identities_provider_external_idx" ON "sso_identities" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE INDEX "sso_auth_codes_user_id_idx" ON "sso_auth_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sso_auth_codes_expires_at_idx" ON "sso_auth_codes" USING btree ("expires_at");