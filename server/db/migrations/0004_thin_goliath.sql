CREATE TABLE "setup_report" (
	"id" text PRIMARY KEY NOT NULL,
	"setup_id" text NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "setup" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "setup" ADD COLUMN "hidden_reason" text;--> statement-breakpoint
ALTER TABLE "setup_report" ADD CONSTRAINT "setup_report_setup_id_setup_id_fk" FOREIGN KEY ("setup_id") REFERENCES "public"."setup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_report" ADD CONSTRAINT "setup_report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "setup_report_setup_reporter_uq" ON "setup_report" USING btree ("setup_id","reporter_id");--> statement-breakpoint
CREATE INDEX "setup_report_status_idx" ON "setup_report" USING btree ("status","created_at");