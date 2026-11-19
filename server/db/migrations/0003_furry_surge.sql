CREATE TABLE "setup_like" (
	"setup_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "setup_like_setup_id_user_id_pk" PRIMARY KEY("setup_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "setup" ADD COLUMN "like_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bio" text DEFAULT '' NOT NULL;--> statement-breakpoint
-- Profils existants : identifiant dérivé du nom (caractères ASCII), suffixé pour rester unique.
UPDATE "user" SET "username" = left(coalesce(nullif(trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'membre'), 20) || '-' || substr(md5("id"), 1, 6) WHERE "username" IS NULL;--> statement-breakpoint
ALTER TABLE "setup_like" ADD CONSTRAINT "setup_like_setup_id_setup_id_fk" FOREIGN KEY ("setup_id") REFERENCES "public"."setup"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_like" ADD CONSTRAINT "setup_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "setup_like_user_idx" ON "setup_like" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "setup_popular_idx" ON "setup" USING btree ("is_public","like_count");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");