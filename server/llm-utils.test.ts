import { describe, it, expect } from "vitest";
import { extractTopic, parseFlashcards } from "./llm-utils";

describe("LLM Utilities", () => {
  describe("extractTopic", () => {
    it("should extract a 3-5 word topic from text", () => {
      const text = "The mitochondria is the powerhouse of the cell and produces energy through ATP synthesis";
      const topic = extractTopic(text, "Biology");
      expect(topic).toContain("Biology");
      expect(topic.length).toBeLessThanOrEqual(50);
    });

    it("should include the subject in the topic", () => {
      const text = "Some random notes about history";
      const topic = extractTopic(text, "History");
      expect(topic).toContain("History");
    });

    it("should handle short text", () => {
      const text = "Short";
      const topic = extractTopic(text, "Maths");
      expect(topic).toContain("Maths");
    });

    it("should handle empty text", () => {
      const topic = extractTopic("", "Chemistry");
      expect(topic).toContain("Chemistry");
    });
  });

  describe("parseFlashcards", () => {
    it("should parse valid flashcard JSON", () => {
      const flashcards = [
        { q: "What is photosynthesis?", a: "Process where plants convert light to energy" },
        { q: "What is respiration?", a: "Process where cells break down glucose" },
      ];
      const json = JSON.stringify(flashcards);
      const cards = parseFlashcards(json);
      expect(cards).toHaveLength(2);
      expect(cards[0].q).toBe("What is photosynthesis?");
      expect(cards[1].a).toContain("glucose");
    });

    it("should return empty array for invalid JSON", () => {
      const cards = parseFlashcards("invalid json");
      expect(cards).toEqual([]);
    });

    it("should return empty array for non-array JSON", () => {
      const json = JSON.stringify({ q: "Question", a: "Answer" });
      const cards = parseFlashcards(json);
      expect(cards).toEqual([]);
    });

    it("should handle empty array", () => {
      const json = JSON.stringify([]);
      const cards = parseFlashcards(json);
      expect(cards).toEqual([]);
    });

    it("should preserve flashcard structure", () => {
      const flashcards = [
        { q: "Q1", a: "A1" },
        { q: "Q2", a: "A2" },
        { q: "Q3", a: "A3" },
      ];
      const json = JSON.stringify(flashcards);
      const parsed = parseFlashcards(json);
      expect(parsed).toEqual(flashcards);
    });
  });
});
