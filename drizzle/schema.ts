import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Sessions table: stores each user's note revision session.
 * Each session contains the input text and subject tag.
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: varchar("subject", { length: 64 }).notNull(), // e.g., "Biology", "History", "Maths"
  inputText: text("inputText").notNull(), // Raw notes input
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * ImprovedNotes table: stores AI-generated improved notes for each session.
 */
export const improvedNotes = mysqlTable("improvedNotes", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  content: text("content").notNull(), // 2-4 short paragraphs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImprovedNote = typeof improvedNotes.$inferSelect;
export type InsertImprovedNote = typeof improvedNotes.$inferInsert;

/**
 * Flashcards table: stores AI-generated flashcard sets for each session.
 * Stores as JSON array of {q, a} objects.
 */
export const flashcards = mysqlTable("flashcards", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  cards: text("cards").notNull(), // JSON array: [{"q": "...", "a": "..."}, ...]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = typeof flashcards.$inferInsert;

/**
 * Summaries table: stores AI-generated exam-style summaries for each session.
 */
export const summaries = mysqlTable("summaries", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  content: text("content").notNull(), // 100-150 words
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Summary = typeof summaries.$inferSelect;
export type InsertSummary = typeof summaries.$inferInsert;