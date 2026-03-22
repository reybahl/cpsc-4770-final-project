CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"verification_loop_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;