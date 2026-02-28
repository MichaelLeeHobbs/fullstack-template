CREATE TABLE "pki_private_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"algorithm" varchar(20) NOT NULL,
	"key_size" integer,
	"curve" varchar(20),
	"encrypted_private_key_pem" text NOT NULL,
	"public_key_pem" text NOT NULL,
	"key_fingerprint" varchar(128) NOT NULL,
	"kdf_salt" varchar(255) NOT NULL,
	"kdf_iv" varchar(255) NOT NULL,
	"kdf_tag" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pki_private_keys_key_fingerprint_unique" UNIQUE("key_fingerprint")
);
--> statement-breakpoint
CREATE TABLE "certificate_authorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"common_name" varchar(255) NOT NULL,
	"organization" varchar(255),
	"organizational_unit" varchar(255),
	"country" varchar(2),
	"state" varchar(128),
	"locality" varchar(128),
	"parent_ca_id" uuid,
	"is_root" boolean DEFAULT false NOT NULL,
	"path_len_constraint" integer,
	"certificate_id" uuid,
	"private_key_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"serial_counter" integer DEFAULT 1 NOT NULL,
	"max_validity_days" integer DEFAULT 3650 NOT NULL,
	"crl_distribution_url" varchar(500),
	"ocsp_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificate_authorities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "certificate_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"cert_type" varchar(20) NOT NULL,
	"allowed_key_algorithms" jsonb DEFAULT '["rsa","ecdsa"]'::jsonb NOT NULL,
	"min_key_size" integer DEFAULT 2048 NOT NULL,
	"key_usage" jsonb NOT NULL,
	"ext_key_usage" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"basic_constraints" jsonb,
	"max_validity_days" integer DEFAULT 365 NOT NULL,
	"subject_constraints" jsonb,
	"san_constraints" jsonb,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificate_profiles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuing_ca_id" uuid NOT NULL,
	"serial_number" varchar(64) NOT NULL,
	"common_name" varchar(255) NOT NULL,
	"organization" varchar(255),
	"organizational_unit" varchar(255),
	"country" varchar(2),
	"state" varchar(128),
	"locality" varchar(128),
	"sans" jsonb,
	"certificate_pem" text NOT NULL,
	"fingerprint" varchar(128) NOT NULL,
	"not_before" timestamp with time zone NOT NULL,
	"not_after" timestamp with time zone NOT NULL,
	"cert_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"profile_id" uuid,
	"private_key_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "certificate_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"csr_pem" text NOT NULL,
	"common_name" varchar(255) NOT NULL,
	"subject_dn" varchar(500) NOT NULL,
	"sans" jsonb,
	"target_ca_id" uuid NOT NULL,
	"profile_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"certificate_id" uuid,
	"requested_by" uuid NOT NULL,
	"approved_by" uuid,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_id" uuid NOT NULL,
	"reason" varchar(30) NOT NULL,
	"revoked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invalidity_date" timestamp with time zone,
	"revoked_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revocations_certificate_id_unique" UNIQUE("certificate_id")
);
--> statement-breakpoint
CREATE TABLE "crls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ca_id" uuid NOT NULL,
	"crl_number" integer NOT NULL,
	"crl_pem" text NOT NULL,
	"this_update" timestamp with time zone NOT NULL,
	"next_update" timestamp with time zone NOT NULL,
	"entries_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"certificate_dn" varchar(500) NOT NULL,
	"certificate_cn" varchar(255) NOT NULL,
	"certificate_serial" varchar(128) NOT NULL,
	"certificate_fingerprint" varchar(128),
	"expires_at" timestamp with time zone,
	"certificate_id" uuid,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"label" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cert_attach_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cert_attach_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pki_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(50) NOT NULL,
	"actor_id" uuid,
	"actor_ip" varchar(45),
	"target_type" varchar(30) NOT NULL,
	"target_id" uuid,
	"details" jsonb,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certificate_authorities" ADD CONSTRAINT "certificate_authorities_parent_ca_id_certificate_authorities_id_fk" FOREIGN KEY ("parent_ca_id") REFERENCES "public"."certificate_authorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_authorities" ADD CONSTRAINT "certificate_authorities_private_key_id_pki_private_keys_id_fk" FOREIGN KEY ("private_key_id") REFERENCES "public"."pki_private_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issuing_ca_id_certificate_authorities_id_fk" FOREIGN KEY ("issuing_ca_id") REFERENCES "public"."certificate_authorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_profile_id_certificate_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."certificate_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_private_key_id_pki_private_keys_id_fk" FOREIGN KEY ("private_key_id") REFERENCES "public"."pki_private_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_target_ca_id_certificate_authorities_id_fk" FOREIGN KEY ("target_ca_id") REFERENCES "public"."certificate_authorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_profile_id_certificate_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."certificate_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revocations" ADD CONSTRAINT "revocations_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revocations" ADD CONSTRAINT "revocations_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crls" ADD CONSTRAINT "crls_ca_id_certificate_authorities_id_fk" FOREIGN KEY ("ca_id") REFERENCES "public"."certificate_authorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_certificates" ADD CONSTRAINT "user_certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_certificates" ADD CONSTRAINT "user_certificates_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cert_attach_codes" ADD CONSTRAINT "cert_attach_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pki_audit_logs" ADD CONSTRAINT "pki_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pki_private_keys_key_fingerprint_idx" ON "pki_private_keys" USING btree ("key_fingerprint");--> statement-breakpoint
CREATE INDEX "certificate_authorities_parent_ca_id_idx" ON "certificate_authorities" USING btree ("parent_ca_id");--> statement-breakpoint
CREATE INDEX "certificate_authorities_status_idx" ON "certificate_authorities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "certificate_profiles_cert_type_idx" ON "certificate_profiles" USING btree ("cert_type");--> statement-breakpoint
CREATE INDEX "certificates_issuing_ca_id_idx" ON "certificates" USING btree ("issuing_ca_id");--> statement-breakpoint
CREATE INDEX "certificates_serial_number_idx" ON "certificates" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "certificates_status_idx" ON "certificates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "certificates_not_after_idx" ON "certificates" USING btree ("not_after");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_fingerprint_idx" ON "certificates" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "certificate_requests_target_ca_id_idx" ON "certificate_requests" USING btree ("target_ca_id");--> statement-breakpoint
CREATE INDEX "certificate_requests_status_idx" ON "certificate_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "certificate_requests_requested_by_idx" ON "certificate_requests" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "revocations_revoked_at_idx" ON "revocations" USING btree ("revoked_at");--> statement-breakpoint
CREATE INDEX "crls_ca_id_idx" ON "crls" USING btree ("ca_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crls_ca_id_crl_number_idx" ON "crls" USING btree ("ca_id","crl_number");--> statement-breakpoint
CREATE INDEX "user_certificates_user_id_idx" ON "user_certificates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_certificates_certificate_serial_idx" ON "user_certificates" USING btree ("certificate_serial");--> statement-breakpoint
CREATE INDEX "user_certificates_cn_dn_idx" ON "user_certificates" USING btree ("certificate_cn","certificate_dn");--> statement-breakpoint
CREATE INDEX "cert_attach_codes_user_id_idx" ON "cert_attach_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cert_attach_codes_code_idx" ON "cert_attach_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "cert_attach_codes_expires_at_idx" ON "cert_attach_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "pki_audit_logs_actor_id_idx" ON "pki_audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "pki_audit_logs_target_type_target_id_idx" ON "pki_audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "pki_audit_logs_created_at_idx" ON "pki_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pki_audit_logs_action_idx" ON "pki_audit_logs" USING btree ("action");