CREATE TABLE `user_game_scores` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`best_score` integer DEFAULT 0 NOT NULL,
	`games_played` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
