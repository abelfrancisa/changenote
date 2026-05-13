import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createSession, deleteSession, getSessionWithContent, getUserSessions } from "./db";
import { generateNoteContent, parseFlashcards } from "./llm-utils";

/**
 * Notes router: handles note generation, saving, and history management.
 */
export const notesRouter = router({
  /**
   * Generate improved notes, flashcards, and summary from raw input.
   * Public endpoint: users can generate without authentication.
   */
  generate: publicProcedure
    .input(
      z.object({
        text: z.string().max(1500, "Input must be 1500 characters or less"),
        subject: z.string().min(1, "Subject is required"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await generateNoteContent(input.text, input.subject);
        return {
          success: true,
          improvedNotes: result.improved_notes,
          flashcards: result.flashcards,
          summary: result.summary,
        };
      } catch (error) {
        console.error("[Notes] Generation failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate content. Please try again.",
        });
      }
    }),

  /**
   * Save a session with generated content.
   * Protected endpoint: requires authentication.
   */
  saveSession: protectedProcedure
    .input(
      z.object({
        text: z.string().max(1500),
        subject: z.string().min(1),
        improvedNotes: z.string(),
        flashcards: z.array(z.object({ q: z.string(), a: z.string() })),
        summary: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        const sessionId = await createSession({
          userId: ctx.user.id,
          subject: input.subject,
          inputText: input.text,
          improvedNotesContent: input.improvedNotes,
          flashcardsContent: JSON.stringify(input.flashcards),
          summaryContent: input.summary,
        });

        return {
          success: true,
          sessionId,
        };
      } catch (error) {
        console.error("[Notes] Save failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save session.",
        });
      }
    }),

  /**
   * Get all sessions for the current user.
   * Protected endpoint: requires authentication.
   */
  listSessions: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        const sessions = await getUserSessions(ctx.user.id, input.limit, input.offset);
        return {
          sessions: sessions.map((s) => ({
            id: s.id,
            subject: s.subject,
            createdAt: s.createdAt,
            inputPreview: s.inputText.slice(0, 100),
          })),
        };
      } catch (error) {
        console.error("[Notes] List failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch sessions.",
        });
      }
    }),

  /**
   * Get a specific session with all content.
   * Protected endpoint: requires authentication.
   */
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        const sessionData = await getSessionWithContent(input.sessionId);
        if (!sessionData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
        }

        // Verify ownership
        if (sessionData.session.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return {
          session: sessionData.session,
          improvedNotes: sessionData.improvedNotes,
          flashcards: parseFlashcards(sessionData.flashcards),
          summary: sessionData.summary,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Notes] Get failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch session.",
        });
      }
    }),

  /**
   * Delete a session.
   * Protected endpoint: requires authentication.
   */
  deleteSession: protectedProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      try {
        const sessionData = await getSessionWithContent(input.sessionId);
        if (!sessionData) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Verify ownership
        if (sessionData.session.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await deleteSession(input.sessionId);

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Notes] Delete failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete session.",
        });
      }
    }),
});
