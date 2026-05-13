import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Notes Integration - Save/Load/Delete Workflow", () => {
  it("should save a session and retrieve it", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const saveResult = await caller.notes.saveSession({
      text: "Photosynthesis is the process by which plants convert light energy into chemical energy",
      subject: "Biology",
      improvedNotes: "Photosynthesis converts light energy to chemical energy in plants",
      flashcards: [
        { q: "What is photosynthesis?", a: "Conversion of light to chemical energy" },
      ],
      summary: "Key process in plant biology",
    });

    expect(saveResult.sessionId).toBeDefined();
    expect(typeof saveResult.sessionId).toBe("number");

    // Retrieve the saved session
    const getResult = await caller.notes.getSession({
      sessionId: saveResult.sessionId,
    });

    expect(getResult.session.inputText).toBe(
      "Photosynthesis is the process by which plants convert light energy into chemical energy"
    );
    expect(getResult.session.subject).toBe("Biology");
    expect(getResult.improvedNotes).toBe("Photosynthesis converts light energy to chemical energy in plants");
    expect(getResult.flashcards).toHaveLength(1);
    expect(getResult.summary).toBe("Key process in plant biology");
  });

  it("should list user sessions", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Save multiple sessions
    const session1 = await caller.notes.saveSession({
      text: "Session 1 notes",
      subject: "Biology",
      improvedNotes: "Improved 1",
      flashcards: [],
      summary: "Summary 1",
    });

    const session2 = await caller.notes.saveSession({
      text: "Session 2 notes",
      subject: "History",
      improvedNotes: "Improved 2",
      flashcards: [],
      summary: "Summary 2",
    });

    // List sessions
    const listResult = await caller.notes.listSessions({
      limit: 50,
      offset: 0,
    });

    expect(listResult.sessions.length).toBeGreaterThanOrEqual(2);
    const sessionIds = listResult.sessions.map((s) => s.id);
    expect(sessionIds).toContain(session1.sessionId);
    expect(sessionIds).toContain(session2.sessionId);
  });

  it("should delete a session", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Save a session
    const saveResult = await caller.notes.saveSession({
      text: "Test notes",
      subject: "Maths",
      improvedNotes: "Improved",
      flashcards: [],
      summary: "Summary",
    });

    // Delete it
    const deleteResult = await caller.notes.deleteSession({
      sessionId: saveResult.sessionId,
    });

    expect(deleteResult.success).toBe(true);

    // Verify it's deleted by checking the list
    const listResult = await caller.notes.listSessions({
      limit: 50,
      offset: 0,
    });

    const deletedSession = listResult.sessions.find((s) => s.id === saveResult.sessionId);
    expect(deletedSession).toBeUndefined();
  });

  it("should only allow users to access their own sessions", async () => {
    const { ctx: ctx1 } = createAuthContext(1);
    const { ctx: ctx2 } = createAuthContext(2);

    const caller1 = appRouter.createCaller(ctx1);
    const caller2 = appRouter.createCaller(ctx2);

    // User 1 saves a session
    const session = await caller1.notes.saveSession({
      text: "User 1 notes",
      subject: "Biology",
      improvedNotes: "Improved",
      flashcards: [],
      summary: "Summary",
    });

    // User 1 can retrieve it
    const getResult1 = await caller1.notes.getSession({
      sessionId: session.sessionId,
    });
    expect(getResult1.session.inputText).toBe("User 1 notes");

    // User 2 should not be able to retrieve it
    try {
      await caller2.notes.getSession({
        sessionId: session.sessionId,
      });
      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      // Expected to throw an error
      expect(error).toBeDefined();
    }
  });
});
