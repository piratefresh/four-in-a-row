import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const getWikipediaSummary = internalAction({
  args: { topic: v.string() },
  handler: async (ctx, args) => {
    const response = await fetch(
      "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&titles=" +
        args.topic,
    );

    return getSummaryFromJSON(await response.json());
  },
});

function getSummaryFromJSON(data: any) {
  const firstPageId = Object.keys(data.query.pages)[0];
  return data.query.pages[firstPageId].extract;
}

export const validateDictionaryWord = internalAction({
  args: { word: v.string() },
  handler: async (_ctx, args) => {
    const normalizedWord = args.word.toLowerCase().trim();

    if (!/^[a-z]+$/.test(normalizedWord)) {
      return { valid: false };
    }

    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`,
    );

    if (!response.ok) {
      return { valid: false, definition: null };
    }

    const data = await response.json();
    const definition =
      data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition ?? null;
    return { valid: true, definition };
  },
});
