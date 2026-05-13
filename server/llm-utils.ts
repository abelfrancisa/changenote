import { createHash } from "crypto";
import { invokeLLM } from "./_core/llm";

/**
 * Cache for LLM outputs to avoid repeated calls.
 * In production, this should be replaced with Redis or similar.
 */
const responseCache = new Map<string, { improved_notes: string; flashcards: Array<{ q: string; a: string }>; summary: string }>();

/**
 * Generate a cache key from text, action, and topic.
 */
function generateCacheKey(text: string, action: string, topic: string): string {
  const combined = `${text}|${action}|${topic}`;
  return createHash("sha256").update(combined).digest("hex");
}

/**
 * System prompt template for note generation (cached on startup).
 * Kept under ~150 tokens for efficiency.
 */
const SYSTEM_PROMPT = `You are an expert GCSE revision tutor. Your task is to transform raw student notes into polished study materials.

You MUST respond with ONLY valid JSON, no prose wrappers or extra text. Follow these constraints strictly:
- improved_notes: 2-4 short, clear paragraphs
- flashcards: exactly 6 question-answer pairs
- summary: 100-150 words maximum

Output format:
{"improved_notes": "...", "flashcards": [{"q": "...", "a": "..."}], "summary": "..."}`;

/**
 * Extract a 3-5 word topic tag from the input text.
 */
export function extractTopic(text: string, subject: string): string {
  // Simple extraction: take first few meaningful words + subject
  const words = text
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 2);
  return `${subject} ${words.join(" ")}`.slice(0, 50);
}

/**
 * Pre-summarize text if it exceeds 800 characters using greedy truncation.
 */
function preSummarizeIfNeeded(text: string): string {
  if (text.length <= 800) return text;

  // Greedy truncation: keep sentences until we hit ~800 chars
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let result = "";
  for (const sentence of sentences) {
    if ((result + sentence).length > 800) break;
    result += sentence;
  }
  return result.slice(0, 800);
}

/**
 * Call the LLM to generate improved notes, flashcards, and summary.
 * Implements caching and token efficiency.
 */
export async function generateNoteContent(
  inputText: string,
  subject: string
): Promise<{
  improved_notes: string;
  flashcards: Array<{ q: string; a: string }>;
  summary: string;
}> {
  // Truncate input to 1,500 chars
  const truncatedText = inputText.slice(0, 1500);

  // Extract topic tag
  const topic = extractTopic(truncatedText, subject);

  // Check cache
  const cacheKey = generateCacheKey(truncatedText, "generate", topic);
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey)!;
  }

  // Pre-summarize if needed
  const preSummarized = preSummarizeIfNeeded(truncatedText);

  // Build compact runtime payload
  const userPrompt = `Subject: ${subject}
Topic: ${topic}

Raw notes:
${preSummarized}

Transform these notes into:
1. improved_notes: 2-4 clear paragraphs
2. flashcards: exactly 6 Q/A pairs
3. summary: 100-150 words

Respond ONLY with valid JSON.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "note_generation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              improved_notes: { type: "string" },
              flashcards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    q: { type: "string" },
                    a: { type: "string" },
                  },
                  required: ["q", "a"],
                },
              },
              summary: { type: "string" },
            },
            required: ["improved_notes", "flashcards", "summary"],
          },
        },
      },
    });

    // Parse the response
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from LLM");

    const parsed = typeof content === "string" ? JSON.parse(content) : content;

    // Validate structure
    if (!parsed.improved_notes || !Array.isArray(parsed.flashcards) || !parsed.summary) {
      throw new Error("Invalid response structure");
    }

    // Ensure exactly 6 flashcards
    const flashcards = parsed.flashcards.slice(0, 6);
    while (flashcards.length < 6) {
      flashcards.push({ q: "Question", a: "Answer" });
    }

    const result = {
      improved_notes: parsed.improved_notes,
      flashcards,
      summary: parsed.summary,
    };

    // Cache the result
    responseCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error("[LLM] Generation failed:", error);
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Parse flashcards JSON array into structured format.
 */
export function parseFlashcards(cardsJson: string): Array<{ q: string; a: string }> {
  try {
    const parsed = JSON.parse(cardsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
