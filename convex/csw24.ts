import { VALID_WORDS, WORDS_BY_SIGNATURE } from "./csw24.generated";

const EMPTY_WORDS: readonly string[] = [];
const VALID_WORD_LOOKUP: Record<string, true> = VALID_WORDS;
const WORDS_BY_SIGNATURE_LOOKUP: Record<string, readonly string[]> = WORDS_BY_SIGNATURE;

export function normalizeCsw24Word(word: string): string {
  return word.trim().toUpperCase();
}

export function isValidCsw24Word(word: string): boolean {
  const normalizedWord = normalizeCsw24Word(word);
  return (
    /^[A-Z]{2,7}$/.test(normalizedWord) &&
    Object.prototype.hasOwnProperty.call(VALID_WORD_LOOKUP, normalizedWord)
  );
}

export function buildWordSignature(letters: readonly string[]): string {
  return [...letters].map((letter) => letter.toUpperCase()).sort().join("");
}

export function getWordsForSignature(signature: string): readonly string[] {
  return WORDS_BY_SIGNATURE_LOOKUP[signature.toUpperCase()] ?? EMPTY_WORDS;
}
