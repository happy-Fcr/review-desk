import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const studyProfiles = sqliteTable("study_profiles", {
  deviceId: text("device_id").primaryKey(),
  totalSeconds: integer("total_seconds").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  lastStudyDate: text("last_study_date"),
  updatedAt: text("updated_at").notNull(),
});

export const studySessions = sqliteTable("study_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  deviceId: text("device_id").notNull(),
  studyDate: text("study_date").notNull(),
  subject: text("subject").notNull(),
  seconds: integer("seconds").notNull(),
});

export const publicLibraryItems = sqliteTable("public_library_items", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  subject: text("subject").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
  createdAt: text("created_at").notNull(),
});

export const userFocusProfiles = sqliteTable("user_focus_profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  totalSeconds: integer("total_seconds").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  lastStudyDate: text("last_study_date"),
  updatedAt: text("updated_at").notNull(),
});

export const userFocusSessions = sqliteTable("user_focus_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  studyDate: text("study_date").notNull(),
  subject: text("subject").notNull(),
  seconds: integer("seconds").notNull(),
});

export const userGameScores = sqliteTable("user_game_scores", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  bestScore: integer("best_score").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});
