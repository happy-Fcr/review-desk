CREATE TABLE `user_focus_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`total_seconds` integer DEFAULT 0 NOT NULL,
	`streak_days` integer DEFAULT 0 NOT NULL,
	`last_study_date` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_focus_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`study_date` text NOT NULL,
	`subject` text NOT NULL,
	`seconds` integer NOT NULL
);
