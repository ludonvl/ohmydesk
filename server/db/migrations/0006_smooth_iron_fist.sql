ALTER TABLE "user" ADD COLUMN "show_presence" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_seen_at" timestamp with time zone;