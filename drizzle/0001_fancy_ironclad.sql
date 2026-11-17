CREATE TABLE `study_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` text NOT NULL,
	`study_date` text NOT NULL,
	`subject` text NOT NULL,
	`seconds` integer NOT NULL
);
