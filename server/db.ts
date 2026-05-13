import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, sessions, improvedNotes, flashcards, summaries } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Create a new session with improved notes, flashcards, and summary.
 */
export async function createSession(data: {
  userId: number;
  subject: string;
  inputText: string;
  improvedNotesContent: string;
  flashcardsContent: string;
  summaryContent: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert session
  const sessionResult = await db
    .insert(sessions)
    .values({
      userId: data.userId,
      subject: data.subject,
      inputText: data.inputText,
    });

  const sessionId = sessionResult[0].insertId as number;

  // Insert related records
  await Promise.all([
    db.insert(improvedNotes).values({
      sessionId,
      content: data.improvedNotesContent,
    }),
    db.insert(flashcards).values({
      sessionId,
      cards: data.flashcardsContent,
    }),
    db.insert(summaries).values({
      sessionId,
      content: data.summaryContent,
    }),
  ]);

  return sessionId;
}

/**
 * Get a session with all related data (improved notes, flashcards, summary).
 */
export async function getSessionWithContent(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [sessionData] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!sessionData) return null;

  const [notesData] = await db
    .select()
    .from(improvedNotes)
    .where(eq(improvedNotes.sessionId, sessionId))
    .limit(1);

  const [flashcardsData] = await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.sessionId, sessionId))
    .limit(1);

  const [summaryData] = await db
    .select()
    .from(summaries)
    .where(eq(summaries.sessionId, sessionId))
    .limit(1);

  return {
    session: sessionData,
    improvedNotes: notesData?.content || "",
    flashcards: flashcardsData?.cards || "[]",
    summary: summaryData?.content || "",
  };
}

/**
 * Get all sessions for a user with pagination.
 */
export async function getUserSessions(userId: number, limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(sessions.createdAt)
    .limit(limit)
    .offset(offset);

  return result;
}

/**
 * Delete a session and all related data.
 */
export async function deleteSession(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Update session input text (for reload functionality).
 */
export async function updateSessionInput(sessionId: number, inputText: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(sessions)
    .set({ inputText, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}
