export function redactReasoningNumbersForChat(text: string): string {
  return text.replace(
    /[+-]?\b\d+(?:[.,:/-]\d+)*(?:\.\d+)?(?:%|x)?/g,
    "[hidden number]",
  );
}
