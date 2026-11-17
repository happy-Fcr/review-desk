CREATE TABLE `study_profiles` (
	`device_id` text PRIMARY KEY NOT NULL,
	`total_seconds` integer DEFAULT 0 NOT NULL,
	`streak_days` integer DEFAULT 0 NOT NULL,
	`last_study_date` text,
	`updated_at` text NOT NULL
);
