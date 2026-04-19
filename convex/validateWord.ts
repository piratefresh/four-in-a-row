import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { isValidCsw24Word, normalizeCsw24Word } from "./csw24";

export const validateDictionaryWord = internalAction({
  args: { word: v.string() },
  handler: async (_ctx, args) => {
    const normalizedWord = normalizeCsw24Word(args.word);

    if (!/^[A-Z]{2,7}$/.test(normalizedWord)) {
      console.log(
        "[validateWord] Skipping CSW24 lookup for invalid word format",
        {
          word: args.word,
          normalizedWord,
        },
      );
      return { valid: false, definition: null };
    }

    const startedAt = Date.now();

    console.log("[validateWord] Starting CSW24 lookup", {
      word: args.word,
      normalizedWord,
    });

    const valid = isValidCsw24Word(normalizedWord);
    console.log("[validateWord] CSW24 lookup completed", {
      word: args.word,
      normalizedWord,
      durationMs: Date.now() - startedAt,
      valid,
    });

    return { valid, definition: null };
  },
});
